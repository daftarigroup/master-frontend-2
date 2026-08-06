import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import daftariLogo from '@/assets/daftari2.png';

export default forwardRef<HTMLDivElement, { className?: string; size?: number }>(
    ({ className, size = 32 }, ref) => (
        <div
            ref={ref}
            className={cn('flex items-center justify-center', className)}
        >
            <img
                src={daftariLogo}
                alt="Logo"
                style={{ width: size, height: size }}
                className="object-contain"
            />
        </div>
    )
);
