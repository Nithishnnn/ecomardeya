import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
let supabaseUrl, anonKey, serviceRoleKey;
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

console.log('Using Supabase URL:', supabaseUrl);

// Create client using public anon key (just like frontend!)
const client = createClient(supabaseUrl, anonKey);

async function main() {
  // 1. Sign in as admin
  console.log('\n--- 1. Authenticating as admin ---');
  // First, let's find admin user password or sign in with admin user
  // We know email is ardeyaenterprises@gmail.com
  // Let's test with the password that was set
  const adminEmail = 'ardeyaenterprises@gmail.com';
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: 'Admin@12345',
  });

  if (authError) {
    console.error('Sign in failed:', authError.message);
    // If password mismatch, let's check what password was set using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const admin = userList.users.find(u => u.email === adminEmail);
    console.log('Admin user in auth.users:', admin ? { id: admin.id, email: admin.email } : 'Not found');
    return;
  }

  console.log('Successfully authenticated as:', authData.user.email, 'UUID:', authData.user.id);

  // 2. Test Storage Upload as Authenticated User
  console.log('\n--- 2. Testing Storage Upload to bucket product-images ---');
  const testFileName = `test-upload-${Date.now()}.png`;
  const dummyBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  
  const { data: uploadData, error: uploadError } = await client.storage
    .from('product-images')
    .upload(`products/${testFileName}`, dummyBuffer, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    console.error('Storage upload FAILED:', uploadError);
  } else {
    console.log('Storage upload SUCCESSFUL:', uploadData);
  }

  // 3. Test Storage Get Public URL
  const { data: publicUrlData } = client.storage
    .from('product-images')
    .getPublicUrl(`products/${testFileName}`);
  console.log('Public URL:', publicUrlData.publicUrl);

  // 4. Test Inserting Product as Authenticated User
  console.log('\n--- 4. Testing Product Insertion (actual columns: name, price_cents, is_active, etc.) ---');
  const { data: prodData, error: prodError } = await client
    .from('products')
    .insert([
      {
        name: 'Test Product From Script',
        description: 'Test description',
        price_cents: 29900,
        currency: 'INR',
        stock_quantity: 10,
        is_active: true,
      }
    ])
    .select()
    .single();

  if (prodError) {
    console.error('Product insertion FAILED:', prodError);
  } else {
    console.log('Product insertion SUCCESSFUL! Created product ID:', prodData.id);

    // 5. Test Inserting product_images
    console.log('\n--- 5. Testing Product Image Insertion ---');
    const { data: imgData, error: imgError } = await client
      .from('product_images')
      .insert([
        {
          product_id: prodData.id,
          image_url: publicUrlData.publicUrl,
          sort_order: 1,
        }
      ])
      .select();

    if (imgError) {
      console.error('Product image insertion FAILED:', imgError);
    } else {
      console.log('Product image insertion SUCCESSFUL:', imgData);
    }

    // 6. Test Deleting product_images
    console.log('\n--- 6. Testing Product Image Deletion ---');
    const { data: delImgData, error: delImgError } = await client
      .from('product_images')
      .delete()
      .eq('product_id', prodData.id);
    console.log('Product image delete result:', { delImgData, delImgError });

    // 7. Test Deleting product
    console.log('\n--- 7. Testing Product Deletion ---');
    const { data: delProdData, error: delProdError } = await client
      .from('products')
      .delete()
      .eq('id', prodData.id);
    console.log('Product delete result:', { delProdData, delProdError });
  }

  // 8. Clean up uploaded storage file
  console.log('\n--- 8. Testing Storage File Deletion ---');
  const { data: delStorageData, error: delStorageError } = await client.storage
    .from('product-images')
    .remove([`products/${testFileName}`]);
  console.log('Storage remove result:', { delStorageData, delStorageError });
}

main();
