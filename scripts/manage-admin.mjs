import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually if not in process.env
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
            if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !serviceRoleKey) serviceRoleKey = val;
          }
        }
      });
    }
  } catch (err) {
    console.error('Failed to read .env.local:', err.message);
  }
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const [command, arg1, arg2, arg3] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`
===================================================
 ARDEYA ENTERPRISES Supabase Admin Management Tool
===================================================
Usage:
  node scripts/manage-admin.mjs list
      List all registered users, emails, and roles

  node scripts/manage-admin.mjs set-password <email> <newPassword>
      Reset or set a new password for an existing account

  node scripts/manage-admin.mjs create <email> <password> [fullName]
      Create a new admin user (auto-confirmed) with admin role

  node scripts/manage-admin.mjs set-role <email> <admin|customer>
      Update the role in public.profiles for an existing user

Examples:
  node scripts/manage-admin.mjs list
  node scripts/manage-admin.mjs set-password ardeyaenterprises@gmail.com MyNewPassword123!
  node scripts/manage-admin.mjs create admin@luminastore.in Admin@12345 "Store Admin"
===================================================
`);
    return;
  }

  if (command === 'list') {
    console.log('\nFetching users from Supabase Auth and public.profiles...\n');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error listing auth users:', authError.message);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role');

    if (profilesError) {
      console.error('Error listing profiles:', profilesError.message);
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    console.log('---------------------------------------------------------------------------------------------------------');
    console.log('| User ID                              | Email                            | Confirmed | Profile Role  | Name');
    console.log('---------------------------------------------------------------------------------------------------------');

    for (const u of authUsers.users) {
      const prof = profileMap.get(u.id);
      const email = (u.email || '').padEnd(32);
      const id = u.id.padEnd(36);
      const confirmed = u.email_confirmed_at ? 'Yes      ' : 'No       ';
      const role = (prof?.role || 'none').padEnd(13);
      const name = prof?.full_name || 'N/A';
      console.log(`| ${id} | ${email} | ${confirmed} | ${role} | ${name}`);
    }
    console.log('---------------------------------------------------------------------------------------------------------\n');
    return;
  }

  if (command === 'set-password') {
    const email = arg1;
    const newPassword = arg2;

    if (!email || !newPassword) {
      console.error('Usage: node scripts/manage-admin.mjs set-password <email> <newPassword>');
      process.exit(1);
    }

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error listing auth users:', authError.message);
      return;
    }

    const user = authUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error(`User with email "${email}" not found in Supabase Auth.`);
      console.log('To create this user as an admin, run:');
      console.log(`  node scripts/manage-admin.mjs create ${email} ${newPassword}`);
      process.exit(1);
    }

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError.message);
      process.exit(1);
    }

    // Ensure role is admin in public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role: 'admin',
      });

    if (profileError) {
      console.warn('Warning: Updated password, but could not set profile role to admin:', profileError.message);
    } else {
      console.log(`\n Successfully updated password for ${email}! Role is confirmed as 'admin'.\n`);
    }
    return;
  }

  if (command === 'create') {
    const email = arg1;
    const password = arg2;
    const fullName = arg3 || 'Admin User';

    if (!email || !password) {
      console.error('Usage: node scripts/manage-admin.mjs create <email> <password> [fullName]');
      process.exit(1);
    }

    console.log(`Creating user ${email} in Supabase Auth...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    });

    if (createError) {
      console.error('Error creating user:', createError.message);
      process.exit(1);
    }

    const userId = created.user.id;
    console.log(`User created with ID: ${userId}`);

    // Upsert into profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        role: 'admin',
      });

    if (profileError) {
      console.error('Warning: Auth user created, but error upserting profile:', profileError.message);
    } else {
      console.log(`\n Successfully created admin user "${email}" with role 'admin'!\n`);
    }
    return;
  }

  if (command === 'set-role') {
    const email = arg1;
    const role = arg2;

    if (!email || !role || !['admin', 'customer'].includes(role)) {
      console.error('Usage: node scripts/manage-admin.mjs set-role <email> <admin|customer>');
      process.exit(1);
    }

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error listing auth users:', authError.message);
      return;
    }

    const user = authUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role,
      });

    if (profileError) {
      console.error('Error updating role:', profileError.message);
    } else {
      console.log(`\n Successfully set role for "${email}" to "${role}"!\n`);
    }
    return;
  }

  console.error(`Unknown command "${command}". Run "node scripts/manage-admin.mjs help" for usage.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
