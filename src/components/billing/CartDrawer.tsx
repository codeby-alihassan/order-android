import React from 'react';
import { Trash2, Plus, Minus, Edit3, X, ArrowRight } from 'lucide-react';
import { CartItem } from '../../types';
import { Button } from '../common/Button';
import { formatCurrency, roundMoney } from '../../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  currency: string;
  taxPercentage: number;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onUpdatePrice: (productId: string, newPrice: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  currency,
  taxPercentage,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const subtotal = roundMoney(cart.reduce((acc, item) => acc + item.lineTotal, 0));
  const taxAmount = roundMoney((subtotal * taxPercentage) / 100);
  const total = roundMoney(subtotal + taxAmount);

  return (
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        id="cart-drawer"
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull tab */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Current Order</h3>
            <p className="text-xs text-slate-500">
              {cart.reduce((acc, i) => acc + i.quantity, 0)} items in cart
            </p>
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Your cart is empty. Add products from the catalog.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.product.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-mono">{item.product.code}</span>
                      <span>•</span>
                      <span>Stock: {item.product.currentStock}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Price and Quantity row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  {/* Editable sale price */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Price:</span>
                    <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-xs text-slate-400 font-bold mr-0.5">{currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.salePrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            onUpdatePrice(item.product.id, val);
                          }
                        }}
                        className="w-16 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-xl cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.currentStock}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-r-xl cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-16 text-right font-bold text-xs text-slate-900">
                      {formatCurrency(item.lineTotal, currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Summary & Checkout Action */}
        {cart.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
            </div>
            {taxPercentage > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Tax ({taxPercentage}%)</span>
                <span>+{formatCurrency(taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Payable</span>
              <span className="text-orange-600">{formatCurrency(total, currency)}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onProceedToCheckout}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="mt-2"
              id="cart-checkout-proceed-btn"
            >
              Checkout ({formatCurrency(total, currency)})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
