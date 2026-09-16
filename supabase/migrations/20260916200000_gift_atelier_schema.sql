-- Fabrikat Gift Atelier — core schema
-- Companies (workspaces), members, curated catalogue, campaigns with
-- personalisation and engravings, recipients, status history.
-- Access: members of a company via RLS; recipients confirm via token RPCs;
-- Fabrikat staff (app_role 'fabrikat') manage review statuses.

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── Companies & members ────────────────────────────────────────────────────

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  initials text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  created_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager' check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members(user_id);

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where company_id = _company_id and user_id = auth.uid())
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid())
$$;

-- ─── Curated catalogue ──────────────────────────────────────────────────────

create table public.gift_templates (
  id text primary key,
  name jsonb not null,          -- {"de": "...", "en": "..."}
  tagline jsonb not null,
  description jsonb not null,
  price_chf numeric(10,2) not null check (price_chf >= 0),
  tone text not null default '#E6DCCB',
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.template_items (
  id text primary key,
  template_id text not null references public.gift_templates(id) on delete cascade,
  kind text not null,
  name jsonb not null,
  maker text not null default '',
  engraving_surcharge_chf numeric(10,2),   -- null = not engravable
  engraving_max_length int,
  preference jsonb,                        -- {"id","label","options":[...]}
  sort_order int not null default 0
);
create index template_items_template_idx on public.template_items(template_id);

-- ─── Campaigns ──────────────────────────────────────────────────────────────

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  occasion text not null check (occasion in ('year_end', 'customer_appreciation', 'employee_thanks', 'partner_gift')),
  recipient_estimate int not null check (recipient_estimate between 1 and 2000),
  budget_per_recipient_chf numeric(10,2) not null check (budget_per_recipient_chf between 50 and 5000),
  delivery_date date not null,
  template_id text references public.gift_templates(id),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'approved', 'changes_requested')),
  share_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  submitted_at timestamptz,
  snapshot jsonb,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_company_idx on public.campaigns(company_id);
create trigger campaigns_touch before update on public.campaigns
  for each row execute function public.touch_updated_at();

create table public.campaign_personalizations (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  wrapping_id text not null default 'kraft-natural',
  sticker_id text not null default 'none',
  card_id text not null default 'classic',
  card_message text not null default '' check (length(card_message) <= 280),
  logo_data_url text check (logo_data_url is null or length(logo_data_url) <= 2800000),
  logo_file_name text,
  updated_at timestamptz not null default now()
);
create trigger personalizations_touch before update on public.campaign_personalizations
  for each row execute function public.touch_updated_at();

create table public.campaign_engravings (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  item_id text not null references public.template_items(id),
  enabled boolean not null default false,
  text text not null default '' check (length(text) <= 40),
  primary key (campaign_id, item_id)
);

-- ─── Recipients ─────────────────────────────────────────────────────────────

create table public.recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  company text not null default '',
  street text not null default '',
  postal_code text not null default '' check (postal_code = '' or postal_code ~ '^[1-9][0-9]{3}$'),
  city text not null default '',
  canton text not null default '',
  status text not null default 'pending' check (status in ('pending', 'link_sent', 'confirmed')),
  preferences jsonb not null default '{}'::jsonb,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index recipients_campaign_email_idx on public.recipients(campaign_id, lower(email));
create trigger recipients_touch before update on public.recipients
  for each row execute function public.touch_updated_at();

-- ─── Status history (drives notifications) ──────────────────────────────────

create table public.campaign_status_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid default auth.uid(),
  note text,
  created_at timestamptz not null default now()
);
create index status_events_campaign_idx on public.campaign_status_events(campaign_id);

-- ─── Locking: configuration is frozen outside draft / changes_requested ─────

-- A missing campaign (e.g. during a cascading delete) counts as not locked.
create or replace function public.campaign_is_locked(_campaign_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.campaigns where id = _campaign_id and status not in ('draft', 'changes_requested'))
$$;

create or replace function public.guard_campaign_update()
returns trigger language plpgsql as $$
begin
  -- Status, snapshot and submission time only change through the RPCs below
  -- (they set app.status_change = 'on').
  if coalesce(current_setting('app.status_change', true), '') <> 'on' then
    if new.status is distinct from old.status
       or new.snapshot is distinct from old.snapshot
       or new.submitted_at is distinct from old.submitted_at then
      raise exception 'status changes go through submit_quote / set_campaign_status' using errcode = '42501';
    end if;
    if old.status not in ('draft', 'changes_requested') and (
         new.name is distinct from old.name
      or new.occasion is distinct from old.occasion
      or new.recipient_estimate is distinct from old.recipient_estimate
      or new.budget_per_recipient_chf is distinct from old.budget_per_recipient_chf
      or new.delivery_date is distinct from old.delivery_date
      or new.template_id is distinct from old.template_id) then
      raise exception 'campaign is locked while under review' using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from old.status then
    insert into public.campaign_status_events (campaign_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end $$;
create trigger campaigns_guard before update on public.campaigns
  for each row execute function public.guard_campaign_update();

create or replace function public.guard_locked_child()
returns trigger language plpgsql as $$
declare
  _campaign uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  if public.campaign_is_locked(_campaign) then
    raise exception 'campaign is locked while under review' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger personalizations_guard before insert or update or delete on public.campaign_personalizations
  for each row execute function public.guard_locked_child();
create trigger engravings_guard before insert or update or delete on public.campaign_engravings
  for each row execute function public.guard_locked_child();

-- Recipients: while locked, no inserts/deletes; updates only for address,
-- preferences and confirmation status (recipients may still confirm).
create or replace function public.guard_locked_recipients()
returns trigger language plpgsql as $$
begin
  if not public.campaign_is_locked(coalesce(new.campaign_id, old.campaign_id)) then
    return coalesce(new, old);
  end if;
  if tg_op in ('INSERT', 'DELETE') then
    raise exception 'recipient list is locked while under review' using errcode = '42501';
  end if;
  if new.first_name is distinct from old.first_name
     or new.last_name is distinct from old.last_name
     or new.email is distinct from old.email
     or new.campaign_id is distinct from old.campaign_id then
    raise exception 'recipient list is locked while under review' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger recipients_guard before insert or update or delete on public.recipients
  for each row execute function public.guard_locked_recipients();

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.staff enable row level security;
alter table public.gift_templates enable row level security;
alter table public.template_items enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_personalizations enable row level security;
alter table public.campaign_engravings enable row level security;
alter table public.recipients enable row level security;
alter table public.campaign_status_events enable row level security;

create policy "members read companies" on public.companies
  for select to authenticated using (public.is_company_member(id) or public.is_staff());
create policy "members update companies" on public.companies
  for update to authenticated using (public.is_company_member(id)) with check (public.is_company_member(id));

create policy "own memberships" on public.company_members
  for select to authenticated using (user_id = auth.uid() or public.is_staff());

create policy "staff sees itself" on public.staff
  for select to authenticated using (user_id = auth.uid());

create policy "catalogue readable" on public.gift_templates for select to anon, authenticated using (active);
create policy "catalogue items readable" on public.template_items for select to anon, authenticated using (true);

create policy "members read campaigns" on public.campaigns
  for select to authenticated using (public.is_company_member(company_id) or public.is_staff());
create policy "members create campaigns" on public.campaigns
  for insert to authenticated with check (public.is_company_member(company_id) and status = 'draft' and snapshot is null);
create policy "members update campaigns" on public.campaigns
  for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members delete draft campaigns" on public.campaigns
  for delete to authenticated using (public.is_company_member(company_id) and status = 'draft');

create policy "members manage personalization" on public.campaign_personalizations
  for all to authenticated
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and (public.is_company_member(c.company_id) or public.is_staff())))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_company_member(c.company_id)));

create policy "members manage engravings" on public.campaign_engravings
  for all to authenticated
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and (public.is_company_member(c.company_id) or public.is_staff())))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_company_member(c.company_id)));

create policy "members manage recipients" on public.recipients
  for all to authenticated
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and (public.is_company_member(c.company_id) or public.is_staff())))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_company_member(c.company_id)));

create policy "members read status events" on public.campaign_status_events
  for select to authenticated
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and (public.is_company_member(c.company_id) or public.is_staff())));

-- ─── RPCs ───────────────────────────────────────────────────────────────────

-- First visit: create a workspace for the signed-in user (idempotent).
create or replace function public.ensure_workspace(_name text, _contact_name text default '', _contact_email text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _company uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select company_id into _company from public.company_members where user_id = auth.uid() order by created_at limit 1;
  if _company is not null then return _company; end if;
  insert into public.companies (name, initials, contact_name, contact_email)
  values (
    _name,
    upper(left(regexp_replace(_name, '[^[:alpha:] ]', '', 'g'), 1) || coalesce(left(split_part(_name, ' ', 2), 1), '')),
    _contact_name,
    _contact_email
  )
  returning id into _company;
  insert into public.company_members (company_id, user_id, role) values (_company, auth.uid(), 'owner');
  return _company;
end $$;

-- Lock and submit a campaign (members only).
create or replace function public.submit_quote(_campaign_id uuid)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare
  _c public.campaigns;
  _p public.campaign_personalizations;
  _count int;
begin
  select * into _c from public.campaigns where id = _campaign_id for update;
  if _c.id is null or not public.is_company_member(_c.company_id) then
    raise exception 'campaign not found' using errcode = '42501';
  end if;
  if _c.status not in ('draft', 'changes_requested') then
    raise exception 'campaign already submitted' using errcode = '22023';
  end if;
  if _c.template_id is null then raise exception 'choose a gift set first' using errcode = '22023'; end if;
  select count(*) into _count from public.recipients where campaign_id = _campaign_id;
  if _count = 0 then raise exception 'add at least one recipient' using errcode = '22023'; end if;
  select * into _p from public.campaign_personalizations where campaign_id = _campaign_id;

  perform set_config('app.status_change', 'on', true);
  update public.campaigns set
    status = 'submitted',
    submitted_at = now(),
    snapshot = jsonb_build_object(
      'templateId', _c.template_id,
      'recipientCount', _count,
      'budgetPerRecipient', _c.budget_per_recipient_chf,
      'deliveryDate', _c.delivery_date,
      'personalization', to_jsonb(_p) - 'campaign_id' - 'updated_at',
      'engravings', coalesce((select jsonb_object_agg(item_id, jsonb_build_object('enabled', enabled, 'text', text))
                              from public.campaign_engravings where campaign_id = _campaign_id), '{}'::jsonb)
    )
  where id = _campaign_id
  returning * into _c;
  perform set_config('app.status_change', 'off', true);
  return _c;
end $$;

-- Review status changes (Fabrikat staff).
create or replace function public.set_campaign_status(_campaign_id uuid, _status text, _note text default null)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare
  _c public.campaigns;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  if _status not in ('submitted', 'under_review', 'approved', 'changes_requested') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  perform set_config('app.status_change', 'on', true);
  update public.campaigns set status = _status where id = _campaign_id returning * into _c;
  perform set_config('app.status_change', 'off', true);
  if _note is not null then
    update public.campaign_status_events set note = _note
    where id = (select max(id) from public.campaign_status_events where campaign_id = _campaign_id);
  end if;
  return _c;
end $$;

-- Public confirmation page: minimal data by token (anon allowed).
create or replace function public.get_confirmation(_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (select * from public.recipients where token = _token),
       c as (
         select * from public.campaigns
         where share_token = _token or id = (select campaign_id from r)
       )
  select case when (select count(*) from c) = 0 then null else jsonb_build_object(
    'campaign', (select jsonb_build_object(
        'id', c.id, 'templateId', c.template_id, 'deliveryDate', c.delivery_date,
        'status', c.status, 'companyName', co.name)
      from c join public.companies co on co.id = c.company_id),
    'recipient', (select jsonb_build_object(
        'firstName', first_name, 'lastName', last_name, 'email', email,
        'street', street, 'postalCode', postal_code, 'city', city, 'canton', canton,
        'preferences', preferences) from r)
  ) end
$$;

create or replace function public.confirm_address(_token text, _payload jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  _r public.recipients;
  _campaign public.campaigns;
  _email text := lower(trim(_payload->>'email'));
begin
  if coalesce(trim(_payload->>'street'), '') = '' or coalesce(trim(_payload->>'city'), '') = ''
     or coalesce(_payload->>'postalCode', '') !~ '^[1-9][0-9]{3}$' then
    raise exception 'incomplete address' using errcode = '22023';
  end if;
  select * into _r from public.recipients where token = _token;
  if _r.id is null then
    select * into _campaign from public.campaigns where share_token = _token;
    if _campaign.id is null then return 'not_found'; end if;
    select * into _r from public.recipients where campaign_id = _campaign.id and lower(email) = _email;
    if _r.id is null then
      if _campaign.status not in ('draft', 'changes_requested') then return 'closed'; end if;
      if coalesce(trim(_payload->>'firstName'), '') = '' or coalesce(trim(_payload->>'lastName'), '') = '' or _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
        raise exception 'name and email required' using errcode = '22023';
      end if;
      insert into public.recipients (campaign_id, first_name, last_name, email)
      values (_campaign.id, trim(_payload->>'firstName'), trim(_payload->>'lastName'), _email)
      returning * into _r;
    end if;
  end if;
  update public.recipients set
    street = trim(_payload->>'street'),
    postal_code = _payload->>'postalCode',
    city = trim(_payload->>'city'),
    canton = upper(coalesce(_payload->>'canton', '')),
    preferences = coalesce(_payload->'preferences', '{}'::jsonb),
    status = 'confirmed',
    confirmed_at = now()
  where id = _r.id;
  return 'confirmed';
end $$;

revoke all on function public.submit_quote(uuid) from public, anon;
revoke all on function public.set_campaign_status(uuid, text, text) from public, anon;
revoke all on function public.ensure_workspace(text, text, text) from public, anon;
grant execute on function public.submit_quote(uuid) to authenticated;
grant execute on function public.set_campaign_status(uuid, text, text) to authenticated;
grant execute on function public.ensure_workspace(text, text, text) to authenticated;
grant execute on function public.get_confirmation(text) to anon, authenticated;
grant execute on function public.confirm_address(text, jsonb) to anon, authenticated;

grant select on public.gift_templates, public.template_items to anon, authenticated;
grant select, insert, update, delete on
  public.companies, public.company_members, public.campaigns, public.campaign_personalizations,
  public.campaign_engravings, public.recipients to authenticated;
grant select on public.campaign_status_events, public.staff to authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.campaigns, public.recipients;
