-- Internal idempotency table used only by SECURITY DEFINER period-finalization logic.
-- The client roles must not access it directly.
REVOKE ALL PRIVILEGES ON TABLE public.competition_awarded_periods FROM anon, authenticated;
