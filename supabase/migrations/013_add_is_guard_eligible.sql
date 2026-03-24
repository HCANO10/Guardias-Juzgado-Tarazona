-- supabase/migrations/013_add_is_guard_eligible.sql
-- Añade el campo is_guard_eligible a la tabla staff para controlar
-- si un trabajador puede ser asignado en turnos de guardia.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_guard_eligible boolean DEFAULT true;

-- Activar el campo para todos los trabajadores activos existentes
UPDATE staff SET is_guard_eligible = true WHERE is_guard_eligible IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_guard_eligible ON staff(is_guard_eligible);
