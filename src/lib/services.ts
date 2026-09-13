import { supabase } from '@/lib/supabase/client';
import { Product, Category, Order, OrderItem, ProductImage, OrderStatus, PaymentStatus } from '@/lib/types';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_ORDERS } from '@/lib/mockData';
import { slugify } from '@/lib/utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper to check if Supabase is connected to a real instance
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('placeholder') && !key.includes('placeholder'));
}

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';

/**
 * Extracts clean Storage object path (e.g. "products/xxx.jpg") from raw path or full URL.
 */
export function extractStoragePath(rawPathOrUrl?: string | null): string {
  if (!rawPathOrUrl || typeof rawPathOrUrl !== 'string') return '';
  let p = rawPathOrUrl.trim();
  if (p.includes('/product-images/')) {
    p = p.split('/product-images/')[1];
  } else if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      const url = new URL(p);
      const parts = url.pathname.split('/product-images/');
      if (parts[1]) p = parts[1];
    } catch {}
  }
  p = p.replace(/^\/+/, '');
  if (p.includes('?')) p = p.split('?')[0];
  return p;
}

/**
 * Returns a fully qualified, valid HTTPS public URL for a product image.
 * Handles:
 * 1. Full HTTPS Supabase Storage URL
 * 2. Relative Storage path (e.g. "products/xxx.jpg", "/products/xxx.jpg")
 * 3. Filename/path stored in database with bucket prefix
 * 4. Null/empty/invalid image URL
 * Never prepends the Supabase URL twice.
 */
export function getProductImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const trimmed = imageUrl.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '[object Object]' ||
    trimmed === 'dish washer'
  ) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // If already a complete HTTP/HTTPS URL, return directly (do not prepend twice)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Clean relative path
  let cleanPath = trimmed.replace(/^\/+/, '');

  if (cleanPath.startsWith('storage/v1/object/public/product-images/')) {
    cleanPath = cleanPath.replace(/^storage\/v1\/object\/public\/product-images\//, '');
  } else if (cleanPath.startsWith('product-images/')) {
    cleanPath = cleanPath.replace(/^product-images\//, '');
  }

  if (!cleanPath) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // Generate public URL via supabase storage client
  try {
    const { data } = supabase.storage.from('product-images').getPublicUrl(cleanPath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  } catch (err) {
    console.warn('Storage getPublicUrl warning:', err);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nbeuocdndvzajtwznecu.supabase.co';
  return `${baseUrl}/storage/v1/object/public/product-images/${cleanPath}`;
}

/**
 * Maps a raw Supabase products row to the frontend Product interface
 */
export function mapDbProduct(row: any): Product {
  const price = typeof row.price_cents === 'number' ? row.price_cents / 100 : (typeof row.price === 'number' ? row.price : 0);

  const images: ProductImage[] = Array.isArray(row.images)
    ? row.images.map((img: any) => {
        const raw = img.image_url || img.storage_path || '';
        const publicUrl = getProductImageUrl(raw);
        const storagePath = extractStoragePath(raw);
        return {
          id: img.id,
          product_id: img.product_id,
          image_url: publicUrl,
          storage_path: storagePath || raw,
          is_primary: (img.sort_order ?? 0) === 1,
          display_order: img.sort_order ?? 0,
          created_at: img.created_at || row.created_at,
        };
      })
    : [];

  const category: Category | null = row.category
    ? {
        id: row.category.id,
        name: row.category.name,
        slug: row.category.id,
        description: row.category.description || null,
        created_at: row.category.created_at,
        updated_at: row.category.updated_at,
      }
    : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.id,
    description: row.description || null,
    price,
    discount_price: null, // products table does NOT contain discount_price column
    category_id: row.category_id || null,
    stock_quantity: typeof row.stock_quantity === 'number' ? row.stock_quantity : 0,
    sku: row.sku || null,
    status: row.is_active ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    category,
    images,
  };
}

/**
 * Maps a raw Supabase orders row to the frontend Order interface
 */
export function mapDbOrder(row: any): Order {
  const total_amount = typeof row.total_cents === 'number' ? row.total_cents / 100 : (typeof row.total_amount === 'number' ? row.total_amount : 0);
  const subtotal = typeof row.subtotal_cents === 'number' ? row.subtotal_cents / 100 : (typeof row.subtotal === 'number' ? row.subtotal : total_amount);
  const delivery_charge = typeof row.shipping_cents === 'number' ? row.shipping_cents / 100 : (typeof row.delivery_charge === 'number' ? row.delivery_charge : 0);
  const checkout_charge = typeof row.tax_cents === 'number' ? row.tax_cents / 100 : 0;

  let notesData: any = {};
  if (row.notes) {
    try {
      notesData = JSON.parse(row.notes);
    } catch {
      notesData = { legacy_note: row.notes };
    }
  }

  const orderItems: OrderItem[] = Array.isArray(row.order_items)
    ? row.order_items.map((item: any) => ({
        id: item.id,
        order_id: item.order_id || row.id,
        product_id: item.product_id || null,
        product_name: item.product?.name || item.product_name || 'Product',
        quantity: item.quantity || 1,
        price: typeof item.unit_price_cents === 'number' ? item.unit_price_cents / 100 : (typeof item.price === 'number' ? item.price : 0),
        discount_price: null,
        subtotal: typeof item.total_price_cents === 'number' ? item.total_price_cents / 100 : (typeof item.unit_price_cents === 'number' ? (item.unit_price_cents * (item.quantity || 1)) / 100 : (item.price ? item.price * (item.quantity || 1) : 0)),
        created_at: item.created_at || row.created_at,
        product: item.product ? mapDbProduct(item.product) : null,
      }))
    : [];

  return {
    id: row.id,
    order_number: notesData.order_number || row.order_number || (row.notes && !row.notes.startsWith('{') ? row.notes : `ORD-${row.id.slice(0, 8).toUpperCase()}`),
    customer_id: row.profile_id || row.customer_id || null,
    customer_name: notesData.customer_name || row.profile?.full_name || row.customer_name || 'Customer',
    phone: notesData.phone || row.phone || 'N/A',
    whatsapp_number: notesData.whatsapp_number || notesData.phone || row.whatsapp_number || 'N/A',
    email: notesData.email || row.email || null,
    address: notesData.address || row.address || 'Online Order',
    city: notesData.city || row.city || 'N/A',
    district: notesData.district || row.district || 'N/A',
    state: notesData.state || row.state || 'N/A',
    pincode: notesData.pincode || row.pincode || 'N/A',
    landmark: notesData.landmark || row.landmark || null,
    subtotal,
    checkout_charge,
    delivery_charge,
    total_amount,
    payment_status: row.status === 'paid' ? 'paid' : (row.status === 'cancelled' ? 'failed' : 'pending'),
    order_status: (row.status as OrderStatus) || 'pending',
    payment_id: notesData.payment_id || row.payment_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_items: orderItems,
  };
}

/**
 * -------------------------------------------------------------
 * CATEGORIES SERVICES
 * -------------------------------------------------------------
 */
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_CATEGORIES;
  }

  // 1. Try direct Supabase client query
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.id,
        description: c.description || null,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));
    }
  } catch (err: any) {
    console.warn('Direct categories query error:', err.message);
  }

  // 2. Fallback to server API endpoint (bypasses RLS restrictions)
  try {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.id,
          description: c.description || null,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));
      }
    }
  } catch (apiErr: any) {
    console.warn('Categories API fetch error:', apiErr.message);
  }

  // 3. Fallback to admin categories endpoint if authenticated
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const adminRes = await fetch('/api/admin/categories', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        if (Array.isArray(adminData)) {
          return adminData.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.id,
            description: c.description || null,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }));
        }
      }
    }
  } catch (adminErr: any) {
    console.warn('Admin categories API fetch error:', adminErr.message);
  }

  // Real store connected: return empty array if no categories exist in database
  return [];
}

export async function createCategory(name: string, description?: string): Promise<Category> {
  if (!name || !name.trim()) {
    throw new Error('Category name is required.');
  }

  if (!isSupabaseConfigured()) {
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: name.trim(),
      slug: slugify(name),
      description: description?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CATEGORIES.push(newCat);
    return newCat;
  }

  // 1. Try direct Supabase client insert
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: name.trim(), description: description?.trim() || null }])
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        slug: data.id,
        description: data.description || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
    console.warn('Direct category insert failed, attempting admin API fallback:', error?.message);
  } catch (err: any) {
    console.warn('Direct category insert exception:', err.message);
  }

  // 2. Fallback to server-side admin API endpoint
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Category creation failed: Authentication required. Please log in as admin.');
  }

  const res = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ name: name.trim(), description: description?.trim() || null }),
  });

  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData.error || 'Failed to create category via admin API');
  }

  return {
    id: resData.id,
    name: resData.name,
    slug: resData.id,
    description: resData.description || null,
    created_at: resData.created_at,
    updated_at: resData.updated_at,
  };
}

export async function updateCategory(id: string, name: string, description?: string): Promise<Category> {
  if (!id) throw new Error('Category ID is required.');
  if (!name || !name.trim()) throw new Error('Category name is required.');

  if (!isSupabaseConfigured()) {
    const cat = MOCK_CATEGORIES.find(c => c.id === id);
    if (!cat) throw new Error('Category not found');
    cat.name = name.trim();
    cat.description = description?.trim() || null;
    return cat;
  }

  // 1. Try direct Supabase client update
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: name.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        slug: data.id,
        description: data.description || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }
    console.warn('Direct category update failed, attempting admin API fallback:', error?.message);
  } catch (err: any) {
    console.warn('Direct category update exception:', err.message);
  }

  // 2. Fallback to server-side admin API endpoint
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Category update failed: Authentication required. Please log in as admin.');
  }

  const res = await fetch('/api/admin/categories', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ id, name: name.trim(), description: description?.trim() || null }),
  });

  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData.error || 'Failed to update category via admin API');
  }

  return {
    id: resData.id,
    name: resData.name,
    slug: resData.id,
    description: resData.description || null,
    created_at: resData.created_at,
    updated_at: resData.updated_at,
  };
}

export async function deleteCategory(id: string): Promise<void> {
  if (!id) throw new Error('Category ID is required.');

  if (!isSupabaseConfigured()) {
    const idx = MOCK_CATEGORIES.findIndex(c => c.id === id);
    if (idx !== -1) MOCK_CATEGORIES.splice(idx, 1);
    return;
  }

  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid category UUID: "${id}". Real database UUID is required.`);
  }

  // 1. Try direct Supabase client delete
  let deleteSuccess = false;
  try {
    // Nullify category_id on any products referencing this category first
    await supabase.from('products').update({ category_id: null }).eq('category_id', id);

    const { data: delData, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    if (!error && delData && delData.length > 0) {
      deleteSuccess = true;
    } else {
      console.warn('Direct category delete failed, attempting admin API fallback:', error?.message);
    }
  } catch (err: any) {
    console.warn('Direct category delete exception:', err.message);
  }

  // 2. Fallback to server-side admin API endpoint
  if (!deleteSuccess) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Category delete failed: Authentication required. Please log in as admin.');
    }

    const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Failed to delete category via admin API');
    }
  }
}

/**
 * -------------------------------------------------------------
 * PRODUCTS SERVICES
 * -------------------------------------------------------------
 */
export async function getProducts(options?: {
  categorySlug?: string;
  search?: string;
  status?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'newest';
  includeAllStatus?: boolean;
}): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    let result = [...MOCK_PRODUCTS];

    if (!options?.includeAllStatus) {
      result = result.filter(p => p.status === 'active');
    } else if (options?.status && options.status !== 'all') {
      result = result.filter(p => p.status === options.status);
    }

    if (options?.categorySlug && options.categorySlug !== 'all') {
      const cat = MOCK_CATEGORIES.find(c => c.id === options.categorySlug || c.slug === options.categorySlug);
      if (cat) {
        result = result.filter(p => p.category_id === cat.id);
      }
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    if (options?.sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (options?.sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }

  // 1. Try direct Supabase client query
  try {
    let query = supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*)');

    if (!options?.includeAllStatus) {
      query = query.eq('is_active', true);
    } else if (options?.status && options.status !== 'all') {
      if (options.status === 'active') {
        query = query.eq('is_active', true);
      } else if (options.status === 'inactive') {
        query = query.eq('is_active', false);
      }
    }

    if (options?.categorySlug && options.categorySlug !== 'all') {
      query = query.eq('category_id', options.categorySlug);
    }

    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    if (options?.sortBy === 'price-asc') {
      query = query.order('price_cents', { ascending: true });
    } else if (options?.sortBy === 'price-desc') {
      query = query.order('price_cents', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map(mapDbProduct);
    }
  } catch (err: any) {
    console.warn('Direct products query error:', err.message);
  }

  // 2. Fallback to admin products endpoint if admin session exists
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const params = new URLSearchParams();
      if (options?.categorySlug && options.categorySlug !== 'all') params.set('category_id', options.categorySlug);
      if (options?.status) params.set('status', options.status);
      if (options?.search) params.set('search', options.search);

      const adminRes = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        if (Array.isArray(adminData)) {
          return adminData.map(mapDbProduct);
        }
      }
    }
  } catch (adminErr: any) {
    console.warn('Admin products fetch error:', adminErr.message);
  }

  // 3. Fallback to public products endpoint
  try {
    const params = new URLSearchParams();
    if (options?.categorySlug && options.categorySlug !== 'all') params.set('category_id', options.categorySlug);
    if (options?.status) params.set('status', options.status);
    if (options?.search) params.set('search', options.search);
    if (options?.includeAllStatus) params.set('includeAllStatus', 'true');
    if (options?.sortBy) params.set('sortBy', options.sortBy);

    const pubRes = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' });
    if (pubRes.ok) {
      const pubData = await pubRes.json();
      if (Array.isArray(pubData)) {
        return pubData.map(mapDbProduct);
      }
    }
  } catch (pubErr: any) {
    console.warn('Public products fetch error:', pubErr.message);
  }

  // Real store connected: return empty array if no products found in database
  return [];
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!id) return null;

  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.find(p => p.id === id) || null;
  }

  if (!UUID_REGEX.test(id)) {
    return null;
  }

  // 1. Try direct Supabase client query
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .eq('id', id)
      .single();

    if (!error && data) {
      return mapDbProduct(data);
    }
  } catch {
    // Fall through to API
  }

  // 2. Fallback to public API endpoint
  try {
    const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        return mapDbProduct(data);
      }
    }
  } catch {
    // Fall through to admin API
  }

  // 3. Fallback to admin API endpoint
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const adminRes = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        if (adminData && adminData.id) {
          return mapDbProduct(adminData);
        }
      }
    }
  } catch {
    // Return null
  }

  return null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!slug) return null;

  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.find(p => p.slug === slug || p.id === slug) || null;
  }

  // If slug is a valid UUID, directly fetch by ID
  if (UUID_REGEX.test(slug)) {
    return getProductById(slug);
  }

  // If slug contains UUID at the end (e.g. name-UUID)
  const parts = slug.split('-');
  if (parts.length >= 5) {
    const possibleId = parts.slice(-5).join('-');
    if (UUID_REGEX.test(possibleId)) {
      const product = await getProductById(possibleId);
      if (product) return product;
    }
  }

  // Otherwise search in all products
  const products = await getProducts({ includeAllStatus: true });
  return products.find(p => p.slug === slug || p.id === slug || slugify(p.name) === slug) || null;
}

/**
 * Uploads an image file to Supabase Storage bucket `product-images`.
 */
export async function uploadProductImage(file: File): Promise<{ url: string; path: string }> {
  if (!isSupabaseConfigured()) {
    return {
      url: URL.createObjectURL(file),
      path: `mock/${Date.now()}_${file.name}`,
    };
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `products/${Date.now()}_${cleanFileName}`;

  // 1. Try direct Supabase storage upload
  try {
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      return {
        url: data.publicUrl,
        path: filePath,
      };
    }

    console.warn('Direct storage upload failed, attempting authenticated admin API fallback:', uploadError.message);
  } catch (err: any) {
    console.warn('Direct storage upload error:', err.message);
  }

  // 2. Fallback to authenticated admin upload API endpoint
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Storage upload failed: Authentication required. Please log in as admin.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/admin/products/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData.error || 'Storage upload failed');
  }

  return {
    url: resData.url,
    path: resData.path,
  };
}

export async function deleteProductImageFromStorage(pathOrUrl: string): Promise<void> {
  if (!isSupabaseConfigured() || !pathOrUrl) return;

  const filePath = extractStoragePath(pathOrUrl);

  if (!filePath || filePath.startsWith('mock/') || filePath.startsWith('seed/')) {
    return;
  }

  try {
    await supabase.storage.from('product-images').remove([filePath]);
  } catch (err) {
    console.warn('Storage delete warning:', err);
  }
}

/**
 * Creates a new product and links its primary image in Supabase.
 * Strictly uses existing table columns: name, description, price_cents, currency, category_id, stock_quantity, sku, is_active.
 */
export async function createProduct(
  productData: {
    name: string;
    description: string;
    price: number;
    discount_price?: number | null;
    category_id?: string | null;
    stock_quantity: number;
    sku?: string | null;
    status: 'active' | 'inactive' | 'out_of_stock';
  },
  imageFile?: File | null,
  fallbackImageUrl?: string
): Promise<Product> {
  let uploadedImage: { url: string; path: string } | null = null;
  if (imageFile) {
    uploadedImage = await uploadProductImage(imageFile);
  } else if (fallbackImageUrl) {
    uploadedImage = {
      url: fallbackImageUrl,
      path: fallbackImageUrl,
    };
  }

  if (!isSupabaseConfigured()) {
    const newProduct: Product = {
      id: 'prod-' + Date.now(),
      name: productData.name,
      slug: 'prod-' + Date.now(),
      description: productData.description,
      price: productData.price,
      discount_price: null,
      category_id: productData.category_id || null,
      stock_quantity: productData.stock_quantity,
      sku: productData.sku || null,
      status: productData.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: null,
      images: uploadedImage ? [
        {
          id: 'img-' + Date.now(),
          product_id: 'prod-' + Date.now(),
          image_url: uploadedImage.url,
          storage_path: uploadedImage.path,
          is_primary: true,
          display_order: 1,
          created_at: new Date().toISOString(),
        },
      ] : [],
    };
    MOCK_PRODUCTS.unshift(newProduct);
    return newProduct;
  }

  const validCategoryId = productData.category_id && UUID_REGEX.test(productData.category_id)
    ? productData.category_id
    : null;

  const price_cents = Math.round(Number(productData.price) * 100);
  const is_active = productData.status === 'active';

  // 1. Try direct Supabase client insert
  let createdProductRow: any = null;
  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([
        {
          name: productData.name.trim(),
          description: productData.description?.trim() || null,
          price_cents,
          currency: 'INR',
          category_id: validCategoryId,
          stock_quantity: Number(productData.stock_quantity) || 0,
          sku: productData.sku?.trim() || null,
          is_active,
        },
      ])
      .select()
      .single();

    if (!productError && product) {
      createdProductRow = product;
      if (uploadedImage) {
        const storagePath = uploadedImage.path || extractStoragePath(uploadedImage.url);
        await supabase.from('product_images').insert([
          {
            product_id: product.id,
            image_url: storagePath,
            sort_order: 1,
          },
        ]);
      }
    } else if (productError) {
      console.warn('Direct product insert failed, attempting authenticated admin API fallback:', productError.message);
    }
  } catch (err: any) {
    console.warn('Direct product insert exception:', err.message);
  }

  // 2. Fallback to server-side admin API endpoint if direct client insert hit RLS
  if (!createdProductRow) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Product creation failed: Authentication required. Please log in as admin.');
    }

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category_id: validCategoryId,
        stock_quantity: productData.stock_quantity,
        sku: productData.sku,
        status: productData.status,
        imageUrl: uploadedImage ? (uploadedImage.path || extractStoragePath(uploadedImage.url)) : null,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Failed to create product via admin API');
    }

    createdProductRow = resData;
  }

  const loaded = await getProductById(createdProductRow.id);
  if (loaded) return loaded;

  return mapDbProduct(createdProductRow);
}

/**
 * Updates an existing product and optionally replaces its image.
 */
export async function updateProduct(
  id: string,
  productData: Partial<Product>,
  newImageFile?: File | null
): Promise<Product> {
  if (!id) throw new Error('Product ID is required.');
  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid product UUID: "${id}". Real database UUID is required.`);
  }

  let uploadedImage: { url: string; path: string } | null = null;
  if (newImageFile) {
    uploadedImage = await uploadProductImage(newImageFile);
  }

  if (!isSupabaseConfigured()) {
    const idx = MOCK_PRODUCTS.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    const existing = MOCK_PRODUCTS[idx];
    const updated: Product = {
      ...existing,
      ...productData,
      updated_at: new Date().toISOString(),
    };
    if (uploadedImage) {
      updated.images = [
        {
          id: 'img-' + Date.now(),
          product_id: id,
          image_url: uploadedImage.url,
          storage_path: uploadedImage.path,
          is_primary: true,
          display_order: 1,
          created_at: new Date().toISOString(),
        },
      ];
    }
    MOCK_PRODUCTS[idx] = updated;
    return updated;
  }

  const validCategoryId = productData.category_id && UUID_REGEX.test(productData.category_id)
    ? productData.category_id
    : (productData.category_id === null ? null : undefined);

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (productData.name !== undefined) updatePayload.name = productData.name.trim();
  if (productData.description !== undefined) updatePayload.description = productData.description?.trim() || null;
  if (productData.price !== undefined) {
    updatePayload.price_cents = Math.round(Number(productData.price) * 100);
  }
  if (validCategoryId !== undefined) updatePayload.category_id = validCategoryId;
  if (productData.stock_quantity !== undefined) updatePayload.stock_quantity = Number(productData.stock_quantity) || 0;
  if (productData.sku !== undefined) updatePayload.sku = productData.sku?.trim() || null;
  if (productData.status !== undefined) {
    updatePayload.is_active = productData.status === 'active';
  }

  let updateSuccess = false;

  // 1. Try direct Supabase client update
  try {
    const { data: updateData, error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (!updateError && updateData && updateData.length > 0) {
      updateSuccess = true;

      if (uploadedImage) {
        const { data: oldImages } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', id);

        if (oldImages && oldImages.length > 0) {
          for (const img of oldImages) {
            await deleteProductImageFromStorage(img.image_url);
          }
          await supabase.from('product_images').delete().eq('product_id', id);
        }

        const storagePath = uploadedImage.path || extractStoragePath(uploadedImage.url);
        await supabase.from('product_images').insert([
          {
            product_id: id,
            image_url: storagePath,
            sort_order: 1,
          },
        ]);
      }
    } else {
      console.warn('Direct product update failed, attempting authenticated admin API fallback:', updateError?.message);
    }
  } catch (err: any) {
    console.warn('Direct product update exception:', err.message);
  }

  // 2. Fallback to server-side admin API endpoint
  if (!updateSuccess) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Product update failed: Authentication required. Please log in as admin.');
    }

    const res = await fetch('/api/admin/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category_id: validCategoryId,
        stock_quantity: productData.stock_quantity,
        sku: productData.sku,
        status: productData.status,
        imageUrl: uploadedImage ? (uploadedImage.path || extractStoragePath(uploadedImage.url)) : undefined,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Failed to update product via admin API');
    }
  }

  const loaded = await getProductById(id);
  if (!loaded) {
    throw new Error('Product updated but could not be loaded.');
  }
  return loaded;
}

/**
 * Deletes a product and its associated images from Supabase.
 */
export async function deleteProduct(id: string): Promise<void> {
  if (!id) throw new Error('Product ID is required.');

  if (!isSupabaseConfigured()) {
    const idx = MOCK_PRODUCTS.findIndex(p => p.id === id);
    if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1);
    return;
  }

  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid product UUID: "${id}". Real database UUID is required.`);
  }

  let deleteSuccess = false;

  // 1. Try direct Supabase client delete
  try {
    // Find images to clean from storage
    const { data: images } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', id);

    if (images && images.length > 0) {
      for (const img of images) {
        await deleteProductImageFromStorage(img.image_url);
      }
      await supabase.from('product_images').delete().eq('product_id', id);
    }

    const { data: delData, error: delError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select();

    if (!delError && delData && delData.length > 0) {
      deleteSuccess = true;
    } else {
      console.warn('Direct product delete failed, attempting authenticated admin API fallback:', delError?.message);
    }
  } catch (err: any) {
    console.warn('Direct product delete exception:', err.message);
  }

  // 2. Fallback to server-side admin API endpoint
  if (!deleteSuccess) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Product delete failed: Authentication required. Please log in as admin.');
    }

    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Failed to delete product via admin API');
    }
  }
}

/**
 * -------------------------------------------------------------
 * ORDERS SERVICES
 * -------------------------------------------------------------
 */
export async function getOrders(customerId?: string): Promise<Order[]> {
  if (!isSupabaseConfigured()) {
    if (customerId) {
      return MOCK_ORDERS.filter(o => o.customer_id === customerId);
    }
    return MOCK_ORDERS;
  }

  // 1. Try direct Supabase client query
  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, product:products(*)), profile:profiles(*)')
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('profile_id', customerId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map(mapDbOrder);
    }
  } catch (err: any) {
    console.warn('Direct orders query error:', err.message);
  }

  // 2. Fallback to admin orders API if session exists
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const adminOrders = await res.json();
        if (Array.isArray(adminOrders)) {
          return adminOrders.map(mapDbOrder);
        }
      }
    }
  } catch (adminErr: any) {
    console.warn('Admin orders fetch error:', adminErr.message);
  }

  // Real store connected: return empty array if no orders in database
  return [];
}

export async function getOrderById(idOrNumber: string): Promise<Order | null> {
  if (!idOrNumber) return null;

  if (!isSupabaseConfigured()) {
    return MOCK_ORDERS.find(o => o.id === idOrNumber || o.order_number === idOrNumber) || null;
  }

  if (UUID_REGEX.test(idOrNumber)) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*)), profile:profiles(*)')
        .eq('id', idOrNumber)
        .single();

      if (!error && data) {
        return mapDbOrder(data);
      }
    } catch {
      // Fall through to API
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const res = await fetch(`/api/admin/orders?id=${encodeURIComponent(idOrNumber)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) return mapDbOrder(data);
        }
      }
    } catch {
      // Return null
    }
  }

  return null;
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: Order['order_status'],
  paymentStatus?: Order['payment_status']
): Promise<void> {
  if (!orderId) throw new Error('Order ID is required.');

  if (!isSupabaseConfigured()) {
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    if (order) {
      order.order_status = orderStatus;
      if (paymentStatus) order.payment_status = paymentStatus;
      order.updated_at = new Date().toISOString();
    }
    return;
  }

  // 1. Use the admin API route which safely handles constraints and stores fulfillment status in notes
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: orderId,
        status: orderStatus,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (res.ok) {
      return;
    }
    if (resData.error) {
      throw new Error(resData.error);
    }
  }

  // 2. Fallback direct update (safely respecting orders_status_check constraint)
  let dbStatus: 'pending' | 'paid' | 'cancelled' = 'paid';
  if (orderStatus === 'cancelled') dbStatus = 'cancelled';
  else if (orderStatus === 'pending') dbStatus = 'pending';
  else dbStatus = 'paid';

  const { data: currentOrder } = await supabase.from('orders').select('notes').eq('id', orderId).single();
  let notesObj: any = {};
  if (currentOrder?.notes) {
    try {
      notesObj = JSON.parse(currentOrder.notes);
    } catch {
      notesObj = { note: currentOrder.notes };
    }
  }
  notesObj.order_status = orderStatus;

  const { error } = await supabase
    .from('orders')
    .update({
      status: dbStatus,
      notes: JSON.stringify(notesObj),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    throw new Error(error.message);
  }
}

