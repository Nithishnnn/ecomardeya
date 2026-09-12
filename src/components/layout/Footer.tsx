'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
} from 'lucide-react';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { createGeneralWhatsAppUrl } from '@/lib/whatsapp';

export default function Footer() {
  const whatsAppUrl = createGeneralWhatsAppUrl();

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-900">
      {/* Value Proposition Highlights */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center sm:text-left">
          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Free Express Shipping</h4>
              <p className="text-xs text-slate-400">On all prepaid orders over ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">100% Secure Checkout</h4>
              <p className="text-xs text-slate-400">Verified Razorpay Payments in INR</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Easy Returns & Exchange</h4>
              <p className="text-xs text-slate-400">7-day hassle-free replacement policy</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">UPI, Cards & NetBanking</h4>
              <p className="text-xs text-slate-400">Instant verification in Indian Rupees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-11 h-11 shrink-0">
                <Image
                  src="/logo.png"
                  alt="ARDEYA ENTERPRISES Logo"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white block">
                  ARDEYA ENTERPRISES
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block">
                  Proprietor: ARIKUMAR P
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Smart home, kitchen, storage, cleaning, tools, and everyday utility essentials with instant digital order fulfillment, secure payments in Indian Rupees (₹), and personal customer support.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 px-4 py-2 rounded-full text-xs font-semibold transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp Us</span>
              </a>
              <a
                href="https://instagram.com/ecomardeya_2025"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 border border-pink-500/30 px-4 py-2 rounded-full text-xs font-semibold transition-all"
              >
                <InstagramIcon className="w-4 h-4" />
                <span>@ecomardeya_2025</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wider uppercase">Shop</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  All Collections
                </Link>
              </li>
              <li>
                <Link href="/shop?category=home-kitchen" className="hover:text-white transition-colors">
                  Home &amp; Kitchen
                </Link>
              </li>
              <li>
                <Link href="/shop?category=storage-organization" className="hover:text-white transition-colors">
                  Storage &amp; Organization
                </Link>
              </li>
              <li>
                <Link href="/shop?category=cleaning-products" className="hover:text-white transition-colors">
                  Cleaning Products
                </Link>
              </li>
              <li>
                <Link href="/shop?category=tools-hardware" className="hover:text-white transition-colors">
                  Tools &amp; Hardware
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wider uppercase">Customer Support</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/my-orders" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition-colors">
                  View Cart
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition-colors">
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Business Contact Details */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wider uppercase">Contact Details</h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="space-y-0.5">
                <span className="font-bold text-white text-xs block">ARDEYA ENTERPRISES</span>
                <span className="text-indigo-400 font-semibold block">ARIKUMAR P</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  17, THIRUVALLUVAR CITY PHASE 2,<br />
                  RAGUNADHAPURAM,<br />
                  MANGADU,<br />
                  CHENNAI - 600122
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                <a href="tel:9498109777" className="hover:text-white transition-colors font-medium">
                  9498109777
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <a href="mailto:ardeyaenterprises@gmail.com" className="hover:text-white transition-colors">
                  ardeyaenterprises@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <InstagramIcon className="w-4 h-4 text-pink-400 shrink-0" />
                <a
                  href="https://instagram.com/ecomardeya_2025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400 transition-colors"
                >
                  @ecomardeya_2025
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p suppressHydrationWarning>© {new Date().getFullYear()} ARDEYA ENTERPRISES. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">All prices listed in Indian Rupees (₹)</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">100% Encrypted & Safe</span>
        </div>
      </div>
    </footer>
  );
}
