-- supabase/migrations/001_create_positions.sql
CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  requires_guard boolean DEFAULT true,
  guard_role text CHECK (guard_role IN ('auxilio', 'tramitador', 'gestor')),
  created_at timestamptz DEFAULT now()
);
