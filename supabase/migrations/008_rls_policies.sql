-- supabase/migrations/008_rls_policies.sql
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON positions FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE guard_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON guard_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE guard_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON guard_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON vacations FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
