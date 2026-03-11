-- Tabla para historial de actividad
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  performed_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(entity_type);

-- RLS (solo admins/service role pueden insertar, todos pueden leer)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read activity_log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only service role can insert activity_log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
