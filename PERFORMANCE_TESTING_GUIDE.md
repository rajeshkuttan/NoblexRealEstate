# Performance Testing Guide
**Emirates Lease Flow - Finance Module**
**Date**: January 11, 2026

---

## ✅ Performance Testing Setup - Complete!

### 📊 Production Data Status

**Total Records Seeded: 15,000+**

Based on previous successful seed run:
- Properties: 50
- Units: 1,000
- Tenants: 800
- Leases: ~960
- Invoices: 11,520
- Payments: ~11,520
- Financial Transactions: 2,500
- Vendors: 100
- Vendor Invoices: 1,500
- Tickets: ~500
- Budgets: 150
- Bank Accounts: 10
- Bank Transactions: 2,000

**Database Size**: ~100MB with indexes

---

## 🚀 Running Performance Tests

### Prerequisites
1. **Backend server must be running**
   ```powershell
   cd "C:\Users\iamra\OneDrive\Documents\Projects\Lease Management\emirates-lease-flow\backend"
   npm start
   ```

2. **Optional: Get auth token** (if authentication is enabled)
   - Login via API or frontend
   - Copy JWT token
   - Set in environment: `TEST_AUTH_TOKEN=your_token_here`

### Run Performance Tests

```powershell
# From backend directory
node src/scripts/performanceTest.js
```

### What Gets Tested

**1. List Endpoints (20 requests each)**
- GET /api/properties
- GET /api/tenants
- GET /api/leases
- GET /api/invoices
- GET /api/vendors
- GET /api/vendor-invoices
- GET /api/finance/bank-accounts
- GET /api/finance/transactions

**2. Advanced Financial Reports (50 requests each)**
- Property Profitability Report
- Enhanced AR Aging Report
- Budget vs Actual Report
- Property Financials Report
- Vendor Payment Analysis

**3. Filtered/Search Operations (50 requests each)**
- Filtered invoices by status
- Date-range payment queries
- Dashboard statistics
- Lease statistics

**4. Metrics Collected**
- Average response time (ms)
- Min/Max response time
- P50, P95, P99 percentiles
- Error rate
- Throughput (requests/second)
- Database queries per request

---

## 📈 Expected Performance Benchmarks

### Excellent Performance ✅
- Average response time: < 100ms
- P95 response time: < 500ms
- Success rate: > 99%
- Throughput: > 20 req/sec

### Good Performance ✓
- Average response time: < 200ms
- P95 response time: < 1000ms
- Success rate: > 95%
- Throughput: > 10 req/sec

### Acceptable Performance ⚠
- Average response time: < 500ms
- P95 response time: < 2000ms
- Success rate: > 90%
- Throughput: > 5 req/sec

---

## 🔍 Performance Optimization Already Implemented

### Database Optimizations ✅
- **40+ Strategic Indexes** on:
  - Foreign keys (property_id, tenant_id, unit_id, lease_id)
  - Status columns (all major tables)
  - Date columns (invoice_date, due_date, payment_date, transaction_date)
  - Composite indexes for multi-column queries

### Query Optimizations ✅
- Pagination on all list endpoints (default limit: 20)
- Indexed WHERE clauses
- Optimized JOIN operations
- Property linkage for financial transactions

### API Optimizations ✅
- Connection pooling (Sequelize)
- Transaction-safe operations
- Proper error handling
- Response compression (gzip)

---

## 📊 Sample Test Output

```
🚀 STARTING PERFORMANCE TESTS

Configuration:
  Base URL: http://localhost:5000
  Iterations per endpoint: 50
  Warmup requests: 5
  Timeout: 30000ms

📊 Database Statistics:
  properties                      50 rows    2.15 MB
  units                        1,000 rows    5.43 MB
  invoices                    11,520 rows   12.87 MB
  payments                    11,520 rows   11.23 MB
  financial_transactions       2,500 rows    8.91 MB
  Total                                     98.45 MB

🧪 Running Performance Tests:

  Testing GET /api/properties... ✓
  Testing GET /api/tenants... ✓
  Testing GET /api/leases... ✓
  ...

📊 PERFORMANCE TEST RESULTS

═════════════════════════════════════════════════════════════════════
Endpoint                                           Requests  Errors  Avg(ms)  P95(ms)  Queries
═════════════════════════════════════════════════════════════════════
GET /api/properties                                      50       0    45.23    78.45      2.0
GET /api/tenants                                         50       0    52.18    89.12      2.0
GET /api/leases                                          50       0    68.34   125.67      3.0
GET /api/invoices                                        50       0    72.45   138.23      3.0
GET /api/finance/reports/property-profitability          50       0   156.78   285.34      5.0
GET /api/finance/reports/ar-aging-enhanced               50       0   189.23   324.56      6.0
...
═════════════════════════════════════════════════════════════════════

📈 SUMMARY:
  Total Requests: 850
  Total Errors: 0
  Success Rate: 100.00%
  Average Response Time: 98.45 ms
  Max P95 Response Time: 324.56 ms

⭐ PERFORMANCE RATING:
  ✅ EXCELLENT - Response times well within acceptable limits

⏱️  Total test duration: 45.23 seconds

✅ Performance testing completed!
```

---

## 🔧 Troubleshooting

### Issue: Server Not Running
```
Error: Server is not running or health check failed
```
**Solution**: Start the backend server first
```powershell
cd backend
npm start
```

### Issue: Authentication Errors
```
Error: 401 Unauthorized
```
**Solution**: 
1. Get a valid JWT token
2. Set environment variable:
   ```powershell
   $env:TEST_AUTH_TOKEN="your_token_here"
   ```
3. Or modify the script to skip authentication for testing

### Issue: Database Connection Errors
```
Error: Cannot connect to database
```
**Solution**: Check MySQL is running and config.env is correct

### Issue: Slow Performance
**Possible Causes**:
- MySQL not running with optimized configuration
- Indexes not applied (run migration)
- Too many concurrent requests
- Server resource constraints

**Solutions**:
1. Check indexes: `SHOW INDEX FROM properties;`
2. Optimize MySQL configuration
3. Reduce concurrent requests in test script
4. Monitor server resources (CPU, RAM, Disk I/O)

---

## 📝 Performance Testing Checklist

- [x] Production-like data seeded (15,000+ records)
- [x] Database indexes applied (40+ indexes)
- [x] Performance test script created
- [x] Test configuration documented
- [ ] Backend server running
- [ ] Performance tests executed
- [ ] Results analyzed
- [ ] Bottlenecks identified (if any)
- [ ] Optimizations applied (if needed)
- [ ] Re-test after optimizations
- [ ] Document final performance metrics

---

## 🎯 Next Steps

1. **Start Backend Server**
   ```powershell
   cd backend
   npm start
   ```

2. **Run Performance Tests**
   ```powershell
   node src/scripts/performanceTest.js
   ```

3. **Analyze Results**
   - Review response times
   - Check for errors
   - Identify slow endpoints
   - Verify query counts

4. **Optimize If Needed**
   - Add more indexes
   - Optimize complex queries
   - Implement caching (Redis)
   - Add query result pagination

5. **Load Testing** (Optional - Advanced)
   - Use tools like Apache JMeter, k6, or Artillery
   - Test with 100+ concurrent users
   - Simulate real-world traffic patterns
   - Monitor server resources under load

---

## 📚 Additional Resources

- **Seeding Script**: `backend/src/scripts/seedProductionData.js`
- **Performance Test Script**: `backend/src/scripts/performanceTest.js`
- **Migration Script**: `backend/src/migrations/20260111000001-add-core-performance-indexes.js`
- **Database Indexes**: 40+ indexes across 15 tables

---

**Status**: ✅ Ready for Performance Testing  
**Last Updated**: January 11, 2026  
**Version**: 1.0
