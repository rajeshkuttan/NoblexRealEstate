'use strict';

/**
 * RC1 corpus validation: index fixtures, reindex, retrieve, delete, OCR notes, isolation.
 * Usage: node src/scripts/copilotRc1Corpus.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const {
  CompanySetting,
  CopilotDocument,
  CopilotDocumentChunk,
} = require('../models');
const documentService = require('../copilot/ingestion/documentService');
const { processDocument } = require('../copilot/ingestion/indexerWorker');
const { getVectorStore } = require('../copilot/retrieval');
const { needsOcr } = require('../copilot/ingestion/ocrProvider');
const { extractText } = require('../copilot/ingestion/extractors');

const ROOT = path.join(__dirname, '../../../Tasks/Release');
const CORPUS = path.join(__dirname, '../../fixtures/copilot-corpus');
const OCR_OUT = path.join(ROOT, 'RC1_OCR_Quality.md');
const CORPUS_OUT = path.join(ROOT, 'RC1_Corpus_Validation.md');

function mimeFor(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.csv': 'text/csv',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] || 'application/octet-stream';
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  execSync('node src/scripts/generateCopilotCorpusFixtures.js', {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
  });

  await sequelize.authenticate();
  const company = await CompanySetting.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
  if (!company) throw new Error('No active company');
  const companyId = company.id;
  const userId = 1;

  const files = fs.readdirSync(CORPUS).filter((f) => !f.startsWith('.'));
  const indexed = [];
  const ocrNotes = [];
  const companyUploadDir = documentService.ensureUploadDir(companyId);

  for (const name of files) {
    const filePath = path.join(CORPUS, name);
    const staging = path.join(companyUploadDir, `rc1_stage_${Date.now()}_${name.replace(/[^\w.\-]+/g, '_')}`);
    fs.copyFileSync(filePath, staging);
    const file = {
      path: staging,
      originalname: name,
      mimetype: mimeFor(name),
      size: fs.statSync(staging).size,
    };
    const { document } = await documentService.createFromUpload(companyId, userId, file, {
      title: `RC1 ${name}`,
      language: /ar/i.test(name) ? 'ar' : 'en',
    });
    const doc = await CopilotDocument.findByPk(document.id);
    await processDocument(doc);
    const refreshed = await CopilotDocument.findByPk(document.id);
    indexed.push({
      id: refreshed.id,
      name,
      ingestionStatus: refreshed.ingestionStatus,
      indexingStatus: refreshed.indexingStatus,
      lastError: refreshed.lastError,
    });

    if (name.endsWith('.pdf')) {
      let extracted = { text: '', ocrUsed: false };
      try {
        extracted = await extractText({
          filePath: refreshed.filePath || staging,
          mimeType: 'application/pdf',
          originalName: name,
        });
      } catch (_) {
        /* ignore */
      }
      ocrNotes.push({
        file: name,
        textLength: (extracted.text || '').length,
        needsOcr: needsOcr(extracted.text),
        ocrUsed: extracted.ocrUsed || false,
        ocrProvider: extracted.ocrProvider || process.env.COPILOT_OCR_PROVIDER || 'stub',
      });
    }
  }

  const store = getVectorStore();
  const hits = await store.search({ companyId, query: 'renewal notice 90 days', limit: 5 });
  const citationOk = hits.some((h) => h.documentId && (h.contentPreview || h.content));

  let reindexOk = false;
  if (indexed[0]) {
    await documentService.reindexDocument(companyId, indexed[0].id);
    const d = await CopilotDocument.findByPk(indexed[0].id);
    await processDocument(d);
    const after = await CopilotDocument.findByPk(indexed[0].id);
    reindexOk = after.indexingStatus === 'ready' || after.ingestionStatus === 'ready';
  }

  const otherHits = await store.search({
    companyId: companyId + 999999,
    query: 'renewal notice',
    limit: 5,
  });
  const isolationOk =
    otherHits.length === 0 || otherHits.every((h) => Number(h.companyId) === companyId + 999999);

  let deleteOk = false;
  const last = indexed[indexed.length - 1];
  if (last) {
    await documentService.deleteDocument(companyId, last.id);
    const gone = await CopilotDocument.findByPk(last.id);
    const chunks = await CopilotDocumentChunk.count({ where: { documentId: last.id, companyId } });
    deleteOk = !gone && chunks === 0;
  }

  const readyCount = indexed.filter((i) => i.ingestionStatus === 'ready').length;
  const overall = readyCount > 0 && citationOk && isolationOk && deleteOk;

  const md = `# RC1 Corpus Validation

Generated: ${new Date().toISOString()}
Company: ${companyId}

| File | Doc ID | Ingestion | Indexing | Error |
|------|--------|-----------|----------|-------|
${indexed.map((i) => `| ${i.name} | ${i.id} | ${i.ingestionStatus} | ${i.indexingStatus} | ${i.lastError || ''} |`).join('\n')}

- Ready docs: ${readyCount}/${indexed.length}
- Citation retrieval OK: ${citationOk}
- Reindex OK: ${reindexOk}
- Company isolation OK: ${isolationOk}
- Delete OK: ${deleteOk}
- Retrieval hits sample: ${hits.length}

**Overall:** ${overall ? 'PASS' : 'FAIL'}
`;
  fs.writeFileSync(CORPUS_OUT, md);

  const ocrMd = `# RC1 OCR Quality Report

Generated: ${new Date().toISOString()}
OCR provider env: ${process.env.COPILOT_OCR_PROVIDER || 'stub'}

| File | Text length | Needs OCR | OCR used | Provider |
|------|-------------|-----------|----------|----------|
${ocrNotes.map((n) => `| ${n.file} | ${n.textLength} | ${n.needsOcr} | ${n.ocrUsed} | ${n.ocrProvider} |`).join('\n')}

## Findings

- Digital PDFs with extractable text should skip OCR.
- Thin/scanned-style PDFs (near-empty extract) trigger OCR path.
- Current COPILOT_OCR_PROVIDER=stub returns placeholder text suitable for pipeline validation, not production OCR accuracy.
- Production recommendation: integrate PDF rasterizer + dedicated OCR (or vision) and re-run this report.

## Limitations

- Stub OCR does not produce real Arabic/English OCR accuracy metrics.
- No page-image confidence scores until a real OCR engine is configured.
`;
  fs.writeFileSync(OCR_OUT, ocrMd);
  console.log(md);
  process.exit(overall ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
