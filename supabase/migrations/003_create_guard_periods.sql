-- supabase/migrations/003_create_guard_periods.sql
CREATE TABLE guard_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  week_number integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(year, week_number)
);

CREATE INDEX idx_guard_periods_year ON guard_periods(year);
CREATE INDEX idx_guard_periods_dates ON guard_periods(start_date, end_date);
