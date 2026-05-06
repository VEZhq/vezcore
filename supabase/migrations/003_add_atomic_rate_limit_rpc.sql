CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
RETURNS TABLE(allowed boolean, remaining integer, reset_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window interval := make_interval(secs => (p_window_ms::double precision / 1000.0));
  v_count integer;
  v_reset timestamptz;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'p_key must be non-empty';
  END IF;

  IF p_max_requests <= 0 OR p_window_ms <= 0 THEN
    RAISE EXCEPTION 'p_max_requests and p_window_ms must be greater than zero';
  END IF;

  INSERT INTO public.rate_limits (key, count, reset_time, updated_at)
  VALUES (p_key, 1, v_now + v_window, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN public.rate_limits.reset_time <= v_now THEN 1
      ELSE public.rate_limits.count + 1
    END,
    reset_time = CASE
      WHEN public.rate_limits.reset_time <= v_now THEN v_now + v_window
      ELSE public.rate_limits.reset_time
    END,
    updated_at = v_now
  RETURNING public.rate_limits.count, public.rate_limits.reset_time
  INTO v_count, v_reset;

  RETURN QUERY
  SELECT
    (v_count <= p_max_requests) AS allowed,
    GREATEST(p_max_requests - v_count, 0) AS remaining,
    v_reset AS reset_time;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON public.rate_limits (reset_time);
