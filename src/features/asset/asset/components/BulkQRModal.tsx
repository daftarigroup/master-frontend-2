import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, FileText, Loader2, Printer, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Asset } from '../types/types';

interface BulkQRModalProps {
  assets: Asset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkQRModal: React.FC<BulkQRModalProps> = ({ assets, open, onOpenChange }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const hiddenCanvasContainerRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const generateA4PDF = async () => {
    if (!assets || assets.length === 0) {
      toast.error('No assets available to export');
      return;
    }

    setIsGenerating(true);
    setProgress(5);

    try {
      // Small pause to ensure hidden QR canvases are painted in DOM
      await new Promise((resolve) => setTimeout(resolve, 300));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 12;
      const colGap = 5;
      const rowGap = 6;
      const numCols = 3;
      const colWidth = (pageWidth - marginX * 2 - colGap * (numCols - 1)) / numCols; // ~60mm
      const rowHeight = 52; // mm

      let col = 0;
      let row = 0;
      let isFirstPage = true;

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const canvasId = `bulk-qr-canvas-${asset.id}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;

        if (!canvas) continue;

        // Check if next item exceeds current page height
        const currentY = marginY + row * (rowHeight + rowGap);
        if (currentY + rowHeight > pageHeight - marginY) {
          pdf.addPage();
          row = 0;
          col = 0;
        }

        const x = marginX + col * (colWidth + colGap);
        const y = marginY + row * (rowHeight + rowGap);

        // Draw tag border card
        pdf.setDrawColor(220, 226, 235); // subtle slate border
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, colWidth, rowHeight, 2.5, 2.5, 'FD');

        // Draw top tag accent
        pdf.setFillColor(37, 99, 235); // primary blue
        pdf.roundedRect(x, y, colWidth, 2, 1, 1, 'F');

        // Embed QR Code
        const qrDataUrl = canvas.toDataURL('image/png');
        const qrSize = 25; // 25x25mm
        const qrX = x + (colWidth - qrSize) / 2;
        const qrY = y + 4;
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        // Serial Number (SN)
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42); // slate-900
        const snText = asset.sn || 'ASSET';
        pdf.text(snText, x + colWidth / 2, qrY + qrSize + 4, { align: 'center' });

        // Product Name (truncated to fit)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(30, 41, 59);
        let prodName = asset.productName || '';
        if (prodName.length > 24) {
          prodName = prodName.slice(0, 22) + '...';
        }
        pdf.text(prodName, x + colWidth / 2, qrY + qrSize + 8, { align: 'center' });

        // Category & Department
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(100, 116, 139); // slate-500
        const metaText = `${asset.category} · ${asset.department || 'General'}`;
        pdf.text(metaText, x + colWidth / 2, qrY + qrSize + 11.5, { align: 'center' });

        // Location / Status Badge
        pdf.setFontSize(6);
        pdf.setTextColor(71, 85, 105);
        const locText = `Loc: ${asset.location || 'N/A'}`;
        pdf.text(locText, x + colWidth / 2, qrY + qrSize + 14.5, { align: 'center' });

        // Next grid coordinates
        col++;
        if (col >= numCols) {
          col = 0;
          row++;
        }

        setProgress(Math.round(((i + 1) / assets.length) * 100));
      }

      pdf.save(`Asset_Tags_Sheet_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`Generated A4 PDF with ${assets.length} asset QR tags`);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to generate bulk QR PDF:', err);
      toast.error('Failed to generate PDF sheet');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-600" /> Printable Asset QR Label Sheets
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate standard A4 sheets (3 tags per row) formatted for laser & sticker printers.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Selected Assets</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-bold text-foreground">{assets.length}</span> asset labels will be generated
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                A4 (3-Col Grid)
              </span>
            </div>
          </div>

          {/* Sample Preview Card */}
          <div className="border border-border/80 rounded-2xl p-4 bg-muted/20">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2.5">
              Tag Layout Preview
            </p>
            {assets.length > 0 && (
              <div className="mx-auto max-w-[200px] bg-white text-slate-900 border border-slate-300 rounded-xl p-3 text-center shadow-xs">
                <div className="h-1 w-full bg-blue-600 rounded-full mb-2" />
                <div className="mx-auto w-24 h-24 bg-white border border-slate-100 rounded-lg p-1 shadow-xs flex items-center justify-center">
                  <QRCodeCanvas
                    value={`${baseUrl}/product/${assets[0].sn}`}
                    size={88}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="font-mono text-xs font-extrabold mt-2 tracking-wider">
                  {assets[0].sn}
                </p>
                <p className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                  {assets[0].productName}
                </p>
                <p className="text-[9px] text-slate-500">
                  {assets[0].category} · {assets[0].department || 'General'}
                </p>
              </div>
            )}
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Generating A4 sheets...
                </span>
                <span className="font-bold text-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvases for offscreen rendering */}
        <div
          ref={hiddenCanvasContainerRef}
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        >
          {assets.map((asset) => (
            <QRCodeCanvas
              key={asset.id}
              id={`bulk-qr-canvas-${asset.id}`}
              value={`${baseUrl}/product/${asset.sn}`}
              size={180}
              level="M"
              includeMargin={true}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={generateA4PDF}
            disabled={isGenerating || assets.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> Download A4 PDF Sheet
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkQRModal;
