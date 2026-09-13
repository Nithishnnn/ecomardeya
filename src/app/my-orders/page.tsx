'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOrders } from '@/lib/services';
import { Order } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createOrderWhatsAppUrl } from '@/lib/whatsapp';

function MyOrdersContent() {
  const searchParams = useSearchParams();
  const paramOrderNumber = searchParams.get('orderNumber') || '';

  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState(paramOrderNumber);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getOrders(user?.id);
        setOrders(data);
        setFilteredOrders(data);

        if (paramOrderNumber) {
          const match = data.find((o) => o.order_number === paramOrderNumber);
          if (match) setSelectedOrder(match);
        }
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [user?.id, paramOrderNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredOrders(orders);
      return;
    }
    const filtered = orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.customer_name.toLowerCase().includes(q)
    );
    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: Order['order_status']) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'shipped':
        return (
          <span className="bg-sky-100 text-sky-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> Shipped
          </span>
        );
      case 'processing':
      case 'paid':
        return (
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Processing
          </span>
        );
      case 'cancelled':
        return (
          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            View order status, real-time tracking, and past purchases.
          </p>
        </div>

        {/* Search Order Input */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Order ID or Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden focus:border-indigo-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="pt-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Orders Found</h3>
            <p className="text-sm text-slate-500 mb-6">
              You don&apos;t have any orders matching your criteria.
            </p>
            <Link
              href="/shop"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Start Shopping</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-600">
                        {order.order_number}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Customer: <strong className="text-slate-800">{order.customer_name}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.order_status)}
                    <span className="text-lg font-black text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="space-y-1">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item) => (
                        <p key={item.id} className="truncate max-w-md">
                          • <strong className="text-slate-900">{item.product_name}</strong> (Qty: {item.quantity})
                        </p>
                      ))
                    ) : (
                      <p>Store items</p>
                    )}
                  </div>
                  <button className="text-indigo-600 font-bold hover:underline self-start sm:self-auto flex items-center gap-1">
                    <span>View Full Details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                  Order Details
                </span>
                <h3 className="text-lg font-mono font-black text-slate-900">
                  {selectedOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Statuses */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Order Status</span>
                {getStatusBadge(selectedOrder.order_status)}
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Payment</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
                  {selectedOrder.payment_status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Total Amount</span>
                <span className="text-sm font-black text-slate-900">
                  {formatCurrency(selectedOrder.total_amount)}
                </span>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Purchased Items
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-3 bg-white">
                {selectedOrder.order_items?.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.product_name}</p>
                      <p className="text-slate-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-slate-800">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary breakdown */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.checkout_charge !== undefined && selectedOrder.checkout_charge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Checkout Charge (3.5%)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(selectedOrder.checkout_charge)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="font-semibold text-slate-900">
                  {selectedOrder.delivery_charge === 0 ? 'FREE' : formatCurrency(selectedOrder.delivery_charge)}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Paid</span>
                <span className="text-indigo-600">{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
            </div>

            {/* Delivery address */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Delivery Address
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.district}, {selectedOrder.state} - {selectedOrder.pincode}
                {selectedOrder.landmark && ` (Landmark: ${selectedOrder.landmark})`}
                <br />
                <strong className="text-slate-900 mt-1 block">
                  Contact: +91 {selectedOrder.phone}
                </strong>
              </p>
            </div>

            {/* WhatsApp CTA */}
            <a
              href={createOrderWhatsAppUrl(selectedOrder, selectedOrder.order_items)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Track / Enquire on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500">Loading Orders...</div>}>
      <MyOrdersContent />
    </Suspense>
  );
}
