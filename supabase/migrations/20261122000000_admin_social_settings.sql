create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_workzenn_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workzenn_admin() from public, anon;
grant execute on function public.is_workzenn_admin() to authenticated;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can read their own authorization" on public.admin_users;
create policy "Admins can read their own authorization"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.social_media_settings (
  id integer primary key check (id = 1),
  instagram_username text not null default '',
  instagram_url text not null default '',
  whatsapp_number text not null default '',
  business_email text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.social_media_settings (id, instagram_username, instagram_url)
values (1, '_workzennn_', 'https://www.instagram.com/_workzennn_/')
on conflict (id) do nothing;

alter table public.social_media_settings enable row level security;

revoke all on table public.social_media_settings from anon, authenticated;
grant select on table public.social_media_settings to anon, authenticated;
grant update on table public.social_media_settings to authenticated;

drop policy if exists "Public can read social settings" on public.social_media_settings;
create policy "Public can read social settings"
  on public.social_media_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Only admins can update social settings" on public.social_media_settings;
create policy "Only admins can update social settings"
  on public.social_media_settings
  for update
  to authenticated
  using ((select public.is_workzenn_admin()))
  with check ((select public.is_workzenn_admin()));
