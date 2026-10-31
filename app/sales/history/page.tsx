'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { History, Receipt, RefreshCw } from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/money';

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then((d) => setSales(d.sales || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell pageTitle="Sales Receipts">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Completed Sales Receipts</h2>
          <p className="text-xs text-slate-500 font-medium">
            Audit history of every point-of-sale customer ticket, cashier staff, and itemized lines
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#e8ece6] shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading sales transactions...
          </div>
        ) : sales.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No sales recorded yet. Use "Record Sale" to start billing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#f0f4ee] text-slate-400 font-bold uppercase text-[10px] bg-[#fafcfa]">
                  <th className="py-4 px-6">Receipt / Bill ID</th>
                  <th className="py-4 px-4">Date & Time</th>
                  <th className="py-4 px-4">Cashier</th>
                  <th className="py-4 px-4">Items Sold</th>
                  <th className="py-4 px-4">Total Amount</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f8f3]">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#f9fbf8]">
                    <td className="py-4 px-6 font-mono font-bold text-slate-800">
                      #{sale.id.substring(0, 8)}
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {new Date(sale.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800">{sale.user.name}</span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        ({sale.user.role})
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-700">
                      {sale.items.length} product{sale.items.length !== 1 ? 's' : ''} (
                      {sale.items.map((i: any) => i.product.name.split(' ')[0]).slice(0, 2).join(', ')}
                      {sale.items.length > 2 ? '...' : ''})
                    </td>

                    <td className="py-4 px-4 font-black text-slate-900 text-sm">
                      {formatPaiseToRupees(sale.totalAmountPaise)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="px-3.5 py-1.5 bg-[#f6f8f5] hover:bg-brand-lime text-slate-700 hover:text-brand-dark rounded-xl text-xs font-bold transition-colors"
                      >
                        View Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail Receipt Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-card border border-[#e8ece6] max-w-md w-full p-6 text-xs">
            <div className="text-center pb-4 border-b border-dashed border-slate-200 mb-4">
              <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">SALE RECEIPT</h3>
              <p className="text-slate-400 font-mono text-[10px] mt-0.5">#{selectedSale.id}</p>
              <p className="text-slate-500 text-[11px] mt-1">
                {new Date(selectedSale.createdAt).toLocaleString()} · Cashier: {selectedSale.user.name}
              </p>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {selectedSale.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-[#f7faf5]">
                  <div>
                    <span className="font-bold text-slate-800 block">{item.product.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.quantity} {item.product.unit} × {formatPaiseToRupees(item.unitPricePaise)}
                    </span>
                  </div>
                  <span className="font-black text-slate-900">
                    {formatPaiseToRupees(item.lineTotalPaise)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center text-sm font-black text-slate-900 mb-6">
              <span>Grand Total</span>
              <span className="text-brand-primary text-xl">
                {formatPaiseToRupees(selectedSale.totalAmountPaise)}
              </span>
            </div>

            <button
              onClick={() => setSelectedSale(null)}
              className="w-full py-3 bg-brand-primary hover:bg-[#0b2f24] text-white font-bold rounded-2xl text-xs shadow-soft transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
