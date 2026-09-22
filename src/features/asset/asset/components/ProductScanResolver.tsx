import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, QrCode } from 'lucide-react';
import { api } from '@/lib/axios';

export const ProductScanResolver: React.FC = () => {
  const { sn } = useParams<{ sn: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sn) {
      setError('No asset serial number provided in scan URL');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function resolveAsset() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get(`/assets/${encodeURIComponent(sn!)}`);
        const asset = res.data?.data;

        if (asset && asset.id && isMounted) {
          navigate(`/asset/asset/${asset.id}`, { replace: true });
        } else if (isMounted) {
          setError(`Asset "${sn}" was not found in the system.`);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to resolve scanned asset:', err);
          setError(
            err?.response?.data?.message ||
              `Could not locate asset with code "${sn}". Please verify the tag or check your network connection.`
          );
          setIsLoading(false);
        }
      }
    }

    resolveAsset();

    return () => {
      isMounted = false;
    };
  }, [sn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-lg text-center">
        {isLoading ? (
          <div className="py-8 space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <QrCode className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">Resolving Asset Tag</h2>
              <p className="text-xs text-muted-foreground">
                Looking up serial code <span className="font-mono font-bold text-foreground">{sn}</span>...
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mt-2" />
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">Asset Not Found</h2>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                to="/asset/assets"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Go to All Assets
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ProductScanResolver;
