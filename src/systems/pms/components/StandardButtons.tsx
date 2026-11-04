// @ts-nocheck
import React from 'react';
import { XCircle, Save, Check } from 'lucide-react';

/**
 * TabSwitcher Component - Standardized Tabs for Pending/History
 */
export const TabSwitcher = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex gap-2 w-full lg:w-auto flex-shrink-0 border-b lg:border-none border-gray-100 pb-2 lg:pb-0 mb-1 lg:mb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-1.5 px-4 transition text-[11px] md:text-sm rounded-md whitespace-nowrap capitalize flex items-center justify-center gap-2 ${
            activeTab === tab.id 
              ? 'bg-indigo-50 text-indigo-700 font-bold' 
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {tab.icon && <tab.icon size={14} className={activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'} />}
          {tab.label} ({tab.count || 0})
        </button>
      ))}
    </div>
  );
};

export interface FormActionButtonsProps {
  onCancel?: (e?: any) => void;
  onSubmit?: (e?: any) => void;
  cancelText?: string;
  submitText?: string;
  loading?: boolean;
  className?: string;
  formId?: string | null;
  extraButton?: React.ReactNode;
  secondarySubmitButton?: React.ReactNode;
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = ({ 
  onCancel, 
  onSubmit, 
  cancelText = 'Cancel', 
  submitText = 'Save Changes',
  loading = false,
  className = "",
  formId = null,
  extraButton = null,
  secondarySubmitButton = null
}) => {
  return (
    <div className={`flex flex-wrap sm:flex-nowrap gap-2 md:gap-3 items-center ${className}`}>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-2 md:px-4 py-2 border border-gray-200 rounded-lg text-gray-500 font-bold hover:bg-gray-50 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
      >
        <XCircle size={18} className="block md:hidden" />
        <span className="hidden md:block">{cancelText}</span>
      </button>

      {extraButton && (
        <div className="flex-1 flex w-full justify-center">
          {extraButton}
        </div>
      )}

      <button
        type={onSubmit ? "button" : "submit"}
        form={formId}
        onClick={onSubmit}
        disabled={loading}
        className="flex-[1.2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg transition-all active:scale-95 shadow-md text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="hidden md:block">Processing...</span>
          </>
        ) : (
          <>
            <Save size={18} className="block md:hidden" />
            <span className="hidden md:block">{submitText}</span>
          </>
        )}
      </button>

      {secondarySubmitButton && (
        <div className="flex-[1.4] flex items-center w-full sm:w-auto">
          {secondarySubmitButton}
        </div>
      )}
    </div>
  );
};
