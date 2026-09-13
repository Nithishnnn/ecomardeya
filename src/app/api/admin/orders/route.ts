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

// GET: Fetch real orders for Admin
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
        .from('orders')
        .select('*, order_items(*, product:products(*)), profile:profiles(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Order not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    const { data, error } = await auth.adminClient
      .from('orders')
      .select('*, order_items(*, product:products(*)), profile:profiles(*)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

// PUT: Update Order Status
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error || !auth.adminClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch existing order to preserve notes
    const { data: existingOrder, error: fetchErr } = await auth.adminClient
      .from('orders')
      .select('status, notes')
      .eq('id', id)
      .single();

    if (fetchErr || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let notesObj: any = {};
    if (existingOrder.notes) {
      try {
        notesObj = JSON.parse(existingOrder.notes);
      } catch {
        notesObj = { legacy_note: existingOrder.notes };
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      // Map fulfillment status to allowed DB status ('pending' | 'paid' | 'cancelled')
      let dbStatus = 'paid';
      if (status === 'cancelled') {
        dbStatus = 'cancelled';
      } else if (status === 'pending') {
        dbStatus = 'pending';
      } else {
        dbStatus = 'paid';
      }
      updatePayload.status = dbStatus;
      notesObj.order_status = status;
    }

    if (notes !== undefined) {
      if (typeof notes === 'string') {
        try {
          const parsed = JSON.parse(notes);
          notesObj = { ...notesObj, ...parsed };
        } catch {
          notesObj.admin_note = notes;
        }
      } else if (typeof notes === 'object') {
        notesObj = { ...notesObj, ...notes };
      }
    }

    updatePayload.notes = JSON.stringify(notesObj);

    const { data, error } = await auth.adminClient
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select('*, order_items(*, product:products(*)), profile:profiles(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  }
}
