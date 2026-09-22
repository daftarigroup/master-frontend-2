import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, Printer, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Asset } from '../types/types';

interface QRCodeModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ asset, open, onOpenChange }) => {
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const baseUrl = window.location.origin;
  const productUrl = `${baseUrl}/product/${asset.sn}`;

  const handleDownloadPNG = () => {
    const svg = document.getElementById('qr-code-svg') as SVGSVGElement | null;
    if (!svg) {
      toast.error('QR code element not found');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = `QR-${asset.sn}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
          toast.success(`Downloaded QR code for ${asset.sn}`);
        }
      };

      img.onerror = () => {
        toast.error('Failed to convert QR code to image');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Could not download QR code');
    }
  };

  const handlePrintTag = () => {
    const svg = document.getElementById('qr-code-svg') as SVGSVGElement | null;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Asset Tag - ${asset.sn}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #ffffff;
      padding: 20px;
    }
    .tag-container {
      border: 2px solid #0f172a;
      border-radius: 12px;
      padding: 20px 16px;
      width: 320px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      background: #ffffff;
    }
    .qr-img {
      width: 150px;
      height: 150px;
      margin: 0 auto 12px;
      display: block;
    }
    .tag-sn {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-bottom: 4px;
    }
    .tag-name {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
      line-height: 1.25;
    }
    .tag-brand {
      font-size: 12px;
      color: #475569;
      margin-bottom: 8px;
    }
    .tag-meta {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 3px;
    }
    .tag-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 12px;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #0f172a;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tag-url {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 10px;
      word-break: break-all;
      font-family: monospace;
    }
    @media print {
      @page { margin: 8mm; size: auto; }
      body { padding: 0; }
      .tag-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="tag-container">
    <img class="qr-img" src="${svgBase64}" alt="QR Code" />
    <div class="tag-sn">${asset.sn}</div>
    <div class="tag-name">${asset.productName}</div>
    ${asset.brand || asset.model ? `<div class="tag-brand">${asset.brand || ''} ${asset.model ? '· ' + asset.model : ''}</div>` : ''}
    <div class="tag-meta">${asset.category} · ${asset.department || 'General'}</div>
    <div class="tag-meta">Location: ${asset.location || 'N/A'}</div>
    <div class="tag-badge">${asset.status}</div>
    <div class="tag-url">${productUrl}</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 200);
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      toast.error('Please allow popups to print asset tag');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      toast.success('Scan URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" /> Asset Tag & QR Code
          </DialogTitle>
          <DialogDescription className="text-xs">
            Scan this QR code with any mobile camera to view and verify live asset details.
          </DialogDescription>
        </DialogHeader>

        {/* Asset Tag Card Container */}
        <div className="flex flex-col items-center justify-center p-5 bg-muted/30 rounded-2xl border border-border/80">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <QRCodeSVG
              id="qr-code-svg"
              value={productUrl}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>

          <div className="mt-4 text-center w-full max-w-xs">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-sm font-bold tracking-wider">
              {asset.sn}
            </div>

            <p className="text-sm font-bold text-foreground mt-2 line-clamp-1">
              {asset.productName}
            </p>

            {(asset.brand || asset.model) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {asset.brand} {asset.model ? `· ${asset.model}` : ''}
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap text-[11px] text-muted-foreground">
              <span>{asset.category}</span>
              <span>•</span>
              <span>{asset.department || 'General'}</span>
              <span>•</span>
              <span>{asset.location || 'N/A'}</span>
            </div>

            <div className="mt-2.5">
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border',
                  asset.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : asset.status === 'Under Repair'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {asset.status}
              </span>
            </div>

            {/* Encoded URL info */}
            <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono truncate text-left select-all" title={productUrl}>
                {productUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                title="Copy URL"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" /> Download PNG
          </button>
          <button
            type="button"
            onClick={handlePrintTag}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Tag
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
