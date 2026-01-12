# Start Servers Guide

## Backend Server (Port 5002)

**Open Terminal 1:**
```bash
cd "D:\Projects\Lease Management\emirates-lease-flow\backend"
"C:\Program Files\nodejs\npm.cmd" run dev
```

**Expected Output:**
```
✅ Database connection has been established successfully.
✅ Server is running on port 5002
```

---

## Frontend Server (Port 5173 or 8080)

**Open Terminal 2:**
```bash
cd "D:\Projects\Lease Management\emirates-lease-flow"
"C:\Program Files\nodejs\npm.cmd" run dev
```

**Expected Output:**
```
VITE ready in XXXms
Local: http://localhost:5173/  (or 8080)
```

---

## Verify Servers Are Running

1. **Backend Test:** Open http://localhost:5002/api/vendors/stats in browser
   - Should return JSON data (or 401 if auth issue)
   
2. **Frontend Test:** Open http://localhost:5173 (or 8080) in browser
   - Should show login screen or dashboard

---

## If Backend Shows Errors

Check for these common issues:
- Model/database schema mismatch
- Missing database columns
- Foreign key constraint errors

**Solution:** Check backend terminal output and share the error message.

---

## Current Status

Based on error.txt:
- ✅ Frontend is running on **port 8080**
- ❌ Backend API calls failing with **500 errors**
- Backend is either:
  - Not running
  - Crashing when handling requests
  - Has model/database issues

**Next Step:** Share the backend terminal output so I can fix the 500 errors.

