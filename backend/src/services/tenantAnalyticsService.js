/**
 * Tenant Analytics Service
 * Analyzes tenant payment behavior and evaluates renewal probability
 * Part of: Phase 6.1 - Cross-Module Integration
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Analyze tenant payment behavior
 * @param {Number} tenantId - Tenant ID
 * @returns {Object} Payment behavior analysis
 */
exports.analyzeTenantPaymentBehavior = async (tenantId) => {
  try {
    // Get tenant payment history
    const query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
        SUM(CASE WHEN p.payment_date > i.due_date THEN 1 ELSE 0 END) as late_payments,
        AVG(DATEDIFF(p.payment_date, i.due_date)) as avg_days_delay,
        SUM(p.amount) as total_amount_paid,
        MIN(p.payment_date) as first_payment,
        MAX(p.payment_date) as last_payment,
        COUNT(DISTINCT l.id) as total_leases
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN leases l ON i.lease_id = l.id
      WHERE l.tenant_id = :tenantId
    `;

    const [results] = await sequelize.query(query, {
      replacements: { tenantId },
      type: sequelize.QueryTypes.SELECT
    });

    const paymentData = results[0] || {};

    // Calculate payment score (0-100)
    const onTimeRate = paymentData.total_payments > 0 
      ? ((paymentData.total_payments - paymentData.late_payments) / paymentData.total_payments) * 100 
      : 100;
    
    const avgDelay = parseFloat(paymentData.avg_days_delay) || 0;
    const delayPenalty = Math.max(0, Math.min(30, Math.abs(avgDelay))); // Max 30 point penalty
    
    const paymentScore = Math.max(0, Math.min(100, onTimeRate - delayPenalty));

    // Determine risk level
    let riskLevel = 'low';
    if (paymentScore < 50) riskLevel = 'high';
    else if (paymentScore < 75) riskLevel = 'medium';

    // Behavioral insights
    const insights = [];
    if (onTimeRate < 80) {
      insights.push({
        type: 'warning',
        message: `Tenant has ${paymentData.late_payments} late payments out of ${paymentData.total_payments} total payments`
      });
    }
    if (avgDelay > 7) {
      insights.push({
        type: 'alert',
        message: `Average payment delay is ${Math.round(avgDelay)} days`
      });
    }
    if (onTimeRate >= 95) {
      insights.push({
        type: 'positive',
        message: 'Excellent payment history - highly reliable tenant'
      });
    }

    return {
      tenantId,
      paymentScore: Math.round(paymentScore),
      riskLevel,
      metrics: {
        totalPayments: parseInt(paymentData.total_payments) || 0,
        completedPayments: parseInt(paymentData.completed_payments) || 0,
        latePayments: parseInt(paymentData.late_payments) || 0,
        onTimeRate: Math.round(onTimeRate),
        avgDaysDelay: Math.round(avgDelay),
        totalAmountPaid: parseFloat(paymentData.total_amount_paid) || 0,
        tenancyDuration: calculateTenancyDuration(paymentData.first_payment, paymentData.last_payment)
      },
      insights
    };
  } catch (error) {
    console.error('Analyze tenant payment behavior error:', error);
    throw error;
  }
};

/**
 * Evaluate tenant renewal probability
 * @param {Number} tenantId - Tenant ID
 * @param {Number} leaseId - Current lease ID
 * @returns {Object} Renewal evaluation
 */
exports.evaluateTenantRenewal = async (tenantId, leaseId) => {
  try {
    // Get payment behavior
    const paymentBehavior = await exports.analyzeTenantPaymentBehavior(tenantId);

    // Get maintenance ticket history
    const ticketQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_tickets,
        AVG(TIMESTAMPDIFF(DAY, created_at, updated_at)) as avg_resolution_time
      FROM tickets t
      JOIN units u ON t.unit_id = u.id
      JOIN leases l ON u.id = l.unit_id
      WHERE l.tenant_id = :tenantId AND l.id = :leaseId
    `;

    const [ticketResults] = await sequelize.query(ticketQuery, {
      replacements: { tenantId, leaseId },
      type: sequelize.QueryTypes.SELECT
    });

    const ticketData = ticketResults[0] || {};

    // Get lease details
    const leaseQuery = `
      SELECT 
        start_date,
        end_date,
        monthly_rent,
        DATEDIFF(end_date, NOW()) as days_to_expiry
      FROM leases
      WHERE id = :leaseId AND tenant_id = :tenantId
    `;

    const [leaseResults] = await sequelize.query(leaseQuery, {
      replacements: { tenantId, leaseId },
      type: sequelize.QueryTypes.SELECT
    });

    const leaseData = leaseResults[0] || {};

    // Calculate renewal probability (0-100)
    let renewalScore = 50; // Base score

    // Payment behavior (40% weight)
    renewalScore += (paymentBehavior.paymentScore - 50) * 0.4;

    // Maintenance satisfaction (30% weight)
    const totalTickets = parseInt(ticketData.total_tickets) || 0;
    if (totalTickets === 0) {
      renewalScore += 15; // Bonus for no issues
    } else {
      const highPriorityRatio = (parseInt(ticketData.high_priority_tickets) || 0) / totalTickets;
      if (highPriorityRatio < 0.2) renewalScore += 15;
      else if (highPriorityRatio < 0.4) renewalScore += 10;
      else renewalScore += 5;
    }

    // Tenancy duration (20% weight)
    const tenancyMonths = paymentBehavior.metrics.tenancyDuration;
    if (tenancyMonths > 24) renewalScore += 10;
    else if (tenancyMonths > 12) renewalScore += 7;
    else if (tenancyMonths > 6) renewalScore += 4;

    // Market factors (10% weight)
    // Could integrate market rent data here
    renewalScore += 5; // Placeholder

    // Normalize to 0-100
    renewalScore = Math.max(0, Math.min(100, renewalScore));

    // Determine likelihood
    let renewalLikelihood = 'low';
    if (renewalScore >= 75) renewalLikelihood = 'high';
    else if (renewalScore >= 50) renewalLikelihood = 'medium';

    // Generate recommendations
    const recommendations = [];
    
    if (renewalScore >= 75) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        message: 'High renewal probability - Initiate early renewal discussion with incentive offer'
      });
    } else if (renewalScore >= 50) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        message: 'Moderate renewal probability - Schedule meeting to discuss concerns and improvements'
      });
    } else {
      recommendations.push({
        type: 'alert',
        priority: 'high',
        message: 'Low renewal probability - Immediate intervention required. Consider alternative tenants.'
      });
    }

    if (paymentBehavior.riskLevel === 'high') {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: 'Payment issues detected - Address payment concerns before renewal negotiations'
      });
    }

    if (totalTickets > 5) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        message: `Multiple maintenance requests (${totalTickets}) - Ensure all issues are resolved`
      });
    }

    const daysToExpiry = parseInt(leaseData.days_to_expiry) || 0;
    if (daysToExpiry <= 60 && daysToExpiry > 0) {
      recommendations.push({
        type: 'urgent',
        priority: 'high',
        message: `Lease expires in ${daysToExpiry} days - Immediate renewal discussion required`
      });
    }

    return {
      tenantId,
      leaseId,
      renewalScore: Math.round(renewalScore),
      renewalLikelihood,
      daysToExpiry,
      factors: {
        paymentBehavior: {
          score: paymentBehavior.paymentScore,
          riskLevel: paymentBehavior.riskLevel,
          weight: '40%'
        },
        maintenanceHistory: {
          totalTickets,
          highPriorityTickets: parseInt(ticketData.high_priority_tickets) || 0,
          avgResolutionDays: Math.round(parseFloat(ticketData.avg_resolution_time) || 0),
          weight: '30%'
        },
        tenancyDuration: {
          months: tenancyMonths,
          weight: '20%'
        },
        marketFactors: {
          currentRent: parseFloat(leaseData.monthly_rent) || 0,
          weight: '10%'
        }
      },
      recommendations
    };
  } catch (error) {
    console.error('Evaluate tenant renewal error:', error);
    throw error;
  }
};

/**
 * Get tenant cohort analysis
 * @param {Object} filters - Analysis filters
 * @returns {Object} Cohort analysis
 */
exports.getTenantCohortAnalysis = async (filters = {}) => {
  try {
    const { propertyId, startDate, endDate } = filters;

    let whereClause = '1=1';
    const replacements = {};

    if (propertyId) {
      whereClause += ' AND u.property_id = :propertyId';
      replacements.propertyId = propertyId;
    }

    if (startDate) {
      whereClause += ' AND l.start_date >= :startDate';
      replacements.startDate = startDate;
    }

    if (endDate) {
      whereClause += ' AND l.start_date <= :endDate';
      replacements.endDate = endDate;
    }

    const query = `
      SELECT 
        DATE_FORMAT(l.start_date, '%Y-%m') as cohort_month,
        COUNT(DISTINCT t.id) as tenant_count,
        AVG(l.monthly_rent) as avg_rent,
        SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) as still_active,
        (SUM(CASE WHEN l.status = 'active' THEN 1 ELSE 0 END) / COUNT(DISTINCT t.id) * 100) as retention_rate
      FROM tenants t
      JOIN leases l ON t.id = l.tenant_id
      JOIN units u ON l.unit_id = u.id
      WHERE ${whereClause}
      GROUP BY cohort_month
      ORDER BY cohort_month DESC
      LIMIT 12
    `;

    const [results] = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    return {
      cohorts: results,
      summary: {
        totalCohorts: results.length,
        avgRetentionRate: results.reduce((sum, c) => sum + parseFloat(c.retention_rate), 0) / results.length,
        totalTenants: results.reduce((sum, c) => sum + parseInt(c.tenant_count), 0)
      }
    };
  } catch (error) {
    console.error('Get tenant cohort analysis error:', error);
    throw error;
  }
};

/**
 * Calculate tenancy duration in months
 */
function calculateTenancyDuration(firstPayment, lastPayment) {
  if (!firstPayment || !lastPayment) return 0;
  
  const first = new Date(firstPayment);
  const last = new Date(lastPayment);
  const diffMs = last - first;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.round(diffDays / 30);
}

module.exports = exports;
