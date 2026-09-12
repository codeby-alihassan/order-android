import React, { useState, useEffect, useMemo } from 'react';
import { Search, Boxes, AlertTriangle, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Product, StockBadgeStatus } from '../types';
import { getProducts, getStockStatus } from '../services/productService';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { StockAdjustModal } from '../components/stock/StockAdjustModal';
import { formatCurrency, roundMoney } from '../utils/formatters';

interface StockPageProps {
  currency: string;
}

export const StockPage: React.FC<StockPageProps> = ({ currency }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | StockBadgeStatus>('ALL');
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    const list = await getProducts();
    setProducts(list);
  };

  const filteredList = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === 'ALL') return true;
      const status = getStockStatus(p);
      return status === filterStatus;
    });
  }, [products, searchQuery, filterStatus]);

  // Inventory Totals
  const totalCostValue = roundMoney(
    products.reduce((acc, p) => acc + p.costPrice * p.currentStock, 0)
  );
  const totalRetailValue = roundMoney(
    products.reduce((acc, p) => acc + p.sellingPrice * p.currentStock, 0)
  );
  const lowStockCount = products.filter(
    (p) => p.currentStock <= p.lowStockThreshold && p.currentStock > 0
  ).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  return (
    <div id="stock-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Inventory Valuation Summary Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Valuation</h3>
              <p className="text-[11px] text-slate-500">{products.length} catalog items</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadStock}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
            title="Refresh inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">
              Total Cost Value
            </span>
            <span className="text-sm font-black text-slate-900 block mt-0.5">
              {formatCurrency(totalCostValue, currency)}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">
              Total Retail Value
            </span>
            <span className="text-sm font-black text-orange-600 block mt-0.5">
              {formatCurrency(totalRetailValue, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          id="stock-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter stock by name or code..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterStatus('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            filterStatus === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
          }`}
        >
          All ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('Low Stock')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            filterStatus === 'Low Stock'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:border-amber-300'
          }`}
        >
          Low Stock ({lowStockCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('Out of Stock')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            filterStatus === 'Out of Stock'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white text-rose-700 border border-rose-200 hover:border-rose-300'
          }`}
        >
          Out of Stock ({outOfStockCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('In Stock')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            filterStatus === 'In Stock'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:border-emerald-300'
          }`}
        >
          In Stock
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No stock matches your search filter.
          </div>
        ) : (
          filteredList.map((product) => {
            const status = getStockStatus(product);
            const costVal = roundMoney(product.costPrice * product.currentStock);
            const retailVal = roundMoney(product.sellingPrice * product.currentStock);

            return (
              <div
                key={product.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>{product.code}</span>
                      <span>•</span>
                      <span>Threshold: {product.lowStockThreshold}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      status === 'In Stock'
                        ? 'success'
                        : status === 'Low Stock'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Quantity</span>
                    <span className="font-bold text-sm text-slate-900">
                      {product.currentStock} units
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Valuation</span>
                    <span className="font-semibold text-xs text-slate-700">
                      {formatCurrency(costVal, currency)} cost / {formatCurrency(retailVal, currency)} retail
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    fullWidth
                    onClick={() => setSelectedProductForAdjust(product)}
                    leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                    id={`adjust-btn-${product.code}`}
                  >
                    Adjust Stock Count
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        product={selectedProductForAdjust}
        isOpen={Boolean(selectedProductForAdjust)}
        onClose={() => setSelectedProductForAdjust(null)}
        onAdjusted={loadStock}
      />
    </div>
  );
};
