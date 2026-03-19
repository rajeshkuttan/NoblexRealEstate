/**
 * Migration: Create legal module tables and update ENUMs
 * Purpose: Support Legal Case Management and general Audit Logging
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create Audit Logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      old_value: {
        type: Sequelize.JSON,
        allowNull: true
      },
      new_value: {
        type: Sequelize.JSON,
        allowNull: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // 2. Create Legal Cases table
    await queryInterface.createTable('legal_cases', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      case_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      lease_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'leases',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'units',
          key: 'id'
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      expected_closure_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('dispute', 'npa', 'case', 'available', 'case_closed'),
        defaultValue: 'dispute'
      },
      consultant_details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_approved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      closed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // 3. Update Unit status ENUM
    // Note: changeColumn for ENUM in MySQL can be problematic, but we'll try standard Sequelize way
    await queryInterface.changeColumn('units', 'status', {
      type: Sequelize.ENUM('available', 'occupied', 'maintenance', 'reserved', 'dispute'),
      defaultValue: 'available'
    });

    // 4. Update Document entity_type ENUM
    await queryInterface.changeColumn('documents', 'entity_type', {
      type: Sequelize.ENUM('vendor', 'lead', 'invoice', 'unit', 'ticket', 'legal_case'),
      allowNull: false
    });

    // Indexes for legal_cases
    await queryInterface.addIndex('legal_cases', ['case_number'], { name: 'idx_legal_cases_number' });
    await queryInterface.addIndex('legal_cases', ['lease_id'], { name: 'idx_legal_cases_lease' });
    await queryInterface.addIndex('legal_cases', ['unit_id'], { name: 'idx_legal_cases_unit' });
    await queryInterface.addIndex('legal_cases', ['status'], { name: 'idx_legal_cases_status' });
    
    // Indexes for audit_logs
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], { name: 'idx_audit_logs_entity' });
    await queryInterface.addIndex('audit_logs', ['user_id'], { name: 'idx_audit_logs_user' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('legal_cases');
    await queryInterface.dropTable('audit_logs');
    
    // Revert Unit status ENUM (be careful with existing data)
    await queryInterface.changeColumn('units', 'status', {
      type: Sequelize.ENUM('available', 'occupied', 'maintenance', 'reserved'),
      defaultValue: 'available'
    });

    // Revert Document entity_type ENUM
    await queryInterface.changeColumn('documents', 'entity_type', {
      type: Sequelize.ENUM('vendor', 'lead', 'invoice', 'unit', 'ticket'),
      allowNull: false
    });
  }
};
