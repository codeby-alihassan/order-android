import { Customer, CustomerTransaction } from '../types';
import { getAllRecords, getRecordById, putRecord } from '../database/indexedDB';
import { roundMoney } from '../utils/formatters';
import { recordCounterMovement, getActiveCounterSession } from './counterService';

export async function getCustomers(): Promise<Customer[]> {
  const customers = await getAllRecords<Customer>('customers');
  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  return getRecordById<Customer>('customers', id);
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  openingBalance?: number;
}): Promise<Customer> {
  const now = new Date().toISOString();
  const id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const openingBalance = roundMoney(data.openingBalance || 0);

  const customer: Customer = {
    id,
    name: data.name.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    notes: data.notes?.trim() || undefined,
    openingBalance,
    currentBalance: openingBalance,
    createdAt: now,
    updatedAt: now,
  };

  await putRecord('customers', customer);

  if (openingBalance > 0) {
    const transaction: CustomerTransaction = {
      id: `ct-${Date.now()}-open`,
      customerId: id,
      date: now,
      type: 'Adjustment',
      amount: openingBalance,
      note: 'Initial opening balance',
      balanceAfter: openingBalance,
      createdAt: now,
    };
    await putRecord('customer_transactions', transaction);
  }

  return customer;
}

export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, 'id' | 'createdAt'>>
): Promise<Customer> {
  const existing = await getCustomerById(id);
  if (!existing) {
    throw new Error('Customer not found.');
  }

  const updated: Customer = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await putRecord('customers', updated);
  return updated;
}

export async function getCustomerTransactions(customerId: string): Promise<CustomerTransaction[]> {
  const all = await getAllRecords<CustomerTransaction>('customer_transactions');
  return all
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function recordCustomerCreditSale(
  customerId: string,
  saleAmount: number,
  invoiceNumber: string
): Promise<CustomerTransaction> {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Error('Customer not found for credit sale.');
  }

  const roundedAmount = roundMoney(saleAmount);
  const newBalance = roundMoney(customer.currentBalance + roundedAmount);
  const now = new Date().toISOString();

  const transaction: CustomerTransaction = {
    id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    date: now,
    type: 'Credit Sale',
    amount: roundedAmount,
    referenceId: invoiceNumber,
    note: `Invoice ${invoiceNumber}`,
    balanceAfter: newBalance,
    createdAt: now,
  };

  await putRecord('customer_transactions', transaction);
  await updateCustomer(customerId, { currentBalance: newBalance });

  return transaction;
}

export async function recordCustomerPayment(
  customerId: string,
  amount: number,
  paymentMethod: 'Cash' | 'Bank Transfer',
  note?: string
): Promise<{ transaction: CustomerTransaction }> {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Error('Customer not found.');
  }

  const paymentAmount = roundMoney(amount);
  if (paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // If cash, counter must be open
  if (paymentMethod === 'Cash') {
    const activeSession = await getActiveCounterSession();
    if (!activeSession) {
      throw new Error('Counter is closed. Please open the counter before receiving a cash payment.');
    }
  }

  const newBalance = roundMoney(customer.currentBalance - paymentAmount);
  const now = new Date().toISOString();

  const transaction: CustomerTransaction = {
    id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    customerId,
    date: now,
    type: 'Payment',
    amount: paymentAmount,
    paymentMethod,
    note: note?.trim() || `Payment via ${paymentMethod}`,
    balanceAfter: newBalance,
    createdAt: now,
  };

  await putRecord('customer_transactions', transaction);
  await updateCustomer(customerId, { currentBalance: newBalance });

  // Update counter cash if Cash
  if (paymentMethod === 'Cash') {
    await recordCounterMovement(
      'Customer Payment',
      paymentAmount,
      customer.name,
      `Received payment on credit account: ${customer.name}`
    );
  }

  return { transaction };
}
