const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function isDataUrl(str) {
  return typeof str === 'string' && /^data:image\/[^;]+;base64,/i.test(str);
}

function extFromDataUrl(dataUrl) {
  const m = dataUrl.match(/^data:image\/(\w+);base64,/i);
  if (!m) return '.jpg';
  const t = (m[1] || 'jpeg').toLowerCase();
  if (t === 'jpeg' || t === 'jpg') return '.jpg';
  if (t === 'png') return '.png';
  if (t === 'gif') return '.gif';
  if (t === 'webp') return '.webp';
  return '.jpg';
}

function publicPathFor(entityType, entityId, filename) {
  const sub = entityType === 'property' ? 'properties' : 'units';
  return `/uploads/${sub}/${entityId}/${filename}`;
}

/**
 * Saves base64 / data-URL images to backend/uploads/{properties|units}/{id}/ and returns URL paths.
 * Existing paths under /uploads/ are kept as-is. External http(s) URLs are stored unchanged.
 *
 * @param {unknown} images - array of strings
 * @param {'property'|'unit'} entityType
 * @param {number|string} entityId
 * @returns {Promise<string[]|null>}
 */
async function persistImagesArray(images, entityType, entityId) {
  if (!Array.isArray(images) || images.length === 0) return null;

  const sub = entityType === 'property' ? 'properties' : 'units';
  const dir = path.join(UPLOADS_ROOT, sub, String(entityId));
  await ensureDir(dir);

  const out = [];
  for (const item of images) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const trimmed = item.trim();

    if (trimmed.startsWith('/uploads/')) {
      out.push(trimmed);
      continue;
    }
    if (trimmed.startsWith('uploads/')) {
      out.push(`/${trimmed}`);
      continue;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const u = new URL(trimmed);
        if (u.pathname.startsWith('/uploads/')) {
          out.push(u.pathname);
          continue;
        }
      } catch (e) {
        /* ignore */
      }
      out.push(trimmed);
      continue;
    }

    if (isDataUrl(trimmed)) {
      const match = trimmed.match(/^data:image\/\w+;base64,(.+)$/i);
      if (!match) continue;
      const ext = extFromDataUrl(trimmed);
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const fullPath = path.join(dir, filename);
      await fs.writeFile(fullPath, Buffer.from(match[1], 'base64'));
      out.push(publicPathFor(entityType, entityId, filename));
      continue;
    }

    // Legacy: raw base64 without data: prefix
    if (trimmed.length > 80 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed.substring(0, 64))) {
      try {
        const buf = Buffer.from(trimmed.replace(/\s/g, ''), 'base64');
        if (buf.length > 40) {
          const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
          const fullPath = path.join(dir, filename);
          await fs.writeFile(fullPath, buf);
          out.push(publicPathFor(entityType, entityId, filename));
        }
      } catch (e) {
        console.warn('[saveEntityImages] skip invalid legacy base64 entry');
      }
    }
  }

  return out.length > 0 ? out : null;
}

/**
 * Deletes files under /uploads/{properties|units}/{entityId}/ that were removed from the new list.
 */
async function removeOrphanedUploads(oldImages, newImages, entityType, entityId) {
  const sub = entityType === 'property' ? 'properties' : 'units';
  const prefix = `/uploads/${sub}/${entityId}/`;
  const oldArr = Array.isArray(oldImages) ? oldImages : [];
  const newArr = Array.isArray(newImages) ? newImages : [];
  const newSet = new Set(
    newArr.map((s) => (typeof s === 'string' ? s.trim() : ''))
  );

  for (const old of oldArr) {
    if (typeof old !== 'string' || !old.includes(prefix)) continue;
    let normalized = old.trim();
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (newSet.has(normalized)) continue;

    const rel = normalized.replace(/^\//, '');
    const fullPath = path.join(__dirname, '../../', rel);
    try {
      await fs.unlink(fullPath);
    } catch (e) {
      /* already gone */
    }
  }
}

async function deleteEntityUploadDir(entityType, entityId) {
  const sub = entityType === 'property' ? 'properties' : 'units';
  const dir = path.join(UPLOADS_ROOT, sub, String(entityId));
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {
    /* ignore */
  }
}

module.exports = {
  persistImagesArray,
  removeOrphanedUploads,
  deleteEntityUploadDir
};
