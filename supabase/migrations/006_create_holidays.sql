-- supabase/migrations/006_create_holidays.sql
CREATE TABLE holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('nacional', 'aragon', 'zaragoza_provincia', 'tarazona')),
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, scope)
);

CREATE INDEX idx_holidays_year ON holidays(year);
CREATE INDEX idx_holidays_scope ON holidays(scope);
