// @ts-nocheck
// Helper utilities for Petty Cash System

// Generate unique serial numbers (SN-001, SN-002, etc.)
export const generateSerialNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `SN-${String(timestamp).slice(-6)}${String(random).padStart(3, '0')}`;
};

// Generate UUID
export const generateId = () => {
  return `ID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Format date to DD/MM/YYYY
export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format date to YYYY-MM-DD for input
export const formatDateForInput = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
  const today = new Date();
  return formatDateForInput(today);
};

// Get today's date in DD/MM/YYYY format
export const getTodayDateFormatted = () => {
  return formatDate(new Date());
};

// Calculate user balance
export const calculateBalance = (personName, credits, expenses) => {
  const creditAmount = credits
    .filter(c => c.personName === personName)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  
  const expenseAmount = expenses
    .filter(e => e.personName === personName && e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  return creditAmount - expenseAmount;
};

// Get total balance for all
export const getTotalBalance = (credits, expenses) => {
  const totalCredit = credits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalExpense = expenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  return totalCredit - totalExpense;
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// Validate date range
export const isDateInRange = (date, fromDate, toDate) => {
  const checkDate = new Date(date);
  const startDate = fromDate ? new Date(fromDate) : new Date('1900-01-01');
  const endDate = toDate ? new Date(toDate) : new Date('2099-12-31');
  
  return checkDate >= startDate && checkDate <= endDate;
};

// Base64 image conversion
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Compresses an image file down to a target size by resizing and re-encoding as JPEG at
// decreasing quality, then resolves with the result as a base64 data URI (plus its final
// byte size). Falls back to the smallest size it can reach if the target can't be hit at a
// still-readable quality (0.3 floor). Only works for images - PDFs etc. can't be compressed
// this way and should be size-checked directly instead.
export const compressImageToBase64 = (
  file: File | Blob,
  { maxBytes = 2 * 1024 * 1024, maxDimension = 1920 }: { maxBytes?: number; maxDimension?: number } = {}
): Promise<{ base64: string; size: number }> => {
  return new Promise<{ base64: string; size: number }>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (quality: number) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not compress image'));
            return;
          }
          if (blob.size <= maxBytes || quality <= 0.3) {
            URL.revokeObjectURL(objectUrl);
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => resolve({ base64: (reader.result as string) || '', size: blob.size });
            reader.onerror = (error) => reject(error);
          } else {
            tryQuality(quality - 0.15);
          }
        }, 'image/jpeg', quality);
      };

      tryQuality(0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image'));
    };

    img.src = objectUrl;
  });
};

// Get file name from base64
export const getFileNameFromBase64 = (base64String) => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  
  return new File([u8arr], `image-${Date.now()}.${mime.split('/')[1]}`, {
    type: mime
  });
};

// Calculate pending count
export const getPendingCount = (expenses) => {
  return expenses.filter(e => e.status === 'PENDING').length;
};

// Get today's expenses
export const getTodaysExpenses = (expenses) => {
  const today = getTodayDate();
  return expenses.filter(e => e.date === today && e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
};

export const getTodaysCredits = (credits) => {
  const today = getTodayDate();
  return credits.filter(c => c.date === today)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
};

// Builds a Map from a list item's key to a "distance from the upper row" value, based on that
// item's own Chainage: this item's Chainage minus the previous item's Chainage (by the given
// order). If this item's own Chainage is missing or 0, the subtraction is skipped and 0 is
// stored instead - the following item then continues normally, subtracting from its own raw
// Chainage as usual.
export const buildChainageDiffMap = (sortedList, chainageOf, keyOf) => {
  const map = new Map();
  sortedList.forEach((item, i) => {
    const cur = parseFloat(chainageOf(item));
    if (Number.isNaN(cur) || cur === 0) {
      map.set(keyOf(item), 0);
      return;
    }
    if (i === 0) {
      map.set(keyOf(item), cur);
      return;
    }
    const prev = parseFloat(chainageOf(sortedList[i - 1]));
    map.set(keyOf(item), Number.isNaN(prev) ? cur : cur - prev);
  });
  return map;
};

// Whether all three work-stage checkboxes (Excavation / Pipe Laying / Back Filling) are
// checked on an Execution/Actual entry. Missing fields (entries saved before this feature
// existed) default to checked/true, matching the form's own default.
export const allStagesDone = (entry) =>
  entry?.excavation !== false && entry?.pipeLaying !== false && entry?.backFilling !== false;

// Ledger entry creator
export const createLedgerEntry = (id, personName, type, amount, date, referenceId, balanceAfter) => {
  return {
    id: generateId(),
    personName,
    type, // CREDIT or EXPENSE
    amount: parseFloat(amount),
    date,
    referenceId,
    balanceAfter: parseFloat(balanceAfter),
    timestamp: new Date().toISOString()
  };
};

const WORDS_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const WORDS_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigitsToWords = (n) => {
  if (n < 20) return WORDS_ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${WORDS_TENS[tens]}${ones ? ' ' + WORDS_ONES[ones] : ''}`;
};

const threeDigitsToWords = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let str = '';
  if (hundreds) str += `${WORDS_ONES[hundreds]} Hundred`;
  if (rest) str += `${hundreds ? ' ' : ''}${twoDigitsToWords(rest)}`;
  return str;
};

// Converts a non-negative number to words using the Indian numbering system
// (Crore / Lakh / Thousand). Any decimal portion is dropped - callers needing
// paise should format that separately.
export const numberToWordsIndian = (num) => {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(' ');
};

// Full currency-in-words line for a Rupee amount, e.g. "Rupees One Lakh Twenty Thousand Only".
// Returns '' for empty/zero/invalid input so callers can show a placeholder instead.
export const amountInWords = (amount) => {
  const n = Number(amount);
  if (!amount || Number.isNaN(n) || n <= 0) return '';
  return `Rupees ${numberToWordsIndian(n)} Only`;
};

// Human-readable duration between two YYYY-MM-DD dates, e.g. "1 Year 2 Months" or "20 Days".
// Used to auto-suggest Work Period from Start Date / Planned End Date - the field stays a
// plain text input so the suggestion can still be edited/overridden by hand.
// Returns '' when either date is missing/invalid or the end date is before the start date.
export const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);

  return parts.length ? parts.join(' ') : '0 Days';
};

// Quoted Amount = Tender Amount +/- a percentage markup (negative percentage marks it down).
// Returns '' when either input is missing/invalid so callers can show a placeholder instead.
export const calculateQuotedAmount = (tenderAmount, percentage) => {
  const amount = Number(tenderAmount);
  const pct = Number(percentage);
  if (!tenderAmount || Number.isNaN(amount) || percentage === '' || percentage === null || percentage === undefined || Number.isNaN(pct)) {
    return '';
  }
  return (amount + (amount * pct) / 100).toFixed(2);
};
