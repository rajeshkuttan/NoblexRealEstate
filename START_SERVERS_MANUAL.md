# 🚀 Manual Server Startup Instructions

## Issue
The background server startup is experiencing port conflicts. Let's start the servers manually in visible terminals.

## ✅ Step-by-Step Instructions

### 1. Start Backend Server

**Open a NEW terminal in Cursor** (not in this chat) and run:

```bash
cd "C:\Users\iamra\OneDrive\Documents\Projects\Lease Management\emirates-lease-flow\backend"
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📊 API available at http://localhost:3001/api
✅ Core backend services active
✅ Database synchronized successfully.
```

**Keep this terminal open!**

---

### 2. Start Frontend Server

The frontend should already be running on port 8080.

If not, **open another NEW terminal** and run:

```bash
cd "C:\Users\iamra\OneDrive\Documents\Projects\Lease Management\emirates-lease-flow"
npm run dev
```

**Expected Output:**
```
VITE v4.5.0  ready in 183 ms
➜  Local:   http://localhost:8080/
```

**Keep this terminal open!**

---

### 3. Access the Application

Once both servers are running:

👉 **Open your browser:** http://localhost:8080/

---

## 🔧 Troubleshooting

### If Port 3001 is Already in Use

Run this to kill all Node processes:
```bash
taskkill /F /IM node.exe
```

Then start the backend server again.

### If You See "ERR_CONNECTION_REFUSED"

- Make sure the backend server is running (check terminal #1)
- Look for "🚀 Server running on port 3001" message
- If not showing, restart the backend server

### If Frontend Won't Start

- Check if port 8080 is in use
- Try accessing http://localhost:8080/ directly
- Frontend might already be running

---

## ✅ Success Indicators

**Backend Running:**
- ✅ "🚀 Server running on port 3001"
- ✅ "✅ Database synchronized successfully"
- ✅ No crash/error messages

**Frontend Running:**
- ✅ "VITE v4.5.0  ready"  
- ✅ "Local:   http://localhost:8080/"
- ✅ Browser loads the application

---

**Once both are running, refresh your browser and the connection errors should be resolved!** 🎉
