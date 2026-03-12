// src/lib/staff/normalize.ts

export interface StaffInsertData {
  auth_user_id: string;
  first_name: string;
  last_name: string;
  second_last_name: string | null;
  email: string;
  phone: string | null;
  position_id: string;
  is_active: boolean;
  start_date: string;
  role: 'headmaster' | 'worker';
  notes: string | null;
}

/**
 * Normaliza los datos de un nuevo usuario antes de insertarlos en staff.
 * Garantiza formato idéntico independientemente de registro manual o Google.
 */
export function normalizeStaffData(input: {
  auth_user_id: string;
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
  email: string;
  phone?: string | null;
  position_id: string;
  notes?: string | null;
}): StaffInsertData {
  return {
    auth_user_id: input.auth_user_id,
    first_name: capitalize(input.first_name.trim()),
    last_name: capitalize(input.last_name.trim()),
    second_last_name: input.second_last_name ? capitalize(input.second_last_name.trim()) : null,
    email: input.email.toLowerCase().trim(),
    phone: input.phone?.trim() || null,
    position_id: input.position_id,
    is_active: true,
    start_date: new Date().toISOString().split('T')[0],
    role: 'worker',
    notes: input.notes?.trim() || null,
  };
}

/**
 * Nombre completo — usar en perfiles, listados, detalle.
 */
export function buildFullName(staff: {
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
}): string {
  const parts = [staff.first_name, staff.last_name];
  if (staff.second_last_name) parts.push(staff.second_last_name);
  return parts.filter(Boolean).join(' ');
}

/**
 * Nombre corto — usar en badges, guardias, calendario.
 */
export function buildShortName(staff: {
  first_name: string;
  last_name: string;
}): string {
  return `${staff.first_name} ${staff.last_name}`;
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
