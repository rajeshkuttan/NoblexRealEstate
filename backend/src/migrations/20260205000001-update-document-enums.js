module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Update entity_type ENUM to include 'invoice'
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        MODIFY COLUMN entity_type ENUM('vendor', 'lead', 'invoice') NOT NULL COMMENT 'Type of entity (vendor, lead, or invoice)';
      `);
      
      // Update document_type ENUM to include 'other'
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        MODIFY COLUMN document_type ENUM('contract', 'license', 'other') NOT NULL COMMENT 'Type of document';
      `);
      
      console.log('Successfully updated documents table ENUMs');
    } catch (error) {
      console.error('Failed to update documents table ENUMs:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert entity_type ENUM (WARNING: Will fail if 'invoice' data exists)
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        MODIFY COLUMN entity_type ENUM('vendor', 'lead') NOT NULL COMMENT 'Type of entity (vendor or lead)';
      `);
      
      // Revert document_type ENUM (WARNING: Will fail if 'other' data exists)
      await queryInterface.sequelize.query(`
        ALTER TABLE documents 
        MODIFY COLUMN document_type ENUM('contract', 'license') NOT NULL COMMENT 'Type of document';
      `);
      
      console.log('Successfully reverted documents table ENUMs');
    } catch (error) {
      console.error('Failed to revert documents table ENUMs:', error);
      throw error;
    }
  }
};
