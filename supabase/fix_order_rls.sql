-- ==============================================================================
-- ARDEYA ENTERPRISES: SECURE RLS POLICIES FOR ORDERS, ORDER_ITEMS & PAYMENTS
-- Run this in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/nbeuocdndvzajtwznecu/sql/new
-- ==============================================================================

-- 1. Helper function for admin check (SECURITY DEFINER to avoid recursion)
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

-- ------------------------------------------------------------------------------
-- 2. Ensure RLS is ENABLED (NEVER DISABLED)
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. ORDERS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_update" ON public.orders;
DROP POLICY IF EXISTS "Customers view own orders or admin views all" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders (guest or authenticated)" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Admin has full access to manage all orders
CREATE POLICY "orders_admin_all"
ON public.orders FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Customers can view only their own orders
CREATE POLICY "orders_customer_select"
ON public.orders FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Authenticated customers can create ONLY their own orders (prevents anonymous spam & account hijack)
CREATE POLICY "orders_customer_insert"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Customers can only update their own pending orders (or admin updates all)
CREATE POLICY "orders_customer_update"
ON public.orders FOR UPDATE
TO authenticated
USING (profile_id = auth.uid() OR public.is_admin())
WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. ORDER_ITEMS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
DROP POLICY IF EXISTS "order_items_customer_select" ON public.order_items;
DROP POLICY IF EXISTS "order_items_customer_insert" ON public.order_items;
DROP POLICY IF EXISTS "View order items if can view parent order" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

-- Admin has full access to order_items
CREATE POLICY "order_items_admin_all"
ON public.order_items FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Customers can view items only from their own orders
CREATE POLICY "order_items_customer_select"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.profile_id = auth.uid()
  )
);

-- Customers can insert items only for their own orders
CREATE POLICY "order_items_customer_insert"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.profile_id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 5. PAYMENTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
DROP POLICY IF EXISTS "payments_customer_select" ON public.payments;
DROP POLICY IF EXISTS "payments_customer_insert" ON public.payments;
DROP POLICY IF EXISTS "View payments if owner or admin" ON public.payments;
DROP POLICY IF EXISTS "Admins or service role manage payments" ON public.payments;

-- Admin has full access to payments
CREATE POLICY "payments_admin_all"
ON public.payments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Customers can view payments only for their own orders
CREATE POLICY "payments_customer_select"
ON public.payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payments.order_id AND o.profile_id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 6. ENSURE ADMIN PROFILE EXISTS & HAS CORRECT ROLE
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'fdf63326-9e5a-4e70-bd6c-0d282c220d3e',
    'ardeya',
    'Ardeya Enterprises',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin';
