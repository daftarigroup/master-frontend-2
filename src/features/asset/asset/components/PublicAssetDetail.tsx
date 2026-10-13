import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Hammer,
  HelpCircle,
  MapPin,
  Package,
  Printer,
  QrCode,
  Shield,
  ShieldCheck,
  Tag,
  User,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import type { Asset } from '../types/types';
import { QRCodeModal } from './QRCodeModal';

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const PublicAssetDetail: React.FC = () => {
  const { sn } = useParams<{ sn: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!sn) {
      setError('No asset identifier provided');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchPublicAsset() {
      try {
        setIsLoading(true);
        setError(null);

        // Try dedicated public endpoint first, fallback to standard assets endpoint
        let res;
        try {
          res = await api.get(`/public/assets/${encodeURIComponent(sn!)}`);
        } catch {
          res = await api.get(`/assets/${encodeURIComponent(sn!)}`);
        }

        const data = res.data?.data;
        if (data && isMounted) {
          setAsset(data);
        } else if (isMounted) {
          setError(`No asset found with code "${sn}".`);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to fetch public asset:', err);
          setError(
            err?.response?.status === 404
              ? `Asset "${sn}" could not be found.`
              : 'Unable to load asset information. Please check your network connection.'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchPublicAsset();

    return () => {
      isMounted = false;
    };
  }, [sn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center mb-4">
          <QrCode className="h-6 w-6 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Verifying Asset Tag...
        </p>
        <p className="text-xs text-slate-500 mt-1">Retrieving official equipment record</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Asset Verification Failed
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {error || 'This asset code is not registered in the system.'}
          </p>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 font-mono">Scanned: {sn}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusBg =
    asset.status === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
      : asset.status === 'Under Repair'
        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      {/* Standalone Minimalist Top Bar — No sidebars, no switchers, no logout */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Pooja Constructions
                </span>
                <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">•</span>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
                  Asset Verification Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Verified Asset</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-xs relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                {asset.category === 'Machinery' || asset.category === 'Tools' ? (
                  <Wrench className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : asset.category === 'Vehicle' ? (
                  <Package className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : (
                  <Package className="h-7 w-7 sm:h-8 sm:w-8" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-black tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {asset.sn}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
                      statusBg
                    )}
                  >
                    {asset.status}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {asset.productName}
                </h1>

                {(asset.brand || asset.model) && (
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                    {asset.brand} {asset.model ? `· ${asset.model}` : ''}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3 text-slate-400" />
                    {asset.category}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    {asset.department || 'General'}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {asset.location || 'Location Not Specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>Asset QR Tag</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Print Tag / Page"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Category</p>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {asset.category}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Asset Type</p>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {asset.type || 'Asset'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Warranty</p>
              <p
                className={cn(
                  'text-xs font-extrabold mt-0.5',
                  asset.warrantyAvailable === 'Yes'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500'
                )}
              >
                {asset.warrantyAvailable === 'Yes' ? 'Covered' : 'Not Covered'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Detail Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Product Specifications */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-blue-600" />
              <span>Product Specifications</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Asset Serial / Code</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {asset.sn}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Mfg Serial No</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.serialNo || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">SKU</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.sku || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Brand</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.brand || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Model</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.model || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Manufacture Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatDisplayDate(asset.mfgDate)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Country of Origin</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.origin || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Location & Assignment */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>Location & Assignment</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Current Location</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.location || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {asset.department || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Warranty & Maintenance */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>Warranty & Maintenance</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Warranty Coverage</span>
                <span
                  className={cn(
                    'font-bold',
                    asset.warrantyAvailable === 'Yes' ? 'text-emerald-600' : 'text-slate-400'
                  )}
                >
                  {asset.warrantyAvailable === 'Yes' ? 'Active' : 'Not Available'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Warranty Expiry</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatDisplayDate(asset.warrantyEnd)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">AMC Status</span>
                <span
                  className={cn(
                    'font-bold',
                    asset.amc === 'Yes' ? 'text-emerald-600' : 'text-slate-400'
                  )}
                >
                  {asset.amc === 'Yes' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">AMC Expiry Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatDisplayDate(asset.amcEnd)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Last Maintenance</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatDisplayDate(asset.lastMaintenanceDate)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Next Scheduled Service</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatDisplayDate(asset.nextService)}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase cost, invoice, supplier and payment details are deliberately not shown on the public page. */}
        </div>

        {/* Footer info note */}
        <div className="text-center py-6 text-xs text-slate-400">
          <p>© Pooja Constructions PMS · Equipment Tracking System</p>
          <p className="text-[11px] text-slate-400/80 mt-0.5">
            This is a verified live asset record. No login credentials are required to view this tag.
          </p>
        </div>
      </main>

      {/* Modal for QR Tag */}
      <QRCodeModal asset={asset} open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
};

export default PublicAssetDetail;
