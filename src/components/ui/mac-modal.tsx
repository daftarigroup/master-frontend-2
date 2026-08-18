import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MacModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | string;
  showCloseButton?: boolean;
  showEscBadge?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export const MacModal: React.FC<MacModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'md',
  showCloseButton = true,
  showEscBadge = true,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  closeOnBackdropClick = true,
  closeOnEsc = true,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else if (shouldRender) {
      if (cardRef.current && backdropRef.current) {
        const tl = gsap.timeline({
          onComplete: () => {
            setShouldRender(false);
          },
        });

        tl.to(cardRef.current, {
          opacity: 0,
          scale: 0.96,
          y: -10,
          duration: 0.2,
          ease: 'power2.in',
        }).to(
          backdropRef.current,
          {
            opacity: 0,
            duration: 0.18,
            ease: 'power2.in',
          },
          '-=0.15'
        );
      } else {
        setShouldRender(false);
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  // GSAP Entrance
  useEffect(() => {
    if (shouldRender && isOpen && cardRef.current && backdropRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: 'power2.out' }
        );

        gsap.fromTo(
          cardRef.current,
          {
            opacity: 0,
            scale: 0.95,
            y: -14,
            transformOrigin: 'center center',
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: 'power3.out',
          }
        );
      });

      return () => ctx.revert();
    }
  }, [shouldRender, isOpen]);

  // ESC Listener
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc]);

  // Body Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const widthClass = maxWidthMap[maxWidth] || maxWidth;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      {/* Translucent Glass Backdrop */}
      <div
        ref={backdropRef}
        onClick={closeOnBackdropClick ? handleClose : undefined}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
      />

      {/* macOS Floating Window Card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full my-auto overflow-hidden flex flex-col',
          'bg-background/95 dark:bg-background/90 text-foreground backdrop-blur-2xl',
          'border border-white/40 dark:border-white/10 rounded-2xl md:rounded-3xl',
          'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_1px_1px_rgba(255,255,255,0.1)]',
          'ring-1 ring-black/5 dark:ring-white/10',
          widthClass,
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20 shrink-0',
              headerClassName
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h2 className="text-sm md:text-base font-bold text-foreground tracking-tight truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              {showEscBadge && (
                <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded-md border bg-muted/60 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs">
                  ESC
                </kbd>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className={cn('p-6 overflow-y-auto flex-1', bodyClassName)}>{children}</div>

        {/* Modal Footer */}
        {footer && (
          <div
            className={cn(
              'px-6 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-end gap-3 shrink-0',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MacModal;
