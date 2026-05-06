alter table public.vv_services
  drop column if exists featured,
  drop column if exists features_pl,
  drop column if exists features_en;
