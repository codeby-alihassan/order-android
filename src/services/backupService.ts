import * as XLSX from 'xlsx';
import { exportAllStores, importAllStores, getAllRecords } from '../database/indexedDB';
import { Product, Customer, Supplier, Purchase, Sale, Expense, CounterSession } from '../types';
import { formatDateTime, roundMoney } from '../utils/formatters';

export async function exportJSONBackup(): Promise<void> {
  const data = await exportAllStores();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orderly_pos_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportDatabaseToJson = exportJSONBackup;

export async function importJSONBackup(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid backup file format.' };
    }

    // Basic structure validation
    if (!('products' in data) && !('sales' in data) && !('settings' in data)) {
      return { success: false, message: 'File is not a recognized Orderly POS backup.' };
    }

    await importAllStores(data);
    return { success: true, message: 'Backup successfully restored!' };
  } catch (error: any) {
    console.error('Import error:', error);
    return { success: false, message: error?.message || 'Failed to parse backup file.' };
  }
}

export const importDatabaseFromJson = importJSONBackup;

export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}

export async function exportSalesToExcel(salesList?: Sale[], _currency?: string): Promise<void> {
  const sales = salesList || (await getAllRecords<Sale>('sales'));
  const rows = sales.map((s) => ({
    'Invoice #': s.invoiceNumber,
    'Date & Time': formatDateTime(s.date),
    'Payment Method': s.paymentMethod,
    'Customer': s.customerName || 'Walk-in',
    'Customer Phone': s.customerPhone || '-',
    'Subtotal': roundMoney(s.subtotal),
    'Tax (%)': s.taxPercentage,
    'Tax Amount': roundMoney(s.taxAmount),
    'Total Amount': roundMoney(s.total),
    'Profit': roundMoney(s.totalProfit),
    'Status': s.status,
    'Items Count': s.items.length,
    'Items Summary': s.items.map((i) => `${i.productName} (x${i.quantity})`).join(', '),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
  downloadWorkbook(workbook, `orderly_sales_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportPurchasesToExcel(purchasesList?: Purchase[], _currency?: string): Promise<void> {
  const purchases = purchasesList || (await getAllRecords<Purchase>('purchases'));
  const rows = purchases.map((p) => ({
    'Purchase #': p.purchaseNumber,
    'Date & Time': formatDateTime(p.date),
    'Supplier': p.supplierName,
    'Total Quantity': p.totalQuantity,
    'Total Cost': roundMoney(p.totalAmount),
    'Payment Status': p.paymentStatus,
    'Payment Method': p.paymentMethod || '-',
    'Notes': p.notes || '-',
    'Items Summary': p.items.map((i) => `${i.productName} (x${i.quantity} @ ${i.unitCost})`).join(', '),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');
  downloadWorkbook(workbook, `orderly_purchases_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportExpensesToExcel(expensesList?: Expense[], _currency?: string): Promise<void> {
  const expenses = expensesList || (await getAllRecords<Expense>('expenses'));
  const rows = expenses.map((e) => ({
    'ID': e.id,
    'Date & Time': formatDateTime(e.date),
    'Title': e.title,
    'Category': e.category,
    'Amount': roundMoney(e.amount),
    'Payment Method': e.paymentMethod,
    'Note': e.note || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
  downloadWorkbook(workbook, `orderly_expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportProductsToExcel(productsList?: Product[], _currency?: string): Promise<void> {
  const products = productsList || (await getAllRecords<Product>('products'));
  const rows = products.map((p) => ({
    'Code': p.code,
    'Name': p.name,
    'Category': p.category || 'General',
    'Cost Price': roundMoney(p.costPrice),
    'Selling Price': roundMoney(p.sellingPrice),
    'Current Stock': p.currentStock,
    'Low Stock Threshold': p.lowStockThreshold,
    'Stock Cost Value': roundMoney(p.costPrice * p.currentStock),
    'Stock Retail Value': roundMoney(p.sellingPrice * p.currentStock),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products & Stock');
  downloadWorkbook(workbook, `orderly_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportCustomersToExcel(customersList?: Customer[], _currency?: string): Promise<void> {
  const customers = customersList || (await getAllRecords<Customer>('customers'));
  const rows = customers.map((c) => ({
    'Name': c.name,
    'Phone': c.phone,
    'Address': c.address,
    'Outstanding Due Balance': roundMoney(c.currentBalance),
    'Opening Balance': roundMoney(c.openingBalance),
    'Notes': c.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  downloadWorkbook(workbook, `orderly_customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportSuppliersToExcel(suppliersList?: Supplier[], _currency?: string): Promise<void> {
  const suppliers = suppliersList || (await getAllRecords<Supplier>('suppliers'));
  const rows = suppliers.map((s) => ({
    'Supplier Name': s.name,
    'Phone': s.phone,
    'Address': s.address,
    'Outstanding Due (We Owe)': roundMoney(s.currentBalance),
    'Notes': s.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
  downloadWorkbook(workbook, `orderly_suppliers_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportCounterHistoryToExcel(_currencyOrList?: any): Promise<void> {
  const sessions = await getAllRecords<CounterSession>('counter_sessions');
  const rows = sessions.map((s) => ({
    'Session #': s.sessionNumber,
    'Status': s.status,
    'Opened At': formatDateTime(s.openedAt),
    'Closed At': s.closedAt ? formatDateTime(s.closedAt) : 'Currently Open',
    'Opening Cash': roundMoney(s.openingCash),
    'Cash Sales': roundMoney(s.cashSales),
    'Bank Sales': roundMoney(s.bankSales),
    'Credit Sales': roundMoney(s.creditSales),
    'Expenses': roundMoney(s.cashExpenses),
    'Expected Cash': roundMoney(s.expectedCash),
    'Actual Closing Cash': s.actualClosingCash !== undefined ? roundMoney(s.actualClosingCash) : '-',
    'Cash Difference': s.difference !== undefined ? roundMoney(s.difference) : '-',
    'Closing Note': s.closingNote || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Counter Sessions');
  downloadWorkbook(workbook, `orderly_counter_sessions_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
