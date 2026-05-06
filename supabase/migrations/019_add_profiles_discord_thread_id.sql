alter table public.profiles
add column if not exists discord_thread_id text;

create index if not exists profiles_discord_thread_id_idx
on public.profiles (discord_thread_id)
where discord_thread_id is not null;
