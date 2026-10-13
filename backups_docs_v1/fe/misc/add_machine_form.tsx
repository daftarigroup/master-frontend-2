import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MachineFormBody from './MachineFormBody';

/** Route /maintenance/machines/new: ownership-first Add Machine page (default export kept for AddMachinePage). */
export default function AddMachineForm() {
  const navigate = useNavigate();
  const back = () => navigate('/maintenance/machines');

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
          <h1 className="text-lg font-bold text-foreground">Add machine</h1>
          <p className="text-xs text-muted-foreground">Choose whether the machine is owned or hired first.</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-6">
        <MachineFormBody onSaved={back} onCancel={back} />
      </div>
    </div>
  );
}
