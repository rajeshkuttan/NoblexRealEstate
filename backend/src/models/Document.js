const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entityType: {
    type: DataTypes.ENUM('vendor', 'lead', 'invoice', 'unit'),
    allowNull: false,
    field: 'entity_type',
    comment: 'Type of entity (vendor, lead, or invoice)'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id',
    comment: 'ID of the vendor or lead'
  },
  documentType: {
    type: DataTypes.ENUM('contract', 'license', 'other'),
    allowNull: false,
    field: 'document_type',
    comment: 'Type of document'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name',
    comment: 'Original file name'
  },
  fileData: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    field: 'file_data',
    comment: 'Base64 encoded file data'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size',
    comment: 'File size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'mime_type',
    comment: 'MIME type of the file'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'uploaded_by',
    comment: 'User ID who uploaded the document',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'upload_date',
    comment: 'Date when document was uploaded'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date',
    comment: 'Document expiry date (optional)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the document'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Soft delete flag'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_documents_entity',
      fields: ['entity_type', 'entity_id']
    },
    {
      name: 'idx_documents_type',
      fields: ['document_type']
    },
    {
      name: 'idx_documents_expiry',
      fields: ['expiry_date']
    }
  ]
});

module.exports = Document;
