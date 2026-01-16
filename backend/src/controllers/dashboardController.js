const { Property, Unit, Lease, Tenant, Payment, Ticket, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get aggregated dashboard statistics
 * Replaces multiple API calls with a single optimized endpoint
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // Calculate date for expiring leases (next 60 days)
    const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const today = new Date();
    
    // Calculate all metrics in parallel using database aggregations
    const [
      propertiesCount,
      unitsCount,
      leasesStats,
      tenantsCount,
      paymentsStats,
      ticketsStats,
      occupancyStats,
      revenueStats,
      expiringLeasesCount,
    ] = await Promise.all([
      // Total properties
      Property.count(),
      
      // Total units
      Unit.count(),
      
      // Leases statistics
      Lease.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'active' OR status = 'Active' THEN 1 END`)), 'active'],
        ],
        raw: true,
      }),
      
      // Total tenants
      Tenant.count(),
      
      // Payments statistics
      Payment.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'overdue' THEN 1 END`)), 'overdue'],
          [sequelize.fn('SUM', sequelize.literal(`CASE WHEN status = 'paid' OR status = 'completed' THEN amount ELSE 0 END`)), 'collected'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        ],
        raw: true,
      }),
      
      // Tickets statistics
      Ticket.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'open' OR status = 'in_progress' THEN 1 END`)), 'pending'],
        ],
        raw: true,
      }),
      
      // Occupancy statistics
      Unit.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'occupied' OR status = 'Occupied' THEN 1 END`)), 'occupied'],
          [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status != 'occupied' AND status != 'Occupied' THEN 1 END`)), 'vacant'],
        ],
        raw: true,
      }),
      
      // Revenue from active leases
      Lease.findAll({
        where: {
          status: { [Op.in]: ['active', 'Active'] }
        },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('rent_amount')), 'totalRevenue'],
        ],
        raw: true,
      }),
      
      // Expiring leases (next 60 days)
      Lease.count({
        where: {
          status: { [Op.in]: ['active', 'Active'] },
          endDate: { [Op.between]: [today, sixtyDaysFromNow] },
        },
      }),
    ]);

    // Extract values from aggregated results
    const totalProperties = propertiesCount || 0;
    const totalUnits = unitsCount || 0;
    const activeLeases = leasesStats[0]?.active || 0;
    const activeTenants = tenantsCount || 0;
    const overduePayments = paymentsStats[0]?.overdue || 0;
    const totalCollected = parseFloat(paymentsStats[0]?.collected || 0);
    const totalExpected = parseFloat(paymentsStats[0]?.total || 0);
    const pendingTickets = ticketsStats[0]?.pending || 0;
    const occupiedUnits = occupancyStats[0]?.occupied || 0;
    const vacantUnits = occupancyStats[0]?.vacant || 0;
    const totalRevenue = parseFloat(revenueStats[0]?.totalRevenue || 0);
    const expiringLeases = expiringLeasesCount || 0;

    // Calculate derived metrics
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const avgRentPerUnit = occupiedUnits > 0 ? Math.round(totalRevenue / occupiedUnits) : 0;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalProperties,
        totalUnits,
        activeLeases,
        activeTenants,
        totalRevenue,
        occupancyRate,
        occupiedUnits,
        vacantUnits,
        expiringLeases,
        overduePayments,
        pendingTickets,
        avgRentPerUnit,
        collectionRate,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
