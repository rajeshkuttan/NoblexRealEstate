# 🚀 Deployment Guide - GitHub Actions Auto-Deployment

## Overview
This guide covers the automatic deployment process using GitHub Actions to deploy the Emirates Lease Flow application to your Hostinger VPS.

## 📋 Prerequisites

### 1. VPS Server Requirements
- ✅ Ubuntu/Debian Linux server
- ✅ Node.js 18+ installed
- ✅ PM2 installed globally (`npm install -g pm2`)
- ✅ MySQL/MariaDB installed and running
- ✅ Nginx installed (for serving frontend)
- ✅ SSH access configured

### 2. GitHub Repository
- ✅ Code pushed to `main` branch
- ✅ GitHub Actions enabled
- ✅ Secrets configured (see below)

## 🔐 Required GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

### VPS Connection Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address or hostname | `123.45.67.89` or `vps.yourdomain.com` |
| `VPS_USERNAME` | SSH username (usually `root` or your user) | `root` |
| `VPS_SSH_KEY` | Private SSH key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `VPS_PORT` | SSH port (default: 22) | `22` |

### Deployment Path Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_FRONTEND_PATH` | Where to deploy frontend files | `/var/www/emirates-lease-flow` |
| `VPS_BACKEND_PATH` | Where to deploy backend files | `/var/www/emirates-lease-flow-api` |

### Database Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DB_HOST` | Production database host | `localhost` or `db.example.com` |
| `DB_PORT` | Database port | `3306` |
| `DB_NAME` | Production database name | `Leasemanagement_prod` |
| `DB_USER` | Database username | `prod_user` |
| `DB_PASSWORD` | Database password | `YourStrongPassword123!` |

### Application Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (generate: `openssl rand -base64 64`) | `Generated_64_Char_Secret` |
| `VITE_API_URL` | Backend API URL | `https://realestate.globaldes.cloud/api` |
| `CORS_ORIGIN` | Frontend URL | `https://realestate.globaldes.cloud` |
| `BACKEND_PORT` | Backend port (optional, defaults to 5002) | `5002` |
| `UPLOAD_PATH` | File upload directory (optional) | `/var/www/uploads` |

## 📝 How to Get SSH Key

### Generate SSH Key Pair (if you don't have one)

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# This creates:
# - Private key: ~/.ssh/github_deploy_key
# - Public key:  ~/.ssh/github_deploy_key.pub
```

### Add Public Key to VPS

```bash
# Copy public key content
cat ~/.ssh/github_deploy_key.pub

# On VPS, add to authorized_keys
ssh your-user@your-vps
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key content
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Add Private Key to GitHub Secrets

```bash
# Copy private key content
cat ~/.ssh/github_deploy_key

# Add this entire content (including BEGIN and END lines) to GitHub Secret: VPS_SSH_KEY
```

## 🎯 Deployment Workflow

### Automatic Deployment (On Push to Main)

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions automatically:
# 1. Builds frontend with production settings
# 2. Creates production config on VPS
# 3. Deploys frontend files
# 4. Deploys backend files
# 5. Installs dependencies
# 6. Runs database migrations
# 7. Restarts backend with PM2
# 8. Performs health check
```

### Manual Deployment

Go to: **Actions → Deploy to Hostinger VPS → Run workflow → Run workflow**

## 📊 Deployment Steps (What Happens)

### Step 1: Frontend Build
```yaml
- Installs frontend dependencies
- Builds React app with Vite
- Uses production API URL from secrets
- Creates optimized dist/ folder
```

### Step 2: Production Config Creation
```yaml
- SSHs into VPS
- Creates config.production.env with secrets
- Sets proper file permissions (600)
- Secures sensitive credentials
```

### Step 3: Frontend Deployment
```yaml
- Copies dist/ folder to VPS_FRONTEND_PATH
- Removes old files (clean deployment)
- Maintains zero-downtime
```

### Step 4: Backend Deployment
```yaml
- Copies backend files to VPS
- Excludes sensitive local config files
- Excludes node_modules (will reinstall)
- Preserves logs and uploads
```

### Step 5: Backend Setup
```yaml
- Installs production dependencies (npm install --production)
- Creates logs/ and uploads/ directories
- Runs database migrations (if any)
- Sets NODE_ENV=production
```

### Step 6: PM2 Restart
```yaml
- Stops old PM2 process
- Starts new process with:
  - Entry: src/server.js
  - Name: leasemanagement-backend
  - Instances: 2 (cluster mode)
  - Memory: 2GB limit
  - Environment: production
- Saves PM2 configuration
```

### Step 7: Health Check
```yaml
- Waits 10 seconds for backend to start
- Checks /health endpoint
- Verifies HTTP 200 response
- Shows PM2 process list
- Displays logs if failed
```

## 🔍 Monitoring Deployment

### View Workflow Progress

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. Watch real-time logs
4. Check each step's status

### Check Deployment Status

```bash
# SSH into your VPS
ssh your-user@your-vps

# Check PM2 processes
pm2 list
pm2 logs leasemanagement-backend

# Check backend health
curl http://localhost:5002/health

# Check config file
ls -la config.production.env
cat config.production.env  # Verify settings
```

## 🛠️ VPS Server Setup (First Time Only)

### 1. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### 2. Create Directories

```bash
# Create deployment directories
sudo mkdir -p /var/www/emirates-lease-flow
sudo mkdir -p /var/www/emirates-lease-flow-api
sudo mkdir -p /var/www/uploads
sudo mkdir -p /var/log/emirates-lease-flow

# Set ownership
sudo chown -R $USER:$USER /var/www/emirates-lease-flow*
sudo chown -R $USER:$USER /var/www/uploads
sudo chown -R $USER:$USER /var/log/emirates-lease-flow
```

### 3. Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/emirates-lease-flow
```

```nginx
# Frontend - Serve static files
server {
    listen 80;
    server_name realestate.globaldes.cloud;
    
    root /var/www/emirates-lease-flow;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy
    location /api {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5002/health;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/emirates-lease-flow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup Database

```bash
# Login to MySQL
sudo mysql

# Create production database
CREATE DATABASE Leasemanagement_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create production user
CREATE USER 'prod_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON Leasemanagement_prod.* TO 'prod_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Test connection
mysql -u prod_user -p Leasemanagement_prod
```

### 5. Setup PM2 Startup

```bash
# Configure PM2 to start on system boot
pm2 startup
# Run the command it outputs

# Start your application
cd /var/www/emirates-lease-flow-api
NODE_ENV=production pm2 start src/server.js --name leasemanagement-backend

# Save PM2 configuration
pm2 save
```

### 6. Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d realestate.globaldes.cloud

# Auto-renewal is configured by default
```

## 🐛 Troubleshooting

### Deployment Failed - SSH Connection

**Issue**: Can't connect to VPS

**Solutions**:
```bash
# Test SSH connection manually
ssh -i ~/.ssh/your_key your-user@your-vps -p 22

# Check VPS firewall
sudo ufw status
sudo ufw allow 22/tcp

# Check SSH service
sudo systemctl status ssh
```

### Deployment Failed - Permission Denied

**Issue**: Can't write to deployment directory

**Solutions**:
```bash
# Fix directory permissions
sudo chown -R $USER:$USER /var/www/emirates-lease-flow*

# Or use sudo in deployment script
# (Not recommended for security)
```

### Backend Won't Start

**Issue**: PM2 shows error or offline

**Solutions**:
```bash
# Check PM2 logs
pm2 logs leasemanagement-backend --lines 100

# Check config file
cat /var/www/emirates-lease-flow-api/config.production.env

# Test database connection
mysql -h DB_HOST -u DB_USER -p DB_NAME

# Manually start to see errors
cd /var/www/emirates-lease-flow-api
NODE_ENV=production node src/server.js
```

### Database Connection Failed

**Issue**: Can't connect to production database

**Solutions**:
```bash
# Verify database exists
mysql -u root -p
SHOW DATABASES;

# Check user privileges
SELECT User, Host FROM mysql.user;
SHOW GRANTS FOR 'prod_user'@'localhost';

# Test connection
mysql -h localhost -u prod_user -p Leasemanagement_prod

# Check config.production.env
cat /var/www/emirates-lease-flow-api/config.production.env | grep DB_
```

### Frontend Not Loading

**Issue**: 404 or blank page

**Solutions**:
```bash
# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx

# Check file permissions
ls -la /var/www/emirates-lease-flow/

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### CORS Errors

**Issue**: Frontend can't connect to backend

**Solutions**:
```bash
# Check CORS_ORIGIN in production config
cat /var/www/emirates-lease-flow-api/config.production.env | grep CORS_ORIGIN

# Should match frontend URL exactly
# ✅ Correct: https://realestate.globaldes.cloud
# ❌ Wrong: http://realestate.globaldes.cloud (http vs https)
# ❌ Wrong: https://realestate.globaldes.cloud/ (trailing slash)

# Update and restart
nano /var/www/emirates-lease-flow-api/config.production.env
pm2 restart leasemanagement-backend
```

## 📈 Best Practices

### 1. Version Tags
```bash
# Tag releases for rollback capability
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 2. Database Backups
```bash
# Automate daily backups
crontab -e
# Add: 0 2 * * * mysqldump -u prod_user -p'password' Leasemanagement_prod > /backup/db_$(date +\%Y\%m\%d).sql
```

### 3. Log Rotation
```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4. Monitoring
```bash
# Setup PM2 monitoring
pm2 install pm2-server-monit

# Or use PM2 Plus (https://pm2.io)
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY
```

### 5. Security
```bash
# Regular updates
sudo apt update && sudo apt upgrade

# Firewall rules
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Fail2ban for SSH protection
sudo apt install fail2ban
```

## 🔄 Rollback Procedure

If deployment fails or causes issues:

```bash
# SSH into VPS
ssh your-user@your-vps

# Check PM2 logs
pm2 logs leasemanagement-backend --lines 50

# Rollback to previous version
cd /var/www/emirates-lease-flow-api
git checkout previous-working-commit

# Reinstall and restart
npm install --production
pm2 restart leasemanagement-backend

# Or restore from backup
# cp -r /backup/emirates-lease-flow-api/* /var/www/emirates-lease-flow-api/
```

## 📚 Related Documentation

- `backend/ENVIRONMENT_CONFIGURATION.md` - Environment setup guide
- `backend/CORS_CONFIGURATION.md` - CORS configuration
- `backend/QUICK_START.md` - Quick reference
- `.github/workflows/deploy.yml` - Deployment workflow file

## 🆘 Support

For deployment issues:

1. **Check GitHub Actions logs** - Most detailed error information
2. **Check PM2 logs** - `pm2 logs leasemanagement-backend`
3. **Check Nginx logs** - `/var/log/nginx/error.log`
4. **Check system logs** - `/var/log/syslog`
5. **Review this guide** - Common solutions above

---

**Last Updated**: January 2026  
**Workflow Version**: 2.0.0  
**Maintained By**: Emirates Lease Flow Development Team
