/**
 * Financial Reports Controller
 * Advanced financial reporting and analytics
 * Part of: Phase 5 - Reports & Analytics
 */

const {
  Property,
  FinancialTransaction,
  Invoice,
  Payment,
  Lease,
  Unit,
  Budget,
  VendorInvoice,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * Get property-wise profitability report
 * Calculates NOI, ROI, and per-unit metrics for each property
 * GET /api/finance/reports/property-profitability
 */
exports.getPropertyProfitability = async (req, res) => {
  try {
    const {
      startDate = '',
      endDate = '',
      propertyId = '',
      minRevenue = 0,
      sortBy = 'noi',
      sortOrder = 'DESC'
    } = req.query;

    // Set default date range (current year) if not provided
    let dateFrom, dateTo;
    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      dateFrom = new Date(new Date().getFullYear(), 0, 1); // Jan 1st of current year
      dateTo = new Date(); // Today
    }

    // Build property filter
    const propertyWhereClause = { isActive: true };
    if (propertyId) {
      propertyWhereClause.id = propertyId;
    }

    // Get all properties
    const properties = await Property.findAll({
      where: propertyWhereClause,
      include: [
        {
          model: Unit,
          as: 'units',
          attributes: ['id', 'unitNumber', 'bedrooms', 'area']
        }
      ]
    });

    // Analyze each property
    const propertyAnalysis = await Promise.all(
      properties.map(async (property) => {
        // Get revenue from payments for this property
        const revenueData = await Payment.findOne({
          attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
          ],
          include: [
            {
              model: Lease,
              as: 'lease',
              attributes: [],
              where: { propertyId: property.id },
              required: true
            }
          ],
          where: {
            paymentDate: {
              [Op.between]: [dateFrom, dateTo]
            },
            status: 'completed'
          },
          raw: true
        });

        const totalRevenue = parseFloat(revenueData?.total_revenue || 0);

        // Get expenses from financial transactions
        const expensesData = await FinancialTransaction.findOne({
          attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total_expenses']
          ],
          where: {
            propertyId: property.id,
            transactionDate: {
              [Op.between]: [dateFrom, dateTo]
            },
            transactionType: 'debit'
          },
          raw: true
        });

        const totalExpenses = parseFloat(expensesData?.total_expenses || 0);

        // Get vendor invoices for this property
        const vendorExpenses = await VendorInvoice.findOne({
          attributes: [
            [sequelize.fn('SUM', sequelize.col('totalAmount')), 'vendor_expenses']
          ],
          where: {
            propertyId: property.id,
            invoiceDate: {
              [Op.between]: [dateFrom, dateTo]
            },
            paymentStatus: 'paid',
            isActive: true
          },
          raw: true
        });

        const totalVendorExpenses = parseFloat(vendorExpenses?.vendor_expenses || 0);

        // Calculate metrics
        const totalCombinedExpenses = totalExpenses + totalVendorExpenses;
        const noi = totalRevenue - totalCombinedExpenses; // Net Operating Income
        const noiMargin = totalRevenue > 0 ? (noi / totalRevenue) * 100 : 0;

        // Calculate per-unit metrics
        const unitCount = property.units?.length || 1;
        const revenuePerUnit = totalRevenue / unitCount;
        const expensesPerUnit = totalCombinedExpenses / unitCount;
        const noiPerUnit = noi / unitCount;

        // Get active leases count
        const activeLeases = await Lease.count({
          where: {
            propertyId: property.id,
            status: 'active'
          }
        });

        // Calculate occupancy rate
        const occupancyRate = unitCount > 0 ? (activeLeases / unitCount) * 100 : 0;

        // Estimate property value (simplified - would use actual valuations in production)
        const estimatedValue = parseFloat(property.purchasePrice || totalRevenue * 10); // 10x revenue multiplier as placeholder

        // Calculate ROI
        const roi = estimatedValue > 0 ? (noi / estimatedValue) * 100 : 0;

        // Get budget comparison if available
        let budgetVariance = null;
        const budgetData = await Budget.findOne({
          where: {
            propertyId: property.id,
            periodStart: { [Op.lte]: dateTo },
            periodEnd: { [Op.gte]: dateFrom },
            status: 'approved',
            isActive: true
          },
          attributes: ['budgetedRevenue', 'budgetedExpenses']
        });

        if (budgetData) {
          const revenueVariance = totalRevenue - parseFloat(budgetData.budgetedRevenue || 0);
          const expensesVariance = totalCombinedExpenses - parseFloat(budgetData.budgetedExpenses || 0);
          budgetVariance = {
            revenue_budgeted: parseFloat(budgetData.budgetedRevenue || 0),
            revenue_actual: totalRevenue,
            revenue_variance: revenueVariance,
            revenue_variance_percent: budgetData.budgetedRevenue > 0 
              ? (revenueVariance / budgetData.budgetedRevenue) * 100 
              : 0,
            expenses_budgeted: parseFloat(budgetData.budgetedExpenses || 0),
            expenses_actual: totalCombinedExpenses,
            expenses_variance: expensesVariance,
            expenses_variance_percent: budgetData.budgetedExpenses > 0 
              ? (expensesVariance / budgetData.budgetedExpenses) * 100 
              : 0
          };
        }

        return {
          property_id: property.id,
          property_name: property.propertyName,
          property_type: property.propertyType,
          address: property.address,
          total_units: unitCount,
          active_leases: activeLeases,
          occupancy_rate: Math.round(occupancyRate * 10) / 10,
          total_revenue: Math.round(totalRevenue),
          total_expenses: Math.round(totalCombinedExpenses),
          noi: Math.round(noi),
          noi_margin: Math.round(noiMargin * 10) / 10,
          revenue_per_unit: Math.round(revenuePerUnit),
          expenses_per_unit: Math.round(expensesPerUnit),
          noi_per_unit: Math.round(noiPerUnit),
          estimated_value: Math.round(estimatedValue),
          roi: Math.round(roi * 10) / 10,
          budget_comparison: budgetVariance
        };
      })
    );

    // Filter by minimum revenue if specified
    let filteredAnalysis = propertyAnalysis;
    if (minRevenue > 0) {
      filteredAnalysis = propertyAnalysis.filter(p => p.total_revenue >= minRevenue);
    }

    // Sort results
    filteredAnalysis.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      return sortOrder === 'DESC' ? bVal - aVal : aVal - bVal;
    });

    // Calculate portfolio-level metrics
    const portfolioSummary = {
      total_properties: filteredAnalysis.length,
      total_units: filteredAnalysis.reduce((sum, p) => sum + p.total_units, 0),
      total_active_leases: filteredAnalysis.reduce((sum, p) => sum + p.active_leases, 0),
      avg_occupancy_rate: filteredAnalysis.length > 0
        ? Math.round((filteredAnalysis.reduce((sum, p) => sum + p.occupancy_rate, 0) / filteredAnalysis.length) * 10) / 10
        : 0,
      total_revenue: filteredAnalysis.reduce((sum, p) => sum + p.total_revenue, 0),
      total_expenses: filteredAnalysis.reduce((sum, p) => sum + p.total_expenses, 0),
      portfolio_noi: filteredAnalysis.reduce((sum, p) => sum + p.noi, 0),
      avg_noi_margin: filteredAnalysis.length > 0
        ? Math.round((filteredAnalysis.reduce((sum, p) => sum + p.noi_margin, 0) / filteredAnalysis.length) * 10) / 10
        : 0,
      avg_roi: filteredAnalysis.length > 0
        ? Math.round((filteredAnalysis.reduce((sum, p) => sum + p.roi, 0) / filteredAnalysis.length) * 10) / 10
        : 0
    };

    // Identify top and bottom performers
    const topPerformers = [...filteredAnalysis]
      .sort((a, b) => b.noi - a.noi)
      .slice(0, 3)
      .map(p => ({
        property_id: p.property_id,
        property_name: p.property_name,
        noi: p.noi,
        noi_margin: p.noi_margin
      }));

    const bottomPerformers = [...filteredAnalysis]
      .sort((a, b) => a.noi - b.noi)
      .slice(0, 3)
      .map(p => ({
        property_id: p.property_id,
        property_name: p.property_name,
        noi: p.noi,
        noi_margin: p.noi_margin
      }));

    res.status(200).json({
      success: true,
      data: {
        period: {
          from: dateFrom.toISOString().substring(0, 10),
          to: dateTo.toISOString().substring(0, 10)
        },
        portfolio_summary: portfolioSummary,
        property_breakdown: filteredAnalysis,
        insights: {
          top_performers: topPerformers,
          bottom_performers: bottomPerformers
        }
      }
    });
  } catch (error) {
    console.error('Get property profitability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate property profitability report',
      error: error.message
    });
  }
};

/**
 * Get single property financial summary
 * GET /api/finance/reports/property-financials/:propertyId
 */
exports.getPropertyFinancials = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const {
      startDate = '',
      endDate = ''
    } = req.query;

    // Set default date range (current year) if not provided
    let dateFrom, dateTo;
    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      dateFrom = new Date(new Date().getFullYear(), 0, 1);
      dateTo = new Date();
    }

    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: Unit,
          as: 'units'
        }
      ]
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Get monthly revenue trend
    const monthlyRevenue = await Payment.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue']
      ],
      include: [
        {
          model: Lease,
          as: 'lease',
          attributes: [],
          where: { propertyId },
          required: true
        }
      ],
      where: {
        paymentDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        status: 'completed'
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Get monthly expenses trend
    const monthlyExpenses = await FinancialTransaction.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('transaction_date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'expenses']
      ],
      where: {
        propertyId,
        transactionDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        transactionType: 'debit'
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('transaction_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('transaction_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Combine monthly data
    const monthlyData = {};
    monthlyRevenue.forEach(row => {
      monthlyData[row.month] = {
        month: row.month,
        revenue: Math.round(parseFloat(row.revenue || 0)),
        expenses: 0,
        noi: 0
      };
    });

    monthlyExpenses.forEach(row => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = {
          month: row.month,
          revenue: 0,
          expenses: 0,
          noi: 0
        };
      }
      monthlyData[row.month].expenses = Math.round(parseFloat(row.expenses || 0));
    });

    // Calculate NOI for each month
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].noi = monthlyData[month].revenue - monthlyData[month].expenses;
    });

    const monthlyTrends = Object.values(monthlyData);

    // Get expense breakdown by category
    const expensesByCategory = await FinancialTransaction.findAll({
      attributes: [
        'category',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        propertyId,
        transactionDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        transactionType: 'debit'
      },
      group: ['category'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        property: {
          id: property.id,
          name: property.propertyName,
          type: property.propertyType,
          total_units: property.units?.length || 0
        },
        period: {
          from: dateFrom.toISOString().substring(0, 10),
          to: dateTo.toISOString().substring(0, 10)
        },
        monthly_trends: monthlyTrends,
        expenses_by_category: expensesByCategory.map(row => ({
          category: row.category || 'Uncategorized',
          amount: Math.round(parseFloat(row.total))
        }))
      }
    });
  } catch (error) {
    console.error('Get property financials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property financial summary',
      error: error.message
    });
  }
};

/**
 * Get enhanced AR aging report with risk scoring
 * Analyzes tenant payment patterns and collection probability
 * GET /api/finance/reports/ar-aging-enhanced
 */
exports.getEnhancedARAgingReport = async (req, res) => {
  try {
    const { tenantId = '', propertyId = '' } = req.query;

    // Build where clause
    const whereClause = {
      status: { [Op.in]: ['pending', 'partially_paid', 'overdue'] }
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    // Get all unpaid/partially paid invoices
    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'propertyId', 'startDate', 'endDate', 'monthlyRent'],
          where: propertyId ? { propertyId } : {},
          required: propertyId ? true : false
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    // Calculate aging buckets with risk scoring
    const today = new Date();
    const agingData = {
      current: [],
      days_30: [],
      days_60: [],
      days_90: [],
      days_90_plus: []
    };

    const totals = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      days_90_plus: 0,
      total: 0
    };

    // Process each invoice with risk scoring
    for (const invoice of invoices) {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      const amount = parseFloat(invoice.totalAmount);

      // Calculate risk score and collection probability
      const riskAnalysis = await calculateTenantRiskScore(invoice.tenantId, daysOverdue);

      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenant_id: invoice.tenantId,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate,
        total_amount: amount,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0,
        risk_score: riskAnalysis.risk_score,
        risk_level: riskAnalysis.risk_level,
        collection_probability: riskAnalysis.collection_probability,
        recommended_action: riskAnalysis.recommended_action
      };

      // Categorize into aging buckets
      if (daysOverdue <= 0) {
        agingData.current.push(invoiceData);
        totals.current += amount;
      } else if (daysOverdue <= 30) {
        agingData.days_30.push(invoiceData);
        totals.days_30 += amount;
      } else if (daysOverdue <= 60) {
        agingData.days_60.push(invoiceData);
        totals.days_60 += amount;
      } else if (daysOverdue <= 90) {
        agingData.days_90.push(invoiceData);
        totals.days_90 += amount;
      } else {
        agingData.days_90_plus.push(invoiceData);
        totals.days_90_plus += amount;
      }

      totals.total += amount;
    }

    // Calculate risk-weighted totals
    const riskWeightedAmount = invoices.reduce((sum, inv) => {
      const invData = [
        ...agingData.current,
        ...agingData.days_30,
        ...agingData.days_60,
        ...agingData.days_90,
        ...agingData.days_90_plus
      ].find(item => item.id === inv.id);
      
      if (invData) {
        const riskWeight = (100 - invData.collection_probability) / 100;
        return sum + (invData.total_amount * riskWeight);
      }
      return sum;
    }, 0);

    // Generate action recommendations
    const recommendations = [];

    const highRiskInvoices = [
      ...agingData.current,
      ...agingData.days_30,
      ...agingData.days_60,
      ...agingData.days_90,
      ...agingData.days_90_plus
    ].filter(inv => inv.risk_level === 'high');

    if (highRiskInvoices.length > 0) {
      const highRiskAmount = highRiskInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      recommendations.push({
        type: 'high_risk',
        priority: 'urgent',
        message: `${highRiskInvoices.length} invoice(s) with high collection risk totaling AED ${Math.round(highRiskAmount).toLocaleString()}`,
        action: 'Immediate follow-up required - consider legal action or payment plans',
        affected_invoices: highRiskInvoices.map(inv => inv.invoiceNumber)
      });
    }

    if (agingData.days_90_plus.length > 0) {
      recommendations.push({
        type: 'overdue_90_plus',
        priority: 'high',
        message: `${agingData.days_90_plus.length} invoice(s) overdue by 90+ days`,
        action: 'Consider write-off assessment or escalation to collections agency',
        affected_invoices: agingData.days_90_plus.map(inv => inv.invoiceNumber)
      });
    }

    // Sort each bucket by risk score (highest risk first)
    Object.keys(agingData).forEach(bucket => {
      agingData[bucket].sort((a, b) => b.risk_score - a.risk_score);
    });

    res.status(200).json({
      success: true,
      data: {
        aging_buckets: agingData,
        totals: {
          ...totals,
          risk_weighted_amount: Math.round(riskWeightedAmount),
          expected_collection: Math.round(totals.total - riskWeightedAmount)
        },
        summary: {
          total_invoices: invoices.length,
          total_outstanding: Math.round(totals.total),
          current_count: agingData.current.length,
          overdue_count: agingData.days_30.length + agingData.days_60.length + 
                         agingData.days_90.length + agingData.days_90_plus.length,
          high_risk_count: highRiskInvoices.length
        },
        recommendations
      }
    });
  } catch (error) {
    console.error('Get enhanced AR aging report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate enhanced AR aging report',
      error: error.message
    });
  }
};

/**
 * Get budget vs actual comparison report
 * Multi-level variance analysis (overall, category, property)
 * GET /api/finance/reports/budget-vs-actual
 */
exports.getBudgetVsActualReport = async (req, res) => {
  try {
    const {
      budgetId = '',
      propertyId = '',
      startDate = '',
      endDate = '',
      varianceThreshold = 10 // % variance threshold for alerts
    } = req.query;

    // Determine the period to analyze
    let dateFrom, dateTo, budget;

    if (budgetId) {
      // Use specific budget
      budget = await Budget.findByPk(budgetId);
      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget not found'
        });
      }
      dateFrom = new Date(budget.periodStart);
      dateTo = new Date(budget.periodEnd);
    } else {
      // Use date range
      if (startDate && endDate) {
        dateFrom = new Date(startDate);
        dateTo = new Date(endDate);
      } else {
        // Default to current fiscal year
        const now = new Date();
        dateFrom = new Date(now.getFullYear(), 0, 1);
        dateTo = new Date(now.getFullYear(), 11, 31);
      }

      // Find budget for this period
      budget = await Budget.findOne({
        where: {
          periodStart: { [Op.lte]: dateTo },
          periodEnd: { [Op.gte]: dateFrom },
          status: 'approved',
          isActive: true,
          ...(propertyId && { propertyId })
        },
        order: [['createdAt', 'DESC']]
      });
    }

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'No approved budget found for the specified period'
      });
    }

    // Get actual revenue
    const actualRevenueData = await Payment.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
      ],
      include: propertyId ? [
        {
          model: Lease,
          as: 'lease',
          attributes: [],
          where: { propertyId },
          required: true
        }
      ] : [],
      where: {
        paymentDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        status: 'completed'
      },
      raw: true
    });

    const actualRevenue = parseFloat(actualRevenueData?.total_revenue || 0);

    // Get actual expenses
    const actualExpensesData = await FinancialTransaction.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_expenses']
      ],
      where: {
        transactionDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        transactionType: 'debit',
        ...(propertyId && { propertyId })
      },
      raw: true
    });

    const actualExpenses = parseFloat(actualExpensesData?.total_expenses || 0);

    // Calculate overall variances
    const budgetedRevenue = parseFloat(budget.budgetedRevenue || 0);
    const budgetedExpenses = parseFloat(budget.budgetedExpenses || 0);
    const budgetedProfit = budgetedRevenue - budgetedExpenses;
    const actualProfit = actualRevenue - actualExpenses;

    const revenueVariance = actualRevenue - budgetedRevenue;
    const revenueVariancePct = budgetedRevenue > 0 
      ? (revenueVariance / budgetedRevenue) * 100 
      : 0;

    const expensesVariance = actualExpenses - budgetedExpenses;
    const expensesVariancePct = budgetedExpenses > 0 
      ? (expensesVariance / budgetedExpenses) * 100 
      : 0;

    const profitVariance = actualProfit - budgetedProfit;
    const profitVariancePct = budgetedProfit > 0 
      ? (profitVariance / budgetedProfit) * 100 
      : 0;

    // Get category-level breakdown
    const expensesByCategory = await FinancialTransaction.findAll({
      attributes: [
        'category',
        [sequelize.fn('SUM', sequelize.col('amount')), 'actual_amount']
      ],
      where: {
        transactionDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        transactionType: 'debit',
        ...(propertyId && { propertyId })
      },
      group: ['category'],
      raw: true
    });

    // Parse budget breakdown if available
    let budgetBreakdown = {};
    try {
      budgetBreakdown = budget.breakdown ? JSON.parse(budget.breakdown) : {};
    } catch (e) {
      console.error('Error parsing budget breakdown:', e);
    }

    const categoryAnalysis = expensesByCategory.map(row => {
      const category = row.category || 'Uncategorized';
      const actualAmount = parseFloat(row.actual_amount);
      const budgetedAmount = parseFloat(budgetBreakdown[category] || 0);
      const variance = actualAmount - budgetedAmount;
      const variancePct = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

      return {
        category,
        budgeted: Math.round(budgetedAmount),
        actual: Math.round(actualAmount),
        variance: Math.round(variance),
        variance_percent: Math.round(variancePct * 10) / 10,
        status: Math.abs(variancePct) > parseFloat(varianceThreshold) ? 'alert' : 'ok'
      };
    });

    // Sort by absolute variance (highest first)
    categoryAnalysis.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    // Property-level comparison (if multi-property budget)
    let propertyComparison = null;
    if (!propertyId) {
      const properties = await Property.findAll({
        where: { isActive: true },
        attributes: ['id', 'propertyName']
      });

      propertyComparison = await Promise.all(
        properties.map(async (property) => {
          // Get property revenue
          const propRevenue = await Payment.findOne({
            attributes: [
              [sequelize.fn('SUM', sequelize.col('amount')), 'revenue']
            ],
            include: [
              {
                model: Lease,
                as: 'lease',
                attributes: [],
                where: { propertyId: property.id },
                required: true
              }
            ],
            where: {
              paymentDate: {
                [Op.between]: [dateFrom, dateTo]
              },
              status: 'completed'
            },
            raw: true
          });

          // Get property expenses
          const propExpenses = await FinancialTransaction.findOne({
            attributes: [
              [sequelize.fn('SUM', sequelize.col('amount')), 'expenses']
            ],
            where: {
              propertyId: property.id,
              transactionDate: {
                [Op.between]: [dateFrom, dateTo]
              },
              transactionType: 'debit'
            },
            raw: true
          });

          const propActualRevenue = parseFloat(propRevenue?.revenue || 0);
          const propActualExpenses = parseFloat(propExpenses?.expenses || 0);
          const propActualProfit = propActualRevenue - propActualExpenses;

          // Get property budget if exists
          const propBudget = await Budget.findOne({
            where: {
              propertyId: property.id,
              periodStart: { [Op.lte]: dateTo },
              periodEnd: { [Op.gte]: dateFrom },
              status: 'approved',
              isActive: true
            }
          });

          let propBudgetedRevenue = 0;
          let propBudgetedExpenses = 0;
          if (propBudget) {
            propBudgetedRevenue = parseFloat(propBudget.budgetedRevenue || 0);
            propBudgetedExpenses = parseFloat(propBudget.budgetedExpenses || 0);
          }

          const propBudgetedProfit = propBudgetedRevenue - propBudgetedExpenses;
          const propRevenueVariance = propActualRevenue - propBudgetedRevenue;
          const propExpensesVariance = propActualExpenses - propBudgetedExpenses;
          const propProfitVariance = propActualProfit - propBudgetedProfit;

          return {
            property_id: property.id,
            property_name: property.propertyName,
            revenue: {
              budgeted: Math.round(propBudgetedRevenue),
              actual: Math.round(propActualRevenue),
              variance: Math.round(propRevenueVariance),
              variance_percent: propBudgetedRevenue > 0 
                ? Math.round((propRevenueVariance / propBudgetedRevenue) * 1000) / 10 
                : 0
            },
            expenses: {
              budgeted: Math.round(propBudgetedExpenses),
              actual: Math.round(propActualExpenses),
              variance: Math.round(propExpensesVariance),
              variance_percent: propBudgetedExpenses > 0 
                ? Math.round((propExpensesVariance / propBudgetedExpenses) * 1000) / 10 
                : 0
            },
            profit: {
              budgeted: Math.round(propBudgetedProfit),
              actual: Math.round(propActualProfit),
              variance: Math.round(propProfitVariance),
              variance_percent: propBudgetedProfit > 0 
                ? Math.round((propProfitVariance / propBudgetedProfit) * 1000) / 10 
                : 0
            }
          };
        })
      );
    }

    // Generate variance alerts
    const alerts = [];

    if (Math.abs(revenueVariancePct) > parseFloat(varianceThreshold)) {
      alerts.push({
        type: 'revenue_variance',
        severity: revenueVariancePct < 0 ? 'high' : 'medium',
        message: `Revenue is ${Math.abs(Math.round(revenueVariancePct))}% ${revenueVariancePct < 0 ? 'below' : 'above'} budget`,
        variance_amount: Math.round(revenueVariance),
        recommended_action: revenueVariancePct < 0 
          ? 'Review leasing strategy and rental rates' 
          : 'Consider revising revenue targets upward'
      });
    }

    if (Math.abs(expensesVariancePct) > parseFloat(varianceThreshold)) {
      alerts.push({
        type: 'expenses_variance',
        severity: expensesVariancePct > 0 ? 'high' : 'low',
        message: `Expenses are ${Math.abs(Math.round(expensesVariancePct))}% ${expensesVariancePct > 0 ? 'over' : 'under'} budget`,
        variance_amount: Math.round(expensesVariance),
        recommended_action: expensesVariancePct > 0 
          ? 'Investigate cost overruns and implement controls' 
          : 'Review if cost-cutting affected service quality'
      });
    }

    // Add category alerts
    categoryAnalysis.filter(cat => cat.status === 'alert').forEach(cat => {
      alerts.push({
        type: 'category_variance',
        severity: 'medium',
        category: cat.category,
        message: `${cat.category} expenses are ${Math.abs(cat.variance_percent)}% over budget`,
        variance_amount: cat.variance,
        recommended_action: 'Review spending in this category'
      });
    });

    res.status(200).json({
      success: true,
      data: {
        budget_info: {
          budget_id: budget.id,
          budget_name: budget.budgetName,
          period: {
            from: dateFrom.toISOString().substring(0, 10),
            to: dateTo.toISOString().substring(0, 10)
          }
        },
        overall_comparison: {
          revenue: {
            budgeted: Math.round(budgetedRevenue),
            actual: Math.round(actualRevenue),
            variance: Math.round(revenueVariance),
            variance_percent: Math.round(revenueVariancePct * 10) / 10
          },
          expenses: {
            budgeted: Math.round(budgetedExpenses),
            actual: Math.round(actualExpenses),
            variance: Math.round(expensesVariance),
            variance_percent: Math.round(expensesVariancePct * 10) / 10
          },
          profit: {
            budgeted: Math.round(budgetedProfit),
            actual: Math.round(actualProfit),
            variance: Math.round(profitVariance),
            variance_percent: Math.round(profitVariancePct * 10) / 10
          }
        },
        category_breakdown: categoryAnalysis,
        property_comparison: propertyComparison,
        alerts
      }
    });
  } catch (error) {
    console.error('Get budget vs actual report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate budget vs actual report',
      error: error.message
    });
  }
};

/**
 * Calculate tenant risk score based on payment history
 * @param {Number} tenantId - Tenant ID
 * @param {Number} currentDaysOverdue - Current invoice days overdue
 * @returns {Object} Risk analysis
 */
async function calculateTenantRiskScore(tenantId, currentDaysOverdue) {
  try {
    // Get tenant's payment history
    const { Tenant } = require('../models');
    const tenant = await Tenant.findByPk(tenantId);

    if (!tenant) {
      return {
        risk_score: 50,
        risk_level: 'medium',
        collection_probability: 50,
        recommended_action: 'Monitor closely'
      };
    }

    // Get all payments for this tenant
    const allPayments = await Payment.findAll({
      where: { tenantId },
      order: [['paymentDate', 'DESC']],
      limit: 20 // Last 20 payments
    });

    // Calculate payment metrics
    let latePaymentCount = 0;
    let onTimePaymentCount = 0;
    let avgDaysLate = 0;
    let totalDaysLate = 0;

    allPayments.forEach(payment => {
      if (payment.dueDate && payment.paymentDate) {
        const daysDiff = Math.floor(
          (new Date(payment.paymentDate) - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff > 0) {
          latePaymentCount++;
          totalDaysLate += daysDiff;
        } else {
          onTimePaymentCount++;
        }
      }
    });

    avgDaysLate = latePaymentCount > 0 ? totalDaysLate / latePaymentCount : 0;

    // Calculate risk score (0-100, higher = more risky)
    let riskScore = 0;

    // Factor 1: Current days overdue (max 40 points)
    riskScore += Math.min(40, currentDaysOverdue * 0.4);

    // Factor 2: Historical late payment rate (max 30 points)
    const totalPayments = latePaymentCount + onTimePaymentCount;
    if (totalPayments > 0) {
      const latePaymentRate = (latePaymentCount / totalPayments) * 100;
      riskScore += (latePaymentRate / 100) * 30;
    }

    // Factor 3: Average days late historically (max 20 points)
    riskScore += Math.min(20, avgDaysLate * 0.5);

    // Factor 4: Payment consistency (max 10 points)
    if (totalPayments < 3) {
      riskScore += 10; // New tenant = higher risk
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine risk level
    let riskLevel = 'low';
    let collectionProbability = 95;
    let recommendedAction = 'Standard follow-up';

    if (riskScore >= 70) {
      riskLevel = 'high';
      collectionProbability = 30;
      recommendedAction = 'Immediate action required - consider legal notice or payment plan';
    } else if (riskScore >= 40) {
      riskLevel = 'medium';
      collectionProbability = 65;
      recommendedAction = 'Send reminder and follow up within 7 days';
    } else {
      riskLevel = 'low';
      collectionProbability = 90;
      recommendedAction = 'Standard follow-up - send automated reminder';
    }

    return {
      risk_score: Math.round(riskScore),
      risk_level: riskLevel,
      collection_probability: collectionProbability,
      recommended_action: recommendedAction,
      payment_history: {
        total_payments: totalPayments,
        late_payments: latePaymentCount,
        on_time_payments: onTimePaymentCount,
        avg_days_late: Math.round(avgDaysLate * 10) / 10
      }
    };
  } catch (error) {
    console.error('Calculate risk score error:', error);
    return {
      risk_score: 50,
      risk_level: 'medium',
      collection_probability: 50,
      recommended_action: 'Monitor closely'
    };
  }
}

/**
 * Get property-wise financial summary
 * GET /api/finance/reports/property-financials
 */
exports.getPropertyFinancials = async (req, res) => {
  try {
    const { propertyId, startDate, endDate } = req.query;

    // Date range
    const dateFrom = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const dateTo = endDate ? new Date(endDate) : new Date();

    // Build query
    let whereClause = 'ft.transaction_date BETWEEN :startDate AND :endDate';
    const replacements = { startDate: dateFrom, endDate: dateTo };

    if (propertyId) {
      whereClause += ' AND ft.property_id = :propertyId';
      replacements.propertyId = propertyId;
    }

    const query = `
      SELECT 
        p.id as property_id,
        p.property_name,
        p.property_type,
        p.total_units,
        COUNT(DISTINCT l.id) as active_leases,
        COUNT(DISTINCT u.id) as occupied_units,
        SUM(CASE WHEN ft.transaction_type = 'credit' THEN ft.amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN ft.transaction_type = 'debit' THEN ft.amount ELSE 0 END) as total_expenses,
        (SUM(CASE WHEN ft.transaction_type = 'credit' THEN ft.amount ELSE 0 END) - 
         SUM(CASE WHEN ft.transaction_type = 'debit' THEN ft.amount ELSE 0 END)) as net_income,
        ((SUM(CASE WHEN ft.transaction_type = 'credit' THEN ft.amount ELSE 0 END) - 
          SUM(CASE WHEN ft.transaction_type = 'debit' THEN ft.amount ELSE 0 END)) / 
         NULLIF(SUM(CASE WHEN ft.transaction_type = 'credit' THEN ft.amount ELSE 0 END), 0) * 100) as profit_margin
      FROM properties p
      LEFT JOIN units u ON p.id = u.property_id AND u.status = 'occupied'
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN financial_transactions ft ON p.id = ft.property_id AND ${whereClause}
      WHERE p.is_active = 1
      ${propertyId ? 'AND p.id = :propertyId' : ''}
      GROUP BY p.id, p.property_name, p.property_type, p.total_units
      ORDER BY net_income DESC
    `;

    const [results] = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate: dateFrom.toISOString().substring(0, 10),
          endDate: dateTo.toISOString().substring(0, 10)
        },
        properties: results
      }
    });
  } catch (error) {
    console.error('Get property financials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property financials',
      error: error.message
    });
  }
};

/**
 * Get FTA-compliant VAT export
 * Generates CSV export for UAE Federal Tax Authority
 * GET /api/finance/reports/vat-export
 */
exports.getFTAVATExport = async (req, res) => {
  try {
    const {
      startDate = '',
      endDate = '',
      period = 'quarterly'
    } = req.query;

    // Determine date range
    let dateFrom, dateTo;
    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      // Default to current quarter
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
      dateTo = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    }

    // Get all taxable transactions (invoices and payments)
    const taxableInvoices = await Invoice.findAll({
      where: {
        invoiceDate: {
          [Op.between]: [dateFrom, dateTo]
        },
        taxRate: {
          [Op.gt]: 0
        }
      },
      include: [
        {
          model: Lease,
          as: 'lease',
          attributes: ['leaseNumber'],
          include: [
            {
              model: require('../models').Tenant,
              as: 'tenant',
              attributes: ['firstName', 'lastName', 'emiratesId', 'trn']
            }
          ]
        }
      ],
      order: [['invoiceDate', 'ASC']]
    });

    // Format data for FTA compliance
    const vatRecords = taxableInvoices.map(invoice => {
      const tenant = invoice.lease?.tenant;
      const subtotal = parseFloat(invoice.subtotal || 0);
      const taxRate = parseFloat(invoice.taxRate || 5);
      const taxAmount = parseFloat(invoice.taxAmount || 0);
      const totalAmount = parseFloat(invoice.totalAmount || 0);

      return {
        // FTA Required Fields
        trn: process.env.COMPANY_TRN || 'TRN100000000000003', // Company TRN
        invoice_number: invoice.invoiceNumber,
        invoice_date: new Date(invoice.invoiceDate).toISOString().substring(0, 10),
        customer_name: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown',
        customer_trn: tenant?.trn || '',
        customer_emirates_id: tenant?.emiratesId || '',
        supply_type: 'Standard Rated Supplies',
        taxable_amount: subtotal.toFixed(2),
        vat_rate: taxRate.toFixed(2),
        vat_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        currency: 'AED'
      };
    });

    // Calculate summary
    const summary = {
      period_start: dateFrom.toISOString().substring(0, 10),
      period_end: dateTo.toISOString().substring(0, 10),
      total_transactions: vatRecords.length,
      total_taxable_amount: vatRecords.reduce((sum, r) => sum + parseFloat(r.taxable_amount), 0).toFixed(2),
      total_vat_amount: vatRecords.reduce((sum, r) => sum + parseFloat(r.vat_amount), 0).toFixed(2),
      total_amount: vatRecords.reduce((sum, r) => sum + parseFloat(r.total_amount), 0).toFixed(2)
    };

    // Generate CSV
    const csvHeaders = [
      'Supplier TRN',
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer TRN',
      'Customer Emirates ID',
      'Supply Type',
      'Taxable Amount',
      'VAT Rate %',
      'VAT Amount',
      'Total Amount',
      'Currency'
    ];

    let csv = csvHeaders.join(',') + '\n';
    
    vatRecords.forEach(record => {
      csv += [
        record.trn,
        record.invoice_number,
        record.invoice_date,
        `"${record.customer_name}"`,
        record.customer_trn,
        record.customer_emirates_id,
        record.supply_type,
        record.taxable_amount,
        record.vat_rate,
        record.vat_amount,
        record.total_amount,
        record.currency
      ].join(',') + '\n';
    });

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="FTA_VAT_Export_${dateFrom.toISOString().substring(0, 10)}_to_${dateTo.toISOString().substring(0, 10)}.csv"`);

    // Send CSV
    res.status(200).send(csv);

  } catch (error) {
    console.error('Get FTA VAT export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate FTA VAT export',
      error: error.message
    });
  }
};

module.exports = exports;
