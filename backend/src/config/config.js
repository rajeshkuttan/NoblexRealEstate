const path = require('path');
const fs = require('fs');

// Determine which config file to load based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Priority order for config files:
// 1. .env (if exists, used in production on VPS)
// 2. config.production.env (if NODE_ENV=production)
// 3. config.env (default for development)
let configPath;
let configFileName;

const dotenvPath = path.join(__dirname, '../../.env');
const productionConfigPath = path.join(__dirname, '../../config.production.env');
const devConfigPath = path.join(__dirname, '../../config.env');

if (fs.existsSync(dotenvPath)) {
  // Use .env if it exists (production VPS)
  configPath = dotenvPath;
  configFileName = '.env';
} else if (nodeEnv === 'production' && fs.existsSync(productionConfigPath)) {
  // Use config.production.env for production
  configPath = productionConfigPath;
  configFileName = 'config.production.env';
} else {
  // Default to config.env for development
  configPath = devConfigPath;
  configFileName = 'config.env';
}

console.log(`✅ Loading configuration from: ${configFileName} (NODE_ENV: ${nodeEnv})`);
require('dotenv').config({ path: configPath });

module.exports = {
  // Server Configuration
  port: process.env.PORT || 5002,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'Leasemanagement',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'emirates_lease_flow_super_secret_key_2024',
    expiresIn: process.env.JWT_EXPIRE || '7d'
  },
  
  // CORS Configuration
  cors: {
    // Support multiple origins separated by comma
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : process.env.NODE_ENV === 'development'
        ? ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173']
        : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : ['http://localhost:8080']),
    credentials: true
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  }
};
