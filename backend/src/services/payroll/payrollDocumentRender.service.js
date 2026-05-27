const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const documentTemplateService = require('../documentTemplateService');
const { getDocumentsDir, relativePath } = require('./payrollDocumentPaths');

function maskIban(iban) {
  if (!iban || typeof iban !== 'string') return '—';
  const s = iban.replace(/\s/g, '');
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function substitute(template, vars) {
  if (!template) return '';
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));
}

async function buildDocumentContext(companyId, documentType) {
  return documentTemplateService.getTemplate(companyId, documentType);
}

function writePdfToFile({ title, sections, ctx, outputPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const company = ctx.company || {};
    const tpl = ctx.template || {};

    if (tpl.watermark) {
      doc.save();
      doc.rotate(-45, { origin: [300, 400] });
      doc.fontSize(40).fillColor('#cccccc').text(tpl.watermark, 100, 400, { align: 'center' });
      doc.restore();
      doc.fillColor('#000000');
    }

    doc.fontSize(18).text(company.name || ctx.displayName || 'Company', { align: 'left' });
    if (tpl.showCompanyAddress !== false && company.address) {
      doc.fontSize(9).text([company.address, company.city, company.country].filter(Boolean).join(', '));
    }
    if (tpl.showTrn !== false && company.trn) {
      doc.fontSize(9).text(`TRN: ${company.trn}`);
    }
    doc.moveDown();
    doc.fontSize(16).text(title, { underline: true });
    doc.moveDown(0.5);

    if (tpl.headerTemplate) {
      doc.fontSize(9).text(substitute(tpl.headerTemplate, sections.headerVars || {}));
      doc.moveDown();
    }

    for (const block of sections.blocks || []) {
      if (block.heading) {
        doc.fontSize(11).font('Helvetica-Bold').text(block.heading);
        doc.font('Helvetica');
      }
      if (block.lines) {
        doc.fontSize(10);
        for (const line of block.lines) {
          doc.text(line);
        }
      }
      if (block.table) {
        doc.fontSize(9);
        const { headers, rows } = block.table;
        if (headers) doc.text(headers.join('  |  '));
        for (const row of rows || []) {
          doc.text(row.join('  |  '));
        }
      }
      doc.moveDown(0.5);
    }

    if (sections.summary) {
      doc.moveDown();
      doc.fontSize(11).font('Helvetica-Bold');
      for (const s of sections.summary) {
        doc.text(s);
      }
      doc.font('Helvetica');
    }

    if (tpl.footerTemplate) {
      doc.moveDown();
      doc.fontSize(8).text(substitute(tpl.footerTemplate, sections.footerVars || {}));
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
    doc.on('error', reject);
  });
}

async function renderAndSavePdf({ companyId, documentType, fileName, title, sections }) {
  const ctx = await buildDocumentContext(companyId, documentType);
  const dir = getDocumentsDir(companyId);
  const absPath = path.join(dir, fileName);
  await writePdfToFile({ title, sections, ctx, outputPath: absPath });
  return { absolutePath: absPath, relativePath: relativePath(absPath) };
}

module.exports = {
  maskIban,
  substitute,
  buildDocumentContext,
  writePdfToFile,
  renderAndSavePdf,
};
