import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

async function resolveUserFromToken(token: string | null) {
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error } = await tempClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    const user = await resolveUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
    }

    const adminClient = getAdminClient();

    // Query profiles using service role admin client (bypasses RLS)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name, role, username')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile) {
      return NextResponse.json({ profile });
    }

    // Auto-create profile if missing
    const defaultRole =
      user.email === 'ardeyaenterprises@gmail.com' || user.user_metadata?.role === 'admin'
        ? 'admin'
        : 'customer';

    const fullName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');

    const { data: newProfile, error: insertError } = await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        role: defaultRole,
      })
      .select('id, full_name, role, username')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: newProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('authorization');
    const token = body.token || (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null);

    const user = await resolveUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
    }

    const adminClient = getAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name, role, username')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile) {
      return NextResponse.json({ profile });
    }

    const defaultRole =
      user.email === 'ardeyaenterprises@gmail.com' || user.user_metadata?.role === 'admin'
        ? 'admin'
        : 'customer';

    const fullName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');

    const { data: newProfile, error: insertError } = await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        role: defaultRole,
      })
      .select('id, full_name, role, username')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: newProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
