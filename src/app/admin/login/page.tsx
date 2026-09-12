'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [diagnostic, setDiagnostic] = useState<{
    userId: string;
    email: string | null;
    profileFound: boolean;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setDiagnostic(null);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Invalid email or password. Please verify that this account exists in Supabase and the password is correct.');
        } else if (authError.message?.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Email address is not confirmed. Please confirm the user in Supabase Auth or check your email.');
        } else {
          setErrorMessage(authError.message || 'Authentication failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      // 2. Get the currently authenticated Supabase user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage('Authentication failed: No active user session.');
        setLoading(false);
        return;
      }

      // 3. Query the profiles table using user.id
      let profile: { id: string; full_name?: string | null; role: string } | null = null;

      const { data: clientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (clientProfile) {
        profile = clientProfile;
      } else {
        // Fallback to secure server API route (bypasses RLS restrictions)
        const sessionToken = authData?.session?.access_token;
        if (sessionToken) {
          try {
            const res = await fetch('/api/auth/profile', {
              headers: {
                Authorization: `Bearer ${sessionToken}`,
              },
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData?.profile) {
                profile = resData.profile;
              }
            }
          } catch (apiErr) {
            console.warn('API profile lookup failed:', apiErr);
          }
        }
      }

      // If profile is still null after both attempts
      if (!profile) {
        await supabase.auth.signOut();
        setDiagnostic({
          userId: user.id,
          email: user.email ?? null,
          profileFound: false,
        });
        setErrorMessage('Your account profile was not found. Please contact the administrator.');
        setLoading(false);
        return;
      }

      // Check role in public.profiles
      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        setErrorMessage('Access denied. This account does not have administrator privileges.');
        setLoading(false);
        return;
      }

      // If profile.role is "admin", allow access to the Admin Dashboard
      await refreshProfile();
      router.push('/admin');
    } catch (err: any) {
      console.warn('Login attempt failed:', err?.message || err);
      setErrorMessage(err?.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Image
              src="/logo.png"
              alt="ARDEYA ENTERPRISES Logo"
              width={64}
              height={64}
              priority
              className="w-full h-full object-contain rounded-full shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">ARDEYA ENTERPRISES</h1>
          <p className="text-xs text-slate-400 mt-1">
            Admin Dashboard Authentication
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 space-y-2">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.toLowerCase().includes('invalid email or password') && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs space-y-1.5">
                <p className="text-slate-300 font-semibold">Admin Account Tip:</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To check registered admins or reset password instantly from the terminal, run:
                </p>
                <div className="bg-slate-950 rounded-lg p-2 font-mono text-[11px] text-indigo-300 border border-slate-800/80">
                  npm run admin:manage list
                </div>
              </div>
            )}
          </div>
        )}

        {diagnostic && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono space-y-1.5">
            <p className="font-sans font-bold text-amber-400 text-xs uppercase tracking-wider mb-1">
              Development Diagnostic
            </p>
            <p><span className="text-slate-400">Authenticated User ID:</span> {diagnostic.userId}</p>
            <p><span className="text-slate-400">Authenticated Email:</span> {diagnostic.email || 'N/A'}</p>
            <p><span className="text-slate-400">Profile Found:</span> {diagnostic.profileFound ? 'Yes' : 'No'}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Admin Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="ardeyaenterprises@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Admin Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Navigation Link */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            ← Return to ARDEYA ENTERPRISES Store
          </Link>
        </div>
      </div>
    </div>
  );
}
