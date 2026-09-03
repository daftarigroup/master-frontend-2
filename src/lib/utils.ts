import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
    if (!date) return '-';
    const dObj = typeof date === 'string' ? parseCustomDate(date) : (date instanceof Date && !isNaN(date.getTime()) ? date : parseCustomDate(String(date)));
    if (!dObj || isNaN(dObj.getTime())) return typeof date === 'string' && date.trim() && date !== '-' ? date : '-';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(dObj.getDate())}/${pad(dObj.getMonth() + 1)}/${dObj.getFullYear()}`;
}

export function formatDateTime(date: Date | string): string {
    if (!date) return '-';
    const dObj = typeof date === 'string' ? parseCustomDate(date) : (date instanceof Date && !isNaN(date.getTime()) ? date : parseCustomDate(String(date)));
    if (!dObj || isNaN(dObj.getTime())) return typeof date === 'string' && date.trim() && date !== '-' ? date : '-';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(dObj.getDate());
    const month = pad(dObj.getMonth() + 1);
    const year = dObj.getFullYear();
    const hours = dObj.getHours();
    const minutes = pad(dObj.getMinutes());
    const seconds = pad(dObj.getSeconds());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = pad(hours % 12 || 12);

    return `${day}/${month}/${year} ${hour12}:${minutes}:${seconds} ${ampm}`;
}

export function formatTimestamp(date: Date | string): string {
    return formatDateTime(date);
}

export function formatDateTimeFull(date: Date | string): string {
    if (!date) return '-';
    const dObj = typeof date === 'string' ? parseCustomDate(date) : (date instanceof Date && !isNaN(date.getTime()) ? date : parseCustomDate(String(date)));
    if (!dObj || isNaN(dObj.getTime())) return typeof date === 'string' && date.trim() && date !== '-' ? date : '-';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(dObj.getDate());
    const month = pad(dObj.getMonth() + 1);
    const year = dObj.getFullYear();
    const hours = pad(dObj.getHours());
    const minutes = pad(dObj.getMinutes());
    const seconds = pad(dObj.getSeconds());

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Robustly parse dates from Supabase, handling ISO, DD-MM-YYYY, and DD/MM/YYYY formats
 */
export function parseCustomDate(dateStr: any): Date {
    if (!dateStr) return new Date(NaN);
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date(NaN) : dateStr;

    if (typeof dateStr === 'string') {
        const cleanStr = dateStr.trim();
        if (!cleanStr || cleanStr === '-') return new Date(NaN);

        // 1. Handle DD-MM-YYYY or DD/MM/YYYY with optional time and AM/PM (e.g. "28-07-2026 12:00:00 AM", "28/07/2026")
        const match = cleanStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            let year = parseInt(match[3], 10);
            if (year < 100) year += 2000;

            let hours = match[4] ? parseInt(match[4], 10) : 0;
            const minutes = match[5] ? parseInt(match[5], 10) : 0;
            const seconds = match[6] ? parseInt(match[6], 10) : 0;
            const ampm = match[7] ? match[7].toUpperCase() : null;

            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            const localD = new Date(year, month, day, hours, minutes, seconds);
            if (!isNaN(localD.getTime())) return localD;
        }

        // 2. Handle ISO-like timestamps from DB (e.g. "2024-03-31 10:00:00")
        if (cleanStr.includes('-') && cleanStr.includes(':')) {
            if (!cleanStr.match(/([+-]\d{2,4}|[A-Z]{1,4}|Z)$/)) {
                const isoFormatted = cleanStr.includes(' ') ? cleanStr.replace(' ', 'T') : cleanStr;
                const withZ = isoFormatted + 'Z';
                const d = new Date(withZ);
                if (!isNaN(d.getTime())) return d;
            }
        }

        // 3. Try standard parsing (handles "2024-03-31T10:00:00Z" etc.)
        const standardDate = new Date(cleanStr);
        if (!isNaN(standardDate.getTime())) return standardDate;
    }

    return new Date(NaN);
}

export function calculateTotal(
    rate: number,
    gstPercent: number,
    discountPercent: number,
    quantity: number
): number {
    const baseAmount = rate * quantity;
    const discountedAmount = baseAmount - (baseAmount * discountPercent) / 100;
    const totalWithGst = discountedAmount + (discountedAmount * gstPercent) / 100;
    return parseFloat(totalWithGst.toFixed(2)); // Rounded to 2 decimal places
}

export function calculateSubtotal(
    items: {
        rate: number;
        quantity: number;
        discountPercent: number;
    }[]
): number {
    const total = items.reduce((sum, item) => {
        const base = item.rate * item.quantity;
        const discounted = base - (base * item.discountPercent) / 100;
        return sum + discounted;
    }, 0);

    return parseFloat(total.toFixed(2));
}

export function calculateTotalGst(
    items: {
        rate: number;
        quantity: number;
        discountPercent: number;
        gstPercent: number;
    }[]
): number {
    const totalGst = items.reduce((sum, item) => {
        const base = item.rate * item.quantity;
        const discounted = base - (base * item.discountPercent) / 100;
        const gstAmount = (discounted * item.gstPercent) / 100;
        return sum + gstAmount;
    }, 0);

    return parseFloat(totalGst.toFixed(2));
}

export function calculateGrandTotal(
    items: {
        rate: number;
        quantity: number;
        discountPercent: number;
        gstPercent: number;
    }[]
): number {
    const subtotal = calculateSubtotal(items);
    const gst = calculateTotalGst(items);
    return parseFloat((subtotal + gst).toFixed(2));
}


export function formatNumber(num: number) {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
}

/**
 * Dynamically resolves the API base URL using window.location and environment variables
 * so local and deployed attachment and API calls work automatically without environment mismatches.
 */
export function getApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('undefined')) {
        return envUrl.trim().replace(/\/$/, '');
    }

    if (typeof window !== 'undefined' && window.location) {
        const { hostname, protocol, port } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:5001/api`;
        }
        if (hostname.endsWith('daftarigroup.com')) {
            return `https://api.daftarigroup.com/api`;
        }
        return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
    }

    return 'http://localhost:5001/api';
}

/**
 * Formats a file or image path/URL into an absolute URL that opens safely in a new tab.
 * Dynamically uses window.location via getApiBaseUrl() to resolve proxy and backend paths for local vs deployed servers.
 */
export function getPublicFileUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
    const cleanUrl = pathOrUrl.trim().replace(/^["']|["']$/g, '');
    if (!cleanUrl || cleanUrl === '-' || cleanUrl === 'null' || cleanUrl === 'undefined') return '';

    // 1. Blob URLs or Data URIs
    if (/^(blob:|data:)/i.test(cleanUrl)) {
        return cleanUrl;
    }

    const apiBase = getApiBaseUrl();
    // Resolved dynamically from window.location (see getApiBaseUrl above), so this
    // points at the right backend automatically whether running locally or deployed.
    const proxyEndpoint = `${apiBase.replace(/\/$/, '')}/store/file-proxy`;

    // 2. Regular non-S3 external http(s) URLs — used as-is.
    if (/^https?:\/\//i.test(cleanUrl) && !cleanUrl.includes('amazonaws.com') && !cleanUrl.includes('.s3.')) {
        return cleanUrl;
    }

    // 3. S3 URLs (and any other stored path, including legacy /uploads/... values)
    // go through the backend endpoint, which resolves the S3 key and then
    // 302-redirects the browser to a short-lived presigned S3 URL. The file
    // itself transfers directly between the browser and S3 — this server only
    // signs the redirect, and the bucket stays private. Legacy /uploads/...
    // records resolve to a key that was never migrated to S3 and therefore
    // return a clean 404 rather than silently appearing to work.
    return `${proxyEndpoint}?url=${encodeURIComponent(cleanUrl)}`;
}

/**
 * Automatically compresses image files using HTML5 Canvas if they exceed a target size threshold.
 * Resizes large dimensions (max 2048px width/height) and applies compression.
 */
export async function compressImageIfNeeded(
    file: File,
    maxSizeMB: number = 1.5,
    maxDimension: number = 2048,
    quality: number = 0.8
): Promise<File> {
    if (!file || !(file instanceof File) || !file.type.startsWith('image/')) {
        return file;
    }
    if (file.size <= maxSizeMB * 1024 * 1024) {
        return file;
    }

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;
            canvas.toBlob(
                (blob) => {
                    if (!blob || blob.size >= file.size) {
                        resolve(file);
                        return;
                    }
                    const ext = outputType === 'image/jpeg' ? '.jpg' : '.png';
                    const newName = file.name.replace(/\.[^.]+$/, '') + ext;
                    const compressedFile = new File([blob], newName, {
                        type: outputType,
                        lastModified: Date.now(),
                    });
                    console.log(
                        `Image compressed: '${file.name}' (${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`
                    );
                    resolve(compressedFile);
                },
                outputType,
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };

        img.src = url;
    });
}

