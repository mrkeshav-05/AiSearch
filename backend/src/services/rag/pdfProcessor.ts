import fs from 'fs/promises';
import pdfParse from 'pdf-parse';

export interface ParsedPDF {
  text: string;
  pageCount: number;
  /** Approx character offset where each page begins (length === pageCount). */
  pageOffsets: number[];
}

/**
 * Reads a PDF from disk and returns the full extracted text + page metadata.
 * Throws if the file is not readable or is not a valid PDF.
 */
export async function parsePDF(filePath: string): Promise<ParsedPDF> {
  const buffer = await fs.readFile(filePath);
  const result = await pdfParse(buffer);

  const text: string = result.text ?? '';
  const pageCount: number = result.numpages ?? 1;

  // Build per-page character offsets by splitting on the form-feed chars
  // that pdf-parse injects between pages (\f).
  const pages = text.split('\f');
  const pageOffsets: number[] = [];
  let offset = 0;
  for (const page of pages) {
    pageOffsets.push(offset);
    offset += page.length + 1; // +1 for the \f
  }

  return { text, pageCount, pageOffsets };
}
