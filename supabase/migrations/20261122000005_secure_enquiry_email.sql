do $$
begin
  if to_regclass('public.enquiries') is null then
    alter table public.customer_enquiries rename to enquiries;
  end if;
end;
$$;

alter table public.enquiries
  add column if not exists instagram_username text not null default '',
  add column if not exists reference_image_url text not null default '',
  add column if not exists submission_key uuid,
  add column if not exists email_notification_token uuid,
  add column if not exists notification_attempted_at timestamptz,
  add column if not exists email_sent_at timestamptz;

create unique index if not exists enquiries_submission_key_unique
  on public.enquiries (submission_key);

update public.enquiries
set notification_status = 'pending'
where notification_status = 'not_applicable';

update public.enquiries
set
  notification_status = 'failed',
  notification_error = 'Previous email attempt was interrupted; retry from the admin dashboard.'
where notification_status = 'sending'
  and notification_attempted_at is null;

revoke insert on table public.enquiries from anon, authenticated;
grant select, update, delete on table public.enquiries to authenticated;

drop function if exists public.submit_customer_enquiry(text, text, text, text, text, text, text);

create or replace function public.submit_customer_enquiry(
  p_request_type text,
  p_name text,
  p_email text,
  p_business text,
  p_service text,
  p_budget text,
  p_description text,
  p_instagram_username text default '',
  p_reference_image_url text default '',
  p_submission_key uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  enquiry_id uuid;
  notification_token uuid;
  normalized_instagram_username text;
  normalized_reference_image_url text := coalesce(trim(p_reference_image_url), '');
begin
  if p_request_type is null or p_request_type not in ('enquiry', 'trial') then
    raise exception 'Choose a valid enquiry type.';
  end if;
  if p_name is null or length(trim(p_name)) not between 1 and 200 then
    raise exception 'Enter a name of 1 to 200 characters.';
  end if;
  if p_email is null
    or length(trim(p_email)) not between 3 and 320
    or trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  then
    raise exception 'Enter a valid email address.';
  end if;
  if p_business is null or length(p_business) > 300 then
    raise exception 'Business name must be 300 characters or fewer.';
  end if;
  if p_service is null or length(trim(p_service)) not between 1 and 200 then
    raise exception 'Choose a service.';
  end if;
  if p_budget is null or length(trim(p_budget)) not between 1 and 100 then
    raise exception 'Choose a project budget.';
  end if;
  if p_budget not in (
    '₹100 – ₹300',
    '₹300 – ₹500',
    '₹500 – ₹1,000',
    '₹1,000 – ₹2,500',
    '₹2,500 – ₹5,000',
    '₹5,000 – ₹10,000',
    '₹10,000+'
  ) and p_budget !~ '^Custom Budget: ₹[0-9]+$' then
    raise exception 'Choose one of the listed INR budgets or enter a custom budget.';
  end if;
  if p_description is null or length(trim(p_description)) not between 10 and 5000 then
    raise exception 'Project description must be between 10 and 5000 characters.';
  end if;
  if p_submission_key is null then
    raise exception 'A submission key is required.';
  end if;

  normalized_instagram_username := regexp_replace(trim(coalesce(p_instagram_username, '')), '^@', '');
  if length(normalized_instagram_username) > 30
    or (normalized_instagram_username <> '' and normalized_instagram_username !~ '^[A-Za-z0-9._]+$')
  then
    raise exception 'Enter a valid Instagram username.';
  end if;
  if length(normalized_reference_image_url) > 2048
    or (normalized_reference_image_url <> '' and normalized_reference_image_url !~* '^https://[^[:space:]]+$')
  then
    raise exception 'Enter a valid HTTPS reference image URL.';
  end if;

  notification_token := gen_random_uuid();
  insert into public.enquiries (
    id,
    request_type,
    name,
    email,
    business,
    service,
    budget,
    description,
    instagram_username,
    reference_image_url,
    submission_key,
    email_notification_token,
    status,
    notification_status
  ) values (
    gen_random_uuid(),
    p_request_type,
    trim(p_name),
    trim(p_email),
    trim(p_business),
    trim(p_service),
    trim(p_budget),
    trim(p_description),
    normalized_instagram_username,
    normalized_reference_image_url,
    p_submission_key,
    notification_token,
    'new',
    'pending'
  )
  on conflict (submission_key) do nothing
  returning id into enquiry_id;

  if enquiry_id is null then
    select id, email_notification_token
      into enquiry_id, notification_token
      from public.enquiries
      where submission_key = p_submission_key;
  end if;

  return jsonb_build_object(
    'enquiryId', enquiry_id,
    'notificationToken', notification_token
  );
end;
$$;

revoke all on function public.submit_customer_enquiry(text, text, text, text, text, text, text, text, text, uuid) from public;
grant execute on function public.submit_customer_enquiry(text, text, text, text, text, text, text, text, text, uuid) to anon, authenticated;

create table if not exists public.enquiry_email_rate_limits (
  request_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0)
);

alter table public.enquiry_email_rate_limits enable row level security;
revoke all on table public.enquiry_email_rate_limits from public, anon, authenticated;

create or replace function public.consume_enquiry_email_rate_limit(
  p_request_key text,
  p_limit integer default 5,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if p_request_key is null or length(p_request_key) <> 64
    or p_limit not between 1 and 20
    or p_window_seconds not between 60 and 86400
  then
    raise exception 'Invalid email notification rate-limit request.';
  end if;

  delete from public.enquiry_email_rate_limits
    where window_started_at < now() - interval '24 hours';

  insert into public.enquiry_email_rate_limits (request_key, window_started_at, request_count)
  values (p_request_key, now(), 1)
  on conflict (request_key) do update
  set
    request_count = case
      when public.enquiry_email_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else public.enquiry_email_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.enquiry_email_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else public.enquiry_email_rate_limits.window_started_at
    end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_enquiry_email_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_enquiry_email_rate_limit(text, integer, integer) to service_role;
