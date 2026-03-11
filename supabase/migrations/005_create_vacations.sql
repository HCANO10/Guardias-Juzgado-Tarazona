-- supabase/migrations/005_create_vacations.sql
CREATE TABLE vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'approved' CHECK (status IN ('approved', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vacations_staff ON vacations(staff_id);
CREATE INDEX idx_vacations_dates ON vacations(start_date, end_date);
CREATE INDEX idx_vacations_status ON vacations(status);
