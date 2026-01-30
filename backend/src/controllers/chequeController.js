/**
 * Cheque Controller
 * Handles cheque and PDC management operations
 */

const { Cheque, Payment, Tenant, Lease, BankAccount, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all cheques
 */
exports.getAllCheques = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      chequeType,
      tenantId,
      leaseId,
      invoiceId,
      bankName,
      startDate,
      endDate,
      sortBy = 'chequeDate',
      sortOrder = 'ASC'
    } = req.query;

    const whereClause = { isActive: true };
    
    if (status) whereClause.status = status;
    if (chequeType) whereClause.chequeType = chequeType;
    if (tenantId) whereClause.tenantId = tenantId;
    if (leaseId) whereClause.leaseId = leaseId;
    
    // Handle invoiceId filtering (including null/empty check)
    if (invoiceId !== undefined) {
      if (invoiceId === 'null' || invoiceId === null) {
        whereClause.invoiceId = null;
      } else {
        whereClause.invoiceId = invoiceId;
      }
    }

    if (bankName) whereClause.bankName = { [Op.like]: `%${bankName}%` };
    
    if (startDate && endDate) {
      whereClause.chequeDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: cheques } = await Cheque.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber'],
          include: ['unit']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentNumber', 'amount', 'status']
        },
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName', 'accountNumber']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [[sortBy, sortOrder]]
    });

    res.status(200).json({
      success: true,
      data: {
        cheques,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get cheques error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cheques',
      error: error.message
    });
  }
};

/**
 * Get PDC register (future-dated cheques)
 */
exports.getPDCRegister = async (req, res) => {
  try {
    const { month, year } = req.query;
    const today = new Date();

    let startDate = today;
    let endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 12); // Next 12 months

    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0);
    }

    const pdcCheques = await Cheque.findAll({
      where: {
        chequeType: 'pdc',
        status: { [Op.in]: ['pending', 'deposited'] },
        chequeDate: {
          [Op.between]: [startDate, endDate]
        },
        isActive: true
      },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'mobile']
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber'],
          include: ['unit', 'property']
        }
      ],
      order: [['chequeDate', 'ASC']]
    });

    // Group by month
    const groupedByMonth = pdcCheques.reduce((acc, cheque) => {
      const monthKey = new Date(cheque.chequeDate).toISOString().slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          cheques: [],
          totalAmount: 0,
          count: 0
        };
      }
      acc[monthKey].cheques.push(cheque);
      acc[monthKey].totalAmount += parseFloat(cheque.amount);
      acc[monthKey].count += 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        pdcRegister: Object.values(groupedByMonth),
        totalCheques: pdcCheques.length,
        totalAmount: pdcCheques.reduce((sum, c) => sum + parseFloat(c.amount), 0)
      }
    });
  } catch (error) {
    console.error('Get PDC register error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PDC register',
      error: error.message
    });
  }
};

/**
 * Get cheque by ID
 */
exports.getChequeById = async (req, res) => {
  try {
    const { id } = req.params;

    const cheque = await Cheque.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Lease,
          as: 'lease',
          include: ['unit', 'property']
        },
        {
          model: Payment,
          as: 'payment'
        },
        {
          model: BankAccount,
          as: 'bankAccount'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'depositor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Cheque,
          as: 'replacementCheque',
          attributes: ['id', 'chequeNumber', 'amount', 'status']
        },
        {
          model: Cheque,
          as: 'originalCheque',
          attributes: ['id', 'chequeNumber', 'amount', 'status']
        }
      ]
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    res.status(200).json({
      success: true,
      data: cheque
    });
  } catch (error) {
    console.error('Get cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cheque',
      error: error.message
    });
  }
};

/**
 * Create cheque
 */
exports.createCheque = async (req, res) => {
  try {
    const {
      chequeNumber,
      tenantId,
      leaseId,
      paymentId,
      bankAccountId,
      bankName,
      branchName,
      amount,
      currency = 'AED',
      chequeDate,
      chequeType = 'current',
      scannedImage,
      notes
    } = req.body;

    // Check for duplicate cheque number
    const existingCheque = await Cheque.findOne({
      where: {
        chequeNumber,
        bankName,
        tenantId,
        isActive: true,
        status: { [Op.notIn]: ['bounced', 'cancelled'] }
      }
    });

    if (existingCheque) {
      return res.status(400).json({
        success: false,
        message: 'A cheque with this number already exists for this tenant'
      });
    }

    const cheque = await Cheque.create({
      chequeNumber,
      tenantId,
      leaseId,
      paymentId,
      bankAccountId,
      bankName,
      branchName,
      amount,
      currency,
      chequeDate,
      chequeType,
      scannedImage,
      notes,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Cheque created successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Create cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cheque',
      error: error.message
    });
  }
};

/**
 * Update cheque
 */
exports.updateCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    // Don't allow updating cleared or bounced cheques
    if (['cleared', 'bounced'].includes(cheque.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update a ${cheque.status} cheque`
      });
    }

    await cheque.update(updates);

    res.status(200).json({
      success: true,
      message: 'Cheque updated successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Update cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cheque',
      error: error.message
    });
  }
};

/**
 * Deposit cheque
 */
exports.depositCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankAccountId, bankReference, depositDate } = req.body;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (cheque.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending cheques can be deposited'
      });
    }

    await cheque.update({
      status: 'deposited',
      depositDate: depositDate || new Date(),
      bankAccountId,
      bankReference,
      depositedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Cheque deposited successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Deposit cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deposit cheque',
      error: error.message
    });
  }
};

/**
 * Clear cheque
 */
exports.clearCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { clearanceDate } = req.body;

    const cheque = await Cheque.findByPk(id, {
      include: [{ model: Payment, as: 'payment' }]
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (cheque.status !== 'deposited') {
      return res.status(400).json({
        success: false,
        message: 'Only deposited cheques can be cleared'
      });
    }

    await cheque.update({
      status: 'cleared',
      clearanceDate: clearanceDate || new Date()
    });

    // Update linked payment status
    if (cheque.payment && cheque.payment.status === 'pending') {
      await cheque.payment.update({ status: 'paid' });
    }

    res.status(200).json({
      success: true,
      message: 'Cheque cleared successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Clear cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cheque',
      error: error.message
    });
  }
};

/**
 * Bounce cheque
 */
exports.bounceCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { bounceReason, bounceFee = 0, bounceDate } = req.body;

    const cheque = await Cheque.findByPk(id, {
      include: [{ model: Payment, as: 'payment' }]
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (cheque.status !== 'deposited') {
      return res.status(400).json({
        success: false,
        message: 'Only deposited cheques can bounce'
      });
    }

    await cheque.update({
      status: 'bounced',
      bounceReason,
      bounceFee,
      bouncedDate: bounceDate || new Date()
    });

    // Update linked payment status
    if (cheque.payment) {
      await cheque.payment.update({ 
        status: 'overdue',
        notes: `${cheque.payment.notes || ''}\nCheque bounced: ${bounceReason}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cheque marked as bounced',
      data: cheque
    });
  } catch (error) {
    console.error('Bounce cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark cheque as bounced',
      error: error.message
    });
  }
};

/**
 * Cancel cheque
 */
exports.cancelCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (['cleared', 'bounced'].includes(cheque.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${cheque.status} cheque`
      });
    }

    await cheque.update({
      status: 'cancelled',
      notes: `${cheque.notes || ''}\nCancelled: ${reason || 'No reason provided'}`
    });

    res.status(200).json({
      success: true,
      message: 'Cheque cancelled successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Cancel cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel cheque',
      error: error.message
    });
  }
};

/**
 * Replace bounced cheque
 */
exports.replaceCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { newChequeNumber, newBankName, newChequeDate, newAmount } = req.body;

    const originalCheque = await Cheque.findByPk(id);
    if (!originalCheque) {
      return res.status(404).json({
        success: false,
        message: 'Original cheque not found'
      });
    }

    if (originalCheque.status !== 'bounced') {
      return res.status(400).json({
        success: false,
        message: 'Only bounced cheques can be replaced'
      });
    }

    // Create replacement cheque
    const replacementCheque = await Cheque.create({
      chequeNumber: newChequeNumber,
      tenantId: originalCheque.tenantId,
      leaseId: originalCheque.leaseId,
      paymentId: originalCheque.paymentId,
      bankAccountId: originalCheque.bankAccountId,
      bankName: newBankName || originalCheque.bankName,
      branchName: originalCheque.branchName,
      amount: newAmount || originalCheque.amount,
      currency: originalCheque.currency,
      chequeDate: newChequeDate || originalCheque.chequeDate,
      chequeType: originalCheque.chequeType,
      originalChequeId: originalCheque.id,
      notes: `Replacement for bounced cheque ${originalCheque.chequeNumber}`,
      createdBy: req.user.id
    });

    // Update original cheque
    await originalCheque.update({
      status: 'replaced',
      replacementChequeId: replacementCheque.id
    });

    res.status(201).json({
      success: true,
      message: 'Replacement cheque created successfully',
      data: {
        originalCheque,
        replacementCheque
      }
    });
  } catch (error) {
    console.error('Replace cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create replacement cheque',
      error: error.message
    });
  }
};

/**
 * Get cheque statistics
 */
exports.getChequeStats = async (req, res) => {
  try {
    const totalCheques = await Cheque.count({ where: { isActive: true } });
    const pendingCheques = await Cheque.count({ where: { status: 'pending', isActive: true } });
    const depositedCheques = await Cheque.count({ where: { status: 'deposited', isActive: true } });
    const clearedCheques = await Cheque.count({ where: { status: 'cleared', isActive: true } });
    const bouncedCheques = await Cheque.count({ where: { status: 'bounced', isActive: true } });

    const totalAmount = await Cheque.sum('amount', { where: { isActive: true } });
    const pendingAmount = await Cheque.sum('amount', { where: { status: 'pending', isActive: true } });
    const clearedAmount = await Cheque.sum('amount', { where: { status: 'cleared', isActive: true } });
    const bouncedAmount = await Cheque.sum('amount', { where: { status: 'bounced', isActive: true } });

    // PDC stats
    const today = new Date();
    const pdcCount = await Cheque.count({
      where: {
        chequeType: 'pdc',
        status: { [Op.in]: ['pending', 'deposited'] },
        chequeDate: { [Op.gte]: today },
        isActive: true
      }
    });

    const pdcAmount = await Cheque.sum('amount', {
      where: {
        chequeType: 'pdc',
        status: { [Op.in]: ['pending', 'deposited'] },
        chequeDate: { [Op.gte]: today },
        isActive: true
      }
    });

    // Bounce rate
    const bounceRate = totalCheques > 0 ? ((bouncedCheques / totalCheques) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCheques,
        pendingCheques,
        depositedCheques,
        clearedCheques,
        bouncedCheques,
        totalAmount: totalAmount || 0,
        pendingAmount: pendingAmount || 0,
        clearedAmount: clearedAmount || 0,
        bouncedAmount: bouncedAmount || 0,
        pdcCount,
        pdcAmount: pdcAmount || 0,
        bounceRate: parseFloat(bounceRate)
      }
    });
  } catch (error) {
    console.error('Get cheque stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Delete cheque (soft delete)
 */
exports.deleteCheque = async (req, res) => {
  try {
    const { id } = req.params;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    // Only allow deletion of pending or cancelled cheques
    if (!['pending', 'cancelled'].includes(cheque.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending or cancelled cheques'
      });
    }

    await cheque.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Cheque deleted successfully'
    });
  } catch (error) {
    console.error('Delete cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cheque',
      error: error.message
    });
  }
};
