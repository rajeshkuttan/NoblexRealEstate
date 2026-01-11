# 🧪 Testing Guide - Finance Module

**Date:** October 16, 2024  
**Status:** Ready for Testing  
**Servers:** Backend + Frontend Running

---

## 🚀 Server Status

### Backend Server:
- **URL:** http://localhost:3001
- **API Base:** http://localhost:3001/api
- **Status:** ✅ Should be running
- **Check:** http://localhost:3001/api/health

### Frontend Server:
- **URL:** http://localhost:5173 (or check console)
- **Status:** ✅ Should be running
- **Framework:** Vite + React

---

## 📝 Access Instructions

1. **Open your browser**
2. **Navigate to:** http://localhost:5173
3. **Login** (if required):
   - Email: demo@emirateslease.com
   - Password: (check your auth settings)
   - Or use demo mode if backend is unavailable

---

## 🎯 What to Test

### Phase 4.1: Vendor & AP Management
**URL:** `/vendors` (or add to navigation)

#### Test Vendor Management:
1. ✅ Click "Add Vendor" button
2. ✅ Fill in vendor form:
   - Vendor Name: "Test Supplier LLC"
   - Email: "test@supplier.com"
   - TRN: "123456789012345" (15 digits)
   - Payment Terms: Net 30
   - Bank Details (optional)
3. ✅ Save and verify it appears in the list
4. ✅ Click "View" to see vendor details
5. ✅ Click "Edit" to modify vendor
6. ✅ Test search and filters

#### Test Invoice Management:
1. ✅ Switch to "Invoices" tab
2. ✅ Click "New Invoice"
3. ✅ Fill in invoice form:
   - Select vendor
   - Add line items
   - Check auto-calculations (5% VAT)
4. ✅ Save invoice
5. ✅ Test invoice approval workflow:
   - Submit for approval
   - Approve/Reject with notes
6. ✅ Test filters (vendor, property, status)

#### Test AP Aging Report:
1. ✅ Switch to "AP Aging" tab
2. ✅ View aging buckets (Current, 30/60/90/90+ days)
3. ✅ Test filters (vendor, property)
4. ✅ Click "Export to Excel" button
5. ✅ Verify Excel file downloads with multiple sheets

---

### Phase 4.2: Treasury Management
**URL:** `/treasury` (or add to navigation)

#### Test Treasury Dashboard:
1. ✅ View cash position cards
2. ✅ Check multi-currency balances
3. ✅ Review bank account list
4. ✅ Check recent transactions
5. ✅ View reconciliation stats

#### Test Bank Accounts:
1. ✅ Switch to "Accounts" tab
2. ✅ Click "Add Account"
3. ✅ Fill in bank account details
4. ✅ Test search and filters

#### Test Bank Reconciliation:
1. ✅ Switch to "Reconciliation" tab
2. ✅ View reconciliation list
3. ✅ Click "Start Reconciliation"
4. ✅ Test filters (bank account, status)

#### Test Statement Import:
1. ✅ Switch to "Import" tab
2. ✅ Select bank account
3. ✅ Upload CSV/Excel file (or test with sample)
4. ✅ Review preview of transactions
5. ✅ Import valid transactions
6. ✅ Check import summary

#### Test Cash Flow Forecast:
1. ✅ Switch to "Forecast" tab
2. ✅ View 6-month projections
3. ✅ Check forecast accuracy
4. ✅ Test period filters
5. ✅ View saved forecasts

---

### Phase 4.3: Chart of Accounts
**URL:** `/chart-of-accounts` (or add to navigation)

#### Test Account Hierarchy:
1. ✅ View account tree structure
2. ✅ Expand/collapse account groups
3. ✅ Click "Add Account" for root level
4. ✅ Click "+" icon on account for child account
5. ✅ Test search functionality
6. ✅ View account details (click on account)
7. ✅ Edit account
8. ✅ Check account type badges
9. ✅ Verify tax category labels
10. ✅ Test reconcilable flag

---

### Phase 4.4: Budget Management
**URL:** `/budget` (or add to navigation)

#### Test Budget Variance:
1. ✅ View variance analysis
2. ✅ Check budget vs actual by category
3. ✅ Verify progress bars
4. ✅ Check over/under budget indicators
5. ✅ Test period and property filters
6. ✅ Click "Export Report"

#### Test Alert Settings:
1. ✅ Switch to "Alerts" tab
2. ✅ Set warning threshold (e.g., 75%)
3. ✅ Set critical threshold (e.g., 90%)
4. ✅ Configure alert frequency
5. ✅ Toggle notification channels
6. ✅ Add email recipients
7. ✅ Save settings

#### Test Approval Workflow:
1. ✅ Switch to "Approval" tab
2. ✅ View pending approvals
3. ✅ Add approval notes
4. ✅ Approve a request
5. ✅ Reject a request
6. ✅ View approval history

#### Test Templates:
1. ✅ Switch to "Templates" tab
2. ✅ View template list
3. ✅ Click "Use Template"
4. ✅ Edit template
5. ✅ Download template
6. ✅ Create new template

---

## 🐛 Common Issues & Solutions

### Backend Not Running:
```bash
cd "d:\Projects\Lease Management\emirates-lease-flow\backend"
npm run dev
```

### Frontend Not Running:
```bash
cd "d:\Projects\Lease Management\emirates-lease-flow"
npm run dev
```

### Port Already in Use:
- Backend: Change port in `backend/src/app.js` or `config.env`
- Frontend: Change port in `vite.config.ts`

### Database Connection Error:
- Check MySQL is running
- Verify credentials in `backend/config.env`
- Run migrations: `npm run migrate:run`
- Run seed data: `npm run seed:finance`

### API 404 Errors:
- Backend not running
- Check API_BASE_URL in frontend (`src/services/api.ts`)
- Verify route is registered in `backend/src/app.js`

### Authentication Issues:
- Use demo token (already configured in `authMiddleware.js`)
- Check localStorage for token
- Try demo mode

---

## 📊 Data to Test With

### Sample Vendors:
1. Emirates Building Supplies LLC
   - Email: info@ebs.ae
   - TRN: 100234567890123
   - Payment Terms: Net 30

2. Dubai Maintenance Co.
   - Email: contact@dubaimaint.ae
   - TRN: 100345678901234
   - Payment Terms: Net 45

### Sample Invoice:
- Vendor: Emirates Building Supplies LLC
- Line Items:
  1. Paint supplies - 50 units @ AED 100 = AED 5,000
  2. Hardware - 100 units @ AED 25 = AED 2,500
  3. Tools - 10 units @ AED 150 = AED 1,500
- Subtotal: AED 9,000
- VAT (5%): AED 450
- Total: AED 9,450

### Sample Bank Account:
- Bank Name: Emirates NBD
- Account Name: Emirates Lease Flow - Operations
- Account Number: 1234567890
- IBAN: AE070331234567890123456
- Currency: AED
- Current Balance: AED 500,000

---

## ✅ Success Criteria

### UI/UX:
- ✅ All pages load without errors
- ✅ Navigation works smoothly
- ✅ Forms validate properly
- ✅ Toast notifications appear
- ✅ Loading states show during API calls
- ✅ Empty states display when no data
- ✅ Mobile responsive (test on smaller screens)

### Functionality:
- ✅ CRUD operations work
- ✅ Search and filters function
- ✅ Pagination works
- ✅ Calculations are accurate (VAT, totals, variance)
- ✅ File uploads work (Excel/CSV)
- ✅ Excel exports download successfully
- ✅ Approval workflows function
- ✅ Multi-currency displays correctly

### Data:
- ✅ API calls return data
- ✅ Data displays in tables
- ✅ Details views show correct information
- ✅ Statistics are calculated correctly
- ✅ Filters affect data display

---

## 🎯 Priority Testing

### Must Test (Critical):
1. **AP Aging Report** - Critical business feature
2. **Vendor Invoice Creation** - Core workflow
3. **Bank Reconciliation** - Treasury management
4. **Budget Variance Analysis** - Financial control

### Should Test (Important):
1. Statement import
2. Cash flow forecast
3. Chart of accounts hierarchy
4. Budget approval workflow

### Nice to Test (Enhancement):
1. Alert settings
2. Budget templates
3. Account details tabs
4. Email notifications (if configured)

---

## 📸 Screenshot Checklist

Take screenshots of:
- ✅ Vendor list with data
- ✅ Invoice form with line items
- ✅ AP Aging Report with visual buckets
- ✅ Treasury Dashboard with cash position
- ✅ Chart of Accounts tree view
- ✅ Budget Variance Analysis
- ✅ Any errors or issues found

---

## 🐞 Bug Reporting

If you find issues, note:
1. **Page/Component:** Where did it occur?
2. **Action:** What were you doing?
3. **Expected:** What should happen?
4. **Actual:** What actually happened?
5. **Console Errors:** Any errors in browser console?
6. **Steps to Reproduce:** How to recreate the issue?

---

## 💡 Tips

- **Open Browser DevTools:** F12 to see console errors
- **Check Network Tab:** See API calls and responses
- **Use React DevTools:** Inspect component state
- **Test Mobile View:** Use browser responsive mode
- **Clear Cache:** If seeing old data or styling issues
- **Check Backend Logs:** Terminal where backend is running

---

## 🎉 Next Steps After Testing

1. **Report Results:** Let me know what works/doesn't work
2. **Fix Issues:** I'll fix any bugs found
3. **Continue to Phase 5:** Build Reports & Analytics
4. **Integration:** Connect all modules (Phase 6)
5. **Final Testing:** Comprehensive E2E tests

---

## 📞 Quick Commands

### Check if servers are running:
```bash
# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :5173
```

### Restart backend:
```bash
cd backend
npm run dev
```

### Restart frontend:
```bash
npm run dev
```

### Run migrations (if needed):
```bash
cd backend
npm run migrate:run
```

### Seed database (if needed):
```bash
cd backend
npm run seed
npm run seed:finance
```

---

**Happy Testing! 🚀**

Let me know what you find!

