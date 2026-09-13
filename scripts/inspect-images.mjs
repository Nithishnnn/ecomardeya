import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
let supabaseUrl, serviceRoleKey, anonKey;
content.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') anonKey = val;
    }
  }
});

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey);
const anonSupabase = createClient(supabaseUrl, anonKey);

async function inspect() {
  console.log('\n--- 1. ALL PRODUCTS ---');
  const { data: products, error: pErr } = await supabase.from('products').select('*');
  if (pErr) console.error('Products error:', pErr);
  else {
    products.forEach(p => console.log(`Product ID: ${p.id} | Name: "${p.name}" | Status: ${p.status}`));
  }

  console.log('\n--- 2. ALL PRODUCT IMAGES (Service Role) ---');
  const { data: images, error: iErr } = await supabase.from('product_images').select('*');
  if (iErr) console.error('Images error:', iErr);
  else {
    images.forEach(img => console.log(`Image ID: ${img.id} | Product ID: ${img.product_id} | URL/Path: "${img.image_url}" | Alt: "${img.alt_text}"`));
  }

  console.log('\n--- 3. ALL PRODUCT IMAGES (Anon Client - RLS check) ---');
  const { data: anonImages, error: aiErr } = await anonSupabase.from('product_images').select('*');
  if (aiErr) console.error('Anon images error:', aiErr);
  else {
    console.log(`Anon client sees ${anonImages.length} images:`);
    anonImages.forEach(img => console.log(`  Anon Image ID: ${img.id} | Product ID: ${img.product_id} | URL/Path: "${img.image_url}"`));
  }

  console.log('\n--- 4. SUPABASE STORAGE BUCKETS ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) console.error('List buckets error:', bErr);
  else {
    console.log('Buckets:', buckets.map(b => ({ name: b.name, public: b.public })));
  }

  console.log('\n--- 5. LIST STORAGE OBJECTS IN "product-images" ---');
  async function listAllFiles(folder = '') {
    const { data: files, error: fErr } = await supabase.storage.from('product-images').list(folder, { limit: 100 });
    if (fErr) {
      console.error(`Error listing folder "${folder}":`, fErr);
      return [];
    }
    let all = [];
    for (const f of files) {
      const fullPath = folder ? `${folder}/${f.name}` : f.name;
      if (f.id === null) {
        // subfolder
        const sub = await listAllFiles(fullPath);
        all = all.concat(sub);
      } else {
        all.push({ ...f, fullPath });
      }
    }
    return all;
  }

  const allFiles = await listAllFiles();
  console.log('Total files found in product-images:', allFiles.length);
  allFiles.forEach(f => console.log(`  File: ${f.fullPath} (size: ${f.metadata?.size})`));

  console.log('\n--- 6. TEST GET PUBLIC URL FOR EACH FILE ---');
  for (const f of allFiles) {
    const { data: pubData } = supabase.storage.from('product-images').getPublicUrl(f.fullPath);
    console.log(`  Path: "${f.fullPath}" => Public URL: ${pubData.publicUrl}`);
  }
}

inspect().catch(console.error);
