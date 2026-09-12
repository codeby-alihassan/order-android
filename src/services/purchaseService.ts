import { Purchase, PurchaseItem } from '../types';
import { getAllRecords, getRecordById, putRecord, putManyRecords } from '../database/indexedDB';
import { roundMoney } from '../utils/formatters';
import { getProductById, updateProduct } from './productService';
import { getSupplierById, updateSupplier } from './supplierService';
import { recordCounterMovement, getActiveCounterSession, getCurrentCashInDrawer } from './counterService';

export async function getPurchases(): Promise<Purchase[]> {
  const purchases = await getAllRecords<Purchase>('purchases');
  return purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPurchaseById(id: string): Promise<Purchase | undefined> {
  return getRecordById<Purchase>('purchases', id);
}

export async function createPurchase(data: {
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
  paymentStatus: 'Paid' | 'Credit';
  paymentMethod?: 'Cash' | 'Bank Transfer';
  notes?: string;
  date?: string;
}): Promise<Purchase> {
  if (data.items.length === 0) {
    throw new Error('At least one product item is required for a purchase.');
  }

  const supplier = await getSupplierById(data.supplierId);
  if (!supplier) {
    throw new Error('Supplier not found. Please select a valid supplier.');
  }

  // 1. Precalculate line totals and validate product existence (DO NOT modify DB yet)
  let totalQuantity = 0;
  let totalAmount = 0;
  const processedItems: PurchaseItem[] = [];

  for (const item of data.items) {
    const product = await getProductById(item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found.`);
    }

    const qty = Math.max(1, Math.floor(item.quantity));
    const cost = Math.max(0, roundMoney(item.unitCost));
    const lineTotal = roundMoney(qty * cost);

    totalQuantity += qty;
    totalAmount = roundMoney(totalAmount + lineTotal);

    processedItems.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      quantity: qty,
      unitCost: cost,
      lineTotal,
    });
  }

  // 2. STRICT RULE 1: If paid in cash from drawer, check drawer cash BEFORE any mutations
  const isCashPayment = data.paymentStatus === 'Paid' && data.paymentMethod === 'Cash';
  if (isCashPayment) {
    const activeSession = await getActiveCounterSession();
    if (!activeSession) {
      throw new Error('Counter is closed. Please open the counter before paying cash for purchases.');
    }

    const currentDrawerCash = await getCurrentCashInDrawer();
    if (currentDrawerCash < totalAmount) {
      // DO NOT save purchase, DO NOT increase stock, DO NOT change supplier balance, DO NOT change drawer cash
      throw new Error(`Insufficient drawer cash. Available: ${currentDrawerCash}, Required: ${totalAmount}`);
    }
  }

  // 3. Sufficient cash available (or Credit / Bank Transfer) -> Execute mutations
  // Update stock for all purchased products
  for (const item of processedItems) {
    const product = (await getProductById(item.productId))!;
    const newStock = product.currentStock + item.quantity;
    await updateProduct(product.id, {
      currentStock: newStock,
      costPrice: item.unitCost, // Update cost price to latest purchase cost
    });
  }

  const allPurchases = await getAllRecords<Purchase>('purchases');
  const purchaseNum = `PUR-${String(allPurchases.length + 1).padStart(3, '0')}`;
  const now = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const purchaseId = `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const purchase: Purchase = {
    id: purchaseId,
    purchaseNumber: purchaseNum,
    date: now,
    supplierId: supplier.id,
    supplierName: supplier.name,
    items: processedItems,
    totalQuantity,
    totalAmount,
    paymentStatus: data.paymentStatus,
    paymentMethod: data.paymentStatus === 'Paid' ? data.paymentMethod : undefined,
    notes: data.notes?.trim() || undefined,
    createdAt: now,
  };

  // Save purchase and purchase items
  await putRecord('purchases', purchase);
  await putManyRecords('purchase_items', processedItems.map((pi, idx) => ({
    ...pi,
    id: `${purchaseId}-item-${idx}`,
    purchaseId,
  } as any)));

  // If purchase on credit, update supplier due balance and record transaction
  if (data.paymentStatus === 'Credit') {
    const newBalance = roundMoney(supplier.currentBalance + totalAmount);
    await updateSupplier(supplier.id, { currentBalance: newBalance });

    await putRecord('supplier_transactions', {
      id: `st-${Date.now()}-pur`,
      supplierId: supplier.id,
      date: now,
      type: 'Purchase Credit',
      amount: totalAmount,
      referenceId: purchaseNum,
      note: `Purchase ${purchaseNum} billed on credit`,
      balanceAfter: newBalance,
      createdAt: now,
    });
  } else if (isCashPayment) {
    // Deduct the full purchase amount from Current Drawer Cash and record movement
    await recordCounterMovement(
      'Supplier Payment',
      -totalAmount,
      purchaseNum,
      `Paid ${supplier.name} for purchase ${purchaseNum}`
    );
  }

  return purchase;
}
