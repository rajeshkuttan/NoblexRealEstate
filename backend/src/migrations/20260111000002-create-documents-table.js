/**
 * Migration: Create documents table
 * Purpose: Store vendor and lead documents with base64 file data
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      entity_type: {
        type: Sequelize.ENUM('vendor', 'lead'),
        allowNull: false,
        comment: 'Type of entity (vendor or lead)'
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the vendor or lead'
      },
      document_type: {
        type: Sequelize.ENUM('contract', 'license'),
        allowNull: false,
        comment: 'Type of document'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original file name'
      },
      file_data: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
        comment: 'Base64 encoded file data'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'MIME type of the file'
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User ID who uploaded the document',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      upload_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Date when document was uploaded'
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Document expiry date (optional)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the document'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Soft delete flag'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes with error handling
    try {
      await queryInterface.addIndex('documents', ['entity_type', 'entity_id'], {
        name: 'idx_documents_entity'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) throw error;
    }

    try {
      await queryInterface.addIndex('documents', ['document_type'], {
        name: 'idx_documents_type'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) throw error;
    }

    try {
      await queryInterface.addIndex('documents', ['expiry_date'], {
        name: 'idx_documents_expiry'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('documents');
  }
};
