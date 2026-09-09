'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createPortal } from 'react-dom';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface HrModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconTone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Side panel slides in from right at full height; otherwise centered dialog. */
  variant?: 'dialog' | 'side';
  className?: string;
}

const sizeMap: Record<NonNullable<HrModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-5xl',
  full: 'w-[95vw] sm:w-[90vw] sm:max-w-6xl xl:max-w-7xl',
};

const iconToneMap = {
  primary: 'text-primary bg-primary/10',
  success: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  warning: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
  danger: 'text-destructive bg-destructive/10',
  info: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
};

export function HrModal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  iconTone = 'primary',
  children,
  footer,
  size = 'md',
  variant = 'dialog',
  className,
}: HrModalProps) {
  if (variant === 'side') {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            'fixed top-0 right-0 left-auto translate-x-0 translate-y-0 h-full max-h-screen rounded-none sm:rounded-l-2xl border-l p-0 flex flex-col shadow-2xl duration-300 w-full max-w-lg overflow-hidden',
            className
          )}
        >
          {(title || Icon) && (
            <DialogHeader className="border-b bg-muted/20 px-6 py-4 flex flex-row items-center justify-between text-left shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                  <div className={cn('p-1.5 rounded-lg shrink-0', iconToneMap[iconTone])}>
                    <Icon className="size-5" />
                  </div>
                )}
                <div>
                  {title && (
                    <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
                      {title}
                    </DialogTitle>
                  )}
                  {description && (
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {description}
                    </DialogDescription>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XIcon className="size-4" />
              </button>
            </DialogHeader>
          )}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <DialogFooter className="border-t bg-muted/20 px-6 py-4 shrink-0">{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={true}
        className={cn(
          'w-[95vw] max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-xl overflow-hidden shadow-2xl border bg-background',
          sizeMap[size],
          className
        )}
      >
        {(title || Icon) && (
          <DialogHeader className="space-y-1 text-left pr-6 shrink-0 mb-3">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary border-b pb-2.5 mb-1">
              {Icon && (
                <div className={cn('p-1.5 rounded-lg shrink-0', iconToneMap[iconTone])}>
                  <Icon className="size-5 sm:size-6" />
                </div>
              )}
              <span>{title}</span>
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        <div className="flex-1 overflow-y-auto pr-1">{children}</div>

        {footer && (
          <DialogFooter className="pt-4 border-t mt-3 shrink-0 flex flex-row items-center justify-end gap-2">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HrModal;
