import React, { useState, useEffect } from 'react';
import { Banknote, CreditCard, Landmark, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CartItem, Customer, PaymentMethod, CounterSession } from '../../types';
import { getActiveCounterSession } from '../../services/counterService';
import { getCustomers } from '../../services/customerService';
import { completeSale } from '../../services/saleService';
import { formatCurrency, roundMoney } from '../../utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  currency: string;
  taxPercentage: number;
  onSaleCompleted: (saleId: string) => void;
  onOpenCounterRequested: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  currency,
  taxPercentage,
  onSaleCompleted,
  onOpenCounterRequested,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [activeCounter, setActiveCounter] = useState<CounterSession | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [bankReference, setBankReference] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = roundMoney(cart.reduce((acc, item) => acc + item.lineTotal, 0));
  const taxAmount = roundMoney((subtotal * taxPercentage) / 100);
  const total = roundMoney(subtotal + taxAmount);

  useEffect(() => {
    if (isOpen) {
      loadContext();
    }
  }, [isOpen]);

  const loadContext = async () => {
    try {
      const [counter, custList] = await Promise.all([
        getActiveCounterSession(),
        getCustomers(),
      ]);
      setActiveCounter(counter);
      setCustomers(custList);
      if (custList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custList[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerCurrentDue = selectedCustomer ? selectedCustomer.currentBalance : 0;
  const customerNewDue = roundMoney(customerCurrentDue + total);

  const handleCompleteSale = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (paymentMethod === 'Cash' && !activeCounter) {
        setError('Please open the counter before making a cash sale.');
        setIsLoading(false);
        return;
      }

      if (paymentMethod === 'Credit' && !selectedCustomerId) {
        setError('Please select a customer for credit sales.');
        setIsLoading(false);
        return;
      }

      const sale = await completeSale({
        items: cart,
        paymentMethod,
        customerId: paymentMethod === 'Credit' ? selectedCustomerId : undefined,
        bankReference: paymentMethod === 'Bank Transfer' ? bankReference : undefined,
        taxPercentage,
      });

      onSaleCompleted(sale.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Sale Checkout"
      subtitle={`Total: ${formatCurrency(total, currency)}`}
      maxWidth="md"
      id="checkout-modal"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Method Selector (EXACTLY 3) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Cash */}
            <button
              type="button"
              id="payment-method-cash-btn"
              onClick={() => {
                setPaymentMethod('Cash');
                setError(null);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentMethod === 'Cash'
                  ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Banknote className="w-6 h-6" />
              <span className="text-xs font-bold">Cash</span>
            </button>

            {/* Credit / Udhar */}
            <button
              type="button"
              id="payment-method-credit-btn"
              onClick={() => {
                setPaymentMethod('Credit');
                setError(null);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentMethod === 'Credit'
                  ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-xs font-bold">Credit</span>
            </button>

            {/* Bank Transfer */}
            <button
              type="button"
              id="payment-method-bank-btn"
              onClick={() => {
                setPaymentMethod('Bank Transfer');
                setError(null);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentMethod === 'Bank Transfer'
                  ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Landmark className="w-6 h-6" />
              <span className="text-xs font-bold">Bank Transfer</span>
            </button>
          </div>
        </div>

        {/* Method-specific sections */}
        {paymentMethod === 'Cash' && (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Drawer Status:</span>
              {activeCounter ? (
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  OPEN (Session #{activeCounter.sessionNumber})
                </span>
              ) : (
                <span className="font-semibold text-rose-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  CLOSED
                </span>
              )}
            </div>

            {!activeCounter ? (
              <div className="pt-2">
                <p className="text-xs text-rose-600 mb-2">
                  Please open the counter before making a cash sale.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    onClose();
                    onOpenCounterRequested();
                  }}
                >
                  Open Cash Counter Now
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                This {formatCurrency(total, currency)} will be added directly into physical drawer cash.
              </p>
            )}
          </div>
        )}

        {paymentMethod === 'Bank Transfer' && (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <p className="text-xs text-slate-600">
              Bank transfer sales will <strong>NOT</strong> affect physical drawer cash.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Transaction Reference / Confirmation # (Optional)
              </label>
              <input
                type="text"
                id="bank-ref-input"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="e.g., TXN-998274 or Zelle/Venmo ref"
              />
            </div>
          </div>
        )}

        {paymentMethod === 'Credit' && (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Select Customer</span>
              <span className="text-[11px] text-slate-400">Required for credit</span>
            </div>

            {customers.length === 0 ? (
              <p className="text-xs text-rose-600">
                No customers found. Create a customer in the Customers section first.
              </p>
            ) : (
              <select
                id="credit-customer-select"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) — Due: {formatCurrency(c.currentBalance, currency)}
                  </option>
                ))}
              </select>
            )}

            {selectedCustomer && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Current Outstanding Due:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(customerCurrentDue, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>New Credit Sale:</span>
                  <span className="font-semibold text-orange-600">
                    +{formatCurrency(total, currency)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                  <span>Resulting New Balance:</span>
                  <span className="text-rose-600">
                    {formatCurrency(customerNewDue, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final Payment Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={paymentMethod === 'Cash' && !activeCounter}
            onClick={handleCompleteSale}
            id="confirm-checkout-btn"
          >
            Confirm & Complete {paymentMethod} Sale ({formatCurrency(total, currency)})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
