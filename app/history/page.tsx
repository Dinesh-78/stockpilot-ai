'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { History, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatQuantityWithUnit } from '@/lib/money';

export default function HistoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [activeTab, setActiveTab] = useState<'movements' | 'audit'>('movements');

  useEffect(() => {
    setLoading(true);
    const param = filterType ? `?type=${filterType}` : '';
    fetch(`/api/movements${param}`)
      .then((r) => r.json())
      .then((d) => {
        setMovements(d.movements || []);
        setAuditLogs(d.auditLogs || []);
      })
      .finally(() => setLoading(false));
  }, [filterType]);

  return (
    <AppShell pageTitle="Stock Movement Ledger">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Stock Movement Ledger & Audit Trail</h2>
          <p className="text-xs text-slate-500 font-medium">
            Immutable ledger: Every unit change is tracked with who, when, quantity, balance, and reason.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white p-1 rounded-2xl border border-[#e8ece6] self-start sm:self-auto text-xs font-bold shadow-soft">
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'movements' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movements ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'audit' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Filter pill buttons */}
          <div className="flex gap-2">
            {['', 'PURCHASE', 'SALE', 'ADJUSTMENT'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterType === t
                    ? 'bg-brand-primary text-white shadow-soft'
                    : 'bg-white text-slate-600 border border-[#e8ece6] hover:bg-[#f6f8f5]'
                }`}
              >
                {t === '' ? 'All Movements' : t}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-[#e8ece6] shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#f0f4ee] text-slate-400 font-bold uppercase text-[10px] bg-[#fafcfa]">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-4">Product Name & SKU</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Quantity Delta</th>
                    <th className="py-4 px-4">Balance After</th>
                    <th className="py-4 px-4">Reason / Reference</th>
                    <th className="py-4 px-6 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f8f3]">
                  {movements.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-[#f9fbf8]">
                        <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-extrabold text-slate-900 block">{m.product.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-medium">{m.product.sku}</span>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              m.type === 'PURCHASE'
                                ? 'bg-[#e8fadc] text-[#1c532f]'
                                : m.type === 'SALE'
                                ? 'bg-[#e0f2fe] text-[#0369a1]'
                                : 'bg-[#fef3c7] text-[#92400e]'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`font-black flex items-center gap-1 ${
                              isPositive ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isPositive ? '+' : ''}
                            {formatQuantityWithUnit(m.quantity, m.product.unit)}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-800">
                          {formatQuantityWithUnit(m.balanceAfter, m.product.unit)}
                        </td>

                        <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={m.reason}>
                          {m.reason}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span className="font-bold text-slate-800 block">{m.user.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({m.user.role})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#e8ece6] shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#f0f4ee] text-slate-400 font-bold uppercase text-[10px] bg-[#fafcfa]">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-4">Action</th>
                  <th className="py-4 px-4">Entity Type</th>
                  <th className="py-4 px-4">Actor</th>
                  <th className="py-4 px-6">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f8f3]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f9fbf8]">
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f6f8f5] text-slate-800">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-500 font-medium">{log.entityType}</td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800">{log.user.name}</span>
                    </td>

                    <td className="py-4 px-6 font-mono text-[11px] text-slate-600 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
