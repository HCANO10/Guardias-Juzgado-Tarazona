-- ============================================
-- 015: Performance indexes, email uniqueness, activity_log security, FK protection
-- ============================================

-- 1. Case-insensitive unique index on staff email
-- Prevents "User@x.com" and "user@x.com" from coexisting
DROP INDEX IF EXISTS idx_staff_email_lower;
CREATE UNIQUE INDEX idx_staff_email_lower ON public.staff (LOWER(email));

-- 2. Performance indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_activity_log_performed_by ON public.activity_log (performed_by);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON public.staff (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_vacations_staff_status ON public.vacations (staff_id, status);

-- 3. Protect staff.position_id referential integrity
-- Prevent deleting a position that still has staff assigned
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_position_id_fkey;
ALTER TABLE public.staff ADD CONSTRAINT staff_position_id_fkey
  FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE RESTRICT;

-- 4. Restrict activity_log INSERT to service role only
-- Workers should not be able to directly insert activity log entries
-- Service role (used by API routes) bypasses RLS, so server-side inserts still work
DROP POLICY IF EXISTS "Only service role can insert activity_log" ON public.activity_log;
CREATE POLICY "service_role_insert_activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (false);
