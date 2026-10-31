'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  History,
  Search,
  Bell,
  MessageSquare,
  LogOut,
  ShieldCheck,
  User,
  Menu,
  X,
  CreditCard,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  businessName: string;
}

export default function AppShell({
  children,
  pageTitle = 'Dashboard',
  searchPlaceholder = 'Search products, invoices, SKUs...',
  onSearch,
}: {
  children: React.ReactNode;
  pageTitle?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockCount, setLowStockCount] = useState<number>(7);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        } else if (pathname !== '/login') {
          router.push('/login');
        }
      })
      .catch(() => {
        if (pathname !== '/login') router.push('/login');
      });

    // Fetch low stock count for sidebar badge
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data?.summary?.lowStockCount !== undefined) {
          setLowStockCount(data.summary.lowStockCount);
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const isOwner = user?.role === 'OWNER';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Record Sale', href: '/sales/new', icon: ShoppingCart },
    { label: 'Invoices (OCR)', href: '/invoices/upload', icon: FileText, ownerOnly: true },
    { label: 'Restock Orders', href: '/restock', icon: TrendingUp, ownerOnly: true, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { label: 'Sales History', href: '/sales/history', icon: CreditCard },
    { label: 'Stock Ledger', href: '/history', icon: History },
  ];

  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#f6f8f5] flex text-slate-800">
      {/* ================= LEFT SIDEBAR (Reference: Coinest Sidebar) ================= */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#e8ece6] flex-col justify-between p-6 shrink-0 sticky top-0 h-screen">
        <div>
          {/* Logo Brand matching Coinest reference */}
          <Link href="/dashboard" className="flex items-center gap-3 px-2 mb-8 group">
            <div className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center text-brand-lime shadow-sm">
              {/* 4 dots / squircle grid icon like Coinest logo */}
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wider text-slate-900 uppercase">
                STOCKPILOT
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">
                AI INVENTORY
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null;
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-lime text-brand-dark shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-[#f6f8f5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-dark' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-brand-dark text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Promo Card matching reference (Dark forest green with light lime CTA button) */}
        <div className="mt-6">
          <div className="bg-brand-primary rounded-3xl p-5 text-white relative overflow-hidden shadow-sm">
            {/* Background organic shape */}
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#164a3b] rounded-full opacity-60 pointer-events-none"></div>
            <div className="absolute right-8 bottom-0 w-12 h-12 bg-[#1b5544] rounded-full opacity-40 pointer-events-none"></div>

            <div className="w-8 h-8 rounded-xl bg-[#1b5544] flex items-center justify-center text-brand-lime mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>

            <h4 className="font-bold text-xs leading-snug mb-1 text-slate-100">
              {user?.businessName || 'Store'}
            </h4>
            <p className="text-[11px] text-[#93bba8] leading-tight mb-4">
              Signed in as <span className="text-white font-semibold">{user?.role === 'OWNER' ? 'Store Owner' : 'Floor Staff'}</span>
            </p>

            <Link
              href="/login"
              className="w-full py-2.5 px-3 bg-brand-lime hover:bg-brand-limeHover text-brand-dark rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm transition-colors"
            >
              Switch Role / Demo
            </Link>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT & TOP HEADER ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching reference */}
        <header className="h-20 bg-white border-b border-[#e8ece6] px-6 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          {/* Left: Page Title */}
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
          </div>

          {/* Center: Search pill input */}
          <div className="hidden md:flex items-center max-w-sm w-full mx-6">
            <div className="relative w-full">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                className="w-full bg-[#f6f8f5] border border-transparent hover:border-[#e2e8df] focus:border-brand-primary text-slate-900 text-xs font-medium pl-4 pr-10 py-2.5 rounded-full outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Right: Actions, Notifications & User Profile */}
          <div className="flex items-center gap-3">
            {/* Message icon */}
            <button
              title="Activity Logs"
              onClick={() => router.push('/history')}
              className="w-10 h-10 rounded-full border border-[#e8ece6] bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Notification bell with alert indicator */}
            <button
              title="Restock Alerts"
              onClick={() => router.push('/restock')}
              className="w-10 h-10 rounded-full border border-[#e8ece6] bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {lowStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2.5 right-2.5 ring-2 ring-white"></span>
              )}
            </button>

            {/* User Profile avatar + Name */}
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-brand-lime font-black text-xs flex items-center justify-center ring-2 ring-[#e8ece6] overflow-hidden">
                {user?.name ? user.name.split(' ').map((n) => n[0]).join('') : 'SP'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                  {user?.name || 'Ramesh Patel'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {user?.role === 'OWNER' ? 'Owner' : 'Staff'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#e8ece6] p-4 space-y-1">
            {navItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null;
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold ${
                    isActive ? 'bg-brand-lime text-brand-dark' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Content Rendered Here */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full">
          {children}
        </main>

        {/* Footer matching reference layout */}
        <footer className="no-print border-t border-[#e8ece6] py-4 px-6 lg:px-8 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Copyright © 2026 MedaVida StockPilot AI · Smart Small Business Inventory</span>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600">Privacy Policy</Link>
            <Link href="/dashboard" className="hover:text-slate-600">Terms & Conditions</Link>
            <Link href="/dashboard" className="hover:text-slate-600">Vadodara, Gujarat</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

