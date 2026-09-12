import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Expense } from '../types';
import { getExpenses, recordExpense, deleteExpense } from '../services/expenseService';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface ExpensesPageProps {
  currency: string;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ currency }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer'>('Cash');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const list = await getExpenses();
    setExpenses(list);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!title.trim()) {
      setFormError('Expense title is required.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid positive expense amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await recordExpense({
        title,
        category,
        amount: amt,
        paymentMethod,
        note: notes,
      });

      await loadExpenses();
      setIsAddModalOpen(false);
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteExpense(deletingId);
      setDeletingId(null);
      await loadExpenses();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete expense.');
    }
  };

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div id="expenses-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Header with Total */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Operating Expenses</h2>
          <p className="text-xs text-slate-500">
            Total: {formatCurrency(totalExpenseAmount, currency)}
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          id="add-expense-btn"
        >
          Add Expense
        </Button>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
            No expenses recorded yet. Tap 'Add Expense' to log operational costs.
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {exp.title}
                    </span>
                    <Badge variant="default">{exp.category}</Badge>
                    <Badge variant={exp.paymentMethod === 'Cash' ? 'orange' : 'info'}>
                      {exp.paymentMethod}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {formatDateTime(exp.date)} {exp.notes ? `• ${exp.notes}` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-rose-600 block">
                    -{formatCurrency(exp.amount, currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeletingId(exp.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-600 mt-1 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Expense"
        subtitle="Log store overheads, utilities, or daily costs"
        maxWidth="sm"
        id="expense-form-modal"
      >
        <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Expense Title / Purpose *
            </label>
            <input
              type="text"
              required
              id="expense-title-input"
              placeholder="e.g. Electric bill / Cleaning supplies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                id="expense-amount-input"
                placeholder="25.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="Utilities">Utilities (Power/Water)</option>
                <option value="Rent">Shop Rent</option>
                <option value="Salaries">Staff Salaries</option>
                <option value="Supplies">Packing & Supplies</option>
                <option value="Maintenance">Maintenance / Repair</option>
                <option value="Food & Tea">Tea & Refreshments</option>
                <option value="Other">Other Expenses</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payment Source *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                  paymentMethod === 'Cash'
                    ? 'bg-orange-50 border-orange-500 text-orange-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Cash (from Drawer)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Bank Transfer')}
                className={`py-2 px-3 rounded-xl border font-bold cursor-pointer ${
                  paymentMethod === 'Bank Transfer'
                    ? 'bg-orange-50 border-orange-500 text-orange-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Bank Transfer
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {paymentMethod === 'Cash'
                ? 'Requires an active cash counter and deducts immediately from drawer cash.'
                : 'Does not affect physical counter drawer cash.'}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Receipt #4491"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmitting}
              id="confirm-record-expense-btn"
            >
              Record Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense? If paid from cash, it will be refunded back to drawer cash."
        confirmLabel="Delete Expense"
        isDestructive
      />
    </div>
  );
};
