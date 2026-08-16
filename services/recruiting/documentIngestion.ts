import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export type IngestedDocument = {
  filename: string;
  mimeType: string;
  text: string;
  pages?: number;
};

export async function extractDocumentText(input: { filename: string; mimeType?: string; data: Buffer }): Promise<IngestedDocument> {
  const filename = input.filename || 'document';
  const mimeType = input.mimeType || 'application/octet-stream';
  const lower = filename.toLowerCase();

  if (mimeType === 'text/plain' || lower.endsWith('.txt') || lower.endsWith('.md')) {
    return { filename, mimeType, text: input.data.toString('utf8').trim() };
  }

  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(input.data) }).promise;
    const chunks: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      chunks.push(content.items.map((item: any) => item.str || '').join(' '));
    }
    return { filename, mimeType, text: chunks.join('\n\n').replace(/\s+/g, ' ').trim(), pages: pdf.numPages };
  }

  if (mimeType.includes('wordprocessingml') || lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: input.data });
    return { filename, mimeType, text: result.value.replace(/\s+/g, ' ').trim() };
  }

  throw new Error('Unsupported document type. Upload PDF, DOCX or TXT.');
}
