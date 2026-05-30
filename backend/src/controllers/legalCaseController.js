const { LegalCase, Unit, Lease, Tenant, Property, AuditLog, User, Document, sequelize } = require('../models');
const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const documentNumberingService = require('../services/documentNumberingService');
const { companyWhere, withCompanyId } = require('../utils/companyScope');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

/**
 * Log action helper
 */
const logAction = async (entityType, entityId, action, oldValue, newValue, userId, req) => {
  try {
    await AuditLog.create({
      entityType,
      entityId,
      action,
      oldValue,
      newValue,
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
};

exports.getAllLegalCases = async (req, res) => {
  try {
    const {
      search = '',
      tenantId,
      propertyId,
      unitId,
      leaseId,
      status,
      approvalStatus,
    } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const where = {
      isActive: true,
    };
    if (search) {
      where[Op.or] = [
        { caseNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { '$lease.leaseNumber$': { [Op.like]: `%${search}%` } },
        { '$tenant.name$': { [Op.like]: `%${search}%` } },
        { '$unit.unitNumber$': { [Op.like]: `%${search}%` } },
        { '$unit.property.title$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (tenantId) where.tenantId = tenantId;
    if (unitId) where.unitId = unitId;
    if (leaseId) where.leaseId = leaseId;
    if (status) where.status = status;
    if (approvalStatus === 'approved') where.isApproved = true;
    if (approvalStatus === 'pending') where.isApproved = false;

    const unitInclude = {
      model: Unit,
      as: 'unit',
      attributes: ['id', 'unitNumber', 'propertyId'],
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
          required: false,
        }
      ],
      required: false,
    };

    if (propertyId) {
      unitInclude.where = { propertyId };
      unitInclude.required = true;
    }

    const { count, rows: cases } = await LegalCase.findAndCountAll({
      where,
      include: [
        { model: Lease, as: 'lease', attributes: ['leaseNumber'] },
        { model: Tenant, as: 'tenant', attributes: ['name'] },
        unitInclude
      ],
      distinct: true,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['created_at', 'DESC']]
    });
    res.json({
      success: true,
      data: {
        cases,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLegalCaseById = async (req, res) => {
  try {
    const legalCase = await LegalCase.findByPk(req.params.id, {
      include: [
        { model: Lease, as: 'lease' },
        { model: Tenant, as: 'tenant' },
        { model: Unit, as: 'unit' },
        { model: User, as: 'approver', attributes: ['name'] },
        { model: User, as: 'closer', attributes: ['name'] }
      ]
    });
    if (!legalCase) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data: legalCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createLegalCase = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    let caseNumber = req.body.caseNumber;
    let generatedNumber = await companyDocumentNumber.generateDocumentNumber({
      companyId: req.companyId,
      documentType: 'legal',
      transaction,
    });
    if (!generatedNumber) {
      generatedNumber = await documentNumberingService.generateDocumentNumber('Legal', transaction);
    }
    if (generatedNumber) {
      caseNumber = generatedNumber;
    } else {
      const manualNumber = documentNumberingService.normalizeManualDocumentNumber(caseNumber);
      if (!manualNumber) {
        const count = await LegalCase.count({ where: { ...companyWhere(req) }, transaction });
        caseNumber = `LGL-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
      } else {
        const existingCase = await LegalCase.findOne({
          where: { caseNumber: manualNumber, ...companyWhere(req) },
          transaction,
        });
        if (existingCase) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Case number '${manualNumber}' already exists.`,
          });
        }
        caseNumber = manualNumber;
      }
    }
    req.body.caseNumber = caseNumber;

    const legalCase = await LegalCase.create(withCompanyId(req, req.body), { transaction });
    
    await logAction('LegalCase', legalCase.id, 'CREATE', null, legalCase.toJSON(), req.user.id, req);

    await transaction.commit();
    res.status(201).json({ success: true, data: legalCase });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLegalCase = async (req, res) => {
  try {
    const legalCase = await LegalCase.findByPk(req.params.id);
    if (!legalCase) return res.status(404).json({ success: false, message: 'Case not found' });

    // Lock if closed
    if (legalCase.status === 'case_closed') {
      return res.status(403).json({ success: false, message: 'Closed cases cannot be edited' });
    }

    const oldValues = legalCase.toJSON();
    await legalCase.update(req.body);
    
    await logAction('LegalCase', legalCase.id, 'UPDATE', oldValues, legalCase.toJSON(), req.user.id, req);

    res.json({ success: true, data: legalCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveLegalCase = async (req, res) => {
  try {
    const legalCase = await LegalCase.findByPk(req.params.id);
    if (!legalCase) return res.status(404).json({ success: false, message: 'Case not found' });

    if (legalCase.isApproved) return res.status(400).json({ success: false, message: 'Case already approved' });

    const oldValues = legalCase.toJSON();
    await legalCase.update({
      isApproved: true,
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    // Update Unit Status based on Case Status
    const unit = await Unit.findByPk(legalCase.unitId);
    if (unit) {
      const lockingStatuses = ['dispute', 'npa', 'case'];
      const newStatus = lockingStatuses.includes(legalCase.status) ? legalCase.status : 'dispute';
      
      const oldUnitStatus = unit.status;
      await unit.update({ status: newStatus });
      await logAction('Unit', unit.id, 'STATUS_CHANGE', { status: oldUnitStatus }, { status: newStatus }, req.user.id, req);
    }

    await logAction('LegalCase', legalCase.id, 'APPROVE', oldValues, legalCase.toJSON(), req.user.id, req);

    res.json({ success: true, message: 'Case approved and unit status updated to Dispute', data: legalCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.closeLegalCase = async (req, res) => {
  try {
    const legalCase = await LegalCase.findByPk(req.params.id);
    if (!legalCase) return res.status(404).json({ success: false, message: 'Case not found' });

    if (legalCase.status === 'case_closed') return res.status(400).json({ success: false, message: 'Case already closed' });

    const oldValues = legalCase.toJSON();
    await legalCase.update({
      status: 'case_closed',
      closedBy: req.user.id,
      closedAt: new Date()
    });

    // Update Unit Status back to "Available"
    const unit = await Unit.findByPk(legalCase.unitId);
    if (unit) {
      await unit.update({ status: 'available' });
      await logAction('Unit', unit.id, 'STATUS_CHANGE', { status: unit.status }, { status: 'available' }, req.user.id, req);
    }

    await logAction('LegalCase', legalCase.id, 'CLOSE', oldValues, legalCase.toJSON(), req.user.id, req);

    res.json({ success: true, message: 'Case closed and unit status updated to Available', data: legalCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteLegalCase = async (req, res) => {
  try {
    const legalCase = await LegalCase.findByPk(req.params.id);
    if (!legalCase) return res.status(404).json({ success: false, message: 'Case not found' });

    await legalCase.update({ isActive: false });
    await logAction('LegalCase', legalCase.id, 'DELETE', null, { isActive: false }, req.user.id, req);

    res.json({ success: true, message: 'Case deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
