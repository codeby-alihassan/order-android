import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CounterSession } from '../../types';
import {
  getActiveCounterSession,
  getCurrentCashInDrawer,
  closeCounter,
  reconcileDiscrepancyAndClose,
} from '../../services/counterService';
import { formatCurrency, roundMoney } from '../../utils/formatters';

interface CloseCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCounterClosed: () => void;
  currency: string;
}

export const CloseCounterModal: React.FC<CloseCounterModalProps> = ({
  isOpen,
  onClose,
  onCounterClosed,
  currency,
}) => {
  const [session, setSession] = useState<CounterSession | null>(null);
  const [expectedCash, setExpectedCash] = useState<number>(0);
  const [actualCash, setActualCash] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [showAdjustmentWorkflow, setShowAdjustmentWorkflow] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSession();
      setShowAdjustmentWorkflow(false);
      setDiscrepancyReason('');
      setError(null);
    }
  }, [isOpen]);

  const loadSession = async () => {
    try {
      const active = await getActiveCounterSession();
      setSession(active);
      if (active) {
        const cash = await getCurrentCashInDrawer();
        setExpectedCash(cash);
        setActualCash(cash.toFixed(2));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load active session.');
    }
  };

  const parsedActual = parseFloat(actualCash) || 0;
  const difference = roundMoney(parsedActual - expectedCash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedActual) || parsedActual < 0) {
      setError('Please enter a valid actual closing cash amount.');
      return;
    }

    // STRICT RULE 3: If actual cash is LESS or MORE than expected:
    // DO NOT automatically close the counter. Show Cash Difference Detected.
    // Counter must remain OPEN.
    if (difference !== 0) {
      setError(
        `Cash Difference Detected: Expected ${formatCurrency(expectedCash, currency)}, Actual ${formatCurrency(parsedActual, currency)}, Difference ${difference > 0 ? '+' : ''}${formatCurrency(difference, currency)}. Counter must remain OPEN until resolved.`
      );
      setShowAdjustmentWorkflow(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await closeCounter(parsedActual, closingNote);
      onCounterClosed();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to close counter session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDiscrepancyAdjustment = async () => {
    if (!discrepancyReason.trim()) {
      setError('A discrepancy explanation/reason is required to record the cash adjustment.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await reconcileDiscrepancyAndClose(parsedActual, discrepancyReason, closingNote);
      onCounterClosed();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reconcile discrepancy and close counter.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Close Cash Drawer"
      subtitle={session ? `Session #${session.sessionNumber} Reconciliation` : 'Reconciliation'}
      maxWidth="md"
      id="close-counter-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            id="counter-close-error"
            className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {session ? (
          <>
            {/* Session Breakdown Grid */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Opening Cash Float</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(session.openingCash, currency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Cash Sales (+)</span>
                <span className="font-semibold text-emerald-600">
                  +{formatCurrency(session.cashSales, currency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Bank Transfer Sales (Non-cash)</span>
                <span className="font-medium text-slate-500">
                  {formatCurrency(session.bankSales, currency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Credit Sales (Non-cash)</span>
                <span className="font-medium text-slate-500">
                  {formatCurrency(session.creditSales, currency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Expenses Paid in Cash (-)</span>
                <span className="font-semibold text-rose-600">
                  -{formatCurrency(session.cashExpenses, currency)}
                </span>
              </div>
              {(session.otherCashIn > 0 || session.otherCashOut > 0) && (
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>Other Movements (In/Out)</span>
                  <span className="font-medium text-slate-700">
                    +{formatCurrency(session.otherCashIn, currency)} / -{formatCurrency(session.otherCashOut, currency)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Expected Drawer Cash</span>
                <span className="text-orange-600">{formatCurrency(expectedCash, currency)}</span>
              </div>
            </div>

            {/* Actual Closing Cash Entry */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Counted Actual Closing Cash ({currency})
                </label>
                {difference !== 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActualCash(expectedCash.toFixed(2));
                      setError(null);
                      setShowAdjustmentWorkflow(false);
                    }}
                    className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Expected ({formatCurrency(expectedCash, currency)})
                  </button>
                )}
              </div>
              <div className="relative rounded-xl shadow-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  id="actual-cash-input"
                  value={actualCash}
                  onChange={(e) => {
                    setActualCash(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-9 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* STRICT RULE 3: Cash Difference Detected Display */}
            {difference !== 0 ? (
              <div
                id="cash-difference-detected"
                className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Cash Difference Detected</span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-amber-200 text-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Expected Cash</span>
                    <span className="font-bold text-slate-900">{formatCurrency(expectedCash, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Actual Cash</span>
                    <span className="font-bold text-slate-900">{formatCurrency(parsedActual, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Difference</span>
                    <span className={`font-bold ${difference < 0 ? 'text-rose-600' : 'text-sky-600'}`}>
                      {difference > 0 ? '+' : ''}
                      {formatCurrency(difference, currency)}
                      <span className="block text-[10px] font-medium">
                        ({difference < 0 ? 'Shortage' : 'Excess'})
                      </span>
                    </span>
                  </div>
                </div>

                <p className="text-amber-900 text-[11px] leading-relaxed">
                  The counter must remain <strong>OPEN</strong> until the discrepancy is resolved.
                  Automatic closing is disabled to prevent unverified cash leaks.
                </p>

                {/* Explicit Correction or Adjustment Workflow */}
                {!showAdjustmentWorkflow ? (
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdjustmentWorkflow(true)}
                      className="w-full text-xs"
                    >
                      Resolve Discrepancy via Explicit Adjustment
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-amber-200 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Discrepancy Explanation / Audit Reason <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      placeholder={
                        difference < 0
                          ? 'e.g. Till shortage logged, register discrepancy verified'
                          : 'e.g. Cash excess verified, customer tip / overage recorded'
                      }
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmDiscrepancyAdjustment}
                      isLoading={isLoading}
                      disabled={!discrepancyReason.trim()}
                      className="w-full text-xs"
                    >
                      Confirm Adjustment ({difference > 0 ? '+' : ''}
                      {formatCurrency(difference, currency)}) & Close Counter
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Count matches Expected Drawer Cash</span>
                </div>
                <span className="text-sm font-bold">{formatCurrency(expectedCash, currency)}</span>
              </div>
            )}

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closing Note (Optional)
              </label>
              <input
                type="text"
                id="closing-note-input"
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="e.g., Handed over to evening deposit box"
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
                Cancel (Keep Open)
              </Button>
              <Button
                type="submit"
                variant={difference === 0 ? 'danger' : 'outline'}
                className="flex-1"
                isLoading={isLoading}
                id="confirm-close-counter-btn"
                disabled={difference !== 0}
              >
                {difference === 0 ? 'Close & Save Session' : 'Difference Detected (Open)'}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-slate-500">
            No active counter session is currently OPEN.
          </div>
        )}
      </form>
    </Modal>
  );
};

