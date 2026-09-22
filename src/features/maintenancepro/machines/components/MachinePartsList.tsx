'use client';

import {
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Package,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useDeleteMachinePart,
  useMachineParts,
} from '../server/tanstackQuery/useMachinePartQueries';
import type { MachinePart } from '../types/types';
import { AddMachinePartForm } from './AddMachinePartForm';

interface MachinePartsListProps {
  machineId?: string;
}

export function MachinePartsList({ machineId: propMachineId }: MachinePartsListProps = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const machineId = propMachineId || paramId || '';
  const currentUser = useAppSelector(selectUser);
  const isAdmin =
    (currentUser as { role?: string } | null)?.role === 'ADMIN' ||
    (currentUser as { role?: string } | null)?.role === 'SUPERADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<MachinePart | null>(null);

  const { data: partsResponse, isLoading, isError, refetch } = useMachineParts(machineId);
  const deleteMutation = useDeleteMachinePart();

  const parts: MachinePart[] = partsResponse?.data ?? [];

  const filteredParts = parts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this part?')) {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
      } catch (err) {
        console.error('Failed to delete part:', err);
      }
    }
  };

  const handleClose = () => {
    setIsAddOpen(false);
    setEditingPart(null);
    refetch();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="relative flex w-full items-center sm:flex-1 sm:min-w-60">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search parts by name or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            <Plus size={16} />
            Add Part
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-border bg-card/50"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-12 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-destructive" />
            <div className="text-[14px] font-bold text-destructive">Failed to load parts</div>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 text-[12px] font-bold text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
            <Package size={32} className="mx-auto mb-3 text-muted-foreground" />
            <div className="text-[14px] font-bold text-foreground">No machine parts found</div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {searchTerm
                ? 'Try a different search term'
                : 'Add components that make up this machine'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-primary/10 px-4 text-[12px] font-bold text-primary hover:bg-primary/20"
              >
                <Plus size={14} /> Add First Part
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredParts.map((part) => (
              <div
                key={part.id}
                className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:shadow-md"
              >
                {/* Image Header */}
                <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-muted">
                  {part.imageUrl ? (
                    <img
                      src={part.imageUrl}
                      alt={part.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditingPart(part)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-foreground backdrop-blur-sm transition-colors hover:bg-white hover:text-primary"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(part.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-foreground backdrop-blur-sm transition-colors hover:bg-white hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-[14px] font-bold tracking-tight text-foreground">
                      {part.name}
                    </h3>
                    {part.partNumber && (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                        {part.partNumber}
                      </span>
                    )}
                  </div>
                  <p className="mb-4 line-clamp-2 text-[12px] text-muted-foreground">
                    {part.description || 'No description provided.'}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                    <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Added{' '}
                      {new Date(part.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditingPart(part)}
                        className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                      >
                        Details <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog — rendered in a portal, outside the layout DOM */}
      <Dialog
        open={isAddOpen || !!editingPart}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border-border shadow-2xl">
          <DialogTitle className="sr-only">
            {editingPart ? 'Edit Machine Part' : 'Add New Machine Part'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editingPart
              ? 'Update component specifications.'
              : 'Register a new component for this machine.'}
          </DialogDescription>
          <AddMachinePartForm
            machineId={machineId}
            part={editingPart ?? undefined}
            hideCloseButton={true}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MachinePartsList;
