# Image Upload Guide - Properties & Units

## Where to Add Images for Properties and Units

---

## 🏢 Properties - Image Upload

### Location
**Properties Page → Create/Edit Property → Images Tab**

### Step-by-Step Instructions

#### 1. Navigate to Properties
- Go to the **Properties** page from the main navigation menu
- Click the **"+ Add Property"** button (top right) to create a new property
- OR click the **"⋮" menu** on an existing property card and select **"Edit"**

#### 2. Go to the Images Tab
- In the Property Form dialog, you'll see multiple tabs at the top:
  - Basic Info
  - Location & Details
  - **Images** ← Click here
  - Amenities
  - Financial Information
  - Property Features

#### 3. Upload Images
- In the **Images** tab, you'll see:
  ```
  ┌─────────────────────────────────────┐
  │    Property Images       [X Images] │
  ├─────────────────────────────────────┤
  │  ╔═══════════════════════════════╗  │
  │  ║        Upload Icon 📤         ║  │
  │  ║  Upload property images       ║  │
  │  ║  (JPG, PNG, max 10MB each)    ║  │
  │  ║  [Choose Files]               ║  │
  │  ╚═══════════════════════════════╝  │
  │                                     │
  │  [Image 1] [Image 2] [Image 3] ... │
  └─────────────────────────────────────┘
  ```

#### 4. Select Files
- Click the **"Choose Files"** button or drag-and-drop
- Select one or multiple images from your computer
- **Supported formats:** JPG, JPEG, PNG, WEBP, GIF
- **Maximum size:** 10MB per image
- **Multiple images:** Yes, you can upload multiple images at once

#### 5. Preview & Remove
- Uploaded images will appear below the upload area in a grid
- Each image shows a small preview (thumbnail)
- Click the **"X"** button on any image to remove it
- The badge at the top shows the count: "3 Images", "1 Image", etc.

#### 6. Save Property
- Scroll to the bottom of the form
- Click **"Create Property"** or **"Update Property"**
- Images will be saved with the property

---

## 🏘️ Units - Image Upload

### ✅ Status: AVAILABLE

**The Unit Form NOW has a dedicated image upload section, similar to Properties!**

#### Step-by-Step Instructions

##### 1. Navigate to Units
- Go to the **Units** page from the main navigation menu
- Click the **"+ Add Unit"** button (top right) to create a new unit
- OR click the **"⋮" menu** on an existing unit card and select **"Edit"**

##### 2. Go to the Images Tab
- In the Unit Form dialog, you'll see multiple tabs at the top:
  - Basic Info
  - Details
  - Amenities
  - **Images** ← Click here
  - Additional

##### 3. Upload Images
- In the **Images** tab, you'll see:
  ```
  ┌─────────────────────────────────────┐
  │    Unit Images          [X Images]  │
  ├─────────────────────────────────────┤
  │  ╔═══════════════════════════════╗  │
  │  ║        Upload Icon 📤         ║  │
  │  ║  Upload unit images           ║  │
  │  ║  (JPG, PNG, max 10MB each)    ║  │
  │  ║  [Choose Files]               ║  │
  │  ╚═══════════════════════════════╝  │
  │                                     │
  │  [Image 1] [Image 2] [Image 3] ... │
  └─────────────────────────────────────┘
  ```

##### 4. Select Files
- Click the **"Choose Files"** button or drag-and-drop
- Select one or multiple images from your computer
- **Supported formats:** JPG, JPEG, PNG, WEBP, GIF
- **Maximum size:** 10MB per image
- **Multiple images:** Yes, you can upload multiple images at once

##### 5. Preview & Remove
- Uploaded images will appear below the upload area in a grid
- Each image shows a small preview (thumbnail)
- Click the **"X"** button on any image to remove it
- The badge shows the count: "3 Images", "1 Image", etc.

##### 6. Save Unit
- Scroll to the bottom of the form
- Click **"Create Unit"** or **"Update Unit"**
- Images will be saved with the unit

---

## 📝 Technical Details

### Property Image Storage

**Frontend:**
- File: `src/components/properties/PropertyForm.tsx`
- Lines: 740-786 (Images Tab section)
- State: `uploadedImages` (array of image URLs)
- Handler: `handleImageUpload()` function (line 425)

**Data Flow:**
1. User selects files from their computer
2. Files are converted to blob URLs using `URL.createObjectURL()`
3. URLs are stored in the `uploadedImages` state
4. On form submit, the images array is passed to the backend
5. Backend should save these to cloud storage (AWS S3, Cloudinary, etc.)

**Backend:**
- Model: `backend/src/models/Property.js`
- Field: `images` (DataTypes.JSON)
- Currently stores as JSON array of URLs

### Current Backend Image Field Structure

**Property Model:**
```javascript
images: {
  type: DataTypes.JSON,
  allowNull: true
}
```

**Expected format:**
```json
[
  "https://storage.example.com/property-1-image-1.jpg",
  "https://storage.example.com/property-1-image-2.jpg",
  "https://storage.example.com/property-1-image-3.jpg"
]
```

### Unit Image Field

**Unit Model:**
```javascript
images: {
  type: DataTypes.JSON,
  allowNull: true
}
```

**Current Status:** Field exists in the backend, but NO UI for upload in the frontend.

---

## 🎯 Quick Reference

| Feature | Properties | Units |
|---------|-----------|-------|
| **Image Upload UI** | ✅ Yes (Images Tab) | ✅ Yes (Images Tab) |
| **Backend Field** | ✅ `images` (JSON) | ✅ `images` (JSON) |
| **Multiple Images** | ✅ Yes | ✅ Yes |
| **Preview** | ✅ Yes | ✅ Yes |
| **Remove Images** | ✅ Yes | ✅ Yes |
| **File Formats** | JPG, PNG, WEBP, GIF | JPG, PNG, WEBP, GIF |
| **Max File Size** | 10MB per image | 10MB per image |

---

## 🚀 Recommended Improvements

### 1. Implement Cloud Storage
Currently, images are stored as blob URLs (temporary). Implement proper cloud storage:
- **AWS S3** - Most popular, scalable
- **Cloudinary** - Image optimization built-in
- **Azure Blob Storage** - Good for Microsoft stack
- **Google Cloud Storage** - Good for Google stack

### 2. Image Optimization
Add automatic image optimization:
- Resize large images (max 1920x1080 for web)
- Compress images (reduce file size without quality loss)
- Generate thumbnails (for listings/cards)
- Lazy loading for better performance

### 3. Image Management
Add better image management features:
- Set primary/featured image
- Reorder images (drag-and-drop)
- Add captions/descriptions
- Image gallery view
- Zoom on click

---

## 💡 Common Questions

### Q: Where are the images stored?
**A:** Currently, images are stored as blob URLs in the browser's memory and should be uploaded to a cloud storage service (like AWS S3) when the form is submitted. The database stores the URLs pointing to these cloud-hosted images.

### Q: Can I upload videos?
**A:** Currently, only images are supported. The file input accepts `image/*` types only. Video upload would need to be implemented separately.

### Q: How many images can I upload?
**A:** There's no hard limit in the UI, but it's recommended to keep it reasonable (5-10 images per property) for performance reasons.

### Q: How do I upload images for Units?
**A:** The Unit Form now has an **Images** tab (4th tab) with full image upload functionality, just like Properties. Click the Images tab, upload your images, and they'll be saved with the unit.

### Q: What happens to images when I delete a property?
**A:** The property record and its image URLs are deleted from the database. However, the actual image files in cloud storage should be cleaned up separately (garbage collection).

---

## 🛠️ Need Help?

### To Add Images for Properties:
1. Go to **Properties** page
2. Click **+ Add Property** or **Edit** existing property
3. Click **Images** tab
4. Click **Choose Files** or drag-and-drop
5. Click **Create/Update Property**

### To Add Images for Units:
1. Go to **Units** page
2. Click **+ Add Unit** or **Edit** existing unit
3. Click **Images** tab (4th tab)
4. Click **Choose Files** or drag-and-drop
5. Click **Create/Update Unit**

---

## 📋 Summary

### Properties Images: ✅ AVAILABLE
- **Where:** Properties → Create/Edit → **Images Tab**
- **How:** Click "Choose Files" button
- **Formats:** JPG, PNG, WEBP, GIF
- **Max Size:** 10MB per image
- **Multiple:** Yes

### Units Images: ✅ AVAILABLE
- **Where:** Units → Create/Edit → **Images Tab**
- **How:** Click "Choose Files" button
- **Formats:** JPG, PNG, WEBP, GIF
- **Max Size:** 10MB per image
- **Multiple:** Yes

---

**Last Updated:** January 15, 2026 - 5:30 AM

### ✨ Recent Update
Image upload functionality has been added to the Units form! Units now have the same image upload capabilities as Properties, including:
- Dedicated Images tab in the Unit Form
- Multiple image uploads
- Preview thumbnails in a grid layout
- Remove individual images with X button
- Image count badge on the tab
- Full integration with form submission
