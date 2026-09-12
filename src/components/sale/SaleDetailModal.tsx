import React, { useState } from 'react';
import { Ban, CheckCircle2, User, Calendar, CreditCard, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Sale } from '../../types';
import { voidSale } from '../../services/saleService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface SaleDetailModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onSaleUpdated: () => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale,
  isOpen,
  onClose,
  currency,
  onSaleUpdated,
}) => {
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidPrompt, setShowVoidPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sale) return null;

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      setError('Please provide a reason for voiding this invoice.');
      return;
    }

    try {
      setIsVoiding(true);
      setError(null);
      await voidSale(sale.id, voidReason);
      setShowVoidPrompt(false);
      onSaleUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to void sale.');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${sale.invoiceNumber}`}
      subtitle={formatDateTime(sale.date)}
      maxWidth="md"
      id="sale-detail-modal"
    >
      <div className="space-y-4 text-slate-800">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Status Badge & Method Banner */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Badge variant={sale.status === 'Completed' ? 'success' : 'danger'}>
              {sale.status}
            </Badge>
            <Badge variant="orange">{sale.paymentMethod}</Badge>
          </div>
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(sale.total, currency)}
          </span>
        </div>

        {/* Void notice if already voided */}
        {sale.status === 'Voided' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Voided on {sale.voidedAt ? formatDateTime(sale.voidedAt) : 'N/A'}</span>
            </div>
            <p className="text-[11px] text-rose-700">
              Reason: {sale.voidReason || 'No reason specified'}
            </p>
          </div>
        )}

        {/* Customer if credit */}
        {sale.customerName && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2.5">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <span className="font-semibold text-slate-800">{sale.customerName}</span>
              {sale.customerPhone && (
                <span className="text-slate-500 ml-2">({sale.customerPhone})</span>
              )}
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <div className="bg-slate-100/80 px-3 py-2 font-semibold text-slate-700 grid grid-cols-12">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-4 text-right">Total</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {sale.items.map((item, idx) => (
              <div key={idx} className="px-3 py-2.5 grid grid-cols-12 items-center">
                <div className="col-span-6 min-w-0 pr-1">
                  <p className="font-semibold text-slate-900 truncate">{item.productName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {formatCurrency(item.salePrice, currency)} ea
                  </p>
                </div>
                <span className="col-span-2 text-center font-medium text-slate-700">
                  x{item.quantity}
                </span>
                <span className="col-span-4 text-right font-bold text-slate-900">
                  {formatCurrency(item.lineTotal, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Calculation summary */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal, currency)}</span>
          </div>
          {sale.taxPercentage > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax ({sale.taxPercentage}%)</span>
              <span>+{formatCurrency(sale.taxAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
            <span>Total</span>
            <span className="text-orange-600">{formatCurrency(sale.total, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100 text-[11px]">
            <span>Estimated Profit</span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(sale.totalProfit, currency)}
            </span>
          </div>
        </div>

        {/* Void Workflow Section */}
        {sale.status === 'Completed' && (
          <div>
            {!showVoidPrompt ? (
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => setShowVoidPrompt(true)}
                leftIcon={<Ban className="w-4 h-4 text-rose-500" />}
                className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                id="initiate-void-btn"
              >
                Void / Reverse Sale
              </Button>
            ) : (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-rose-800">
                  Are you sure you want to void this invoice?
                </p>
                <p className="text-[11px] text-slate-600">
                  This will return the items to stock and reverse financial accounts (cash or customer debt), leaving an audit record.
                </p>
                <input
                  type="text"
                  placeholder="Reason for voiding (required)..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowVoidPrompt(false)}
                    disabled={isVoiding}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={handleVoid}
                    isLoading={isVoiding}
                    id="confirm-void-btn"
                  >
                    Confirm Void
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
