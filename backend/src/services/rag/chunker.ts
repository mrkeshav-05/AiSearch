export interface TextChunk {
  content: string;
  chunkIndex: number;
  /** Estimated page number (1-based) derived from character position. */
  pageNumber: number;
  /** Rough token count (words × 1.3). */
  tokenCount: number;
}

/**
 * Recursive character text splitter.
 * Priority order of split boundaries: paragraph → sentence → word → character.
 */
function splitRecursive(text: string, chunkSize: number, overlap: number): string[] {
  const separators = ['\n\n', '\n', '. ', ' ', ''];
  return recursiveSplit(text, chunkSize, overlap, separators);
}

function recursiveSplit(
  text: string,
  chunkSize: number,
  overlap: number,
  separators: string[]
): string[] {
  if (text.length <= chunkSize) return text.trim() ? [text] : [];

  const [sep, ...remainingSeps] = separators;

  if (sep === undefined) {
    // Last resort: hard character split
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  const segments = sep ? text.split(sep) : [...text];
  const chunks: string[] = [];
  let current = '';

  for (const seg of segments) {
    const candidate = current ? current + sep + seg : seg;
    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      if (current.trim()) chunks.push(current);
      // If this single segment is still too long, recurse with next separator
      if (seg.length > chunkSize) {
        const sub = recursiveSplit(seg, chunkSize, overlap, remainingSeps);
        chunks.push(...sub);
        current = '';
      } else {
        current = seg;
      }
    }
  }
  if (current.trim()) chunks.push(current);

  // Apply overlap: prepend tail of previous chunk to next chunk
  if (overlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [chunks[0]];
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1];
      const tail = prev.slice(Math.max(0, prev.length - overlap));
      overlapped.push(tail + sep + chunks[i]);
    }
    return overlapped;
  }

  return chunks;
}

/**
 * Splits extracted PDF text into overlapping chunks with page estimates.
 *
 * @param text        Full document text (from pdfProcessor)
 * @param pageOffsets Character offsets where each page starts (from pdfProcessor)
 * @param chunkSize   Target chunk size in characters (default 1000)
 * @param overlap     Overlap between adjacent chunks in characters (default 200)
 */
export function chunkText(
  text: string,
  pageOffsets: number[],
  chunkSize = 1000,
  overlap = 200
): TextChunk[] {
  const rawChunks = splitRecursive(text, chunkSize, overlap);

  const chunks: TextChunk[] = [];
  let charCursor = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    const content = rawChunks[i].trim();
    if (!content) continue;

    // Find the approximate position of this chunk in the original text
    const pos = text.indexOf(content, charCursor);
    if (pos !== -1) charCursor = pos + content.length;

    // Determine page number from character position
    let pageNumber = 1;
    for (let p = pageOffsets.length - 1; p >= 0; p--) {
      if (charCursor >= pageOffsets[p]) {
        pageNumber = p + 1; // 1-based
        break;
      }
    }

    const tokenCount = Math.ceil(content.split(/\s+/).length * 1.3);

    chunks.push({ content, chunkIndex: chunks.length, pageNumber, tokenCount });
  }

  return chunks;
}
