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
  const tables = ['profiles', 'categories', 'products', 'product_images', 'orders', 'order_items', 'payments'];
  for (const table of tables) {
    // Attempt to select limit 0 to get column names or error
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} sample keys:`, data.length > 0 ? Object.keys(data[0]) : 'empty table');
    }
  }
}

main();
