import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProductPermanently,
  getStockStatus,
} from '../services/productService';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatCurrency } from '../utils/formatters';

interface ProductsPageProps {
  currency: string;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ currency }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('5');
  const [formCategory, setFormCategory] = useState('General');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const list = await getProducts();
    setProducts(list);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setFormCostPrice('');
    setFormSellingPrice('');
    setFormLowStockThreshold('5');
    setFormCategory('General');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCode(product.code);
    setFormCostPrice(product.costPrice.toString());
    setFormSellingPrice(product.sellingPrice.toString());
    setFormLowStockThreshold(product.lowStockThreshold.toString());
    setFormCategory(product.category || 'General');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Product name and code are required.');
      return;
    }
    const cost = parseFloat(formCostPrice);
    const selling = parseFloat(formSellingPrice);
    const threshold = parseInt(formLowStockThreshold, 10);

    if (isNaN(cost) || cost < 0 || isNaN(selling) || selling < 0) {
      setFormError('Please enter valid non-negative cost and selling prices.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName,
          code: formCode,
          costPrice: cost,
          sellingPrice: selling,
          lowStockThreshold: isNaN(threshold) ? 5 : threshold,
          category: formCategory,
        });
      } else {
        // STRICT RULE: Product creation does NOT allow direct stock setting.
        // It starts with 0 stock. Stock must come from Purchases or Adjustments!
        await createProduct({
          name: formName,
          code: formCode,
          costPrice: cost,
          sellingPrice: selling,
          lowStockThreshold: isNaN(threshold) ? 5 : threshold,
          category: formCategory,
        });
      }

      await loadProducts();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProductId) return;
    try {
      await deleteProductPermanently(deletingProductId);
      setDeletingProductId(null);
      await loadProducts();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product.');
    }
  };

  return (
    <div id="products-page" className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Top Header & New Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Product Catalog</h2>
          <p className="text-xs text-slate-500">{products.length} registered products</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
          id="add-product-btn"
        >
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          id="products-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by title or code..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
            No products found. Tap 'Add Product' to register a new SKU.
          </div>
        ) : (
          filtered.map((product) => {
            const status = getStockStatus(product);

            return (
              <div
                key={product.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {product.name}
                      </span>
                      {product.category && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {product.code}
                    </p>
                  </div>
                  <Badge
                    variant={
                      status === 'In Stock'
                        ? 'success'
                        : status === 'Low Stock'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {status}
                  </Badge>
                </div>

                {/* Pricing & Stock Details */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Cost</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(product.costPrice, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Selling</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(product.sellingPrice, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Stock</span>
                    <span className="font-bold text-orange-600">
                      {product.currentStock} units
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingProductId(product.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Register New Product'}
        subtitle={
          editingProduct
            ? `Update SKU details for ${editingProduct.code}`
            : 'Initial stock is added via Purchases'
        }
        maxWidth="sm"
        id="product-form-modal"
      >
        <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              id="form-product-name"
              placeholder="e.g. Organic Premium Tea"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Product Code *
              </label>
              <input
                type="text"
                required
                id="form-product-code"
                placeholder="TEA-01"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                placeholder="Beverages"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cost Price ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                id="form-product-cost"
                placeholder="4.50"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Selling Price ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                id="form-product-selling"
                placeholder="8.00"
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              min="0"
              placeholder="5"
              value={formLowStockThreshold}
              onChange={(e) => setFormLowStockThreshold(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Trigger "Low Stock" warning badge when stock drops to or below this count.
            </p>
          </div>

          {!editingProduct && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <strong>Strict Rule:</strong> New product is registered with 0 stock. Use the <strong>Purchases module</strong> to record vendor restocking and officially increase inventory count.
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmitting}
              id="submit-product-btn"
            >
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingProductId)}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? Historical sales and purchase records will remain intact."
        confirmLabel="Delete Product"
        isDestructive
        id="delete-product-dialog"
      />
    </div>
  );
};
