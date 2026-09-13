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

// GET: Fetch real products for Admin inventory
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await auth.adminClient
        .from('products')
        .select('*, category:categories(*), images:product_images(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    let query = auth.adminClient
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .order('created_at', { ascending: false });

    const categoryId = searchParams.get('category_id');
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const status = searchParams.get('status');
    if (status && status !== 'all') {
      if (status === 'active') query = query.eq('is_active', true);
      else if (status === 'inactive') query = query.eq('is_active', false);
    }

    const search = searchParams.get('search');
    if (search) {
      query = query.ilike('name', `%${search}%`);
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

// POST: Create Product
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name, description, price, category_id, stock_quantity, sku, status, imageUrl } = body;

    if (!name || typeof price !== 'number') {
      return NextResponse.json({ error: 'Name and valid price are required' }, { status: 400 });
    }

    const price_cents = Math.round(price * 100);
    const is_active = status === 'active';

    // 1. Insert product using exact database schema
    const { data: product, error: prodError } = await auth.adminClient
      .from('products')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          price_cents,
          currency: 'INR',
          category_id: category_id || null,
          stock_quantity: Number(stock_quantity) || 0,
          sku: sku?.trim() || null,
          is_active,
        },
      ])
      .select()
      .single();

    if (prodError) {
      return NextResponse.json({ error: prodError.message }, { status: 500 });
    }

    // 2. Insert primary image if provided
    if (imageUrl) {
      let storagePath = imageUrl.trim();
      if (storagePath.includes('/product-images/')) {
        storagePath = storagePath.split('/product-images/')[1];
      } else if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        try {
          const u = new URL(storagePath);
          const parts = u.pathname.split('/product-images/');
          if (parts[1]) storagePath = parts[1];
        } catch {}
      }
      storagePath = storagePath.replace(/^\/+/, '');
      if (storagePath.includes('?')) storagePath = storagePath.split('?')[0];

      const { error: imgError } = await auth.adminClient
        .from('product_images')
        .insert([
          {
            product_id: product.id,
            image_url: storagePath || imageUrl,
            sort_order: 1,
          },
        ]);

      if (imgError) {
        console.error('Failed to link image record:', imgError.message);
      }
    }

    // 3. Return full product with relations
    const { data: fullProduct } = await auth.adminClient
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .eq('id', product.id)
      .single();

    return NextResponse.json(fullProduct || product);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 500 });
  }
}

// PUT: Update Product
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, name, description, price, category_id, stock_quantity, sku, status, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description?.trim() || null;
    if (price !== undefined && typeof price === 'number') {
      updatePayload.price_cents = Math.round(price * 100);
    }
    if (category_id !== undefined) updatePayload.category_id = category_id || null;
    if (stock_quantity !== undefined) updatePayload.stock_quantity = Number(stock_quantity) || 0;
    if (sku !== undefined) updatePayload.sku = sku?.trim() || null;
    if (status !== undefined) updatePayload.is_active = status === 'active';

    const { error: updateError } = await auth.adminClient
      .from('products')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update image if new image URL provided
    if (imageUrl) {
      let storagePath = imageUrl.trim();
      if (storagePath.includes('/product-images/')) {
        storagePath = storagePath.split('/product-images/')[1];
      } else if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        try {
          const u = new URL(storagePath);
          const parts = u.pathname.split('/product-images/');
          if (parts[1]) storagePath = parts[1];
        } catch {}
      }
      storagePath = storagePath.replace(/^\/+/, '');
      if (storagePath.includes('?')) storagePath = storagePath.split('?')[0];

      const { data: oldImages } = await auth.adminClient
        .from('product_images')
        .select('image_url')
        .eq('product_id', id);

      if (oldImages && oldImages.length > 0) {
        for (const img of oldImages) {
          let oldPath = img.image_url || '';
          if (oldPath.includes('/product-images/')) {
            oldPath = oldPath.split('/product-images/')[1];
          }
          oldPath = oldPath.replace(/^\/+/, '');
          if (oldPath && !oldPath.startsWith('mock/') && !oldPath.startsWith('http')) {
            await auth.adminClient.storage.from('product-images').remove([oldPath]);
          }
        }
        await auth.adminClient.from('product_images').delete().eq('product_id', id);
      }

      await auth.adminClient.from('product_images').insert([
        {
          product_id: id,
          image_url: storagePath || imageUrl,
          sort_order: 1,
        },
      ]);
    }

    const { data: fullProduct } = await auth.adminClient
      .from('products')
      .select('*, category:categories(*), images:product_images(*)')
      .eq('id', id)
      .single();

    return NextResponse.json(fullProduct);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update product' }, { status: 500 });
  }
}

// DELETE: Delete Product
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // 1. Delete associated image files from storage
    const { data: oldImages } = await auth.adminClient
      .from('product_images')
      .select('image_url')
      .eq('product_id', id);

    if (oldImages && oldImages.length > 0) {
      for (const img of oldImages) {
        if (img.image_url && img.image_url.includes('/product-images/')) {
          const storagePath = img.image_url.split('/product-images/')[1];
          await auth.adminClient.storage.from('product-images').remove([storagePath]);
        }
      }
      await auth.adminClient.from('product_images').delete().eq('product_id', id);
    }

    // 2. Delete product record
    const { error: delError } = await auth.adminClient
      .from('products')
      .delete()
      .eq('id', id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Product ${id} deleted` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete product' }, { status: 500 });
  }
}
