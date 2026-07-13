'use strict';

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

const dir = path.join(__dirname, '../../fixtures/copilot-corpus');
fs.mkdirSync(dir, { recursive: true });

function writePdf(file, text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const s = fs.createWriteStream(file);
    doc.pipe(s);
    doc.fontSize(12).text(text);
    doc.end();
    s.on('finish', resolve);
    s.on('error', reject);
  });
}

async function writeDocx(file, text) {
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(file);
    const archive = archiver('zip');
    out.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(out);
    archive.append(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
      { name: '[Content_Types].xml' }
    );
    archive.append(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
      { name: '_rels/.rels' }
    );
    const escaped = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    archive.append(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:body><w:p><w:r><w:t>${escaped}</w:t></w:r></w:p></w:body></w:document>`,
      { name: 'word/document.xml' }
    );
    archive.finalize();
  });
}

async function main() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Occupancy %', 92.5],
    ['Vacant units', 12],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  XLSX.writeFile(wb, path.join(dir, 'portfolio.xlsx'));

  await writePdf(
    path.join(dir, 'lease-digital.pdf'),
    'Digital lease agreement. Annual rent AED 120000. Renewal notice 90 days. Account number 123456789012 is sensitive.'
  );
  await writePdf(path.join(dir, 'lease-scanned-thin.pdf'), ' ');
  await writeDocx(
    path.join(dir, 'renewal-policy.docx'),
    'Renewal policy DOCX. Notice period 90 days. Passport PPT C1234567 must be redacted.'
  );
  console.log('fixtures:', fs.readdirSync(dir));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
