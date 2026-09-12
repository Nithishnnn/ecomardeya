'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';
import { getProducts, getCategories } from '@/lib/services';
import { Product, Category } from '@/lib/types';
import ProductCard from '@/components/shop/ProductCard';
import { createGeneralWhatsAppUrl } from '@/lib/whatsapp';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prods, cats] = await Promise.all([
          getProducts({ includeAllStatus: false }),
          getCategories(),
        ]);
        setFeaturedProducts(prods.slice(0, 6));
        setCategories(cats);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const whatsAppUrl = createGeneralWhatsAppUrl('Hi! I saw your store and would like to learn more.');

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white pt-12 pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Background Glow Accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Official ARDEYA ENTERPRISES Store</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
                Smart Home &amp; Kitchen Essentials,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
                  Made For Everyday Living.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Discover useful products for your home, kitchen, cleaning, organization, tools, and everyday needs. Explore practical essentials designed to make everyday living easier and more convenient.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/shop"
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Shop Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white font-semibold rounded-2xl flex items-center justify-center gap-2 border border-white/20 transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-[#25D366] fill-current" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>

              {/* Mini Features Checklist */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 text-xs text-slate-400">
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Razorpay Verified</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Free Shipping &gt; ₹999</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>7-Day Easy Exchange</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-tr from-slate-800 to-slate-900 p-2">
                <div className="relative aspect-4/5 rounded-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
                    alt="Smart Home and Kitchen Essentials"
                    fill
                    priority
                    className="object-cover"
                  />
                  {/* Floating Highlight Tag */}
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                        Everyday Utility Essentials
                      </span>
                      <h3 className="text-sm font-bold text-white">Smart Home &amp; Kitchen Organizers</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        Daily Living
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Collections
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Shop by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            <span>Browse all</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-600 hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {category.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mt-2">
                {category.description || 'Explore practical home and kitchen essentials.'}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" />
              <span>Featured Essentials</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Popular Home &amp; Kitchen Picks
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            <span>View Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* WhatsApp Order Support Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Instant WhatsApp Service
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Prefer ordering or enquiring on WhatsApp?
            </h2>
            <p className="text-sm sm:text-base text-emerald-100">
              Our team is ready to answer questions, share live photos, and help you finalize your order with convenient payment links.
            </p>
            <div className="pt-2">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-emerald-50 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5 fill-emerald-600 text-emerald-600" />
                <span>Chat with our Team on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
 