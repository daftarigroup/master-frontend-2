import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentsAccess } from '@/features/asset/documents/lib/useDocumentsAccess';
import MachineFormBody from './MachineFormBody';

/** Route /maintenance/machines/new: ownership-first Add Machine page (default export kept for AddMachinePage). */
export default function AddMachineForm() {
  const navigate = useNavigate();
  const back = () => navigate('/maintenance/machines');
  const canDocs = useDocumentsAccess();
  // after a machine is created, offer to add its papers (RC, insurance, ...) without making them part of the form
  const saved = (m: { id?: string } | undefined) => {
    back();
    if (canDocs && m?.id) toast('Add documents for this machine?', { duration: 10000, action: { label: 'Add documents', onClick: () => navigate(`/asset/documents/${m.id}?upload=1`) } });
  };

  return (
    <div className="w-full space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link
          to="/maintenance/machines"
          aria-label="Back to machines"
          className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Add equipment</h1>
          <p className="text-xs text-muted-foreground">
            Excavators, cranes, trucks, DG sets and other site machines. Choose owned or hired first.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-6">
        <MachineFormBody onSaved={saved} onCancel={back} />
      </div>
    </div>
  );
}
