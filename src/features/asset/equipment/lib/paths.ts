import type { EquipmentItem } from '../types';

/** Where "View details" goes: the asset record when there is one, else the machine page. */
export const detailPath = (m: Pick<EquipmentItem, 'id' | 'assetId'>) => (m.assetId ? `/asset/asset/${m.assetId}` : `/maintenance/machines/${m.id}`);
