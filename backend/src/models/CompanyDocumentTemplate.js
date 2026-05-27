const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyDocumentTemplate = sequelize.define(
  'CompanyDocumentTemplate',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    documentType: { type: DataTypes.STRING(50), allowNull: false, field: 'document_type' },
    headerTemplate: { type: DataTypes.TEXT, allowNull: true, field: 'header_template' },
    footerTemplate: { type: DataTypes.TEXT, allowNull: true, field: 'footer_template' },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    signature: { type: DataTypes.STRING(255), allowNull: true },
    stamp: { type: DataTypes.STRING(255), allowNull: true },
    showTrn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'show_trn' },
    showBank: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'show_bank' },
  },
  { tableName: 'company_document_templates', timestamps: true, underscored: true }
);

module.exports = CompanyDocumentTemplate;
