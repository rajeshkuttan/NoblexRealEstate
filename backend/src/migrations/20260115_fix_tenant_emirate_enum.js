'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, update existing data to new format
    await queryInterface.sequelize.query(`
      UPDATE tenants 
      SET emirate = CASE 
        WHEN emirate = 'Dubai' THEN 'dubai'
        WHEN emirate = 'Abu Dhabi' THEN 'abu_dhabi'
        WHEN emirate = 'Sharjah' THEN 'sharjah'
        WHEN emirate = 'Ajman' THEN 'ajman'
        WHEN emirate = 'Ras Al Khaimah' THEN 'ras_al_khaimah'
        WHEN emirate = 'Fujairah' THEN 'fujairah'
        WHEN emirate = 'Umm Al Quwain' THEN 'umm_al_quwain'
        ELSE emirate
      END
      WHERE emirate IS NOT NULL;
    `);

    // Then, modify the column to use new enum values
    await queryInterface.changeColumn('tenants', 'emirate', {
      type: Sequelize.ENUM('dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'),
      allowNull: true
    });

    console.log('✅ Updated tenant emirate enum to match Property and Lead models');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert data to old format
    await queryInterface.sequelize.query(`
      UPDATE tenants 
      SET emirate = CASE 
        WHEN emirate = 'dubai' THEN 'Dubai'
        WHEN emirate = 'abu_dhabi' THEN 'Abu Dhabi'
        WHEN emirate = 'sharjah' THEN 'Sharjah'
        WHEN emirate = 'ajman' THEN 'Ajman'
        WHEN emirate = 'ras_al_khaimah' THEN 'Ras Al Khaimah'
        WHEN emirate = 'fujairah' THEN 'Fujairah'
        WHEN emirate = 'umm_al_quwain' THEN 'Umm Al Quwain'
        ELSE emirate
      END
      WHERE emirate IS NOT NULL;
    `);

    // Revert column to old enum values
    await queryInterface.changeColumn('tenants', 'emirate', {
      type: Sequelize.ENUM('Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'),
      allowNull: true
    });

    console.log('✅ Reverted tenant emirate enum to old format');
  }
};
