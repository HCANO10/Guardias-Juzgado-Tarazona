-- Migration 014: Granular RLS Policies
-- Replaces the blanket "auth_full_access" policies with role-based restrictions.
--
-- Context: The judicial guard scheduling system has two roles:
--   - headmaster: full admin access (CRUD on everything)
--   - worker: read-only on most tables, CRUD on own vacations only
--
-- NOTE: API routes use the admin/service_role client for write operations,
-- which bypasses RLS entirely. These policies act as a defense-in-depth layer
-- for any direct Supabase client usage (e.g., from client-side code).

-- ============================================================
-- Helper function: get current user's role from staff table
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_staff_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- POSITIONS: Everyone authenticated can read, only headmaster can modify
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.positions;

CREATE POLICY "positions_select_authenticated"
  ON public.positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "positions_modify_headmaster"
  ON public.positions FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'headmaster')
  WITH CHECK (public.get_my_role() = 'headmaster');

-- ============================================================
-- STAFF: Workers see only active staff + themselves; headmasters see all
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.staff;

CREATE POLICY "staff_select_policy"
  ON public.staff FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'headmaster'
    OR is_active = true
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "staff_insert_headmaster"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'headmaster');

CREATE POLICY "staff_update_policy"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'headmaster'
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'headmaster'
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "staff_delete_headmaster"
  ON public.staff FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'headmaster');

-- ============================================================
-- GUARD_PERIODS: Everyone authenticated reads; only headmaster writes
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.guard_periods;

CREATE POLICY "guard_periods_select_authenticated"
  ON public.guard_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "guard_periods_modify_headmaster"
  ON public.guard_periods FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'headmaster')
  WITH CHECK (public.get_my_role() = 'headmaster');

-- ============================================================
-- GUARD_ASSIGNMENTS: Everyone reads; only headmaster writes
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.guard_assignments;

CREATE POLICY "guard_assignments_select_authenticated"
  ON public.guard_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "guard_assignments_modify_headmaster"
  ON public.guard_assignments FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'headmaster')
  WITH CHECK (public.get_my_role() = 'headmaster');

-- ============================================================
-- VACATIONS: Workers CRUD own; headmaster CRUD all
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.vacations;

CREATE POLICY "vacations_select_policy"
  ON public.vacations FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'headmaster'
    OR staff_id = public.get_my_staff_id()
  );

CREATE POLICY "vacations_insert_policy"
  ON public.vacations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'headmaster'
    OR staff_id = public.get_my_staff_id()
  );

CREATE POLICY "vacations_update_policy"
  ON public.vacations FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'headmaster'
    OR staff_id = public.get_my_staff_id()
  )
  WITH CHECK (
    public.get_my_role() = 'headmaster'
    OR staff_id = public.get_my_staff_id()
  );

CREATE POLICY "vacations_delete_headmaster"
  ON public.vacations FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'headmaster');

-- ============================================================
-- HOLIDAYS: Everyone reads; only headmaster writes
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.holidays;

CREATE POLICY "holidays_select_authenticated"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "holidays_modify_headmaster"
  ON public.holidays FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'headmaster')
  WITH CHECK (public.get_my_role() = 'headmaster');

-- ============================================================
-- APP_SETTINGS: Everyone reads; only headmaster updates
-- ============================================================
DROP POLICY IF EXISTS "auth_full_access" ON public.app_settings;

CREATE POLICY "app_settings_select_authenticated"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "app_settings_modify_headmaster"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'headmaster')
  WITH CHECK (public.get_my_role() = 'headmaster');

-- ============================================================
-- ACTIVITY_LOG: Keep existing policies (select for auth, insert for service)
-- No changes needed - migration 010 already set this up correctly
-- ============================================================
