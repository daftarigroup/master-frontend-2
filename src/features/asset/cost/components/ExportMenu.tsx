import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { downloadBlob } from '../lib/costLabels';
import { costApi } from '../server/costApi';

/** Excel / CSV come from the server (which re-checks cost access and leaves voided records out); PDF is the browser's print dialog. */
export function ExportMenu({ scope, machineId, month, className }: { scope: 'machine' | 'fleet'; machineId?: string; month: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const run = async (format: 'xlsx' | 'csv') => {
    setBusy(true);
    try {
      const { blob, name } = await costApi.report({ scope, machineId, month, format });
      downloadBlob(blob, name);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not export the report'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className} disabled={busy}><Download className="size-4" /> {busy ? 'Exporting…' : 'Export'}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => run('xlsx')}><FileSpreadsheet className="size-4" /> Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('csv')}><FileText className="size-4" /> CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTimeout(() => window.print(), 50)}><Printer className="size-4" /> Print / save as PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
