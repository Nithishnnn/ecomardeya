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

async function testRLS() {
  console.log('=== TEST 1: Anon User (Logged Out) ===');
  const { data: anonInsert, error: anonErr } = await anonClient.from('orders').insert([{
    currency: 'INR',
    subtotal_cents: 100000,
    total_cents: 103500,
    status: 'pending',
  }]).select();
  console.log('Anon insert order error:', anonErr?.message);

  console.log('\n=== TEST 2: Authenticated Admin User ===');
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'ardeyaenterprises@gmail.com',
  });
  const { data: sessionData } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  const adminUser = sessionData.user;
  console.log('Authenticated as:', adminUser.email, 'ID:', adminUser.id);

  const { data: adminInsert, error: adminErr } = await anonClient.from('orders').insert([{
    profile_id: adminUser.id,
    currency: 'INR',
    subtotal_cents: 100000,
    tax_cents: 3500,
    shipping_cents: 0,
    total_cents: 103500,
    status: 'pending',
  }]).select();

  console.log('Admin client insert order error:', adminErr?.message);
  if (!adminErr && adminInsert?.[0]) {
    console.log('Admin client insert order SUCCESS:', adminInsert[0].id);
    await adminClient.from('orders').delete().eq('id', adminInsert[0].id);
  }

  console.log('\n=== TEST 3: Create a Temporary Customer User ===');
  const testCustomerEmail = `customer.test.${Date.now()}@example.com`;
  const { data: newCust, error: custCreateErr } = await adminClient.auth.admin.createUser({
    email: testCustomerEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Test Customer' },
  });

  if (custCreateErr) {
    console.error('Failed to create test customer:', custCreateErr);
    return;
  }

  const customerUser = newCust.user;
  console.log('Created test customer:', customerUser.id);

  // Ensure profile exists with role: 'customer'
  await adminClient.from('profiles').upsert({
    id: customerUser.id,
    full_name: 'Test Customer',
    role: 'customer',
  });

  // Log in as customer
  const customerClient = createClient(supabaseUrl, anonKey);
  const { data: custLogin, error: loginErr } = await customerClient.auth.signInWithPassword({
    email: testCustomerEmail,
    password: 'Password123!',
  });

  if (loginErr) {
    console.error('Customer login error:', loginErr);
    return;
  }

  console.log('Logged in as customer:', custLogin.user?.email);

  // Try inserting customer's own order
  const { data: custInsert, error: custInsertErr } = await customerClient.from('orders').insert([{
    profile_id: customerUser.id,
    currency: 'INR',
    subtotal_cents: 100000,
    tax_cents: 3500,
    shipping_cents: 0,
    total_cents: 103500,
    status: 'pending',
  }]).select();

  console.log('Customer insert own order error:', custInsertErr ? custInsertErr.message : 'SUCCESS');
  if (custInsert?.[0]) {
    console.log('Customer created order ID:', custInsert[0].id);

    // Try inserting order_items
    const { error: oiErr } = await customerClient.from('order_items').insert([{
      order_id: custInsert[0].id,
      product_id: '1631c1b2-205e-4f98-81bd-f39f06634442',
      quantity: 1,
      unit_price_cents: 100000,
    }]);
    console.log('Customer insert order_item error:', oiErr ? oiErr.message : 'SUCCESS');

    // Clean up
    await adminClient.from('order_items').delete().eq('order_id', custInsert[0].id);
    await adminClient.from('orders').delete().eq('id', custInsert[0].id);
  }

  // Try inserting order for ANOTHER user's profile_id
  const { data: hijackInsert, error: hijackErr } = await customerClient.from('orders').insert([{
    profile_id: adminUser.id, // Trying to insert for someone else!
    currency: 'INR',
    subtotal_cents: 100000,
    total_cents: 103500,
    status: 'pending',
  }]).select();

  console.log('Customer hijack other profile order error (should FAIL):', hijackErr ? hijackErr.message : 'UNEXPECTED SUCCESS');
  if (hijackInsert?.[0]) {
    await adminClient.from('orders').delete().eq('id', hijackInsert[0].id);
  }

  // Clean up test customer
  await adminClient.from('profiles').delete().eq('id', customerUser.id);
  await adminClient.auth.admin.deleteUser(customerUser.id);
  console.log('Cleaned up test customer user.');
}

testRLS().catch(console.error);
