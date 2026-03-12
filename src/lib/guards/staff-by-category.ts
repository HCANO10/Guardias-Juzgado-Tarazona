/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/guards/staff-by-category.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from '@supabase/supabase-js';

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

export interface StaffByCategory {
  auxilio: StaffMember[];
  tramitador: StaffMember[];
  gestor: StaffMember[];
}

export async function getActiveStaffByCategory(
  supabase: SupabaseClient
): Promise<StaffByCategory> {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      id, first_name, last_name,
      positions!inner(guard_role)
    `)
    .eq('is_active', true)
    .eq('is_guard_eligible', true)
    .not('positions.guard_role', 'is', null);

  if (error) throw error;

  const result: StaffByCategory = { auxilio: [], tramitador: [], gestor: [] };

  for (const person of data || []) {
    const role = (person.positions as any).guard_role as keyof StaffByCategory;
    if (role in result) {
      result[role].push({
        id: person.id,
        first_name: person.first_name,
        last_name: person.last_name,
      });
    }
  }

  return result;
}
