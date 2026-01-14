# Tenant Cleanup Guide

This guide explains how to safely delete tenants without names from the database.

---

## ⚠️ Important

There are **two scripts** available:
1. **Safe Cleanup** - Only deletes tenants without leases (recommended)
2. **Force Cleanup** - Deletes ALL tenants without names, including associated data (use with caution)

---

## Option 1: Safe Cleanup (Recommended)

This script only deletes tenants that have no associated leases, preserving data integrity.

### Steps:

1. Navigate to backend directory:
```bash
cd emirates-lease-flow/backend
```

2. Run the safe cleanup script:
```bash
node scripts/cleanup-tenants.js
```

### What it does:

✅ Finds all tenants with:
- NULL name
- Empty string name
- Only whitespace in name

✅ Checks for associated leases

✅ Only deletes tenants WITHOUT leases

✅ Shows detailed report before deletion

✅ Safe for production use

### Example Output:

```
🔍 Starting tenant cleanup process...

📊 Found 5 tenant(s) without valid names

📋 Tenants to be deleted:

1. ID: 123
   Email: test@example.com
   Phone: +971501234567
   Name: ""
   Has Leases: NO
   Created: 2026-01-10T12:00:00.000Z

⚠️  WARNING: 2 tenant(s) have active leases!
   These tenants will NOT be deleted to preserve data integrity.

✅ Safe to delete: 3 tenant(s) without leases

🗑️  Successfully deleted 3 tenant(s)

📊 Summary:
   Total found: 5
   With leases (kept): 2
   Deleted: 3

✅ Cleanup complete!
```

---

## Option 2: Force Cleanup (Use with Caution)

⚠️ **WARNING:** This script deletes ALL tenants without names, even if they have leases, invoices, payments, or tickets!

### Steps:

1. Navigate to backend directory:
```bash
cd emirates-lease-flow/backend
```

2. Run the force cleanup script:
```bash
node scripts/force-cleanup-tenants.js
```

3. Wait 5 seconds or press Ctrl+C to cancel

### What it does:

🔥 Finds all tenants with invalid names

🔥 Deletes associated data in correct order:
   1. Payments
   2. Invoices
   3. Tickets
   4. Leases
   5. Tenants

🔥 Uses database transaction (all or nothing)

🔥 Shows detailed report including all related data

⚠️ **Use only if you're sure!**

### Example Output:

```
⚠️  WARNING: You are about to FORCE DELETE all tenants without names!
This action cannot be undone and will delete ALL associated data.

Press Ctrl+C to cancel, or wait 5 seconds to continue...

⚠️  🔥 FORCE CLEANUP MODE 🔥 ⚠️

This will delete ALL tenants without names, including their associated data!

📊 Found 5 tenant(s) without valid names

📋 Tenants to be FORCE DELETED:

1. ID: 123
   Email: test@example.com
   Phone: +971501234567
   Name: ""
   Leases: 2
   Created: 2026-01-10T12:00:00.000Z

📊 Related data to be deleted:
   Leases: 8
   Invoices: 24
   Payments: 36
   Tickets: 5

🗑️  Starting deletion process...

   ✓ Deleted 36 payment(s)
   ✓ Deleted 24 invoice(s)
   ✓ Deleted 5 ticket(s)
   ✓ Deleted 8 lease(s)
   ✓ Deleted 5 tenant(s)

📊 Final Summary:
   Tenants deleted: 5
   Leases deleted: 8
   Invoices deleted: 24
   Payments deleted: 36
   Tickets deleted: 5

✅ FORCE cleanup complete!
```

---

## Manual Database Query

If you prefer to check manually first:

```sql
-- Check tenants without names
SELECT 
  id, 
  name, 
  email, 
  phone, 
  created_at,
  (SELECT COUNT(*) FROM leases WHERE tenant_id = tenants.id) as lease_count
FROM tenants 
WHERE name IS NULL 
   OR name = '' 
   OR name REGEXP '^[[:space:]]*$';

-- Count tenants without names
SELECT COUNT(*) as count
FROM tenants 
WHERE name IS NULL 
   OR name = '' 
   OR name REGEXP '^[[:space:]]*$';

-- DANGER: Delete tenants without names (no leases only)
DELETE FROM tenants 
WHERE (name IS NULL OR name = '' OR name REGEXP '^[[:space:]]*$')
  AND id NOT IN (SELECT DISTINCT tenant_id FROM leases WHERE tenant_id IS NOT NULL);
```

---

## Recommendations

1. **Use Safe Cleanup First**
   - Run `cleanup-tenants.js` to remove tenants without leases
   - This is safe and preserves data integrity

2. **Review Tenants with Leases**
   - Manually check tenants that have leases but no names
   - Update their names if possible
   - Or use force cleanup if you're certain they're invalid

3. **Backup Before Force Cleanup**
   - Always backup your database before running force cleanup
   - Test on a development/staging environment first

4. **Fix Data Entry**
   - Ensure frontend validation prevents empty names
   - Check why tenants were created without names
   - Fix the root cause to prevent future issues

---

## Troubleshooting

### Script doesn't run

**Error:** `Cannot find module`
**Solution:** Install dependencies first:
```bash
cd backend
npm install
```

### Database connection error

**Error:** `Unable to connect to database`
**Solution:** Check your `config.env` file has correct database credentials

### Permission denied

**Error:** `EACCES: permission denied`
**Solution:** Run with proper permissions:
```bash
sudo node scripts/cleanup-tenants.js
```

---

## After Cleanup

1. **Verify Results**
   - Check the database to confirm deletions
   - Verify no orphaned records remain

2. **Update Frontend**
   - Refresh any cached tenant lists
   - Verify tenant dropdowns work correctly

3. **Document**
   - Record what was deleted and when
   - Note any issues for future reference

---

## Prevention

To prevent tenants without names in the future:

1. **Frontend Validation**
   - Already implemented in `TenantForm.tsx`
   - Zod schema requires name: `z.string().min(1, "Full name is required")`

2. **Backend Validation**
   - Already in `Tenant` model: `allowNull: false`
   - Validation middleware checks for valid name

3. **Database Constraint**
   - Add CHECK constraint to ensure name is not empty:
   ```sql
   ALTER TABLE tenants 
   ADD CONSTRAINT check_name_not_empty 
   CHECK (name IS NOT NULL AND LENGTH(TRIM(name)) > 0);
   ```

---

**Created:** January 15, 2026  
**Scripts Location:** `backend/scripts/`  
**Use:** Run from `backend/` directory only
