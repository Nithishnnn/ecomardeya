'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  FolderTree,
  ShoppingBag,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, profile, isAdmin, loading, authError, signOut } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Products', href: '/admin/products', icon: Package, exact: true },
    { label: 'Add Product', href: '/admin/products/add', icon: PlusCircle },
    { label: 'Categories', href: '/admin/categories', icon: FolderTree },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Verifying Admin Permissions...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated or not admin, show access restricted prompt
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            Access denied. This account does not have administrator privileges.
          </p>

          {authError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono text-left break-words">
              <span className="font-bold block mb-1 font-sans text-rose-900">Database Query Error:</span>
              <span>{authError}</span>
            </div>
          )}

          {user && profile && profile.role !== 'admin' && (
            <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs text-left">
              <span>Account: <strong>{user.email}</strong></span>
              <br />
              <span>Current Role: <strong>{profile.role || 'none'}</strong> (Requires: admin)</span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Link
              href="/admin/login"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors shadow-sm"
            >
              Sign In to Admin Dashboard
            </Link>
            <Link
              href="/"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl text-sm transition-colors"
            >
              Return to ARDEYA ENTERPRISES Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 hidden md:flex">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0">
            <Image
              src="/logo.png"
              alt="ARDEYA ENTERPRISES Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain rounded-full drop-shadow-sm"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-black text-xs sm:text-sm tracking-tight truncate">
              ARDEYA ENTERPRISES
            </h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
              Admin Dashboard
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User & Store Quick Link */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>Customer Store</span>
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-300">Live</span>
          </Link>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between px-3">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-white truncate">{user.email}</p>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Administrator</span>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Admin Navigation Header */}
        <header className="md:hidden bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/logo.png"
                alt="ARDEYA ENTERPRISES Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <span className="font-black text-xs tracking-tight block">ARDEYA ENTERPRISES</span>
              <span className="text-[9px] text-indigo-400 font-semibold uppercase block">Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products/add"
              className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"
            >
              + Product
            </Link>
            <button onClick={signOut} className="text-slate-400 p-1" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Tabs */}
        <div className="md:hidden flex overflow-x-auto bg-slate-900/90 text-xs px-2 py-2 gap-1 border-b border-slate-800">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg shrink-0 font-medium ${
                pathname === item.href ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
