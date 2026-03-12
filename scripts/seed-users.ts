/* eslint-disable @typescript-eslint/no-explicit-any */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface UserSeed {
  first_name: string;
  last_name: string;
  email: string;
  position_name: string;
}

const USERS: UserSeed[] = [
  // Auxilio Judicial
  { first_name: 'Cristina', last_name: 'Auxilio', email: 'cristina.test@juzgado-tarazona.local', position_name: 'Auxilio Judicial' },
  { first_name: 'Natalia', last_name: 'Auxilio', email: 'natalia.test@juzgado-tarazona.local', position_name: 'Auxilio Judicial' },
  // Tramitador/a Procesal
  { first_name: 'Iris', last_name: 'Tramitadora', email: 'iris.test@juzgado-tarazona.local', position_name: 'Tramitador/a Procesal' },
  { first_name: 'Belén', last_name: 'Tramitadora', email: 'belen.test@juzgado-tarazona.local', position_name: 'Tramitador/a Procesal' },
  { first_name: 'Luis', last_name: 'Tramitador', email: 'luis.test@juzgado-tarazona.local', position_name: 'Tramitador/a Procesal' },
  { first_name: 'Irene', last_name: 'Tramitadora', email: 'irene.test@juzgado-tarazona.local', position_name: 'Tramitador/a Procesal' },
  // Gestor/a Procesal
  { first_name: 'Mónica', last_name: 'Gestora', email: 'monica.test@juzgado-tarazona.local', position_name: 'Gestor/a Procesal' },
  { first_name: 'Rocío', last_name: 'Gestora', email: 'rocio.test@juzgado-tarazona.local', position_name: 'Gestor/a Procesal' },
  { first_name: 'Valeria', last_name: 'Gestora', email: 'valeria.test@juzgado-tarazona.local', position_name: 'Gestor/a Procesal' },
];

async function main() {
  console.log('🚀 Seed script starting...\n');

  // 1. Fetch position UUIDs
  const { data: positions, error: posErr } = await supabase
    .from('positions')
    .select('id, name');

  if (posErr || !positions) {
    console.error('❌ Error fetching positions:', posErr);
    process.exit(1);
  }

  const positionMap = new Map<string, string>();
  positions.forEach(p => positionMap.set(p.name, p.id));

  console.log('📋 Positions found:');
  positionMap.forEach((id, name) => console.log(`   ${name} → ${id}`));
  console.log('');

  // 2. Create users
  let created = 0;
  let skipped = 0;

  for (const user of USERS) {
    const positionId = positionMap.get(user.position_name);
    if (!positionId) {
      console.error(`❌ Position "${user.position_name}" not found — skipping ${user.email}`);
      skipped++;
      continue;
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Tarazona123456',
      email_confirm: true,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
      }
    });

    if (authErr) {
      if (authErr.message?.includes('already been registered') || authErr.message?.includes('already exists')) {
        console.log(`⏭️  ${user.first_name} ${user.last_name} (${user.email}) — ya existe, skipping`);
        skipped++;
        continue;
      }
      console.error(`❌ Auth error for ${user.email}:`, authErr.message);
      skipped++;
      continue;
    }

    const authUserId = authData.user.id;

    // Insert staff record
    const { error: staffErr } = await supabase
      .from('staff')
      .insert({
        auth_user_id: authUserId,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        position_id: positionId,
        role: 'worker',
        is_active: true,
        is_guard_eligible: true,
        start_date: '2025-01-01',
      });

    if (staffErr) {
      console.error(`❌ Staff insert error for ${user.email}:`, staffErr.message);
      skipped++;
      continue;
    }

    console.log(`✅ ${user.first_name} ${user.last_name} (${user.email}) — created`);
    created++;
  }

  console.log(`\n📊 Results: ${created} created, ${skipped} skipped out of ${USERS.length}\n`);

  // 3. Verification query
  const { data: verification, error: verErr } = await supabase
    .from('staff')
    .select('first_name, last_name, email, role, is_guard_eligible, positions(name)')
    .order('first_name', { ascending: true });

  if (verErr) {
    console.error('❌ Verification query error:', verErr);
  } else {
    console.log('📋 Final staff table:');
    console.log('─'.repeat(100));
    console.log(
      'Name'.padEnd(25) +
      'Email'.padEnd(40) +
      'Position'.padEnd(25) +
      'Role'.padEnd(12) +
      'Guard?'
    );
    console.log('─'.repeat(100));
    verification?.forEach((s: any) => {
      console.log(
        `${s.first_name} ${s.last_name}`.padEnd(25) +
        s.email.padEnd(40) +
        ((s.positions as any)?.name || 'N/A').padEnd(25) +
        s.role.padEnd(12) +
        (s.is_guard_eligible ? '✅' : '❌')
      );
    });
    console.log('─'.repeat(100));
    console.log(`Total: ${verification?.length} staff members`);
  }

  console.log('\n🎉 Seed complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
