const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PayrollDocumentDistributionQueue, PayrollExport, PayrollPayslip } = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { getArchivesDir, resolveAbsolute } = require('./payrollDocumentPaths');

async function prepareDistributionPackage({ req, documentRefs, recipientEmail, recipientName }) {
  const rows = [];
  for (const ref of documentRefs || []) {
    rows.push(
      await PayrollDocumentDistributionQueue.create({
        companyId: req.companyId,
        channel: 'EMAIL',
        status: 'PENDING',
        recipientEmail: recipientEmail || ref.recipientEmail,
        recipientName: recipientName || ref.recipientName,
        documentRefs: ref,
      })
    );
  }
  return rows;
}

async function markQueueReady(req, queueId) {
  const row = await PayrollDocumentDistributionQueue.findOne({
    where: { id: queueId, ...companyWhere(req) },
  });
  if (!row) {
    const err = new Error('Queue item not found');
    err.statusCode = 404;
    throw err;
  }
  await row.update({ status: 'READY' });
  return row;
}

async function listQueue(req) {
  return PayrollDocumentDistributionQueue.findAll({
    where: companyWhere(req),
    order: [['id', 'DESC']],
    limit: 100,
  });
}

async function resolveFilePaths(companyId, exportIds = [], payslipIds = []) {
  const paths = [];
  if (exportIds.length) {
    const exports = await PayrollExport.findAll({
      where: { id: exportIds, companyId },
    });
    for (const e of exports) {
      const abs = resolveAbsolute(e.filePath);
      if (abs && fs.existsSync(abs)) paths.push({ name: path.basename(abs), path: abs });
    }
  }
  if (payslipIds.length) {
    const slips = await PayrollPayslip.findAll({
      where: { id: payslipIds, companyId },
    });
    for (const p of slips) {
      const abs = resolveAbsolute(p.pdfPath);
      if (abs && fs.existsSync(abs)) paths.push({ name: path.basename(abs), path: abs });
    }
  }
  return paths;
}

async function buildArchiveZip({ req, exportIds = [], payslipIds = [] }) {
  const files = await resolveFilePaths(req.companyId, exportIds, payslipIds);
  if (!files.length) {
    const err = new Error('No files to archive');
    err.statusCode = 400;
    throw err;
  }

  const dir = getArchivesDir(req.companyId);
  const zipName = `payroll-package-${Date.now()}.zip`;
  const zipPath = path.join(dir, zipName);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    for (const f of files) {
      archive.file(f.path, { name: f.name });
    }
    archive.finalize();
  });

  const rel = `/uploads/payroll/archives/${req.companyId}/${zipName}`;
  return { zipPath, relativePath: rel, fileCount: files.length };
}

module.exports = {
  prepareDistributionPackage,
  markQueueReady,
  listQueue,
  buildArchiveZip,
};
