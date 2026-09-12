export type PaymentMethod = 'Cash' | 'Credit' | 'Bank Transfer';

export type CounterStatus = 'OPEN' | 'CLOSED';

export type CounterMovementType =
  | 'Opening Cash'
  | 'Cash Sale'
  | 'Expense'
  | 'Customer Payment'
  | 'Supplier Payment'
  | 'Cash Deposit'
  | 'Cash Withdrawal'
  | 'Cash Adjustment'
  | 'Void Sale'
  | 'Closing';

export type StockAdjustmentType =
  | 'Damage'
  | 'Expired'
  | 'Correction'
  | 'Found Stock'
  | 'Loss'
  | 'Other';

export type StockBadgeStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface AppSettings {
  id: string; // 'current_settings'
  businessName: string;
  businessAddress: string;
  address?: string;
  phoneNumber: string;
  phone?: string;
  currency: string;
  taxPercentage: number;
  invoicePrefix: string;
  theme: 'light' | 'dark' | 'system';
  adminPasswordHash: string;
  adminPasswordSalt: string;
  isFirstLaunch: boolean;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  lowStockThreshold: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  openingBalance: number;
  currentBalance: number; // Positive means customer owes business
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  date: string; // ISO string
  type: 'Credit Sale' | 'Payment' | 'Adjustment' | 'Void';
  amount: number;
  paymentMethod?: 'Cash' | 'Bank Transfer';
  referenceId?: string; // saleId or receipt #
  note?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  currentBalance: number; // Positive means business owes supplier
  createdAt: string;
  updatedAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  date: string;
  type: 'Purchase Credit' | 'Payment' | 'Adjustment';
  amount: number;
  paymentMethod?: 'Cash' | 'Bank Transfer';
  referenceId?: string; // purchaseId
  note?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalQuantity: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Credit';
  paymentMethod?: 'Cash' | 'Bank Transfer';
  notes?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  salePrice: number; // Editable selling price at checkout
  lineTotal: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  costPrice: number; // Snapshot of cost at sale time
  salePrice: number; // Actual selling price charged
  lineTotal: number;
  profit: number; // (salePrice - costPrice) * quantity
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  total: number;
  totalProfit: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  bankReference?: string;
  status: 'Completed' | 'Voided';
  voidReason?: string;
  voidedAt?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer';
  date: string;
  note?: string;
  createdAt: string;
}

export interface CounterMovement {
  id: string;
  sessionId: string;
  date: string;
  time: string;
  type: CounterMovementType;
  amount: number; // Positive = add to drawer, Negative = subtract
  reference?: string;
  note?: string;
  resultingBalance: number;
  createdAt: string;
}

export interface CounterSession {
  id: string;
  sessionNumber: number;
  status: CounterStatus;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  bankSales: number;
  creditSales: number;
  cashExpenses: number;
  cashCustomerPayments: number;
  cashSupplierPayments: number;
  otherCashIn: number;
  otherCashOut: number;
  expectedCash: number;
  actualClosingCash?: number;
  difference?: number;
  closingNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: StockAdjustmentType;
  previousStock: number;
  quantityChange: number; // e.g. -2 for damage, +5 for found
  newStock: number;
  reason: string;
  date: string;
  createdAt: string;
}

export type DateFilterType = 'Today' | '7 Days' | '1 Month' | 'Custom';
export type DateRangeFilter = 'Today' | '7 Days' | '1 Month' | 'All Time' | 'Custom';

export type CashMovement = CounterMovement;

export interface FinancialReportData {
  totalSales: number;
  totalInvoicesCount: number;
  voidedInvoicesCount: number;
  cashSalesTotal: number;
  creditSalesTotal: number;
  bankTransferSalesTotal: number;
  totalProfit: number;
  totalPurchases: number;
  totalExpenses: number;
  netIncome: number;
  completedSales: Sale[];
  topProducts: {
    productName: string;
    quantitySold: number;
    revenue: number;
    profit: number;
  }[];
}
