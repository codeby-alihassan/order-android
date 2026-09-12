import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Truck, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Purchase, Supplier, Product } from '../types';
import { getPurchases, createPurchase } from '../services/purchaseService';
import { getSuppliers } from '../services/supplierService';
import { getProducts } from '../services/productService';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDateTime, roundMoney } from '../utils/formatters';

interface PurchasesPageProps {
  currency: string;
  onNavigateToSuppliers: () => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  currency,
  onNavigateToSuppliers,
}) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // New Purchase Form State
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([
    { productId: '', quantity: 10, unitCost: 0 },
  ]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Credit'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer'>('Cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [purList, supList, prodList] = await Promise.all([
      getPurchases(),
      getSuppliers(),
      getProducts(),
    ]);
    setPurchases(purList);
    setSuppliers(supList);
    setProducts(prodList);
    if (supList.length > 0 && !supplierId) {
      setSupplierId(supList[0].id);
    }
  };

  const openNewPurchase = () => {
    if (suppliers.length === 0) {
      onNavigateToSuppliers();
      return;
    }
    setSupplierId(suppliers[0]?.id || '');
    setItems([{ productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.costPrice || 0 }]);
    setPaymentStatus('Paid');
    setPaymentMethod('Cash');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setItems([
      ...items,
      { productId: products[0].id, quantity: 5, unitCost: products[0].costPrice },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index].productId = value;
      if (prod) {
        updated[index].unitCost = prod.costPrice;
      }
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value, 10) || 1);
    } else if (field === 'unitCost') {
      updated[index].unitCost = Math.max(0, parseFloat(value) || 0);
    }
    setItems(updated);
  };

  const calculateTotalCost = () => {
    return roundMoney(
      items.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (items.length === 0 || items.some((i) => !i.productId || i.quantity <= 0)) {
      setError('Please select valid products and positive quantities.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await createPurchase({
        supplierId,
        items,
        paymentStatus,
        paymentMethod: paymentStatus === 'Paid' ? paymentMethod : undefined,
        notes,
      });

      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to record purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="purchases-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Top Header & New Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Inventory Purchases</h2>
          <p className="text-xs text-slate-500">Official restock source</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={openNewPurchase}
          leftIcon={<Plus className="w-4 h-4" />}
          id="new-purchase-btn"
        >
          New Purchase
        </Button>
      </div>

      {suppliers.length === 0 && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span>No suppliers registered. Please add a supplier first.</span>
          <Button size="sm" variant="outline" onClick={onNavigateToSuppliers}>
            Add Supplier
          </Button>
        </div>
      )}

      {/* Purchases List */}
      <div className="space-y-3">
        {purchases.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
            No purchases recorded. Tap 'New Purchase' to restock your inventory.
          </div>
        ) : (
          purchases.map((pur) => (
            <div
              key={pur.id}
              onClick={() => setSelectedPurchase(pur)}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2 cursor-pointer transition-colors active:scale-99"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {pur.purchaseNumber}
                    </span>
                    <Badge variant={pur.paymentStatus === 'Paid' ? 'success' : 'warning'}>
                      {pur.paymentStatus} {pur.paymentMethod ? `(${pur.paymentMethod})` : ''}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pur.supplierName}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 block">
                    {formatCurrency(pur.totalAmount, currency)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {pur.totalQuantity} items added
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{formatDateTime(pur.date)}</span>
                <span className="text-orange-600 font-semibold">View Items →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Purchase Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Stock Purchase"
        subtitle="Restock inventory and auto-update stock count"
        maxWidth="md"
        id="purchase-form-modal"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          {/* Supplier Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Supplier *
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Due: {formatCurrency(s.currentBalance, currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Purchased Products *</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((row, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-5">
                    <select
                      value={row.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      required
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Unit Cost"
                      value={row.unitCost}
                      onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-200 flex justify-between font-bold text-xs text-orange-950">
              <span>Total Purchase Cost:</span>
              <span>{formatCurrency(calculateTotalCost(), currency)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="Paid">Paid Immediately</option>
                <option value="Credit">Billed on Credit (Due to Supplier)</option>
              </select>
            </div>

            {paymentStatus === 'Paid' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="Cash">Cash (from Drawer)</option>
                  <option value="Bank Transfer">Bank Transfer (External)</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Notes / Delivery Memo
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice #9928, received in good condition"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
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
              id="confirm-save-purchase-btn"
            >
              Save & Increase Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Details Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={Boolean(selectedPurchase)}
          onClose={() => setSelectedPurchase(null)}
          title={`Purchase ${selectedPurchase.purchaseNumber}`}
          subtitle={formatDateTime(selectedPurchase.date)}
          maxWidth="sm"
          id="view-purchase-modal"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Supplier
                </span>
                <span className="font-bold text-slate-900">
                  {selectedPurchase.supplierName}
                </span>
              </div>
              <Badge variant={selectedPurchase.paymentStatus === 'Paid' ? 'success' : 'warning'}>
                {selectedPurchase.paymentStatus}
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="bg-slate-100/80 px-3 py-1.5 font-semibold text-slate-700 flex justify-between">
                <span>Item</span>
                <span>Qty & Unit Cost</span>
              </div>
              {selectedPurchase.items.map((pi, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{pi.productName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{pi.productCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(pi.lineTotal, currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {pi.quantity} × {formatCurrency(pi.unitCost, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-sm text-slate-900 p-2 border-t border-slate-100">
              <span>Total Amount</span>
              <span className="text-orange-600">
                {formatCurrency(selectedPurchase.totalAmount, currency)}
              </span>
            </div>

            {selectedPurchase.notes && (
              <p className="text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                Note: {selectedPurchase.notes}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
