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

interface AttendanceQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AttendanceQRModal: React.FC<AttendanceQRModalProps> = ({ open, onOpenChange }) => {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const kioskUrl = `${baseUrl}/attendance/kiosk`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      toast.success('Attendance kiosk link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadPNG = () => {
    const svg = document.getElementById('attendance-qr-svg') as SVGSVGElement | null;
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
          downloadLink.download = 'attendance-kiosk-qr.png';
          downloadLink.href = pngFile;
          downloadLink.click();
          toast.success('Downloaded Attendance QR Code');
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

  const handlePrintStandee = () => {
    const svg = document.getElementById('attendance-qr-svg') as SVGSVGElement | null;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Attendance Kiosk Standee</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f8fafc;
      padding: 24px;
    }
    .poster-container {
      width: 480px;
      background: #ffffff;
      border: 3px solid #0f172a;
      border-radius: 20px;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .qr-frame {
      display: inline-block;
      padding: 16px;
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      margin-bottom: 20px;
    }
    .qr-frame img {
      width: 240px;
      height: 240px;
      display: block;
    }
    .scan-notice {
      font-size: 15px;
      font-weight: 700;
      color: #0284c7;
      margin-bottom: 20px;
    }
    .steps-box {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-size: 12px;
      color: #334155;
      line-height: 1.6;
      border: 1px solid #e2e8f0;
      margin-bottom: 18px;
    }
    .steps-box ol {
      padding-left: 20px;
    }
    .steps-box li {
      margin-bottom: 4px;
    }
    .url-text {
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
      word-break: break-all;
    }
    @media print {
      body { background: transparent; padding: 0; }
      .poster-container { border: 2px solid #000; box-shadow: none; margin: 0 auto; }
    }
  </style>
</head>
<body>
  <div class="poster-container">
    <div class="badge">Daftari Group · HR & Facilities</div>
    <h1>MARK ATTENDANCE</h1>
    <div class="subtitle">Quick Self-Punch & Operator Kiosk</div>

    <div class="qr-frame">
      <img src="${svgBase64}" alt="Attendance QR Code" />
    </div>

    <div class="scan-notice">📲 Scan with your Phone Camera</div>

    <div class="steps-box">
      <strong>Simple 3-Step Process:</strong>
      <ol>
        <li>Scan the QR code above with any mobile camera</li>
        <li>Search & select your name from employee directory</li>
        <li>Choose In / Out / Half Day & take a quick selfie to punch</li>
      </ol>
    </div>

    <div class="url-text">${kioskUrl}</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      toast.error('Could not open print window. Please allow popups.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 text-primary mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Attendance QR Code & Public Link</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Share this QR or link for quick direct attendance marking without login
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* QR Code Container */}
        <div className="my-3 flex flex-col items-center">
          <div className="rounded-2xl border-2 border-dashed border-border/80 bg-white p-5 shadow-xs transition-transform hover:scale-[1.01]">
            <QRCodeSVG
              id="attendance-qr-svg"
              value={kioskUrl}
              size={210}
              level="H"
              includeMargin={true}
            />
          </div>
          <span className="mt-3 text-xs font-medium text-muted-foreground text-center">
            Scan using any mobile camera or tablet to open attendance kiosk
          </span>
        </div>

        {/* Link sharing box */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Direct Access Link
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-1.5 pl-3">
            <input
              type="text"
              readOnly
              value={kioskUrl}
              className="flex-1 bg-transparent text-xs text-foreground font-mono truncate focus:outline-hidden select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0',
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </button>

          <button
            type="button"
            onClick={handlePrintStandee}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Standee
          </button>

          <a
            href={kioskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-muted hover:bg-muted/80 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceQRModal;
