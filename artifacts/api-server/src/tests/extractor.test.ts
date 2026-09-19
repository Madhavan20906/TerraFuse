import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDocumentContent } from '../lib/extractor.js';
import * as XLSX from 'xlsx';

test('extractDocumentContent: extracts plain text files', async () => {
  const content = 'Line 1: Procurement Request\nQuantity: 50\nMaterial: Aluminum';
  const buffer = Buffer.from(content, 'utf8');

  const res = await extractDocumentContent(
    buffer,
    'quote.txt',
    'text/plain'
  );

  assert.equal(res.text.trim(), content.trim());
  assert.equal(res.fileType, 'txt');
});

test('extractDocumentContent: extracts CSV files into structured table and text', async () => {
  const csvContent = 'Item,Quantity,Unit Price,Total\nWayfinding Signs,86,15.00,1290.00\nHardware,10,25.00,250.00';
  const buffer = Buffer.from(csvContent, 'utf8');

  const res = await extractDocumentContent(
    buffer,
    'items.csv',
    'text/csv'
  );

  assert.ok(res.text.includes('Wayfinding Signs'));
  assert.ok(res.text.includes('86'));
  assert.ok(res.tables && res.tables.length > 0);
});

test('extractDocumentContent: extracts Excel XLSX files', async () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Product', 'Count', 'Material'],
    ['Display Banner', 120, 'PVC vinyl'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Quotes');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const res = await extractDocumentContent(
    buffer,
    'order.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  assert.ok(res.text.includes('Display Banner'));
  assert.ok(res.text.includes('PVC vinyl'));
  assert.ok(res.tables && res.tables.length > 0);
});

test('extractDocumentContent: rejects files exceeding maximum size (15MB)', async () => {
  const oversizeBuffer = Buffer.alloc(16 * 1024 * 1024);
  await assert.rejects(
    async () => {
      await extractDocumentContent(
        oversizeBuffer,
        'huge.txt',
        'text/plain'
      );
    },
    /exceeds the 15MB size limit/i
  );
});

test('extractDocumentContent: rejects unsupported extensions', async () => {
  const buffer = Buffer.from('binary content', 'utf8');
  await assert.rejects(
    async () => {
      await extractDocumentContent(
        buffer,
        'malicious.exe',
        'application/octet-stream'
      );
    },
    /unsupported file type/i
  );
});
