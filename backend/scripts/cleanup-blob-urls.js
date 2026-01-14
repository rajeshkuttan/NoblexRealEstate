const path = require('path');
const fs = require('fs');

// Load environment variables
const nodeEnv = process.env.NODE_ENV || 'development';
const dotenvPath = path.join(__dirname, '../.env');
const productionConfigPath = path.join(__dirname, '../config.production.env');
const devConfigPath = path.join(__dirname, '../config.env');

let configPath;
if (fs.existsSync(dotenvPath)) {
  configPath = dotenvPath;
} else if (nodeEnv === 'production' && fs.existsSync(productionConfigPath)) {
  configPath = productionConfigPath;
} else {
  configPath = devConfigPath;
}

require('dotenv').config({ path: configPath });
console.log(`✅ Loading configuration from: ${path.basename(configPath)} (NODE_ENV: ${nodeEnv})`);

const { Property, Unit } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function cleanupBlobUrls() {
  console.log('\n🧹 Blob URL Cleanup Script');
  console.log('==========================\n');
  console.log('This script will remove invalid blob: URLs from image fields.');
  console.log('Blob URLs are temporary and cause ERR_FILE_NOT_FOUND errors.\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    let propertiesUpdated = 0;
    let unitsUpdated = 0;

    // Clean up Properties
    console.log('🔍 Checking properties for blob URLs...');
    const properties = await Property.findAll();
    
    for (const property of properties) {
      if (property.images) {
        let images = property.images;
        
        // Parse if it's a JSON string
        if (typeof images === 'string') {
          try {
            images = JSON.parse(images);
          } catch (e) {
            console.log(`⚠️  Property ${property.id} (${property.title}) has invalid images format`);
            continue;
          }
        }
        
        // Check if it's an array
        if (Array.isArray(images)) {
          // Filter out blob URLs
          const cleanedImages = images.filter(img => {
            if (typeof img === 'string' && img.startsWith('blob:')) {
              return false; // Remove blob URLs
            }
            return true; // Keep valid images (base64, http, https)
          });
          
          // Update if we removed any blob URLs
          if (cleanedImages.length < images.length) {
            const removed = images.length - cleanedImages.length;
            await property.update({ images: cleanedImages });
            console.log(`   ✓ Property ${property.id} "${property.title}": Removed ${removed} blob URL(s), kept ${cleanedImages.length} valid image(s)`);
            propertiesUpdated++;
          } else {
            console.log(`   ✓ Property ${property.id} "${property.title}": No blob URLs found (${images.length} valid images)`);
          }
        }
      }
    }

    console.log('');
    
    // Clean up Units
    console.log('🔍 Checking units for blob URLs...');
    const units = await Unit.findAll();
    
    for (const unit of units) {
      if (unit.images) {
        let images = unit.images;
        
        // Parse if it's a JSON string
        if (typeof images === 'string') {
          try {
            images = JSON.parse(images);
          } catch (e) {
            console.log(`⚠️  Unit ${unit.id} (${unit.unitNumber}) has invalid images format`);
            continue;
          }
        }
        
        // Check if it's an array
        if (Array.isArray(images)) {
          // Filter out blob URLs
          const cleanedImages = images.filter(img => {
            if (typeof img === 'string' && img.startsWith('blob:')) {
              return false; // Remove blob URLs
            }
            return true; // Keep valid images (base64, http, https)
          });
          
          // Update if we removed any blob URLs
          if (cleanedImages.length < images.length) {
            const removed = images.length - cleanedImages.length;
            await unit.update({ images: cleanedImages });
            console.log(`   ✓ Unit ${unit.id} "${unit.unitNumber}": Removed ${removed} blob URL(s), kept ${cleanedImages.length} valid image(s)`);
            unitsUpdated++;
          } else {
            console.log(`   ✓ Unit ${unit.id} "${unit.unitNumber}": No blob URLs found (${images.length} valid images)`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Cleanup Summary:');
    console.log('='.repeat(50));
    console.log(`   Properties checked: ${properties.length}`);
    console.log(`   Properties updated: ${propertiesUpdated}`);
    console.log(`   Units checked: ${units.length}`);
    console.log(`   Units updated: ${unitsUpdated}`);
    console.log(`   Total records cleaned: ${propertiesUpdated + unitsUpdated}`);
    console.log('='.repeat(50));
    
    if (propertiesUpdated === 0 && unitsUpdated === 0) {
      console.log('\n✅ No blob URLs found! All images are valid.');
    } else {
      console.log('\n✅ Cleanup complete! Blob URLs have been removed.');
      console.log('📝 Note: You may want to re-upload images for affected records.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupBlobUrls();
