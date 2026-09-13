import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// Public GET endpoint to retrieve real categories from public.categories
export async function GET() {
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('categories')
      .select('id, name, description, image_url, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}
