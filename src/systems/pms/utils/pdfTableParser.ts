// @ts-nocheck
/**
 * Enhanced PDF Table & Text Parser using pdfjs-dist
 * Extracts high-accuracy text streams, page coordinates, and reconstructs structured tables
 * with dedicated Content / Description, Item No, Quantity, Unit, Rate, Amount columns.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Setup pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ParsedPdfTable {
  fileName: string;
  fileSize: number;
  fileUrl: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
  pageCount: number;
  rawText: string;
  totalAmount?: string;
}

interface TextItemCoord {
  text: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
}

const LINE_TOL = 3;
const NUM_RE = /^[\d,]+(\.\d+)?$/;
const FIXED_HEADERS = ['Item No', 'Quantity', 'Description', 'Unit', 'Rate (Figures)', 'Rate (Words)', 'Amount'];
const EXPECTED_COLS = 7;   // Item No, Qty, Description, Unit, Rate fig, Rate words, Amount
const MAX_LINES_PER_ROW = 80;

function groupLines(items: TextItemCoord[]) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: { y: number; parts: TextItemCoord[] }[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) <= LINE_TOL) last.parts.push(it);
    else lines.push({ y: it.y, parts: [it] });
  }
  return lines.map(l => ({
    y: l.y,
    text: l.parts.sort((a, b) => a.x - b.x).map(p => p.text).join(' '),
  }));
}

/** Column edges = the widest low-coverage vertical channels (tolerates a few stray overlaps) */
function detectColumnEdges(items: TextItemCoord[], expectedCols = EXPECTED_COLS): number[] {
  if (!items.length) return [];
  const minX = Math.floor(Math.min(...items.map(i => i.x)));
  const maxX = Math.ceil(Math.max(...items.map(i => i.x + i.width)));
  const cov = new Uint16Array(maxX - minX + 3);
  for (const it of items) {
    const a = Math.floor(it.x) - minX + 1;
    const b = Math.ceil(it.x + it.width) - minX - 1;
    for (let x = a; x <= b; x++) cov[x]++;
  }
  const distinctY = new Set(items.map(i => Math.round(i.y / LINE_TOL))).size;
  const thr = Math.max(1, Math.round(0.03 * distinctY));

  const first = cov.findIndex(c => c > thr);
  let last = cov.length - 1;
  while (last > 0 && cov[last] <= thr) last--;

  const runs: { start: number; end: number }[] = [];
  let s = -1;
  for (let i = first; i <= last; i++) {
    if (cov[i] <= thr) { if (s < 0) s = i; }
    else if (s >= 0) { runs.push({ start: s, end: i }); s = -1; }
  }
  return runs
    .sort((a, b) => (b.end - b.start) - (a.end - a.start))
    .slice(0, expectedCols - 1)
    .map(r => minX + (r.start + r.end) / 2)
    .sort((a, b) => a - b);
}

/** Split lines into one contiguous block per anchor; block mean Y ≈ anchor Y */
function splitLinesByAnchors(lines: { y: number }[], anchors: number[]): number[] | null {
  const n = lines.length, m = anchors.length;
  if (n < m || m === 0) return null;
  const pre = [0];
  lines.forEach(l => pre.push(pre[pre.length - 1] + l.y));
  const cost = (s: number, e: number, i: number) => Math.abs((pre[e] - pre[s]) / (e - s) - anchors[i]);
  const INF = 1e12;
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1).fill(INF));
  const back = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  dp[0][0] = 0;
  for (let i = 1; i <= m; i++)
    for (let j = i; j <= n; j++)
      for (let s = Math.max(i - 1, j - MAX_LINES_PER_ROW); s < j; s++) {
        if (dp[i - 1][s] >= INF) continue;
        const c = dp[i - 1][s] + cost(s, j, i - 1);
        if (c < dp[i][j]) { dp[i][j] = c; back[i][j] = s; }
      }
  if (dp[m][n] >= INF) return null;
  const ends: number[] = new Array(m);
  let j = n;
  for (let i = m; i >= 1; i--) { ends[i - 1] = j; j = back[i][j]; }
  return ends;
}

function buildStructuredTable(items: TextItemCoord[]): { headers: string[]; rows: Array<Record<string, string>>; totalAmount?: string } {
  if (!items.length) return { headers: [], rows: [] };

  const HEAD_SUB = /^(unit|in figures|in words)$/i;
  const HEAD_MAIN = /(item of works|description|particular)/i;
  const PAGE_NO = /^\d{1,4}$/;

  // 1. Per page: cut header band, drop page numbers, then stitch pages into ONE continuous Y axis
  let body: TextItemCoord[] = [];
  let cursor = 0;
  const pageNums = [...new Set(items.map(i => i.page))].sort((a, b) => a - b);

  for (const p of pageNums) {
    let pg = items.filter(i => i.page === p);

    const mainHdr = pg.find(i => HEAD_MAIN.test(i.text));
    let bodyTop = -Infinity;
    if (mainHdr) {
      const sub = pg.filter(i => HEAD_SUB.test(i.text) && Math.abs(i.y - mainHdr.y) <= 20);
      bodyTop = Math.max(mainHdr.y, ...sub.map(s => s.y)) + 6;
    }
    pg = pg.filter(i => i.y > bodyTop);
    if (!pg.length) continue;

    // lone page number at the very top or bottom of the page
    const ys = pg.map(i => i.y);
    const yTop = Math.min(...ys), yBot = Math.max(...ys);
    pg = pg.filter(i => {
      const isEdge = Math.abs(i.y - yTop) <= LINE_TOL || Math.abs(i.y - yBot) <= LINE_TOL;
      if (!isEdge || !PAGE_NO.test(i.text)) return true;
      const sameLine = pg.filter(o => Math.abs(o.y - i.y) <= LINE_TOL);
      return sameLine.length > 1; // keep if it shares a line with real table text
    });
    if (!pg.length) continue;

    const minY = Math.min(...pg.map(i => i.y)), maxY = Math.max(...pg.map(i => i.y));
    const shift = cursor - minY;
    pg.forEach(i => body.push({ ...i, y: i.y + shift }));
    cursor = maxY + shift + 12;
  }
  if (!body.length) return { headers: [], rows: [] };

  // 2. Columns
  const edges = detectColumnEdges(body);
  const colOf = (it: TextItemCoord) => {
    const c = it.x + it.width / 2;
    return edges.filter(e => e < c).length;
  };
  const nCols = edges.length + 1;
  const amountCol = nCols - 1;

  const textLen = Array(nCols).fill(0);
  body.forEach(i => { textLen[colOf(i)] += i.text.length; });
  const descCol = textLen.indexOf(Math.max(...textLen));

  // 3. Find Total row and discard anything below it
  const allAmountItems = body
    .filter(i => colOf(i) === amountCol && NUM_RE.test(i.text))
    .sort((a, b) => a.y - b.y);

  let totalAmount: string | undefined = undefined;
  let totalRowY: number | null = null;

  if (allAmountItems.length > 0) {
    const lastAmount = allAmountItems[allAmountItems.length - 1];
    // Check if there is a "Total" text item near this last amount row
    const totalLabel = body.find(i => /\btotal\b/i.test(i.text) && Math.abs(i.y - lastAmount.y) <= 30);
    if (totalLabel) {
      totalAmount = lastAmount.text;
      totalRowY = lastAmount.y;
      // Discard everything below the Total row (certificate, signatures, amount in words)
      body = body.filter(i => i.y <= totalRowY! + LINE_TOL);
    }
  }

  // 4. One anchor per number in the Amount column (excluding the Total row if identified)
  let anchors = body
    .filter(i => colOf(i) === amountCol && NUM_RE.test(i.text))
    .sort((a, b) => a.y - b.y)
    .map(a => a.y);

  if (totalRowY !== null) {
    anchors = anchors.filter(a => Math.abs(a - totalRowY!) > 1);
  }

  if (!anchors.length) return { headers: [], rows: [], totalAmount };

  // 5. Non-description cells -> nearest anchor
  const nonDesc: TextItemCoord[][][] = anchors.map(() => Array.from({ length: nCols }, () => []));
  for (const it of body) {
    const c = colOf(it);
    if (c === descCol) continue;
    let best = 0, bd = Infinity;
    anchors.forEach((a, k) => { const d = Math.abs(a - it.y); if (d < bd) { bd = d; best = k; } });
    nonDesc[best][c].push(it);
  }

  // 6. Description lines -> contiguous blocks per anchor
  const descLines = groupLines(body.filter(i => colOf(i) === descCol));
  const ends = splitLinesByAnchors(descLines, anchors);
  const descText: string[] = anchors.map(() => '');
  if (ends) {
    let start = 0;
    anchors.forEach((_, k) => {
      descText[k] = descLines.slice(start, ends[k]).map(l => l.text).join(' ');
      start = ends[k];
    });
  } else {
    descLines.forEach(l => {
      let b = 0;
      anchors.forEach((v, idx) => { if (Math.abs(v - l.y) < Math.abs(anchors[b] - l.y)) b = idx; });
      descText[b] += (descText[b] ? ' ' : '') + l.text;
    });
  }

  // 7. Assemble raw rows
  const headers = nCols === FIXED_HEADERS.length
    ? [...FIXED_HEADERS]
    : Array.from({ length: nCols }, (_, i) => (i === descCol ? 'Description' : `Column ${i + 1}`));

  const rows = anchors.map((_, k) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, c) => {
      obj[h] = c === descCol
        ? descText[k].trim()
        : groupLines(nonDesc[k][c]).map(l => l.text).join(' ').trim();
    });
    // Strip stamp / header text that bleeds into cells (e.g. "AE1", "Contractor No of Corrections")
    for (const h of headers) {
      obj[h] = (obj[h] || '')
        .replace(/Contractor\s+No\s+of\s+Corrections/gi, ' ')
        .replace(/Executive\s+Engineer/gi, ' ')
        .replace(/\bAE\d*\b/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    if (obj['Item No']) {
      // "8 Item No 9" -> "8": a header label from the next item leaked in
      obj['Item No'] = obj['Item No'].replace(/\bitem\s*no\.?/gi, ' ').trim().split(/\s+/)[0] || '';
    }
    // Rate (Figures) is a single number
    const rateFig = (obj['Rate (Figures)'] || '').match(/\d[\d,]*(?:\.\d+)?/);
    if (rateFig) obj['Rate (Figures)'] = rateFig[0].replace(/,/g, '');
    return obj;
  });

  // 8. Sequence pass to repair misplaced Item No across page breaks
  // Item numbers are strictly increasing (1, 2, 3, ...). If row i is missing an Item No,
  // but row i-1 has an Item No that should belong to row i (e.g. sequence gap/jump), shift it forward.
  for (let i = 1; i < rows.length; i++) {
    const currItemNo = (rows[i]['Item No'] || '').trim();
    const prevItemNo = (rows[i - 1]['Item No'] || '').trim();

    if (!currItemNo && prevItemNo) {
      const prevPrevItemNo = i >= 2 ? (rows[i - 2]['Item No'] || '').trim() : '';
      const prevPrevNum = parseInt(prevPrevItemNo, 10);
      const prevNum = parseInt(prevItemNo, 10);

      if (!isNaN(prevNum)) {
        // If prev row contains multiple item numbers like "51 52", split them
        const multipleMatches = prevItemNo.match(/\b\d+\b/g);
        if (multipleMatches && multipleMatches.length > 1) {
          rows[i - 1]['Item No'] = multipleMatches[0];
          rows[i]['Item No'] = multipleMatches[multipleMatches.length - 1];
        } else if (!isNaN(prevPrevNum) && prevNum > prevPrevNum + 1) {
          // e.g. row i-2 is 50, row i-1 has "52", but row i is empty: row i-1 should be 51, row i should be 52
          rows[i]['Item No'] = String(prevNum);
          rows[i - 1]['Item No'] = String(prevPrevNum + 1);
        } else if (!isNaN(prevPrevNum) && prevNum === prevPrevNum + 1) {
          // If row i-1 actually belonged to the continuation of row i-2, and the item number on row i-1 is for row i
          // Shift forward to row i
          rows[i]['Item No'] = prevItemNo;
          rows[i - 1]['Item No'] = '';
        }
      }
    }
  }

  return { headers, rows, totalAmount };
}

/**
 * Extracts all text items with page coordinates using pdfjs
 */
async function extractTextItemsWithPdfJs(arrayBuffer: ArrayBuffer): Promise<{ items: TextItemCoord[]; pageCount: number; fullText: string }> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const items: TextItemCoord[] = [];
  let accumulatedText = '';

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const str = item.str.trim();
      const tx = item.transform[4];
      const ty = viewport.height - item.transform[5]; // Flip Y so 0 is at top

      items.push({
        text: str,
        x: tx,
        y: ty,
        page: pageNum,
        width: item.width || 0,
        height: item.height || 0,
      });

      accumulatedText += str + ' ';
    }
    accumulatedText += '\n';
  }

  return { items, pageCount, fullText: accumulatedText };
}

/**
 * Main Entry Point: Parses a PDF File into high-fidelity structured table rows and contents
 */
export async function parsePdfTableFile(file: File): Promise<ParsedPdfTable> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Create Base64 data URL for preview
  const fileUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    // 2. Extract text items and coordinates with pdf.js
    const { items, pageCount, fullText } = await extractTextItemsWithPdfJs(arrayBuffer);

    // 3. Build structured table from extracted coordinate items
    const { headers, rows, totalAmount } = buildStructuredTable(items);

    if (rows.length > 0) {
      return {
        fileName: file.name,
        fileSize: file.size,
        fileUrl,
        headers,
        rows,
        rowCount: rows.length,
        pageCount,
        rawText: fullText.substring(0, 5000),
        totalAmount,
      };
    }
  } catch (err) {
    console.warn('pdf.js extraction fallback:', err);
  }

  // Fallback if parsing produces 0 rows
  const fallbackHeaders = FIXED_HEADERS;
  const fallbackRows = [{
    'Item No': '1',
    'Quantity': '-',
    'Description': `Schedule document uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
    'Unit': '-',
    'Rate (Figures)': '-',
    'Rate (Words)': '-',
    'Amount': '-'
  }];

  return {
    fileName: file.name,
    fileSize: file.size,
    fileUrl,
    headers: fallbackHeaders,
    rows: fallbackRows,
    rowCount: fallbackRows.length,
    pageCount: 1,
    rawText: '',
  };
}
