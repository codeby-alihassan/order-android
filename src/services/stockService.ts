import { StockAdjustment, StockAdjustmentType, Product } from '../types';
import { getAllRecords, putRecord } from '../database/indexedDB';
import { getProductById, updateProduct } from './productService';

export async function getStockAdjustments(): Promise<StockAdjustment[]> {
  const adjustments = await getAllRecords<StockAdjustment>('stock_adjustments');
  return adjustments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function adjustStock(
  productId: string,
  type: StockAdjustmentType,
  quantityChange: number,
  reason: string
): Promise<StockAdjustment> {
  const product = await getProductById(productId);
  if (!product) {
    throw new Error('Product not found.');
  }

  const previousStock = product.currentStock;
  const newStock = previousStock + quantityChange;

  if (newStock < 0) {
    throw new Error(`Cannot adjust stock below 0. Available: ${previousStock}, adjustment would result in ${newStock}.`);
  }

  const now = new Date();
  const adjustment: StockAdjustment = {
    id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    type,
    previousStock,
    quantityChange,
    newStock,
    reason: reason.trim(),
    date: now.toISOString(),
    createdAt: now.toISOString(),
  };

  await putRecord('stock_adjustments', adjustment);
  await updateProduct(product.id, { currentStock: newStock });

  return adjustment;
}

export async function getLowStockProducts(): Promise<Product[]> {
  const products = await getAllRecords<Product>('products');
  return products.filter((p) => p.currentStock <= p.lowStockThreshold);
}
