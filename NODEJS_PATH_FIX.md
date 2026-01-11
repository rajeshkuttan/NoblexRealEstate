# Node.js PATH Issue - Permanent Fix

## Problem Identified
Node.js is installed at `C:\Program Files\nodejs` but is **NOT** in your system PATH environment variable. This causes the error:
```
The term 'node.exe' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

## Root Cause
- Node.js installation exists: ✅ `C:\Program Files\nodejs\node.exe`
- Node.js in system PATH: ❌ Missing
- This happens when Node.js installer doesn't properly set PATH or it gets removed

## Permanent Solutions

### Method 1: Add to System PATH (Recommended)

#### Step 1: Open System Environment Variables
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click "Advanced" tab
3. Click "Environment Variables" button

#### Step 2: Edit PATH Variable
1. In "System variables" section, find and select "Path"
2. Click "Edit"
3. Click "New"
4. Add: `C:\Program Files\nodejs`
5. Click "OK" on all dialogs

#### Step 3: Restart Cursor
- Close Cursor completely
- Reopen Cursor
- Test: `node --version`

### Method 2: PowerShell Profile (Alternative)

#### Create PowerShell Profile
```powershell
# Check if profile exists
Test-Path $PROFILE

# Create profile if it doesn't exist
New-Item -ItemType File -Path $PROFILE -Force

# Edit profile
notepad $PROFILE
```

#### Add to Profile
```powershell
# Add this line to your PowerShell profile
$env:PATH += ";C:\Program Files\nodejs"
```

### Method 3: Batch Script Solution

#### Create startup script
Create `start-dev.bat` in your project:
```batch
@echo off
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "D:\Projects\Lease Management\emirates-lease-flow"
npm run dev
```

## Verification Steps

### Test Node.js Access
```powershell
# Test in PowerShell
node --version
npm --version
```

### Test in Cursor Terminal
```bash
# Should work after PATH fix
cd "D:\Projects\Lease Management\emirates-lease-flow"
npm run dev
```

## Alternative Workarounds

### Option 1: Use Full Path
```powershell
# Use full path to node
"C:\Program Files\nodejs\node.exe" --version
"C:\Program Files\nodejs\npm.cmd" run dev
```

### Option 2: Set PATH in Current Session
```powershell
# Temporary fix for current session
$env:PATH += ";C:\Program Files\nodejs"
npm run dev
```

### Option 3: Use nvm-windows (Node Version Manager)
```powershell
# Install nvm-windows for better Node.js management
# Download from: https://github.com/coreybutler/nvm-windows
nvm install latest
nvm use latest
```

## Prevention Tips

### 1. Reinstall Node.js Properly
1. Download latest Node.js from https://nodejs.org
2. Run installer as Administrator
3. Ensure "Add to PATH" option is checked
4. Restart computer after installation

### 2. Use Node Version Manager
- Install nvm-windows for better Node.js management
- Prevents PATH issues
- Allows multiple Node.js versions

### 3. Check PATH Regularly
```powershell
# Check if Node.js is in PATH
$env:PATH -split ';' | Where-Object { $_ -like '*node*' }
```

## Quick Fix Commands

### Immediate Fix (Current Session)
```powershell
# Add Node.js to current session PATH
$env:PATH += ";C:\Program Files\nodejs"

# Navigate to project and run
cd "D:\Projects\Lease Management\emirates-lease-flow"
npm run dev
```

### Permanent Fix (System PATH)
1. Win + R → `sysdm.cpl`
2. Advanced → Environment Variables
3. System Variables → Path → Edit
4. New → `C:\Program Files\nodejs`
5. OK → OK → OK
6. Restart Cursor

## Troubleshooting

### If PATH Fix Doesn't Work
1. **Restart Computer** - PATH changes require system restart
2. **Check User vs System PATH** - Add to both if needed
3. **Verify Node.js Installation** - Reinstall if corrupted
4. **Use Alternative Terminal** - Try Command Prompt instead of PowerShell

### Verify Fix
```powershell
# These should work after fix
node --version
npm --version
npm run dev
```

## Summary

**The Issue**: Node.js is installed but not in system PATH
**The Fix**: Add `C:\Program Files\nodejs` to system PATH
**The Result**: No more "node.exe not recognized" errors

**Quick Action**: Use Method 1 (System PATH) for permanent solution.
