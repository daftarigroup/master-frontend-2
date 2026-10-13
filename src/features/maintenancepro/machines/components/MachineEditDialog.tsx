import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Machine } from '../types/types';
import MachineFormBody from './MachineFormBody';

/** Edit a machine in place. Ownership is fixed; reading unit and opening reading are read-only. */
export default function MachineEditDialog({
  machine,
  onClose,
}: {
  machine: Machine | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!machine} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>Edit machine</DialogTitle>
        <DialogDescription className="sr-only">Update the details of this machine.</DialogDescription>
        {machine && <MachineFormBody key={machine.id} machine={machine} onSaved={onClose} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
