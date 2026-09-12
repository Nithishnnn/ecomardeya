import { supabase } from '@/lib/supabase/client';
import { Product, Category, Order, ProductImage } from '@/lib/types';
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_ORDERS } from '@/lib/mockData';
import { slugify } from '@/lib/utils';

// Helper to check if Supabase is connected to a real instance
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('placeholder') && !key.includes('placeholder'));
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

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Using fallback categories due to Supabase query error/empty:', error?.message);
      return MOCK_CATEGORIES;
    }

    return data as Category[];
  } catch (err) {
    console.warn('Error querying categories:', err);
    return MOCK_CATEGORIES;
  }
}

export async function createCategory(name: string, description?: string): Promise<Category> {
  const slug = slugify(name);
  if (!isSupabaseConfigured()) {
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      slug,
      description: description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CATEGORIES.push(newCat);
    return newCat;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, slug, description }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(id: string, name: string, description?: string): Promise<Category> {
  const slug = slugify(name);
  if (!isSupabaseConfigured()) {
    const cat = MOCK_CATEGORIES.find(c => c.id === id);
    if (!cat) throw new Error('Category not found');
    cat.name = name;
    cat.slug = slug;
    cat.description = description || null;
    return cat;
  }

  const { data, error } = await supabase
    .from('categories')
    .update({ name, slug, description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const idx = MOCK_CATEGORIES.findIndex(c => c.id === id);
    if (idx !== -1) MOCK_CATEGORIES.splice(idx, 1);
    return;
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
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
      const cat = MOCK_CATEGORIES.find(c => c.slug === options.categorySlug);
      if (cat) {
        result = result.filter(p => p.category_id === cat.id);
      }
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    if (options?.sortBy === 'price-asc') {
      result.sort((a, b) => (a.discount_price ?? a.price) - (b.discount_price ?? b.price));
    } else if (options?.sortBy === 'price-desc') {
      result.sort((a, b) => (b.discount_price ?? b.price) - (a.discount_price ?? a.price));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }

  try {
    let query = supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*)');

    if (!options?.includeAllStatus) {
      query = query.eq('status', 'active');
    } else if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.categorySlug && options.categorySlug !== 'all') {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', options.categorySlug)
        .single();

      if (catData) {
        query = query.eq('category_id', catData.id);
      }
    }

    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    if (options?.sortBy === 'price-asc') {
      query = query.order('price', { ascending: true });
    } else if (options?.sortBy === 'price-desc') {
      query = query.order('price', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      console.warn('Using fallback mock products:', error?.message);
      return MOCK_PRODUCTS;
    }

    return data as Product[];
  } catch (err) {
    console.warn('Error fetching products from Supabase:', err);
    return MOCK_PRODUCTS;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.find(p => p.slug === slug) || null;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return MOCK_PRODUCTS.find(p => p.slug === slug) || null;
    }

    return data as Product;
  } catch {
    return MOCK_PRODUCTS.find(p => p.slug === slug) || null;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.find(p => p.id === id) || null;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return MOCK_PRODUCTS.find(p => p.id === id) || null;
    }

    return data as Product;
  } catch {
    return MOCK_PRODUCTS.find(p => p.id === id) || null;
  }
}

/**
 * Uploads an image file to Supabase Storage bucket `product-images`
 */
export async function uploadProductImage(file: File): Promise<{ url: string; path: string }> {
  if (!isSupabaseConfigured()) {
    // Generate object URL for mock preview
    return {
      url: URL.createObjectURL(file),
      path: `mock/${Date.now()}_${file.name}`,
    };
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `products/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    path: filePath,
  };
}

export async function deleteProductImageFromStorage(path: string): Promise<void> {
  if (!isSupabaseConfigured() || path.startsWith('mock/') || path.startsWith('seed/')) {
    return;
  }
  await supabase.storage.from('product-images').remove([path]);
}

/**
 * Creates a new product and uploads its primary image to Supabase Storage
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
  const baseSlug = slugify(productData.name);
  const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

  let uploadedImage: { url: string; path: string } | null = null;
  if (imageFile) {
    uploadedImage = await uploadProductImage(imageFile);
  } else if (fallbackImageUrl) {
    uploadedImage = {
      url: fallbackImageUrl,
      path: `external/${Date.now()}`,
    };
  }

  if (!isSupabaseConfigured()) {
    const newProduct: Product = {
      id: 'prod-' + Date.now(),
      name: productData.name,
      slug,
      description: productData.description,
      price: productData.price,
      discount_price: productData.discount_price || null,
      category_id: productData.category_id || null,
      stock_quantity: productData.stock_quantity,
      sku: productData.sku || null,
      status: productData.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: MOCK_CATEGORIES.find(c => c.id === productData.category_id) || null,
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

  // 1. Insert product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert([
      {
        name: productData.name,
        slug,
        description: productData.description,
        price: productData.price,
        discount_price: productData.discount_price || null,
        category_id: productData.category_id || null,
        stock_quantity: productData.stock_quantity,
        sku: productData.sku || null,
        status: productData.status,
      },
    ])
    .select()
    .single();

  if (productError) {
    throw new Error(productError.message);
  }

  // 2. Insert image information
  if (uploadedImage) {
    await supabase.from('product_images').insert([
      {
        product_id: product.id,
        image_url: uploadedImage.url,
        storage_path: uploadedImage.path,
        is_primary: true,
        display_order: 1,
      },
    ]);
  }

  return getProductById(product.id) as Promise<Product>;
}

export async function updateProduct(
  id: string,
  productData: Partial<Product>,
  newImageFile?: File | null
): Promise<Product> {
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

  const { error: updateError } = await supabase
    .from('products')
    .update({
      name: productData.name,
      description: productData.description,
      price: productData.price,
      discount_price: productData.discount_price,
      category_id: productData.category_id,
      stock_quantity: productData.stock_quantity,
      sku: productData.sku,
      status: productData.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) throw new Error(updateError.message);

  if (uploadedImage) {
    // Optionally delete old primary image
    const { data: oldImages } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id);

    if (oldImages && oldImages.length > 0) {
      for (const img of oldImages) {
        await deleteProductImageFromStorage(img.storage_path);
      }
      await supabase.from('product_images').delete().eq('product_id', id);
    }

    await supabase.from('product_images').insert([
      {
        product_id: id,
        image_url: uploadedImage.url,
        storage_path: uploadedImage.path,
        is_primary: true,
        display_order: 1,
      },
    ]);
  }

  return getProductById(id) as Promise<Product>;
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const idx = MOCK_PRODUCTS.findIndex(p => p.id === id);
    if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1);
    return;
  }

  // Find images to clean from storage
  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', id);

  if (images && images.length > 0) {
    for (const img of images) {
      await deleteProductImageFromStorage(img.storage_path);
    }
  }

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
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

  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return MOCK_ORDERS;
    }

    return data as Order[];
  } catch {
    return MOCK_ORDERS;
  }
}

export async function getOrderById(idOrNumber: string): Promise<Order | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_ORDERS.find(o => o.id === idOrNumber || o.order_number === idOrNumber) || null;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
      .single();

    if (error || !data) {
      return MOCK_ORDERS.find(o => o.id === idOrNumber || o.order_number === idOrNumber) || null;
    }

    return data as Order;
  } catch {
    return MOCK_ORDERS.find(o => o.id === idOrNumber || o.order_number === idOrNumber) || null;
  }
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: Order['order_status'],
  paymentStatus?: Order['payment_status']
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    if (order) {
      order.order_status = orderStatus;
      if (paymentStatus) order.payment_status = paymentStatus;
      order.updated_at = new Date().toISOString();
    }
    return;
  }

  const updates: Record<string, any> = {
    order_status: orderStatus,
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus) {
    updates.payment_status = paymentStatus;
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}
