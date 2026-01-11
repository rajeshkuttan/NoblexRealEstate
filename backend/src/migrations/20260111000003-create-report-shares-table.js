/**
 * Migration: Create report_shares table
 * Purpose: Store shared financial reports with secure tokens
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('report_shares', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      report_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Name of the report being shared'
      },
      report_data: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
        comment: 'JSON or base64 encoded report data'
      },
      share_token: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
        comment: 'UUID token for secure access'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Token expiry date/time'
      },
      shared_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User ID who shared the report',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      shared_with: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email address(es) of recipients'
      },
      access_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of times the report has been accessed'
      },
      last_accessed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time the report was accessed'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional message from sender'
      },
      is_revoked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the share link has been revoked'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Soft delete flag'
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
      await queryInterface.addIndex('report_shares', ['share_token'], {
        name: 'idx_report_shares_token',
        unique: true
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) throw error;
    }

    try {
      await queryInterface.addIndex('report_shares', ['expires_at'], {
        name: 'idx_report_shares_expires'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) throw error;
    }

    try {
      await queryInterface.addIndex('report_shares', ['shared_by'], {
        name: 'idx_report_shares_shared_by'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('report_shares');
  }
};
