'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  UploadCloud,
  X,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  IndianRupee,
  Percent,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getCategories, createProduct } from '@/lib/services';
import { Category } from '@/lib/types';
import { calculateDiscountPercentage, formatCurrency } from '@/lib/utils';

export default function AddProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [discountPrice, setDiscountPrice] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Image Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  // Compute discount percentage live
  const discountPercent =
    typeof price === 'number' && typeof discountPrice === 'number'
      ? calculateDiscountPercentage(price, discountPrice)
      : 0;

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a valid image file (JPG, JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file size exceeds 5MB limit.');
      return;
    }

    setErrorMessage('');
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (price === '' || price < 0) {
      setErrorMessage('Please enter a valid price.');
      return;
    }
    if (stockQuantity === '' || stockQuantity < 0) {
      setErrorMessage('Please specify stock quantity.');
      return;
    }
    if (!imageFile && !fallbackUrl) {
      setErrorMessage('Please upload a product image.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await createProduct(
        {
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          discount_price: discountPrice !== '' ? Number(discountPrice) : null,
          category_id: categoryId || null,
          stock_quantity: Number(stockQuantity),
          sku: sku.trim() || null,
          status,
        },
        imageFile,
        fallbackUrl || undefined
      );

      setSuccessMessage('Product added successfully to Supabase! Redirecting...');
      setTimeout(() => {
        router.push('/admin/products');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save product.');
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/admin/products" className="hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900">Add New Product</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Add New Product
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fill in the details below. Images will be automatically stored in Supabase Storage (`product-images`).
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Basic Info */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Basic Product Details
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Stainless Steel Measuring Cups Set"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                placeholder="Describe fabric, specifications, key features, fit, and care instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  placeholder="e.g. APP-TEE-101"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 2. Image Upload Component (Drag & drop, preview, remove, replace) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Product Image (Supabase Storage)
              </h2>
              <span className="text-xs text-slate-400">JPG, JPEG, PNG, WebP (Max 5MB)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative aspect-video max-w-sm rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace Image</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    {imageFile?.name} ({(Number(imageFile?.size) / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-600 bg-slate-50 hover:bg-indigo-50/40 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mx-auto mb-3 transition-colors">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Drag & drop product photo or click to browse
                </h3>
                <p className="text-xs text-slate-500">
                  Upload high-resolution image from your computer or phone.
                </p>
              </div>
            )}
          </div>

          {/* 3. Pricing, Discount & Inventory */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Pricing & Inventory Controls
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Regular Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    placeholder="999"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Discount Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="799"
                    value={discountPrice}
                    onChange={(e) =>
                      setDiscountPrice(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Automatic Discount Percentage Calculation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Calculated Discount
                </label>
                <div className="flex items-center gap-2 h-[46px] px-4 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black text-emerald-700">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>{discountPercent > 0 ? `${discountPercent}% OFF` : '0% (None)'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Stock Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  placeholder="25"
                  value={stockQuantity}
                  onChange={(e) =>
                    setStockQuantity(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:bg-white focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="active">Active (Visible on Customer Store)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/admin/products"
              className="px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Supabase...</span>
                </>
              ) : (
                <span>Add Product</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
