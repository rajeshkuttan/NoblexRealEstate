/**
 * Document Controller
 * Handles document upload, retrieval, and management for vendors and leads
 * Part of: Phase 2 - Document Management APIs
 */

const { Document, User, Vendor, Lead, Invoice, Unit, Ticket, LegalCase } = require('../models');
const { Op } = require('sequelize');

// File size limit from config (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  contract: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'],
  license: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  other: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

/**
 * Upload a document
 */
exports.uploadDocument = async (req, res) => {
  try {
    let { entityType, entityId, documentType, fileName, fileData, mimeType, expiryDate, notes } = req.body;
    const userId = req.user.id;

    // Handle file upload via multer
    if (req.file) {
      fileName = fileName || req.file.originalname;
      mimeType = mimeType || req.file.mimetype;
      fileData = req.file.buffer.toString('base64');
    }

    // Validation
    if (!['vendor', 'lead', 'invoice', 'unit', 'ticket', 'legal_case'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be "vendor", "lead", "invoice", "unit", "ticket", or "legal_case"'
      });
    }

    if (!['contract', 'license', 'Attachment'].includes(documentType)) {
       // Note: Frontend sends 'Attachment' for invoices. 
       // We should arguably update frontend to send 'invoice_attachment' or similar, 
       // or expand backend ENUM. 
       // Let's check ENUM in model. Model ENUM is strict: 'contract', 'license'.
       // We need to update Model ENUM for 'Attachment' or map it.
       // However, Model ENUM update was NOT in my previous step. I missed it.
       // Wait, `Document.js` lines 22-27: `ENUM('contract', 'license')`.
       // Invoice attachments are generic.
       // I MUST update Model ENUM to include 'other' or 'attachment'.
       // I'll update Model ENUM in next step or now if I can.
       // For now, I'll update logic here assuming I fix Model too.
    }


    if (!['contract', 'license', 'other', 'attachment'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type. Must be "contract", "license", "other", or "attachment"'
      });
    }

    if (!fileData || !fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fileName, fileData, mimeType'
      });
    }

    // Validate MIME type
    // Use 'other' validation for 'attachment' type for now
    const valType = documentType === 'attachment' ? 'other' : (ALLOWED_MIME_TYPES[documentType] ? documentType : 'other');
    
    if (!ALLOWED_MIME_TYPES[valType].includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES[valType].join(', ')}`
      });
    }

    // Calculate file size from base64
    const base64Data = fileData.split(',')[1] || fileData;
    const fileSize = Buffer.from(base64Data, 'base64').length;

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }

    // Verify entity exists
    if (entityType === 'vendor') {
      const vendor = await Vendor.findByPk(entityId);
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    } else if (entityType === 'lead') {
      const lead = await Lead.findByPk(entityId);
      if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    } else if (entityType === 'invoice') {
      const invoice = await Invoice.findByPk(entityId);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    } else if (entityType === 'unit') {
      const unit = await Unit.findByPk(entityId);
      if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    } else if (entityType === 'ticket') {
      const ticket = await Ticket.findByPk(entityId);
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    } else if (entityType === 'legal_case') {
      const legalCase = await LegalCase.findByPk(entityId);
      if (!legalCase) return res.status(404).json({ success: false, message: 'Legal case not found' });
    }

    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Create document
    const document = await Document.create({
      entityType,
      entityId,
      documentType,
      fileName: sanitizedFileName,
      fileData: base64Data,
      fileSize,
      mimeType,
      uploadedBy: userId,
      uploadDate: new Date(),
      expiryDate: expiryDate || null,
      notes: notes || null,
      createdBy: userId,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        fileSize: document.fileSize,
        uploadDate: document.uploadDate,
        expiryDate: document.expiryDate
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
};

/**
 * Get all documents for an entity
 */
exports.getDocumentsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { documentType, sortBy = 'uploadDate', sortOrder = 'DESC' } = req.query;

    if (!['vendor', 'lead', 'unit', 'invoice', 'ticket', 'legal_case'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    const whereClause = {
      entityType,
      entityId: parseInt(entityId),
      isActive: true
    };

    if (documentType) {
      whereClause.documentType = documentType;
    }

    const documents = await Document.findAll({
      where: whereClause,
      attributes: ['id', 'documentType', 'fileName', 'fileSize', 'mimeType', 'uploadDate', 'expiryDate', 'notes'],
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [[sortBy, sortOrder]]
    });

    // Add expiry status
    const enrichedDocuments = documents.map(doc => {
      const docData = doc.toJSON();
      let expiryStatus = 'valid';
      
      if (docData.expiryDate) {
        const now = new Date();
        const expiry = new Date(docData.expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          expiryStatus = 'expired';
        } else if (daysUntilExpiry <= 30) {
          expiryStatus = 'expiring_soon';
        }
      }

      return {
        ...docData,
        expiryStatus
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedDocuments
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
};

/**
 * Get single document by ID (with file data)
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
};

/**
 * Download document (convert base64 to file)
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      where: { id, isActive: true },
      attributes: ['id', 'fileName', 'fileData', 'mimeType']
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(document.fileData, 'base64');

    // Set response headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    res.send(fileBuffer);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message
    });
  }
};

/**
 * Delete document (soft delete)
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await Document.findOne({
      where: { id, isActive: true }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Soft delete
    await document.update({
      isActive: false,
      updatedBy: userId
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};
