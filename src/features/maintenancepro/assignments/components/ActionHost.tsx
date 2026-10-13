import type { AssignmentAction } from '../types';
import { AssignDialog } from './dialogs/AssignDialog';
import { EndOperatorDialog, OperatorDialog } from './dialogs/OperatorDialogs';
import { ReleaseDialog } from './dialogs/ReleaseDialog';
import { TransferDialog } from './dialogs/TransferDialog';
import { CancelDialog, DispatchDialog, ReceiveDialog } from './dialogs/TransferStepDialogs';

/** Renders the one dialog for the current action; each dialog mounts fresh, so its form starts clean. */
export function ActionHost({ action, onClose }: { action: AssignmentAction | null; onClose: () => void }) {
  if (!action) return null;
  switch (action.kind) {
    case 'assign': return <AssignDialog row={action.row} onClose={onClose} />;
    case 'release': return <ReleaseDialog row={action.row} onClose={onClose} />;
    case 'transfer': return <TransferDialog row={action.row} onClose={onClose} />;
    case 'operator': return <OperatorDialog machine={action.machine} current={action.current} currentOperators={action.currentOperators} onClose={onClose} />;
    case 'endOperator': return <EndOperatorDialog id={action.id} operatorName={action.operatorName} machineName={action.machineName} onClose={onClose} />;
    case 'dispatch': return <DispatchDialog transfer={action.transfer} onClose={onClose} />;
    case 'receive': return <ReceiveDialog transfer={action.transfer} onClose={onClose} />;
    case 'cancel': return <CancelDialog transfer={action.transfer} onClose={onClose} />;
  }
}
