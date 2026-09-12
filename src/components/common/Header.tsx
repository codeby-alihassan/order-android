import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, Wallet } from 'lucide-react';
import { Badge } from './Badge';
import { formatCurrency } from '../../utils/formatters';
import { getCurrentCashInDrawer, getActiveCounterSession } from '../../services/counterService';

interface HeaderProps {
  businessName?: string;
  currency?: string;
  currentPageTitle?: string;
  counterStatus?: 'OPEN' | 'CLOSED';
  counterCash?: number;
  onOpenCounterModal?: () => void;
  onNavigateToSettings?: () => void;
  isCounterOpen?: boolean;
  counterSessionNumber?: number;
  onOpenCounterClick?: () => void;
  onCloseCounterClick?: () => void;
  onSettingsClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  businessName = 'Orderly Store',
  currency = '$',
  currentPageTitle = 'Dashboard',
  counterStatus,
  counterCash = 0,
  onOpenCounterModal,
  onNavigateToSettings,
  isCounterOpen,
  counterSessionNumber,
  onOpenCounterClick,
  onCloseCounterClick,
  onSettingsClick,
  showBackButton,
  onBackClick,
}) => {
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const [liveCash, setLiveCash] = useState<number>(counterCash);
  const [sessionActive, setSessionActive] = useState<boolean>(
    counterStatus === 'OPEN' || Boolean(isCounterOpen)
  );

  useEffect(() => {
    let isMounted = true;

    const fetchLiveDrawerCash = async () => {
      try {
        const [activeSession, cash] = await Promise.all([
          getActiveCounterSession(),
          getCurrentCashInDrawer(),
        ]);
        if (isMounted) {
          setSessionActive(Boolean(activeSession));
          setLiveCash(cash);
        }
      } catch (err) {
        console.error('Failed to fetch live drawer cash for header:', err);
      }
    };

    // Immediate fetch on mount
    fetchLiveDrawerCash();

    // Polling interval ensures navbar updates automatically after any cash transaction across any view
    const intervalId = setInterval(fetchLiveDrawerCash, 300);

    // Event listeners to catch cash updates immediately after user clicks or switches tabs/windows
    const handleQuickRefresh = () => {
      fetchLiveDrawerCash();
      setTimeout(fetchLiveDrawerCash, 100);
      setTimeout(fetchLiveDrawerCash, 300);
    };

    window.addEventListener('orderly:cash-updated', fetchLiveDrawerCash);
    window.addEventListener('focus', fetchLiveDrawerCash);
    document.addEventListener('click', handleQuickRefresh);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('orderly:cash-updated', fetchLiveDrawerCash);
      window.removeEventListener('focus', fetchLiveDrawerCash);
      document.removeEventListener('click', handleQuickRefresh);
    };
  }, []);

  useEffect(() => {
    if (counterStatus !== undefined || isCounterOpen !== undefined) {
      setSessionActive(counterStatus === 'OPEN' || Boolean(isCounterOpen));
    }
  }, [counterStatus, isCounterOpen]);

  const isDrawerOpen = sessionActive;
  const handleCounterClick = () => {
    if (typeof onOpenCounterModal === 'function') {
      onOpenCounterModal();
    } else if (isDrawerOpen && typeof onCloseCounterClick === 'function') {
      onCloseCounterClick();
    } else if (typeof onOpenCounterClick === 'function') {
      onOpenCounterClick();
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left: Branding & Current Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
            O
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 tracking-tight">Orderly</span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                • {businessName}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
              <span>{currentDateFormatted}</span>
              <span className="text-slate-300">|</span>
              <span className="text-orange-600 font-semibold">{currentPageTitle}</span>
            </div>
          </div>
        </div>

        {/* Right: Counter Status & Cash Float */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="header-counter-btn"
            onClick={handleCounterClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 active:scale-95 transition-all text-left cursor-pointer"
            title="Click to view or manage cash counter"
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDrawerOpen
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <div className="flex flex-col" id="header-drawer-cash-container">
              <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">
                {isDrawerOpen ? 'Drawer' : 'Closed'}
              </span>
              {isDrawerOpen ? (
                <span
                  id="header-drawer-cash-value"
                  className="text-xs font-bold text-slate-900 leading-tight"
                >
                  {formatCurrency(liveCash, currency)}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-rose-600 leading-tight">
                  Tap to Open
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

