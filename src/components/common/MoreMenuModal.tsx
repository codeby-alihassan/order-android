import React from 'react';
import {
  Package,
  Users,
  Truck,
  ShoppingBag,
  History,
  Receipt,
  Landmark,
  BarChart3,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';

export type AppSubPage =
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'sales-history'
  | 'expenses'
  | 'counter'
  | 'reports'
  | 'settings';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage?: (page: AppSubPage | string) => void;
  onNavigate?: (page: AppSubPage | string) => void;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'more-products',
      page: 'products' as AppSubPage,
      label: 'Products Catalog',
      desc: 'Add, edit products & pricing',
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'more-customers',
      page: 'customers' as AppSubPage,
      label: 'Customers & Credit',
      desc: 'Customer accounts & dues',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'more-suppliers',
      page: 'suppliers' as AppSubPage,
      label: 'Suppliers',
      desc: 'Vendor accounts & balances',
      icon: Truck,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'more-purchases',
      page: 'purchases' as AppSubPage,
      label: 'Purchases',
      desc: 'Inventory restocking orders',
      icon: ShoppingBag,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'more-sales-history',
      page: 'sales-history' as AppSubPage,
      label: 'Sales History',
      desc: 'All invoices, receipts & voids',
      icon: History,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      id: 'more-expenses',
      page: 'expenses' as AppSubPage,
      label: 'Expenses',
      desc: 'Operational overhead & costs',
      icon: Receipt,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      id: 'more-counter',
      page: 'counter' as AppSubPage,
      label: 'Cash Counter',
      desc: 'Drawer sessions & movements',
      icon: Landmark,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'more-reports',
      page: 'reports' as AppSubPage,
      label: 'Reports & Analytics',
      desc: 'Sales, gross profit & trends',
      icon: BarChart3,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      id: 'more-settings',
      page: 'settings' as AppSubPage,
      label: 'Settings & Backups',
      desc: 'Profile, security & exports',
      icon: Settings,
      color: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div
      id="more-menu-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="more-menu-sheet"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull tab */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">All Modules</h3>
            <p className="text-xs text-slate-500">Select a section to manage</p>
          </div>
          <button
            type="button"
            id="more-menu-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Modules */}
        <div className="p-3 overflow-y-auto divide-y divide-slate-100">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                id={item.id}
                type="button"
                onClick={() => {
                  if (typeof onSelectPage === 'function') {
                    onSelectPage(item.page);
                  } else if (typeof onNavigate === 'function') {
                    onNavigate(item.page);
                  }
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      {item.label}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      {item.desc}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
