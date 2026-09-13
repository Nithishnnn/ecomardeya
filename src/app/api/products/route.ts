import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// Public GET endpoint to retrieve real products from public.products
export async function GET(request: NextRequest) {
  try {
    const adminClient = getAdminClient();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    if (id) {
      const { data, error } = await adminClient
        .from('products')
        .select('*, category:categories(*), images:product_images(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    let query = adminClient
      .from('products')
      .select('*, category:categories(*), images:product_images(*)');

    const includeAllStatus = searchParams.get('includeAllStatus') === 'true';
    const status = searchParams.get('status');

    if (!includeAllStatus) {
      query = query.eq('is_active', true);
    } else if (status && status !== 'all') {
      if (status === 'active') query = query.eq('is_active', true);
      else if (status === 'inactive') query = query.eq('is_active', false);
    }

    const categoryId = searchParams.get('category_id');
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const search = searchParams.get('search');
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const sortBy = searchParams.get('sortBy');
    if (sortBy === 'price-asc') {
      query = query.order('price_cents', { ascending: true });
    } else if (sortBy === 'price-desc') {
      query = query.order('price_cents', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch products' }, { status: 500 });
  }
}
