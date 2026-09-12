'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  IndianRupee,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getProducts, getOrders } from '@/lib/services';
import { Product, Order } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [prods, ords] = await Promise.all([
          getProducts({ includeAllStatus: true }),
          getOrders(),
        ]);
        setProducts(prods);
        setOrders(ords);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Compute metric cards requested in Section 5
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.order_status === 'pending').length;
  const paidOrders = orders.filter((o) => o.payment_status === 'paid').length;
  const processingOrders = orders.filter((o) => o.order_status === 'processing').length;
  const shippedOrders = orders.filter((o) => o.order_status === 'shipped').length;
  const deliveredOrders = orders.filter((o) => o.order_status === 'delivered').length;
  const lowStockProducts = products.filter((p) => p.stock_quantity <= 5).length;
  const totalSales = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const statsCards = [
    {
      title: 'Total Sales',
      value: formatCurrency(totalSales),
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      title: 'Paid Orders',
      value: paidOrders,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Pending Orders',
      value: pendingOrders,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Processing Orders',
      value: processingOrders,
      icon: RotateCcw,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
    },
    {
      title: 'Shipped Orders',
      value: shippedOrders,
      icon: Truck,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-100',
    },
    {
      title: 'Delivered Orders',
      value: deliveredOrders,
      icon: CheckCircle2,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-100',
    },
    {
      title: 'Low Stock Products',
      value: lowStockProducts,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      alert: lowStockProducts > 0,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Store Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live metrics connected to Supabase PostgreSQL database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/products/add"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Product</span>
            </Link>
          </div>
        </div>

        {/* 9 Metrics Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className={`p-5 rounded-3xl border ${stat.bg} flex items-center justify-between shadow-xs`}
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      {stat.title}
                    </span>
                    <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                  </div>
                  <div className={`p-3 rounded-2xl bg-white shadow-xs ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Orders Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Customer Orders</h2>
              <p className="text-xs text-slate-400">Latest orders submitted via store checkout</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Customer</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2">Payment</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-indigo-600">
                      {order.order_number}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-900">
                      {order.customer_name}
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="capitalize text-slate-800 font-semibold">
                        {order.order_status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-400">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
