'use client';

import { IconDownload, IconPrinter, IconQrcode, IconX } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { CandidateFieldConfig } from '../../findEnquiry/components/AddEnquiryModal';
import { ModalPortal } from '../../_shared/components';
import type { Indent } from '../types/types';

interface QrCodeModalProps {
  indent: Indent;
  onClose: () => void;
}

const FIELD_CONFIG_STORAGE_KEY = 'hr-candidate-field-config';

const FIELD_ORDER: (keyof CandidateFieldConfig)[] = [
  'dob',
  'email',
  'previousCompany',
  'previousPosition',
  'experience',
  'maritalStatus',
  'aadharNo',
  'lastSalary',
  'reasonForLeaving',
  'currentAddress',
  'photo',
  'resume',
];

const DEFAULT_CONFIG: CandidateFieldConfig = {
  dob: true,
  email: false,
  previousCompany: false,
  previousPosition: false,
  experience: false,
  maritalStatus: false,
  aadharNo: false,
  lastSalary: false,
  reasonForLeaving: false,
  currentAddress: false,
  photo: false,
  resume: false,
};

const encodeConfig = (cfg: CandidateFieldConfig): string =>
  FIELD_ORDER.map((k) => (cfg[k] ? '1' : '0')).join('');

const QrCodeModal: React.FC<QrCodeModalProps> = ({ indent, onClose }) => {
  const [applyUrl, setApplyUrl] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cfg = DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY);
      if (stored)
        cfg = { ...DEFAULT_CONFIG, ...(JSON.parse(stored) as Partial<CandidateFieldConfig>) };
    } catch {
      /* empty */
    }
    const encoded = encodeConfig(cfg);
    setApplyUrl(`${window.location.origin}/apply/${indent.id}?cfg=${encoded}`);
  }, [indent.id]);

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${indent.recordId ?? indent.id}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const svg = svgRef.current;
    if (!svg || !applyUrl) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!doctype html><html><head>
      <title>QR Code — ${indent.title}</title>
      <style>
        body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
        .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; text-align: center; max-width: 340px; }
        h1 { font-size: 18px; font-weight: 700; margin: 16px 0 4px; }
        p { font-size: 12px; color: #6b7280; margin: 4px 0; }
        .ref { font-family: monospace; font-size: 11px; color: #9ca3af; margin-bottom: 20px; }
        .url { font-size: 10px; color: #9ca3af; word-break: break-all; margin-top: 16px; }
      </style></head><body>
      <div class="card">
        <div>${svgStr}</div>
        <h1>${indent.title}</h1>
        <p class="ref">${indent.recordId ?? ''}</p>
        <p>Scan to apply for this position</p>
        <p class="url">${applyUrl}</p>
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="QR Code"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconQrcode className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-bold leading-tight">Candidate Apply QR</h2>
              <p className="truncate text-[11px] text-muted-foreground">
                {indent.recordId && <span className="font-mono">{indent.recordId} · </span>}
                {indent.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-4 py-6 sm:px-6 sm:py-8">
          <div className="w-full max-w-[200px] rounded-xl border border-border bg-white p-3 shadow-sm sm:p-4">
            {applyUrl ? (
              <QRCodeSVG
                ref={svgRef}
                value={applyUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin={false}
                className="h-auto w-full"
              />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Scan to open the candidate application form · field requirements reflect current
            settings
          </p>
          {applyUrl && (
            <p className="max-w-full break-all rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-[10px] text-muted-foreground">
              {applyUrl}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!applyUrl}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10 disabled:opacity-50"
          >
            <IconDownload className="h-3.5 w-3.5" />
            Download SVG
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!applyUrl}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <IconPrinter className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);
};

export default QrCodeModal;
