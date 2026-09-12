import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Product, StockAdjustmentType } from '../../types';
import { adjustStock } from '../../services/stockService';

interface StockAdjustModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  isOpen,
  onClose,
  onAdjusted,
}) => {
  const [type, setType] = useState<StockAdjustmentType>('Damage');
  const [direction, setDirection] = useState<'decrease' | 'increase'>('decrease');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide an explanation/reason for this stock adjustment.');
      return;
    }

    const change = direction === 'decrease' ? -qty : qty;

    try {
      setIsLoading(true);
      setError(null);
      await adjustStock(product.id, type, change, reason);
      onAdjusted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to adjust stock.');
    } finally {
      setIsLoading(false);
    }
  };

  const parsedQty = parseInt(quantity, 10) || 0;
  const projectedStock =
    direction === 'decrease'
      ? product.currentStock - parsedQty
      : product.currentStock + parsedQty;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Stock Inventory"
      subtitle={`${product.name} (${product.code})`}
      maxWidth="sm"
      id="stock-adjust-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
          <span className="text-slate-600">Current Stock:</span>
          <span className="font-bold text-slate-900">{product.currentStock} units</span>
        </div>

        {/* Direction (Remove / Add) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adjustment Direction
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('decrease')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border cursor-pointer ${
                direction === 'decrease'
                  ? 'bg-rose-50 text-rose-700 border-rose-400'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Reduce / Deduct (-)
            </button>
            <button
              type="button"
              onClick={() => setDirection('increase')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border cursor-pointer ${
                direction === 'increase'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-400'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Add / Restock (+)
            </button>
          </div>
        </div>

        {/* Adjustment Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adjustment Type / Category
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as StockAdjustmentType)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="Damage">Damage</option>
            <option value="Expired">Expired</option>
            <option value="Correction">Correction / Count Mismatch</option>
            <option value="Found Stock">Found Stock</option>
            <option value="Loss">Loss / Theft</option>
            <option value="Other">Other Reason</option>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Quantity Units
          </label>
          <input
            type="number"
            min="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
            <span>Resulting Stock:</span>
            <span className={projectedStock < 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
              {projectedStock} units
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Audit Notes (Required)
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Broken bottle during shelf rearrangement"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isLoading}
            disabled={projectedStock < 0}
            id="confirm-adjust-stock-btn"
          >
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
