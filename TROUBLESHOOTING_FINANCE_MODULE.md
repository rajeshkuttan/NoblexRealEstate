# Troubleshooting Finance Module

## Quick Checks

### 1. Backend Server Status
**Backend Terminal should show:**
```
✅ Database connection has been established successfully.
✅ Server is running on port 5002
```

**If not running:**
```bash
cd backend
npm run dev
```

### 2. Frontend Server Status
**Frontend Terminal should show:**
```
VITE ready in XXXms
Local: http://localhost:5173/
```

**If not running:**
```bash
npm run dev
```

### 3. Check Browser Console (F12 → Console)
Common errors:
- **401 Unauthorized** → Demo token issue
- **404 Not Found** → Backend routes not registered
- **500 Server Error** → Database or model issues
- **CORS errors** → Backend CORS configuration

### 4. Test API Endpoints Manually
Open these URLs in your browser (while backend is running):

```
http://localhost:5002/api/vendors/stats
```

Should return JSON with vendor statistics.

### 5. Verify Routes

Navigate to these URLs:
- http://localhost:5173/vendors
- http://localhost:5173/treasury  
- http://localhost:5173/chart-of-accounts
- http://localhost:5173/budget

## Common Issues

### Issue: "Cannot see vendors page"

**Symptom:** Page is blank or shows error

**Solutions:**
1. Hard refresh browser: `Ctrl + Shift + R`
2. Check browser console for errors
3. Verify backend is running on port 5002
4. Check if demo-token is being sent in API requests

### Issue: "No vendors found"

**Symptom:** Page loads but shows "No vendors found"

**Solution:** Run seed script to add test data
```bash
cd backend
node src/scripts/seedFinance.js
```

### Issue: API Errors (401, 403, 500)

**Solutions:**
1. Check `authMiddleware.js` allows demo-token
2. Verify models match database schema
3. Check database connection in backend terminal

### Issue: Backend crashes on startup

**Common Causes:**
- Model field mismatch with database
- Missing database columns
- Foreign key constraints

**Solution:** Re-run migrations
```bash
cd backend
node src/scripts/runMigrations.js up
```

## Seed Test Data

To add test vendors and invoices:

```bash
cd backend
node src/scripts/seedFinance.js
```

This will create:
- 10 vendors
- 20 vendor invoices
- 3 bank accounts
- Sample transactions

## Verify Everything Works

1. ✅ Backend running without errors
2. ✅ Frontend compiles successfully  
3. ✅ Can access http://localhost:5173/vendors
4. ✅ Browser console has no errors
5. ✅ API calls return data (check Network tab in DevTools)

## Still Not Working?

Provide these details:
1. Backend terminal output
2. Frontend terminal output
3. Browser console errors
4. Network tab errors (F12 → Network)
5. Screenshot of what you see

