import { Expense } from '../types';
import { getAllRecords, putRecord, getRecordById, deleteRecord } from '../database/indexedDB';
import { roundMoney } from '../utils/formatters';
import { recordCounterMovement, getActiveCounterSession, getCurrentCashInDrawer } from './counterService';

export async function getExpenses(): Promise<Expense[]> {
  const expenses = await getAllRecords<Expense>('expenses');
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createExpense(data: {
  title: string;
  category: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer';
  date?: string;
  note?: string;
}): Promise<Expense> {
  const amount = roundMoney(data.amount);
  if (amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  // STRICT RULE 2: Validate cash sufficiency before saving cash expense
  if (data.paymentMethod === 'Cash') {
    const activeSession = await getActiveCounterSession();
    if (!activeSession) {
      throw new Error('Counter is closed. Please open the counter before recording a cash expense.');
    }

    const currentCash = await getCurrentCashInDrawer();
    if (currentCash < amount) {
      throw new Error(`Insufficient drawer cash. Available: ${currentCash}, Required: ${amount}`);
    }
  }

  const now = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const expense: Expense = {
    id,
    title: data.title.trim(),
    category: data.category.trim(),
    amount,
    paymentMethod: data.paymentMethod,
    date: now,
    note: data.note?.trim() || undefined,
    createdAt: now,
  };

  await putRecord('expenses', expense);

  // If Cash, deduct from counter cash and create movement
  if (data.paymentMethod === 'Cash') {
    await recordCounterMovement(
      'Expense',
      -amount,
      expense.title,
      `Expense: ${expense.title} (${expense.category})`
    );
  }

  return expense;
}

export const recordExpense = createExpense;

export async function deleteExpense(id: string): Promise<void> {
  const expense = await getRecordById<Expense>('expenses', id);
  if (!expense) return;

  await deleteRecord('expenses', id);

  if (expense.paymentMethod === 'Cash') {
    const active = await getActiveCounterSession();
    if (active) {
      await recordCounterMovement(
        'Cash Adjustment',
        expense.amount,
        `Reversal: ${expense.title}`,
        `Deleted expense: ${expense.title}`
      );
    }
  }
}
