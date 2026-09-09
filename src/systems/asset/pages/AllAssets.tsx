import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Filter, RefreshCw, QrCode, FileText, Pencil, FileSpreadsheet, X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { assetApi } from '../services/asset.api';
import type { AssetProduct } from '../types';
import { formatTimestampToDDMMYYYY } from '../utils/dateUtils';
import { calculateLiveRunningHours } from '../utils/liveHours';
import { exportAssetsToExcel } from '../utils/exportUtils';
import { AssetCard } from '../components/AssetCard';
import { AddAssetModal } from '../components/AddAssetModal';
import { QuickAddAssetModal } from '../components/QuickAddAssetModal';
import { AssetQRCodeModal } from '../components/AssetQRCodeModal';
import { BulkAssetQRModal } from '../components/BulkAssetQRModal';

export const AllAssets: React.FC = () => {
  const [products, setProducts] = useState<AssetProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setTick] = useState(0);

  const loadProducts = () => {
    setIsLoading(true);
    return assetApi
      .getProducts()
      .then(setProducts)
      .catch((err) => {
        console.error(err);
        toast.error('Error fetching assets.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Live tick to keep running-hour calculations moving in real time.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isBulkQROpen, setIsBulkQROpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AssetProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<AssetProduct | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [productNameFilter, setProductNameFilter] = useState('all');

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.department?.trim()) set.add(p.department.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const divisionOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.division?.trim()) set.add(p.division.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const productNameOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.productName?.trim()) set.add(p.productName.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [
        product.productName,
        product.sn,
        product.category,
        product.brand,
        product.model,
        product.sku,
        product.department,
        product.division,
        product.location,
        product.assignedTo,
      ].some((field) => field?.toLowerCase().includes(term));

    const matchesDepartment = departmentFilter === 'all' || product.department === departmentFilter;
    const matchesDivision = divisionFilter === 'all' || product.division === divisionFilter;
    const matchesProductName = productNameFilter === 'all' || product.productName === productNameFilter;

    return matchesSearch && matchesDepartment && matchesDivision && matchesProductName;
  });

  const hasActiveFilters = Boolean(searchTerm || departmentFilter !== 'all' || divisionFilter !== 'all' || productNameFilter !== 'all');

  const handleClearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setDivisionFilter('all');
    setProductNameFilter('all');
  };

  const handleExportExcel = () => {
    if (!filteredProducts.length) {
      toast.error('No assets available to export');
      return;
    }
    const count = exportAssetsToExcel(filteredProducts);
    toast.success(`Exported ${count} assets to Excel`);
  };

  const handleReloadDummy = () => {
    if (confirm('This will reset all assets back to the sample dataset. Continue?')) {
      assetApi.resetMockData();
      loadProducts();
      toast.success('Sample asset data reloaded');
    }
  };

  const handleShowQR = (product: AssetProduct) => {
    setSelectedProduct(product);
    setIsQRModalOpen(true);
  };

  const handleEditProduct = (product: AssetProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleOpenFullDetailsFromQuickAdd = (newProduct: AssetProduct) => {
    setEditingProduct(newProduct);
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    loadProducts();
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading assets...</div>;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
          <div className="hidden lg:flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">All Assets</h1>
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
              {filteredProducts.length} of {products.length} Assets
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={handleReloadDummy}
              className="bg-card hover:bg-muted text-muted-foreground p-2.5 rounded-xl flex items-center justify-center transition-colors border border-border shadow-xs cursor-pointer"
              title="Reload Sample Data"
            >
              <RefreshCw size={19} />
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-emerald-200 dark:border-emerald-500/20 shadow-xs font-semibold text-xs sm:text-sm cursor-pointer"
              title="Download all assets to Excel"
            >
              <FileSpreadsheet size={18} />
              <span>Excel Download</span>
            </button>

            <button
              onClick={() => setIsBulkQROpen(true)}
              className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors border border-primary/20 shadow-xs font-semibold text-xs sm:text-sm cursor-pointer"
              title="Generate QR PDF"
            >
              <FileText size={18} />
              <span className="hidden sm:inline">QR PDF</span>
            </button>

            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex-1 lg:flex-none bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors font-medium cursor-pointer text-xs sm:text-sm"
            >
              <Plus size={18} />
              <span>Add Asset</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-card p-2.5 sm:p-3 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by name, SN, brand, model, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-background rounded-xl border border-input focus:border-primary text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className={`w-full px-3 py-2 pr-7 text-xs sm:text-sm font-semibold rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all ${
                  departmentFilter !== 'all' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background hover:bg-muted border-input text-foreground'
                }`}
              >
                <option value="all">All Departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className={`w-full px-3 py-2 pr-7 text-xs sm:text-sm font-semibold rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all ${
                  divisionFilter !== 'all' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background hover:bg-muted border-input text-foreground'
                }`}
              >
                <option value="all">All Divisions</option>
                {divisionOptions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
              <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={productNameFilter}
                onChange={(e) => setProductNameFilter(e.target.value)}
                className={`w-full px-3 py-2 pr-7 text-xs sm:text-sm font-semibold rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all ${
                  productNameFilter !== 'all' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background hover:bg-muted border-input text-foreground'
                }`}
              >
                <option value="all">All Assets</option>
                {productNameOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl border border-red-200 dark:border-red-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 space-y-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <AssetCard key={product.id} product={product} onShowQR={handleShowQR} onEdit={handleEditProduct} />
          ))
        ) : (
          <div className="bg-card rounded-xl p-8 text-center text-muted-foreground border border-border">No assets found.</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col bg-card rounded-xl shadow-xs border border-border overflow-hidden">
        <div className="flex-1 overflow-auto w-full relative">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 sticky left-0 top-0 z-30 bg-muted/50">Actions</th>
                <th className="px-4 py-3">Serial No</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Mfg Date</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5">
                  Live Running Hours
                </th>
                <th className="px-4 py-3">Initial Entry</th>
                <th className="px-4 py-3">Asset Date</th>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Division</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Machine Area</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Responsible</th>
                <th className="px-4 py-3">Warranty</th>
                <th className="px-4 py-3">AMC</th>
                <th className="px-4 py-3">Maintenance</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Last Repair</th>
                <th className="px-4 py-3 text-right">Last Cost</th>
                <th className="px-4 py-3">Part Chg?</th>
                <th className="px-4 py-3 text-center">Count</th>
                <th className="px-4 py-3 text-right">Total Cost</th>
                <th className="px-4 py-3 text-right">Asset Value</th>
                <th className="px-4 py-3">Dep. Method</th>
                <th className="px-4 py-3">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-card flex items-center gap-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Edit Asset"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleShowQR(product)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="View QR Code"
                      >
                        <QrCode size={18} />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">{product.sn}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{product.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.brand}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.model}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTimestampToDDMMYYYY(product.mfgDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.origin}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right bg-emerald-50/20 dark:bg-emerald-500/5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {calculateLiveRunningHours(product.initialEntryDate, product.runningHours, product.status, product.operationalStatus)} hrs
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{formatTimestampToDDMMYYYY(product.initialEntryDate) || '—'}</span>
                        {product.isFromMachineParts ? (
                          <span className="text-[10px] text-primary font-semibold">From Machine Parts</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Direct Entry</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTimestampToDDMMYYYY(product.assetDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.invoiceNo}</td>
                    <td className="px-4 py-3 text-right text-foreground">₹{product.cost}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.paymentMode}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.location || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.division || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.department || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.machineArea || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.assignedTo || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.responsiblePerson || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.warrantyAvailable}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.amc}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.maintenanceRequired}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.priority || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTimestampToDDMMYYYY(product.lastRepairDate)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{product.repairCost ? `₹${product.repairCost}` : '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.partChanged}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{product.repairCount}</td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">₹{product.totalRepairCost || 0}</td>
                    <td className="px-4 py-3 text-right text-foreground">₹{product.assetValue}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.depMethod}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.createdBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={35} className="px-4 py-12 text-center text-muted-foreground">
                    No assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuickAddAssetModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSaved={handleSaved}
        onOpenFullDetails={handleOpenFullDetailsFromQuickAdd}
      />
      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={handleSaved} product={editingProduct} />
      <AssetQRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} product={selectedProduct} />
      <BulkAssetQRModal isOpen={isBulkQROpen} onClose={() => setIsBulkQROpen(false)} products={products} />
    </div>
  );
};

export default AllAssets;
