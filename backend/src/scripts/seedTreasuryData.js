/**
 * Treasury Management Data Seeder
 * Populates all Treasury Management tables with sample data
 */

const {
  BankAccount,
  BankTransaction,
  PaymentGatewayTransaction,
  StandingOrder,
  Cheque,
  ExchangeRate,
  SecurityDeposit,
  PaymentReminder,
  PettyCash,
  CreditLimit,
  BankStatementImport,
  Investment,
  Reconciliation,
  Property,
  Tenant,
  Lease,
  Payment,
  ChartAccount,
  sequelize
} = require('../models');

const seedTreasuryData = async () => {
  try {
    console.log('🚀 Starting Treasury Management data seeding...\n');

    // Get existing data
    const properties = await Property.findAll({ limit: 10 });
    const tenants = await Tenant.findAll({ limit: 20 });
    const leases = await Lease.findAll({ limit: 15 });
    const chartAccounts = ChartAccount ? await ChartAccount.findAll({ 
      where: { accountType: 'Asset' },
      limit: 5 
    }) : [];

    if (properties.length === 0 || tenants.length === 0) {
      console.log('⚠️  Warning: No properties or tenants found. Please seed basic data first.');
      console.log('   Run: node src/scripts/seedProductionData.js\n');
    }

    // 1. BANK ACCOUNTS (10 accounts)
    console.log('📊 Seeding Bank Accounts...');
    const bankAccounts = [];
    const banks = [
      { name: 'Emirates NBD', prefix: 'ENBD', ibanPrefix: 'AE07026000', swift: 'EBILAEAD' },
      { name: 'First Abu Dhabi Bank', prefix: 'FAB', ibanPrefix: 'AE07033123', swift: 'NBADAEAA' },
      { name: 'Dubai Islamic Bank', prefix: 'DIB', ibanPrefix: 'AE04023000', swift: 'DUIBAEAD' },
      { name: 'Mashreq Bank', prefix: 'MASH', ibanPrefix: 'AE14033000', swift: 'BOMLAEAD' },
      { name: 'Abu Dhabi Commercial Bank', prefix: 'ADCB', ibanPrefix: 'AE07003000', swift: 'ADCBAEAA' },
      { name: 'HSBC UAE', prefix: 'HSBC', ibanPrefix: 'AE45026000', swift: 'BBMEAEAD' },
    ];

    for (let i = 0; i < banks.length; i++) {
      const bank = banks[i];
      const randomIban = `${bank.ibanPrefix}${Math.floor(Math.random() * 1000000000000)}`.padEnd(27, '0');
      const account = await BankAccount.create({
        bankName: bank.name,
        accountName: i === 0 ? 'Main Operating Account' : i === 1 ? 'Payroll Account' : i === 2 ? 'Investment Account' : `${bank.name} - Account ${i}`,
        accountNumber: `${bank.prefix}${Math.floor(Math.random() * 10000000000)}`,
        iban: randomIban,
        swiftCode: bank.swift,
        currency: i % 3 === 0 ? 'USD' : i % 3 === 1 ? 'EUR' : 'AED',
        currentBalance: Math.floor(Math.random() * 5000000) + 100000,
        chartAccountId: chartAccounts[i % chartAccounts.length]?.id || null,
        status: i < 5 ? 'active' : i === 5 ? 'inactive' : 'active',
        notes: `${bank.name} account for ${i === 0 ? 'daily operations' : i === 1 ? 'salary payments' : 'general transactions'}`,
        createdBy: 1,
        isActive: true
      });
      bankAccounts.push(account);
    }
    console.log(`✅ Created ${bankAccounts.length} bank accounts\n`);

    // 2. BANK TRANSACTIONS (100 transactions)
    console.log('💳 Seeding Bank Transactions...');
    const transactionTypes = ['debit', 'credit'];
    const descriptions = [
      'Rent payment received', 'Maintenance invoice payment', 'Utility bill payment',
      'Property purchase', 'Supplier payment', 'Salary disbursement',
      'Security deposit received', 'Commission payment', 'Insurance premium',
      'Legal fees', 'Marketing expenses', 'Office supplies'
    ];

    for (let i = 0; i < 100; i++) {
      const randomDays = Math.floor(Math.random() * 90);
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - randomDays);

      await BankTransaction.create({
        bankAccountId: bankAccounts[Math.floor(Math.random() * bankAccounts.length)].id,
        transactionDate,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        reference: `TXN-${Date.now()}-${i}`,
        amount: Math.floor(Math.random() * 50000) + 1000,
        currency: Math.random() > 0.8 ? 'USD' : Math.random() > 0.5 ? 'EUR' : 'AED',
        transactionType: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
        isReconciled: Math.random() > 0.3,
        notes: Math.random() > 0.7 ? 'Regular transaction' : null,
        createdBy: 1,
        isActive: true
      });
    }
    console.log('✅ Created 100 bank transactions\n');

    // 3. EXCHANGE RATES (20 rates)
    console.log('💱 Seeding Exchange Rates...');
    const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'QAR'];
    for (const currency of currencies) {
      for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        
        let rate;
        if (currency === 'USD') rate = 3.6725;
        else if (currency === 'EUR') rate = 4.12;
        else if (currency === 'GBP') rate = 4.85;
        else if (currency === 'SAR') rate = 0.979;
        else if (currency === 'QAR') rate = 1.009;

        await ExchangeRate.create({
          fromCurrency: currency,
          toCurrency: 'AED',
          rate: rate + (Math.random() * 0.1 - 0.05),
          effectiveDate: date,
          source: 'Central Bank UAE',
          createdBy: 1,
          isActive: i === 0
        });
      }
    }
    console.log('✅ Created 20 exchange rates\n');

    // 4. INVESTMENTS (15 investments)
    console.log('📈 Seeding Investments...');
    const investmentTypes = ['term_deposit', 'fixed_deposit', 'treasury_bond', 'money_market'];
    for (let i = 0; i < 15; i++) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));
      const term = [3, 6, 12, 24, 36][Math.floor(Math.random() * 5)];
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + term);
      
      const principalAmount = Math.floor(Math.random() * 1000000) + 100000;
      const interestRate = 2 + Math.random() * 4;
      const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
      const accruedInterest = (principalAmount * (interestRate / 100) * daysSinceStart) / 365;

        await Investment.create({
          investmentNumber: `INV-${Date.now()}-${i}`,
          bankAccountId: bankAccounts[Math.floor(Math.random() * 3)].id,
          investmentType: investmentTypes[Math.floor(Math.random() * investmentTypes.length)],
          principalAmount,
          currency: 'AED',
          interestRate,
          term,
          startDate,
          maturityDate,
          currentValue: principalAmount + accruedInterest,
          accruedInterest,
          status: maturityDate > new Date() ? 'active' : 'matured',
          autoRollover: Math.random() > 0.5,
          notes: `${term}-month investment with ${interestRate.toFixed(2)}% interest`,
          createdBy: 1,
          isActive: true
        });
    }
    console.log('✅ Created 15 investments\n');

    // 5. STANDING ORDERS (10 orders)
    if (leases.length > 0) {
      console.log('🔄 Seeding Standing Orders...');
      for (let i = 0; i < Math.min(10, leases.length); i++) {
        const lease = leases[i];
        const startDate = new Date(lease.startDate);
        const endDate = new Date(lease.endDate);

        await StandingOrder.create({
          orderNumber: `SO-${Date.now()}-${i}`,
          leaseId: lease.id,
          tenantId: lease.tenantId,
          amount: lease.rentAmount,
          frequency: 'monthly',
          startDate,
          endDate,
          dayOfMonth: startDate.getDate(),
          status: i % 5 === 0 ? 'paused' : i % 7 === 0 ? 'cancelled' : 'active',
          mandateReference: `MAND-${Date.now()}-${i}`,
          bankAccountId: bankAccounts[0].id,
          lastProcessedDate: new Date(),
          nextScheduledDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          successCount: Math.floor(Math.random() * 12),
          failureCount: Math.floor(Math.random() * 3),
          createdBy: 1,
          isActive: true
        });
      }
      console.log('✅ Created 10 standing orders\n');
    }

    // 6. CHEQUES (20 cheques including PDCs)
    if (tenants.length > 0 && leases.length > 0) {
      console.log('💰 Seeding Cheques (PDCs)...');
      for (let i = 0; i < 20; i++) {
        const tenant = tenants[Math.floor(Math.random() * tenants.length)];
        const lease = leases.find(l => l.tenantId === tenant.id) || leases[0];
        const chequeDate = new Date();
        chequeDate.setDate(chequeDate.getDate() + Math.floor(Math.random() * 180));

        await Cheque.create({
          chequeNumber: `CHQ${Math.floor(Math.random() * 1000000)}`,
          tenantId: tenant.id,
          leaseId: lease.id,
          bankAccountId: bankAccounts[0].id,
          bankName: tenant.company || 'Emirates NBD',
          amount: Math.floor(Math.random() * 100000) + 10000,
          chequeDate,
          depositDate: i % 3 === 0 ? new Date() : null,
          clearanceDate: i % 5 === 0 ? new Date() : null,
          status: i % 10 === 0 ? 'bounced' : i % 4 === 0 ? 'cleared' : i % 3 === 0 ? 'deposited' : 'pending',
          chequeType: chequeDate > new Date() ? 'pdc' : 'regular',
          bounceReason: i % 10 === 0 ? 'Insufficient funds' : null,
          bounceCharges: i % 10 === 0 ? 500 : null,
          createdBy: 1,
          isActive: true
        });
      }
      console.log('✅ Created 20 cheques (including PDCs)\n');
    }

    // 7. SECURITY DEPOSITS (15 deposits)
    if (leases.length > 0 && tenants.length > 0) {
      console.log('🔒 Seeding Security Deposits...');
      for (let i = 0; i < Math.min(15, leases.length); i++) {
        const lease = leases[i];
        const tenant = tenants.find(t => t.id === lease.tenantId) || tenants[0];
        const property = properties.find(p => p.id === lease.propertyId) || properties[0];

        await SecurityDeposit.create({
          depositNumber: `DEP-${Date.now()}-${i}`,
          leaseId: lease.id,
          tenantId: tenant.id,
          propertyId: property.id,
          bankAccountId: bankAccounts[0].id,
          amount: lease.rentAmount,
          currency: 'AED',
          depositDate: new Date(lease.startDate),
          releaseDate: i % 5 === 0 ? new Date() : null,
          status: i % 5 === 0 ? 'released' : i % 8 === 0 ? 'pending_release' : 'held',
          deductionAmount: i % 5 === 0 && Math.random() > 0.5 ? Math.floor(Math.random() * 5000) : null,
          deductionReason: i % 5 === 0 && Math.random() > 0.5 ? 'Minor damages to property' : null,
          interestRate: 1.5,
          accruedInterest: Math.floor(Math.random() * 1000),
          paymentMethod: 'bank_transfer',
          inspectionRequired: i % 3 === 0,
          inspectionDate: i % 3 === 0 ? new Date() : null,
          inspectionStatus: i % 3 === 0 ? 'completed' : null,
          createdBy: 1,
          isActive: true
        });
      }
      console.log('✅ Created 15 security deposits\n');
    }

    // 8. PAYMENT REMINDERS (skipped - requires paymentId)
    console.log('⏭️  Skipping Payment Reminders (requires existing payments)\n');

    // 9. PETTY CASH (25 transactions)
    if (properties.length > 0) {
      console.log('💵 Seeding Petty Cash Transactions...');
      const categories = ['office_supplies', 'transportation', 'utilities', 'maintenance', 'miscellaneous'];
      const types = ['expense', 'reimbursement', 'replenishment'];
      
      for (let i = 0; i < 25; i++) {
        const property = properties[Math.floor(Math.random() * properties.length)];
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 60));

        await PettyCash.create({
          transactionNumber: `PC-${Date.now()}-${i}`,
          type: types[Math.floor(Math.random() * types.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          amount: Math.floor(Math.random() * 500) + 50,
          currency: 'AED',
          propertyId: property.id,
          custodian: 1,
          approvedBy: i % 3 === 0 ? 1 : null,
          transactionDate,
          description: `Petty cash ${categories[Math.floor(Math.random() * categories.length)].replace('_', ' ')} expense`,
          vendor: Math.random() > 0.5 ? 'Local Supplier' : null,
          receiptNumber: `RCP-${Math.floor(Math.random() * 10000)}`,
          status: i % 3 === 0 ? 'approved' : i % 5 === 0 ? 'rejected' : 'pending',
          chartAccountId: chartAccounts[0]?.id || null,
          paymentMethod: Math.random() > 0.5 ? 'cash' : 'petty_cash_card',
          balanceBefore: 5000 + Math.floor(Math.random() * 10000),
          balanceAfter: 5000 + Math.floor(Math.random() * 10000),
          rejectionReason: i % 5 === 0 ? 'Missing receipt' : null,
          createdBy: 1,
          isActive: true
        });
      }
      console.log('✅ Created 25 petty cash transactions\n');
    }

    // 10. CREDIT LIMITS (skipped - unique constraint on tenant_id)
    console.log('⏭️  Skipping Credit Limits (unique constraint on tenant_id)\n');

    // 11. BANK STATEMENT IMPORTS (5 imports)
    console.log('📄 Seeding Bank Statement Imports...');
    for (let i = 0; i < 5; i++) {
      const totalTransactions = Math.floor(Math.random() * 100) + 50;
      const imported = Math.floor(totalTransactions * 0.8);
      const duplicates = Math.floor(totalTransactions * 0.15);
      const failed = totalTransactions - imported - duplicates;

      await BankStatementImport.create({
        bankAccountId: bankAccounts[Math.floor(Math.random() * bankAccounts.length)].id,
        fileName: `bank_statement_${new Date().toISOString().split('T')[0]}_${i}.csv`,
        fileType: ['csv', 'xlsx', 'pdf'][Math.floor(Math.random() * 3)],
        fileSize: Math.floor(Math.random() * 500000) + 10000,
        statementPeriodStart: new Date(new Date().setDate(new Date().getDate() - 30)),
        statementPeriodEnd: new Date(),
        totalTransactions,
        importedTransactions: imported,
        duplicateTransactions: duplicates,
        failedTransactions: failed,
        status: i % 4 === 0 ? 'failed' : 'completed',
        errorLog: i % 4 === 0 ? 'Invalid date format on row 23' : null,
        importedBy: 1,
        importedAt: new Date(),
        processedAt: new Date(),
        isActive: true
      });
    }
    console.log('✅ Created 5 bank statement imports\n');

    // 12. PAYMENT GATEWAY TRANSACTIONS (20 transactions)
    if (tenants.length > 0) {
      console.log('💻 Seeding Payment Gateway Transactions...');
      const gateways = ['stripe', 'paytabs', 'network'];
      const statuses = ['completed', 'pending', 'failed', 'refunded'];
      
      for (let i = 0; i < 20; i++) {
        const tenant = tenants[Math.floor(Math.random() * tenants.length)];
        const amount = Math.floor(Math.random() * 50000) + 1000;

        await PaymentGatewayTransaction.create({
          gateway: gateways[Math.floor(Math.random() * gateways.length)],
          transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          tenantId: tenant.id,
          amount,
          currency: 'AED',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          paymentMethod: Math.random() > 0.5 ? 'card' : 'bank_transfer',
          cardLast4: Math.random() > 0.5 ? `${Math.floor(Math.random() * 10000)}`.padStart(4, '0') : null,
          cardBrand: Math.random() > 0.5 ? ['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)] : null,
          gatewayFee: amount * 0.025,
          gatewayResponse: JSON.stringify({ status: 'success', code: '200' }),
          webhookReceived: Math.random() > 0.3,
          createdBy: 1,
          isActive: true
        });
      }
      console.log('✅ Created 20 payment gateway transactions\n');
    }

    // 13. RECONCILIATIONS (10 reconciliations)
    console.log('🔗 Seeding Reconciliations...');
    for (let i = 0; i < 10; i++) {
      const reconciliationDate = new Date();
      reconciliationDate.setDate(reconciliationDate.getDate() - Math.floor(Math.random() * 60));
      const openingBalance = Math.floor(Math.random() * 500000) + 100000;
      const closingBalance = openingBalance + Math.floor(Math.random() * 100000) - 50000;

      const difference = Math.floor(Math.random() * 1000);
      await Reconciliation.create({
        bankAccountId: bankAccounts[Math.floor(Math.random() * bankAccounts.length)].id,
        reconciliationDate,
        statementDate: reconciliationDate,
        openingBalance,
        closingBalance,
        statementBalance: closingBalance,
        systemBalance: closingBalance + difference,
        bookBalance: closingBalance + Math.floor(Math.random() * 1000) - 500,
        difference,
        status: i % 4 === 0 ? 'pending' : 'completed',
        reconciledBy: i % 4 === 0 ? null : 1,
        reconciledAt: i % 4 === 0 ? null : new Date(),
        notes: i % 3 === 0 ? 'Minor discrepancies noted and resolved' : null,
        createdBy: 1,
        isActive: true
      });
    }
    console.log('✅ Created 10 reconciliations\n');

    console.log('🎉 Treasury Management data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Bank Accounts: ${bankAccounts.length}`);
    console.log('   - Bank Transactions: 100');
    console.log('   - Exchange Rates: 20');
    console.log('   - Investments: 15');
    console.log('   - Standing Orders: 10');
    console.log('   - Cheques (PDCs): 20');
    console.log('   - Security Deposits: 15');
    console.log('   - Payment Reminders: Skipped (requires payments)');
    console.log('   - Petty Cash: 25');
    console.log('   - Credit Limits: Skipped (unique constraint)');
    console.log('   - Bank Statement Imports: 5');
    console.log('   - Payment Gateway Transactions: 20');
    console.log('   - Reconciliations: 10');
    console.log('\n✅ All Treasury Management tables populated with sample data!');

  } catch (error) {
    console.error('❌ Error seeding Treasury data:', error);
    throw error;
  }
};

// Run the seeder
if (require.main === module) {
  seedTreasuryData()
    .then(() => {
      console.log('\n✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = seedTreasuryData;
