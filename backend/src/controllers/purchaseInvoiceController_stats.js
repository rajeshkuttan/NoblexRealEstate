/**
 * Get purchase invoice statistics
 */
exports.getInvoiceStats = async (req, res, next) => {
  try {
    // Total invoices by status
    const invoicesByStatus = await PurchaseInvoice.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'amount']
      ],
      group: ['status'],
      raw: true
    });

    // Total invoices by payment status
    const invoicesByPaymentStatus = await PurchaseInvoice.findAll({
      attributes: [
        [sequelize.col('paymentStatus'), 'paymentStatus'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'amount']
      ],
      group: ['paymentStatus'],
      raw: true
    });

    // Monthly invoice trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await PurchaseInvoice.findAll({
      where: {
        invoiceDate: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('invoiceDate'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'amount']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('invoiceDate'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('invoiceDate'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Calculate summary statistics from the arrays
    const totalInvoices = invoicesByPaymentStatus.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalAmount = invoicesByPaymentStatus.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // Note: Payment statuses might differ slightly, adjust as needed. 
    // Usually 'unpaid', 'partially_paid', 'paid'. 'overdue' might be a derived state or a specific status.
    // In PurchaseInvoice model, we set default to 'unpaid'.
    
    const unpaidData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'unpaid') || { count: 0, amount: 0 };
    // For overdue, we might need to check due dates if it's not a status in DB. 
    // However, vendorInvoiceController assumes it's a paymentStatus. 
    // Let's stick to what's in the DB. If 'overdue' isn't a stored status, this will return 0.
    // If we need to calculate overdue dynamically, we'd need a separate query.
    // For now, mirroring vendor invoice logic.
    const overdueData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'overdue') || { count: 0, amount: 0 };
    const paidData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'paid') || { count: 0, amount: 0 };

    // If 'overdue' is NOT a stored status, we should calculate it dynamically.
    // Let's add that check to be safe, filtering for unpaid/partially_paid + dueDate < now.
    const overdueStats = await PurchaseInvoice.findOne({
        where: {
            paymentStatus: { [Op.in]: ['unpaid', 'partially_paid'] },
            dueDate: { [Op.lt]: new Date() }
        },
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('totalAmount')), 'amount']
        ],
        raw: true
    });

    const calculatedOverdueCount = parseInt(overdueStats?.count || 0);
    const calculatedOverdueAmount = parseFloat(overdueStats?.amount || 0);

    // If paymentStatus 'overdue' exists, use it, otherwise use calculated.
    // Actually, 'overdue' is usually a derived status for display, but sometimes stored.
    // We will prefer the stored 'overdue' if present, else calculated.
    const finalOverdueCount = overdueData.count > 0 ? parseInt(overdueData.count) : calculatedOverdueCount;
    const finalOverdueAmount = overdueData.amount > 0 ? parseFloat(overdueData.amount) : calculatedOverdueAmount;


    res.status(200).json({
      success: true,
      data: {
        // Summary values for cards
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        unpaidAmount: parseFloat(unpaidData.amount || 0),
        unpaidCount: parseInt(unpaidData.count || 0),
        overdueAmount: parseFloat(finalOverdueAmount.toFixed(2)),
        overdueCount: finalOverdueCount,
        paidAmount: parseFloat(paidData.amount || 0),
        paidCount: parseInt(paidData.count || 0),
        // Detailed arrays
        invoicesByStatus,
        invoicesByPaymentStatus,
        monthlyTrends
      }
    });

  } catch (error) {
    console.error('Get purchase invoice stats error:', error);
    next(error);
  }
};
