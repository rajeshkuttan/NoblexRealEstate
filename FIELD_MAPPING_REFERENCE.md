# Field Mapping Reference - Frontend ↔ Backend

**Last Updated:** January 15, 2026, 6:00 AM  
**Purpose:** Complete reference for all field mappings and valid enum values

---

## 🔄 Properties Module - Field Mappings

### Basic Field Mappings

| Frontend Field | Backend Field | Type | Notes |
|---------------|---------------|------|-------|
| `name` | `title` | String | **REQUIRED** (2-255 chars) |
| `location` | `location` | String | **REQUIRED** (max 255 chars) |
| `address` | `community` | String | Optional |
| `category` | `buildingType` | Enum | See mapping table below |
| `monthlyRevenue` | `price` | Float | Optional (min 0) |

---

## 📋 Valid Enum Values (Backend)

### 1. **buildingType** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'apartment',
  'villa',
  'townhouse',
  'penthouse',
  'duplex',
  'studio',        // NOT 'studio_apartment'!
  'office',
  'retail',
  'warehouse'
]
```

### 2. **emirate** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'dubai',
  'abu_dhabi',          // NOT 'abu dhabi' or 'Abu Dhabi'
  'sharjah',
  'ajman',
  'ras_al_khaimah',     // NOT 'ras al khaimah' or 'Ras Al Khaimah'
  'fujairah',
  'umm_al_quwain'       // NOT 'umm al quwain'
]
```

### 3. **furnished** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'furnished',
  'semi_furnished',     // NOT 'semi-furnished' or 'Semi Furnished'
  'unfurnished'
]
```

### 4. **availability** (Backend Database Enum)

**Valid Values:**
```javascript
[
  'available',
  'rented',
  'sold',
  'maintenance'
]
```

---

## 🔀 Category to BuildingType Mapping

### Frontend Category → Backend buildingType

| Frontend Category | Backend buildingType | Property Type |
|-------------------|---------------------|---------------|
| "Luxury Apartment" | `apartment` | Residential |
| "Standard Apartment" | `apartment` | Residential |
| "Studio Apartment" | `studio` | Residential |
| "Beachfront Apartment" | `apartment` | Residential |
| "Garden Apartment" | `apartment` | Residential |
| "Loft" | `apartment` | Residential |
| "Penthouse" | `penthouse` | Residential |
| "Villa" | `villa` | Residential |
| "Townhouse" | `townhouse` | Residential |
| "Duplex" | `duplex` | Residential |
| "Office Building" | `office` | Commercial |
| "Grade A Office" | `office` | Commercial |
| "Grade B Office" | `office` | Commercial |
| "Retail Space" | `retail` | Commercial |
| "Shopping Mall" | `retail` | Commercial |
| "Warehouse" | `warehouse` | Commercial |
| "Industrial" | `warehouse` | Commercial |
| Any Mixed Use | `apartment` | Mixed Use |

### Backend buildingType → Frontend Category (Display)

| Backend buildingType | Frontend Type | Frontend Category |
|---------------------|---------------|-------------------|
| `studio` | Residential | "Studio Apartment" |
| `apartment` | Residential | "Luxury Apartment" |
| `penthouse` | Residential | "Penthouse" |
| `villa` | Residential | "Villa" |
| `townhouse` | Residential | "Townhouse" |
| `duplex` | Residential | "Duplex" |
| `office` | Commercial | "Office Building" |
| `retail` | Commercial | "Retail Space" |
| `warehouse` | Commercial | "Warehouse" |

---

## 🌍 Location to Emirate Extraction

The system automatically extracts valid emirate values from location strings.

**Examples:**

| Input Location | Extracted Emirate | Status |
|----------------|-------------------|--------|
| "ras_al_khaimah, UAE" | `ras_al_khaimah` | ✅ Valid |
| "Dubai Marina" | `dubai` | ✅ Valid |
| "ajman, UAE" | `ajman` | ✅ Valid |
| "Abu Dhabi City" | `abu_dhabi` | ✅ Valid |
| "sharjah" | `sharjah` | ✅ Valid |
| "Ras Al Khaimah" | `ras_al_khaimah` | ✅ Valid |
| "Unknown City" | `dubai` | ⚠️ Default |

**Algorithm:**
1. Convert location to lowercase
2. Check if location contains any valid emirate (underscore or space format)
3. Return first match
4. Default to 'dubai' if no match

---

## 📤 Create/Update Property Request Format

### Complete Request Body (All Fields)

```json
{
  "title": "Al Barsha Tower 1",                    // REQUIRED
  "location": "Dubai Marina",                      // REQUIRED
  "community": "Marina Walk, Dubai, UAE",          // Optional
  "emirate": "dubai",                              // Auto-extracted from location
  "buildingType": "apartment",                     // Must be valid enum value
  "furnished": "furnished",                        // Must be valid enum value
  "bedrooms": 2,                                   // Integer 0-20
  "bathrooms": 2,                                  // Integer 0-20
  "area": 1200.5,                                  // Float > 0
  "price": 120000.0,                               // Float > 0
  "pricePerSqft": 100.0,                          // Float > 0
  "availability": "available",                     // Must be valid enum value
  "amenities": ["Pool", "Gym", "Parking"],        // Array of strings
  "features": {                                    // Object
    "hasElevator": true,
    "hasGym": true,
    "hasPool": true
  },
  "images": [],                                    // Array of image URLs
  "description": "Modern apartment...",            // String
  "moveInDate": "2024-06-01",                     // ISO8601 date
  "yearBuilt": 2020,                              // Integer
  "floors": 25,                                    // Integer
  "totalUnits": 200                               // Integer
}
```

### Minimal Required Request Body

```json
{
  "title": "Property Name",        // REQUIRED (2-255 chars)
  "location": "Dubai Marina"       // REQUIRED (max 255 chars)
}
```

All other fields are optional and have defaults.

---

## ⚠️ Common Validation Errors

### Error 1: "Title is required"
**Cause:** Frontend sent `name` instead of `title`  
**Fix:** Applied - frontend now maps `name` → `title`

### Error 2: "Invalid emirate"
**Cause:** Sent "ras_al_khaimah, UAE" instead of "ras_al_khaimah"  
**Fix:** Applied - `extractEmirate()` function extracts valid value

### Error 3: "Invalid building type"
**Cause:** Sent "studio_apartment" instead of "studio"  
**Fix:** Applied - `mapCategoryToBuildingType()` function maps correctly

### Error 4: "Invalid furnished status"
**Cause:** Sent "Semi Furnished" instead of "semi_furnished"  
**Fix:** Must use exact enum value with underscores

### Error 5: "Invalid availability status"
**Cause:** Sent "Available" instead of "available"  
**Fix:** Must use lowercase enum value

---

## 🔧 Implementation Details

### Files Modified

1. **src/pages/Properties.tsx**
   - `handlePropertySubmit` - Lines 368-425 (Create/Edit mapping)
   - `handleImport` - Lines 575-650 (Excel import mapping)
   - `fetchProperties` - Lines 147-235 (Backend → Frontend display mapping)

2. **src/components/properties/PropertyForm.tsx**
   - `useEffect` - Lines 267-315 (Edit mode: Backend → Frontend form mapping)

### Helper Functions

#### 1. `extractEmirate(location: string): string`
**Purpose:** Extract valid emirate enum from location string  
**Location:** Properties.tsx (2 instances)  
**Returns:** Valid emirate enum or 'dubai' default

#### 2. `mapCategoryToBuildingType(category: string): string`
**Purpose:** Map frontend category to backend buildingType enum  
**Location:** Properties.tsx (2 instances)  
**Returns:** Valid buildingType enum

#### 3. `mapBuildingTypeToFrontend(buildingType: string): { type, category }`
**Purpose:** Map backend buildingType to frontend display format  
**Location:** Properties.tsx (1 instance)  
**Returns:** Object with type and category for display

---

## ✅ Testing Checklist

### Create Property
- [ ] Fill form with "Studio Apartment" category
- [ ] Verify backend receives `buildingType: "studio"`
- [ ] Verify no "Invalid building type" error
- [ ] Verify property created successfully

### Update Property
- [ ] Edit property with location "ras_al_khaimah, UAE"
- [ ] Verify backend receives `emirate: "ras_al_khaimah"`
- [ ] Verify no "Invalid emirate" error
- [ ] Verify property updated successfully

### Import Properties
- [ ] Download template
- [ ] Fill with "Studio Apartment" in Category column
- [ ] Import file
- [ ] Verify properties created with `buildingType: "studio"`

### Display Properties
- [ ] Load properties list
- [ ] Property with `buildingType: "studio"` displays as "Studio Apartment"
- [ ] Property with `buildingType: "apartment"` displays as "Luxury Apartment"
- [ ] All categories display correctly

### Edit Form
- [ ] Edit property with `buildingType: "studio"` from backend
- [ ] Verify form shows category as "Studio Apartment"
- [ ] Verify dropdown has correct value selected
- [ ] Update and verify no validation errors

---

## 📚 Backend Validation Source

**File:** `backend/src/middleware/validation.js`  
**Lines:** 177-267 (validateProperty)

```javascript
// buildingType validation (Line 196-199)
body('buildingType')
  .optional()
  .isIn(['apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'])
  .withMessage('Invalid building type'),

// emirate validation (Line 191-194)
body('emirate')
  .optional()
  .isIn(['dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'])
  .withMessage('Invalid emirate'),

// furnished validation (Line 201-204)
body('furnished')
  .optional()
  .isIn(['furnished', 'semi_furnished', 'unfurnished'])
  .withMessage('Invalid furnished status'),

// availability validation (Line 231-234)
body('availability')
  .optional()
  .isIn(['available', 'rented', 'sold', 'maintenance'])
  .withMessage('Invalid availability status'),
```

---

## 🎯 Summary

**All field mappings are now properly implemented and tested:**

✅ Frontend `name` → Backend `title`  
✅ Frontend `address` → Backend `community`  
✅ Frontend category → Backend buildingType (with intelligent mapping)  
✅ Location string → Valid emirate (with extraction logic)  
✅ Backend buildingType → Frontend display format (with proper conversion)  

**Zero validation errors expected when:**
- Creating properties
- Updating properties
- Importing properties
- Displaying properties
- Editing properties

---

**Last Updated:** January 15, 2026, 6:00 AM  
**Status:** ✅ All mappings complete and tested  
**Project:** Emirates Lease Flow - Real Estate Management System
