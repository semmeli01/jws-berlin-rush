# Security Audit & Phase 1 Hardening — JWS Berlin Rush

**Date:** 2026-05-14
**Project:** JWS Berlin Rush — campaign game launching on the oneplus.ch domain
**Audited components:** static frontend, Supabase Edge Functions, Postgres schema, secrets, privacy/legal modals
**Auditor:** Claude Sonnet 4.6 (assisted), reviewed and approved by Yanick Semmler

---

## TL;DR

Pre-launch security audit identified one critical flaw (contact-email hijack via leaderboard `score_id` exposure), three high-severity issues, and several medium/low issues. **All launch-blocking findings are fixed, deployed to production, and verified by 13 integration tests.** Two hardening items (Cloudflare Turnstile and rate-limiting) are deferred to Phase 2 — the risk is acceptable for launch because the closed flaws plus the new CORS lock-down eliminate the realistic attack vectors at launch scale.

**Launch recommendation: Approve for go-live.**

---

## Scope

### What we audited

- Static frontend (`index.html`, `js/*.js`, `style.css`) including modals, localStorage usage, score submit flow, email capture flow
- The four Supabase Edge Functions: `run-start`, `submit-score`, `leaderboard`, `contact-score`
- Postgres schema and RLS policies for `campaigns`, `game_runs`, `scores`
- Secret exposure (the repo, the deployed config files, env vars)
- Privacy/legal modal accuracy vs. actual data flow
- Anti-cheat plausibility against the architecture-recommended setup

### What we did not audit

- Network-layer DDoS protection (Supabase / Cloudflare provider responsibility)
- Browser-side game logic for client-side cheating beyond what the server enforces. This is structurally impossible to prevent fully in a static-frontend game; the mitigation is server-side plausibility checks plus manual prize-winner review.
- GitHub Pages hosting platform (provider security)
- The oneplus.ch host environment where the game will be embedded

---

## Findings & Status

Severity legend:
- **Critical**: prize theft, data exposure, or authentication bypass. Launch blocker.
- **High**: significant abuse vector. Launch blocker unless mitigated.
- **Medium**: limited blast radius or requires effort to exploit. Should fix.
- **Low**: cosmetic, hygiene, or future-proofing.

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| C1 | Critical | Contact-email hijack via leaderboard `score_id` | **Fixed** (PR #24) |
| H1 | High | CORS `*` on all Edge Functions | **Fixed** (PR #24) |
| H2 | High | No rate-limiting | **Fixed** (PR #25, shipped 2026-05-15) |
| H3 | High | Anti-cheat thresholds 7× real top score | **Fixed** (PR #24) |
| M2 | Medium | `run-start` leaked internal errors on 500 | **Fixed** (PR #24) |
| M3 | Medium | Stale internal test campaign `is_active = true` | **Fixed** (SQL 2026-05-14) |
| M4 | Medium | `rls_auto_enable()` callable by anon/authenticated | **Fixed** (SQL 2026-05-14) |
| M5 | Medium | No nickname content filter | **Deferred** (low risk) |
| L1 | Low | Anon JWT in legacy format | Accepted (valid until 2036) |
| L2 | Low | `oneplus-cta` links missing `noreferrer` | Accepted (cosmetic) |
| L3 | Low | Verbose console.log in `leaderboard.js` | Reduced in PR #24 |
| L4 | Low | `obstacle-preview.html` shipped | Accepted (no sensitive content) |
| L5 | Low | Diagnostic length log in `run-start` | Accepted (no values leaked) |

---

## Remediation Details

### C1 — Contact-email hijack via leaderboard `score_id`

**Vulnerability**

The public leaderboard returned the database `score_id` (UUID) for every entry, and `contact-score` accepted that ID alone as proof of ownership. An attacker could harvest a top-10 `score_id` from the public leaderboard JSON, POST to `contact-score` with their own email, and become the registered contact person for someone else's winning score. Once the legitimate player attached their email, they would be blocked by the "email already submitted" check.

**Risk**: Prize theft. The attacker would receive the winning communication and could claim the oneplus year subscription.

**Fix**:
1. `leaderboard` no longer returns `score_id` or any other internal ID. Response shape is now `[{rank, nickname, score, character}]` only.
2. `submit-score` issues a signed HMAC `claim_token` only to the actual submitter when their score lands in the top 50. The token is bound to `{score_id, expires_at}`, signed with a new `CLAIM_SECRET`, and expires after 10 minutes.
3. `contact-score` now requires the `claim_token` in addition to the `score_id` and `email`. The token is verified with a constant-time HMAC check before the email is written. A token signed for score A cannot be used to claim score B.

**Files**: `supabase/functions/submit-score/index.ts`, `supabase/functions/leaderboard/index.ts`, `supabase/functions/contact-score/index.ts`, `js/leaderboard.js`, `js/game.js`.

**Verification**: Tests 3, 5, 7-11 below.

### H1 — CORS allow-list

**Vulnerability**

All four Edge Functions returned `Access-Control-Allow-Origin: *`, allowing any third-party site to weaponize its visitors' browsers against the API for spam, abuse, or scraping.

**Fix**: Allow-list driven by the new `ALLOWED_ORIGINS` secret. Default safe-list includes `https://www.oneplus.ch`, `https://oneplus.ch`, `https://semmeli01.github.io`, and the standard localhost dev ports. Disallowed-origin preflights return 403 with no `Access-Control-Allow-Origin` header. Origins not in the allow-list cannot be weaponized from a third-party browser.

**Files**: All four edge functions.

**Verification**: Tests 1, 2 below.

### H3 — Anti-cheat thresholds

**Vulnerability**

`MAX_PLAUSIBLE_SCORE = 150000` allowed a casual cheater to submit any value up to 7× the real top score (~21 000) without being flagged. Several plausibility checks were missing entirely: character allow-list, level cap, score-per-second cap, server-vs-client duration cross-check.

**Fix** (thresholds calibrated against 360 real submissions during internal testing):

| Constant | Value | Rationale |
|----------|-------|-----------|
| `MAX_PLAUSIBLE_SCORE` | 30 000 | 1.4× observed p99 (~21k) |
| `MIN_DURATION_MS` | 15 000 | Matches observed min (15.7s) |
| `MAX_DURATION_MS` | 1 800 000 | 30 min AFK ceiling |
| `MAX_SCORE_PER_SECOND` | 400 | 1.33× observed peak (~300/s) |
| `MAX_LEVEL_REACHED` | 5 | One above the current `LEVELS.length` (4) for buffer |
| `KNOWN_CHARACTERS` | 14-entry allow-list | Matches `js/characters.js` |
| Server-vs-client duration | ±60 s tolerance | Catches "fake duration" submissions |

Suspicious scores are still persisted (audit trail) but excluded from the leaderboard, do not receive a rank, and are never contact-eligible.

**Files**: `supabase/functions/submit-score/index.ts`.

**Verification**: Test 6 below.

### M2 — `run-start` error leak

`run-start` previously returned `String(e)` as the 500 body, which could leak internal Supabase URLs and REST paths. Now returns generic `{error: 'Internal server error'}` with the real error logged server-side only.

### M3 — Stale internal test campaign

SQL applied 2026-05-14:
```sql
update public.campaigns set is_active = false where id = 'jws-berlin-rush-internal-2026-05';
```
The internal test scores (212 submissions) remain in the database for calibration baseline. They are isolated by `campaign_id` and cannot appear on the public leaderboard.

### M4 — `rls_auto_enable()` execute privilege

SQL applied 2026-05-14:
```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```
The function was a Supabase event-trigger helper, not intended for RPC use. Verified post-fix: `anon.can_execute = false`, `authenticated.can_execute = false`. The service role retains the privilege, with no operational impact (the function only ever runs as part of DDL events).

---

## Test Evidence

All 13 integration tests were run against production immediately after deploy. Test rows were inserted and then cleaned up. The production `scores` table contains only legitimate game submissions.

| # | Test | Expected | Actual | Pass |
|---|------|----------|--------|------|
| 1 | CORS preflight from `http://localhost:8000` | 200 with matching ACAO | 200, `ACAO=http://localhost:8000` | ✓ |
| 2 | CORS preflight from `https://evil.example.com` | 403, no ACAO | 403, no ACAO | ✓ |
| 3 | Leaderboard payload keys | only `{rank, nickname, score, character}` | only `{rank, nickname, score, character}` | ✓ |
| 4 | `run-start` happy path | `run_id` returned | `run_id` returned | ✓ |
| 5 | Eligible `submit-score` (12 500 pts in 32 s) | `claim_token` returned, rank ≤ 50, `suspicious=false` | rank 46, token 112 chars, `suspicious=false` | ✓ |
| 6 | Impossible `submit-score` (999 999 in 1 s, level 99, bad character) | `suspicious=true`, no token, rank null | `suspicious=true`, no token, rank null | ✓ |
| 7 | `contact-score` missing `claim_token` | 400 | 400 | ✓ |
| 8 | `contact-score` wrong signature | 403 | 403 | ✓ |
| 9 | **Hijack**: valid token for score A, applied to score B | 403 | 403 | ✓ |
| 10 | `contact-score` valid token | 200, email saved | 200, `{success: true}`, email saved in DB | ✓ |
| 11 | `contact-score` replay of consumed token | 409 (email already set) | 409 | ✓ |
| 12 | `run-start` for deactivated campaign | 403 | 403 | ✓ |
| 13 | `submit-score` minimal payload (no character, low score) | accepted, low rank | rank 149, not eligible | ✓ |

---

## Deferred Work (Phase 2)

These items were identified in the audit but are not launch-blocking. They are tracked as separate sub-stories under OP-15380.

### Phase 2a — Cloudflare Turnstile on score submit and contact-score

**What**: A small, privacy-friendly bot challenge widget (Cloudflare's reCAPTCHA equivalent, free, no PII collected by Cloudflare).

**Why it can wait**: With C1 fixed and CORS locked down, the realistic attack vector is curl-based spam from a single attacker. The single-submission-per-run constraint, the new anti-cheat suspicious-flag pipeline, and the closed claim-token flow together make this an inefficient attack: it cannot steal prizes, and any junk submissions are filtered from the public leaderboard.

**Trigger to ship**:
- More than 50 suspicious submissions per day in production, or
- Any prize-claim-related abuse pattern detected, or
- Routine hardening 1-2 weeks post-launch

### Phase 2b — Rate-limiting on `run-start`, `submit-score`, `contact-score`, `leaderboard`

**Status update (2026-05-15)**: Shipped via PR #25. Deployed limits per IP-hash per 60-second window:

| Endpoint | Limit | Fail mode |
|----------|-------|-----------|
| `run-start` | 30 / min | fail-closed |
| `submit-score` | 5 / min | fail-closed |
| `contact-score` | 5 / min | fail-closed |
| `leaderboard` | 120 / min | fail-open |

`contact-score` was originally proposed at 2 / min but raised to 5 / min to match `submit-score`: a contact-eligible player who submits multiple scores in a session shouldn't hit a stricter cap on the email step than on the score step. The Phase 1 claim-token binding already prevents email-claim hijacking, so a higher per-IP cap here is acceptable.

**Why it was the right time to ship**: CORS lock-down (Phase 1) blocks browser-side weaponization from third-party sites, but curl/script-based flooding was still possible. Rate-limit caps the attacker's per-IP throughput; the suspicious-flag pipeline filters anything they get through.

### Other deferred items

- **M5 — Nickname content filter**: low risk because nicknames are length-bounded (2-24 chars) by the database CHECK constraint. An offensive nickname can be force-edited via SQL post-hoc within minutes of detection.
- **L1 — Anon JWT rotation**: the current legacy anon key is valid until 2036. Rotating to the new `sb_publishable_…` key format adds defense-in-depth, but is not urgent.
- **L2 — Missing `noreferrer` on oneplus-cta links**: cosmetic referrer leakage to oneplus.ch, no impact.

---

## Residual Risk

After Phase 1, the realistic remaining risks are:

1. **High-volume scripted spam** (Phase 2 rate-limit caps each IP-hash at ≤5 score submits / min). Mitigated by the new per-IP rate-limit, Supabase invocation quotas, and the suspicious-flag filter. Worst case: a distributed botnet across many IPs floods the board with junk nicknames, requiring SQL cleanup. **No prize theft is possible.**
2. **Sophisticated cheating** within the new envelope (a skilled attacker reverse-engineers the game and submits scores within the 30k score / 400-per-second / 15-second-minimum thresholds). Mitigated by the multi-factor plausibility checks. Worst case: a fabricated top-50 entry that's hard to detect automatically. **Action**: manual review of the top-10 contact emails before prize distribution.
3. **Offensive nickname** on the public board. Mitigated by post-hoc SQL edit. The schema CHECK enforces 2-24 character length.

None of these enable prize theft, data exposure, or authentication bypass. All are operationally manageable.

---

## Launch Recommendation

**Approve for go-live.**

- The critical flaw that warranted the audit (C1, contact-email hijack) is closed.
- The supporting high-severity hardening (H1, H3) and the medium items M2-M4 are shipped.
- The remaining items are properly scoped, tracked as Phase 2 sub-stories, and not on the critical path.
- The legal/privacy modal text was verified accurate against the actual data flow.

### Suggested operational practice for launch week

- Daily check of `public.scores` for suspicious submissions and offensive nicknames.
- Before prize distribution: manual review of the top-10 contact emails for plausibility.
- If traffic exceeds the Phase 2 trigger thresholds in the first two weeks, ship Phase 2 (Turnstile + rate-limiting) within one week.

---

## Appendix — References

- **Pull request**: https://github.com/semmeli01/jws-berlin-rush/pull/24 (merged 2026-05-14)
- **Commits in main**: `18d16ad` (security hardening), `8f4da69` (README dev note), `c212cff` (merge)
- **Original audit raw findings**: `PRODUCTION-AUDIT-2026-05-14.txt` in the repo root
- **Supabase project**: `mgavjrtfbpxpqwqtbzmx` (region `eu-central-1`)
- **Edge function deployment versions post-Phase-1**:
  - `run-start` v6
  - `leaderboard` v5
  - `submit-score` v6
  - `contact-score` v6
- **Secrets configured in Supabase Dashboard**:
  - `CLAIM_SECRET` (32-byte HMAC pepper for claim tokens)
  - `ALLOWED_ORIGINS` (comma-separated CORS allow-list)
- **Database changes applied (one-off, via MCP, not stored as migrations)**:
  - M3: `update public.campaigns set is_active = false where id = 'jws-berlin-rush-internal-2026-05';`
  - M4: `revoke execute on function public.rls_auto_enable() from public, anon, authenticated;`

---

## Sign-off

| Role | Name | Date | Signature / Notes |
|------|------|------|-------------------|
| Product Owner | Yanick Semmler |   |   |
| Engineering Manager / Tech Lead |   |   |   |
| Department Head / Director |   |   |   |
| Compliance / Legal (if required) |   |   |   |
