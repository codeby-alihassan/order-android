import { Sale, SaleItem, CartItem, PaymentMethod } from '../types';
import { getAllRecords, getRecordById, putRecord, putManyRecords } from '../database/indexedDB';
import { roundMoney } from '../utils/formatters';
import { getProductById, updateProduct } from './productService';
import { getCustomerById, recordCustomerCreditSale, updateCustomer } from './customerService';
import { recordCounterMovement, getActiveCounterSession, recordNonCashSaleToSession, getCurrentCashInDrawer } from './counterService';
import { getSettings } from './settingsService';

export async function getSales(): Promise<Sale[]> {
  const sales = await getAllRecords<Sale>('sales');
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getSaleById(id: string): Promise<Sale | undefined> {
  return getRecordById<Sale>('sales', id);
}

export async function completeSale(data: {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  customerId?: string;
  bankReference?: string;
  taxPercentage?: number;
  date?: string;
}): Promise<Sale> {
  if (!data.items || data.items.length === 0) {
    throw new Error('Cart cannot be empty.');
  }

  // 1. Stock validation before anything is committed
  for (const item of data.items) {
    const product = await getProductById(item.product.id);
    if (!product) {
      throw new Error(`Product ${item.product.name} no longer exists.`);
    }
    if (product.currentStock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Requested: ${item.quantity}.`
      );
    }
  }

  // 2. Payment Method Validations
  let customerName: string | undefined;
  let customerPhone: string | undefined;

  if (data.paymentMethod === 'Cash') {
    const activeSession = await getActiveCounterSession();
    if (!activeSession) {
      throw new Error('Please open the counter before making a cash sale.');
    }
  } else if (data.paymentMethod === 'Credit') {
    if (!data.customerId) {
      throw new Error('Credit sales require a customer. Please select a customer.');
    }
    const customer = await getCustomerById(data.customerId);
    if (!customer) {
      throw new Error('Selected customer was not found.');
    }
    customerName = customer.name;
    customerPhone = customer.phone;
  }

  // 3. Prepare items, profit, and financial totals
  let subtotal = 0;
  let totalProfit = 0;
  const processedItems: SaleItem[] = [];

  for (const item of data.items) {
    const product = (await getProductById(item.product.id))!;
    const qty = Math.max(1, Math.floor(item.quantity));
    const salePrice = roundMoney(item.salePrice);
    const lineTotal = roundMoney(qty * salePrice);
    const costPrice = product.costPrice; // Snapshot of cost at sale time
    const profit = roundMoney((salePrice - costPrice) * qty);

    subtotal = roundMoney(subtotal + lineTotal);
    totalProfit = roundMoney(totalProfit + profit);

    processedItems.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      quantity: qty,
      costPrice,
      salePrice,
      lineTotal,
      profit,
    });
  }

  const settings = await getSettings();
  const taxPct = data.taxPercentage !== undefined ? data.taxPercentage : settings.taxPercentage;
  const taxAmount = roundMoney((subtotal * taxPct) / 100);
  const total = roundMoney(subtotal + taxAmount);

  // Generate invoice number
  const allSales = await getAllRecords<Sale>('sales');
  const invoiceNum = `${settings.invoicePrefix}${String(1001 + allSales.length)}`;
  const now = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
  const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // 4. Reduce stock for each product
  for (const item of processedItems) {
    const product = (await getProductById(item.productId))!;
    const newStock = Math.max(0, product.currentStock - item.quantity);
    await updateProduct(product.id, { currentStock: newStock });
  }

  // 5. Handle payment consequences
  if (data.paymentMethod === 'Cash') {
    await recordCounterMovement(
      'Cash Sale',
      total,
      invoiceNum,
      `Sale Invoice ${invoiceNum}`
    );
  } else if (data.paymentMethod === 'Credit') {
    await recordCustomerCreditSale(data.customerId!, total, invoiceNum);
    await recordNonCashSaleToSession('Credit', total);
  } else if (data.paymentMethod === 'Bank Transfer') {
    await recordNonCashSaleToSession('Bank Transfer', total);
  }

  // 6. Save sale & sale_items
  const sale: Sale = {
    id: saleId,
    invoiceNumber: invoiceNum,
    date: now,
    items: processedItems,
    subtotal,
    taxPercentage: taxPct,
    taxAmount,
    total,
    totalProfit,
    paymentMethod: data.paymentMethod,
    customerId: data.customerId,
    customerName,
    customerPhone,
    bankReference: data.bankReference?.trim() || undefined,
    status: 'Completed',
    createdAt: now,
  };

  await putRecord('sales', sale);
  await putManyRecords('sale_items', processedItems.map((si, idx) => ({
    ...si,
    id: `${saleId}-item-${idx}`,
    saleId,
  } as any)));

  return sale;
}

export async function voidSale(saleId: string, reason: string): Promise<Sale> {
  const sale = await getSaleById(saleId);
  if (!sale) {
    throw new Error('Sale not found.');
  }
  if (sale.status === 'Voided') {
    throw new Error('Sale has already been voided.');
  }

  // STRICT RULE 2: If this was a cash sale, refunding cash requires sufficient drawer balance
  if (sale.paymentMethod === 'Cash') {
    const activeSession = await getActiveCounterSession();
    if (!activeSession) {
      throw new Error('Counter is closed. Please open the counter to process cash refund.');
    }
    const currentCash = await getCurrentCashInDrawer();
    if (currentCash < sale.total) {
      throw new Error(`Insufficient drawer cash. Available: ${currentCash}, Required: ${sale.total}`);
    }
  }

  const now = new Date().toISOString();

  // 1. Revert product stock
  for (const item of sale.items) {
    const product = await getProductById(item.productId);
    if (product) {
      await updateProduct(product.id, {
        currentStock: product.currentStock + item.quantity,
      });
    }
  }

  // 2. Revert financial impacts
  if (sale.paymentMethod === 'Cash') {
    const activeSession = await getActiveCounterSession();
    if (activeSession) {
      await recordCounterMovement(
        'Void Sale',
        -sale.total,
        sale.invoiceNumber,
        `Reversal for voided sale: ${reason}`
      );
    }
  } else if (sale.paymentMethod === 'Credit' && sale.customerId) {
    const customer = await getCustomerById(sale.customerId);
    if (customer) {
      const newBalance = roundMoney(customer.currentBalance - sale.total);
      await updateCustomer(customer.id, { currentBalance: newBalance });
      await putRecord('customer_transactions', {
        id: `ct-${Date.now()}-void`,
        customerId: customer.id,
        date: now,
        type: 'Void',
        amount: -sale.total,
        referenceId: sale.invoiceNumber,
        note: `Void sale ${sale.invoiceNumber}: ${reason}`,
        balanceAfter: newBalance,
        createdAt: now,
      });
    }
  }

  // 3. Mark sale as voided (preserving historical record)
  const updatedSale: Sale = {
    ...sale,
    status: 'Voided',
    voidReason: reason.trim(),
    voidedAt: now,
  };

  await putRecord('sales', updatedSale);
  return updatedSale;
}
