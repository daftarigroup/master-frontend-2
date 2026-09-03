import { toast } from 'react-hot-toast';
import { getPublicFileUrl } from '@/lib/utils';

/**
 * Maps common file extensions to MIME types
 */
const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  html: 'text/html',
  htm: 'text/html',
  xml: 'application/xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};

/**
 * Detects MIME type from filename or base64 magic bytes
 */
function detectMimeType(fileName?: string | null, rawData?: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && EXTENSION_MIME_MAP[ext]) {
      return EXTENSION_MIME_MAP[ext];
    }
  }

  if (rawData) {
    const sample = rawData.slice(0, 30);
    if (sample.startsWith('JVBER')) return 'application/pdf'; // %PDF-
    if (sample.startsWith('iVBORw0KGgo')) return 'image/png';
    if (sample.startsWith('/9j/')) return 'image/jpeg';
    if (sample.startsWith('R0lGOD')) return 'image/gif';
    if (sample.startsWith('UklGR')) return 'image/webp';
    if (sample.startsWith('PHN2Zy') || sample.startsWith('PD94b')) return 'image/svg+xml';
  }

  return 'application/pdf';
}

/**
 * Safely decodes base64 string into a Uint8Array, correcting URL-safe encoding,
 * URL-encoded characters, whitespace, illegal characters, and padding.
 */
function safeBase64ToUint8Array(base64Str: string): Uint8Array {
  let cleaned = base64Str;

  // 1. If base64 contains percent encoding (e.g. %2B, %2F, %3D, %20), decode it
  if (cleaned.includes('%')) {
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // ignore
    }
  }

  // 2. Remove all whitespace, line breaks, null/control characters, and quotes
  cleaned = cleaned.replace(/[\s\r\n\t\x00-\x1F"']/g, '');

  // 3. Convert URL-safe base64 (- and _) to standard (+ and /)
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  // 4. Remove any invalid base64 characters
  cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');

  // 5. Fix padding if needed
  const remainder = cleaned.length % 4;
  if (remainder === 2) {
    cleaned += '==';
  } else if (remainder === 3) {
    cleaned += '=';
  } else if (remainder === 1) {
    cleaned = cleaned.slice(0, -1);
  }

  // 6. Decode
  try {
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('safeBase64ToUint8Array fallback to TextEncoder', err);
    return new TextEncoder().encode(cleaned);
  }
}

/**
 * Converts any fileContent (Data URL, raw Base64, text) into a Blob
 */
function fileContentToBlob(
  fileContent: string,
  fileName?: string | null
): { blob: Blob; mimeType: string } {
  let mimeType = '';
  let dataPart = fileContent;

  if (fileContent.startsWith('data:')) {
    const commaIndex = fileContent.indexOf(',');
    if (commaIndex !== -1) {
      const header = fileContent.slice(0, commaIndex);
      dataPart = fileContent.slice(commaIndex + 1);

      const mimeMatch = header.match(/^data:([^;,]+)/i);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1].toLowerCase();
      }

      const isBase64 = header.includes(';base64');
      if (!isBase64) {
        // Raw URL encoded text data
        try {
          const decoded = decodeURIComponent(dataPart);
          const finalMime = mimeType || detectMimeType(fileName, dataPart);
          return { blob: new Blob([decoded], { type: finalMime }), mimeType: finalMime };
        } catch {
          const finalMime = mimeType || detectMimeType(fileName, dataPart);
          return { blob: new Blob([dataPart], { type: finalMime }), mimeType: finalMime };
        }
      }
    }
  }

  if (!mimeType) {
    mimeType = detectMimeType(fileName, dataPart);
  }

  const bytes = safeBase64ToUint8Array(dataPart);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  return { blob, mimeType };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Creates an interactive preview HTML page containing top toolbar with document title,
 * direct Download button, Print button, and embedded native viewer.
 */
function createPreviewHtml(
  fileBlobUrl: string,
  fileName: string,
  mimeType: string,
  fileSizeBytes: number
): string {
  const safeName = escapeHtml(fileName);
  const safeMime = escapeHtml(mimeType);
  const sizeLabel = formatFileSize(fileSizeBytes);

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json';
  const isMedia = mimeType.startsWith('video/') || mimeType.startsWith('audio/');

  const isCorrupted = fileSizeBytes > 0 && fileSizeBytes < 64 && (isPdf || isImage || isMedia);

  let viewerBody = '';

  if (isCorrupted) {
    viewerBody = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;background:#0f172a;color:#f8fafc;text-align:center;">
        <div style="width:72px;height:72px;background:rgba(239, 68, 68, 0.15);border:1px solid rgba(239, 68, 68, 0.3);border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 style="font-size:18px;font-weight:600;margin:0 0 8px 0;color:#f8fafc;">Attachment Data Corrupted or Incomplete</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px 0;max-width:480px;line-height:1.5;">
          The stored file content for <strong>${safeName}</strong> contains only <strong>${sizeLabel}</strong> of data instead of a valid file.
        </p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px 18px;margin-bottom:24px;text-align:left;max-width:480px;font-size:12px;color:#cbd5e1;line-height:1.5;">
          💡 <strong>How to fix:</strong> Return to the Document table, click the <strong>Edit (✏️)</strong> button on this document, and re-upload the original <code>${safeName}</code> file.
        </div>
      </div>
    `;
  } else if (isPdf) {
    viewerBody = `
      <iframe
        id="fileFrame"
        src="${fileBlobUrl}#toolbar=1&navpanes=1"
        style="width:100%;height:100%;border:none;flex:1;background:#525659;"
        title="${safeName}"
      ></iframe>
    `;
  } else if (isImage) {
    viewerBody = `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;padding:24px;background:#0f172a;">
        <img
          src="${fileBlobUrl}"
          alt="${safeName}"
          style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 10px 30px rgba(0,0,0,0.5);border-radius:6px;transition:transform 0.2s ease;"
          id="previewImg"
        />
      </div>
    `;
  } else if (isText) {
    viewerBody = `
      <div style="flex:1;overflow:auto;padding:24px;background:#0f172a;color:#f8fafc;font-family:monospace;font-size:13px;line-height:1.6;">
        <iframe
          src="${fileBlobUrl}"
          style="width:100%;height:100%;border:none;background:#ffffff;border-radius:6px;"
          title="${safeName}"
        ></iframe>
      </div>
    `;
  } else if (isMedia) {
    viewerBody = `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:24px;background:#0f172a;">
        <video controls autoplay style="max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <source src="${fileBlobUrl}" type="${safeMime}">
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  } else {
    // Non-viewable binary files (Office docs, zip, etc.)
    viewerBody = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;background:#0f172a;color:#f8fafc;text-align:center;">
        <div style="width:72px;height:72px;background:#1e293b;border:1px solid #334155;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <h2 style="font-size:18px;font-weight:600;margin:0 0 8px 0;color:#f8fafc;">${safeName}</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 24px 0;">Preview is not supported for this file format in browser. Please download to view.</p>
        <button onclick="downloadFile()" style="background:#2563eb;color:#ffffff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(37,99,235,0.3);transition:background 0.2s;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download File
        </button>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} - Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; }
    .preview-container { display: flex; flex-direction: column; width: 100%; height: 100%; }
    .preview-header {
      height: 52px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: #f8fafc;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }
    .file-icon {
      color: #60a5fa;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .file-title {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(96, 165, 250, 0.15);
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(96, 165, 250, 0.3);
      flex-shrink: 0;
    }
    .file-size {
      font-size: 11px;
      color: #94a3b8;
      flex-shrink: 0;
    }
    .action-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-download {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-download:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #334155;
      color: #e2e8f0;
      border: 1px solid #475569;
    }
    .btn-secondary:hover {
      background: #475569;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <header class="preview-header">
      <div class="file-info">
        <div class="file-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <span class="file-title" title="${safeName}">${safeName}</span>
        <span class="file-badge">${safeMime.split('/')[1] || 'FILE'}</span>
        ${sizeLabel ? `<span class="file-size">(${sizeLabel})</span>` : ''}
      </div>

      <div class="action-group">
        <button class="btn btn-secondary" onclick="window.print()" title="Print Document">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print
        </button>

        <button class="btn btn-download" onclick="downloadFile()" title="Download file to computer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download
        </button>
      </div>
    </header>

    ${viewerBody}
  </div>

  <script>
    function downloadFile() {
      const a = document.createElement('a');
      a.href = '${fileBlobUrl}';
      a.download = ${JSON.stringify(fileName)};
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  </script>
</body>
</html>`;
}

/**
 * Previews any document, PDF, image, or attachment in a new browser tab.
 * The new tab features full interactive viewing and a direct download button.
 *
 * @param fileContent Base64 data URL, raw base64 string, or remote HTTP/Blob URL
 * @param fileName Optional file name used for MIME deduction, tab title, and downloading
 */
export const previewFileInNewTab = (
  fileContent: string | undefined | null,
  fileName?: string | null
): void => {
  if (!fileContent || typeof fileContent !== 'string' || fileContent.trim() === '') {
    toast.error('File attachment is not available for preview.');
    return;
  }

  const trimmed = fileContent.trim();
  const displayName = fileName?.trim() || 'document.pdf';

  try {
    // 1. Direct web URL (http, https, blob)
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:')
    ) {
      // If it's a direct PDF or image URL, open preview wrapper
      const mime = detectMimeType(displayName);
      const previewHtml = createPreviewHtml(trimmed, displayName, mime, 0);
      const viewerBlob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
      const viewerUrl = URL.createObjectURL(viewerBlob);

      const win = window.open(viewerUrl, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = viewerUrl;
        a.target = '_blank';
        a.rel = 'noopener,noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }

    // 2. Relative file path (e.g. /uploads/..., uploads/...)
    if (
      (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) &&
      !trimmed.startsWith('data:')
    ) {
      const fullUrl = trimmed.startsWith('http') ? trimmed : `${window.location.origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
      const mime = detectMimeType(displayName);
      const previewHtml = createPreviewHtml(fullUrl, displayName, mime, 0);
      const viewerBlob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
      const viewerUrl = URL.createObjectURL(viewerBlob);

      const win = window.open(viewerUrl, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = viewerUrl;
        a.target = '_blank';
        a.rel = 'noopener,noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }

    // 3. Base64 / Data URL conversion to Blob
    const { blob: fileBlob, mimeType } = fileContentToBlob(trimmed, displayName);
    const fileBlobUrl = URL.createObjectURL(fileBlob);

    // Create interactive preview HTML page
    const previewHtml = createPreviewHtml(fileBlobUrl, displayName, mimeType, fileBlob.size);
    const viewerBlob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
    const viewerUrl = URL.createObjectURL(viewerBlob);

    const newWindow = window.open(viewerUrl, '_blank');
    if (!newWindow) {
      const a = document.createElement('a');
      a.href = viewerUrl;
      a.target = '_blank';
      a.rel = 'noopener,noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.error('Failed to preview file in new tab:', err);

    // Ultimate fallback: open raw Data URL or trigger download
    try {
      if (trimmed.startsWith('data:')) {
        const win = window.open(trimmed, '_blank');
        if (win) return;
      }
      const link = document.createElement('a');
      link.href = trimmed;
      link.download = displayName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Unable to open or preview document.');
    }
  }
};


/**
 * Opens a file stored in a DB column, handling both storage generations:
 *
 *  - Legacy rows hold a base64 data-URL (or raw base64) inlined in the column.
 *    These are decoded client-side into a blob and shown in the viewer tab.
 *  - New rows hold an S3 URL written by uploadFile(). These are opened through
 *    getPublicFileUrl(), which routes to the backend endpoint that redirects to
 *    a short-lived presigned S3 URL, so the bytes come straight from S3.
 *
 * @param value    The raw stored column value (base64 payload or S3 URL)
 * @param fileName Optional original file name, used for the tab title / MIME hint
 */
export const openStoredFile = (
  value: string | undefined | null,
  fileName?: string | null
): void => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    toast.error('File attachment is not available for preview.');
    return;
  }

  const trimmed = value.trim();
  const isRemoteUrl = /^https?:\/\//i.test(trimmed);

  if (isRemoteUrl) {
    const url = getPublicFileUrl(trimmed);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener,noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return;
  }

  // Legacy base64 / data-URL rows keep using the client-side blob viewer.
  previewFileInNewTab(trimmed, fileName);
};

/**
 * Resolves a stored column value into something usable as an <img src>.
 * Base64 payloads are already renderable as-is; S3 URLs are routed through
 * getPublicFileUrl() so the presigned-redirect endpoint serves them.
 */
export const resolveStoredImageSrc = (value: string | undefined | null): string => {
  if (!value || typeof value !== 'string' || value.trim() === '') return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('data:')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return getPublicFileUrl(trimmed);
  // Raw base64 with no data: prefix — render as a generic image data URL.
  return `data:image/*;base64,${trimmed}`;
};
