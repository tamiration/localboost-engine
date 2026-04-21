/**
 * Seed script: assign 'admin' role to tamircohen1@gmail.com in user_roles.
 * 
 * Uses the service-role key so it can read auth.users directly.
 * Run with: node --env-file-if-exists=/vercel/share/.env.project scripts/seed-admin-role.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = 'tamircohen1@gmail.com';

async function run() {
  console.log(`Looking up user: ${ADMIN_EMAIL}`);

  // List all auth users and find by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const adminUser = users.find((u) => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    console.log(`User ${ADMIN_EMAIL} not found in auth.users yet.`);
    console.log('They need to sign up first (via /onboarding or /login with Google).');
    console.log('\nAll existing users:');
    users.forEach((u) => console.log(`  - ${u.email} (${u.id})`));
    process.exit(0);
  }

  console.log(`Found user: ${adminUser.id}`);

  // Check if role exists
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', adminUser.id)
    .single();

  if (existingRole) {
    console.log('Role row already exists:', existingRole);
    if (existingRole.role === 'admin') {
      console.log('Already set to admin. No changes needed.');
      process.exit(0);
    }
    // Update to admin
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', adminUser.id);
    if (updateError) {
      console.error('Failed to update role:', updateError.message);
      process.exit(1);
    }
    console.log(`Updated role to admin for ${ADMIN_EMAIL}`);
  } else {
    // Insert new role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: adminUser.id, role: 'admin' });
    if (insertError) {
      console.error('Failed to insert role:', insertError.message);
      process.exit(1);
    }
    console.log(`Inserted role=admin for ${ADMIN_EMAIL}`);
  }
  // Verify
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', adminUser.id)
    .single();

  console.log('Verified row in user_roles:', roleRow);
}

run();
