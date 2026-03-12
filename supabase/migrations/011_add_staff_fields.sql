-- supabase/migrations/011_add_staff_fields.sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS second_last_name text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone text;
