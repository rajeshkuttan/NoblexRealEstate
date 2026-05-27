const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '../../../uploads/payroll');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDocumentsDir(companyId) {
  const dir = path.join(UPLOAD_ROOT, 'documents', String(companyId));
  ensureDir(dir);
  return dir;
}

function getArchivesDir(companyId) {
  const dir = path.join(UPLOAD_ROOT, 'archives', String(companyId));
  ensureDir(dir);
  return dir;
}

function relativePath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');
  const idx = normalized.indexOf('/uploads/payroll/');
  if (idx >= 0) return normalized.slice(idx);
  return `/uploads/payroll/${path.basename(absolutePath)}`;
}

function resolveAbsolute(relative) {
  if (!relative) return null;
  if (path.isAbsolute(relative)) return relative;
  const clean = relative.replace(/^\//, '');
  return path.join(__dirname, '../../..', clean);
}

module.exports = {
  UPLOAD_ROOT,
  getDocumentsDir,
  getArchivesDir,
  relativePath,
  resolveAbsolute,
  ensureDir,
};
