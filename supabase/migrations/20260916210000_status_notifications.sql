-- Status notifications: every status change posts to the app's hook endpoint,
-- which sends the email and updates Google Sheets / the pipeline webhook.
-- Configure once (values are not readable by app users):
--   insert into private.integration_settings (key, value) values
--     ('status_hook_url', 'https://<your-app-domain>/api/hooks/campaign-status'),
--     ('status_hook_secret', '<same value as HOOK_SECRET>')
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.integration_settings (
  key text primary key,
  value text not null
);
revoke all on private.integration_settings from public, anon, authenticated;

create or replace function private.notify_status_change()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  _url text;
  _secret text;
begin
  select value into _url from private.integration_settings where key = 'status_hook_url';
  select value into _secret from private.integration_settings where key = 'status_hook_secret';
  if _url is null or _secret is null then
    return new;
  end if;
  perform net.http_post(
    url := _url,
    body := jsonb_build_object('campaign_id', new.campaign_id, 'from_status', new.from_status, 'to_status', new.to_status, 'note', new.note),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', _secret),
    timeout_milliseconds := 5000
  );
  return new;
end $$;

drop trigger if exists campaign_status_events_notify on public.campaign_status_events;
create trigger campaign_status_events_notify after insert on public.campaign_status_events
  for each row execute function private.notify_status_change();
