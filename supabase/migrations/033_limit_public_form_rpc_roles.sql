do $$
begin
  if to_regprocedure('public.safe_insert_contact_message(text,text,text,text,text,text,text,text)') is not null then
    revoke execute on function public.safe_insert_contact_message(text,text,text,text,text,text,text,text) from authenticated, public;
    grant execute on function public.safe_insert_contact_message(text,text,text,text,text,text,text,text) to anon;
  end if;

  if to_regprocedure('public.safe_insert_newsletter_subscriber(text,text)') is not null then
    revoke execute on function public.safe_insert_newsletter_subscriber(text,text) from authenticated, public;
    grant execute on function public.safe_insert_newsletter_subscriber(text,text) to anon;
  end if;

  if to_regprocedure('public.safe_insert_newsletter_subscriber(text,text,text,text)') is not null then
    revoke execute on function public.safe_insert_newsletter_subscriber(text,text,text,text) from authenticated, public;
    grant execute on function public.safe_insert_newsletter_subscriber(text,text,text,text) to anon;
  end if;
end $$;
