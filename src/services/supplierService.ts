import { Supplier, SupplierTransaction } from '../types';
import { getAllRecords, getRecordById, putRecord } from '../database/indexedDB';
import { roundMoney } from '../utils/formatters';
import { recordCounterMovement, getActiveCounterSession, getCurrentCashInDrawer } from './counterService';

export async function getSuppliers(): Promise<Supplier[]> {
  const suppliers = await getAllRecords<Supplier>('suppliers');
  return suppliers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupplierById(id: string): Promise<Supplier | undefined> {
  return getRecordById<Supplier>('suppliers', id);
}

export async function createSupplier(data: {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  openingBalance?: number;
}): Promise<Supplier> {
  const now = new Date().toISOString();
  const id = `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const balance = data.openingBalance ? roundMoney(data.openingBalance) : 0;

  const supplier: Supplier = {
    id,
    name: data.name.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    notes: data.notes?.trim() || undefined,
    currentBalance: balance,
    createdAt: now,
    updatedAt: now,
  };

  await putRecord('suppliers', supplier);
  return supplier;
}

export async function updateSupplier(
  id: string,
  updates: Partial<Omit<Supplier, 'id' | 'createdAt'>>
): Promise<Supplier> {
  const existing = await getSupplierById(id);
  if (!existing) {
    throw new Error('Supplier not found.');
  }

  const updated: Supplier = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await putRecord('suppliers', updated);
  return updated;
}

export async function getSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  const all = await getAllRecords<SupplierTransaction>('supplier_transactions');
  return all
    .filter((t) => t.supplierId === supplierId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function recordSupplierPayment(
  supplierId: string,
  amount: number,
  paymentMethod: 'Cash' | 'Bank Transfer',
  note?: string
): Promise<{ transaction: SupplierTransaction }> {
  const supplier = await getSupplierById(supplierId);
  if (!supplier) {
    throw new Error('Supplier not found.');
  }

  const paymentAmount = roundMoney(amount);
  if (paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  if (paymentMethod === 'Cash') {
    const activeSession = await getActiveCounterSession();
    if (!activeSession) {
      throw new Error('Counter is closed. Please open the counter before paying cash.');
    }

    const currentCash = await getCurrentCashInDrawer();
    if (currentCash < paymentAmount) {
      throw new Error(`Insufficient drawer cash. Available: ${currentCash}, Required: ${paymentAmount}`);
    }
  }

  const newBalance = roundMoney(supplier.currentBalance - paymentAmount);
  const now = new Date().toISOString();

  const transaction: SupplierTransaction = {
    id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    supplierId,
    date: now,
    type: 'Payment',
    amount: paymentAmount,
    paymentMethod,
    note: note?.trim() || `Payment via ${paymentMethod}`,
    balanceAfter: newBalance,
    createdAt: now,
  };

  await putRecord('supplier_transactions', transaction);
  await updateSupplier(supplierId, { currentBalance: newBalance });

  if (paymentMethod === 'Cash') {
    await recordCounterMovement(
      'Supplier Payment',
      -paymentAmount, // Decreases drawer cash
      supplier.name,
      `Paid supplier ${supplier.name}`
    );
  }

  return { transaction };
}
