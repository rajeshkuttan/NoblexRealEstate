const db = require('../models');
const Property = db.Property;

async function inspectProperty() {
  try {
    console.log('Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get a sample property
    const property = await Property.findOne({
      where: { id: 53 }, // Using the ID from your console logs
      include: ['agent']
    });

    if (!property) {
      console.log('❌ Property with ID 53 not found');
      
      // Get any property
      const anyProperty = await Property.findOne({ include: ['agent'] });
      if (anyProperty) {
        console.log('\n📋 Found another property (ID:', anyProperty.id, '):\n');
        console.log(JSON.stringify(anyProperty.toJSON(), null, 2));
      } else {
        console.log('❌ No properties found in database');
      }
    } else {
      console.log('📋 Property Data (ID: 53):\n');
      const propertyData = property.toJSON();
      
      console.log('=== BASIC INFO ===');
      console.log('ID:', propertyData.id);
      console.log('Title:', propertyData.title);
      console.log('Location:', propertyData.location);
      console.log('Building Type:', propertyData.buildingType);
      console.log('Price:', propertyData.price);
      console.log('Units:', propertyData.units);
      
      console.log('\n=== IMAGES ===');
      console.log('Images (raw):', propertyData.images);
      console.log('Images type:', typeof propertyData.images);
      console.log('Images is array?:', Array.isArray(propertyData.images));
      if (propertyData.images) {
        console.log('Images length:', Array.isArray(propertyData.images) ? propertyData.images.length : 'N/A');
      }
      
      console.log('\n=== AMENITIES ===');
      console.log('Amenities (raw):', propertyData.amenities);
      console.log('Amenities type:', typeof propertyData.amenities);
      
      console.log('\n=== FULL JSON ===');
      console.log(JSON.stringify(propertyData, null, 2));
    }

    // Get count of all properties
    const count = await Property.count();
    console.log('\n📊 Total properties in database:', count);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await db.sequelize.close();
    console.log('\n✅ Database connection closed');
  }
}

inspectProperty();
