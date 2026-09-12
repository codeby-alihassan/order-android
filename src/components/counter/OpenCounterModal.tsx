import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { openCounter } from '../../services/counterService';
import { formatCurrency } from '../../utils/formatters';

interface OpenCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCounterOpened: () => void;
  currency: string;
}

export const OpenCounterModal: React.FC<OpenCounterModalProps> = ({
  isOpen,
  onClose,
  onCounterOpened,
  currency,
}) => {
  const [openingCash, setOpeningCash] = useState<string>('500.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid non-negative opening cash amount.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await openCounter(amount);
      onCounterOpened();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to open counter.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open Cash Drawer"
      subtitle="Start a new business shift session"
      maxWidth="sm"
      id="open-counter-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Opening Cash Float ({currency})
          </label>
          <div className="relative rounded-xl shadow-xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">
              {currency}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              id="opening-cash-input"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Physical cash currently placed into the drawer at the start of shift.
          </p>
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
            id="confirm-open-counter-btn"
          >
            Open Counter
          </Button>
        </div>
      </form>
    </Modal>
  );
};
