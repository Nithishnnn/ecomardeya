'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/lib/types';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '@/lib/services';

interface ProductGalleryProps {
  images?: ProductImage[];
  title: string;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const imageList = images && images.length > 0
    ? images.map((img, idx) => ({
        ...img,
        image_url: getProductImageUrl(img.image_url),
      }))
    : [
        {
          id: 'default',
          image_url: DEFAULT_PRODUCT_IMAGE,
          is_primary: true,
          display_order: 1,
          storage_path: '',
          created_at: '',
          product_id: '',
        },
      ];
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeImage, setActiveImage] = useState(imageList[0]?.image_url || DEFAULT_PRODUCT_IMAGE);

  useEffect(() => {
    const nextList = images && images.length > 0
      ? images.map(img => getProductImageUrl(img.image_url))
      : [DEFAULT_PRODUCT_IMAGE];
    setActiveImage(nextList[selectedIndex] || nextList[0] || DEFAULT_PRODUCT_IMAGE);
  }, [images, selectedIndex]);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Large Display */}
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
        <Image
          src={activeImage}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-all duration-300"
          onError={() => {
            if (activeImage !== DEFAULT_PRODUCT_IMAGE) {
              setActiveImage(DEFAULT_PRODUCT_IMAGE);
            }
          }}
        />
      </div>

      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {imageList.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => {
                setSelectedIndex(idx);
                setActiveImage(img.image_url);
              }}
              className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                selectedIndex === idx
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 scale-105'
                  : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={img.image_url}
                alt={`${title} view ${idx + 1}`}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target && target.src !== DEFAULT_PRODUCT_IMAGE) {
                    target.src = DEFAULT_PRODUCT_IMAGE;
                  }
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

