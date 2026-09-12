'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  X,
  MessageCircle,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { getCategories } from '@/lib/services';
import { Category } from '@/lib/types';
import { createGeneralWhatsAppUrl } from '@/lib/whatsapp';

export default function Header() {
  const router = useRouter();
  const { totalItems, setIsCartOpen } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const whatsAppUrl = createGeneralWhatsAppUrl();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Free Express Delivery on all orders above ₹999 across India</span>
        <span className="hidden sm:inline text-indigo-300">|</span>
        <span className="hidden sm:inline text-indigo-200">ARDEYA ENTERPRISES Official Store</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo & Business Name */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="ARDEYA ENTERPRISES Logo"
                width={48}
                height={48}
                priority
                className="w-full h-full object-contain rounded-full shadow-xs"
              />
            </div>
            <div>
              <span className="font-black text-base sm:text-lg lg:text-xl tracking-tight text-slate-900 block leading-tight">
                ARDEYA ENTERPRISES
              </span>
              <span className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-indigo-600 block">
                Online Store
              </span>
            </div>
          </Link>

          {/* Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md relative items-center mx-4"
          >
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 font-medium text-sm text-slate-600">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Home
            </Link>
            <Link href="/shop" className="hover:text-indigo-600 transition-colors">
              Shop
            </Link>

            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                onBlur={() => setTimeout(() => setIsCategoryMenuOpen(false), 200)}
                className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <span>Categories</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isCategoryMenuOpen && (
                <div className="absolute top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Browse Categories
                  </div>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/shop?category=${cat.slug}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Layers className="w-4 h-4 text-slate-400" />
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <Link
                      href="/shop"
                      className="block px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      View All Products →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/contact" className="hover:text-indigo-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* WhatsApp Direct Contact Button */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-full text-xs font-semibold border border-emerald-200 transition-colors"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            {/* Account / Admin Portal */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
                className="p-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors relative"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
                {isAdmin && (
                  <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white" />
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {user.email}
                        </p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 font-semibold hover:bg-indigo-50"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href="/my-orders"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        My Orders
                      </Link>
                      <button
                        onClick={signOut}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/admin/login"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 font-medium"
                      >
                        Admin Portal Login
                      </Link>
                      <Link
                        href="/my-orders"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Track My Orders
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-full transition-all border border-slate-200"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale-in">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search & Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-4 pb-6 space-y-4 shadow-xl">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </form>

          {/* Mobile Links */}
          <div className="flex flex-col space-y-2 text-base font-medium text-slate-800">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              href="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Shop All Products
            </Link>
            <div className="px-3 py-2 font-semibold text-xs text-slate-400 uppercase tracking-wider">
              Categories
            </div>
            <div className="grid grid-cols-2 gap-2 pl-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm text-slate-600 hover:text-indigo-600 py-1"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
            <Link
              href="/my-orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              My Orders & Tracking
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Contact Us
            </Link>
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-indigo-600 font-semibold hover:bg-indigo-50"
            >
              Admin Dashboard
            </Link>
          </div>

          <div className="pt-2">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-semibold text-sm shadow-md"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Chat with us on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
