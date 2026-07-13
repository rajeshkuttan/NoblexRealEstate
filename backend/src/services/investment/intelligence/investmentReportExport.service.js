'use strict';

/**
 * Real PDF / Excel builders for investment report exports (Phase 24 hardening).
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

function exportRoot(companyId) {
  const root = path.join(__dirname, '../../../../uploads/investment-exports', String(companyId || '0'));
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function flattenRows(rows = []) {
  return (rows || []).map((r) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      const out = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = v != null && typeof v === 'object' ? JSON.stringify(v) : v;
      }
      return out;
    }
    return { value: r };
  });
}

function buildExcelBuffer(report) {
  const rows = flattenRows(report.rows);
  const ws = rows.length
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.aoa_to_sheet([['(no rows)']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(report.reportCode || 'Report').slice(0, 31));
  const meta = XLSX.utils.aoa_to_sheet([
    ['Report', report.name || report.reportCode],
    ['Code', report.reportCode],
    ['Category', report.category],
    ['Generated', report.generatedAt || new Date().toISOString()],
    ['Row count', (report.rows || []).length],
    ['Filters', JSON.stringify(report.filters || {})],
    ['Classification', 'Internal — verify against ERP source records'],
  ]);
  XLSX.utils.book_append_sheet(wb, meta, 'meta');
  if (report.summary && typeof report.summary === 'object') {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([report.summary]),
      'summary'
    );
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(report.name || report.reportCode || 'Investment Report', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor('#444');
    doc.text(`Code: ${report.reportCode || ''}`);
    doc.text(`Category: ${report.category || ''}`);
    doc.text(`Generated: ${report.generatedAt || new Date().toISOString()}`);
    doc.text(`Filters: ${JSON.stringify(report.filters || {})}`);
    doc.moveDown();
    doc.fillColor('#000').fontSize(11).text('Summary', { underline: true });
    doc.fontSize(9).text(JSON.stringify(report.summary || {}, null, 2));
    doc.moveDown();
    doc.fontSize(11).text('Rows', { underline: true });
    doc.fontSize(8);
    const rows = flattenRows(report.rows).slice(0, 80);
    if (!rows.length) {
      doc.text('(no rows)');
    } else {
      const keys = Object.keys(rows[0]).slice(0, 8);
      doc.text(keys.join(' | '));
      doc.moveDown(0.2);
      for (const row of rows) {
        const line = keys.map((k) => String(row[k] ?? '')).join(' | ');
        doc.text(line.slice(0, 140), { lineGap: 1 });
        if (doc.y > 750) {
          doc.addPage();
          doc.fontSize(8);
        }
      }
      if ((report.rows || []).length > 80) {
        doc.moveDown();
        doc.text(`… ${(report.rows || []).length - 80} more rows omitted in PDF preview`);
      }
    }
    doc.moveDown();
    doc.fontSize(8).fillColor('#666').text(
      'Classification: Internal. AI/system-generated export — verify against ERP before operational use.'
    );
    doc.end();
  });
}

function buildCsvString(report) {
  const rows = flattenRows(report.rows);
  if (!rows.length) return 'value\n';
  const cols = Object.keys(rows[0]);
  const header = cols.join(',');
  const lines = rows.map((r) => cols.map((c) => JSON.stringify(r[c] == null ? '' : r[c])).join(','));
  return [header, ...lines].join('\n');
}

/**
 * Build export artifact for a shaped report.
 * Returns buffers as base64 for API transport + optional on-disk fileRef.
 */
async function materializeExport(report, format = 'JSON', { companyId, writeFile = true } = {}) {
  const fmt = String(format || 'JSON').toUpperCase();
  const safeCode = String(report.reportCode || 'REPORT').replace(/[^A-Z0-9_]/gi, '_');
  const stamp = Date.now();

  if (fmt === 'CSV') {
    const content = buildCsvString(report);
    const fileName = `${safeCode}-${stamp}.csv`;
    let fileRef = null;
    if (writeFile && companyId != null) {
      fileRef = path.join(exportRoot(companyId), fileName);
      fs.writeFileSync(fileRef, content, 'utf8');
    }
    return {
      format: 'CSV',
      mime: 'text/csv',
      fileName,
      fileRef,
      encoding: 'utf8',
      content,
      base64: Buffer.from(content, 'utf8').toString('base64'),
      stub: false,
    };
  }

  if (fmt === 'EXCEL' || fmt === 'XLSX') {
    const buffer = buildExcelBuffer(report);
    const fileName = `${safeCode}-${stamp}.xlsx`;
    let fileRef = null;
    if (writeFile && companyId != null) {
      fileRef = path.join(exportRoot(companyId), fileName);
      fs.writeFileSync(fileRef, buffer);
    }
    return {
      format: 'EXCEL',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName,
      fileRef,
      encoding: 'base64',
      base64: buffer.toString('base64'),
      byteLength: buffer.length,
      stub: false,
    };
  }

  if (fmt === 'PDF') {
    const buffer = await buildPdfBuffer(report);
    const fileName = `${safeCode}-${stamp}.pdf`;
    let fileRef = null;
    if (writeFile && companyId != null) {
      fileRef = path.join(exportRoot(companyId), fileName);
      fs.writeFileSync(fileRef, buffer);
    }
    return {
      format: 'PDF',
      mime: 'application/pdf',
      fileName,
      fileRef,
      encoding: 'base64',
      base64: buffer.toString('base64'),
      byteLength: buffer.length,
      stub: false,
    };
  }

  return {
    format: 'JSON',
    mime: 'application/json',
    fileName: `${safeCode}-${stamp}.json`,
    fileRef: null,
    encoding: 'json',
    content: report,
    stub: false,
  };
}

module.exports = {
  exportRoot,
  flattenRows,
  buildExcelBuffer,
  buildPdfBuffer,
  buildCsvString,
  materializeExport,
};
