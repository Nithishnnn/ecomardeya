-- ==============================================================================
-- COMPLETE & IDEMPOTENT SUPABASE RLS MIGRATION FOR ARDEYA ENTERPRISES
-- Execute this once in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/nbeuocdndvzajtwznecu/sql/new
-- ==============================================================================
-- REAL DATABASE SCHEMA (verified against live database):
--   profiles:       id, username, full_name, avatar_url, created_at, updated_at, role
--   categories:     id, name, description, image_url, created_at, updated_at  (NO slug)
--   products:       id, category_id, name, description, price_cents, currency, stock_quantity, sku, is_active, created_at, updated_at (NO slug, price, discount_price, status)
--   product_images: id, product_id, image_url, sort_order, created_at (NO storage_path, is_primary, display_order)
--   orders:         id, profile_id, status, currency, subtotal_cents, tax_cents, shipping_cents, total_cents, notes, created_at, updated_at
--   order_items:    id, order_id, product_id, quantity, unit_price_cents, created_at
--   payments:       id, order_id, amount_cents, currency, status, provider, created_at
--   storage.objects: bucket_id = 'product-images'
-- ==============================================================================

-- 1. Create or replace public.is_admin() helper function
-- Uses SECURITY DEFINER with fixed search_path to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ==============================================================================
-- 2. FIX public.profiles RLS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing/conflicting policies on public.profiles
DROP POLICY IF EXISTS "Users can read own profile or admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read-access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Authenticated user can read their own profile, or admin can read all
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile, BUT customer cannot promote themselves to 'admin'
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR public.is_admin())
);

-- Admins can manage all profiles
CREATE POLICY "profiles_admin_all"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- 3. FIX public.categories RLS
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public to view categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin to insert categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin to update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin to delete categories" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

-- ANYONE (including anon / not-logged-in store visitors) can view categories
CREATE POLICY "categories_public_select"
ON public.categories FOR SELECT
TO anon, authenticated
USING (true);

-- Only authenticated admin can insert categories
CREATE POLICY "categories_admin_insert"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only authenticated admin can update categories
CREATE POLICY "categories_admin_update"
ON public.categories FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only authenticated admin can delete categories
CREATE POLICY "categories_admin_delete"
ON public.categories FOR DELETE
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 4. FIX public.products RLS
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active products visible to everyone, all to admin" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Allow customers to view active products and admin to view all" ON public.products;
DROP POLICY IF EXISTS "Allow admin to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow admin to update products" ON public.products;
DROP POLICY IF EXISTS "Allow admin to delete products" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

-- Public / anon can view active products; admin can view all products
CREATE POLICY "products_select"
ON public.products FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.is_admin());

-- Only authenticated admin can insert products
CREATE POLICY "products_admin_insert"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only authenticated admin can update products
CREATE POLICY "products_admin_update"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only authenticated admin can delete products
CREATE POLICY "products_admin_delete"
ON public.products FOR DELETE
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 5. FIX public.product_images RLS
-- ==============================================================================
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Product images visible to everyone" ON public.product_images;
DROP POLICY IF EXISTS "Admins can insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;
DROP POLICY IF EXISTS "Allow admin to insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Allow admin to update product images" ON public.product_images;
DROP POLICY IF EXISTS "Allow admin to delete product images" ON public.product_images;
DROP POLICY IF EXISTS "Allow public to view product images" ON public.product_images;
DROP POLICY IF EXISTS "product_images_select" ON public.product_images;
DROP POLICY IF EXISTS "product_images_admin_insert" ON public.product_images;
DROP POLICY IF EXISTS "product_images_admin_update" ON public.product_images;
DROP POLICY IF EXISTS "product_images_admin_delete" ON public.product_images;

-- Anyone can view product images
CREATE POLICY "product_images_select"
ON public.product_images FOR SELECT
TO anon, authenticated
USING (true);

-- Only authenticated admin can insert product images
CREATE POLICY "product_images_admin_insert"
ON public.product_images FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only authenticated admin can update product images
CREATE POLICY "product_images_admin_update"
ON public.product_images FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only authenticated admin can delete product images
CREATE POLICY "product_images_admin_delete"
ON public.product_images FOR DELETE
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 6. FIX storage.objects RLS (bucket: product-images)
-- ==============================================================================
-- Ensure the product-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop all old/conflicting storage policies
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images in bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view product images in bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to delete product images" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_images_delete" ON storage.objects;

-- Public can view files inside product-images bucket
CREATE POLICY "storage_product_images_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

-- Authenticated admin can upload files to product-images bucket
CREATE POLICY "storage_product_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
);

-- Authenticated admin can update files in product-images bucket
CREATE POLICY "storage_product_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
);

-- Authenticated admin can delete files in product-images bucket
CREATE POLICY "storage_product_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND public.is_admin()
);

-- ==============================================================================
-- 7. FIX public.orders, public.order_items, public.payments RLS
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
DROP POLICY IF EXISTS "order_items_customer_select" ON public.order_items;
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
DROP POLICY IF EXISTS "payments_customer_select" ON public.payments;

-- Admin can manage all orders; Customers can view their own orders
CREATE POLICY "orders_admin_all"
ON public.orders FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "orders_customer_select"
ON public.orders FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Admin can manage all order_items; Customers can view items of their own orders
CREATE POLICY "order_items_admin_all"
ON public.order_items FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "order_items_customer_select"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.profile_id = auth.uid()
  )
);

-- Admin can manage all payments; Customers can view payments of their own orders
CREATE POLICY "payments_admin_all"
ON public.payments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "payments_customer_select"
ON public.payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payments.order_id AND o.profile_id = auth.uid()
  )
);

-- ==============================================================================
-- 8. Ensure admin profile exists for ardeyaenterprises@gmail.com
-- User ID: fdf63326-9e5a-4e70-bd6c-0d282c220d3e
-- ==============================================================================
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'fdf63326-9e5a-4e70-bd6c-0d282c220d3e',
    'ardeya',
    'Ardeya Enterprises',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin';
