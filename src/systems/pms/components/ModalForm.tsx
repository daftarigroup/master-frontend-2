// @ts-nocheck
import React from 'react';
import { FormActionButtons } from './StandardButtons';

/**
 * ModalForm Component
 *
 * - No Cross (X) icon.
 * - Maintains fixed dimensions and invisible scrollbar.
 */
const ModalForm = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  maxWidth = 'max-w-2xl',
  zIndex = 'z-[100]',
  extraFooterAction = null,
  secondarySubmitButton = null
}) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center ${zIndex} p-3 md:p-4 animate-in fade-in duration-200`}>
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header - No Cross Icon */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-center bg-white flex-shrink-0 z-20">
          <h2 className="text-xs md:text-base font-black text-gray-800 uppercase tracking-widest text-center">{title}</h2>
        </div>

        {/* Scrollable Body */}
        <div
          className="flex-1 overflow-y-auto bg-white min-h-0 z-10"
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          {/* Webkit scrollbar hiding */}
          <style dangerouslySetInnerHTML={{
            __html: `
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}} />

          <div className="px-4 py-3 md:px-6 md:py-4 no-scrollbar">
            <form id="ultra-compact-form" onSubmit={onSubmit} className="space-y-2.5 md:space-y-3 text-left">
              {children}
            </form>
          </div>
        </div>

        {/* Standardized Footer Buttons */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex-shrink-0 z-20">
          <FormActionButtons
            onCancel={onClose}
            cancelText={cancelText}
            submitText={submitText}
            className="w-full"
            formId="ultra-compact-form"
            extraButton={extraFooterAction}
            secondarySubmitButton={secondarySubmitButton}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalForm;
