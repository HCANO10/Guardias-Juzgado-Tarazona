// src/lib/utils/full-name.ts
export function fullName(staff: {
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
}): string {
  const parts = [staff.first_name, staff.last_name];
  if (staff.second_last_name) parts.push(staff.second_last_name);
  return parts.join(' ');
}
