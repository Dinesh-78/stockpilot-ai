'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Building, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(targetEmail?: string, targetPassword?: string) {
    const finalEmail = targetEmail || email;
    const finalPassword = targetPassword || password;

    if (!finalEmail || !finalPassword) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail, password: finalPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8f5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-brand-lime shadow-soft mb-4">
          <div className="grid grid-cols-2 gap-1 w-4 h-4">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime"></div>
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          STOCKPILOT <span className="text-brand-primary font-black">AI</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-bold uppercase tracking-wider">
          Smart Inventory Management & Demand Forecasting
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Quick Demo Switcher Cards (MedaVida Test Personas) */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-[#e8ece6] mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              1-Click Demo Evaluation Profiles
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Click any profile to immediately test role-based access control and multi-tenant isolation:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Ramesh Button */}
            <button
              type="button"
              onClick={() => handleLogin('ramesh@demo.com', 'demo123')}
              disabled={loading}
              className="text-left p-4 rounded-2xl border border-[#e8ece6] hover:border-brand-primary bg-[#fafcfa] hover:bg-[#f3f8f1] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-brand-primary mb-1">
                  <ShieldCheck className="w-4 h-4 text-brand-primary" />
                  Ramesh (Owner)
                </div>
                <p className="text-[11px] font-bold text-slate-700">Ramesh General Store</p>
                <p className="text-[10px] text-slate-500 mt-1">Full control, OCR import, restock alerts</p>
              </div>
              <div className="mt-3 text-[10px] font-bold text-brand-primary group-hover:underline">
                Sign in as Ramesh →
              </div>
            </button>

            {/* Priya Button */}
            <button
              type="button"
              onClick={() => handleLogin('priya@demo.com', 'demo123')}
              disabled={loading}
              className="text-left p-4 rounded-2xl border border-[#e8ece6] hover:border-brand-primary bg-[#fafcfa] hover:bg-[#f3f8f1] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 mb-1">
                  <User className="w-4 h-4 text-emerald-700" />
                  Priya (Staff)
                </div>
                <p className="text-[11px] font-bold text-slate-700">Ramesh General Store</p>
                <p className="text-[10px] text-slate-500 mt-1">Record sales & view stock; no price edits</p>
              </div>
              <div className="mt-3 text-[10px] font-bold text-emerald-800 group-hover:underline">
                Sign in as Priya →
              </div>
            </button>

            {/* Anita Button */}
            <button
              type="button"
              onClick={() => handleLogin('anita@demo.com', 'demo123')}
              disabled={loading}
              className="text-left p-4 rounded-2xl border border-[#e8ece6] hover:border-brand-primary bg-[#fafcfa] hover:bg-[#f3f8f1] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 mb-1">
                  <Building className="w-4 h-4 text-amber-700" />
                  Anita (Owner)
                </div>
                <p className="text-[11px] font-bold text-slate-700">Anita Medical</p>
                <p className="text-[10px] text-slate-500 mt-1">Separate tenant; cannot view Ramesh data</p>
              </div>
              <div className="mt-3 text-[10px] font-bold text-amber-900 group-hover:underline">
                Sign in as Anita →
              </div>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-soft border border-[#e8ece6]">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Or sign in with email:</h4>

          {error && (
            <div className="mb-4 p-3 bg-[#fdf2f2] border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@demo.com"
                className="w-full px-4 py-2.5 text-xs bg-[#f6f8f5] border border-transparent rounded-2xl focus:bg-white focus:border-brand-primary outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="w-full px-4 py-2.5 text-xs bg-[#f6f8f5] border border-transparent rounded-2xl focus:bg-white focus:border-brand-primary outline-none font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-primary hover:bg-[#0b2f24] text-white font-bold rounded-2xl text-xs shadow-soft transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4 text-brand-lime" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
