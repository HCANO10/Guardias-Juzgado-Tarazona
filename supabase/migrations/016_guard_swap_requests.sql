-- Migration 016: Guard swap requests
-- Allows workers to request guard week swaps with same-role colleagues.
-- The headmaster can still perform direct swaps; workers go through this request flow.

CREATE TABLE IF NOT EXISTS guard_swap_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id     uuid        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  requested_id     uuid        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  period_id_requester uuid     NOT NULL REFERENCES guard_periods(id) ON DELETE CASCADE,
  period_id_requested  uuid    NOT NULL REFERENCES guard_periods(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','accepted','rejected','cancelled')),
  message          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_swap CHECK (requester_id <> requested_id)
);

-- Prevent duplicate pending requests for the same period pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_swap_req_unique_pending
  ON guard_swap_requests(period_id_requester, period_id_requested)
  WHERE status = 'pending';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_swap_req_requester ON guard_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_req_requested ON guard_swap_requests(requested_id);
CREATE INDEX IF NOT EXISTS idx_swap_req_status    ON guard_swap_requests(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_swap_request_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_swap_requests_updated_at
  BEFORE UPDATE ON guard_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_swap_request_updated_at();

-- RLS: workers only see their own requests; headmaster sees all
ALTER TABLE guard_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swap_requests_select" ON guard_swap_requests
  FOR SELECT USING (
    requester_id = (SELECT id FROM staff WHERE auth_user_id = auth.uid())
    OR requested_id = (SELECT id FROM staff WHERE auth_user_id = auth.uid())
    OR (SELECT role FROM staff WHERE auth_user_id = auth.uid()) = 'headmaster'
  );

CREATE POLICY "swap_requests_insert" ON guard_swap_requests
  FOR INSERT WITH CHECK (
    requester_id = (SELECT id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "swap_requests_update" ON guard_swap_requests
  FOR UPDATE USING (
    requester_id = (SELECT id FROM staff WHERE auth_user_id = auth.uid())
    OR requested_id = (SELECT id FROM staff WHERE auth_user_id = auth.uid())
    OR (SELECT role FROM staff WHERE auth_user_id = auth.uid()) = 'headmaster'
  );
