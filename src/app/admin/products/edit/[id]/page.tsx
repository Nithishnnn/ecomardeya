'use client';

import React, { useState, useEffect, useRef, use } from 'react';
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
  Percent,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getProductById, getCategories, updateProduct } from '@/lib/services';
import { Category, Product } from '@/lib/types';
import { calculateDiscountPercentage } from '@/lib/utils';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [discountPrice, setDiscountPrice] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'out_of_stock'>('active');

  // New image upload
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [prod, cats] = await Promise.all([
          getProductById(resolvedParams.id),
          getCategories(),
        ]);
        setCategories(cats);
        if (prod) {
          setProduct(prod);
          setName(prod.name);
          setDescription(prod.description || '');
          setPrice(prod.price);
          setDiscountPrice(prod.discount_price ?? '');
          setCategoryId(prod.category_id || (cats[0]?.id ?? ''));
          setStockQuantity(prod.stock_quantity);
          setSku(prod.sku || '');
          setStatus(prod.status);
          if (prod.images?.[0]?.image_url) {
            setImagePreview(prod.images[0].image_url);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resolvedParams.id]);

  const discountPercent =
    typeof price === 'number' && typeof discountPrice === 'number'
      ? calculateDiscountPercentage(price, discountPrice)
      : 0;

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a valid image file (JPG, JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB limit.');
      return;
    }

    setErrorMessage('');
    setNewImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleUpdate = async (e: React.FormEvent) => {
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

    setSaving(true);
    setErrorMessage('');

    try {
      await updateProduct(
        resolvedParams.id,
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
        newImageFile
      );

      setSuccessMessage('Product updated successfully in Supabase! Redirecting...');
      setTimeout(() => {
        router.push('/admin/products');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update product.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Loading product data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="p-16 text-center">
          <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
          <Link
            href="/admin/products"
            className="text-xs font-bold text-indigo-600 underline mt-2 inline-block"
          >
            Back to Products
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/admin/products" className="hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900">Edit Product</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Edit Product
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Updating ID: <span className="font-mono text-indigo-600">{product.id}</span>
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

        <form onSubmit={handleUpdate} className="space-y-8">
          {/* 1. Basic Info */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Basic Details
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={5}
                required
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 2. Image Update */}
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

            {imagePreview && (
              <div className="space-y-4">
                <div className="relative aspect-video max-w-sm rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <Image
                    src={imagePreview}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Upload & Replace with New Image</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Pricing, Discount & Stock */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Pricing & Inventory
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Regular Price (₹)
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
                    value={discountPrice}
                    onChange={(e) =>
                      setDiscountPrice(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

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
                  Stock Quantity
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
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
                  <option value="active">Active (Visible)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/admin/products"
              className="px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Updates to Supabase...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
