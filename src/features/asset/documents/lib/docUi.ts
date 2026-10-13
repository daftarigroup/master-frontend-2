import { BadgeCheck, Cloud, FileSignature, FileText, Image as ImageIcon, Receipt, ShieldCheck, Truck, User, Wrench, type LucideIcon } from 'lucide-react';
import type { DocPillStatus } from '@/features/asset/equipment/lib/labels';
import type { DocCategory, DocRow, DocStatus } from '../types';

export const CATEGORY_LABEL: Record<DocCategory, string> = {
  COMPLIANCE: 'Compliance',
  OPERATOR: 'Operator',
  PURCHASE: 'Purchase',
  RENTAL: 'Rental',
  SERVICE: 'Service',
  OTHER: 'Other',
};
export const CATEGORY_ORDER: DocCategory[] = ['COMPLIANCE', 'OPERATOR', 'RENTAL', 'PURCHASE', 'SERVICE', 'OTHER'];

const ICON_BY_CODE: Record<string, LucideIcon> = {
  RC_BOOK: FileText,
  INSURANCE: ShieldCheck,
  PUC: Cloud,
  FITNESS: BadgeCheck,
  OPERATOR_LICENSE: User,
  SERVICE_REPORT: Wrench,
  JOB_CARD: Wrench,
  MAINTENANCE_PHOTOS: ImageIcon,
  PURCHASE_INVOICE: Receipt,
  RENTAL_INVOICE: Receipt,
  VENDOR_BILL: Receipt,
  RENTAL_AGREEMENT: FileSignature,
  HANDOVER_CHALLAN: Truck,
  DELIVERY_CHALLAN: Truck,
  OFFHIRE_NOTE: Truck,
};

/** Tinted icon tile per category, as in the mockup (green, purple, orange, blue); dark variants on all. */
const TONE: Record<DocCategory, string> = {
  COMPLIANCE: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  OPERATOR: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
  PURCHASE: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
  RENTAL: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
  SERVICE: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',
  OTHER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
export const iconFor = (d: Pick<DocRow, 'type'>): LucideIcon => ICON_BY_CODE[d.type.code] ?? FileText;
export const toneFor = (d: Pick<DocRow, 'type'>): string => TONE[d.type.category];

/** The pill for a row: a no-validity current Service document is "Latest" when it is the newest of its kind. */
export function pillStatus(d: Pick<DocRow, 'status' | 'isLatest'>): DocPillStatus | null {
  if (d.status === 'NO_EXPIRY') return d.isLatest ? 'LATEST' : null;
  return d.status;
}

/** Valid Till text colour follows the status. */
export const VALID_TILL_COLOUR: Record<DocStatus, string> = {
  VALID: 'text-emerald-600 dark:text-emerald-400',
  EXPIRING_SOON: 'text-amber-600 dark:text-amber-400',
  EXPIRED: 'text-red-600 dark:text-red-400',
  NO_EXPIRY: 'text-muted-foreground',
};

export function fmtBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** The file link under the title: the first file's name, or "{n} files" for a set. */
export function fileLabel(d: Pick<DocRow, 'files' | 'fileCount'>): string {
  if (d.fileCount === 0) return 'No file';
  return d.fileCount === 1 ? d.files[0].originalName : `${d.fileCount} files`;
}

/** Dates and a document that has no validity show "Date" instead of "Valid Till". */
export const hasValidity = (d: Pick<DocRow, 'type'>) => d.type.hasValidity !== 'NONE';
