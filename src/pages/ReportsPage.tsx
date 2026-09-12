import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  ShoppingBag,
  CreditCard,
  Landmark,
  Banknote,
  PieChart,
} from 'lucide-react';
import { DateRangeFilter, FinancialReportData } from '../types';
import { generateFinancialReport } from '../services/reportService';
import { exportSalesToExcel } from '../services/backupService';
import { getDateRangeBounds } from '../utils/dateUtils';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { formatCurrency, roundMoney } from '../utils/formatters';

interface ReportsPageProps {
  currency: string;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ currency }) => {
  const [rangeFilter, setRangeFilter] = useState<DateRangeFilter>('Today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState<FinancialReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [rangeFilter, customStart, customEnd]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const bounds = getDateRangeBounds(
        rangeFilter,
        customStart ? new Date(customStart) : undefined,
        customEnd ? new Date(customEnd) : undefined
      );

      const data = await generateFinancialReport(bounds.start, bounds.end);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!report) return;
    try {
      await exportSalesToExcel(report.completedSales, currency);
    } catch (err: any) {
      alert('Failed to export report: ' + err?.message);
    }
  };

  if (!report) return null;

  // Calculation for Payment Method Percentage Bars
  const totalPaymentSum =
    report.cashSalesTotal + report.creditSalesTotal + report.bankTransferSalesTotal || 1;
  const cashPct = Math.round((report.cashSalesTotal / totalPaymentSum) * 100);
  const creditPct = Math.round((report.creditSalesTotal / totalPaymentSum) * 100);
  const bankPct = Math.round((report.bankTransferSalesTotal / totalPaymentSum) * 100);

  return (
    <div id="reports-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Top Header & Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Financial Reports</h2>
          <p className="text-xs text-slate-500">Revenue, profit & drawer audit</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          id="export-report-excel-btn"
        >
          Export
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
            <label className="block text-[10px] text-slate-500 font-bold mb-1">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* Top High-Contrast Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total Net Sales"
          value={formatCurrency(report.totalSales, currency)}
          subtitle={`${report.totalInvoicesCount} invoices • ${report.voidedInvoicesCount} voided`}
          variant="orange"
          icon={<TrendingUp className="w-4 h-4" />}
          id="report-stat-total-sales"
        />

        <StatCard
          title="Gross Profit"
          value={formatCurrency(report.totalProfit, currency)}
          subtitle="Revenue minus item cost"
          variant="emerald"
          icon={<DollarSign className="w-4 h-4" />}
          id="report-stat-gross-profit"
        />
      </div>

      {/* Secondary Financial Ledger Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900">Financial Summary</h3>
        <div className="space-y-2 divide-y divide-slate-100">
          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-600 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
              Total Purchases (Restock)
            </span>
            <span className="font-bold text-slate-900">
              {formatCurrency(report.totalPurchases, currency)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              Total Operating Expenses
            </span>
            <span className="font-bold text-rose-600">
              -{formatCurrency(report.totalExpenses, currency)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              Net Operating Income
            </span>
            <span
              className={`font-black text-sm ${
                report.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(report.netIncome, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Payment Breakdown</h3>
          <span className="text-[11px] text-slate-400">Total: {formatCurrency(report.totalSales, currency)}</span>
        </div>

        {/* Progress distribution bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${cashPct}%` }}
            className="bg-orange-500 transition-all duration-300"
            title={`Cash: ${cashPct}%`}
          />
          <div
            style={{ width: `${creditPct}%` }}
            className="bg-amber-400 transition-all duration-300"
            title={`Credit: ${creditPct}%`}
          />
          <div
            style={{ width: `${bankPct}%` }}
            className="bg-sky-500 transition-all duration-300"
            title={`Bank: ${bankPct}%`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2 bg-orange-50/70 rounded-xl border border-orange-100">
            <div className="flex items-center gap-1 text-orange-700 font-bold text-[11px]">
              <Banknote className="w-3 h-3" />
              <span>Cash ({cashPct}%)</span>
            </div>
            <span className="text-xs font-black text-slate-900 block mt-1">
              {formatCurrency(report.cashSalesTotal, currency)}
            </span>
          </div>

          <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-100">
            <div className="flex items-center gap-1 text-amber-700 font-bold text-[11px]">
              <CreditCard className="w-3 h-3" />
              <span>Credit ({creditPct}%)</span>
            </div>
            <span className="text-xs font-black text-slate-900 block mt-1">
              {formatCurrency(report.creditSalesTotal, currency)}
            </span>
          </div>

          <div className="p-2 bg-sky-50/70 rounded-xl border border-sky-100">
            <div className="flex items-center gap-1 text-sky-700 font-bold text-[11px]">
              <Landmark className="w-3 h-3" />
              <span>Bank ({bankPct}%)</span>
            </div>
            <span className="text-xs font-black text-slate-900 block mt-1">
              {formatCurrency(report.bankTransferSalesTotal, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Top Selling Products</h3>
          <p className="text-[11px] text-slate-500">Ranked by units sold in selected period</p>
        </div>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {report.topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No product sales recorded in this period.
            </div>
          ) : (
            report.topProducts.map((p, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-900 truncate block">
                    {idx + 1}. {p.productName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {p.quantitySold} units sold
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 block">
                    {formatCurrency(p.revenue, currency)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    +{formatCurrency(p.profit, currency)} profit
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
