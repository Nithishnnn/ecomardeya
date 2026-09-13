import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return { error: 'Unauthorized: Missing authorization header', status: 401, adminClient: null, user: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(supabaseUrl, anonKey);

  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) {
    return { error: 'Unauthorized: Invalid auth session', status: 401, adminClient: null, user: null };
  }

  const adminClient = getAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Forbidden: Admin privileges required', status: 403, adminClient: null, user: null };
  }

  return { error: null, status: 200, adminClient, user };
}

// GET: Fetch real categories
export async function GET() {
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST: Create Category
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name, description, image_url } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const { data, error } = await auth.adminClient
      .from('categories')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          image_url: image_url?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create category' }, { status: 500 });
  }
}

// PUT: Update Category
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, name, description, image_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const { data, error } = await auth.adminClient
      .from('categories')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        image_url: image_url?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update category' }, { status: 500 });
  }
}

// DELETE: Delete Category
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: `Invalid category UUID: ${id}` }, { status: 400 });
    }

    // 1. First set category_id = null on any products that reference this category
    // This guarantees no foreign key constraint violations occurs
    await auth.adminClient
      .from('products')
      .update({ category_id: null })
      .eq('category_id', id);

    // 2. Delete the category row from categories table
    const { data: delData, error: delError } = await auth.adminClient
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    if (!delData || delData.length === 0) {
      return NextResponse.json({ error: `Category with ID ${id} not found in database.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Category ${id} deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete category' }, { status: 500 });
  }
}
