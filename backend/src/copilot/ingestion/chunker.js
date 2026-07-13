'use strict';

const { sha256Text } = require('./extractors');

/**
 * Split text into overlapping character windows suitable for MySQL retrieval.
 */
function chunkText(text, options = {}) {
  const size = options.size || 1000;
  const overlap = options.overlap || 150;
  const cleaned = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  let index = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + size, cleaned.length);
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '), slice.lastIndexOf(' '));
      if (lastBreak > size * 0.5) {
        end = start + lastBreak + 1;
      }
    }
    const content = cleaned.slice(start, end).trim();
    if (content) {
      chunks.push({
        chunkIndex: index,
        content,
        contentPreview: content.slice(0, 280),
        contentHash: sha256Text(content),
        tokenCount: Math.ceil(content.length / 4),
        pageNumber: null,
        sectionTitle: null,
      });
      index += 1;
    }
    if (end >= cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

module.exports = { chunkText };
