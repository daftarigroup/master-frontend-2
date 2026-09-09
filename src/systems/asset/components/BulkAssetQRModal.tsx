import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { MacModal } from '@/components/ui/mac-modal';
import type { AssetProduct } from '../types';

interface BulkAssetQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: AssetProduct[];
}

export const BulkAssetQRModal: React.FC<BulkAssetQRModalProps> = ({ isOpen, onClose, products }) => {
  if (!isOpen) return null;

  const baseUrl = window.location.origin;

  const generatePDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const qrSize = 50;
    const colGap = 10;
    const rowGap = 15;
    const cols = 3;
    const labelHeight = 12;

    const contentWidth = pageWidth - 2 * margin;
    const colWidth = (contentWidth - (cols - 1) * colGap) / cols;

    let currentCol = 0;
    let yOffset = margin;

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Asset QR Codes', pageWidth / 2, yOffset + 5, { align: 'center' });
    yOffset += 15;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 15;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const productUrl = `${baseUrl}/product/${product.sn}`;

      const xPos = margin + currentCol * (colWidth + colGap);
      const centerX = xPos + colWidth / 2;

      if (yOffset + qrSize + labelHeight + rowGap > pageHeight - margin) {
        pdf.addPage();
        yOffset = margin;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 200;
      canvas.height = 200;

      const qrElement = document.getElementById(`bulk-asset-qr-${product.id}`);
      if (qrElement && ctx) {
        const svgData = new XMLSerializer().serializeToString(qrElement);
        const img = new Image();

        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 200, 200);
            ctx.drawImage(img, 0, 0, 200, 200);
            resolve();
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });

        const imgData = canvas.toDataURL('image/png');
        const qrX = centerX - qrSize / 2;
        pdf.addImage(imgData, 'PNG', qrX, yOffset, qrSize, qrSize);

        pdf.setDrawColor(200, 200, 200);
        pdf.rect(qrX - 2, yOffset - 2, qrSize + 4, qrSize + 4);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(product.sn, centerX, yOffset + qrSize + 5, { align: 'center' });

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        const maxWidth = colWidth - 5;
        let productName = product.productName;
        if (pdf.getTextWidth(productName) > maxWidth) {
          while (pdf.getTextWidth(productName + '...') > maxWidth && productName.length > 0) {
            productName = productName.slice(0, -1);
          }
          productName += '...';
        }
        pdf.text(productName, centerX, yOffset + qrSize + 10, { align: 'center' });

        pdf.setFontSize(6);
        pdf.setTextColor(100);
        let urlText = productUrl;
        if (pdf.getTextWidth(urlText) > maxWidth) {
          while (pdf.getTextWidth(urlText + '...') > maxWidth && urlText.length > 0) {
            urlText = urlText.slice(0, -1);
          }
          urlText += '...';
        }
        pdf.text(urlText, centerX, yOffset + qrSize + 14, { align: 'center' });
        pdf.setTextColor(0);
      }

      currentCol++;
      if (currentCol >= cols) {
        currentCol = 0;
        yOffset += qrSize + labelHeight + rowGap;
      }
    }

    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Total: ${products.length} assets`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    pdf.save('asset-qr-codes.pdf');
  };

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title="All Asset QR Codes"
      subtitle={`${products.length} assets`}
      icon={<FileText size={18} />}
      maxWidth="4xl"
      bodyClassName="bg-muted/20"
      footer={
        <div className="w-full space-y-2">
          <button
            onClick={generatePDF}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors"
          >
            <Download size={20} />
            Download All QR Codes as PDF
          </button>
          <p className="text-xs text-muted-foreground text-center">PDF will have 3 QR codes per row</p>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-background p-4 rounded-xl border border-border text-center">
            <QRCodeSVG id={`bulk-asset-qr-${product.id}`} value={`${baseUrl}/product/${product.sn}`} size={120} level="M" includeMargin className="mx-auto" />
            <p className="font-bold text-primary text-sm mt-2">{product.sn}</p>
            <p className="text-muted-foreground text-xs truncate">{product.productName}</p>
          </div>
        ))}
      </div>
    </MacModal>
  );
};

export default BulkAssetQRModal;
