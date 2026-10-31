'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  History,
  LogOut,
  User,
  ShieldCheck,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  businessName: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { label: 'Record Sale', href: '/sales/new', icon: ShoppingCart, highlight: true },
    { label: 'Sales History', href: '/sales/history', icon: History },
    { label: 'OCR Invoices', href: '/invoices/upload', icon: FileText, ownerOnly: true },
    { label: 'Restock Orders', href: '/restock', icon: TrendingUp, ownerOnly: true },
    { label: 'Stock Ledger', href: '/history', icon: History },
  ];

  if (pathname === '/login') return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Business Name */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-slate-900 block leading-tight">
                  StockPilot <span className="text-indigo-600 font-extrabold">AI</span>
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {user?.businessName || 'Loading...'}
                </span>
              </div>
            </Link>

            {/* Role Badge */}
            {user && (
              <span
                className={`ml-3 hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isOwner
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isOwner ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {user.role === 'OWNER' ? 'Owner (Full Access)' : 'Staff (Sales Only)'}
              </span>
            )}
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null;
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      : isActive
                      ? 'bg-slate-100 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: User Info & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
              <p className="text-[11px] text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <div className="py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.businessName}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                isOwner ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {user?.role}
            </span>
          </div>

          {navItems.map((item) => {
            if (item.ownerOnly && !isOwner) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  item.highlight
                    ? 'bg-indigo-600 text-white'
                    : isActive
                    ? 'bg-slate-100 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
