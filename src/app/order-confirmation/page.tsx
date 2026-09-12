'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ShoppingBag,
  MessageCircle,
  PackageCheck,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { getOrderById } from '@/lib/services';
import { Order } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createOrderWhatsAppUrl } from '@/lib/whatsapp';

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    if (orderId) {
      getOrderById(orderId).then((data) => {
        setOrder(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Retrieving Order Details...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Order Information Unavailable</h1>
        <p className="text-slate-500 mb-6">
          We could not find the specified order or you arrived here without an active checkout session.
        </p>
        <Link
          href="/shop"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Go to Shop</span>
        </Link>
      </div>
    );
  }

  const whatsAppUrl = createOrderWhatsAppUrl(order, order.order_items);
  const fullAddress = `${order.address}, ${order.city}, ${order.district}, ${order.state} - ${order.pincode}${
    order.landmark ? ` (Landmark: ${order.landmark})` : ''
  }`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm text-center space-y-4 mb-8">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce-short">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Order Placed Successfully 🎉
        </h1>

        <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
          Thank you for your purchase, <strong className="text-slate-900">{order.customer_name}</strong>! Your order has been recorded in Supabase and is now being prepared for shipment.
        </p>

        <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl text-xs font-mono font-bold text-slate-800">
          <span>Order Number:</span>
          <span className="text-indigo-600">{order.order_number}</span>
        </div>
      </div>

      {/* Structured Details Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 mb-8">
        <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
          Order & Payment Summary
        </h2>

        {/* Key Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Payment Status</span>
            <span className="inline-flex items-center gap-1.5 mt-0.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{order.payment_status === 'paid' ? 'Successful' : order.payment_status}</span>
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-medium">Order Status</span>
            <span className="inline-flex items-center gap-1.5 mt-0.5 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase">
              <Clock className="w-3.5 h-3.5" />
              <span>{order.order_status}</span>
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-medium">Total Paid Amount</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-medium">Payment Reference ID</span>
            <span className="font-mono text-xs text-slate-600 mt-0.5 block truncate">
              {order.payment_id || 'Razorpay Gateway Verified'}
            </span>
          </div>
        </div>

        {/* Products Purchased */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
            Items Ordered
          </span>
          <div className="divide-y divide-slate-100">
            {order.order_items?.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{item.product_name}</p>
                  <p className="text-xs text-slate-500">
                    Quantity: <strong>{item.quantity}</strong> × {formatCurrency(item.discount_price ?? item.price)}
                  </p>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Delivery Address
          </span>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {fullAddress}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Mobile: +91 {order.phone} | WhatsApp: +91 {order.whatsapp_number}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* WhatsApp Notification Button */}
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01]"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span>Contact on WhatsApp</span>
        </a>

        {/* View Order / Tracking */}
        <Link
          href={`/my-orders?orderNumber=${order.order_number}`}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <PackageCheck className="w-5 h-5" />
          <span>View My Orders</span>
        </Link>

        {/* Continue Shopping */}
        <Link
          href="/shop"
          className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Continue Shopping</span>
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500">Loading Order Confirmation...</div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
