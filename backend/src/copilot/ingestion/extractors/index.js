'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { needsOcr, getOcrProvider } = require('../ocrProvider');
const { logCopilot } = require('../../observability/copilotLogger');

/**
 * Extract plain text from supported Copilot document types.
 * If PDF text is insufficient, OCR provider is invoked (scanned PDF path).
 */
async function extractText({ filePath, mimeType, originalName }) {
  const ext = path.extname(originalName || filePath || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();

  if (mime === 'application/pdf' || ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    const info = await parser.getInfo().catch(() => null);
    const pages = info?.total || info?.numPages || data?.pages?.length || null;
    let text = String(data.text || '').trim();
    let ocr = null;
    if (needsOcr(text)) {
      try {
        ocr = await getOcrProvider().extractFromPdf({ filePath, mimeType, originalName });
        if (ocr?.text) {
          text = String(ocr.text).trim();
          logCopilot('info', 'ocr_used', { provider: ocr.provider, filePath });
        }
      } catch (err) {
        logCopilot('error', 'ocr_failed', { error: err.message });
      }
    }
    return {
      text,
      pages: ocr?.pages || pages,
      ocrUsed: Boolean(ocr?.usedOcr),
      ocrProvider: ocr?.provider || null,
    };
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return { text: String(result.value || '').trim(), pages: null };
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === '.xlsx' ||
    ext === '.xls'
  ) {
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(filePath);
    const parts = wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name];
      return `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    });
    return { text: parts.join('\n\n').trim(), pages: null };
  }

  if (mime === 'text/html' || ext === '.html' || ext === '.htm') {
    const raw = fs.readFileSync(filePath, 'utf8');
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text, pages: null };
  }

  if (mime === 'text/csv' || mime === 'text/plain' || ext === '.csv' || ext === '.txt') {
    const text = fs.readFileSync(filePath, 'utf8').trim();
    return { text, pages: null };
  }

  const err = new Error(`Unsupported mime type for extraction: ${mime || ext}`);
  err.code = 'UNSUPPORTED_MIME';
  throw err;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

module.exports = {
  extractText,
  sha256File,
  sha256Text,
};
