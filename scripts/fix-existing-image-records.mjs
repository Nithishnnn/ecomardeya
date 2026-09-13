import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
let supabaseUrl, serviceRoleKey;
content.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  }
});

const supabase = createClient(supabaseUrl, serviceRoleKey);

function extractStoragePath(rawPathOrUrl) {
  if (!rawPathOrUrl || typeof rawPathOrUrl !== 'string') return '';
  let p = rawPathOrUrl.trim();
  if (p.includes('/product-images/')) {
    p = p.split('/product-images/')[1];
  } else if (p.startsWith('http://') || p.startsWith('https://')) {
    try {
      const url = new URL(p);
      const parts = url.pathname.split('/product-images/');
      if (parts[1]) p = parts[1];
    } catch {}
  }
  p = p.replace(/^\/+/, '');
  if (p.includes('?')) p = p.split('?')[0];
  return p;
}

async function fixExistingRecords() {
  console.log('Fetching all product_images records...');
  const { data: images, error } = await supabase.from('product_images').select('*');
  if (error) {
    console.error('Error fetching images:', error);
    return;
  }

  console.log(`Found ${images.length} product_images records.`);

  for (const img of images) {
    console.log(`\nInspecting Image ID: ${img.id}, Product ID: ${img.product_id}`);
    console.log(`  Current image_url: "${img.image_url}"`);

    const storagePath = extractStoragePath(img.image_url);
    console.log(`  Extracted storagePath: "${storagePath}"`);

    if (!storagePath) {
      console.log('  No storage path could be extracted, skipping.');
      continue;
    }

    // Verify object exists in storage
    const pathParts = storagePath.split('/');
    const folder = pathParts.slice(0, -1).join('/');
    const fileName = pathParts[pathParts.length - 1];

    const { data: files, error: listErr } = await supabase.storage
      .from('product-images')
      .list(folder, { search: fileName });

    const exists = files && files.some(f => f.name === fileName);
    console.log(`  Storage object exists in "product-images": ${exists}`);

    if (img.image_url !== storagePath) {
      console.log(`  Updating database record ${img.id} to storage path: "${storagePath}"...`);
      const { data: updated, error: updErr } = await supabase
        .from('product_images')
        .update({ image_url: storagePath })
        .eq('id', img.id)
        .select();

      if (updErr) {
        console.error('  Update error:', updErr);
      } else {
        console.log('  Successfully updated record:', updated);
      }
    } else {
      console.log('  Record already stored as storage path.');
    }
  }

  console.log('\nVerification:');
  const { data: verifyImages } = await supabase.from('product_images').select('*');
  verifyImages?.forEach(img => {
    console.log(`  Image ID: ${img.id} | Product ID: ${img.product_id} | image_url: "${img.image_url}"`);
  });
}

fixExistingRecords().catch(console.error);
