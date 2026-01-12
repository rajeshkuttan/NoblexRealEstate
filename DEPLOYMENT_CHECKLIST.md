# 🚀 Deployment Checklist

## Pre-Deployment Checklist

### ✅ GitHub Secrets Configuration

Go to: **Repository → Settings → Secrets and variables → Actions**

- [ ] **VPS_HOST** - Your VPS IP or hostname
- [ ] **VPS_USERNAME** - SSH username
- [ ] **VPS_SSH_KEY** - Private SSH key (entire content)
- [ ] **VPS_PORT** - SSH port (usually 22)
- [ ] **VPS_FRONTEND_PATH** - Frontend deployment path
- [ ] **VPS_BACKEND_PATH** - Backend deployment path
- [ ] **DB_HOST** - Production database host
- [ ] **DB_PORT** - Database port (usually 3306)
- [ ] **DB_NAME** - Production database name
- [ ] **DB_USER** - Database username
- [ ] **DB_PASSWORD** - Strong database password
- [ ] **JWT_SECRET** - Generated JWT secret (use: `openssl rand -base64 64`)
- [ ] **VITE_API_URL** - Backend API URL (e.g., `https://yourdomain.com/api`)
- [ ] **CORS_ORIGIN** - Frontend URL (e.g., `https://yourdomain.com`)

### ✅ VPS Server Setup (First Time)

- [ ] **Node.js 18+** installed
- [ ] **PM2** installed globally (`npm install -g pm2`)
- [ ] **Nginx** installed and configured
- [ ] **MySQL/MariaDB** installed and running
- [ ] **Production database** created
- [ ] **Database user** created with privileges
- [ ] **SSH key** added to authorized_keys
- [ ] **Deployment directories** created:
  - [ ] `/var/www/emirates-lease-flow` (frontend)
  - [ ] `/var/www/emirates-lease-flow-api` (backend)
  - [ ] `/var/www/uploads` (file uploads)
  - [ ] `/var/log/emirates-lease-flow` (logs)
- [ ] **Directory permissions** set correctly
- [ ] **Firewall rules** configured (ports 22, 80, 443)
- [ ] **SSL certificate** installed (optional but recommended)

### ✅ Local Testing Before Deployment

- [ ] **All tests pass** locally
- [ ] **Production build** works (`npm run build`)
- [ ] **Backend starts** in production mode (`NODE_ENV=production npm start`)
- [ ] **Database migrations** tested
- [ ] **API endpoints** tested
- [ ] **CORS configuration** verified
- [ ] **No console errors** in browser
- [ ] **No lint errors** (`npm run lint`)

### ✅ Code Quality

- [ ] **Code reviewed** and approved
- [ ] **Sensitive data** removed from code
- [ ] **Config files** not in git (`.gitignore` updated)
- [ ] **Dependencies** up to date
- [ ] **Security vulnerabilities** checked (`npm audit`)
- [ ] **Commit messages** are clear
- [ ] **Branch** is clean (no uncommitted changes)

### ✅ Database

- [ ] **Production database** exists
- [ ] **Database user** has correct privileges
- [ ] **Connection tested** from VPS
- [ ] **Backup** of existing data (if updating)
- [ ] **Migrations** ready to run
- [ ] **Seed data** prepared (if needed)

### ✅ Backend Configuration

- [ ] **config.production.env.example** updated
- [ ] **Environment loader** tested
- [ ] **All required env vars** documented
- [ ] **JWT secret** generated and strong
- [ ] **CORS origins** correct for production
- [ ] **Rate limiting** configured appropriately
- [ ] **File upload paths** exist on VPS
- [ ] **Log paths** exist on VPS

### ✅ Frontend Configuration

- [ ] **.env.production** has correct API URL
- [ ] **Build** creates dist/ folder
- [ ] **API calls** use environment variables
- [ ] **No hardcoded URLs** in code
- [ ] **Assets** load correctly
- [ ] **Routing** works (refresh on any page)

### ✅ Nginx Configuration

- [ ] **Server block** configured for domain
- [ ] **Frontend** serves from correct path
- [ ] **API proxy** configured (`/api` → backend)
- [ ] **SSL** configured (if using)
- [ ] **Config tested** (`sudo nginx -t`)
- [ ] **Redirects** working (http → https if using SSL)

### ✅ PM2 Configuration

- [ ] **PM2** installed on VPS
- [ ] **Startup script** configured (`pm2 startup`)
- [ ] **Process name** decided (leasemanagement-backend)
- [ ] **Cluster mode** configured (if desired)
- [ ] **Memory limit** set appropriately
- [ ] **Environment** set to production

## Deployment Commands (Quick Reference)

### Manual Deployment (SSH Method)

```bash
# 1. SSH into VPS
ssh your-user@your-vps

# 2. Update code
cd /var/www/emirates-lease-flow-api
git pull origin main

# 3. Install dependencies
npm install --production

# 4. Run migrations
NODE_ENV=production node src/scripts/runMigrations.js

# 5. Restart PM2
pm2 restart leasemanagement-backend

# 6. Check status
pm2 status
pm2 logs leasemanagement-backend --lines 20
```

### Automatic Deployment (GitHub Actions)

```bash
# Just push to main branch
git push origin main

# Or trigger manually from GitHub:
# Actions → Deploy to Hostinger VPS → Run workflow
```

## Post-Deployment Verification

### ✅ Backend Checks

```bash
# SSH into VPS
ssh your-user@your-vps

# Check PM2 status
pm2 list
pm2 logs leasemanagement-backend --lines 20

# Check config file
cat /var/www/emirates-lease-flow-api/config.production.env

# Test health endpoint
curl http://localhost:5002/health

# Test API endpoint
curl http://localhost:5002/api/properties
```

### ✅ Frontend Checks

```bash
# Check Nginx status
sudo systemctl status nginx

# Check frontend files
ls -la /var/www/emirates-lease-flow/

# Test from browser
# Visit: https://yourdomain.com
```

### ✅ Functional Tests

- [ ] **Homepage loads** correctly
- [ ] **Login works** with test credentials
- [ ] **API calls** successful (check Network tab)
- [ ] **No CORS errors** in console
- [ ] **Data displays** correctly
- [ ] **Forms submit** successfully
- [ ] **File uploads** work
- [ ] **Authentication** works (login/logout)
- [ ] **Authorization** works (role-based access)
- [ ] **Mobile responsive** layout works

### ✅ Performance Checks

- [ ] **Page load time** < 3 seconds
- [ ] **API response time** < 500ms
- [ ] **No memory leaks** (check PM2 memory usage)
- [ ] **No database connection pool** exhaustion
- [ ] **SSL certificate** valid and not expired
- [ ] **Caching** working (browser and Nginx)

### ✅ Security Checks

- [ ] **HTTPS** working (if configured)
- [ ] **HTTP** redirects to HTTPS
- [ ] **Security headers** present
- [ ] **CORS** properly restricted
- [ ] **Rate limiting** working
- [ ] **Sensitive endpoints** protected
- [ ] **File permissions** correct (600 for config files)
- [ ] **No sensitive data** exposed in responses

### ✅ Monitoring Setup

- [ ] **PM2 logs** rotating properly
- [ ] **Error monitoring** configured
- [ ] **Uptime monitoring** set up
- [ ] **Backup schedule** configured
- [ ] **Alerts** configured for downtime
- [ ] **Analytics** tracking (if using)

## Rollback Procedure (If Needed)

### Quick Rollback

```bash
# SSH into VPS
ssh your-user@your-vps

# Option 1: Git rollback
cd /var/www/emirates-lease-flow-api
git log --oneline  # Find previous working commit
git checkout COMMIT_HASH
npm install --production
pm2 restart leasemanagement-backend

# Option 2: Restore from backup
sudo systemctl stop leasemanagement-backend
cp -r /backup/emirates-lease-flow-api/* /var/www/emirates-lease-flow-api/
pm2 restart leasemanagement-backend

# Verify
curl http://localhost:5002/health
```

## Emergency Contacts

- **DevOps Lead**: [Name/Contact]
- **Database Admin**: [Name/Contact]
- **VPS Provider Support**: [Hostinger Support]
- **Domain Provider**: [DNS Provider]

## Notes

- Always test in staging before production deployment
- Keep backups before major changes
- Document any custom configurations
- Update this checklist as needed

---

**Last Review**: January 2026  
**Next Review**: [Schedule]  
**Version**: 1.0.0
