import type { DerivedStatus, EquipmentCategory } from '@/features/asset/equipment/types';

// Machine and operator documents. Status, tab counts, banners and tiles are all computed by the server from one pass, so the
// screens only display them (nothing is counted or dated in the browser).
export type DocStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';
export type DocCategory = 'COMPLIANCE' | 'OPERATOR' | 'PURCHASE' | 'RENTAL' | 'SERVICE' | 'OTHER';
export type DocValidity = 'REQUIRED' | 'OPTIONAL' | 'NONE';
export type Ownership = 'OWNED' | 'RENTED';

export interface DocFile {
  id: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  isImage: boolean;
  previewUrl: string | null;
}

export interface DocType {
  id: string;
  code: string;
  name: string;
  category: DocCategory;
  hasValidity: DocValidity;
  costSensitive: boolean;
  personal: boolean;
  allowMultipleFiles: boolean;
  singleCurrent: boolean;
}

export interface DocRow {
  id: string;
  ownerType: 'MACHINE' | 'OPERATOR';
  ownerUser: { id: string; name: string | null } | null;
  machine: { id: string; name: string; assetCode: string; ownershipType: Ownership } | null;
  type: DocType;
  title: string;
  documentNumber: string | null;
  issuer: string | null;
  issuedAt: string | null;
  validFrom: string | null;
  validTill: string | null;
  /** only for roles with cost access, and only on cost-sensitive types */
  amount?: number | null;
  remarks: string | null;
  status: DocStatus;
  daysLeft: number | null;
  statusLabel: string;
  windowDays: number;
  isLatest: boolean;
  isCurrent: boolean;
  files: DocFile[];
  fileCount: number;
  uploadedBy: { id: string; name: string | null } | null;
  uploadedAt: string;
  workOrder: { id: string; code: string | null } | null;
  sourceType: 'UPLOAD' | 'WORK_ORDER' | 'MIGRATED';
  canEdit: boolean;
  canRenew: boolean;
  canVoid: boolean;
}

export interface MachineDocs {
  machineId: string;
  machine: { id: string; firmId: string | null; name: string; assetCode: string; category: EquipmentCategory; ownershipType: Ownership; imageUrl: string | null; status: DerivedStatus; site: string | null };
  today: string;
  readOnly: boolean;
  tabs: { all: number; expiringSoon: number; expired: number };
  banners: { expiring: { count: number; windowDays: number; names: string } | null; expired: { count: number; names: string } | null };
  agreementEndsBeforeHire: boolean;
  canUpload: boolean;
  documents: DocRow[];
  history: DocRow[];
}

export interface RegisterStats {
  total: number;
  expiringSoon: number;
  expired: number;
  machinesWithExpired: number;
}

export interface MachineSummaryRow {
  machineId: string;
  name: string;
  assetCode: string;
  ownershipType: Ownership;
  valid: number;
  expiringSoon: number;
  expired: number;
  noExpiry: number;
  total: number;
  worst: DocStatus;
}

export type RegisterList =
  | { today: string; stats: RegisterStats; view: 'documents'; total: number; items: DocRow[] }
  | { today: string; stats: RegisterStats; view: 'machines'; total: number; items: MachineSummaryRow[] };

export interface RegisterQuery {
  firmId?: string;
  q?: string;
  ownership?: Ownership | '';
  machineCategory?: string;
  category?: DocCategory | '';
  typeId?: string;
  status?: DocStatus | '';
  withinDays?: number | '';
  view?: 'documents' | 'machines';
  page?: number;
  limit?: number;
}

export interface DocTypeOption extends DocType {
  appliesTo: 'OWNED' | 'RENTED' | 'BOTH';
  system: boolean;
}

export interface FileRef {
  key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignedFile {
  key: string;
  publicUrl: string;
  uploadUrl: string;
  contentType: string;
  originalName: string;
}

export interface CreateDocBody {
  clientRequestId: string;
  machineId?: string;
  ownerUserId?: string;
  firmId?: string;
  documentTypeId: string;
  title?: string;
  documentNumber?: string;
  issuer?: string;
  issuedAt?: string;
  validFrom?: string;
  validTill?: string;
  amount?: number;
  remarks?: string;
  workOrderId?: string;
  renewsDocumentId?: string;
  files: FileRef[];
}

export interface UpdateDocBody {
  title?: string;
  documentNumber?: string | null;
  issuer?: string | null;
  issuedAt?: string | null;
  validFrom?: string | null;
  validTill?: string | null;
  amount?: number | null;
  remarks?: string | null;
}

export interface DocumentDetail {
  document: DocRow & { voidedAt: string | null; voidReason: string | null };
  versions: Array<{ id: string; validTill: string | null; issuedAt: string | null; uploadedAt: string; documentNumber: string | null; status: DocStatus | 'VOIDED'; isCurrent: boolean; voided: boolean }>;
  events: Array<{ id: string; event: string; at: string; actor: { id: string; name: string | null } | null; meta: unknown }>;
}

export interface DocCounts extends RegisterStats {
  perMachine?: Record<string, { expired: number; expiringSoon: number }>;
}
