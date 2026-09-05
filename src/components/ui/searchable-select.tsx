import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
    value: string;
    label: string;
    sublabel?: string;
}

interface SearchableSelectProps {
    options: SearchableOption[];
    value?: string;
    onValueChange: (val: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search option...',
    emptyText = 'No options found',
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);

    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between h-9 px-3 text-xs font-normal border-slate-200 dark:border-slate-800 bg-background hover:bg-accent/50 transition-colors',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : (value || placeholder)}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 z-50 shadow-md" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} className="h-9 text-xs" />
                    <CommandList className="max-h-60 overflow-y-auto">
                        <CommandEmpty className="py-2.5 text-center text-xs text-muted-foreground">
                            {emptyText}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => {
                                const isSelected = String(opt.value) === String(value);
                                return (
                                    <CommandItem
                                        key={opt.value}
                                        value={`${opt.label} ${opt.sublabel || ''} ${opt.value}`}
                                        onSelect={() => {
                                            onValueChange(opt.value);
                                            setOpen(false);
                                        }}
                                        className="text-xs py-2 cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-3.5 w-3.5 text-sky-600',
                                                isSelected ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <div className="flex flex-col truncate">
                                            <span className="font-medium text-foreground">{opt.label}</span>
                                            {opt.sublabel && (
                                                <span className="text-[10px] text-muted-foreground">{opt.sublabel}</span>
                                            )}
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
