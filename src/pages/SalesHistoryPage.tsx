import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Download, RefreshCw, Filter } from 'lucide-react';
import { Sale, DateRangeFilter } from '../types';
import { getSales } from '../services/saleService';
import { exportSalesToExcel } from '../services/backupService';
import { getDateRangeBounds, isDateInRange } from '../utils/dateUtils';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SaleDetailModal } from '../components/sale/SaleDetailModal';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface SalesHistoryPageProps {
  currency: string;
}

export const SalesHistoryPage: React.FC<SalesHistoryPageProps> = ({ currency }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState<DateRangeFilter>('Today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const list = await getSales();
    setSales(list);
  };

  const filteredSales = useMemo(() => {
    const bounds = getDateRangeBounds(
      rangeFilter,
      customStart ? new Date(customStart) : undefined,
      customEnd ? new Date(customEnd) : undefined
    );

    return sales.filter((s) => {
      // Date filter
      const inRange = isDateInRange(s.date, bounds.start, bounds.end);
      if (!inRange) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [sales, rangeFilter, customStart, customEnd, searchQuery]);

  const handleExport = async () => {
    try {
      await exportSalesToExcel(filteredSales, currency);
    } catch (err: any) {
      alert('Failed to export sales: ' + err?.message);
    }
  };

  const totalRevenue = filteredSales
    .filter((s) => s.status === 'Completed')
    .reduce((acc, s) => acc + s.total, 0);

  const totalProfit = filteredSales
    .filter((s) => s.status === 'Completed')
    .reduce((acc, s) => acc + s.totalProfit, 0);

  return (
    <div id="sales-history-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Top Header & Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Sales Invoices</h2>
          <p className="text-xs text-slate-500">{filteredSales.length} records in view</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          id="export-sales-excel-btn"
        >
          Export Excel
        </Button>
      </div>

      {/* Date Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['Today', '7 Days', '1 Month', 'All Time', 'Custom'] as DateRangeFilter[]).map(
          (filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setRangeFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                rangeFilter === filter
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {filter}
            </button>
          )
        )}
      </div>

      {rangeFilter === 'Custom' && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1">From Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1">To Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* Summary Stat for filtered period */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-bold">
            Period Revenue
          </span>
          <span className="text-base font-black text-slate-900 block mt-0.5">
            {formatCurrency(totalRevenue, currency)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">
            Period Profit
          </span>
          <span className="text-base font-black text-emerald-600 block mt-0.5">
            +{formatCurrency(totalProfit, currency)}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          id="sales-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by invoice # or customer..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
            No invoices found for this range.
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 cursor-pointer transition-colors active:scale-99"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {sale.invoiceNumber}
                    </span>
                    <Badge
                      variant={
                        sale.status === 'Voided'
                          ? 'danger'
                          : sale.paymentMethod === 'Cash'
                          ? 'orange'
                          : sale.paymentMethod === 'Credit'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {sale.status === 'Voided' ? 'Voided' : sale.paymentMethod}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {sale.customerName ? `${sale.customerName} • ` : ''}
                    {sale.items.length} item{sale.items.length > 1 ? 's' : ''} •{' '}
                    {formatDateTime(sale.date)}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-black block ${
                      sale.status === 'Voided' ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(sale.total, currency)}
                  </span>
                  {sale.status === 'Completed' && (
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      +{formatCurrency(sale.totalProfit, currency)} profit
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Tap for item breakdown & void</span>
                <span className="text-orange-600 font-semibold">View Details →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={selectedSale}
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        currency={currency}
        onSaleUpdated={loadSales}
      />
    </div>
  );
};
