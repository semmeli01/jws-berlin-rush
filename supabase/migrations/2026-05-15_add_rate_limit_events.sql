-- Phase 2 (security/phase-2-rate-limiting): per-IP-hash rolling-window rate limiting.
-- The Edge Functions write to this table via the increment_rate_limit() RPC below.
-- No IP addresses are stored: ip_hash = SHA-256(ip || RATE_LIMIT_SECRET) computed in the Edge Function.

create table if not exists public.rate_limit_events (
  id bigserial primary key,
  ip_hash text not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limit_events_count_positive check (count > 0),
  constraint rate_limit_events_unique_window unique (ip_hash, action, window_start)
);

create index if not exists idx_rate_limit_events_lookup
  on public.rate_limit_events (ip_hash, action, window_start);

-- RLS enabled, no policies: only service_role (via Edge Functions) reaches this table.
alter table public.rate_limit_events enable row level security;

-- Atomic upsert+increment. SECURITY INVOKER so it runs as the caller (service_role from
-- Edge Functions); anon/authenticated cannot execute (revoked below).
-- Includes a 1%-of-calls best-effort cleanup of rows older than 24h to bound table growth
-- without requiring a scheduled job.
create or replace function public.increment_rate_limit(
  p_ip_hash text,
  p_action text,
  p_window_start timestamptz
) returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limit_events (ip_hash, action, window_start, count)
  values (p_ip_hash, p_action, p_window_start, 1)
  on conflict (ip_hash, action, window_start)
  do update set count = rate_limit_events.count + 1, updated_at = now()
  returning count into v_count;

  -- Best-effort cleanup, ~1% of calls. Avoids needing pg_cron / scheduled job.
  if random() < 0.01 then
    delete from public.rate_limit_events where window_start < now() - interval '24 hours';
  end if;

  return v_count;
end;
$$;

revoke execute on function public.increment_rate_limit(text, text, timestamptz)
  from public, anon, authenticated;

grant execute on function public.increment_rate_limit(text, text, timestamptz)
  to service_role;

-- Manual cleanup (if best-effort isn't enough at scale):
--   delete from public.rate_limit_events where window_start < now() - interval '24 hours';
