# Environment Configuration Guide

## Overview
The backend supports **environment-specific configuration files** to manage different settings for development, staging, and production environments.

## Configuration Files

### File Structure
```
backend/
├── config.env                  # Local development (default)
├── config.production.env       # Production environment
├── config.staging.env         # Staging (optional - create if needed)
└── src/config/config.js       # Configuration loader
```

### Which File is Loaded?

The configuration loader (`src/config/config.js`) automatically selects the appropriate file based on the `NODE_ENV` environment variable:

| NODE_ENV Value | Config File Loaded | Use Case |
|----------------|-------------------|----------|
| `development` (default) | `config.env` | Local development |
| `production` | `config.production.env` | Production server |
| `staging` | `config.staging.env` | Staging server (if exists) |

## Configuration Files Detail

### 1. Development: `config.env`

**Purpose**: Local development on your machine

```env
# DEVELOPMENT ENVIRONMENT CONFIGURATION
# Local database (MySQL on localhost)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=Leasemanagement
DB_USER=root
DB_PASSWORD=

# Development server
PORT=5002
NODE_ENV=development

# Development CORS (allow both local and production for testing)
CORS_ORIGIN=http://localhost:8080,https://realestate.globaldes.cloud

# Relaxed rate limiting for development
RATE_LIMIT_MAX_REQUESTS=1000

# Verbose logging
LOG_LEVEL=info
```

**Features:**
- ✅ Local MySQL database
- ✅ No password required (typical for local dev)
- ✅ Verbose logging for debugging
- ✅ Relaxed rate limiting
- ✅ Allows testing with both local and production frontend

### 2. Production: `config.production.env`

**Purpose**: Production server deployment

```env
# PRODUCTION ENVIRONMENT CONFIGURATION
# Production database (remote server)
DB_HOST=your-production-db-host.com
DB_PORT=3306
DB_NAME=Leasemanagement_prod
DB_USER=prod_user
DB_PASSWORD=your_secure_production_password_here

# Production server
PORT=5002
NODE_ENV=production

# Production CORS (only production URLs)
CORS_ORIGIN=https://realestate.globaldes.cloud

# Strict rate limiting for production
RATE_LIMIT_MAX_REQUESTS=100

# Minimal logging (performance)
LOG_LEVEL=warn
LOG_FILE=/var/log/emirates-lease-flow/app.log
```

**Features:**
- ✅ Remote database connection
- ✅ Strong passwords and security
- ✅ Strict CORS (production URLs only)
- ✅ Strict rate limiting
- ✅ Minimal logging (better performance)
- ✅ Secure JWT secret

### 3. Staging: `config.staging.env` (Optional)

**Purpose**: Staging/testing server before production

```env
# STAGING ENVIRONMENT CONFIGURATION
DB_HOST=staging-db-host.com
DB_PORT=3306
DB_NAME=Leasemanagement_staging
DB_USER=staging_user
DB_PASSWORD=staging_password

PORT=5002
NODE_ENV=staging

CORS_ORIGIN=https://staging.realestate.globaldes.cloud

LOG_LEVEL=info
```

## Setup Instructions

### Local Development Setup

1. **Default Configuration** (Already set up)
   ```bash
   # config.env is already configured for local development
   # Just start the server normally
   cd backend
   npm run dev
   ```

2. **Verify Configuration**
   ```bash
   # Check which config is loaded (look for the log message)
   # Output: ✅ Loading configuration from: config.env
   ```

### Production Server Setup

1. **Copy Production Template**
   ```bash
   cd backend
   cp config.production.env config.production.env.backup
   ```

2. **Update Production Credentials**
   ```bash
   # Edit config.production.env with your actual production values
   nano config.production.env
   ```

   **Update these values:**
   - `DB_HOST`: Your production database host
   - `DB_NAME`: Production database name
   - `DB_USER`: Production database user
   - `DB_PASSWORD`: Strong production password
   - `JWT_SECRET`: Generate with: `openssl rand -base64 64`
   - `CORS_ORIGIN`: Your production frontend URL

3. **Set Environment Variable**
   ```bash
   # Set NODE_ENV to production
   export NODE_ENV=production
   
   # Or add to your .bashrc or .profile
   echo 'export NODE_ENV=production' >> ~/.bashrc
   ```

4. **Start Production Server**
   ```bash
   # The server will automatically load config.production.env
   npm start
   
   # Output: ✅ Loading configuration from: config.production.env
   ```

### PM2 Deployment (Recommended for Production)

1. **Create PM2 Ecosystem File**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'emirates-lease-flow-api',
       script: './src/server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env_production: {
         NODE_ENV: 'production'
       },
       env_staging: {
         NODE_ENV: 'staging'
       }
     }]
   };
   ```

2. **Deploy with PM2**
   ```bash
   # Production
   pm2 start ecosystem.config.js --env production
   
   # Staging
   pm2 start ecosystem.config.js --env staging
   ```

## Switching Between Environments

### Method 1: Environment Variable (Recommended)

```bash
# Development (default)
npm run dev

# Production
NODE_ENV=production npm start

# Staging
NODE_ENV=staging npm start
```

### Method 2: Package.json Scripts

Update `backend/package.json`:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development nodemon src/server.js",
    "start": "NODE_ENV=production node src/server.js",
    "start:staging": "NODE_ENV=staging node src/server.js"
  }
}
```

Then run:
```bash
npm run dev           # Development
npm start             # Production
npm run start:staging # Staging
```

## Configuration Values Comparison

| Setting | Development | Production | Staging |
|---------|------------|------------|---------|
| **Database** | localhost | Remote host | Remote host |
| **DB Name** | Leasemanagement | Leasemanagement_prod | Leasemanagement_staging |
| **CORS** | Local + Production | Production only | Staging only |
| **Rate Limit** | 1000 req/15min | 100 req/15min | 500 req/15min |
| **Logging** | Verbose (info) | Minimal (warn) | Moderate (info) |
| **File Upload** | ./uploads | /var/www/uploads | ./uploads |
| **Port** | 5002 | 5002 | 5002 |

## Security Best Practices

### 1. Keep Sensitive Files Secure

```bash
# Add to .gitignore (already done)
config.env
config.production.env
config.staging.env
*.env
```

### 2. Use Strong Passwords

```bash
# Generate strong JWT secret
openssl rand -base64 64

# Generate strong database password
openssl rand -base64 32
```

### 3. Restrict File Permissions (Production Server)

```bash
# Only owner can read/write config files
chmod 600 config.production.env

# Verify
ls -l config.production.env
# Output: -rw------- 1 user user ... config.production.env
```

### 4. Use Environment Variables on Server

Instead of storing credentials in files, use environment variables:

```bash
# On production server
export DB_PASSWORD="secure_password_from_secrets_manager"
export JWT_SECRET="secure_jwt_secret"
```

### 5. Regular Security Audits

- ✅ Rotate JWT secrets every 90 days
- ✅ Update database passwords regularly
- ✅ Review CORS origins monthly
- ✅ Monitor rate limiting effectiveness

## Troubleshooting

### Config File Not Found

**Symptom:**
```
⚠️  Config file not found: config.production.env, using default config.env
```

**Solution:**
```bash
# Create the missing config file
cp config.env config.production.env
# Update with production values
nano config.production.env
```

### Wrong Config File Loaded

**Symptom:** Server uses wrong database

**Solution:**
```bash
# Check NODE_ENV
echo $NODE_ENV

# Explicitly set it
export NODE_ENV=production

# Restart server
npm start
```

### Database Connection Failed

**Symptom:** `❌ Failed to connect to database`

**Solution:**
```bash
# Verify credentials in config file
cat config.production.env | grep DB_

# Test database connection
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Check firewall rules
telnet $DB_HOST 3306
```

### CORS Errors in Production

**Symptom:** Frontend can't connect to API

**Solution:**
```bash
# Check CORS_ORIGIN in production config
cat config.production.env | grep CORS_ORIGIN

# Verify it matches your frontend URL (including protocol and port)
# Update if needed
nano config.production.env
```

## Environment Variables Reference

### Database Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database server hostname | `localhost` or `db.example.com` |
| `DB_PORT` | Database port | `3306` |
| `DB_NAME` | Database name | `Leasemanagement_prod` |
| `DB_USER` | Database username | `prod_user` |
| `DB_PASSWORD` | Database password | `SecurePass123!` |

### Server Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5002` |
| `NODE_ENV` | Environment | `development`, `production`, `staging` |

### Security Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | Generated 64-char string |
| `JWT_EXPIRE` | JWT expiration time | `7d`, `24h`, `30m` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `https://example.com,https://app.example.com` |

### Performance Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` (10MB) |

## Backup and Recovery

### Backup Configuration Files

```bash
# Before making changes, backup current config
cp config.production.env config.production.env.backup.$(date +%Y%m%d)

# Keep backups for 30 days
find . -name "config.production.env.backup.*" -mtime +30 -delete
```

### Recovery

```bash
# Restore from backup
cp config.production.env.backup.20260112 config.production.env

# Restart server
pm2 restart emirates-lease-flow-api
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Create Production Config
        run: |
          cat > backend/config.production.env << EOF
          DB_HOST=${{ secrets.DB_HOST }}
          DB_USER=${{ secrets.DB_USER }}
          DB_PASSWORD=${{ secrets.DB_PASSWORD }}
          JWT_SECRET=${{ secrets.JWT_SECRET }}
          CORS_ORIGIN=${{ secrets.CORS_ORIGIN }}
          EOF
      
      - name: Deploy
        run: |
          # Your deployment commands here
```

## Related Files

- `backend/config.env` - Development configuration
- `backend/config.production.env` - Production configuration
- `backend/src/config/config.js` - Configuration loader
- `backend/src/config/database.js` - Database connection
- `backend/src/app.js` - Express application
- `backend/CORS_CONFIGURATION.md` - CORS setup guide

## Support

For issues or questions:
1. Check server logs: `backend/logs/combined.log`
2. Verify config file is loaded correctly (startup message)
3. Test database connection separately
4. Review this documentation

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Maintained By**: Emirates Lease Flow Development Team
