'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Archive,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { formatPaiseToRupees, formatQuantityWithUnit } from '@/lib/money';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'General',
    unit: 'pcs',
    costPrice: '',
    sellingPrice: '',
    initialQty: '0',
    reorderLevel: '10',
    leadTimeDays: '4',
    packSize: '1',
  });

  const [adjustData, setAdjustData] = useState({
    quantity: '',
    reason: 'Counting error / physical audit',
  });

  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  function loadProducts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user));
    loadProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, category, status]);

  const isOwner = user?.role === 'OWNER';
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setActionMessage(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create product');

      setIsAddModalOpen(false);
      setActionMessage({ text: `Product "${formData.name}" added successfully!`, type: 'success' });
      setFormData({
        sku: '',
        name: '',
        category: 'General',
        unit: 'pcs',
        costPrice: '',
        sellingPrice: '',
        initialQty: '0',
        reorderLevel: '10',
        leadTimeDays: '4',
        packSize: '1',
      });
      loadProducts();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setActionMessage(null);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update product');

      setIsEditModalOpen(false);
      setActionMessage({ text: `Product "${selectedProduct.name}" updated successfully!`, type: 'success' });
      loadProducts();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setActionMessage(null);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustmentQuantity: adjustData.quantity,
          reason: adjustData.reason,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to adjust stock');

      setIsAdjustModalOpen(false);
      setActionMessage({
        text: `Stock adjusted for "${selectedProduct.name}". New balance: ${resData.product.currentQty} ${selectedProduct.unit}`,
        type: 'success',
      });
      setAdjustData({ quantity: '', reason: 'Counting error / physical audit' });
      loadProducts();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  }

  async function handleArchiveProduct(product: any) {
    if (!confirm(`Archive "${product.name}"? Past sales and stock history will remain intact.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to archive');

      setActionMessage({ text: resData.message || 'Product archived successfully', type: 'success' });
      loadProducts();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  }

  return (
    <AppShell pageTitle="Product Catalog" onSearch={(q) => setSearch(q)}>
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Products & Stock Ledger</h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage product masters, prices, supplier pack sizes, and physical audit adjustments
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-[#0b2f24] text-white rounded-2xl text-xs font-bold shadow-soft transition-all"
          >
            <Plus className="w-4 h-4 text-brand-lime" />
            Add New Product
          </button>
        )}
      </div>

      {/* Action feedback banner */}
      {actionMessage && (
        <div
          className={`p-3.5 mb-6 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft ${
            actionMessage.type === 'success'
              ? 'bg-[#e8fadc] text-[#1c532f] border border-[#cbeec1]'
              : 'bg-[#fdf2f2] text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters pill bar matching Coinest style */}
      <div className="bg-white p-4 rounded-3xl border border-[#e8ece6] shadow-soft mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text"
            placeholder="Search by product name or SKU code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-[#f6f8f5] border border-transparent rounded-full focus:bg-white focus:border-brand-primary outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 text-xs font-bold bg-[#f6f8f5] border border-transparent rounded-full text-slate-700 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 text-xs font-bold bg-[#f6f8f5] border border-transparent rounded-full text-slate-700 outline-none"
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt; Reorder)</option>
            <option value="low_stock">Low Stock (≤ Reorder)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-3xl border border-[#e8ece6] shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading catalog data...
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No products found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#f0f4ee] text-slate-400 font-bold uppercase text-[10px] bg-[#fafcfa]">
                  <th className="py-4 px-6">Product & SKU</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Stock Level</th>
                  <th className="py-4 px-4">Selling Price</th>
                  <th className="py-4 px-4">Cost Price</th>
                  <th className="py-4 px-4">Lead Time & Pack</th>
                  {isOwner && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f8f3]">
                {products.map((p) => {
                  const isOut = p.currentQty <= 0;
                  const isLow = p.currentQty <= p.reorderLevel;

                  return (
                    <tr key={p.id} className="hover:bg-[#f9fbf8] transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-slate-900 block text-sm">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">{p.sku}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#f6f8f5] text-slate-700">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-black ${
                              isOut
                                ? 'bg-[#fee2e2] text-[#991b1b]'
                                : isLow
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-brand-lime text-brand-dark'
                            }`}
                          >
                            {formatQuantityWithUnit(p.currentQty, p.unit)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            (Min: {p.reorderLevel})
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        {formatPaiseToRupees(p.sellingPricePaise)}
                        <span className="text-[10px] text-slate-400 font-normal"> /{p.unit}</span>
                      </td>

                      <td className="py-4 px-4 text-slate-500 font-bold">
                        {formatPaiseToRupees(p.costPricePaise)}
                      </td>

                      <td className="py-4 px-4 text-slate-600 text-[11px]">
                        {p.leadTimeDays}d lead · {p.packSize > 1 ? `carton of ${p.packSize}` : 'individual'}
                      </td>

                      {isOwner && (
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Adjust Stock Button */}
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setIsAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-[#f6f8f5] hover:bg-brand-lime text-slate-700 hover:text-brand-dark rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              Adjust
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setFormData({
                                  sku: p.sku,
                                  name: p.name,
                                  category: p.category,
                                  unit: p.unit,
                                  costPrice: (p.costPricePaise / 100).toString(),
                                  sellingPrice: (p.sellingPricePaise / 100).toString(),
                                  initialQty: p.currentQty.toString(),
                                  reorderLevel: p.reorderLevel.toString(),
                                  leadTimeDays: p.leadTimeDays.toString(),
                                  packSize: p.packSize.toString(),
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-xl"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Archive Button */}
                            <button
                              onClick={() => handleArchiveProduct(p)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-card border border-[#e8ece6] max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f4ee] mb-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                {isAddModalOpen ? 'Add Product Master' : `Edit: ${selectedProduct?.name}`}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleAddProduct : handleEditProduct} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    disabled={isEditModalOpen}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="OIL-1L"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    disabled={isEditModalOpen}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none font-medium"
                  >
                    <option value="pcs">Pieces (pcs - integer only)</option>
                    <option value="kg">Kilogram (kg - decimals allowed)</option>
                    <option value="litre">Litre (decimals allowed)</option>
                    <option value="box">Box (integer only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Cooking Oil (Sunflower 1L)"
                  className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Oils & Ghee"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                  />
                </div>

                {isAddModalOpen && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Opening Quantity</label>
                    <input
                      type="number"
                      step={formData.unit === 'kg' || formData.unit === 'litre' ? '0.1' : '1'}
                      value={formData.initialQty}
                      onChange={(e) => setFormData({ ...formData, initialQty: e.target.value })}
                      className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="115.00"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="140.00"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="20"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    required
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    placeholder="4"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pack Size (Carton)</label>
                  <input
                    type="number"
                    required
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    placeholder="24"
                    className="w-full px-3 py-2 bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#f0f4ee]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-primary hover:bg-[#0b2f24] text-white rounded-xl font-bold shadow-soft"
                >
                  {isAddModalOpen ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-card border border-[#e8ece6] max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f4ee] mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Manual Stock Adjustment</h3>
                <p className="text-slate-500">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#e8fadc] rounded-2xl text-slate-800 text-xs mb-4">
              <p className="font-bold mb-0.5">Current Stock: {formatQuantityWithUnit(selectedProduct.currentQty, selectedProduct.unit)}</p>
              <p className="text-[11px] text-slate-600">Requires owner audit reason according to store policy.</p>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity Change (+ for inward, - for damaged/lost)
                </label>
                <input
                  type="number"
                  step={selectedProduct.unit === 'kg' || selectedProduct.unit === 'litre' ? '0.1' : '1'}
                  required
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  placeholder="e.g. -2 for damaged, or +5 for found stock"
                  className="w-full px-3 py-2.5 text-sm bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Reason (Brief §02)</label>
                <select
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#f6f8f5] border border-transparent rounded-xl focus:bg-white focus:border-brand-primary outline-none font-medium mb-2"
                >
                  <option value="Damaged goods during handling">Damaged goods during handling</option>
                  <option value="Expired product discarded">Expired product discarded</option>
                  <option value="Counting error / physical audit">Counting error / physical audit</option>
                  <option value="Supplier return / defective batch">Supplier return / defective batch</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#f0f4ee]">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-primary hover:bg-[#0b2f24] text-white rounded-xl font-bold shadow-soft"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
