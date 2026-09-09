import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, AlertCircle, CheckCircle, Calendar, ArrowRight, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { assetApi } from '../services/asset.api';
import type { AssetProduct } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  colorLight: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, colorLight }) => (
  <div className="bg-card p-4 sm:p-6 rounded-2xl shadow-xs border border-border relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-20 h-20 ${colorLight} rounded-bl-full opacity-50`}></div>
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground">{value}</h3>
      </div>
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

const formatValue = (val: number): string => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

export const AssetDashboard: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AssetProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    assetApi
      .getProducts()
      .then(setProducts)
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load asset dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Dashboard...</div>;

  const totalProducts = products.length;
  const activeAssets = products.filter((p) => p.status === 'Active').length;
  const maintenanceDue = products.filter((p) => p.maintenanceRequired === 'Yes').length;
  const totalValue = products.reduce((sum, p) => sum + (parseInt(String(p.cost)) || 0), 0);

  const stats: StatCardProps[] = [
    { title: 'Total Assets', value: totalProducts, icon: Package, color: 'bg-slate-500', colorLight: 'bg-slate-100/50 dark:bg-slate-500/10' },
    { title: 'Active Assets', value: activeAssets, icon: CheckCircle, color: 'bg-emerald-500', colorLight: 'bg-emerald-100/50 dark:bg-emerald-500/10' },
    { title: 'Maintenance Due', value: maintenanceDue, icon: AlertCircle, color: 'bg-rose-500', colorLight: 'bg-rose-100/50 dark:bg-rose-500/10' },
    { title: 'Total Value', value: formatValue(totalValue), icon: TrendingUp, color: 'bg-slate-600', colorLight: 'bg-slate-200/50 dark:bg-slate-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-slate-600/10 flex items-center justify-center border border-slate-300 dark:border-slate-700">
            <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Welcome back,</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{user?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-700/80 dark:text-slate-400 text-sm mt-4 font-medium">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link
          to="/asset/products"
          className="bg-card p-4 rounded-xl shadow-xs border border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
            <Package size={24} className="text-slate-600 dark:text-slate-300" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">Add Asset</h4>
          <p className="text-xs text-muted-foreground">Add new inventory</p>
        </Link>
        <Link
          to="/asset/products"
          className="bg-card p-4 rounded-xl shadow-xs border border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
            <QrCode size={24} className="text-slate-600 dark:text-slate-300" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">Scan QR</h4>
          <p className="text-xs text-muted-foreground">View asset details</p>
        </Link>
      </div>

      {/* Recent Assets */}
      <div className="bg-card rounded-2xl shadow-xs border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">Recent Assets</h3>
          <Link to="/asset/products" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="divide-y divide-border">
            {products.slice(-5).reverse().map((product) => (
              <div key={product.id} className="p-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{product.productName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-1.5">
                      <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{product.sn}</span>
                      <span className="text-xs text-muted-foreground">{product.category}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                      product.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{product.brand}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                  <span>₹{(parseInt(String(product.cost)) || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Package size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p>No assets found.</p>
            <Link to="/asset/products" className="text-primary text-sm hover:underline mt-2 inline-block">
              Add your first asset
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats Summary - Mobile Only */}
      <div className="sm:hidden bg-muted/40 rounded-2xl p-4">
        <p className="text-sm text-muted-foreground text-center">
          You have <span className="font-bold text-foreground">{activeAssets}</span> active assets worth{' '}
          <span className="font-bold text-foreground">{formatValue(totalValue)}</span>
        </p>
      </div>
    </div>
  );
};

export default AssetDashboard;
