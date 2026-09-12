import { AppSettings, Product, Customer, Supplier, Purchase, PurchaseItem, Sale, SaleItem, Expense, CounterSession, CounterMovement, CustomerTransaction, SupplierTransaction } from '../types';
import { generateSalt, hashPassword } from '../services/authService';

/**
 * Creates default app settings with the initial admin credentials.
 * Credentials:
 *   Username: admin
 *   Password: admin123
 */
export async function createDefaultSettings(): Promise<AppSettings> {
  const salt = await generateSalt(16);
  const hash = await hashPassword('admin123', salt);

  return {
    id: 'current_settings',
    businessName: 'Orderly POS',
    businessAddress: '',
    phoneNumber: '',
    currency: '$',
    taxPercentage: 0,
    invoicePrefix: 'INV-',
    theme: 'light',
    adminPasswordHash: hash,
    adminPasswordSalt: salt,
    isFirstLaunch: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Clean initial dataset with no demo business data.
 */
export function createInitialSeedData(): {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  sales: Sale[];
  saleItems: SaleItem[];
  expenses: Expense[];
  counterSessions: CounterSession[];
  counterMovements: CounterMovement[];
  customerTransactions: CustomerTransaction[];
  supplierTransactions: SupplierTransaction[];
} {
  return {
    products: [],
    customers: [],
    suppliers: [],
    purchases: [],
    purchaseItems: [],
    sales: [],
    saleItems: [],
    expenses: [],
    counterSessions: [],
    counterMovements: [],
    customerTransactions: [],
    supplierTransactions: [],
  };
}

/**
 * Placeholder kept for interface compatibility; no demo data is seeded.
 */
export async function seedDatabase(): Promise<void> {
  // Demo data removed. App starts with a clean database.
}
