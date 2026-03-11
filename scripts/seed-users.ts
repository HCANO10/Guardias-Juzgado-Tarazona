// scripts/seed-users.ts
// Ejecutar UNA VEZ después de las migraciones para crear usuarios Auth y vincularlos con staff
// Uso: npx tsx scripts/seed-users.ts
//
// REQUISITOS PREVIOS:
// - .env.local debe tener:
//   NEXT_PUBLIC_SUPABASE_URL=https://vwgvrjsxrcknycqtkoeq.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<tu service role key — obtener de Supabase Dashboard > Settings > API>
//
// IMPORTANTE: Sustituir emails y apellidos provisionales por los reales antes de ejecutar

import 'dotenv/config'; // Para leer .env.local
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente con Service Role para crear usuarios (SOLO en scripts de servidor)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEFAULT_PASSWORD = 'Tarazona123456';

interface StaffMember {
  first_name: string;
  last_name: string;
  email: string;
  position_name: string;
}

// Personal real del Juzgado de Tarazona
const staffMembers: StaffMember[] = [
  // Auxilios Judiciales
  { first_name: 'Cristina', last_name: 'Auxilio', email: 'cristina.auxilio@juzgado-tarazona.es', position_name: 'Auxilio Judicial' },
  { first_name: 'Natalia', last_name: 'Auxilio', email: 'natalia.auxilio@juzgado-tarazona.es', position_name: 'Auxilio Judicial' },
  // Tramitadores/as Procesales
  { first_name: 'Iris', last_name: 'Tramitadora', email: 'iris.tramitadora@juzgado-tarazona.es', position_name: 'Tramitador/a Procesal' },
  { first_name: 'Belén', last_name: 'Tramitadora', email: 'belen.tramitadora@juzgado-tarazona.es', position_name: 'Tramitador/a Procesal' },
  { first_name: 'Luis', last_name: 'Tramitador', email: 'luis.tramitador@juzgado-tarazona.es', position_name: 'Tramitador/a Procesal' },
  { first_name: 'Irene', last_name: 'Tramitadora', email: 'irene.tramitadora@juzgado-tarazona.es', position_name: 'Tramitador/a Procesal' },
  // Gestoras Procesales
  { first_name: 'Mónica', last_name: 'Gestora', email: 'monica.gestora@juzgado-tarazona.es', position_name: 'Gestor/a Procesal' },
  { first_name: 'Rocío', last_name: 'Gestora', email: 'rocio.gestora@juzgado-tarazona.es', position_name: 'Gestor/a Procesal' },
  { first_name: 'Valeria', last_name: 'Gestora', email: 'valeria.gestora@juzgado-tarazona.es', position_name: 'Gestor/a Procesal' },
];

async function seedUsers() {
  console.log('🏛️ Creando usuarios del Juzgado de Tarazona...\n');

  // 1. Obtener los puestos de trabajo
  const { data: positions, error: posError } = await supabase
    .from('positions')
    .select('id, name');

  if (posError || !positions) {
    console.error('❌ Error obteniendo puestos:', posError);
    return;
  }

  const positionMap = new Map(positions.map(p => [p.name, p.id]));

  for (const member of staffMembers) {
    console.log(`👤 Procesando: ${member.first_name} ${member.last_name} (${member.position_name})`);

    // 2. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Confirmar email automáticamente (no necesitan verificar)
    });

    if (authError) {
      console.error(`  ❌ Error Auth: ${authError.message}`);
      // Si el usuario ya existe, intentar obtener su ID
      if (authError.message.includes('already')) {
        console.log(`  ℹ️ El usuario ya existe, intentando vincular...`);
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === member.email);
        if (existing) {
          await insertStaff(member, existing.id, positionMap);
        }
      }
      continue;
    }

    if (!authData.user) {
      console.error(`  ❌ No se pudo crear el usuario Auth`);
      continue;
    }

    console.log(`  ✅ Usuario Auth creado: ${authData.user.id}`);

    // 3. Insertar en tabla staff
    await insertStaff(member, authData.user.id, positionMap);
  }

  console.log('\n🎉 Seed completado');
  console.log(`📧 Todos los usuarios pueden acceder con su email y contraseña: ${DEFAULT_PASSWORD}`);
}

async function insertStaff(
  member: StaffMember,
  authUserId: string,
  positionMap: Map<string, string>
) {
  const positionId = positionMap.get(member.position_name);
  if (!positionId) {
    console.error(`  ❌ Puesto no encontrado: ${member.position_name}`);
    return;
  }

  const { error: staffError } = await supabase.from('staff').upsert({
    auth_user_id: authUserId,
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email,
    position_id: positionId,
    is_active: true,
    start_date: '2026-01-01',
  }, { onConflict: 'email' });

  if (staffError) {
    console.error(`  ❌ Error Staff: ${staffError.message}`);
  } else {
    console.log(`  ✅ Staff insertado: ${member.first_name} → ${member.position_name}`);
  }
}

seedUsers();
