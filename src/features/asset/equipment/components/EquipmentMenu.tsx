import { AlertTriangle, BarChart3, ExternalLink, FileText, Fuel, MoreVertical, Pencil, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDocumentsAccess } from '@/features/asset/documents/lib/useDocumentsAccess';
import { cn } from '@/lib/utils';
import { detailPath } from '../lib/paths';
import type { EquipmentItem } from '../types';

interface Props {
  item: EquipmentItem;
  /** Offer Cost tracking (the server still decides what data comes back). */
  canCost: boolean;
  onQr: (item: EquipmentItem) => void;
  className?: string;
}

/** The kebab menu on every card and table row: one list of actions, whichever layout shows it. */
export function EquipmentMenu({ item, canCost, onQr, className }: Props) {
  const navigate = useNavigate();
  const canDocs = useDocumentsAccess();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${item.name}`}
          className={cn('size-11 lg:size-8', className)}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-5 lg:size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => navigate(detailPath(item))}>
          <ExternalLink className="size-4" /> View details
        </DropdownMenuItem>
        {canCost && (
          <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => navigate(`/asset/equipment/${item.id}/cost`)}>
            <BarChart3 className="size-4" /> Cost tracking
          </DropdownMenuItem>
        )}
        {canDocs && (
          <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => navigate(`/asset/documents/${item.id}`)}>
            <FileText className="size-4" /> Documents
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => navigate(`/asset/work-logs?machineId=${item.id}&new=1`)}>
          <Fuel className="size-4" /> Add work log
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => navigate(`/maintenance/machines/${item.id}`)}>
          <Pencil className="size-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-10 lg:min-h-0" onSelect={() => onQr(item)}>
          <QrCode className="size-4" /> QR tag
        </DropdownMenuItem>
        {item.ownershipType === 'OWNED' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-10 lg:min-h-0 text-red-600 focus:text-red-600 dark:text-red-400" onSelect={() => navigate(`/maintenance/work-orders?tab=breakdown&new=1&type=BREAKDOWN&machine=${item.id}`)}>
              <AlertTriangle className="size-4" /> Report breakdown
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default EquipmentMenu;
