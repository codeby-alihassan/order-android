import { CounterSession, CounterMovement, CounterMovementType } from '../types';
import { getAllRecords, putRecord, getRecordById } from '../database/indexedDB';
import { roundMoney, formatTimeOnly } from '../utils/formatters';

export async function getCounterSessions(): Promise<CounterSession[]> {
  const sessions = await getAllRecords<CounterSession>('counter_sessions');
  // Sort by sessionNumber descending or openedAt descending
  return sessions.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
}

export async function getActiveCounterSession(): Promise<CounterSession | null> {
  const sessions = await getAllRecords<CounterSession>('counter_sessions');
  const active = sessions.find((s) => s.status === 'OPEN');
  return active || null;
}

export async function getSessionMovements(sessionId: string): Promise<CounterMovement[]> {
  const movements = await getAllRecords<CounterMovement>('counter_movements');
  return movements
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getAllCounterMovements(): Promise<CounterMovement[]> {
  const movements = await getAllRecords<CounterMovement>('counter_movements');
  return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCurrentCashInDrawer(): Promise<number> {
  const activeSession = await getActiveCounterSession();
  if (!activeSession) return 0;

  const movements = await getSessionMovements(activeSession.id);
  const movementTotal = movements.reduce((acc, m) => acc + m.amount, 0);
  return roundMoney(movementTotal);
}

export async function openCounter(openingCashAmount: number): Promise<CounterSession> {
  const existingActive = await getActiveCounterSession();
  if (existingActive) {
    throw new Error('A counter session is already OPEN. Please close it first.');
  }

  const allSessions = await getAllRecords<CounterSession>('counter_sessions');
  const nextSessionNumber = allSessions.length > 0
    ? Math.max(...allSessions.map((s) => s.sessionNumber || 0)) + 1
    : 1;

  const now = new Date();
  const sessionId = `cs-${Date.now()}`;
  const openingFloat = Math.max(0, roundMoney(openingCashAmount));

  const newSession: CounterSession = {
    id: sessionId,
    sessionNumber: nextSessionNumber,
    status: 'OPEN',
    openedAt: now.toISOString(),
    openingCash: openingFloat,
    cashSales: 0,
    bankSales: 0,
    creditSales: 0,
    cashExpenses: 0,
    cashCustomerPayments: 0,
    cashSupplierPayments: 0,
    otherCashIn: 0,
    otherCashOut: 0,
    expectedCash: openingFloat,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await putRecord('counter_sessions', newSession);

  // Record opening cash movement
  const movement: CounterMovement = {
    id: `cm-${Date.now()}-open`,
    sessionId,
    date: now.toISOString(),
    time: formatTimeOnly(now.toISOString()),
    type: 'Opening Cash',
    amount: openingFloat,
    reference: `Session #${nextSessionNumber} Float`,
    note: 'Initial cash present in drawer',
    resultingBalance: openingFloat,
    createdAt: now.toISOString(),
  };

  await putRecord('counter_movements', movement);

  return newSession;
}

export async function recordCounterMovement(
  type: CounterMovementType,
  amount: number,
  reference?: string,
  note?: string
): Promise<CounterMovement> {
  const activeSession = await getActiveCounterSession();
  if (!activeSession) {
    throw new Error('Please open the counter before performing this cash operation.');
  }

  const currentCash = await getCurrentCashInDrawer();
  const roundedAmount = roundMoney(amount);

  // STRICT RULE 2: Validate cash sufficiency on all cash outflows. Drawer must never become negative.
  if (roundedAmount < 0) {
    const requiredCash = Math.abs(roundedAmount);
    if (requiredCash > currentCash) {
      throw new Error(`Insufficient drawer cash. Available: ${currentCash}, Required: ${requiredCash}`);
    }
  }

  const resultingBalance = roundMoney(currentCash + roundedAmount);
  if (resultingBalance < 0) {
    throw new Error(`Insufficient drawer cash. Available: ${currentCash}, Required: ${Math.abs(roundedAmount)}`);
  }

  const now = new Date();

  const movement: CounterMovement = {
    id: `cm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sessionId: activeSession.id,
    date: now.toISOString(),
    time: formatTimeOnly(now.toISOString()),
    type,
    amount: roundedAmount,
    reference,
    note,
    resultingBalance,
    createdAt: now.toISOString(),
  };

  await putRecord('counter_movements', movement);

  // Update session counters
  const updatedSession = { ...activeSession };
  if (type === 'Cash Sale') {
    updatedSession.cashSales = roundMoney(updatedSession.cashSales + roundedAmount);
  } else if (type === 'Expense') {
    updatedSession.cashExpenses = roundMoney(updatedSession.cashExpenses + Math.abs(roundedAmount));
  } else if (type === 'Customer Payment') {
    updatedSession.cashCustomerPayments = roundMoney(updatedSession.cashCustomerPayments + roundedAmount);
  } else if (type === 'Supplier Payment') {
    updatedSession.cashSupplierPayments = roundMoney(updatedSession.cashSupplierPayments + Math.abs(roundedAmount));
  } else if (type === 'Cash Deposit') {
    updatedSession.otherCashIn = roundMoney(updatedSession.otherCashIn + roundedAmount);
  } else if (type === 'Cash Withdrawal') {
    updatedSession.otherCashOut = roundMoney(updatedSession.otherCashOut + Math.abs(roundedAmount));
  } else if (type === 'Cash Adjustment') {
    if (roundedAmount >= 0) {
      updatedSession.otherCashIn = roundMoney(updatedSession.otherCashIn + roundedAmount);
    } else {
      updatedSession.otherCashOut = roundMoney(updatedSession.otherCashOut + Math.abs(roundedAmount));
    }
  } else if (type === 'Void Sale') {
    updatedSession.cashSales = roundMoney(updatedSession.cashSales + roundedAmount); // roundedAmount is negative
  }

  updatedSession.expectedCash = resultingBalance;
  updatedSession.updatedAt = now.toISOString();
  await putRecord('counter_sessions', updatedSession);

  return movement;
}

export async function recordNonCashSaleToSession(
  method: 'Bank Transfer' | 'Credit',
  amount: number
): Promise<void> {
  const activeSession = await getActiveCounterSession();
  if (!activeSession) return; // Non-cash can occur even if counter closed, but if open, update session breakdown

  const roundedAmount = roundMoney(amount);
  const updatedSession = { ...activeSession };
  if (method === 'Bank Transfer') {
    updatedSession.bankSales = roundMoney(updatedSession.bankSales + roundedAmount);
  } else {
    updatedSession.creditSales = roundMoney(updatedSession.creditSales + roundedAmount);
  }
  updatedSession.updatedAt = new Date().toISOString();
  await putRecord('counter_sessions', updatedSession);
}

export async function closeCounter(
  actualClosingCash: number,
  closingNote?: string
): Promise<CounterSession> {
  const activeSession = await getActiveCounterSession();
  if (!activeSession) {
    throw new Error('No active counter session is currently OPEN.');
  }

  const expectedCash = await getCurrentCashInDrawer();
  const actualCash = roundMoney(actualClosingCash);
  const difference = roundMoney(actualCash - expectedCash);

  // STRICT RULE 3: If actual cash is LESS or MORE than expected, DO NOT automatically close.
  // The counter must remain OPEN until the discrepancy is resolved/confirmed through an explicit adjustment workflow.
  if (difference !== 0) {
    throw new Error(
      `Cash Difference Detected. Expected: ${expectedCash}, Actual: ${actualCash}, Difference: ${difference}. Counter must remain open until discrepancy is resolved.`
    );
  }

  const now = new Date();
  const closedSession: CounterSession = {
    ...activeSession,
    status: 'CLOSED',
    closedAt: now.toISOString(),
    expectedCash,
    actualClosingCash: actualCash,
    difference: 0,
    closingNote: closingNote?.trim() || undefined,
    updatedAt: now.toISOString(),
  };

  await putRecord('counter_sessions', closedSession);

  // Record closing movement
  const closingMovement: CounterMovement = {
    id: `cm-${Date.now()}-close`,
    sessionId: activeSession.id,
    date: now.toISOString(),
    time: formatTimeOnly(now.toISOString()),
    type: 'Closing',
    amount: 0,
    reference: `Session #${activeSession.sessionNumber} Closed`,
    note: `Balanced close at: ${actualCash}`,
    resultingBalance: actualCash,
    createdAt: now.toISOString(),
  };

  await putRecord('counter_movements', closingMovement);

  return closedSession;
}

/**
 * Explicit reconciliation workflow for counter close when an excess or shortage is detected.
 * Records the exact adjustment movement with a mandatory explanation, bringing drawer to actual cash,
 * and then closes the session with full audit history.
 */
export async function reconcileDiscrepancyAndClose(
  actualClosingCash: number,
  discrepancyReason: string,
  closingNote?: string
): Promise<CounterSession> {
  const activeSession = await getActiveCounterSession();
  if (!activeSession) {
    throw new Error('No active counter session is currently OPEN.');
  }

  if (!discrepancyReason || !discrepancyReason.trim()) {
    throw new Error('A reason is required to explicitly resolve and record the cash discrepancy.');
  }

  const expectedCash = await getCurrentCashInDrawer();
  const actualCash = roundMoney(actualClosingCash);
  const difference = roundMoney(actualCash - expectedCash);

  if (difference === 0) {
    return closeCounter(actualCash, closingNote);
  }

  // If shortage, verify drawer has enough cash to deduct
  if (difference < 0) {
    const shortage = Math.abs(difference);
    if (shortage > expectedCash) {
      throw new Error(`Insufficient drawer cash. Available: ${expectedCash}, Required: ${shortage}`);
    }
  }

  // Explicitly record adjustment movement
  const noteText = `Discrepancy adjustment: ${discrepancyReason.trim()} (Expected: ${expectedCash}, Actual: ${actualCash}, Diff: ${difference > 0 ? '+' : ''}${difference})`;
  await recordCounterMovement(
    'Cash Adjustment',
    difference,
    `Close Reconciliation (#${activeSession.sessionNumber})`,
    noteText
  );

  const combinedNote = closingNote?.trim()
    ? `${closingNote.trim()} | Discrepancy Note: ${discrepancyReason.trim()}`
    : `Discrepancy Note: ${discrepancyReason.trim()}`;

  // Now expectedCash equals actualCash, close normally
  return closeCounter(actualCash, combinedNote);
}

export async function recordCashMovement(
  type: 'Cash In (Deposit)' | 'Cash Out (Withdrawal)' | CounterMovementType,
  amount: number,
  reason?: string
): Promise<CounterMovement> {
  const isWithdrawal =
    type === 'Cash Out (Withdrawal)' ||
    type === 'Cash Withdrawal' ||
    (typeof amount === 'number' && amount < 0);

  const absAmount = Math.abs(roundMoney(amount));

  if (isWithdrawal) {
    const currentCash = await getCurrentCashInDrawer();
    if (currentCash < absAmount) {
      throw new Error(`Insufficient drawer cash. Available: ${currentCash}, Required: ${absAmount}`);
    }
  }

  const movementType: CounterMovementType =
    type === 'Cash In (Deposit)'
      ? 'Cash Deposit'
      : type === 'Cash Out (Withdrawal)'
      ? 'Cash Withdrawal'
      : type;

  const finalAmount = isWithdrawal ? -absAmount : absAmount;

  return recordCounterMovement(movementType, finalAmount, reason, reason);
}
