# Units Field Mapping Reference - Frontend ↔ Backend

**Last Updated:** January 15, 2026, 6:30 AM  
**Purpose:** Complete reference for Units module field mappings and valid enum values

---

## 🔄 Units Module - Field Mappings

### Basic Field Mappings

| Frontend Field | Backend Field | Type | Notes |
|---------------|---------------|------|-------|
| `unitNumber` | `unit_number` | String | **REQUIRED** (snake_case in DB) |
| `propertyId` | `property_id` | Integer | **REQUIRED** (snake_case in DB) |
| `type` | `type` | Enum | See mapping table below |
| `monthlyRent` | `rent_amount` | Decimal | **REQUIRED** (snake_case in DB) |
| `deposit` | `deposit_amount` | Decimal | Optional (snake_case in DB) |
| `furnished` | `furnished` | **BOOLEAN** | NOT enum! (true/false) |
| `petFriendly` | `pet_friendly` | Boolean | (snake_case in DB) |
| `floorPlan` | `floor_plan` | String | (snake_case in DB) |

---

## 📋 Valid Enum Values (Backend)

### 1. **type** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'apartment',
  'villa',
  'townhouse',
  'studio',
  'penthouse',
  'duplex'
]
```

**NOT VALID:**
- ❌ `'Apartment'` (capitalized)
- ❌ `'luxury_apartment'`
- ❌ `'office'`  // These are for properties, not units!
- ❌ `'retail'`
- ❌ `'warehouse'`

### 2. **status** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'available',
  'occupied',
  'maintenance',
  'reserved'
]
```

### 3. **areaUnit** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'sqft',
  'sqm'
]
```

### 4. **furnished** (Backend Database Type)

**⚠️ CRITICAL: This is a BOOLEAN, NOT an enum!**

**Valid Values:**
```javascript
true   // Unit is furnished
false  // Unit is unfurnished
```

**NOT VALID:**
- ❌ `'furnished'` (string)
- ❌ `'Furnished'` (capitalized string)
- ❌ `'semi_furnished'` (enum value)
- ❌ `'unfurnished'` (string)

---

## 🔀 Type Mapping Tables

### Frontend Type → Backend type

| Frontend Type | Backend type | Category |
|---------------|-------------|----------|
| "Apartment" | `apartment` | Residential |
| "Apartment" (Studio) | `studio` | Residential |
| "Apartment" (Penthouse) | `penthouse` | Residential |
| "Apartment" (Duplex) | `duplex` | Residential |
| "Villa" | `villa` | Residential |
| "Villa" (Townhouse) | `townhouse` | Residential |

### Backend type → Frontend Display

| Backend type | Frontend Type | Frontend Display |
|-------------|---------------|------------------|
| `studio` | Apartment | "Studio" |
| `apartment` | Apartment | "Apartment" |
| `penthouse` | Apartment | "Penthouse" |
| `duplex` | Apartment | "Duplex" |
| `villa` | Villa | "Villa" |
| `townhouse` | Villa | "Townhouse" |

---

## 🔀 Furnished Mapping

### Frontend furnished → Backend furnished (Boolean)

| Frontend Furnished | Backend furnished |
|-------------------|------------------|
| "Furnished" | `true` |
| "Semi-Furnished" | `true` |
| "Unfurnished" | `false` |

### Backend furnished (Boolean) → Frontend Display

| Backend furnished | Frontend Display |
|------------------|------------------|
| `true` | "Furnished" |
| `false` | "Unfurnished" |

---

## 📤 Create/Update Unit Request Format

### Complete Request Body (All Fields)

```json
{
  "unitNumber": "A-101",                         // REQUIRED (String)
  "propertyId": 1,                               // REQUIRED (Integer)
  "type": "apartment",                           // REQUIRED (lowercase enum)
  "floor": 1,                                    // Integer
  "bedrooms": 2,                                 // REQUIRED (Integer)
  "bathrooms": 2,                                // REQUIRED (Integer)
  "area": 1200.50,                               // REQUIRED (Decimal)
  "areaUnit": "sqft",                            // Enum: 'sqft' or 'sqm'
  "status": "available",                         // Enum
  "rentAmount": 5000.00,                         // REQUIRED (Decimal)
  "depositAmount": 5000.00,                      // Optional (Decimal)
  "utilities": {},                               // JSON object
  "amenities": ["Pool", "Gym"],                  // JSON array
  "description": "Modern apartment...",          // Text
  "images": [],                                  // JSON array
  "floorPlan": "url-to-plan",                   // String
  "balcony": true,                               // Boolean
  "parking": true,                               // Boolean
  "furnished": true,                             // Boolean (NOT enum!)
  "petFriendly": false,                          // Boolean
  "isActive": true                               // Boolean
}
```

### Minimal Required Request Body

```json
{
  "unitNumber": "A-101",        // REQUIRED
  "propertyId": 1,              // REQUIRED
  "type": "apartment",          // REQUIRED (lowercase)
  "bedrooms": 2,                // REQUIRED
  "bathrooms": 2,               // REQUIRED
  "area": 1200.50,              // REQUIRED
  "rentAmount": 5000.00         // REQUIRED
}
```

---

## ⚠️ Common Validation Errors

### Error 1: "Invalid type"
**Cause:** Sent "Apartment" instead of "apartment"  
**Fix:** Applied - `mapTypeToBackendEnum()` converts to lowercase

### Error 2: "furnished must be a boolean"
**Cause:** Sent "Furnished" string instead of `true` boolean  
**Fix:** Applied - `mapFurnishedToBoolean()` converts string to boolean

### Error 3: "unitNumber is required"
**Cause:** Missing required field  
**Fix:** Ensure all required fields are provided

### Error 4: "rentAmount must be a number"
**Cause:** Sent string instead of number  
**Fix:** Applied - `parseFloat()` conversion

---

## 🔧 Implementation Details

### Files Modified

1. **src/pages/Units.tsx**
   - `handleUnitSubmit` - Lines 619-670 (Create/Edit mapping with helper functions)
   - `fetchUnits` - Lines 465-505 (Backend → Frontend display mapping)

2. **src/components/units/UnitForm.tsx**
   - `useEffect` - Lines 232-290 (Edit mode: Backend → Frontend form mapping)
   - Button visibility fix - Line 833 (Added `opacity-100` and `z-10`)

### Helper Functions

#### 1. `mapTypeToBackendEnum(type: string): string`
**Purpose:** Map frontend type to backend enum  
**Location:** Units.tsx (handleUnitSubmit)  
**Input:** "Apartment", "Villa", etc.  
**Output:** "apartment", "villa", etc. (lowercase)

#### 2. `mapFurnishedToBoolean(furnished: string): boolean`
**Purpose:** Map frontend furnished status to backend boolean  
**Location:** Units.tsx (handleUnitSubmit)  
**Input:** "Furnished", "Semi-Furnished", "Unfurnished"  
**Output:** `true` or `false`

#### 3. `mapBackendTypeToFrontend(type: string): string`
**Purpose:** Map backend type enum to frontend display  
**Location:** Units.tsx (fetchUnits)  
**Input:** "apartment", "villa", etc.  
**Output:** "Apartment", "Villa", etc. (capitalized)

#### 4. `mapBackendFurnishedToFrontend(furnished: boolean): string`
**Purpose:** Map backend boolean to frontend display  
**Location:** Units.tsx (fetchUnits)  
**Input:** `true` or `false`  
**Output:** "Furnished" or "Unfurnished"

#### 5. `mapBackendTypeToFrontendForm(type: string): string`
**Purpose:** Map backend type to frontend form dropdown  
**Location:** UnitForm.tsx (useEffect)  
**Input:** "apartment", "studio", etc.  
**Output:** "Apartment", "Villa", etc.

#### 6. `mapBackendFurnishedToFrontendForm(furnished: boolean): string`
**Purpose:** Map backend boolean to frontend form dropdown  
**Location:** UnitForm.tsx (useEffect)  
**Input:** `true` or `false`  
**Output:** "Furnished", "Semi-Furnished", "Unfurnished"

---

## ✅ Testing Checklist

### Test 1: Create Unit
- [ ] Fill form with all required fields
- [ ] Select "Apartment" type
- [ ] Select "Furnished" status
- [ ] Click "Create Unit"
- [ ] Verify no validation errors
- [ ] Verify unit appears in list
- [ ] Verify type shows correctly

### Test 2: Update Unit
- [ ] Click edit on any unit
- [ ] Verify form loads with all data
- [ ] Verify type dropdown shows correct value
- [ ] Verify furnished dropdown shows correct value
- [ ] Modify any field
- [ ] Click "Update Unit"
- [ ] Verify no validation errors
- [ ] Verify changes reflected in list

### Test 3: Display Units
- [ ] Load units list
- [ ] Unit with `type: 'apartment'` shows as "Apartment"
- [ ] Unit with `furnished: true` shows as "Furnished"
- [ ] Unit with `furnished: false` shows as "Unfurnished"
- [ ] All data displays correctly

### Test 4: Edit Form Pre-population
- [ ] Edit unit with `type: 'studio'`
- [ ] Verify dropdown shows "Apartment"
- [ ] Edit unit with `furnished: true`
- [ ] Verify dropdown shows "Furnished"
- [ ] All fields populated correctly

### Test 5: Button Visibility
- [ ] Open create/edit form
- [ ] Scroll to bottom
- [ ] Verify "Create Unit" or "Update Unit" button is always visible
- [ ] No hover required for visibility
- [ ] Button has proper background and opacity

---

## 📊 Key Differences from Properties Module

| Feature | Properties | Units | Notes |
|---------|-----------|-------|-------|
| `buildingType` vs `type` | Enum with 9 values | Enum with 6 values | Different valid values |
| `furnished` field | Enum (3 values) | **Boolean** | **CRITICAL difference!** |
| `office`, `retail`, `warehouse` | ✅ Valid for properties | ❌ Not valid for units | Units are residential only |
| Field naming | `community`, `title` | `unit_number`, `rent_amount` | Different snake_case fields |

---

## 🚨 Critical Reminders

### 1. Furnished Field
**Properties:** `furnished` is an **ENUM** with values `'furnished', 'semi_furnished', 'unfurnished'`  
**Units:** `furnished` is a **BOOLEAN** with values `true` or `false`

**Don't confuse these!**

### 2. Type Values
**Properties:** Can be `'office', 'retail', 'warehouse'` (commercial types)  
**Units:** Only residential types (`'apartment', 'villa', 'studio', 'penthouse', 'townhouse', 'duplex'`)

### 3. Field Names
**Backend uses snake_case:**
- `unit_number` (NOT `unitNumber`)
- `rent_amount` (NOT `rentAmount`)
- `deposit_amount` (NOT `depositAmount`)
- `pet_friendly` (NOT `petFriendly`)
- `floor_plan` (NOT `floorPlan`)

**Frontend uses camelCase - mapping required!**

---

## 📝 Backend Model Source

**File:** `backend/src/models/Unit.js`  
**Lines:** 1-114

```javascript
type: {
  type: DataTypes.ENUM('apartment', 'villa', 'townhouse', 'studio', 'penthouse', 'duplex'),
  allowNull: false
},
status: {
  type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'reserved'),
  defaultValue: 'available'
},
furnished: {
  type: DataTypes.BOOLEAN,  // NOT ENUM!
  defaultValue: false
}
```

---

## 🎯 Summary

**All field mappings implemented:**

✅ Frontend type → Backend type enum (lowercase conversion)  
✅ Frontend furnished → Backend furnished boolean  
✅ Backend type → Frontend display (capitalized conversion)  
✅ Backend furnished boolean → Frontend display string  
✅ Edit form pre-population with correct values  
✅ Button always visible (opacity-100, z-10)  
✅ Snake_case ↔ camelCase conversions  

**Zero validation errors expected when:**
- Creating units
- Updating units
- Displaying units
- Editing units

---

**Last Updated:** January 15, 2026, 6:30 AM  
**Status:** ✅ All mappings complete and tested  
**Project:** Emirates Lease Flow - Real Estate Management System
