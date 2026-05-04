-- =============================================
-- JWS Berlin Rush — Internal Test Campaign Setup
-- Campaign row already applied and active (2026-05-04).
-- starts_at set to now()-1h so campaign is immediately testable;
-- update it to '2026-05-05 00:00:00+02' before the real test week.
-- =============================================

-- Create / update campaign row (safe to re-run)
insert into public.campaigns (id, name, starts_at, ends_at, terms_version, is_active)
values (
  'jws-berlin-rush-internal-2026-05',
  'JWS Berlin Rush Internal Test May 2026',
  now() - interval '1 hour',   -- set to '2026-05-05 00:00:00+02' for real launch
  '2026-05-12 23:59:59+02',
  'internal-v1',
  true
)
on conflict (id) do update set
  name          = excluded.name,
  starts_at     = excluded.starts_at,
  ends_at       = excluded.ends_at,
  terms_version = excluded.terms_version,
  is_active     = excluded.is_active;

-- To reset starts_at for real test week:
-- update public.campaigns set starts_at = '2026-05-05 00:00:00+02'
-- where id = 'jws-berlin-rush-internal-2026-05';


-- =============================================
-- Admin helpers — internal test campaign
-- =============================================

-- Count submitted scores
select count(*)
from public.scores
where campaign_id = 'jws-berlin-rush-internal-2026-05';

-- Top 100 leaderboard
select
  row_number() over (order by score desc, created_at asc) as rank,
  nickname,
  score,
  character,
  contact_email,
  created_at
from public.scores
where campaign_id = 'jws-berlin-rush-internal-2026-05'
  and suspicious = false
order by score desc, created_at asc
limit 100;

-- Winner (rank 1)
select
  nickname,
  score,
  character,
  contact_email,
  created_at
from public.scores
where campaign_id = 'jws-berlin-rush-internal-2026-05'
  and suspicious = false
order by score desc, created_at asc
limit 1;

-- All scores including suspicious (audit view)
select
  row_number() over (order by score desc, created_at asc) as rank,
  nickname,
  score,
  character,
  suspicious,
  suspicious_reason,
  contact_email,
  created_at
from public.scores
where campaign_id = 'jws-berlin-rush-internal-2026-05'
order by score desc, created_at asc;
