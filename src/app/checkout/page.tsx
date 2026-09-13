'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Truck,
  CreditCard,
  Building,
  Home,
  MapPin,
  Phone,
  User,
  Mail,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '@/lib/services';
import { CustomerCheckoutForm } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, checkoutCharge, deliveryCharge, total, clearCart } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState<CustomerCheckoutForm>({
    fullName: '',
    mobile: '',
    whatsappNumber: '',
    email: user?.email || '',
    houseFlat: '',
    streetArea: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'mobile' && sameAsMobile) {
        updated.whatsappNumber = value;
      }
      return updated;
    });
  };

  const handleMobileSameCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameAsMobile(e.target.checked);
    if (e.target.checked) {
      setFormData((prev) => ({ ...prev, whatsappNumber: prev.mobile }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return false;
    }
    if (!formData.mobile.trim() || !/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return false;
    }
    if (!formData.whatsappNumber.trim()) {
      setErrorMessage('Please enter your WhatsApp number');
      return false;
    }
    if (!formData.houseFlat.trim()) {
      setErrorMessage('Please enter House / Flat / Building details');
      return false;
    }
    if (!formData.streetArea.trim()) {
      setErrorMessage('Please enter Street / Area details');
      return false;
    }
    if (!formData.city.trim()) {
      setErrorMessage('Please enter City / Town');
      return false;
    }
    if (!formData.district.trim()) {
      setErrorMessage('Please enter District');
      return false;
    }
    if (!formData.state.trim()) {
      setErrorMessage('Please enter State');
      return false;
    }
    if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim())) {
      setErrorMessage('Please enter a valid 6-digit PIN code');
      return false;
    }

    setErrorMessage('');
    return true;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (items.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Attach authorization session token if authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Create Pending Order on Server (validating prices in Supabase)
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          customer: formData,
          customerId: user?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      const { orderId, orderNumber, razorpayOrderId, amountPaise, keyId, isLiveGateway } = data;

      // 2. Trigger Razorpay Standard Checkout
      if (typeof window !== 'undefined' && (window as any).Razorpay && isLiveGateway) {
        const options = {
          key: keyId,
          amount: amountPaise,
          currency: 'INR',
          name: 'ARDEYA ENTERPRISES',
          image: '/logo.png',
          description: `Order #${orderNumber}`,
          order_id: razorpayOrderId,
          prefill: {
            name: formData.fullName,
            email: formData.email,
            contact: formData.mobile,
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response: any) {
            // 3. Server-side payment verification
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId,
                  orderNumber,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  isDemoPayment: false,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                clearCart();
                router.push(`/order-confirmation?orderId=${orderId}`);
              } else {
                setErrorMessage(verifyData.error || 'Payment verification failed');
                setLoading(false);
              }
            } catch (err: any) {
              setErrorMessage('Verification request failed: ' + err.message);
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              setErrorMessage('Payment process cancelled by user.');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setErrorMessage(`Payment Failed: ${resp.error?.description || 'Unknown error'}`);
          setLoading(false);
        });
        rzp.open();
      } else {
        // Test / Sandbox Simulation Mode (when running without live Razorpay keys)
        const simulatePayment = async () => {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              orderNumber,
              razorpay_order_id: `order_sandbox_${Date.now()}`,
              razorpay_payment_id: `pay_sandbox_${Date.now()}`,
              razorpay_signature: 'mock_signature_valid',
              isDemoPayment: true,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            clearCart();
            router.push(`/order-confirmation?orderId=${orderId}`);
          } else {
            setErrorMessage(verifyData.error || 'Test payment failed');
            setLoading(false);
          }
        };

        setTimeout(simulatePayment, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error initiating payment');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h1>
        <p className="text-slate-500 mb-6">Please add items to your cart before proceeding to checkout.</p>
        <Link
          href="/shop"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Shop</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <Link href="/cart" className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cart</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800">Secure Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Customer & Delivery Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Delivery Address</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Where should we deliver your order? All details are kept confidential.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified 256-Bit SSL</span>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="checkout-form" onSubmit={handlePayment} className="space-y-6">
            {/* Customer Contact Section */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Contact Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="mobile"
                      required
                      placeholder="9876543210"
                      maxLength={10}
                      value={formData.mobile}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={handleMobileSameCheckbox}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Same as Mobile</span>
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      required
                      disabled={sameAsMobile}
                      placeholder="9876543210"
                      maxLength={10}
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm disabled:opacity-60 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Shipping Address</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    House / Flat / Building Name & Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="houseFlat"
                    required
                    placeholder="e.g. Flat 402, Sunshine Heights"
                    value={formData.houseFlat}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Street / Colony / Area <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetArea"
                    required
                    placeholder="e.g. MG Road, Near City Mall"
                    value={formData.streetArea}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      City / Town <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      District <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="district"
                      required
                      placeholder="e.g. Mumbai Suburban"
                      value={formData.district}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      PIN Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      placeholder="e.g. 400001"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    placeholder="e.g. Opposite State Bank of India"
                    value={formData.landmark}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary & Payment Button */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
            Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>

          {/* Items breakdown list */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {items.map(({ product, quantity }) => {
              const primaryImage = getProductImageUrl(product.images?.[0]?.image_url);
              const unitPrice = product.discount_price ?? product.price;

              return (
                <div key={product.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <Image
                        src={primaryImage}
                        alt={product.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target && target.src !== DEFAULT_PRODUCT_IMAGE) {
                            target.src = DEFAULT_PRODUCT_IMAGE;
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-xs sm:text-sm">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Qty: {quantity} × {formatCurrency(unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0 text-sm">
                    {formatCurrency(unitPrice * quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pricing breakdown */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Checkout Charge (3.5%)</span>
              <span className="font-semibold text-slate-900">{formatCurrency(checkoutCharge)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Charge</span>
              <span>
                {deliveryCharge === 0 ? (
                  <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                ) : (
                  <span className="font-semibold text-slate-900">{formatCurrency(deliveryCharge)}</span>
                )}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between text-lg font-black text-slate-900">
              <span>Total Payable Amount</span>
              <span className="text-indigo-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Proceed to Payment Action Button */}
          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Opening Secure Gateway...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Proceed to Payment ({formatCurrency(total)})</span>
              </>
            )}
          </button>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Razorpay Official Indian Payment Gateway</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              We never collect or store your card number, CVV, UPI PIN, or netbanking passwords. All transactions are securely routed through RBI-compliant gateway APIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
