'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'UAE, General, Email, etc.'
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      data_type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string'
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'System settings cannot be deleted'
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

    await queryInterface.addIndex('settings', ['key'], {
      unique: true,
      name: 'settings_key_unique'
    });

    await queryInterface.addIndex('settings', ['category'], {
      name: 'settings_category_index'
    });

    console.log('✅ Created settings table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('settings');
    console.log('❌ Dropped settings table');
  }
};
