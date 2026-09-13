'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  Eye,
  MessageCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getOrders, updateOrderStatus } from '@/lib/services';
import { Order, OrderStatus } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createOrderWhatsAppUrl } from '@/lib/whatsapp';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      setStatusFeedback(`Order status updated to "${newStatus.toUpperCase()}" in Supabase.`);
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, order_status: newStatus } : null));
      }
      setTimeout(() => setStatusFeedback(''), 3000);
    } catch (err: any) {
      alert(`Error updating order status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.includes(q);
      if (!match) return false;
    }
    if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track order fulfillment, process dispatches, and review Razorpay transaction statuses.
          </p>
        </div>

        {statusFeedback && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Order ID, Customer, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Fulfillment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Loading orders from Supabase...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Orders Match Your Filters</h3>
              <p className="text-xs text-slate-400 mt-1">Check back later or adjust the search filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4">Order ID</th>
                    <th className="py-4 px-4">Customer</th>
                    <th className="py-4 px-4">Mobile</th>
                    <th className="py-4 px-4">Amount</th>
                    <th className="py-4 px-4">Payment</th>
                    <th className="py-4 px-4">Fulfillment Status</th>
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {o.order_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{o.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">+91 {o.phone}</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            o.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.payment_status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            o.order_status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.order_status === 'shipped'
                              ? 'bg-sky-100 text-sky-800'
                              : o.order_status === 'processing'
                              ? 'bg-purple-100 text-purple-800'
                              : o.order_status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {o.order_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatDate(o.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Inspect & Update Modal (Section 21) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                  Order Management
                </span>
                <h3 className="text-xl font-mono font-black text-slate-900">
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

            {/* Status Update Control Section */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <span className="text-xs font-bold text-indigo-900 block">
                Update Fulfillment Status (Admin Action)
              </span>
              <div className="flex flex-wrap gap-2">
                {(['processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      disabled={updatingStatus || selectedOrder.order_status === st}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        selectedOrder.order_status === st
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      } disabled:opacity-50`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Customer Details
                </span>
                <p className="font-bold text-slate-900 text-sm">{selectedOrder.customer_name}</p>
                <p className="text-slate-600">Mobile: +91 {selectedOrder.phone}</p>
                <p className="text-slate-600">WhatsApp: +91 {selectedOrder.whatsapp_number}</p>
                {selectedOrder.email && (
                  <p className="text-slate-600 truncate">Email: {selectedOrder.email}</p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Shipping Address
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {selectedOrder.address}
                </p>
                <p className="text-slate-600">
                  {selectedOrder.city}, {selectedOrder.district}, {selectedOrder.state} -{' '}
                  {selectedOrder.pincode}
                </p>
                {selectedOrder.landmark && (
                  <p className="text-slate-500 italic">Landmark: {selectedOrder.landmark}</p>
                )}
              </div>
            </div>

            {/* Purchased Items Table */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Order Items
              </span>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                {selectedOrder.order_items?.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{item.product_name}</p>
                      <p className="text-slate-500">
                        Qty: <strong>{item.quantity}</strong> ×{' '}
                        {formatCurrency(item.discount_price ?? item.price)}
                      </p>
                    </div>
                    <span className="font-black text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(selectedOrder.subtotal)}
                </span>
              </div>
              {selectedOrder.checkout_charge !== undefined && selectedOrder.checkout_charge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Checkout Charge (3.5%)</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(selectedOrder.checkout_charge)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge</span>
                <span className="font-semibold text-slate-900">
                  {selectedOrder.delivery_charge === 0
                    ? 'FREE'
                    : formatCurrency(selectedOrder.delivery_charge)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount Paid</span>
                <span className="text-indigo-600">
                  {formatCurrency(selectedOrder.total_amount)}
                </span>
              </div>
              {selectedOrder.payment_id && (
                <p className="font-mono text-[10px] text-slate-400 pt-1">
                  Razorpay Reference ID: {selectedOrder.payment_id}
                </p>
              )}
            </div>

            {/* WhatsApp Notify Customer Action */}
            <a
              href={createOrderWhatsAppUrl(selectedOrder, selectedOrder.order_items)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Send Pre-Filled WhatsApp Update to Customer</span>
            </a>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
