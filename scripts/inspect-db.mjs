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

async function main() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  let anonKey = '';
  content.split('\n').forEach((line) => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      anonKey = line.split('=')[1].trim();
    }
  });
  const anonClient = createClient(supabaseUrl, anonKey);

  console.log('=== ANON CLIENT QUERY ===');
  const { data: anonProducts, error: anonPErr } = await anonClient
    .from('products')
    .select('*, category:categories(*), images:product_images(*)');

  if (anonPErr) {
    console.error('anonProducts error:', anonPErr);
  } else {
    console.log('anonProducts result:', JSON.stringify(anonProducts, null, 2));
  }

  console.log('=== DIRECT ANON QUERY TO PRODUCT_IMAGES ===');
  const { data: anonImages, error: anonImgErr } = await anonClient
    .from('product_images')
    .select('*');

  if (anonImgErr) {
    console.error('anonImages error:', anonImgErr);
  } else {
    console.log('anonImages result count:', anonImages.length, JSON.stringify(anonImages, null, 2));
  }

  console.log('=== CHECK RLS POLICIES ON PRODUCT_IMAGES ===');
  // Query pg_policies via rpc or service client if possible
  const { data: policies, error: polErr } = await supabase
    .rpc('get_policies') // if exists
    .catch(() => ({ data: null }));
}

main();


