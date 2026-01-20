module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.describeTable('service_templates');
      console.log('ℹ service_templates table already exists, skipping creation');
    } catch (error) {
      await queryInterface.createTable('service_templates', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Service template name like Security Deposit, Agency Fee, etc.'
        },
        default_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
          comment: 'Default amount for this service'
        },
        is_taxable: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Whether this service is subject to tax by default'
        },
        billing_method: {
          type: Sequelize.ENUM('included_in_rental', 'charged_separately'),
          defaultValue: 'charged_separately',
          comment: 'Default billing method for this service'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Optional description for the service template'
        },
        category: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Category like UAE Mandatory, Optional, Custom'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Whether this template is active'
        },
        is_system: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'System templates cannot be deleted'
        },
        sort_order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Display order'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      });
      console.log('✅ Service templates table created successfully');
    }

    // Add indexes safely
    try {
      await queryInterface.addIndex('service_templates', ['category'], {
        name: 'idx_category'
      });
    } catch (e) { console.log('ℹ Index idx_category already exists'); }
    
    try {
      await queryInterface.addIndex('service_templates', ['is_active'], {
        name: 'idx_active'
      });
    } catch (e) { console.log('ℹ Index idx_active already exists'); }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('service_templates');
    console.log('✅ Service templates table dropped successfully');
  }
};
