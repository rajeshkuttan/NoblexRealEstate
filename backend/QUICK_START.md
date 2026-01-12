# Quick Start Guide - Environment Configuration

## 🚀 For New Developers (Local Setup)

```bash
# 1. Copy the example config file
cd backend
cp config.env.example config.env

# 2. Update with your local MySQL credentials (if different from defaults)
nano config.env

# 3. Create database
mysql -u root -p
CREATE DATABASE Leasemanagement;
exit

# 4. Install dependencies
npm install

# 5. Run migrations (if any)
npm run migrate

# 6. Start development server
npm run dev

# ✅ Server runs with LOCAL database (config.env)
```

## 🌐 For Production Deployment

```bash
# 1. Copy the production template
cd backend
cp config.production.env.example config.production.env

# 2. Update with production credentials
nano config.production.env
# Update:
# - DB_HOST (production database server)
# - DB_NAME (production database name)
# - DB_USER (production database user)
# - DB_PASSWORD (strong password)
# - JWT_SECRET (generate: openssl rand -base64 64)
# - CORS_ORIGIN (production frontend URL only)

# 3. Secure the config file
chmod 600 config.production.env

# 4. Set environment and start
export NODE_ENV=production
npm start

# ✅ Server runs with PRODUCTION database (config.production.env)
```

## 📋 Which Config File is Used?

| Command | NODE_ENV | Config File | Database |
|---------|----------|-------------|----------|
| `npm run dev` | development | `config.env` | Local MySQL |
| `npm start` | production | `config.production.env` | Production DB |
| `NODE_ENV=production npm start` | production | `config.production.env` | Production DB |

## 🔍 How to Verify

When server starts, look for this message:

```bash
✅ Loading configuration from: config.env           # Development
✅ Loading configuration from: config.production.env # Production
```

## ⚠️ Important Security Notes

1. **NEVER commit** `config.env` or `config.production.env` to git
2. **NEVER share** production database credentials
3. **ALWAYS use** strong passwords in production
4. **GENERATE new** JWT secret for production: `openssl rand -base64 64`
5. **SET file** permissions: `chmod 600 config.production.env`

## 🆘 Quick Troubleshooting

### Wrong database connected?
```bash
# Check which config is loaded
cat logs/combined.log | grep "Loading configuration"

# Check NODE_ENV
echo $NODE_ENV

# Force production
export NODE_ENV=production
npm start
```

### Config file not found?
```bash
# Check if file exists
ls -la config*.env

# Create from template
cp config.env.example config.env
cp config.production.env.example config.production.env
```

### Database connection failed?
```bash
# Test database connection
mysql -h DB_HOST -u DB_USER -p DB_NAME

# Check credentials in config
cat config.env | grep DB_
```

## 📚 More Information

- **Full Guide**: See `ENVIRONMENT_CONFIGURATION.md`
- **CORS Setup**: See `CORS_CONFIGURATION.md`
- **Database Schema**: See `database.txt`

---

**Need help?** Check the full documentation or contact the development team.
