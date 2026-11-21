alter table public.customer_enquiries
  add column if not exists budget text not null default '',
  add column if not exists description text not null default '',
  add column if not exists status text not null default 'new',
  add column if not exists notification_status text not null default 'not_applicable',
  add column if not exists notification_error text not null default '';

alter table public.customer_enquiries
  add constraint customer_enquiries_status_check
    check (status in ('new', 'in_progress', 'completed')),
  add constraint customer_enquiries_notification_status_check
    check (notification_status in ('not_applicable', 'pending', 'sending', 'sent', 'failed'));

alter table public.customer_enquiries
  alter column notification_status set default 'pending';

revoke insert on table public.customer_enquiries from anon, authenticated;
grant select, update, delete on table public.customer_enquiries to authenticated;

create or replace function public.submit_customer_enquiry(
  p_request_type text,
  p_name text,
  p_email text,
  p_business text,
  p_service text,
  p_budget text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  enquiry_id uuid := gen_random_uuid();
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
  if p_description is null or length(trim(p_description)) not between 10 and 5000 then
    raise exception 'Project description must be between 10 and 5000 characters.';
  end if;

  insert into public.customer_enquiries (
    id, request_type, name, email, business, service, budget, description, status, notification_status
  ) values (
    enquiry_id,
    p_request_type,
    trim(p_name),
    trim(p_email),
    trim(p_business),
    trim(p_service),
    trim(p_budget),
    trim(p_description),
    'new',
    'pending'
  );

  return enquiry_id;
end;
$$;

revoke all on function public.submit_customer_enquiry(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_customer_enquiry(text, text, text, text, text, text, text) to anon, authenticated;

alter table public.social_media_settings
  drop column if exists whatsapp_number,
  drop column if exists instagram_username,
  drop column if exists instagram_url;

update public.social_media_settings
set business_email = 'workzenn7@gmail.com'
where id = 1 and business_email = '';
