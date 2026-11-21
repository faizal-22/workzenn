create table if not exists public.admin_email_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_email_allowlist_email_lowercase check (email = lower(email))
);

alter table public.admin_email_allowlist enable row level security;
revoke all on table public.admin_email_allowlist from public, anon, authenticated;

insert into public.admin_email_allowlist (email)
values ('workzenn7@gmail.com')
on conflict (email) do nothing;

create or replace function public.restrict_workzenn_auth_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (
    select 1
    from public.admin_email_allowlist
    where email = lower(new.email)
  ) then
    raise exception 'This Supabase project does not allow public account registration.';
  end if;
  return new;
end;
$$;

revoke all on function public.restrict_workzenn_auth_users() from public, anon, authenticated;

drop trigger if exists restrict_workzenn_auth_users on auth.users;
create trigger restrict_workzenn_auth_users
  before insert on auth.users
  for each row execute function public.restrict_workzenn_auth_users();

create or replace function public.is_workzenn_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    join public.admin_email_allowlist as a
      on a.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_workzenn_admin() from public, anon;
grant execute on function public.is_workzenn_admin() to authenticated;

revoke all on table public.admin_users from anon, authenticated;

create table if not exists public.portfolio_samples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default '',
  category text not null default 'Brand',
  description text not null default '',
  asset_url text not null default '',
  storage_path text not null default '',
  asset_type text not null default 'poster'
    check (asset_type in ('video', 'logo', 'poster')),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  detail text not null default '',
  price text not null default '',
  items text[] not null default '{}',
  featured boolean not null default false,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_enquiries (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('enquiry', 'trial')),
  name text not null,
  email text not null,
  business text not null default '',
  service text not null default '',
  created_at timestamptz not null default now()
);

alter table public.portfolio_samples enable row level security;
alter table public.services enable row level security;
alter table public.pricing_plans enable row level security;
alter table public.customer_enquiries enable row level security;

revoke all on table public.portfolio_samples, public.services, public.pricing_plans from public, anon, authenticated;
revoke all on table public.customer_enquiries from public, anon, authenticated;
grant select on table public.portfolio_samples, public.services, public.pricing_plans to anon, authenticated;
grant insert on table public.customer_enquiries to anon, authenticated;
grant select, update, delete on table public.portfolio_samples, public.services, public.pricing_plans to authenticated;
grant insert, select, update, delete on table public.customer_enquiries to authenticated;

drop policy if exists "Public can read published portfolio" on public.portfolio_samples;
create policy "Public can read published portfolio"
  on public.portfolio_samples for select to anon, authenticated
  using (published or (select public.is_workzenn_admin()));
drop policy if exists "Admins can insert portfolio" on public.portfolio_samples;
create policy "Admins can insert portfolio"
  on public.portfolio_samples for insert to authenticated
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can update portfolio" on public.portfolio_samples;
create policy "Admins can update portfolio"
  on public.portfolio_samples for update to authenticated
  using ((select public.is_workzenn_admin()))
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can delete portfolio" on public.portfolio_samples;
create policy "Admins can delete portfolio"
  on public.portfolio_samples for delete to authenticated
  using ((select public.is_workzenn_admin()));

drop policy if exists "Public can read published services" on public.services;
create policy "Public can read published services"
  on public.services for select to anon, authenticated
  using (published or (select public.is_workzenn_admin()));
drop policy if exists "Admins can insert services" on public.services;
create policy "Admins can insert services"
  on public.services for insert to authenticated
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can update services" on public.services;
create policy "Admins can update services"
  on public.services for update to authenticated
  using ((select public.is_workzenn_admin()))
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can delete services" on public.services;
create policy "Admins can delete services"
  on public.services for delete to authenticated
  using ((select public.is_workzenn_admin()));

drop policy if exists "Public can read published pricing" on public.pricing_plans;
create policy "Public can read published pricing"
  on public.pricing_plans for select to anon, authenticated
  using (published or (select public.is_workzenn_admin()));
drop policy if exists "Admins can insert pricing" on public.pricing_plans;
create policy "Admins can insert pricing"
  on public.pricing_plans for insert to authenticated
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can update pricing" on public.pricing_plans;
create policy "Admins can update pricing"
  on public.pricing_plans for update to authenticated
  using ((select public.is_workzenn_admin()))
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can delete pricing" on public.pricing_plans;
create policy "Admins can delete pricing"
  on public.pricing_plans for delete to authenticated
  using ((select public.is_workzenn_admin()));

drop policy if exists "Visitors can submit enquiries" on public.customer_enquiries;
create policy "Visitors can submit enquiries"
  on public.customer_enquiries for insert to anon, authenticated
  with check (true);
drop policy if exists "Admins can read enquiries" on public.customer_enquiries;
create policy "Admins can read enquiries"
  on public.customer_enquiries for select to authenticated
  using ((select public.is_workzenn_admin()));
drop policy if exists "Admins can update enquiries" on public.customer_enquiries;
create policy "Admins can update enquiries"
  on public.customer_enquiries for update to authenticated
  using ((select public.is_workzenn_admin()))
  with check ((select public.is_workzenn_admin()));
drop policy if exists "Admins can delete enquiries" on public.customer_enquiries;
create policy "Admins can delete enquiries"
  on public.customer_enquiries for delete to authenticated
  using ((select public.is_workzenn_admin()));

insert into public.portfolio_samples (name, type, category, description, published, sort_order)
select seed.name, seed.type, seed.category, seed.description, true, seed.sort_order
from (values
  ('Forma Objects', 'Brand & digital', 'Brand', 'Objects for everyday rituals', 1),
  ('Northline Studio', 'Website', 'Web', 'Spaces with a point of view', 2),
  ('Goodside Coffee', 'Brand & campaign', 'Growth', 'A brighter kind of daily', 3),
  ('Fieldwork Goods', 'E-commerce', 'Web', 'Made for the long way round', 4),
  ('Sunday Supply', 'Identity', 'Brand', 'Take the day as it comes', 5),
  ('Relay Health', 'Digital experience', 'Web', 'Care that moves with you', 6)
) as seed(name, type, category, description, sort_order)
where not exists (select 1 from public.portfolio_samples);

insert into public.services (title, description, tags, sort_order, published)
select seed.title, seed.description, seed.tags, seed.sort_order, true
from (values
  ('Brand & identity', 'A clear point of view, a distinct visual language, and the pieces to show up consistently.', array['Strategy', 'Visual identity', 'Art direction']::text[], 1),
  ('Websites & digital', 'Fast, considered digital experiences that make it easier for the right people to say yes.', array['Web design', 'Development', 'E-commerce']::text[], 2),
  ('Growth & content', 'Useful content and practical campaigns designed to build momentum, not just noise.', array['Social', 'Campaigns', 'SEO']::text[], 3)
) as seed(title, description, tags, sort_order)
where not exists (select 1 from public.services);

insert into public.pricing_plans (name, detail, price, items, featured, sort_order, published)
select seed.name, seed.detail, seed.price, seed.items, seed.featured, seed.sort_order, true
from (values
  ('The essentials', 'For a focused start', 'From $1,200', array['One clear project scope', 'A dedicated creative partner', '2–3 week delivery']::text[], false, 1),
  ('The full picture', 'For a brand ready to grow', 'From $3,500', array['Strategy through launch', 'Brand and digital design', 'Ongoing growth support']::text[], true, 2),
  ('Ongoing studio', 'For the work that keeps moving', 'Custom retainer', array['Flexible monthly support', 'Priority project planning', 'A team in your corner']::text[], false, 3)
) as seed(name, detail, price, items, featured, sort_order)
where not exists (select 1 from public.pricing_plans);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workzenn-portfolio',
  'workzenn-portfolio',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read portfolio media" on storage.objects;
create policy "Public can read portfolio media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'workzenn-portfolio');
drop policy if exists "Admins can upload portfolio media" on storage.objects;
create policy "Admins can upload portfolio media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'workzenn-portfolio' and (select public.is_workzenn_admin()));
drop policy if exists "Admins can update portfolio media" on storage.objects;
create policy "Admins can update portfolio media"
  on storage.objects for update to authenticated
  using (bucket_id = 'workzenn-portfolio' and (select public.is_workzenn_admin()))
  with check (bucket_id = 'workzenn-portfolio' and (select public.is_workzenn_admin()));
drop policy if exists "Admins can delete portfolio media" on storage.objects;
create policy "Admins can delete portfolio media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'workzenn-portfolio' and (select public.is_workzenn_admin()));
