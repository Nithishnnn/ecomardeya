import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '', serviceRoleKey = '', anonKey = '';
content.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') anonKey = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  }
});

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function main() {
  console.log('Testing Orders Statuses:');
  const testOrderStatuses = ['pending', 'paid', 'processing', 'completed', 'cancelled', 'failed', 'succeeded'];
  for (const s of testOrderStatuses) {
    const { data, error } = await adminClient.from('orders').insert([{
      status: s,
      currency: 'INR',
      subtotal_cents: 100000,
      tax_cents: 3500,
      shipping_cents: 0,
      total_cents: 103500,
    }]).select();
    console.log(`  Order status "${s}": ${error ? error.message : 'ACCEPTED'}`);
    if (!error && data && data.length > 0) {
      await adminClient.from('orders').delete().eq('id', data[0].id);
    }
  }

  console.log('\nTesting Payments Statuses:');
  const testPaymentStatuses = ['pending', 'succeeded', 'paid', 'failed'];
  for (const ps of testPaymentStatuses) {
    const { data, error } = await adminClient.from('payments').insert([{
      order_id: 'fcc00d09-96dc-40f1-ab0f-452c8c42c152',
      amount_cents: 103500,
      currency: 'INR',
      status: ps,
      provider: 'razorpay',
    }]).select();
    console.log(`  Payment status "${ps}": ${error ? error.message : 'ACCEPTED'}`);
    if (!error && data && data.length > 0) {
      await adminClient.from('payments').delete().eq('id', data[0].id);
    }
  }

  console.log('\nTesting RLS on Orders:');
  const { data: anonOrders, error: anonOrdersErr } = await anonClient.from('orders').select('*');
  console.log(`  Anon select orders: count = ${anonOrders?.length}, error = ${anonOrdersErr?.message}`);

  const { data: anonInsert, error: anonInsertErr } = await anonClient.from('orders').insert([{
    currency: 'INR',
    subtotal_cents: 100000,
    total_cents: 103500,
    status: 'pending',
  }]);
  console.log(`  Anon insert orders: error = ${anonInsertErr?.message}`);
}

main().catch(console.error);
