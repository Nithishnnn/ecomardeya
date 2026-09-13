'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap, Check } from 'lucide-react';
import { Product } from '@/lib/types';
import { formatCurrency, calculateDiscountPercentage } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '@/lib/services';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [addedAnimation, setAddedAnimation] = React.useState(false);

  const discountPercent = calculateDiscountPercentage(product.price, product.discount_price);
  const isOutOfStock = product.status === 'out_of_stock' || product.stock_quantity <= 0;
  const initialImage = getProductImageUrl(product.images?.[0]?.image_url);
  const [cardImage, setCardImage] = useState(initialImage);

  useEffect(() => {
    setCardImage(getProductImageUrl(product.images?.[0]?.image_url));
  }, [product.images]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    const res = addToCart(product, 1);
    if (res.success) {
      setAddedAnimation(true);
      setTimeout(() => setAddedAnimation(false), 1500);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    addToCart(product, 1);
    router.push('/checkout');
  };

  return (
    <div className="group relative bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Product Image & Badges */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square w-full bg-slate-50 overflow-hidden block">
        <Image
          src={cardImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={() => {
            if (cardImage !== DEFAULT_PRODUCT_IMAGE) {
              setCardImage(DEFAULT_PRODUCT_IMAGE);
            }
          }}
        />

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 bg-rose-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
            {discountPercent}% OFF
          </div>
        )}

        {/* Stock Status Badge */}
        {isOutOfStock ? (
          <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            Out of Stock
          </div>
        ) : product.stock_quantity <= 5 ? (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            Only {product.stock_quantity} left
          </div>
        ) : null}
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category */}
        {product.category && (
          <p className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600 mb-1">
            {product.category.name}
          </p>
        )}

        {/* Title */}
        <Link
          href={`/product/${product.slug}`}
          className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2"
        >
          {product.name}
        </Link>

        {/* Pricing */}
        <div className="mt-auto pt-2 flex items-baseline gap-2 mb-4">
          <span className="text-xl font-extrabold text-slate-900">
            {formatCurrency(product.discount_price ?? product.price)}
          </span>
          {product.discount_price && (
            <span className="text-xs text-slate-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        {/* Action Buttons: Add to Cart & Buy Now */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : addedAnimation
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
              isOutOfStock
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-md'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
