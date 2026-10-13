import type { DocType } from '../types';

export const DOC_TYPES: DocType[] = ['RC_BOOK', 'INSURANCE', 'PUC', 'FITNESS', 'OPERATOR_LICENSE', 'SERVICE_REPORT', 'BILL', 'OTHER'];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  RC_BOOK: 'RC book',
  INSURANCE: 'Insurance',
  PUC: 'PUC',
  FITNESS: 'Fitness',
  OPERATOR_LICENSE: 'Operator licence',
  SERVICE_REPORT: 'Service report',
  BILL: 'Bill',
  OTHER: 'Other',
};
