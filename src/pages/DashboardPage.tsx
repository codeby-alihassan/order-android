import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Receipt,
  AlertTriangle,
  CreditCard,
  Landmark,
  PlusCircle,
  ShoppingCart,
  ShoppingBag,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Sale, Product, CounterSession, Expense } from '../types';
import { getSales } from '../services/saleService';
import { getExpenses } from '../services/expenseService';
import { getLowStockProducts } from '../services/stockService';
import { getActiveCounterSession, getCurrentCashInDrawer } from '../services/counterService';
import { isDateInBusinessDay } from '../utils/dateUtils';
import { formatCurrency, formatTimeOnly, roundMoney } from '../utils/formatters';

interface DashboardPageProps {
  currency: string;
  onNavigateToBilling: () => void;
  onNavigateToStock: () => void;
  onNavigateToPurchases: () => void;
  onNavigateToExpenses: () => void;
  onNavigateToCounter: () => void;
  onOpenCounterRequested: () => void;
  onCloseCounterRequested: () => void;
  onSelectSale: (sale: Sale) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currency,
  onNavigateToBilling,
  onNavigateToStock,
  onNavigateToPurchases,
  onNavigateToExpenses,
  onNavigateToCounter,
  onOpenCounterRequested,
  onCloseCounterRequested,
  onSelectSale,
}) => {
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [activeCounter, setActiveCounter] = useState<CounterSession | null>(null);
  const [currentDrawerCash, setCurrentDrawerCash] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const todayDate = new Date();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [allSales, allExpenses, lowStock, counter, cash] = await Promise.all([
        getSales(),
        getExpenses(),
        getLowStockProducts(),
        getActiveCounterSession(),
        getCurrentCashInDrawer(),
      ]);

      // Strict Business-Day Rule: Only sales & expenses occurring today (midnight to midnight)
      const filteredTodaySales = allSales.filter((s) =>
        isDateInBusinessDay(s.date, todayDate)
      );
      const filteredTodayExpenses = allExpenses.filter((e) =>
        isDateInBusinessDay(e.date, todayDate)
      );

      setTodaySales(filteredTodaySales);
      setTodayExpenses(filteredTodayExpenses);
      setLowStockItems(lowStock);
      setActiveCounter(counter);
      setCurrentDrawerCash(cash);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics for Today
  const completedTodaySales = todaySales.filter((s) => s.status === 'Completed');
  const todayTotalSales = roundMoney(
    completedTodaySales.reduce((acc, s) => acc + s.total, 0)
  );
  const todayTotalProfit = roundMoney(
    completedTodaySales.reduce((acc, s) => acc + s.totalProfit, 0)
  );
  const todayTotalExpenses = roundMoney(
    todayExpenses.reduce((acc, e) => acc + e.amount, 0)
  );

  const todayCashSales = roundMoney(
    completedTodaySales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((acc, s) => acc + s.total, 0)
  );

  const todayCreditSales = roundMoney(
    completedTodaySales
      .filter((s) => s.paymentMethod === 'Credit')
      .reduce((acc, s) => acc + s.total, 0)
  );

  const todayBankSales = roundMoney(
    completedTodaySales
      .filter((s) => s.paymentMethod === 'Bank Transfer')
      .reduce((acc, s) => acc + s.total, 0)
  );

  return (
    <div id="dashboard-page" className="p-4 space-y-4 max-w-md mx-auto">
      {/* Quick Status / Shift Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Counter Status
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeCounter ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-bold text-slate-900">
              {activeCounter ? `OPEN (Session #${activeCounter.sessionNumber})` : 'CLOSED'}
            </span>
          </div>
        </div>

        <div>
          {activeCounter ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onCloseCounterRequested}
              id="dashboard-close-counter-btn"
            >
              Close Drawer
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenCounterRequested}
              id="dashboard-open-counter-btn"
            >
              Open Drawer
            </Button>
          )}
        </div>
      </div>

      {/* Main KPI Stat Cards (Vertical stacked and 2-col responsive) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Sales */}
        <StatCard
          title="Today's Sales"
          value={formatCurrency(todayTotalSales, currency)}
          subtitle={`${completedTodaySales.length} invoices today`}
          variant="orange"
          icon={<TrendingUp className="w-4 h-4" />}
          id="stat-today-sales"
        />

        {/* Today's Profit */}
        <StatCard
          title="Today's Profit"
          value={formatCurrency(todayTotalProfit, currency)}
          subtitle="Sale price - Cost price"
          variant="emerald"
          icon={<DollarSign className="w-4 h-4" />}
          id="stat-today-profit"
        />

        {/* Cash in Drawer */}
        <StatCard
          title="Cash in Drawer"
          value={formatCurrency(currentDrawerCash, currency)}
          subtitle={activeCounter ? 'Available cash float' : 'Drawer is closed'}
          variant="amber"
          icon={<Wallet className="w-4 h-4" />}
          onClick={onNavigateToCounter}
          id="stat-drawer-cash"
        />

        {/* Today's Expenses */}
        <StatCard
          title="Today's Expenses"
          value={formatCurrency(todayTotalExpenses, currency)}
          subtitle={`${todayExpenses.length} entries recorded`}
          variant="rose"
          icon={<Receipt className="w-4 h-4" />}
          onClick={onNavigateToExpenses}
          id="stat-today-expenses"
        />
      </div>

      {/* Secondary Row: Credit, Bank, Low Stock */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div
          onClick={onNavigateToBilling}
          className="bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer active:scale-95 transition-all"
        >
          <span className="text-[10px] font-semibold text-slate-500 uppercase block truncate">
            Today Credit
          </span>
          <span className="text-sm font-bold text-slate-800 block mt-1">
            {formatCurrency(todayCreditSales, currency)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-500 uppercase block truncate">
            Today Bank
          </span>
          <span className="text-sm font-bold text-slate-800 block mt-1">
            {formatCurrency(todayBankSales, currency)}
          </span>
        </div>

        <div
          onClick={onNavigateToStock}
          className={`p-3 rounded-2xl border cursor-pointer active:scale-95 transition-all ${
            lowStockItems.length > 0
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <span className="text-[10px] font-semibold uppercase block truncate">
            Low Stock
          </span>
          <span className="text-sm font-bold block mt-1">
            {lowStockItems.length} items
          </span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Quick Actions
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={onNavigateToBilling}
            leftIcon={<ShoppingCart className="w-4 h-4" />}
            id="quick-action-new-sale"
          >
            Start Sale
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={onNavigateToPurchases}
            leftIcon={<ShoppingBag className="w-4 h-4 text-emerald-600" />}
            id="quick-action-restock"
          >
            New Purchase
          </Button>
        </div>
      </div>

      {/* Today's Sales Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Today's Transactions</h3>
            <p className="text-[11px] text-slate-500">
              {todaySales.length} sales recorded today
            </p>
          </div>
          <span className="text-xs font-semibold text-orange-600">
            {formatCurrency(todayTotalSales, currency)}
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {todaySales.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No sales completed yet today. Tap 'Start Sale' to begin!
            </div>
          ) : (
            todaySales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => onSelectSale(sale)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
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
                      {sale.status === 'Voided' ? 'Void' : sale.paymentMethod}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {sale.customerName ? `${sale.customerName} • ` : ''}
                    {sale.items.length} item{sale.items.length > 1 ? 's' : ''} •{' '}
                    {formatTimeOnly(sale.date)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-bold block ${
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
