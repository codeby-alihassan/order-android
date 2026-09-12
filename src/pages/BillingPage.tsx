import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ShoppingCart, AlertCircle, Sparkles } from 'lucide-react';
import { Product, CartItem } from '../types';
import { getProducts, getStockStatus } from '../services/productService';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CartDrawer } from '../components/billing/CartDrawer';
import { CheckoutModal } from '../components/billing/CheckoutModal';
import { formatCurrency, roundMoney } from '../utils/formatters';

interface BillingPageProps {
  currency: string;
  taxPercentage: number;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onOpenCounterRequested: () => void;
  onSaleSuccess: (saleId: string) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  currency,
  taxPercentage,
  cart,
  setCart,
  onOpenCounterRequested,
  onSaleSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    const list = await getProducts();
    setProducts(list);
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const handleAddToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      showNotice(`"${product.name}" is currently Out of Stock.`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentCartQty = cart[existingIndex].quantity;
      if (currentCartQty >= product.currentStock) {
        showNotice(
          `Cannot add more. Available stock is ${product.currentStock} units.`
        );
        return;
      }
      const updatedCart = [...cart];
      const newQty = currentCartQty + 1;
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: newQty,
        lineTotal: roundMoney(newQty * updatedCart[existingIndex].salePrice),
      };
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          salePrice: product.sellingPrice,
          lineTotal: product.sellingPrice,
        },
      ]);
    }
  };

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clampedQty = Math.min(newQty, item.product.currentStock);
          return {
            ...item,
            quantity: clampedQty,
            lineTotal: roundMoney(clampedQty * item.salePrice),
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const safePrice = Math.max(0, roundMoney(newPrice));
          return {
            ...item,
            salePrice: safePrice,
            lineTotal: roundMoney(item.quantity * safePrice),
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = roundMoney(cart.reduce((acc, item) => acc + item.lineTotal, 0));
  const cartTax = roundMoney((cartSubtotal * taxPercentage) / 100);
  const cartTotal = roundMoney(cartSubtotal + cartTax);

  return (
    <div id="billing-page" className="p-4 space-y-4 max-w-md mx-auto pb-24">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          id="product-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name or code..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-2xs transition-all"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {feedbackNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Product Grid (2-column on mobile) */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-xs text-slate-400">
            No products match "{searchQuery}".
          </div>
        ) : (
          filteredProducts.map((product) => {
            const status = getStockStatus(product);
            const isOutOfStock = product.currentStock <= 0;
            const inCartItem = cart.find((i) => i.product.id === product.id);

            return (
              <div
                key={product.id}
                id={`product-card-${product.code}`}
                onClick={() => !isOutOfStock && handleAddToCart(product)}
                className={`bg-white p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                  isOutOfStock
                    ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-orange-300 active:scale-98 cursor-pointer shadow-2xs'
                } relative`}
              >
                {/* Top: Status & Initials Badge */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {product.name.substring(0, 2).toUpperCase()}
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

                {/* Name & Code */}
                <div className="min-w-0 mb-3">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {product.name}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {product.code}
                  </p>
                </div>

                {/* Price, Stock and Add Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 block">
                      {formatCurrency(product.sellingPrice, currency)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Stock: {product.currentStock}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-transform cursor-pointer ${
                      inCartItem
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    {inCartItem ? inCartItem.quantity : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Cart Bar (Prompt Section 26: Minimized to save screen space) */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-30 animate-in slide-in-from-bottom-4 duration-150">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
            id="sticky-cart-bar"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                {totalCartCount}
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
                </span>
                <span className="text-[11px] text-slate-400 block font-medium">
                  Tap to view & bargain
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-orange-400">
                {formatCurrency(cartTotal, currency)}
              </span>
              <span className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl">
                View Cart
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        currency={currency}
        taxPercentage={taxPercentage}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdatePrice={handleUpdatePrice}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        currency={currency}
        taxPercentage={taxPercentage}
        onSaleCompleted={(saleId) => {
          setCart([]);
          loadCatalog();
          onSaleSuccess(saleId);
        }}
        onOpenCounterRequested={onOpenCounterRequested}
      />
    </div>
  );
};
