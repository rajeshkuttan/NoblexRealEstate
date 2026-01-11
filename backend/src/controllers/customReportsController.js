/**
 * Custom Reports Controller
 * Handles custom report definition CRUD and dynamic execution
 * Part of: Phase 5.3 - Custom Report Builder
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// In-memory storage for custom reports (in production, use a dedicated table)
let customReports = [];
let reportIdCounter = 1;

/**
 * Get all custom reports
 * GET /api/custom-reports
 */
exports.getAllCustomReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId = '' } = req.query;
    const offset = (page - 1) * limit;

    let filtered = customReports.filter(report => !report.isDeleted);
    
    if (userId) {
      filtered = filtered.filter(report => report.createdBy === parseInt(userId));
    }

    const paginated = filtered.slice(offset, offset + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        reports: paginated,
        pagination: {
          total: filtered.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filtered.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all custom reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom reports',
      error: error.message
    });
  }
};

/**
 * Get custom report by ID
 * GET /api/custom-reports/:id
 */
exports.getCustomReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = customReports.find(r => r.id === parseInt(id) && !r.isDeleted);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Custom report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get custom report by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch custom report',
      error: error.message
    });
  }
};

/**
 * Create custom report
 * POST /api/custom-reports
 */
exports.createCustomReport = async (req, res) => {
  try {
    const {
      reportName,
      description,
      dataSource,
      selectedFields,
      filters,
      groupBy,
      sortBy,
      chartType,
      chartConfig,
      schedule
    } = req.body;

    // Validation
    if (!reportName || !dataSource || !selectedFields || selectedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report name, data source, and at least one field are required'
      });
    }

    const newReport = {
      id: reportIdCounter++,
      reportName,
      description: description || '',
      dataSource,
      selectedFields,
      filters: filters || [],
      groupBy: groupBy || null,
      sortBy: sortBy || [],
      chartType: chartType || null,
      chartConfig: chartConfig || {},
      schedule: schedule || null,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      runCount: 0,
      isDeleted: false
    };

    customReports.push(newReport);

    res.status(201).json({
      success: true,
      message: 'Custom report created successfully',
      data: newReport
    });
  } catch (error) {
    console.error('Create custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create custom report',
      error: error.message
    });
  }
};

/**
 * Update custom report
 * PUT /api/custom-reports/:id
 */
exports.updateCustomReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reportName,
      description,
      dataSource,
      selectedFields,
      filters,
      groupBy,
      sortBy,
      chartType,
      chartConfig,
      schedule
    } = req.body;

    const reportIndex = customReports.findIndex(r => r.id === parseInt(id) && !r.isDeleted);
    
    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Custom report not found'
      });
    }

    // Update report
    customReports[reportIndex] = {
      ...customReports[reportIndex],
      reportName: reportName || customReports[reportIndex].reportName,
      description: description !== undefined ? description : customReports[reportIndex].description,
      dataSource: dataSource || customReports[reportIndex].dataSource,
      selectedFields: selectedFields || customReports[reportIndex].selectedFields,
      filters: filters !== undefined ? filters : customReports[reportIndex].filters,
      groupBy: groupBy !== undefined ? groupBy : customReports[reportIndex].groupBy,
      sortBy: sortBy !== undefined ? sortBy : customReports[reportIndex].sortBy,
      chartType: chartType !== undefined ? chartType : customReports[reportIndex].chartType,
      chartConfig: chartConfig !== undefined ? chartConfig : customReports[reportIndex].chartConfig,
      schedule: schedule !== undefined ? schedule : customReports[reportIndex].schedule,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Custom report updated successfully',
      data: customReports[reportIndex]
    });
  } catch (error) {
    console.error('Update custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update custom report',
      error: error.message
    });
  }
};

/**
 * Delete custom report
 * DELETE /api/custom-reports/:id
 */
exports.deleteCustomReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reportIndex = customReports.findIndex(r => r.id === parseInt(id) && !r.isDeleted);
    
    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Custom report not found'
      });
    }

    // Soft delete
    customReports[reportIndex].isDeleted = true;
    customReports[reportIndex].updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Custom report deleted successfully'
    });
  } catch (error) {
    console.error('Delete custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete custom report',
      error: error.message
    });
  }
};

/**
 * Execute custom report
 * POST /api/custom-reports/:id/execute
 */
exports.executeCustomReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters = {} } = req.body;
    
    const report = customReports.find(r => r.id === parseInt(id) && !r.isDeleted);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Custom report not found'
      });
    }

    // Build dynamic SQL query based on report definition
    const query = buildDynamicQuery(report, parameters);
    
    // Execute query
    const [results] = await sequelize.query(query, {
      replacements: parameters,
      type: sequelize.QueryTypes.SELECT
    });

    // Update report metadata
    const reportIndex = customReports.findIndex(r => r.id === parseInt(id));
    if (reportIndex !== -1) {
      customReports[reportIndex].lastRunAt = new Date().toISOString();
      customReports[reportIndex].runCount++;
    }

    res.status(200).json({
      success: true,
      data: {
        report: {
          id: report.id,
          reportName: report.reportName,
          executedAt: new Date().toISOString()
        },
        results: results,
        totalRecords: results.length
      }
    });
  } catch (error) {
    console.error('Execute custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute custom report',
      error: error.message
    });
  }
};

/**
 * Get available data sources
 * GET /api/custom-reports/datasources
 */
exports.getDataSources = async (req, res) => {
  try {
    const dataSources = [
      {
        id: 'chart_of_accounts',
        name: 'Chart of Accounts',
        table: 'chart_of_accounts',
        fields: [
          { name: 'accountCode', label: 'Account Code', type: 'string' },
          { name: 'accountName', label: 'Account Name', type: 'string' },
          { name: 'accountType', label: 'Account Type', type: 'enum' },
          { name: 'category', label: 'Category', type: 'string' },
          { name: 'parentId', label: 'Parent Account', type: 'number' }
        ]
      },
      {
        id: 'properties',
        name: 'Properties',
        table: 'properties',
        fields: [
          { name: 'propertyName', label: 'Property Name', type: 'string' },
          { name: 'propertyType', label: 'Property Type', type: 'enum' },
          { name: 'address', label: 'Address', type: 'string' },
          { name: 'totalUnits', label: 'Total Units', type: 'number' },
          { name: 'purchasePrice', label: 'Purchase Price', type: 'decimal' }
        ]
      },
      {
        id: 'tenants',
        name: 'Tenants',
        table: 'tenants',
        fields: [
          { name: 'firstName', label: 'First Name', type: 'string' },
          { name: 'lastName', label: 'Last Name', type: 'string' },
          { name: 'email', label: 'Email', type: 'string' },
          { name: 'phone', label: 'Phone', type: 'string' },
          { name: 'emiratesId', label: 'Emirates ID', type: 'string' }
        ]
      },
      {
        id: 'leases',
        name: 'Leases',
        table: 'leases',
        fields: [
          { name: 'leaseNumber', label: 'Lease Number', type: 'string' },
          { name: 'startDate', label: 'Start Date', type: 'date' },
          { name: 'endDate', label: 'End Date', type: 'date' },
          { name: 'monthlyRent', label: 'Monthly Rent', type: 'decimal' },
          { name: 'securityDeposit', label: 'Security Deposit', type: 'decimal' },
          { name: 'status', label: 'Status', type: 'enum' }
        ]
      },
      {
        id: 'invoices',
        name: 'Invoices',
        table: 'invoices',
        fields: [
          { name: 'invoiceNumber', label: 'Invoice Number', type: 'string' },
          { name: 'invoiceDate', label: 'Invoice Date', type: 'date' },
          { name: 'dueDate', label: 'Due Date', type: 'date' },
          { name: 'subtotal', label: 'Subtotal', type: 'decimal' },
          { name: 'taxAmount', label: 'Tax Amount', type: 'decimal' },
          { name: 'totalAmount', label: 'Total Amount', type: 'decimal' },
          { name: 'status', label: 'Status', type: 'enum' }
        ]
      },
      {
        id: 'payments',
        name: 'Payments',
        table: 'payments',
        fields: [
          { name: 'paymentNumber', label: 'Payment Number', type: 'string' },
          { name: 'paymentDate', label: 'Payment Date', type: 'date' },
          { name: 'amount', label: 'Amount', type: 'decimal' },
          { name: 'paymentMethod', label: 'Payment Method', type: 'enum' },
          { name: 'status', label: 'Status', type: 'enum' }
        ]
      },
      {
        id: 'financial_transactions',
        name: 'Financial Transactions',
        table: 'financial_transactions',
        fields: [
          { name: 'transactionDate', label: 'Transaction Date', type: 'date' },
          { name: 'transactionType', label: 'Type', type: 'enum' },
          { name: 'amount', label: 'Amount', type: 'decimal' },
          { name: 'description', label: 'Description', type: 'string' },
          { name: 'category', label: 'Category', type: 'string' },
          { name: 'propertyId', label: 'Property', type: 'number' }
        ]
      },
      {
        id: 'vendors',
        name: 'Vendors',
        table: 'vendors',
        fields: [
          { name: 'vendorName', label: 'Vendor Name', type: 'string' },
          { name: 'email', label: 'Email', type: 'string' },
          { name: 'phone', label: 'Phone', type: 'string' },
          { name: 'category', label: 'Category', type: 'string' },
          { name: 'paymentTerms', label: 'Payment Terms', type: 'number' }
        ]
      }
    ];

    res.status(200).json({
      success: true,
      data: dataSources
    });
  } catch (error) {
    console.error('Get data sources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data sources',
      error: error.message
    });
  }
};

/**
 * Build dynamic SQL query from report definition
 */
function buildDynamicQuery(report, parameters) {
  const { dataSource, selectedFields, filters, groupBy, sortBy } = report;

  // SELECT clause
  let selectClause = selectedFields.map(field => {
    if (field.aggregate) {
      return `${field.aggregate}(${field.name}) AS ${field.alias || field.name}`;
    }
    return field.name;
  }).join(', ');

  // FROM clause
  let fromClause = dataSource;

  // WHERE clause
  let whereClause = '1=1';
  if (filters && filters.length > 0) {
    const conditions = filters.map(filter => {
      const { field, operator, value } = filter;
      switch (operator) {
        case 'equals':
          return `${field} = '${value}'`;
        case 'not_equals':
          return `${field} != '${value}'`;
        case 'contains':
          return `${field} LIKE '%${value}%'`;
        case 'greater_than':
          return `${field} > ${value}`;
        case 'less_than':
          return `${field} < ${value}`;
        case 'between':
          return `${field} BETWEEN '${value[0]}' AND '${value[1]}'`;
        default:
          return '1=1';
      }
    });
    whereClause += ' AND ' + conditions.join(' AND ');
  }

  // GROUP BY clause
  let groupByClause = '';
  if (groupBy) {
    groupByClause = `GROUP BY ${groupBy}`;
  }

  // ORDER BY clause
  let orderByClause = '';
  if (sortBy && sortBy.length > 0) {
    const sortFields = sortBy.map(sort => `${sort.field} ${sort.direction}`).join(', ');
    orderByClause = `ORDER BY ${sortFields}`;
  }

  // Combine all clauses
  const query = `
    SELECT ${selectClause}
    FROM ${fromClause}
    WHERE ${whereClause}
    ${groupByClause}
    ${orderByClause}
    LIMIT 1000
  `.trim();

  return query;
}

module.exports = exports;
