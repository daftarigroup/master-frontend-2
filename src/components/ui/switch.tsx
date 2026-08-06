import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
        };

        return (
            <label className={cn('inline-flex items-center cursor-pointer select-none', className)}>
                <input
                    type="checkbox"
                    ref={ref}
                    checked={checked}
                    onChange={handleChange}
                    className="sr-only peer"
                    {...props}
                />
                <div className="relative w-10 h-5.5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-400 dark:peer-focus:ring-sky-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:after:border-slate-600 peer-checked:bg-sky-600 transition-colors" />
            </label>
        );
    }
);
Switch.displayName = 'Switch';
