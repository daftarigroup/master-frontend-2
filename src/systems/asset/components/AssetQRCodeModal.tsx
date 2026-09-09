import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ExternalLink, QrCode } from 'lucide-react';
import { MacModal } from '@/components/ui/mac-modal';
import type { AssetProduct } from '../types';

interface AssetQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: AssetProduct | null;
}

export const AssetQRCodeModal: React.FC<AssetQRCodeModalProps> = ({ isOpen, onClose, product }) => {
  if (!isOpen || !product) return null;

  const baseUrl = window.location.origin;
  const productUrl = `${baseUrl}/product/${product.sn}`;

  const handleDownload = () => {
    const svg = document.getElementById('asset-qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${product.sn}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <MacModal isOpen={isOpen} onClose={onClose} title="Asset QR Code" icon={<QrCode size={18} />} maxWidth="md">
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-xl border-2 border-border shadow-xs mb-4">
          <QRCodeSVG id="asset-qr-code-svg" value={productUrl} size={200} level="M" includeMargin />
        </div>

        <div className="text-center mb-4">
          <p className="font-bold text-foreground">{product.sn}</p>
          <p className="text-muted-foreground">{product.productName}</p>
        </div>

        <div className="w-full bg-muted/40 rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Scan URL:</p>
          <div className="flex items-center gap-2">
            <a href={productUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 break-all font-mono">
              {productUrl}
            </a>
            <a href={productUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1 transition-colors" title="Open in new tab">
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Download size={18} />
          Download QR Code
        </button>

        <p className="text-xs text-muted-foreground text-center mt-3">Scan this QR code to view asset details</p>
      </div>
    </MacModal>
  );
};

export default AssetQRCodeModal;
