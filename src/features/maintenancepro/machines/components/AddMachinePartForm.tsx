'use client';

import type { AxiosError } from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Factory,
  FileText,
  Image as ImageIcon,
  Package,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  useCreateMachinePart,
  useUpdateMachinePart,
} from '../server/tanstackQuery/useMachinePartQueries';
import { useMachines } from '../server/tanstackQuery/useMachinesQueries';
import type { CreateMachinePartPayload, MachinePart } from '../types/types';

interface AddMachinePartFormProps {
  machineId?: string;
  part?: MachinePart; // If provided, we are editing
  onClose: () => void;
  hideCloseButton?: boolean;
}

const INPUT_CLASS =
  'h-10 w-full rounded-[10px] border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS = 'mb-1.5 block text-[12px] font-semibold text-muted-foreground';

interface ApiErrorBody {
  message?: string;
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const axiosError = err as AxiosError<ApiErrorBody>;
  if (axiosError.response?.data?.message) return axiosError.response.data.message;
  if (err instanceof Error) return err.message;
  return fallback;
};

export function AddMachinePartForm({
  machineId: initialMachineId,
  part,
  onClose,
  hideCloseButton,
}: AddMachinePartFormProps) {
  const isEditing = !!part;
  const { data: machinesRes } = useMachines();
  const machines = machinesRes?.data || [];

  const createPartMutation = useCreateMachinePart();
  const updatePartMutation = useUpdateMachinePart();

  const [formData, setFormData] = useState<CreateMachinePartPayload>({
    machineId: initialMachineId || part?.machineId || '',
    name: part?.name || '',
    partNumber: part?.partNumber || '',
    description: part?.description || '',
    imageUrl: part?.imageUrl || '',
  });

  const {
    uploadImage,
    isUploading,
    progress,
    error: uploadError,
  } = useImageUpload({
    bucket: 'mis-docs',
    pathPrefix: `maintenance/parts/${formData.machineId || 'general'}`,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await uploadImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: url }));
    } catch (err: unknown) {
      console.error('Image upload failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError('Part name is required');
      return;
    }

    try {
      if (isEditing && part) {
        await updatePartMutation.mutateAsync({
          id: part.id,
          data: {
            ...formData,
            isActive: part.isActive,
          },
        });
        setSuccess('Part updated successfully');
      } else {
        await createPartMutation.mutateAsync(formData);
        setSuccess('Part added successfully');
      }
      setTimeout(onClose, 1000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Operation failed'));
    }
  };

  const isPending = createPartMutation.isPending || updatePartMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold tracking-tight">
              {isEditing ? 'Edit Machine Part' : 'Add New Machine Part'}
            </h2>
            <p className="truncate text-[12px] text-muted-foreground">
              {isEditing
                ? 'Modify existing part details'
                : 'Register a new component for this machine'}
            </p>
          </div>
        </div>
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-6">
        {(error || uploadError) && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border p-3.5"
            style={{
              borderColor: 'oklch(0.577 0.245 27.325)',
              background: 'oklch(0.577 0.245 27.325 / 0.08)',
            }}
          >
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0"
              style={{ color: 'oklch(0.577 0.245 27.325)' }}
            />
            <p className="text-[13px] font-medium" style={{ color: 'oklch(0.577 0.245 27.325)' }}>
              {error || uploadError}
            </p>
          </div>
        )}

        {success && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border p-3.5"
            style={{
              borderColor: 'oklch(0.627 0.265 149.214)',
              background: 'oklch(0.627 0.265 149.214 / 0.08)',
            }}
          >
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0"
              style={{ color: 'oklch(0.627 0.265 149.214)' }}
            />
            <p className="text-[13px] font-medium" style={{ color: 'oklch(0.627 0.265 149.214)' }}>
              {success}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {!initialMachineId && !isEditing && (
            <div>
              <label htmlFor="machineId" className={LABEL_CLASS}>
                Select Machine <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Factory
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <select
                  id="machineId"
                  name="machineId"
                  value={formData.machineId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, machineId: e.target.value }))}
                  className={`${INPUT_CLASS} pl-9`}
                  disabled={isPending}
                  required
                >
                  <option value="">— Select Machine —</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.assetCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              Part Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Package
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Hydraulic Pump"
                className={`${INPUT_CLASS} pl-9`}
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="partNumber" className={LABEL_CLASS}>
              Part / Model Number
            </label>
            <div className="relative">
              <FileText
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                id="partNumber"
                name="partNumber"
                value={formData.partNumber || ''}
                onChange={handleChange}
                placeholder="e.g., PMP-X100"
                className={`${INPUT_CLASS} pl-9`}
                disabled={isPending}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={LABEL_CLASS}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Technical specifications or notes..."
              className="min-h-24 w-full rounded-[10px] border border-border bg-muted p-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              disabled={isPending}
            />
          </div>

          <div>
            <label htmlFor="part-image-upload" className={LABEL_CLASS}>
              Part Image
            </label>
            <div className="flex flex-col gap-3">
              {formData.imageUrl ? (
                <div className="group relative h-40 w-full overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={formData.imageUrl}
                    alt="Part"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white/90">
                      <Upload size={14} /> Change Image
                      <input
                        id="part-image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading || isPending}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ImageIcon size={20} />
                  </div>
                  <div className="text-center">
                    <div className="text-[12px] font-bold">Upload Part Photo</div>
                    <div className="text-[11px] text-muted-foreground">
                      JPG, PNG or WEBP up to 5MB
                    </div>
                  </div>
                  <input
                    id="part-image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading || isPending}
                  />
                </label>
              )}

              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">Uploading image...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending || isUploading}
            className="h-9.5 rounded-xl border border-border bg-transparent px-5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-primary px-6 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? 'Update Part' : 'Add Part'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
