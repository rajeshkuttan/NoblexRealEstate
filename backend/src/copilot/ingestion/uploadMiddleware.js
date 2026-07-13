'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getCopilotConfig, getAllowedMimeTypes } = require('../config/copilotConfig');
const { resolveUploadRoot } = require('../ingestion/documentService');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(resolveUploadRoot(), '_tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `upload-${unique}${path.extname(file.originalname || '')}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = getAllowedMimeTypes();
  if (file.mimetype && !allowed.includes(file.mimetype)) {
    return cb(new Error(`MIME type not allowed: ${file.mimetype}`));
  }
  cb(null, true);
}

function createUploadMiddleware() {
  const cfg = getCopilotConfig();
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: cfg.maxFileSize },
  }).single('file');
}

module.exports = { createUploadMiddleware };
