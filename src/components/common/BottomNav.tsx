import React from 'react';
import { LayoutDashboard, ShoppingCart, Boxes, Receipt, MoreHorizontal } from 'lucide-react';

export type MainNavTab = 'dashboard' | 'billing' | 'stock' | 'sales' | 'more';
export type NavTab = MainNavTab;

interface BottomNavProps {
  currentTab?: MainNavTab;
  activeTab?: MainNavTab;
  onSelectTab?: (tab: MainNavTab) => void;
  onTabChange?: (tab: MainNavTab) => void;
  cartCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  onTabChange,
  cartCount = 0,
}) => {
  const selectedTab = activeTab || currentTab || 'dashboard';
  const handleSelect = (tab: MainNavTab) => {
    if (onTabChange) onTabChange(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const navItems = [
    {
      id: 'nav-dashboard',
      tab: 'dashboard' as MainNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'nav-billing',
      tab: 'billing' as MainNavTab,
      label: 'Billing',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      id: 'nav-stock',
      tab: 'stock' as MainNavTab,
      label: 'Stock',
      icon: Boxes,
    },
    {
      id: 'nav-sales',
      tab: 'sales' as MainNavTab,
      label: 'Sales',
      icon: Receipt,
    },
    {
      id: 'nav-more',
      tab: 'more' as MainNavTab,
      label: 'More',
      icon: MoreHorizontal,
    },
  ];

  return (
    <nav
      id="bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] select-none shadow-lg"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = selectedTab === item.tab;
          const IconComponent = item.icon;

          return (
            <button
              key={item.tab}
              id={item.id}
              type="button"
              onClick={() => handleSelect(item.tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all cursor-pointer relative ${
                isActive ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.25px]' : 'stroke-2'
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-orange-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 font-medium ${
                  isActive ? 'font-semibold text-orange-600' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
