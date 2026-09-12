import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Truck, Phone, ArrowUpRight, History } from 'lucide-react';
import { Supplier, SupplierTransaction } from '../types';
import {
  getSuppliers,
  createSupplier,
  getSupplierTransactions,
  recordSupplierPayment,
} from '../services/supplierService';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface SuppliersPageProps {
  currency: string;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ currency }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Add Supplier Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Record Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer'>('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const list = await getSuppliers();
    setSuppliers(list);
  };

  const openSupplierDetail = async (s: Supplier) => {
    setSelectedSupplier(s);
    const txns = await getSupplierTransactions(s.id);
    setTransactions(txns);
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormError('Supplier name and phone number are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createSupplier({
        name,
        phone,
        address,
        notes,
        openingBalance: parseFloat(openingBalance) || 0,
      });
      await loadSuppliers();
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setOpeningBalance('0.00');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setPaymentError(null);
      await recordSupplierPayment(
        selectedSupplier.id,
        amt,
        paymentMethod,
        paymentNote
      );

      // Reload
      await loadSuppliers();
      const updatedList = await getSuppliers();
      const updated = updatedList.find((s) => s.id === selectedSupplier.id);
      if (updated) {
        setSelectedSupplier(updated);
        const txns = await getSupplierTransactions(updated.id);
        setTransactions(txns);
      }
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to record supplier payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  return (
    <div id="suppliers-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Top Header & New Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Vendors & Suppliers</h2>
          <p className="text-xs text-slate-500">Payables & stock suppliers</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          id="add-supplier-btn"
        >
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          id="suppliers-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search suppliers by name or phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
      </div>

      {/* Suppliers List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
            No suppliers found. Tap 'Add Supplier' to register vendors.
          </div>
        ) : (
          filtered.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => openSupplierDetail(supplier)}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 cursor-pointer transition-colors active:scale-99"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{supplier.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {supplier.phone}
                    </span>
                  </div>
                  {supplier.address && (
                    <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                      {supplier.address}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    We Owe
                  </span>
                  <span
                    className={`text-sm font-black block ${
                      supplier.currentBalance > 0 ? 'text-amber-600' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(supplier.currentBalance, currency)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Tap to view purchases & payments</span>
                <span className="text-orange-600 font-semibold">Ledger & Pay →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Vendor / Supplier"
        subtitle="Maintain payables and purchase records"
        maxWidth="sm"
        id="supplier-form-modal"
      >
        <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Name *</label>
            <input
              type="text"
              required
              id="supplier-name-input"
              placeholder="e.g. Apex Wholesalers Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              id="supplier-phone-input"
              placeholder="e.g. +1 (555) 890-1122"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              placeholder="e.g. Warehouse 4B, Industrial Zone"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Opening Balance Owed ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Initial debt owed to this vendor before using the system.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Delivers every Monday and Thursday"
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
              id="confirm-add-supplier-btn"
            >
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supplier Ledger Modal */}
      {selectedSupplier && (
        <Modal
          isOpen={Boolean(selectedSupplier)}
          onClose={() => setSelectedSupplier(null)}
          title={selectedSupplier.name}
          subtitle={`Current Payable Balance: ${formatCurrency(selectedSupplier.currentBalance, currency)}`}
          maxWidth="md"
          id="supplier-ledger-modal"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Balance Owed to Vendor
                </span>
                <h3 className="text-xl font-black text-amber-600">
                  {formatCurrency(selectedSupplier.currentBalance, currency)}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedSupplier.phone}</p>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setPaymentAmount(selectedSupplier.currentBalance > 0 ? selectedSupplier.currentBalance.toFixed(2) : '50.00');
                  setPaymentError(null);
                  setIsPaymentModalOpen(true);
                }}
                leftIcon={<ArrowUpRight className="w-4 h-4" />}
                id="supplier-pay-vendor-btn"
              >
                Pay Vendor
              </Button>
            </div>

            {/* History Table */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Transaction History</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No transactions recorded for this supplier.
                  </div>
                ) : (
                  transactions.map((t) => (
                    <div key={t.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              t.type === 'Payment'
                                ? 'success'
                                : t.type === 'Credit Purchase'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {t.type}
                          </Badge>
                          {t.referenceId && (
                            <span className="font-mono text-[11px] text-slate-600 font-bold">
                              {t.referenceId}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDateTime(t.date)} {t.note ? `• ${t.note}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold text-xs block ${
                            t.type === 'Payment'
                              ? 'text-emerald-600'
                              : t.type === 'Credit Purchase'
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {t.type === 'Payment' ? '-' : '+'}
                          {formatCurrency(t.amount, currency)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Bal: {formatCurrency(t.balanceAfter, currency)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment to Vendor Modal */}
      {selectedSupplier && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Make Payment to Supplier"
          subtitle={`Pay to ${selectedSupplier.name}`}
          maxWidth="sm"
          id="pay-supplier-modal"
        >
          <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {paymentError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Amount ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                id="supplier-pay-amount-input"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Method *
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
                  Cash (Drawer -)
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
                  ? 'Deducts cash directly from the active counter drawer.'
                  : 'Does not affect physical counter cash.'}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Receipt Note / Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Paid weekly delivery invoice"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1"
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isProcessingPayment}
                id="confirm-pay-supplier-btn"
              >
                Confirm Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
