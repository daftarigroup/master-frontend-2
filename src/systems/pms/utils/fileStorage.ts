// @ts-nocheck
/**
 * IndexedDB storage utility for large files (PDFs, images, attachments).
 * Bypasses the strict ~5MB browser localStorage quota ceiling.
 * IndexedDB typically allows 50MB to several GBs of client storage.
 */

const DB_NAME = 'pcb_files_store_v1';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

// In-memory cache for fast synchronous access during the session
const memoryCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a file (base64 string or Blob) into IndexedDB.
 */
export async function saveFileToIndexedDB(fileId: string, dataUrlOrBlob: string | Blob): Promise<void> {
  if (!fileId) return;
  if (typeof dataUrlOrBlob === 'string') {
    memoryCache.set(fileId, dataUrlOrBlob);
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrlOrBlob, fileId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not write file:', fileId, err);
  }
}

/**
 * Retrieves a file from IndexedDB by fileId.
 * Returns a data URL or blob URL for display/viewing in browser.
 */
export async function getFileFromIndexedDB(fileId: string): Promise<string | null> {
  if (!fileId) return null;
  if (memoryCache.has(fileId)) {
    return memoryCache.get(fileId)!;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fileId);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) return resolve(null);
        if (result instanceof Blob) {
          const url = URL.createObjectURL(result);
          memoryCache.set(fileId, url);
          resolve(url);
        } else if (typeof result === 'string') {
          memoryCache.set(fileId, result);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not read file:', fileId, err);
    return null;
  }
}

/**
 * Deletes a file from IndexedDB by fileId.
 */
export async function deleteFileFromIndexedDB(fileId: string): Promise<void> {
  if (!fileId) return;
  memoryCache.delete(fileId);
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(fileId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not delete file:', fileId, err);
  }
}

/**
 * Registers a memory URL (e.g. Blob URL) for instantaneous viewing
 */
export function setMemoryFile(fileId: string, url: string): void {
  if (fileId && url) {
    memoryCache.set(fileId, url);
  }
}

export function getMemoryFile(fileId: string): string | null {
  return memoryCache.get(fileId) || null;
}
