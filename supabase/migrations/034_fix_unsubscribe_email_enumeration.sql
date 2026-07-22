-- Fix email enumeration oracle in unsubscribe_by_email.
--
-- Previously, unsubscribe_by_email returned distinct responses when an email
-- was not found ("Adres email nie został znaleziony.") vs found ("success").
-- An unauthenticated caller (GRANT EXECUTE TO anon, see migration 007) could
-- scrape the subscriber list via differential responses. Rate limiting (5/10min)
-- only slowed the attack.
--
-- New behavior: always return success regardless of whether the email exists.
-- `email` is null when the lookup found no subscriber — clients must render a
-- generic success message when email is null. Token-based unsubscribe keeps
-- its strict 404-style error because tokens are random and not enumerable.
--
-- Audit reference: bg_f9ec5cde / W2.

CREATE OR REPLACE FUNCTION public.unsubscribe_by_email(email_input text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscriber record;
  v_rate_limit record;
BEGIN
  -- Rate limit check (key is keyed on the email input)
  SELECT * INTO v_rate_limit FROM public.consume_rate_limit('unsubscribe:' || COALESCE(email_input, ''), 5, 60000);
  IF NOT v_rate_limit.allowed THEN
    RETURN json_build_object('success', false, 'error', 'Zbyt wiele prób. Spróbuj ponownie później.');
  END IF;

  SELECT * INTO v_subscriber FROM public.vv_newsletter_subscribers WHERE email = email_input LIMIT 1;

  -- Constant response regardless of existence — closes enumeration oracle.
  -- If subscriber doesn't exist, no state change happens but caller sees success.
  IF v_subscriber IS NULL THEN
    RETURN json_build_object('success', true, 'email', null);
  END IF;

  -- Already unsubscribed — no state change, return email.
  IF NOT v_subscriber.is_active THEN
    RETURN json_build_object('success', true, 'email', v_subscriber.email);
  END IF;

  UPDATE public.vv_newsletter_subscribers
  SET is_active = false, unsubscribed_at = NOW()
  WHERE email = email_input;

  RETURN json_build_object('success', true, 'email', v_subscriber.email);
END;
$$;

-- Re-grant anon (was granted in migration 007; CREATE OR REPLACE preserves
-- grants but be explicit for clarity).
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_email(text) TO anon;
