import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface CreatedUserCredentials {
  loginId?: string;
  password?: string;
  fullName?: string;
  name?: string;
  employeeId?: string;
  email?: string;
  role?: string;
}

export interface Props {
  credentials: CreatedUserCredentials | null;
  onClose: () => void;
  open?: boolean;
}

export const UserCredentialsDialog: React.FC<Props> = ({ credentials, onClose }) => {
  if (!credentials) return null;

  const displayName = credentials.fullName || credentials.name || credentials.loginId;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Account Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground">The employee account has been created with the following credentials:</p>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border p-3 font-mono space-y-1">
            {displayName && <div><span className="text-slate-500">Name:</span> {displayName}</div>}
            {credentials.loginId && <div><span className="text-slate-500">Login ID:</span> {credentials.loginId}</div>}
            {credentials.email && <div><span className="text-slate-500">Email:</span> {credentials.email}</div>}
            {credentials.employeeId && <div><span className="text-slate-500">Employee ID:</span> {credentials.employeeId}</div>}
            {credentials.password && <div><span className="text-slate-500">Temp Password:</span> {credentials.password}</div>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserCredentialsDialog;
