# 🐛 Lease Creation 400 Bad Request Error - Fix

**Date:** January 15, 2026  
**Status:** ✅ FIXED  
**Error:** `POST http://localhost:5002/api/leases 400 (Bad Request)`

---

## 🎯 Problem

When trying to create a new lease through the "Create New Lease Agreement" form, the API returned a **400 Bad Request** error with no specific validation message.

### Error Details:
```
POST http://localhost:5002/api/leases 400 (Bad Request)
Error saving lease: AxiosError
```

---

## 🔍 Root Cause Analysis

### Issue 1: Data Structure Mismatch

The frontend `LeaseForm` was sending a deeply nested object structure:
```typescript
{
  tenant: {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    // ... more fields
  },
  property: {
    name: "Marina Tower",
    unit: "305",  // ❌ Unit NUMBER, not ID!
    address: "Dubai Marina",
    // ... more fields
  },
  leaseDetails: {
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    monthlyRent: 65000,
    securityDeposit: 130000,
    // ... more fields
  }
}
```

**But the backend `Lease` model expected:**
```typescript
{
  tenantId: 1,        // ✅ Integer ID
  unitId: 25,         // ✅ Integer ID, not unit number!
  startDate: "2024-01-01",
  endDate: "2025-01-01",
  rentAmount: 65000,  // ✅ Note: rentAmount, not monthlyRent
  depositAmount: 130000,
  paymentDay: 1,
  paymentFrequency: "monthly"
  // ... flat structure
}
```

### Issue 2: Unit Number vs Unit ID

The form was storing the **unit number** (e.g., "305") in `property.unit` instead of the **unit ID** (e.g., 25).

**Problem in LeaseForm.tsx (Line 1304):**
```typescript
setValue("property.unit", unit.unit); // ❌ Storing unit number "305"
```

**The backend needs:**
```typescript
unitId: 25  // ✅ Database ID for the unit
```

### Issue 3: Missing Field Mappings

Multiple field name mismatches:
- `monthlyRent` → `rentAmount`
- `securityDeposit` → `depositAmount`
- `paymentTerms` → `paymentFrequency`
- Nested `leaseDetails` → Flat structure

---

## ✅ Solution Implemented

### 1. Data Transformation Layer in `Leases.tsx`

Added a comprehensive transformation function in `handleLeaseSubmit`:

```typescript
const handleLeaseSubmit = async (data: any) => {
  console.log("📋 Raw form data:", data);
  
  // Extract tenant ID - multiple formats supported
  let tenantId = null;
  if (data.tenant?.id) {
    tenantId = parseInt(data.tenant.id);
  } else if (data.tenantId) {
    tenantId = parseInt(data.tenantId);
  }
  
  // Extract unit ID - multiple formats supported
  let unitId = null;
  if (data.unitId) {
    unitId = parseInt(data.unitId);
  } else if (data.property?.unitId) {
    unitId = parseInt(data.property.unitId);
  } else if (typeof data.property?.unit === 'number') {
    unitId = data.property.unit;
  }
  
  // Transform to backend format
  const backendData = {
    tenantId,
    unitId,
    startDate: data.leaseDetails?.startDate,
    endDate: data.leaseDetails?.endDate,
    rentAmount: parseFloat(data.leaseDetails?.monthlyRent) || 0,
    depositAmount: parseFloat(data.leaseDetails?.securityDeposit) || 0,
    paymentDay: new Date(data.leaseDetails?.startDate).getDate(),
    paymentFrequency: (data.leaseDetails?.paymentTerms || 'monthly').toLowerCase(),
    status: data.status || 'draft',
    terms: data.leaseDetails?.renewalTerms || '',
    specialConditions: Array.isArray(data.specialTerms) 
      ? data.specialTerms.join('; ') 
      : '',
    // ... all other fields
  };
  
  console.log("🔄 Transformed backend data:", backendData);
  
  // Validation before sending
  if (!backendData.tenantId) {
    toast.error("Please select a tenant");
    return;
  }
  if (!backendData.unitId) {
    toast.error("Please select a property unit");
    return;
  }
  // ... more validations
  
  await leasesAPI.create(backendData);
};
```

### 2. Store Unit ID in LeaseForm

Updated `LeaseForm.tsx` to store unit ID when a unit is selected:

**Before (Line 1299-1312):**
```typescript
onValueChange={(value) => {
  const unit = availableUnits.find(u => u.id.toString() === value);
  if (unit) {
    setSelectedUnit(unit);
    setValue("property.unit", unit.unit); // ❌ Only unit number
    setValue("property.area", unit.area);
    // ...
  }
}}
```

**After:**
```typescript
onValueChange={(value) => {
  const unit = availableUnits.find(u => u.id.toString() === value);
  if (unit) {
    setSelectedUnit(unit);
    setValue("unitId", unit.id);              // ✅ Store unit ID at top level
    setValue("property.unit", unit.unit);     // For display
    setValue("property.unitId", unit.id);     // ✅ Also in property object
    setValue("property.area", unit.area);
    // ...
  }
}}
```

### 3. Store Tenant ID at Top Level

Updated tenant selection to also store `tenantId` at the top level:

**Updated (Line 924-928):**
```typescript
onValueChange={(value) => {
  const selectedTenant = tenants.find(t => t.id.toString() === value);
  if (selectedTenant) {
    setValue("tenantId", selectedTenant.id);  // ✅ Store at top level
    setValue("tenant", {
      id: selectedTenant.id,
      name: selectedTenant.name,
      // ...
    });
  }
}}
```

---

## 📋 Field Mapping Reference

### Frontend → Backend Mappings

| Frontend Field | Backend Field | Type | Required |
|---------------|---------------|------|----------|
| `tenant.id` or `tenantId` | `tenantId` | Integer | ✅ Yes |
| `unitId` or `property.unitId` | `unitId` | Integer | ✅ Yes |
| `leaseDetails.startDate` | `startDate` | DATEONLY | ✅ Yes |
| `leaseDetails.endDate` | `endDate` | DATEONLY | ✅ Yes |
| `leaseDetails.monthlyRent` | `rentAmount` | Decimal | ✅ Yes |
| `leaseDetails.securityDeposit` | `depositAmount` | Decimal | ✅ Yes |
| `leaseDetails.paymentTerms` | `paymentFrequency` | ENUM | No (defaults to 'monthly') |
| Auto-calculated from startDate | `paymentDay` | Integer | ✅ Yes |
| `status` | `status` | ENUM | No (defaults to 'draft') |
| `leaseDetails.renewalTerms` | `terms` | TEXT | No |
| `specialTerms` (array) | `specialConditions` | TEXT | No (joined with '; ') |
| `attachments` or `documents` | `documents` | JSON | No |
| `signedDate` | `signedDate` | DATE | No |
| `signedBy` | `signedBy` | String(100) | No |
| `witness1` | `witness1` | String(100) | No |
| `witness2` | `witness2` | String(100) | No |
| `isActive` | `isActive` | Boolean | No (defaults to true) |

### Backend ENUM Values

**paymentFrequency:**
- `'monthly'`
- `'quarterly'`
- `'semi-annually'`
- `'annually'`

**status:**
- `'draft'` (default)
- `'active'`
- `'expired'`
- `'terminated'`
- `'renewed'`

**renewalUnit:**
- `'months'`
- `'years'`

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│          User Fills Lease Form                               │
│  - Selects Tenant (stores tenant.id + tenantId)            │
│  - Selects Property & Unit (stores unit.id + unitId)       │
│  - Enters Financial Details (leaseDetails.*)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│          Form Submission (onFormSubmit)                      │
│  - Calls onSubmit(formData) with nested structure          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│       handleLeaseSubmit in Leases.tsx                       │
│  1. Logs raw form data for debugging                        │
│  2. Extracts tenantId from multiple possible locations      │
│  3. Extracts unitId from multiple possible locations        │
│  4. Transforms nested structure to flat backend format      │
│  5. Maps field names (monthlyRent → rentAmount)            │
│  6. Validates required fields                               │
│  7. Logs transformed data                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│       leasesAPI.create(backendData)                         │
│  POST /api/leases with flat structure                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│       Backend leaseController.createLease                    │
│  1. Generates lease number (L-2024-001)                     │
│  2. Creates lease in database                               │
│  3. Auto-generates invoices if status='active'              │
│  4. Records expected revenue                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│       ✅ Success Response                                    │
│  - Lease created in database                                │
│  - Toast notification shown                                 │
│  - Leases list refreshed                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Case 1: Create Lease with All Required Fields
1. Open "Create New Lease Agreement" form
2. **Tenant Tab:** Select existing tenant
3. **Property Tab:** Select property and unit
4. **Financial Tab:** 
   - Enter Monthly Rent: 65000
   - Auto-filled values appear
5. **Submit Form**

**Expected:**
- ✅ Console shows: `📋 Raw form data: {...}`
- ✅ Console shows: `🔄 Transformed backend data: {...}`
- ✅ POST succeeds with 201 Created
- ✅ Toast: "Lease created successfully"
- ✅ Form closes and list refreshes

### Test Case 2: Validation - Missing Tenant
1. Open form
2. Skip tenant selection
3. Fill property and financial details
4. Submit

**Expected:**
- ❌ Toast: "Please select a tenant"
- Form stays open

### Test Case 3: Validation - Missing Unit
1. Open form
2. Select tenant
3. Skip property/unit selection
4. Submit

**Expected:**
- ❌ Toast: "Please select a property unit"
- Form stays open

### Test Case 4: Validation - Invalid Rent Amount
1. Open form
2. Fill tenant and property
3. Leave Monthly Rent as 0 or empty
4. Submit

**Expected:**
- ❌ Toast: "Please enter a valid rent amount"
- Form stays open

---

## 🐛 Debugging Tips

### Check Console Logs

When submitting a lease, you should see:
```
📋 Raw form data: {
  tenant: { id: 1, name: "John Doe", ... },
  tenantId: 1,
  property: { unit: "305", unitId: 25, ... },
  unitId: 25,
  leaseDetails: { monthlyRent: 65000, ... }
}

🔄 Transformed backend data: {
  tenantId: 1,
  unitId: 25,
  startDate: "2024-01-01",
  endDate: "2025-01-01",
  rentAmount: 65000,
  depositAmount: 130000,
  paymentDay: 1,
  paymentFrequency: "monthly",
  ...
}
```

### Common Issues

**❌ Issue: `tenantId is null`**
- **Cause:** Tenant not selected or ID not stored
- **Fix:** Ensure tenant is selected from dropdown

**❌ Issue: `unitId is null`**
- **Cause:** Unit not selected or only unit number stored
- **Fix:** Ensure unit is selected from dropdown (not manual entry)

**❌ Issue: `rentAmount is 0`**
- **Cause:** Monthly rent not entered
- **Fix:** Enter value in Financial tab

**❌ Issue: `Invalid ENUM value for paymentFrequency`**
- **Cause:** Frontend sending "Monthly" but backend expects "monthly"
- **Fix:** Transform now uses `.toLowerCase()`

---

## 📄 Files Modified

### `src/pages/Leases.tsx`
- **Function:** `handleLeaseSubmit` (Lines 672-748)
- **Changes:**
  1. Added tenantId/unitId extraction logic
  2. Added complete field transformation
  3. Added field name mappings
  4. Added comprehensive validation
  5. Added debug console logging
  6. Added user-friendly error messages

### `src/components/leases/LeaseForm.tsx`
- **Line 925:** Added `setValue("tenantId", selectedTenant.id)`
- **Line 1301:** Added `setValue("unitId", unit.id)`
- **Line 1303:** Added `setValue("property.unitId", unit.id)`

---

## ✅ Result

**Lease creation now works successfully!**

- ✅ Proper field mapping between frontend and backend
- ✅ Tenant ID and Unit ID correctly extracted
- ✅ All required fields validated before submission
- ✅ User-friendly error messages
- ✅ Console logging for debugging
- ✅ Data transformation handles multiple formats

---

## 🔮 Future Improvements

1. **Add Backend Validation Middleware:**
   - Create `validateLease` in `backend/src/middleware/validation.js`
   - Return specific field-level errors

2. **Better Error Messages:**
   - Parse backend validation errors
   - Show field-specific errors in form

3. **Form Schema Alignment:**
   - Update frontend schema to match backend exactly
   - Eliminate need for transformation layer

4. **TypeScript Types:**
   - Create shared types between frontend and backend
   - Ensure compile-time type safety

5. **API Documentation:**
   - Document exact payload structure
   - Provide example requests/responses

---

**Fix Completed:** January 15, 2026  
**Status:** ✅ Production Ready  
**Testing:** ✅ All test cases passed
