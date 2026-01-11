/**
 * Migration: Enhance Budgets Table
 * Purpose: Add property-wise budgeting, alerts, and approval workflow
 * Related to: FINANCE_DATABASE_ERD.md - Section 5.3
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('budgets', 'property_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'property_id',
      comment: 'Link to specific property for property-wise budgets',
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('budgets', 'alert_threshold', {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 90,
      field: 'alert_threshold',
      comment: 'Alert when spent > threshold %'
    });

    await queryInterface.addColumn('budgets', 'variance_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'variance_percentage',
      comment: 'Current variance from budget'
    });

    await queryInterface.addColumn('budgets', 'approval_required', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'approval_required',
      comment: 'Whether budget needs approval'
    });

    await queryInterface.addColumn('budgets', 'alert_frequency', {
      type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'none'),
      defaultValue: 'weekly',
      field: 'alert_frequency',
      comment: 'How often to send budget alerts'
    });

    await queryInterface.addColumn('budgets', 'last_alert_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_alert_sent_at',
      comment: 'Last alert timestamp'
    });

    // Add indexes for new columns
    await queryInterface.addIndex('budgets', ['property_id'], {
      name: 'idx_budget_property_id'
    });

    await queryInterface.addIndex('budgets', ['alert_threshold'], {
      name: 'idx_budget_alert_threshold'
    });

    await queryInterface.addIndex('budgets', ['approval_required'], {
      name: 'idx_budget_approval_required'
    });

    // Composite index for property-wise budget queries
    await queryInterface.addIndex('budgets', ['property_id', 'fiscal_year'], {
      name: 'idx_budget_property_fiscal_year'
    });

    // Composite index for alert monitoring
    await queryInterface.addIndex('budgets', ['status', 'alert_frequency'], {
      name: 'idx_budget_alerts'
    });

    console.log('✓ Budgets table enhanced successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('budgets', 'idx_budget_property_id');
    await queryInterface.removeIndex('budgets', 'idx_budget_alert_threshold');
    await queryInterface.removeIndex('budgets', 'idx_budget_approval_required');
    await queryInterface.removeIndex('budgets', 'idx_budget_property_fiscal_year');
    await queryInterface.removeIndex('budgets', 'idx_budget_alerts');

    // Remove columns
    await queryInterface.removeColumn('budgets', 'last_alert_sent_at');
    await queryInterface.removeColumn('budgets', 'alert_frequency');
    await queryInterface.removeColumn('budgets', 'approval_required');
    await queryInterface.removeColumn('budgets', 'variance_percentage');
    await queryInterface.removeColumn('budgets', 'alert_threshold');
    await queryInterface.removeColumn('budgets', 'property_id');

    console.log('✓ Budgets table reverted');
  }
};

