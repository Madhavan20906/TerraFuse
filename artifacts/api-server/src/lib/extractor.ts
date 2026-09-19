import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export interface ExtractionResult {
  text: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt';
  pageCount?: number;
  tableCount?: number;
  tables?: Array<Array<string[]>>;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

export async function extractDocumentContent(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractionResult> {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (buffer.length === 0) {
    throw new Error('The uploaded file is completely empty.');
  }

  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error('The uploaded file exceeds the 15MB size limit.');
  }

  // 1. PDF
  if (extension === 'pdf' || mimeType.includes('pdf')) {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const text = typeof textResult === 'string' ? textResult : (textResult?.text || '');
      await parser.destroy();

      if (!text || text.trim().length === 0) {
        throw new Error('No readable text could be extracted from this PDF. It may be a scanned image or encrypted.');
      }
      const tables: Array<Array<string[]>> = [];

      return {
        text: text.trim(),
        fileType: 'pdf',
        tableCount: tables.length,
        tables,
        metadata: { fileName, fileSize: buffer.length, mimeType },
      };
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }
  }

  // 2. DOCX
  if (extension === 'docx' || mimeType.includes('wordprocessingml')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      if (!text) {
        throw new Error('Word document contains no extractable text.');
      }
      return {
        text,
        fileType: 'docx',
        metadata: { fileName, fileSize: buffer.length, mimeType },
      };
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message}`);
    }
  }

  // 3. XLSX / CSV
  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv' || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('Spreadsheet has no worksheets.');
      }

      const tables: Array<Array<string[]>> = [];
      let fullText = '';

      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        const rows = xlsx.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
        if (rows && rows.length > 0) {
          tables.push(rows);
        }
      }

      return {
        text: fullText.trim(),
        fileType: extension === 'csv' ? 'csv' : 'xlsx',
        tableCount: tables.length,
        tables,
        metadata: { fileName, fileSize: buffer.length, mimeType },
      };
    } catch (err: any) {
      throw new Error(`Failed to parse spreadsheet: ${err.message}`);
    }
  }

  // 4. Plain text / Markdown
  if (extension === 'txt' || extension === 'md' || mimeType.includes('text/plain')) {
    const text = buffer.toString('utf-8').trim();
    if (!text) {
      throw new Error('Text file is empty.');
    }
    return {
      text,
      fileType: 'txt',
      metadata: { fileName, fileSize: buffer.length, mimeType },
    };
  }

  throw new Error(`Unsupported file type: .${extension} (${mimeType}). Supported formats: PDF, DOCX, XLSX, CSV, TXT.`);
}
