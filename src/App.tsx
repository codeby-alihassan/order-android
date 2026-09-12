import React, { useState, useEffect } from 'react';
import { AppSettings, CartItem, CounterSession, Sale } from './types';
import { initAppDatabase, getSettings } from './services/settingsService';
import { getActiveCounterSession } from './services/counterService';
import { getSaleById } from './services/saleService';

// Layout & Common Components
import { Header } from './components/common/Header';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { MoreMenuModal } from './components/common/MoreMenuModal';
import { OpenCounterModal } from './components/counter/OpenCounterModal';
import { CloseCounterModal } from './components/counter/CloseCounterModal';
import { SaleDetailModal } from './components/sale/SaleDetailModal';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { StockPage } from './pages/StockPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { ProductsPage } from './pages/ProductsPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CounterPage } from './pages/CounterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('orderly_auth') === 'true';
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeCounter, setActiveCounter] = useState<CounterSession | null>(null);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Shared Cart State (Persists across page navigation within session)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modals
  const [isOpenCounterOpen, setIsOpenCounterOpen] = useState(false);
  const [isCloseCounterOpen, setIsCloseCounterOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Sale completion toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      setIsInitializing(true);
      await initAppDatabase();
      const appSettings = await getSettings();
      setSettings(appSettings);
      const activeSession = await getActiveCounterSession();
      setActiveCounter(activeSession);
    } catch (err) {
      console.error('Failed to initialize Orderly database:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshActiveCounter = async () => {
    const active = await getActiveCounterSession();
    setActiveCounter(active);
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem('orderly_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('orderly_auth');
    setIsAuthenticated(false);
    setCurrentTab('dashboard');
  };

  const handleSaleSuccess = async (saleId: string) => {
    await refreshActiveCounter();
    const sale = await getSaleById(saleId);
    if (sale) {
      setToastMessage(`Sale ${sale.invoiceNumber} recorded successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedSaleDetail(sale);
    }
  };

  // Determine bottom nav active state
  const isCoreNavTab = ['dashboard', 'billing', 'stock', 'sales'].includes(currentTab);
  const activeNavTab: NavTab = isCoreNavTab ? (currentTab as NavTab) : 'more';

  // Sub-page titles for Header back navigation
  const subPageTitles: Record<string, string> = {
    products: 'Product Catalog',
    purchases: 'Restock Purchases',
    customers: 'Customers & Credit',
    suppliers: 'Vendors & Payables',
    expenses: 'Operating Expenses',
    counter: 'Cash Counter Drawer',
    reports: 'Financial Reports',
    settings: 'System Settings',
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center font-black text-2xl animate-pulse mb-4 shadow-lg shadow-orange-600/30">
          O
        </div>
        <h2 className="text-xl font-bold tracking-tight">Orderly POS</h2>
        <p className="text-xs text-slate-400 mt-1">
          Loading secure local IndexedDB...
        </p>
      </div>
    );
  }

  if (!isAuthenticated && settings) {
    return (
      <LoginPage
        settings={settings}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (!settings) return null;

  const isSubPage = !isCoreNavTab;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-900">
      {/* Top Application Header */}
      <Header
        businessName={isSubPage ? subPageTitles[currentTab] || settings.businessName : settings.businessName}
        currency={settings.currency}
        currentPageTitle={isSubPage ? subPageTitles[currentTab] || 'Section' : 'Dashboard'}
        counterStatus={activeCounter ? 'OPEN' : 'CLOSED'}
        counterCash={activeCounter?.expectedCash || 0}
        isCounterOpen={Boolean(activeCounter)}
        counterSessionNumber={activeCounter?.sessionNumber}
        onOpenCounterClick={() => setIsOpenCounterOpen(true)}
        onCloseCounterClick={() => setIsCloseCounterOpen(true)}
        onSettingsClick={() => setCurrentTab('settings')}
        onNavigateToSettings={() => setCurrentTab('settings')}
        showBackButton={isSubPage}
        onBackClick={() => setCurrentTab('dashboard')}
      />

      {/* Global Success Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-top duration-200">
          <div className="p-3 bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center justify-between">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-200 hover:text-white text-xs ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 w-full overflow-y-auto">
        {currentTab === 'dashboard' && (
          <DashboardPage
            currency={settings.currency}
            onNavigateToBilling={() => setCurrentTab('billing')}
            onNavigateToStock={() => setCurrentTab('stock')}
            onNavigateToPurchases={() => setCurrentTab('purchases')}
            onNavigateToExpenses={() => setCurrentTab('expenses')}
            onNavigateToCounter={() => setCurrentTab('counter')}
            onOpenCounterRequested={() => setIsOpenCounterOpen(true)}
            onCloseCounterRequested={() => setIsCloseCounterOpen(true)}
            onSelectSale={(sale) => setSelectedSaleDetail(sale)}
          />
        )}

        {currentTab === 'billing' && (
          <BillingPage
            currency={settings.currency}
            taxPercentage={settings.taxPercentage}
            cart={cart}
            setCart={setCart}
            onOpenCounterRequested={() => setIsOpenCounterOpen(true)}
            onSaleSuccess={handleSaleSuccess}
          />
        )}

        {currentTab === 'stock' && (
          <StockPage currency={settings.currency} />
        )}

        {(currentTab === 'sales' || currentTab === 'sales-history') && (
          <SalesHistoryPage currency={settings.currency} />
        )}

        {currentTab === 'products' && (
          <ProductsPage currency={settings.currency} />
        )}

        {currentTab === 'purchases' && (
          <PurchasesPage
            currency={settings.currency}
            onNavigateToSuppliers={() => setCurrentTab('suppliers')}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersPage currency={settings.currency} />
        )}

        {currentTab === 'suppliers' && (
          <SuppliersPage currency={settings.currency} />
        )}

        {currentTab === 'expenses' && (
          <ExpensesPage currency={settings.currency} />
        )}

        {currentTab === 'counter' && (
          <CounterPage
            currency={settings.currency}
            onOpenCounterRequested={() => setIsOpenCounterOpen(true)}
            onCloseCounterRequested={() => setIsCloseCounterOpen(true)}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsPage currency={settings.currency} />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Bottom Sticky Mobile Navigation */}
      <BottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          if (tab === 'more') {
            setIsMoreMenuOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
      />

      {/* More Navigation Menu Modal */}
      <MoreMenuModal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        onSelectPage={(page) => {
          const targetTab = page === 'sales-history' ? 'sales' : page;
          setCurrentTab(targetTab);
        }}
        onNavigate={(tab) => {
          const targetTab = tab === 'sales-history' ? 'sales' : tab;
          setCurrentTab(targetTab);
        }}
      />

      {/* Open Counter Modal */}
      <OpenCounterModal
        isOpen={isOpenCounterOpen}
        onClose={() => setIsOpenCounterOpen(false)}
        currency={settings.currency}
        onCounterOpened={async () => {
          await refreshActiveCounter();
        }}
      />

      {/* Close Counter Modal */}
      <CloseCounterModal
        isOpen={isCloseCounterOpen}
        onClose={() => setIsCloseCounterOpen(false)}
        currency={settings.currency}
        activeSession={activeCounter}
        onCounterClosed={async () => {
          await refreshActiveCounter();
        }}
      />

      {/* Sale Detail & Void Modal */}
      <SaleDetailModal
        sale={selectedSaleDetail}
        isOpen={Boolean(selectedSaleDetail)}
        onClose={() => setSelectedSaleDetail(null)}
        currency={settings.currency}
        onSaleUpdated={async () => {
          await refreshActiveCounter();
        }}
      />
    </div>
  );
}
