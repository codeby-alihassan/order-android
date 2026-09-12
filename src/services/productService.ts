import { Product, StockBadgeStatus } from '../types';
import { getAllRecords, getRecordById, putRecord, deleteRecord } from '../database/indexedDB';
import { roundMoney } from '../utils/formatters';

export function getStockStatus(product: Product): StockBadgeStatus {
  if (product.currentStock <= 0) return 'Out of Stock';
  if (product.currentStock <= product.lowStockThreshold) return 'Low Stock';
  return 'In Stock';
}

export async function getProducts(): Promise<Product[]> {
  const products = await getAllRecords<Product>('products');
  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return getRecordById<Product>('products', id);
}

export async function createProduct(data: {
  name: string;
  code: string;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  category?: string;
}): Promise<Product> {
  const now = new Date().toISOString();
  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Strict Rule: initial stock is always 0. Stock increases only via Purchases or controlled adjustments.
  const product: Product = {
    id,
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    costPrice: Math.max(0, roundMoney(data.costPrice)),
    sellingPrice: Math.max(0, roundMoney(data.sellingPrice)),
    currentStock: 0,
    lowStockThreshold: Math.max(0, Math.floor(data.lowStockThreshold || 5)),
    category: data.category?.trim() || 'General',
    createdAt: now,
    updatedAt: now,
  };

  await putRecord('products', product);
  return product;
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error('Product not found.');
  }

  const updated: Product = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await putRecord('products', updated);
  return updated;
}

export async function deleteProductPermanently(id: string): Promise<void> {
  await deleteRecord('products', id);
}
