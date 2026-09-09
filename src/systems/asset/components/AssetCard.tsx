import React from 'react';
import { QrCode, Pencil } from 'lucide-react';
import type { AssetProduct } from '../types';
import { formatTimestampToDDMMYYYY } from '../utils/dateUtils';
import { calculateLiveRunningHours } from '../utils/liveHours';

interface AssetCardProps {
  product: AssetProduct;
  onShowQR: (product: AssetProduct) => void;
  onEdit: (product: AssetProduct) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ product, onShowQR, onEdit }) => (
  <div className="bg-card rounded-xl shadow-xs border border-border p-4 space-y-4">
    {/* Header: SN & Actions */}
    <div className="flex items-center justify-between">
      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">{product.sn}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(product)} className="p-2 text-muted-foreground hover:bg-muted rounded-full">
          <Pencil size={16} />
        </button>
        <button onClick={() => onShowQR(product)} className="p-2 text-primary hover:bg-primary/10 rounded-full">
          <QrCode size={16} />
        </button>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
            product.status === 'Active'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          }`}
        >
          {product.status}
        </span>
      </div>
    </div>

    {/* Title & Brand */}
    <div>
      <h3 className="font-bold text-foreground text-base leading-tight">{product.productName}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        {product.brand} • {product.model}
      </p>
    </div>

    {/* Live Running Hours Pill */}
    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs">
      <span className="text-emerald-800 dark:text-emerald-400 font-medium flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Live Running Hours
      </span>
      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
        {calculateLiveRunningHours(product.initialEntryDate, product.runningHours, product.status, product.operationalStatus)} hrs
      </span>
    </div>

    {/* 3-Column Key Stats */}
    <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-border">
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Area</p>
        <p className="text-xs font-semibold text-foreground truncate">{product.machineArea || product.location || '—'}</p>
      </div>
      <div className="text-center border-l border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dept / Div</p>
        <p className="text-xs font-semibold text-foreground truncate">{product.department || product.division || '—'}</p>
      </div>
      <div className="text-center border-l border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Value</p>
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          {product.assetValue ? `₹${product.assetValue}` : '—'}
        </p>
      </div>
    </div>

    {/* Details List */}
    <div className="space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Initial Entry:</span>
        <span className="text-foreground font-medium flex items-center gap-1">
          {formatTimestampToDDMMYYYY(product.initialEntryDate) || '—'}
          {product.isFromMachineParts && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">Machine Parts</span>
          )}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Asset Date:</span>
        <span className="text-foreground font-medium">{formatTimestampToDDMMYYYY(product.assetDate)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Warranty:</span>
        <span className={`font-medium ${product.warrantyAvailable === 'Yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
          {product.warrantyAvailable === 'Yes' ? `Yes (Till ${formatTimestampToDDMMYYYY(product.warrantyEnd)})` : 'No'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Assigned To:</span>
        <span className="text-foreground font-medium">{product.assignedTo || '—'}</span>
      </div>

      {/* Repair Highlight Section */}
      <div className="bg-muted/40 rounded-lg p-2 mt-2 space-y-1.5">
        <div className="flex justify-between items-center border-b border-border pb-1 mb-1">
          <span className="font-semibold text-muted-foreground">Repair History</span>
          <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">
            {product.repairCount || 0} Repairs
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Repair:</span>
          <span className="text-foreground">{formatTimestampToDDMMYYYY(product.lastRepairDate) || 'Never'}</span>
        </div>
        {product.repairCost ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Cost:</span>
            <span className="text-red-600 dark:text-red-400 font-medium">₹{product.repairCost}</span>
          </div>
        ) : null}
        {product.partChanged === 'Yes' && (
          <div className="pt-1">
            <span className="text-muted-foreground block mb-1">Parts Changed:</span>
            <div className="flex flex-wrap gap-1">
              {(product.partNames || []).slice(0, 3).map((p, i) => (
                <span key={i} className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded text-foreground">
                  {p}
                </span>
              ))}
              {(product.partNames?.length || 0) > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">+{(product.partNames!.length - 3)} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AssetCard;
