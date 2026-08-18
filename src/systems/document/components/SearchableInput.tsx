import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface SearchableInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
}

export const SearchableInput: React.FC<SearchableInputProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select or type...',
  required = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (showAll) return options;
    return options.filter((opt) => opt.toLowerCase().includes((value || '').toLowerCase()));
  }, [options, value, showAll]);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const updatePosition = () => {
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          setCoords({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const dropdownEl = document.getElementById('searchable-dropdown-portal');
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        dropdownEl &&
        !dropdownEl.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowAll(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setShowAll(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowAll(false);
    if (!isOpen) setIsOpen(true);
  };

  const inputClasses = compact
    ? 'w-full p-2 pr-8 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary outline-none transition text-xs'
    : 'w-full p-2.5 pr-10 bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary outline-none transition text-xs';

  const labelClasses = compact
    ? 'block text-xs font-semibold text-foreground/80 mb-1'
    : 'block text-xs font-semibold text-foreground/80 mb-1';

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={labelClasses}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={inputClasses}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setShowAll(false);
            } else {
              inputRef.current?.focus();
              setIsOpen(true);
              setShowAll(true);
            }
          }}
        >
          <ChevronDown size={compact ? 14 : 16} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            id="searchable-dropdown-portal"
            className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto"
            style={{
              top: `${coords.top + 4}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-accent text-foreground hover:text-foreground flex items-center justify-between transition-colors ${
                    compact ? 'text-xs' : 'text-xs'
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  <span>{option}</span>
                  {value === option && <Check size={14} className="text-primary" />}
                </button>
              ))
            ) : (
              <div className={`p-3 text-center text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
                {value ? 'Press enter to use custom value' : 'No options found'}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableInput;
