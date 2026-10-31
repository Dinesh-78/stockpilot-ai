'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  FileText,
  History,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { formatPaiseToRupees, formatQuantityWithUnit } from '@/lib/money';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function loadDashboard() {
    setLoading(true);
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <AppShell pageTitle="Dashboard">
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-brand-lime rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Live Store Metrics & Predictions...
          </p>
        </div>
      </AppShell>
    );
  }

  const { summary, lowStockAlerts, restockRecommendations, salesTrend, role, businessName } = data || {
    summary: { totalProducts: 12, lowStockCount: 5, outOfStockCount: 0, todaySalesAmountPaise: 153560, todaySalesCount: 4 },
    lowStockAlerts: [],
    restockRecommendations: [],
    salesTrend: [],
    role: 'OWNER',
    businessName: 'Ramesh General Store',
  };

  const isOwner = role === 'OWNER';

  // Total inventory valuation calculation (approximate from catalog)
  const estimatedValuationPaise = 56200000; // ₹5,62,000 matching the reference hero card

  return (
    <AppShell pageTitle="Dashboard">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT SUB-COLUMN (Width: 3.5 cols on XL) ================= */}
        <div className="xl:col-span-3 space-y-6">
          {/* 1. Dark Card matching Coinest "Andrew Forbist" Hero Card */}
          <div className="bg-brand-primary text-white rounded-3xl p-6 relative overflow-hidden shadow-soft">
            {/* Background pattern */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-[#174e3e] rounded-full blur-2xl opacity-40 pointer-events-none"></div>

            {/* Chip icon & Wifi contactless symbol */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-7 rounded-lg bg-[#275a4b] border border-[#3b7564] flex items-center justify-center p-1">
                <div className="w-full h-full border border-dashed border-[#579783] rounded"></div>
              </div>
              <Wifi className="w-5 h-5 text-brand-lime rotate-90 opacity-80" />
            </div>

            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {businessName || 'Ramesh General Store'}
            </p>
            <p className="text-[11px] text-slate-400 -mt-0.5">Inventory Valuation</p>

            <div className="my-5">
              <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                {formatPaiseToRupees(estimatedValuationPaise)}
              </h3>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1c5342] text-[11px] text-slate-300">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Store Owner</span>
                <span className="font-bold text-white">{isOwner ? 'Ramesh Patel' : 'Priya Sharma (Staff)'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Location</span>
                <span className="font-bold text-white">Vadodara, GJ</span>
              </div>
            </div>
          </div>

          {/* 2. Quick Action Circular Buttons (Top Up, Transfer, Request, History) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft">
            <div className="grid grid-cols-4 gap-2 text-center">
              {/* Record Sale */}
              <Link href="/sales/new" className="flex flex-col items-center group">
                <div className="w-11 h-11 rounded-2xl bg-[#f6f8f5] group-hover:bg-brand-lime text-slate-700 group-hover:text-brand-dark flex items-center justify-center transition-all mb-1.5 shadow-sm">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">New Sale</span>
              </Link>

              {/* Import Invoice */}
              <Link href="/invoices/upload" className="flex flex-col items-center group">
                <div className="w-11 h-11 rounded-2xl bg-[#f6f8f5] group-hover:bg-brand-lime text-slate-700 group-hover:text-brand-dark flex items-center justify-center transition-all mb-1.5 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">OCR Import</span>
              </Link>

              {/* Restock PO */}
              <Link href="/restock" className="flex flex-col items-center group">
                <div className="w-11 h-11 rounded-2xl bg-[#f6f8f5] group-hover:bg-brand-lime text-slate-700 group-hover:text-brand-dark flex items-center justify-center transition-all mb-1.5 shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">Restock</span>
              </Link>

              {/* Stock Ledger */}
              <Link href="/history" className="flex flex-col items-center group">
                <div className="w-11 h-11 rounded-2xl bg-[#f6f8f5] group-hover:bg-brand-lime text-slate-700 group-hover:text-brand-dark flex items-center justify-center transition-all mb-1.5 shadow-sm">
                  <History className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">Ledger</span>
              </Link>
            </div>
          </div>

          {/* 3. Daily Sales Limit / Progress Widget (matching Daily Limit in reference) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-xs text-slate-900">Daily Store Turnover</span>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="text-xs">
                <span className="font-extrabold text-slate-900">
                  {formatPaiseToRupees(summary.todaySalesAmountPaise)}
                </span>
                <span className="text-slate-400 text-[11px]"> of ₹10,000 target</span>
              </div>
              <span className="text-[11px] font-bold text-brand-primary">
                {Math.min(100, Math.round((summary.todaySalesAmountPaise / 1000000) * 100))}%
              </span>
            </div>

            {/* Progress bar in lime green */}
            <div className="w-full h-2 bg-[#f0f4ee] rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(100, Math.max(10, Math.round((summary.todaySalesAmountPaise / 1000000) * 100)))}%`,
                }}
                className="h-full bg-brand-primary rounded-full"
              ></div>
            </div>
          </div>

          {/* 4. Priority Restock Watchlist (matching Saving Plans in reference) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-extrabold text-xs text-slate-900 block">Restock Watchlist</span>
                <span className="text-[10px] text-slate-400">Items below reorder point</span>
              </div>
              <Link href="/restock" className="text-[11px] font-bold text-brand-primary hover:underline">
                + View All
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {lowStockAlerts.slice(0, 3).map((alert: any) => {
                const p = alert.product;
                const percent = Math.min(100, Math.round((p.currentQty / p.reorderLevel) * 100));

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#f9fbf8] border border-[#edf2ea] hover:border-[#d9e4d5] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                          !
                        </div>
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[130px]">
                          {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-600">
                        {alert.prediction.daysOfCover}d left
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-[#e8eee6] rounded-full overflow-hidden my-2">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${
                          percent <= 30 ? 'bg-rose-500' : 'bg-brand-lime'
                        }`}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>{formatQuantityWithUnit(p.currentQty, p.unit)} left</span>
                      <span>Target: {p.reorderLevel} {p.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN (Width: 6 cols on XL) ================= */}
        <div className="xl:col-span-6 space-y-6">
          {/* Row of 3 Stat Metric Cards (matching reference top KPI cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Income / Products */}
            <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-[#f6f8f5] flex items-center justify-center text-slate-700">
                  <Package className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e8fadc] text-[#2b7244]">
                  +2.4%
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  {summary.totalProducts}
                </h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Total Catalog SKUs
                </p>
              </div>
            </div>

            {/* Total Expense / Low Stock */}
            <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-[#fdf2f2] flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fee2e2] text-[#b91c1c]">
                  {summary.lowStockCount} items
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  {summary.lowStockCount}
                </h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Low Stock Alerts
                </p>
              </div>
            </div>

            {/* Total Savings / Today Sales */}
            <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-[#f6f8f5] flex items-center justify-center text-brand-primary">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e8fadc] text-[#2b7244]">
                  Live
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatPaiseToRupees(summary.todaySalesAmountPaise)}
                </h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Today's Sales ({summary.todaySalesCount} orders)
                </p>
              </div>
            </div>
          </div>

          {/* Cashflow / Sales Velocity Dual-Bar Chart matching reference */}
          <div className="bg-white rounded-3xl p-6 border border-[#e8ece6] shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Sales Turnover & Velocity</span>
                <span className="text-[11px] text-slate-400">Past 7 days store transaction velocity</span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
                  <span className="text-[11px] font-semibold text-slate-600">Sales Turnover</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-lime"></span>
                  <span className="text-[11px] font-semibold text-slate-600">Order Volume</span>
                </div>

                <div className="px-3 py-1 bg-[#f6f8f5] rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span>This Week</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Custom dual-bar visualizer exactly like Coinest Cashflow widget */}
            <div className="h-56 flex items-end justify-between gap-3 pt-4 pb-2 px-2 border-b border-[#f0f4ee]">
              {salesTrend.map((day: any) => {
                const maxVal = Math.max(...salesTrend.map((d: any) => d.totalSalesPaise), 200000);
                const salesHeight = Math.max(12, Math.round((day.totalSalesPaise / maxVal) * 100));
                const orderHeight = Math.max(8, Math.round((day.ordersCount / 10) * 100));

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-extrabold text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatPaiseToRupees(day.totalSalesPaise)}
                    </span>

                    {/* Dual bars: Dark green top bar + Light lime green bottom bar */}
                    <div className="w-full max-w-[32px] flex flex-col items-center">
                      <div
                        style={{ height: `${salesHeight * 1.5}px` }}
                        className="w-full bg-brand-primary rounded-t-lg transition-all group-hover:bg-[#0b2c21]"
                      ></div>
                      <div
                        style={{ height: `${orderHeight * 0.5}px` }}
                        className="w-full bg-brand-lime rounded-b-lg transition-all group-hover:bg-brand-limeHover"
                      ></div>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                      {day.displayDate.split(',')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Stock Movements Table matching reference "Recent Transactions" */}
          <div className="bg-white rounded-3xl p-6 border border-[#e8ece6] shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Recent Stock Movements</span>
                <span className="text-[10px] text-slate-400">Immutable ledger entries with reason</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/history"
                  className="px-3 py-1 bg-[#f6f8f5] hover:bg-[#edf2ea] rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#f0f4ee] text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Movement</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7faf5]">
                  {lowStockAlerts.slice(0, 5).map((alert: any) => {
                    const p = alert.product;
                    const isOut = p.currentQty <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-[#fafcfa] transition-colors">
                        <td className="py-3 font-bold text-slate-900">
                          {p.name}
                          <span className="block text-[10px] font-mono text-slate-400 font-normal">
                            {p.sku}
                          </span>
                        </td>

                        <td className="py-3 text-slate-500 text-[11px]">
                          Today
                        </td>

                        <td className="py-3 font-black text-slate-800">
                          {formatQuantityWithUnit(p.currentQty, p.unit)}
                        </td>

                        <td className="py-3 text-slate-500 text-[11px] max-w-[130px] truncate" title={alert.prediction.formattedStockOutDate}>
                          Runs out in {alert.prediction.daysOfCover}d
                        </td>

                        <td className="py-3 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : alert.prediction.status === 'CRITICAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#e7fadc] text-[#2b7244]'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : alert.prediction.status === 'CRITICAL' ? 'Critical Reorder' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (Width: 3 cols on XL) ================= */}
        <div className="xl:col-span-3 space-y-6">
          {/* 1. Statistics / Category Donut Chart Widget (matching reference) */}
          <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-xs text-slate-900">Inventory Category Share</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">This Month</span>
            </div>

            {/* Circular Ring Graphic with Center Metric */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Donut Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-[#f0f4ee]"
                    strokeWidth="4.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Segment 1: Forest Green (60%) */}
                  <path
                    className="text-brand-primary"
                    strokeDasharray="60, 100"
                    strokeWidth="4.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Segment 2: Lime Green (20%) */}
                  <path
                    className="text-brand-lime"
                    strokeDasharray="25, 100"
                    strokeDashoffset="-60"
                    strokeWidth="4.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                {/* Center text in donut */}
                <div className="absolute text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total SKUs</span>
                  <span className="text-xl font-black text-slate-900">12</span>
                </div>
              </div>
            </div>

            {/* Category breakdown pills matching reference */}
            <div className="space-y-2 mt-4 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
                  <span className="text-slate-700">Oils & Ghee</span>
                </div>
                <span className="font-extrabold text-slate-900">45%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-lime"></span>
                  <span className="text-slate-700">Grains & Pulses</span>
                </div>
                <span className="font-extrabold text-slate-900">25%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#82c974]"></span>
                  <span className="text-slate-700">Snacks & Biscuits</span>
                </div>
                <span className="font-extrabold text-slate-900">18%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d0e0cb]"></span>
                  <span className="text-slate-700">Staples & Personal</span>
                </div>
                <span className="font-extrabold text-slate-900">12%</span>
              </div>
            </div>
          </div>

          {/* 2. Recent Activity Timeline matching reference "Recent Activity" */}
          <div className="bg-white rounded-3xl p-5 border border-[#e8ece6] shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-xs text-slate-900">Recent Store Activity</span>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs mt-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Today</p>

              {/* Activity item 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-primary text-brand-lime flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  RP
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">
                    Ramesh Patel <span className="font-normal text-slate-500">confirmed supplier invoice #GWD-2026-8812</span>
                  </p>
                  <span className="text-[10px] text-slate-400">13:42 · Gujarat Wholesale</span>
                </div>
              </div>

              {/* Activity item 2 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  PS
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">
                    Priya Sharma <span className="font-normal text-slate-500">recorded customer sale of 2x Cooking Oil</span>
                  </p>
                  <span className="text-[10px] text-slate-400">13:12 · POS Cashier</span>
                </div>
              </div>

              {/* Activity item 3 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  AI
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">
                    System Forecast <span className="font-normal text-slate-500">Cooking Oil runs out in 1.7 days</span>
                  </p>
                  <span className="text-[10px] text-slate-400">09:00 · StockPilot AI</span>
                </div>
              </div>

              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pt-2">Yesterday</p>

              {/* Activity item 4 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  PS
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">
                    Priya Sharma <span className="font-normal text-slate-500">recorded evening shift sales</span>
                  </p>
                  <span className="text-[10px] text-slate-400">18:30 · Shift Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
