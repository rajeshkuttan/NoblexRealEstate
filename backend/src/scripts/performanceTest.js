/**
 * Performance Testing Script
 * Tests key finance endpoints with production-like load
 */

const axios = require('axios');
const { sequelize } = require('../config/database');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token-here';

// Test configuration
const TESTS = {
  warmup: 5,          // Warmup requests
  iterations: 50,     // Requests per endpoint
  concurrent: 10,     // Concurrent requests
  timeout: 30000      // 30 second timeout
};

// API client
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TESTS.timeout,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Performance metrics
class PerformanceMetrics {
  constructor(name) {
    this.name = name;
    this.times = [];
    this.errors = 0;
    this.queryCount = 0;
  }

  addTime(ms) {
    this.times.push(ms);
  }

  addError() {
    this.errors++;
  }

  addQueries(count) {
    this.queryCount += count;
  }

  getStats() {
    if (this.times.length === 0) {
      return {
        name: this.name,
        count: 0,
        errors: this.errors,
        avgTime: 0,
        minTime: 0,
        maxTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        avgQueries: 0
      };
    }

    const sorted = [...this.times].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      name: this.name,
      count,
      errors: this.errors,
      avgTime: (sorted.reduce((a, b) => a + b, 0) / count).toFixed(2),
      minTime: sorted[0].toFixed(2),
      maxTime: sorted[count - 1].toFixed(2),
      p50: sorted[Math.floor(count * 0.5)].toFixed(2),
      p95: sorted[Math.floor(count * 0.95)].toFixed(2),
      p99: sorted[Math.floor(count * 0.99)].toFixed(2),
      avgQueries: (this.queryCount / count).toFixed(1),
      throughput: (count / (sorted.reduce((a, b) => a + b, 0) / 1000)).toFixed(2)
    };
  }
}

// Query counter
let queryCount = 0;
const originalQuery = sequelize.query.bind(sequelize);
sequelize.query = function(...args) {
  queryCount++;
  return originalQuery(...args);
};

// Test suites
const testSuites = {
  // 1. List endpoints (most common)
  'GET /api/properties': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/properties?page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/tenants': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/tenants?page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/leases': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/leases?page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/invoices': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/invoices?page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  // 2. Finance endpoints
  'GET /api/vendors': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/vendors?page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/vendor-invoices': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/vendor-invoices?page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/finance/bank-accounts': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/finance/bank-accounts');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/finance/transactions': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/finance/transactions?page=1&limit=50');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  // 3. Advanced reports (complex queries)
  'GET /api/finance/reports/property-profitability': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/finance/reports/property-profitability?startDate=2024-01-01&endDate=2024-12-31');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/finance/reports/ar-aging-enhanced': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/finance/reports/ar-aging-enhanced');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/finance/reports/budget-vs-actual': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/finance/reports/budget-vs-actual?startDate=2024-01-01&endDate=2024-12-31');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/finance/reports/property-financials': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/finance/reports/property-financials?startDate=2024-01-01&endDate=2024-12-31');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/vendor-invoices/payment-analysis': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/vendor-invoices/payment-analysis?startDate=2024-01-01&endDate=2024-12-31');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  // 4. Search and filter operations
  'GET /api/invoices (filtered by status)': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/invoices?status=pending&page=1&limit=20');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/payments (filtered by date range)': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/payments?startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  // 5. Dashboard aggregations
  'GET /api/dashboard/stats': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/dashboard/stats');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  },

  'GET /api/leases/stats': async () => {
    const start = Date.now();
    const qBefore = queryCount;
    await api.get('/api/leases/stats');
    return { time: Date.now() - start, queries: queryCount - qBefore };
  }
};

// Run single test
async function runTest(name, testFn, metrics) {
  try {
    const result = await testFn();
    metrics.addTime(result.time);
    metrics.addQueries(result.queries);
  } catch (error) {
    metrics.addError();
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running. Please start the backend server first.');
    }
  }
}

// Run test suite
async function runTestSuite(name, testFn, iterations) {
  const metrics = new PerformanceMetrics(name);
  
  process.stdout.write(`  Testing ${name}...`);
  
  // Warmup
  for (let i = 0; i < TESTS.warmup; i++) {
    try {
      await testFn();
    } catch (error) {
      // Ignore warmup errors
    }
  }
  
  // Actual test
  for (let i = 0; i < iterations; i++) {
    await runTest(name, testFn, metrics);
  }
  
  process.stdout.write(` ✓\n`);
  return metrics;
}

// Run concurrent tests
async function runConcurrentTests(name, testFn, concurrency, totalRequests) {
  const metrics = new PerformanceMetrics(name);
  const batches = Math.ceil(totalRequests / concurrency);
  
  process.stdout.write(`  Testing ${name} (concurrent)...`);
  
  for (let batch = 0; batch < batches; batch++) {
    const requests = Math.min(concurrency, totalRequests - (batch * concurrency));
    const promises = Array(requests).fill(null).map(() => runTest(name, testFn, metrics));
    await Promise.all(promises);
  }
  
  process.stdout.write(` ✓\n`);
  return metrics;
}

// Database statistics
async function getDatabaseStats() {
  const [results] = await sequelize.query(`
    SELECT 
      table_name,
      table_rows as estimated_rows,
      ROUND(data_length / 1024 / 1024, 2) as data_mb,
      ROUND(index_length / 1024 / 1024, 2) as index_mb,
      ROUND((data_length + index_length) / 1024 / 1024, 2) as total_mb
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
    ORDER BY (data_length + index_length) DESC
  `);
  
  return results;
}

// Print results
function printResults(allMetrics) {
  console.log('\n📊 PERFORMANCE TEST RESULTS\n');
  console.log('═'.repeat(120));
  console.log(
    'Endpoint'.padEnd(55) +
    'Requests'.padStart(10) +
    'Errors'.padStart(8) +
    'Avg(ms)'.padStart(10) +
    'Min(ms)'.padStart(10) +
    'Max(ms)'.padStart(10) +
    'P95(ms)'.padStart(10) +
    'Queries'.padStart(10)
  );
  console.log('═'.repeat(120));
  
  allMetrics.forEach(metrics => {
    const stats = metrics.getStats();
    console.log(
      stats.name.padEnd(55) +
      stats.count.toString().padStart(10) +
      stats.errors.toString().padStart(8) +
      stats.avgTime.padStart(10) +
      stats.minTime.padStart(10) +
      stats.maxTime.padStart(10) +
      stats.p95.padStart(10) +
      stats.avgQueries.padStart(10)
    );
  });
  
  console.log('═'.repeat(120));
  
  // Summary statistics
  const totalRequests = allMetrics.reduce((sum, m) => sum + m.times.length, 0);
  const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);
  const avgTime = allMetrics.reduce((sum, m) => sum + parseFloat(m.getStats().avgTime), 0) / allMetrics.length;
  const maxP95 = Math.max(...allMetrics.map(m => parseFloat(m.getStats().p95)));
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`  Total Requests: ${totalRequests.toLocaleString()}`);
  console.log(`  Total Errors: ${totalErrors}`);
  console.log(`  Success Rate: ${((totalRequests - totalErrors) / totalRequests * 100).toFixed(2)}%`);
  console.log(`  Average Response Time: ${avgTime.toFixed(2)} ms`);
  console.log(`  Max P95 Response Time: ${maxP95.toFixed(2)} ms`);
  
  // Performance rating
  console.log(`\n⭐ PERFORMANCE RATING:`);
  if (avgTime < 100 && maxP95 < 500) {
    console.log(`  ✅ EXCELLENT - Response times well within acceptable limits`);
  } else if (avgTime < 200 && maxP95 < 1000) {
    console.log(`  ✓ GOOD - Response times acceptable for production`);
  } else if (avgTime < 500 && maxP95 < 2000) {
    console.log(`  ⚠ FAIR - Some endpoints may need optimization`);
  } else {
    console.log(`  ❌ POOR - Optimization required before production`);
  }
}

// Main test execution
async function runAllTests() {
  console.log('\n🚀 STARTING PERFORMANCE TESTS\n');
  console.log(`Configuration:`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Iterations per endpoint: ${TESTS.iterations}`);
  console.log(`  Warmup requests: ${TESTS.warmup}`);
  console.log(`  Timeout: ${TESTS.timeout}ms\n`);
  
  try {
    // Check server health
    console.log('🔍 Checking server health...');
    await api.get('/api/health').catch(() => {
      throw new Error('Server is not running or health check failed');
    });
    console.log('✓ Server is healthy\n');
    
    // Get database stats
    console.log('📊 Database Statistics:');
    const dbStats = await getDatabaseStats();
    const top5 = dbStats.slice(0, 5);
    top5.forEach(stat => {
      console.log(`  ${stat.table_name.padEnd(30)} ${String(stat.estimated_rows).padStart(10)} rows  ${String(stat.total_mb).padStart(8)} MB`);
    });
    const totalMB = dbStats.reduce((sum, s) => sum + parseFloat(s.total_mb), 0);
    console.log(`  ${'Total'.padEnd(30)} ${String('').padStart(10)}       ${totalMB.toFixed(2).padStart(8)} MB`);
    
    console.log('\n🧪 Running Performance Tests:\n');
    
    const startTime = Date.now();
    const allMetrics = [];
    
    // Run sequential tests
    for (const [name, testFn] of Object.entries(testSuites)) {
      const metrics = await runTestSuite(name, testFn, TESTS.iterations);
      allMetrics.push(metrics);
    }
    
    const endTime = Date.now();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Print results
    printResults(allMetrics);
    
    console.log(`\n⏱️  Total test duration: ${totalDuration} seconds`);
    console.log(`\n✅ Performance testing completed!\n`);
    
  } catch (error) {
    console.error('\n❌ Performance testing failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testSuites };
