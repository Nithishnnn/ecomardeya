'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  ArrowLeft,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryCharge,
    total,
  } = useCart();

  const freeDeliveryThreshold = 999;
  const neededForFreeDelivery = freeDeliveryThreshold - subtotal;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
          Your Shopping Cart is Empty
        </h1>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm sm:text-base">
          Looks like you haven&apos;t added any items to your cart yet. Explore our latest arrivals and premium essentials!
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-md transition-all hover:scale-105"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Explore Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your selected items and proceed to secure checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
        >
          Clear Cart
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Free Shipping Progress bar */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-900">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
              {neededForFreeDelivery > 0 ? (
                <span>
                  Add <strong>{formatCurrency(neededForFreeDelivery)}</strong> more to unlock <strong>FREE Delivery</strong>!
                </span>
              ) : (
                <span>🎉 You have qualified for FREE Shipping!</span>
              )}
            </div>
            {neededForFreeDelivery > 0 && (
              <Link href="/shop" className="text-emerald-700 underline shrink-0 font-bold">
                Add More Items
              </Link>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {items.map(({ product, quantity }) => {
              const primaryImage =
                product.images?.[0]?.image_url ||
                'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80';
              const unitPrice = product.discount_price ?? product.price;

              return (
                <div key={product.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${product.slug}`}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 block"
                  >
                    <Image
                      src={primaryImage}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {product.category && (
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                        {product.category.name}
                      </span>
                    )}
                    <Link
                      href={`/product/${product.slug}`}
                      className="font-bold text-base text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 block"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(unitPrice)}
                      </span>
                      {product.discount_price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Line Total */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="p-2 hover:bg-slate-200 text-slate-600 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-slate-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= product.stock_quantity}
                        className="p-2 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-900">
                        {formatCurrency(unitPrice * quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 pt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
            Order Summary
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Delivery</span>
              <span>
                {deliveryCharge === 0 ? (
                  <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                ) : (
                  <span className="font-semibold text-slate-900">{formatCurrency(deliveryCharge)}</span>
                )}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between text-lg font-black text-slate-900">
              <span>Total Amount</span>
              <span className="text-indigo-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Safe & Secure Indian Payment Gateway</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              We accept UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards & NetBanking through Razorpay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
