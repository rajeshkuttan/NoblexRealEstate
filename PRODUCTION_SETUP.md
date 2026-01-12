# 🚀 Production Setup Guide - Manual Configuration

## Overview
This guide shows how to manually set up the `.env` file on your production VPS for the Emirates Lease Flow application.

## Configuration Strategy

The backend looks for configuration files in this priority order:

1. **`.env`** (if exists) → Used on production VPS ✅
2. **`config.production.env`** (if NODE_ENV=production) → Optional alternative
3. **`config.env`** → Used for local development

## 📋 Production VPS Setup

### Step 1: SSH into Your VPS

```bash
ssh your-user@your-vps-ip
```

### Step 2: Navigate to Backend Directory

```bash
cd /var/www/emirates-lease-flow-api
# Or wherever your backend is deployed
```

### Step 3: Create Production .env File

```bash
nano .env
```

### Step 4: Add Production Configuration

Copy and paste this template, then **update with your actual production values**:

```env
# PRODUCTION ENVIRONMENT CONFIGURATION

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=Leasemanagement_prod
DB_USER=prod_user
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD

# Server Configuration
PORT=5002
NODE_ENV=production

# JWT Configuration
# Generate with: openssl rand -base64 64
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE
JWT_EXPIRE=7d

# CORS Configuration
# Your production frontend URL only (no localhost!)
CORS_ORIGIN=https://realestate.globaldes.cloud

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/uploads

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/emirates-lease-flow/app.log
```

**Save the file**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Generate Strong JWT Secret

```bash
# Generate a strong JWT secret
openssl rand -base64 64

# Copy the output and update JWT_SECRET in .env
nano .env
# Replace JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE with the generated value
```

### Step 6: Secure the .env File

```bash
# Set proper permissions (only owner can read/write)
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)
```

### Step 7: Verify Configuration

```bash
# Check the file content (don't share this output!)
cat .env

# Make sure all values are updated:
# ✅ DB_PASSWORD is not "YOUR_STRONG_DATABASE_PASSWORD"
# ✅ JWT_SECRET is not "YOUR_GENERATED_JWT_SECRET_HERE"
# ✅ DB_HOST points to your database server
# ✅ CORS_ORIGIN matches your frontend URL exactly
```

### Step 8: Restart Backend

```bash
# Restart PM2 process
pm2 restart leasemanagement-backend

# Check logs
pm2 logs leasemanagement-backend --lines 20

# Should see:
# ✅ Loading configuration from: .env (NODE_ENV: production)
# ✅ Database connection has been established successfully
```

### Step 9: Test the Application

```bash
# Test health endpoint
curl http://localhost:5002/health

# Should return:
# {
#   "success": true,
#   "message": "Emirates Lease Flow API is running",
#   "timestamp": "2026-01-12T...",
#   "environment": "production"
# }
```

## 🔐 Security Checklist

After setting up the `.env` file:

- [ ] **File permissions** set to 600 (`chmod 600 .env`)
- [ ] **Strong database password** (minimum 16 characters, mixed case, numbers, symbols)
- [ ] **JWT secret generated** with `openssl rand -base64 64`
- [ ] **CORS_ORIGIN** matches frontend URL exactly (including https://)
- [ ] **No trailing slash** in CORS_ORIGIN
- [ ] **Production database** exists and user has privileges
- [ ] **Upload directory** exists (`/var/www/uploads`)
- [ ] **Log directory** exists (`/var/log/emirates-lease-flow`)

## 📝 Configuration Values Explained

### Database Settings

```env
DB_HOST=localhost              # Database server (localhost if on same VPS)
DB_PORT=3306                   # MySQL default port
DB_NAME=Leasemanagement_prod   # Production database name
DB_USER=prod_user              # Database username
DB_PASSWORD=SecurePass123!     # Strong password
```

### Server Settings

```env
PORT=5002                      # Backend server port
NODE_ENV=production            # Must be "production"
```

### Security Settings

```env
JWT_SECRET=...                 # 64-char random string
JWT_EXPIRE=7d                  # Token expiration (7 days)
CORS_ORIGIN=https://...        # Frontend URL (exact match)
```

### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100    # Max 100 requests per 15 min
```

### File Handling

```env
MAX_FILE_SIZE=10485760         # 10MB in bytes
UPLOAD_PATH=/var/www/uploads   # Where to store uploads
```

### Logging

```env
LOG_LEVEL=warn                 # Only log warnings and errors
LOG_FILE=/var/log/.../app.log # Log file location
```

## 🔄 Updating Configuration

When you need to update any configuration:

```bash
# SSH into VPS
ssh your-user@your-vps

# Edit .env
cd /var/www/emirates-lease-flow-api
nano .env

# Update the values you need to change

# Save and restart
pm2 restart leasemanagement-backend

# Verify
pm2 logs leasemanagement-backend --lines 10
curl http://localhost:5002/health
```

## 🚨 Common Issues & Solutions

### Issue: "Database connection failed"

**Solution**:
```bash
# Test database connection manually
mysql -h DB_HOST -u DB_USER -p DB_NAME

# If fails, check:
# 1. Database exists: mysql -u root -p
#    SHOW DATABASES;
# 2. User has privileges:
#    SHOW GRANTS FOR 'prod_user'@'localhost';
# 3. Password is correct in .env
```

### Issue: "CORS error" in frontend

**Solution**:
```bash
# Check CORS_ORIGIN in .env
cat .env | grep CORS_ORIGIN

# Must match frontend URL exactly:
# ✅ CORRECT: https://realestate.globaldes.cloud
# ❌ WRONG: http://realestate.globaldes.cloud (http vs https)
# ❌ WRONG: https://realestate.globaldes.cloud/ (trailing slash)

# Update and restart
nano .env
pm2 restart leasemanagement-backend
```

### Issue: ".env not loading"

**Solution**:
```bash
# Check file exists
ls -la /var/www/emirates-lease-flow-api/.env

# Check NODE_ENV is set
pm2 show leasemanagement-backend | grep NODE_ENV

# Should show: NODE_ENV: production

# If not, restart with env:
pm2 delete leasemanagement-backend
NODE_ENV=production pm2 start src/server.js --name leasemanagement-backend
pm2 save
```

### Issue: "Permission denied" when editing .env

**Solution**:
```bash
# If you need sudo:
sudo nano /var/www/emirates-lease-flow-api/.env

# After editing, set ownership back to your user:
sudo chown your-user:your-user .env
chmod 600 .env
```

## 📦 GitHub Actions Deployment

Your current deployment workflow (`.github/workflows/deploy.yml`) is set up to:

1. ✅ Build frontend with production settings
2. ✅ Deploy frontend files
3. ✅ Deploy backend files
4. ✅ Install dependencies
5. ✅ Restart PM2

**Important**: The workflow does NOT create or modify your `.env` file. You manage it manually on the VPS.

### What Gets Deployed

- ✅ All backend code files
- ✅ `node_modules` (reinstalled on VPS)
- ❌ `.env` (NOT deployed - manually managed)
- ❌ `config.env` (NOT deployed - local dev only)

This means:
- Your `.env` file on VPS is **never overwritten** by deployments
- You have **full control** over production configuration
- **No sensitive credentials** in GitHub repository

## 🔄 Deployment Workflow

When you push code to GitHub:

1. GitHub Actions deploys new code
2. Runs `npm install --production`
3. Restarts PM2 with `pm2 restart`
4. Backend reads `.env` from VPS (unchanged)
5. Application runs with your production config

## 💾 Backup Your .env File

**Important**: Keep a backup of your production `.env` file!

```bash
# On VPS, create a backup
cp .env .env.backup.$(date +%Y%m%d)

# Store backup securely (not in git!)
# Options:
# 1. Encrypted password manager
# 2. Secure note-taking app
# 3. Encrypted USB drive
# 4. Server backup location (outside web root)
```

## 📞 Quick Reference

### Generate JWT Secret
```bash
openssl rand -base64 64
```

### Edit Production Config
```bash
ssh your-user@your-vps
cd /var/www/emirates-lease-flow-api
nano .env
```

### Restart Backend
```bash
pm2 restart leasemanagement-backend
pm2 logs leasemanagement-backend
```

### Check Configuration Loading
```bash
pm2 logs leasemanagement-backend | grep "Loading configuration"
# Should show: ✅ Loading configuration from: .env (NODE_ENV: production)
```

### Verify Health
```bash
curl http://localhost:5002/health
```

## 📚 Related Documentation

- `backend/QUICK_START.md` - Quick start guide
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- `.github/workflows/deploy.yml` - Deployment workflow

---

**Last Updated**: January 2026  
**Configuration Method**: Manual .env on VPS  
**Deployment Method**: GitHub Actions + Manual Config
