import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Download,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { CounterSession, CashMovement } from '../types';
import {
  getActiveCounterSession,
  getCounterSessions,
  recordCashMovement,
} from '../services/counterService';
import { exportCounterHistoryToExcel } from '../services/backupService';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDateTime, formatTimeOnly } from '../utils/formatters';

interface CounterPageProps {
  currency: string;
  onOpenCounterRequested: () => void;
  onCloseCounterRequested: () => void;
}

export const CounterPage: React.FC<CounterPageProps> = ({
  currency,
  onOpenCounterRequested,
  onCloseCounterRequested,
}) => {
  const [activeSession, setActiveSession] = useState<CounterSession | null>(null);
  const [allSessions, setAllSessions] = useState<CounterSession[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  // Cash In / Out Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'Cash In' | 'Cash Out'>('Cash In');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  useEffect(() => {
    loadCounterData();
  }, []);

  const loadCounterData = async () => {
    const [active, history] = await Promise.all([
      getActiveCounterSession(),
      getCounterSessions(),
    ]);
    setActiveSession(active);
    setAllSessions(history);
  };

  const handleAdjustCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      setAdjustError('Please enter a valid positive adjustment amount.');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('A reason is mandatory for manual drawer adjustments.');
      return;
    }

    try {
      setIsSubmittingAdjust(true);
      setAdjustError(null);
      await recordCashMovement(
        adjustType === 'Cash In' ? 'Cash In (Deposit)' : 'Cash Out (Withdrawal)',
        amt,
        adjustReason
      );
      await loadCounterData();
      setIsAdjustModalOpen(false);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (err: any) {
      setAdjustError(err?.message || 'Failed to adjust drawer cash.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleExportHistory = async () => {
    try {
      await exportCounterHistoryToExcel(currency);
    } catch (err: any) {
      alert('Failed to export counter history: ' + err?.message);
    }
  };

  return (
    <div id="counter-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'current'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Shift
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Session History ({allSessions.length})
        </button>
      </div>

      {activeTab === 'current' ? (
        <div className="space-y-4">
          {/* Active Drawer Status Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {activeSession ? `Shift #${activeSession.sessionNumber}` : 'No Active Shift'}
                </span>
              </div>
              <Badge variant={activeSession ? 'success' : 'danger'}>
                {activeSession ? 'DRAWER OPEN' : 'DRAWER CLOSED'}
              </Badge>
            </div>

            <div>
              <span className="text-xs text-slate-500 block font-medium">
                Physical Cash in Drawer
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">
                {activeSession
                  ? formatCurrency(activeSession.closingCashExpected, currency)
                  : formatCurrency(0, currency)}
              </h2>
            </div>

            {activeSession ? (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Opening Float</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(activeSession.openingCash, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Opened At</span>
                  <span className="font-bold text-slate-800">
                    {formatTimeOnly(activeSession.openedAt)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Opening the counter allows cash sales, customer cash collections, and vendor payouts.
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              {activeSession ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setAdjustError(null);
                      setIsAdjustModalOpen(true);
                    }}
                    leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                    id="counter-cash-adjust-btn"
                  >
                    Cash In / Out
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={onCloseCounterRequested}
                    id="counter-close-drawer-btn"
                  >
                    Close Counter
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={onOpenCounterRequested}
                  id="counter-open-drawer-btn"
                >
                  Open Cash Counter Now
                </Button>
              )}
            </div>
          </div>

          {/* Active Session Movements Stream */}
          {activeSession && (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Shift Cash Audit Trail</h3>
                  <p className="text-[11px] text-slate-500">
                    {activeSession.movements?.length || 0} drawer operations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadCounterData}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {!activeSession.movements || activeSession.movements.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No movements recorded in this session.
                  </div>
                ) : (
                  activeSession.movements.map((m) => {
                    const isPositive = m.amount >= 0;

                    return (
                      <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">
                              {m.type}
                            </span>
                            {m.referenceId && (
                              <span className="text-[10px] font-mono text-slate-400 font-medium">
                                #{m.referenceId}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatTimeOnly(m.timestamp)} {m.reason ? `• ${m.reason}` : ''}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-bold text-xs block ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {formatCurrency(m.amount, currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Bal: {formatCurrency(m.balanceAfter, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Past Shift Closures</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportHistory}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              id="export-counter-excel-btn"
            >
              Export Excel
            </Button>
          </div>

          <div className="space-y-3">
            {allSessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                No closed counter sessions yet.
              </div>
            ) : (
              allSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">
                          Session #{s.sessionNumber}
                        </span>
                        <Badge variant={s.status === 'Open' ? 'success' : 'default'}>
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatDateTime(s.openedAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Actual Count
                      </span>
                      <span className="text-sm font-black text-slate-900 block">
                        {s.closingCashActual !== undefined
                          ? formatCurrency(s.closingCashActual, currency)
                          : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {s.status === 'Closed' && (
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] mt-2">
                      <div>
                        <span className="text-slate-400 block font-medium">Opening</span>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(s.openingCash, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Expected</span>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(s.closingCashExpected, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Discrepancy</span>
                        <span
                          className={`font-bold ${
                            (s.cashDifference || 0) < 0
                              ? 'text-rose-600'
                              : (s.cashDifference || 0) > 0
                              ? 'text-emerald-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {(s.cashDifference || 0) > 0 ? '+' : ''}
                          {formatCurrency(s.cashDifference || 0, currency)}
                        </span>
                      </div>
                    </div>
                  )}

                  {s.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-1">
                      Notes: {s.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Manual Cash In / Out Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Manual Cash Adjustment"
        subtitle="Deposit or withdraw cash with mandatory reason"
        maxWidth="sm"
        id="cash-adjust-modal"
      >
        <form onSubmit={handleAdjustCash} className="space-y-3 text-xs">
          {adjustError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {adjustError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('Cash In')}
                className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                  adjustType === 'Cash In'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Cash In (Deposit +)
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('Cash Out')}
                className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                  adjustType === 'Cash Out'
                    ? 'bg-rose-50 border-rose-500 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Cash Out (Withdraw -)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Amount ({currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              id="adjust-amount-input"
              placeholder="10.00"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Audit Reason *
            </label>
            <input
              type="text"
              required
              id="adjust-reason-input"
              placeholder="e.g. Added change float / Bank deposit run"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustModalOpen(false)}
              className="flex-1"
              disabled={isSubmittingAdjust}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmittingAdjust}
              id="confirm-adjust-cash-btn"
            >
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
