# ⚠️ COMPLETE CLEANUP WARNING

## What This Script Does

The script `delete-all-tenants-leases.js` will **DELETE EVERYTHING** related to tenants and leases:

### Will Be DELETED:
- ✗ ALL Tenants (every single one)
- ✗ ALL Leases (every lease agreement)
- ✗ ALL Invoices (all billing records)
- ✗ ALL Payments (all payment history)
- ✗ ALL Tickets (all maintenance/support tickets)

### Will Be PRESERVED:
- ✓ Properties (all property records kept)
- ✓ Units (all unit records kept)
- ✓ Users (system users kept)

---

## ⚠️ BEFORE YOU RUN THIS

### 1. BACKUP YOUR DATABASE
```bash
# MySQL backup
mysqldump -u root -p Leasemanagement > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use your database management tool
```

### 2. VERIFY YOU WANT TO DELETE EVERYTHING
Ask yourself:
- [ ] Do I really want to delete ALL tenant data?
- [ ] Do I have a backup?
- [ ] Am I on the correct environment (not production)?
- [ ] Do I understand this cannot be undone?

### 3. KNOW WHAT YOU'RE LOSING
This will delete:
- All tenant contact information
- All lease agreements and terms
- All financial records (invoices, payments)
- All service history (tickets)

---

## How to Run

### From Backend Directory:
```bash
cd emirates-lease-flow/backend
node scripts/delete-all-tenants-leases.js
```

### What Happens:
1. ⏳ 10-second countdown (Ctrl+C to cancel)
2. 📊 Shows count of records to delete
3. 🗑️ Deletes in correct order (foreign keys respected)
4. ✅ Uses transaction (all-or-nothing)
5. 🔍 Verifies deletion
6. 📊 Shows summary

---

## Expected Output

```
⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️

You are about to DELETE ALL TENANTS, LEASES, and RELATED DATA!
This action CANNOT be undone!

Press Ctrl+C to cancel, or wait 10 seconds to continue...

⏳ Starting in 10 seconds... 
⏳ Starting in 9 seconds... 
...

🚀 Starting cleanup...

⚠️  🔥🔥🔥 COMPLETE TENANT & LEASE CLEANUP 🔥🔥🔥 ⚠️

This will delete ALL tenants, leases, and related data!

📊 Counting records to be deleted...

📋 Data to be deleted:
   Tenants: 800
   Leases: 357
   Invoices: 1500
   Payments: 3000
   Tickets: 250
   TOTAL RECORDS: 5907

🗑️  Starting deletion process...

   ✓ Deleted 3000 payment(s)
   ✓ Deleted 1500 invoice(s)
   ✓ Deleted 250 ticket(s)
   ✓ Deleted 357 lease(s)
   ✓ Deleted 800 tenant(s)

✅ Transaction committed successfully!

🔍 Verifying deletion...

📊 Remaining records:
   Tenants: 0
   Leases: 0
   Invoices: 0
   Payments: 0
   Tickets: 0

📊 Deletion Summary:
   ✓ Tenants deleted: 800
   ✓ Leases deleted: 357
   ✓ Invoices deleted: 1500
   ✓ Payments deleted: 3000
   ✓ Tickets deleted: 250
   ✓ TOTAL DELETED: 5907 records

✅ SUCCESS: All tenants and leases have been completely removed!

📌 Note: Properties and Units have been preserved.
```

---

## After Running

### What to Check:
1. ✓ Verify database tables are empty:
   ```sql
   SELECT COUNT(*) FROM tenants;    -- Should be 0
   SELECT COUNT(*) FROM leases;     -- Should be 0
   SELECT COUNT(*) FROM invoices;   -- Should be 0
   SELECT COUNT(*) FROM payments;   -- Should be 0
   SELECT COUNT(*) FROM tickets;    -- Should be 0
   ```

2. ✓ Verify properties/units are intact:
   ```sql
   SELECT COUNT(*) FROM properties;  -- Should have records
   SELECT COUNT(*) FROM units;       -- Should have records
   ```

### Frontend Cleanup:
- Clear browser cache
- Refresh the application
- Tenant list should be empty
- Lease list should be empty
- Properties and units should still be visible

---

## If Something Goes Wrong

### Transaction Failed?
- ✅ No data was deleted (transaction rollback)
- Check error message
- Fix the issue and try again

### Some Records Remain?
- Check for foreign key constraints
- Run this query to find orphaned records:
  ```sql
  SELECT * FROM tenants WHERE id NOT IN (SELECT DISTINCT tenant_id FROM leases WHERE tenant_id IS NOT NULL);
  ```

### Want to Restore?
- Use your database backup:
  ```bash
  mysql -u root -p Leasemanagement < backup_file.sql
  ```

---

## Alternative: Fresh Start

If you want to start completely fresh with sample data:

1. Run this cleanup script
2. Run database seeders (if available)
3. Or import fresh data via Excel import feature

---

## Recovery Options

### Option 1: Database Backup
```bash
mysql -u root -p Leasemanagement < your_backup.sql
```

### Option 2: Manual Re-entry
- Use the application to add tenants manually
- Import from Excel if you have export files

### Option 3: No Recovery
- If this is test/development data, just start fresh
- Create new tenants as needed

---

## Prevention

To avoid needing this in the future:

1. **Use Soft Deletes**
   - Add `deleted_at` column
   - Don't actually delete, just mark as deleted

2. **Regular Backups**
   - Automate daily backups
   - Keep at least 7 days of backups

3. **Test on Staging First**
   - Never run cleanup scripts on production first
   - Always test on development/staging

4. **Use Confirmation Flags**
   - Require explicit confirmation
   - Add `--confirm` flags to scripts

---

## Emergency Stop

If the script is running and you want to stop it:

1. **Press Ctrl+C** during the countdown (before it starts)
2. **Don't interrupt** once deletion starts (let transaction complete or fail)
3. **Check the database** after any interruption

---

**Created:** January 15, 2026  
**Script:** `backend/scripts/delete-all-tenants-leases.js`  
**Risk Level:** 🔴 CRITICAL - IRREVERSIBLE  
**Backup Required:** ✅ MANDATORY  
**Production Use:** ⚠️ EXTREME CAUTION
