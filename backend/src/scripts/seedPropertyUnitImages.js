'use strict';

/**
 * Seed real-estate themed gallery images (building exteriors for properties,
 * apartment/home interiors for units).
 * Run: npm run seed:property-images
 * Options: FORCE=1 to replace existing images
 */
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { Property, Unit } = require('../models');
const { deleteEntityUploadDir } = require('../utils/saveEntityImages');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;

const PROPERTY_IMAGE_COUNT = 3;
const UNIT_IMAGE_COUNT = 2;

/** Residential towers & commercial buildings (property exteriors) */
const BUILDING_TOWER_IMAGES = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=800&q=80',
];

/** Villas, townhouses, low-rise (property exteriors) */
const BUILDING_VILLA_IMAGES = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=800&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&h=800&q=80',
];

/** Apartment / flat interiors (units in towers) */
const UNIT_APARTMENT_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&h=700&q=80',
];

/** Studio / compact apartment interiors */
const UNIT_STUDIO_IMAGES = [
  'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&h=700&q=80',
];

/** Penthouse / luxury apartment interiors */
const UNIT_LUXURY_IMAGES = [
  'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&h=700&q=80',
];

/** Villa / townhouse interiors */
const UNIT_VILLA_IMAGES = [
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&h=700&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&h=700&q=80',
];

const VILLA_BUILDING_TYPES = new Set(['villa', 'townhouse', 'duplex']);

function hasLocalImages(images) {
  if (!Array.isArray(images) || images.length === 0) return false;
  return images.some((img) => typeof img === 'string' && (img.startsWith('/uploads/') || img.startsWith('uploads/')));
}

function pickFromPool(pool, entityId, count) {
  const urls = [];
  for (let i = 0; i < count; i += 1) {
    urls.push(pool[(entityId + i) % pool.length]);
  }
  return urls;
}

function propertyImagePool(buildingType) {
  const t = (buildingType || '').toLowerCase();
  if (VILLA_BUILDING_TYPES.has(t)) return BUILDING_VILLA_IMAGES;
  return BUILDING_TOWER_IMAGES;
}

function unitImagePool(unitType, propertyBuildingType) {
  const t = (unitType || '').toLowerCase();
  const parent = (propertyBuildingType || '').toLowerCase();

  if (t === 'studio') return UNIT_STUDIO_IMAGES;
  if (t === 'penthouse') return UNIT_LUXURY_IMAGES;
  if (t === 'villa' || t === 'townhouse' || t === 'duplex') return UNIT_VILLA_IMAGES;
  if (VILLA_BUILDING_TYPES.has(parent)) return UNIT_VILLA_IMAGES;
  if (parent === 'penthouse') return UNIT_LUXURY_IMAGES;
  return UNIT_APARTMENT_IMAGES;
}

function publicPath(entityType, entityId, filename) {
  const sub = entityType === 'property' ? 'properties' : 'units';
  return `/uploads/${sub}/${entityId}/${filename}`;
}

function downloadImage(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'EmiratesLeaseFlow-ImageSeed/1.0' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          downloadImage(next, redirectCount + 1).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on('error', reject);
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadWithFallback(pool, primaryIndex) {
  let lastError;
  for (let j = 0; j < pool.length; j += 1) {
    const url = pool[(primaryIndex + j) % pool.length];
    try {
      return await downloadImage(url);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No images available in pool');
}

async function seedEntityImages(entityType, entityId, pool, imageCount, replace = false) {
  if (replace) {
    await deleteEntityUploadDir(entityType, entityId);
  }

  const sub = entityType === 'property' ? 'properties' : 'units';
  const dir = path.join(UPLOADS_ROOT, sub, String(entityId));
  await ensureDir(dir);

  const paths = [];
  for (let i = 0; i < imageCount; i += 1) {
    const buf = await downloadWithFallback(pool, entityId + i);
    const filename = `gallery-${i + 1}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    await fs.writeFile(path.join(dir, filename), buf);
    paths.push(publicPath(entityType, entityId, filename));
  }
  return paths;
}

async function run() {
  await sequelize.authenticate();

  const propertyOptions = { order: [['id', 'ASC']] };
  const unitOptions = {
    order: [['id', 'ASC']],
    include: [{ model: Property, as: 'property', attributes: ['id', 'buildingType', 'title'] }],
  };
  if (LIMIT) {
    propertyOptions.limit = LIMIT;
    unitOptions.limit = LIMIT * 3;
  }

  const [properties, units] = await Promise.all([
    Property.findAll(propertyOptions),
    Unit.findAll(unitOptions),
  ]);

  let propDone = 0;
  let unitDone = 0;
  let propSkip = 0;
  let unitSkip = 0;

  for (const property of properties) {
    if (!FORCE && hasLocalImages(property.images)) {
      propSkip += 1;
      continue;
    }
    try {
      const pool = propertyImagePool(property.buildingType);
      const images = await seedEntityImages('property', property.id, pool, PROPERTY_IMAGE_COUNT, FORCE);
      await property.update({ images });
      propDone += 1;
      console.log(`Property #${property.id} ${property.title}: ${images.length} building image(s)`);
    } catch (err) {
      console.warn(`Property #${property.id} failed:`, err.message);
    }
  }

  for (const unit of units) {
    if (!FORCE && hasLocalImages(unit.images)) {
      unitSkip += 1;
      continue;
    }
    try {
      const parentType = unit.property?.buildingType;
      const pool = unitImagePool(unit.type, parentType);
      const images = await seedEntityImages('unit', unit.id, pool, UNIT_IMAGE_COUNT, FORCE);
      await unit.update({ images });
      unitDone += 1;
      if (unitDone <= 20 || unitDone % 50 === 0) {
        console.log(`Unit #${unit.id} (${unit.unitNumber}): ${images.length} interior image(s)`);
      }
    } catch (err) {
      console.warn(`Unit #${unit.id} failed:`, err.message);
    }
  }

  console.log('\nImage seed complete');
  console.log(`  Properties: ${propDone} seeded (building exteriors), ${propSkip} skipped`);
  console.log(`  Units: ${unitDone} seeded (apartment/home interiors), ${unitSkip} skipped`);
  if (!FORCE) {
    console.log('  Re-run with FORCE=1 to replace existing /uploads/ galleries');
  }

  await sequelize.close();
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  run,
  hasLocalImages,
  propertyImagePool,
  unitImagePool,
  pickFromPool,
};
