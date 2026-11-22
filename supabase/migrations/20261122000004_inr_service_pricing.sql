alter table public.pricing_plans
  add column if not exists pricing_key text;



create unique index if not exists pricing_plans_pricing_key_unique
  on public.pricing_plans (pricing_key);

alter table public.pricing_plans
  drop constraint if exists pricing_plans_inr_price_check;

alter table public.pricing_plans
  add constraint pricing_plans_inr_price_check
  check (
    pricing_key is null
    or price ~ '^(₹([0-9]+|[0-9]{1,3}(,[0-9]{3})+)|Starting at ₹([0-9]+|[0-9]{1,3}(,[0-9]{3})+)|Custom quotation)$'
  );

alter table public.customer_enquiries
  add column if not exists legacy_budget text;

update public.customer_enquiries
set
  legacy_budget = budget,
  budget = 'Legacy budget (not converted)'
where budget ~ '[$€£]'
   or budget ~* '(USD|EUR|GBP)';

delete from public.pricing_plans
where pricing_key is null
  and name in ('The essentials', 'The full picture', 'Ongoing studio');

insert into public.pricing_plans (
  pricing_key, name, detail, price, items, featured, sort_order, published
)
values
  ('photo-editing', 'Photo Editing', 'Clear, upfront pricing', '₹99', '{}', false, 1, true),
  ('background-removal', 'Background Removal', 'Clear, upfront pricing', '₹49', '{}', false, 2, true),
  ('photo-manipulation', 'Photo Manipulation', 'Clear, upfront pricing', '₹199', '{}', false, 3, true),
  ('instagram-poster', 'Instagram Poster', 'Clear, upfront pricing', '₹149', '{}', false, 4, true),
  ('logo-design', 'Logo Design', 'Clear, upfront pricing', '₹299', '{}', false, 5, true),
  ('premium-logo', 'Premium Logo', 'Clear, upfront pricing', '₹599', '{}', false, 6, true),
  ('thumbnail-design', 'Thumbnail Design', 'Clear, upfront pricing', '₹99', '{}', false, 7, true),
  ('reel-editing', 'Reel Editing', 'Clear, upfront pricing', '₹199', '{}', false, 8, true),
  ('basic-video-editing', 'Basic Video Editing', 'Clear, upfront pricing', '₹299', '{}', false, 9, true),
  ('content-creation', 'Content Creation', 'Clear, upfront pricing', '₹199', '{}', false, 10, true),
  ('social-media-post', 'Social Media Post', 'Clear, upfront pricing', '₹149', '{}', false, 11, true),
  ('landing-page', 'Landing Page', 'Clear, upfront pricing', '₹1,499', '{}', false, 12, true),
  ('basic-website', 'Basic Website', 'Clear, upfront pricing', '₹2,999', '{}', false, 13, true),
  ('professional-website', 'Professional Website', 'Clear, upfront pricing', '₹5,999', '{}', false, 14, true),
  ('basic-android-app', 'Basic Android App', 'Final price depends on project requirements', 'Starting at ₹4,999', '{}', false, 15, true),
  ('custom-project', 'Custom Project', 'Scope-based custom quotation', 'Custom quotation', '{}', false, 16, true)
on conflict (pricing_key) do update
set
  name = excluded.name,
  detail = excluded.detail,
  price = excluded.price,
  items = excluded.items,
  sort_order = excluded.sort_order,
  published = true;

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
