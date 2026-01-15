module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the setting already exists
    const [results] = await queryInterface.sequelize.query(
      "SELECT * FROM settings WHERE `key` = 'uae_vat_rate'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!results || results.length === 0) {
      await queryInterface.bulkInsert('settings', [{
        key: 'uae_vat_rate',
        value: '5',
        category: 'UAE',
        description: 'UAE VAT (Value Added Tax) rate in percentage',
        data_type: 'number',
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      
      console.log('✅ UAE VAT rate setting added successfully (5%)');
    } else {
      console.log('ℹ️ UAE VAT rate setting already exists, skipping');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('settings', {
      key: 'uae_vat_rate'
    });
    console.log('✅ UAE VAT rate setting removed successfully');
  }
};
