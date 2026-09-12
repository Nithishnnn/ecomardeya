-- ==============================================================================
-- BULLETPROOF PROFILES RLS & ADMIN FIX
-- Run this in Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/nbeuocdndvzajtwznecu/sql/new
-- ==============================================================================

-- 1. Create/replace public.is_admin() safely with fixed search_path
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

-- 2. Make sure public.profiles has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop all old/conflicting/recursive policies on public.profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile or admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read-access" ON public.profiles;

-- 4. Create simple, non-recursive SELECT policy:
-- Every authenticated user can read their own profile row
CREATE POLICY "Allow authenticated users to read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 5. Create UPDATE policy:
-- Authenticated users can update their own profile
CREATE POLICY "Allow authenticated users to update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Ensure ardeyaenterprises@gmail.com has the admin role in public.profiles
INSERT INTO public.profiles (id, full_name, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Ardeya Enterprises'),
    'admin'
FROM auth.users
WHERE email = 'ardeyaenterprises@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- 7. Verification: Return the admin profile and active policies
SELECT id, full_name, role, created_at FROM public.profiles;
SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
