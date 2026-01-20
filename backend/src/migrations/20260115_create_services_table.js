module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.describeTable('services');
      console.log('ℹ Services table already exists, skipping creation');
    } catch (error) {
      await queryInterface.createTable('services', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Service name like Security Deposit, Agency Fee, etc.'
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        is_taxable: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Whether this service is subject to tax (e.g., UAE VAT)'
        },
        billing_method: {
          type: Sequelize.ENUM('included_in_rental', 'charged_separately'),
          defaultValue: 'charged_separately',
          comment: 'How this service is billed to the tenant'
        },
        entity_type: {
          type: Sequelize.ENUM('unit', 'lease'),
          allowNull: false,
          comment: 'Type of entity this service is attached to'
        },
        entity_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'ID of the unit or lease this service belongs to'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Optional description for the service'
        },
        sort_order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Order in which services should be displayed'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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
      console.log('✅ Services table created successfully');
    }

    // Add indexes safely
    try {
      await queryInterface.addIndex('services', ['entity_type', 'entity_id'], {
        name: 'idx_entity'
      });
    } catch (e) { console.log('ℹ Index idx_entity already exists'); }
    
    try {
      await queryInterface.addIndex('services', ['entity_type'], {
        name: 'idx_entity_type'
      });
    } catch (e) { console.log('ℹ Index idx_entity_type already exists'); }
    
    try {
      await queryInterface.addIndex('services', ['entity_id'], {
        name: 'idx_entity_id'
      });
    } catch (e) { console.log('ℹ Index idx_entity_id already exists'); }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('services');
    console.log('✅ Services table dropped successfully');
  }
};
