'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Zap,
  MessageCircle,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Plus,
  Minus,
  ArrowLeft,
} from 'lucide-react';
import { getProductBySlug } from '@/lib/services';
import { Product } from '@/lib/types';
import { formatCurrency, calculateDiscountPercentage } from '@/lib/utils';
import { createProductEnquiryWhatsAppUrl } from '@/lib/whatsapp';
import { useCart } from '@/context/CartContext';
import ProductGallery from '@/components/shop/ProductGallery';

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadProduct() {
      try {
        const item = await getProductBySlug(resolvedParams.slug);
        setProduct(item);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [resolvedParams.slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-200 rounded-3xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 rounded-md w-3/4 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded-md w-1/4 animate-pulse" />
            <div className="h-24 bg-slate-200 rounded-md w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h1>
        <p className="text-slate-500 mb-6">The product you are looking for does not exist or has been removed.</p>
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

  const isOutOfStock = product.status === 'out_of_stock' || product.stock_quantity <= 0;
  const discountPercent = calculateDiscountPercentage(product.price, product.discount_price);
  const effectivePrice = product.discount_price ?? product.price;
  const whatsAppUrl = createProductEnquiryWhatsAppUrl(product);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      setAddedAnimation(true);
      setErrorMessage('');
      setTimeout(() => setAddedAnimation(false), 2000);
    } else if (res.message) {
      setErrorMessage(res.message);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      router.push('/checkout');
    } else if (res.message) {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-8">
        <Link href="/" className="hover:text-indigo-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-indigo-600">
          Shop
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-indigo-600">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-800 truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        {/* Product Gallery */}
        <div className="lg:col-span-6">
          <ProductGallery images={product.images} title={product.name} />
        </div>

        {/* Product Details & Actions */}
        <div className="lg:col-span-6 flex flex-col">
          {/* Category Tag */}
          {product.category && (
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 mb-2 block">
              {product.category.name}
            </span>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
            {product.name}
          </h1>

          {/* SKU & Stock Badge */}
          <div className="flex items-center gap-3 mb-6">
            {product.sku && (
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                SKU: {product.sku}
              </span>
            )}
            {isOutOfStock ? (
              <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full">
                Out of Stock
              </span>
            ) : product.stock_quantity <= 5 ? (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                Only {product.stock_quantity} left in stock
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> In Stock ({product.stock_quantity} units)
              </span>
            )}
          </div>

          {/* Price Box */}
          <div className="p-5 rounded-3xl bg-slate-100/70 border border-slate-200/80 mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">
                {formatCurrency(effectivePrice)}
              </span>
              {product.discount_price && (
                <>
                  <span className="text-lg text-slate-400 line-through">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="bg-rose-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Inclusive of all taxes. Free shipping over ₹999.</p>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Product Overview
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description || 'No description provided for this product.'}
            </p>
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Quantity
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-300 rounded-2xl bg-white shadow-xs overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-3 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 text-base">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="p-3 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  Total: <strong className="text-slate-900">{formatCurrency(effectivePrice * quantity)}</strong>
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-600 mb-4 bg-rose-50 p-2.5 rounded-xl">
              {errorMessage}
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : addedAnimation
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-lg hover:scale-[1.01]'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now with 1-Click</span>
              </button>
            </div>

            {/* WhatsApp Enquiry Button */}
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Enquire or Order on WhatsApp</span>
            </a>
          </div>

          {/* Security & Delivery Highlights */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs text-slate-500">
            <div className="flex flex-col items-center text-center gap-1.5">
              <Truck className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-800">Nationwide Shipping</span>
              <span>Delivery within 3-5 days</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-slate-800">Razorpay Verified</span>
              <span>100% Encrypted Payment</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-slate-800">Easy Exchanges</span>
              <span>7-Day Replacement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
