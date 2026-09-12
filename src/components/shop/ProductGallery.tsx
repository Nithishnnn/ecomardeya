'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/lib/types';

interface ProductGalleryProps {
  images?: ProductImage[];
  title: string;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80';
  const imageList = images && images.length > 0 ? images : [{ id: 'default', image_url: defaultImage, is_primary: true, display_order: 1, storage_path: '', created_at: '', product_id: '' }];
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeImage = imageList[selectedIndex]?.image_url || defaultImage;

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
        />
      </div>

      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {imageList.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedIndex(idx)}
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
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
