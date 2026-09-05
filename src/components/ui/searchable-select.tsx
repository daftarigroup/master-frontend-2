import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
    value: string;
    label: string;
    sublabel?: string;
    keywords?: string[];
    [key: string]: any;
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

/**
 * Normalizes text for robust matching:
 * - Lowercases and trims
 * - Unifies dimension patterns (e.g. "315 x 250", "315*250" -> "315x250")
 * - Unifies metric / dimension units (e.g. "500 mm" -> "500mm")
 * - Replaces non-alphanumeric punctuation (except ., /, -, x) with spaces
 * - Collapses consecutive spaces
 */
export function normalizeSearchText(str: string): string {
    return str
        .toLowerCase()
        .replace(/(?<=\d)\s*[xX*]\s*(?=\d)/g, 'x')
        .replace(/(?<=\d)\s*(mm|cm|m|inch|in|kg|mtr|nos|pn)\b/g, '$1')
        .replace(/[^a-z0-9\s./\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Filters and ranks options based on multi-token matching:
 * - Every token in the query must be found in the label or keywords (AND matching).
 * - Excludes non-matching items completely (no fuzzy false positives).
 * - Ranks matches by relevance: exact match > prefix match > word boundary match > earlier index.
 */
export function filterAndRankOptions(options: SearchableOption[], query: string): SearchableOption[] {
    const rawQuery = query.trim();
    if (!rawQuery) return options;

    const normalizedQuery = normalizeSearchText(rawQuery);
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    if (tokens.length === 0) return options;

    const scoredItems: { option: SearchableOption; score: number }[] = [];

    for (const opt of options) {
        const normLabel = normalizeSearchText(opt.label);
        const normKeywords = (opt.keywords || []).map((k) => normalizeSearchText(k)).join(' ');
        const fullSearchableText = normKeywords ? `${normLabel} ${normKeywords}` : normLabel;

        let allTokensMatch = true;
        let tokenScore = 0;

        for (const token of tokens) {
            const labelIdx = normLabel.indexOf(token);
            const textIdx = fullSearchableText.indexOf(token);

            if (textIdx === -1) {
                allTokensMatch = false;
                break;
            }

            if (labelIdx !== -1) {
                // Word boundary check (start of string or preceded by space, dot, slash, dash, or x)
                const isWordBoundary = labelIdx === 0 || /[\s._\-/x]/.test(normLabel[labelIdx - 1]);
                tokenScore += isWordBoundary ? 120 : 40;
                // Favor earlier position in the product name
                tokenScore += Math.max(0, 60 - labelIdx);
            } else {
                // Matched in keywords (e.g. Group Head)
                tokenScore += 30;
            }
        }

        if (!allTokensMatch) continue;

        let totalScore = tokenScore;

        // Exact & prefix bonuses
        if (normLabel === normalizedQuery) {
            totalScore += 2000; // Exact match
        } else if (normLabel.startsWith(normalizedQuery)) {
            totalScore += 1000; // Prefix match
        } else {
            const fullQueryIdx = normLabel.indexOf(normalizedQuery);
            if (fullQueryIdx !== -1) {
                totalScore += 500;
                if (fullQueryIdx === 0 || /[\s._\-/x]/.test(normLabel[fullQueryIdx - 1])) {
                    totalScore += 200; // Whole query starts at word boundary
                }
            }
        }

        // Slight penalty for length difference to prioritize tighter matches
        totalScore -= Math.min(50, Math.abs(normLabel.length - normalizedQuery.length));

        scoredItems.push({ option: opt, score: totalScore });
    }

    scoredItems.sort((a, b) => b.score - a.score);
    return scoredItems.map((item) => item.option);
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
    const [search, setSearch] = useState('');

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setSearch('');
        }
    };

    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    const filteredOptions = useMemo(() => {
        return filterAndRankOptions(options, search);
    }, [options, search]);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
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
                <Command shouldFilter={false}>
                    <CommandInput
                        value={search}
                        onValueChange={setSearch}
                        placeholder={searchPlaceholder}
                        className="h-9 text-xs"
                    />
                    <CommandList className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                                {emptyText}
                            </div>
                        ) : (
                            <CommandGroup>
                                {filteredOptions.map((opt) => {
                                    const isSelected = String(opt.value) === String(value);
                                    return (
                                        <CommandItem
                                            key={opt.value}
                                            value={opt.value}
                                            onSelect={() => {
                                                onValueChange(opt.value);
                                                setOpen(false);
                                                setSearch('');
                                            }}
                                            className="text-xs py-2 cursor-pointer"
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-3.5 w-3.5 text-sky-600 shrink-0',
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
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
