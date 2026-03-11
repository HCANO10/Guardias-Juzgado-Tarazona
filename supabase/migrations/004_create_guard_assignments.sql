-- supabase/migrations/004_create_guard_assignments.sql
CREATE TABLE guard_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_period_id uuid REFERENCES guard_periods(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  assigned_by text DEFAULT 'manual' CHECK (assigned_by IN ('manual', 'ai', 'imported')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(guard_period_id, staff_id)
);

CREATE INDEX idx_guard_assignments_period ON guard_assignments(guard_period_id);
CREATE INDEX idx_guard_assignments_staff ON guard_assignments(staff_id);
