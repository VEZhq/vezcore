-- unsubscribe_by_token: find subscriber by token, mark unsubscribed
CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(token_input text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscriber record;
  v_rate_limit record;
BEGIN
  -- Rate limit check
  SELECT * INTO v_rate_limit FROM public.consume_rate_limit('unsubscribe:' || COALESCE(token_input, ''), 5, 60000);
  IF NOT v_rate_limit.allowed THEN
    RETURN json_build_object('success', false, 'error', 'Zbyt wiele prób. Spróbuj ponownie później.');
  END IF;

  SELECT * INTO v_subscriber FROM public.vv_newsletter_subscribers WHERE token = token_input LIMIT 1;
  
  IF v_subscriber IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Link jest nieprawidłowy lub wygasł.');
  END IF;

  IF NOT v_subscriber.is_active THEN
    RETURN json_build_object('success', true, 'email', v_subscriber.email);
  END IF;

  UPDATE public.vv_newsletter_subscribers
  SET is_active = false, unsubscribed_at = NOW()
  WHERE token = token_input;

  RETURN json_build_object('success', true, 'email', v_subscriber.email);
END;
$$;

-- unsubscribe_by_email: find subscriber by email, mark unsubscribed
CREATE OR REPLACE FUNCTION public.unsubscribe_by_email(email_input text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscriber record;
  v_rate_limit record;
BEGIN
  -- Rate limit check
  SELECT * INTO v_rate_limit FROM public.consume_rate_limit('unsubscribe:' || COALESCE(email_input, ''), 5, 60000);
  IF NOT v_rate_limit.allowed THEN
    RETURN json_build_object('success', false, 'error', 'Zbyt wiele prób. Spróbuj ponownie później.');
  END IF;

  SELECT * INTO v_subscriber FROM public.vv_newsletter_subscribers WHERE email = email_input LIMIT 1;
  
  IF v_subscriber IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Adres email nie został znaleziony.');
  END IF;

  IF NOT v_subscriber.is_active THEN
    RETURN json_build_object('success', true, 'email', v_subscriber.email);
  END IF;

  UPDATE public.vv_newsletter_subscribers
  SET is_active = false, unsubscribed_at = NOW()
  WHERE email = email_input;

  RETURN json_build_object('success', true, 'email', v_subscriber.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_email(text) TO anon;
