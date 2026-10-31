'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { formatPaiseToRupees, formatQuantityWithUnit } from '@/lib/money';

export default function RecordSalePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Array<{ product: any; quantity: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saleResult, setSaleResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: any) {
    setErrorMessage(null);
    setSaleResult(null);

    if (product.currentQty <= 0) {
      setErrorMessage(`Cannot add "${product.name}": Product is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const step = product.unit === 'kg' || product.unit === 'litre' ? 0.5 : 1;
        const newQty = existing.quantity + step;
        if (newQty > product.currentQty) {
          setErrorMessage(`Cannot add more: Only ${product.currentQty} ${product.unit} available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, newQty: number) {
    setErrorMessage(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (prod && newQty > prod.currentQty) {
      setErrorMessage(`Cannot exceed current stock of ${prod.currentQty} ${prod.unit} for "${prod.name}"`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  const totalPaise = cart.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.product.sellingPricePaise),
    0
  );

  async function handleCompleteSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `POS-SALE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const payload = {
        idempotencyKey,
        items: cart.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPricePaise: i.product.sellingPricePaise,
        })),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to record sale');
      }

      setSaleResult({
        sale: resData.sale,
        items: [...cart],
        totalPaise,
      });

      setCart([]);
      fetch('/api/products')
        .then((r) => r.json())
        .then((d) => setProducts(d.products || []));
    } catch (err: any) {
      setErrorMessage(err.message || 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell pageTitle="Quick Sale POS" onSearch={(q) => setSearch(q)}>
      {/* Success Notification Banner */}
      {saleResult && (
        <div className="p-4 mb-6 rounded-3xl bg-[#e8fadc] border border-[#cbeec1] text-[#1c532f] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-soft animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary text-brand-lime flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-slate-900">
                Sale Recorded Successfully! Total: {formatPaiseToRupees(saleResult.totalPaise)}
              </p>
              <p className="text-xs text-slate-600">
                Transaction #{saleResult.sale.id.substring(0, 8)} · Ledger movement logged · Stock decremented
              </p>
            </div>
          </div>

          <button
            onClick={() => setSaleResult(null)}
            className="px-5 py-2.5 bg-brand-primary hover:bg-[#0b2f24] text-white text-xs font-bold rounded-2xl shadow-soft transition-all"
          >
            Start Next Sale →
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 mb-6 rounded-3xl bg-[#fdf2f2] border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-soft">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Selector (Catalog) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#e8ece6] shadow-soft">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Instant search by product name or SKU code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-[#f6f8f5] border border-transparent rounded-full focus:bg-white focus:border-brand-primary outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isOut = p.currentQty <= 0;
              const inCart = cart.find((i) => i.product.id === p.id);

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={isOut}
                  className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isOut
                      ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                      : inCart
                      ? 'bg-[#f0f9eb] border-brand-lime shadow-soft'
                      : 'bg-white hover:bg-[#fafcfa] border-[#e8ece6] hover:border-[#ccd6ca]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-extrabold text-slate-900 text-xs leading-snug">{p.name}</span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-rose-100 text-rose-700'
                            : p.currentQty <= p.reorderLevel
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-brand-lime text-brand-dark'
                        }`}
                      >
                        {formatQuantityWithUnit(p.currentQty, p.unit)}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f0f4ee]">
                    <span className="text-sm font-black text-slate-900">
                      {formatPaiseToRupees(p.sellingPricePaise)}
                    </span>
                    <span className="text-[11px] font-bold text-brand-primary bg-[#f6f8f5] hover:bg-brand-lime px-2.5 py-1 rounded-xl transition-colors">
                      + Add Item
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart / Bill Breakdown */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#e8ece6] shadow-soft sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0f4ee] mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-primary" />
              <h3 className="text-sm font-extrabold text-slate-900">Current Customer Bill</h3>
            </div>
            <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#f6f8f5] text-slate-700">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
              Click any product from the catalog on the left to add it to this sale ticket.
            </div>
          ) : (
            <div>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 mb-4">
                {cart.map((item) => {
                  const lineTotal = Math.round(item.quantity * item.product.sellingPricePaise);
                  const step = item.product.unit === 'kg' || item.product.unit === 'litre' ? 0.5 : 1;

                  return (
                    <div
                      key={item.product.id}
                      className="p-3 bg-[#f8faf7] rounded-2xl border border-[#edf2ea] flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-extrabold text-slate-900 leading-snug">{item.product.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {formatPaiseToRupees(item.product.sellingPricePaise)} × {item.quantity} {item.product.unit}
                        </p>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-1.5 mr-3">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - step)}
                          className="w-7 h-7 bg-white hover:bg-slate-100 border border-[#e8ece6] rounded-lg flex items-center justify-center text-slate-600 font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-slate-900 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + step)}
                          className="w-7 h-7 bg-white hover:bg-slate-100 border border-[#e8ece6] rounded-lg flex items-center justify-center text-slate-600 font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line total & remove */}
                      <div className="text-right flex items-center gap-2">
                        <span className="font-black text-slate-900">{formatPaiseToRupees(lineTotal)}</span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal & Checkout Button */}
              <div className="pt-4 border-t border-[#f0f4ee] space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-900 font-bold">{formatPaiseToRupees(totalPaise)}</span>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-2xl text-brand-primary">{formatPaiseToRupees(totalPaise)}</span>
                </div>

                <button
                  onClick={handleCompleteSale}
                  disabled={submitting}
                  className="w-full py-3.5 bg-brand-primary hover:bg-[#0b2f24] text-white rounded-2xl font-bold text-xs shadow-soft flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording Sale...' : `Complete Sale · ${formatPaiseToRupees(totalPaise)}`}
                </button>

                <button
                  onClick={() => setCart([])}
                  className="w-full py-1 text-[11px] text-slate-400 hover:text-slate-600 font-medium text-center"
                >
                  Clear Bill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
