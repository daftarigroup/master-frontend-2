import React from 'react';
import { Mic } from 'lucide-react';

export type AssetInputFieldType = 'text' | 'number' | 'email' | 'date' | 'month' | 'select' | 'textarea';

interface AssetInputFieldProps {
  label: string;
  name: string;
  type?: AssetInputFieldType;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  onVoiceInput?: (fieldName: string) => void;
  isListeningField?: boolean;
}

/** Themed on CSS-variable tokens (bg-background/border-input/ring) so it follows dark mode, unlike the source module's hardcoded slate/purple. */
export const AssetInputField: React.FC<AssetInputFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  options = [],
  required = false,
  onVoiceInput,
  isListeningField,
}) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex items-center justify-between">
      <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {type !== 'select' && onVoiceInput && (
        <button
          type="button"
          onClick={() => onVoiceInput(name)}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
            isListeningField
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : 'text-primary hover:text-primary hover:bg-primary/10'
          }`}
          title={`Dictate ${label}`}
        >
          <Mic size={12} />
          <span>{isListeningField ? 'Listening...' : 'Voice'}</span>
        </button>
      )}
    </div>

    {type === 'select' ? (
      <select
        name={name}
        value={value ?? ''}
        onChange={onChange}
        className="w-full px-3.5 py-3 sm:py-2.5 bg-background border border-input rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer shadow-xs min-h-[44px]"
        required={required}
      >
        <option value="">Select {label}</option>
        {options.map((opt, idx) => (
          <option key={`${opt}-${idx}`} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        name={name}
        value={value ?? ''}
        onChange={onChange}
        rows={3}
        className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-xs resize-none"
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        className="w-full px-3.5 py-3 sm:py-2.5 bg-background border border-input rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-xs min-h-[44px]"
        placeholder={placeholder}
        required={required}
      />
    )}
  </div>
);

export default AssetInputField;
