// JWS Berlin Rush — submit-score
// Persists a single score for a completed game run.
//
// Phase-1 security changes:
//   • Tightened anti-cheat thresholds (real top score is ~21k, was 150k).
//   • Server cross-checks duration_ms vs (now - run.started_at).
//   • Character allow-list, level cap, integer score, score-per-second cap.
//   • Suspicious scores keep being persisted (audit trail) but are excluded
//     from leaderboard, rank, and contact eligibility.
//   • Eligible scores are returned with a signed HMAC `claim_token` so the
//     player can later attach their email via `contact-score`. The token is
//     bound to {score_id, expires_at} and signed with CLAIM_SECRET.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.oneplus.ch',
    'https://oneplus.ch',
    'https://semmeli01.github.io',
    'http://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
];

const MAX_PLAUSIBLE_SCORE = 30000;
const MIN_DURATION_MS = 15000;
const MAX_DURATION_MS = 1800000;
const MAX_SCORE_PER_SECOND = 400;
const MAX_LEVEL_REACHED = 5;
const CONTACT_ELIGIBLE_RANK = 50;
const CLAIM_TTL_MS = 10 * 60 * 1000;
const SERVER_DURATION_TOLERANCE_MS = 60 * 1000;

const KNOWN_CHARACTERS = new Set([
    'diego', 'nils', 'anastasia', 'eric', 'timmo', 'alexander', 'martha',
    'lia', 'jamie', 'shinara', 'alina', 'erica', 'sandro', 'ermioni',
]);

function allowedOrigins(): Set<string> {
    const env = Deno.env.get('ALLOWED_ORIGINS') ?? '';
    const list = env.split(',').map((s) => s.trim()).filter(Boolean);
    return new Set(list.length > 0 ? list : DEFAULT_ALLOWED_ORIGINS);
}

function corsHeaders(req: Request, methods: string): Record<string, string> {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
        'Vary': 'Origin',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': methods + ', OPTIONS',
    };
    if (origin && allowedOrigins().has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

function handlePreflight(req: Request, methods: string): Response | null {
    if (req.method !== 'OPTIONS') return null;
    const origin = req.headers.get('origin');
    if (origin && !allowedOrigins().has(origin)) {
        return new Response('Origin not allowed', { status: 403 });
    }
    return new Response('ok', { headers: corsHeaders(req, methods) });
}

function json(req: Request, body: unknown, status = 200): Response {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
        'Vary': 'Origin',
        'Content-Type': 'application/json',
    };
    if (origin && allowedOrigins().has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return new Response(JSON.stringify(body), { status, headers });
}

async function hmacHex(message: string, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Token payload uses Unix-seconds for the expiry so the `.` delimiter never
// collides with the `.` inside an ISO-8601 millisecond fragment. The response
// to the browser still includes a human-readable ISO `claim_expires_at`.
async function issueClaimToken(score_id: string): Promise<{ token: string; expires_at_iso: string }> {
    const secret = Deno.env.get('CLAIM_SECRET') ?? '';
    if (!secret) throw new Error('CLAIM_SECRET not configured');
    const expSec = Math.floor((Date.now() + CLAIM_TTL_MS) / 1000);
    const sig = await hmacHex(`${score_id}.${expSec}`, secret);
    return {
        token: `${score_id}.${expSec}.${sig}`,
        expires_at_iso: new Date(expSec * 1000).toISOString(),
    };
}

function adminClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
    );
}

Deno.serve(async (req: Request) => {
    const pre = handlePreflight(req, 'POST');
    if (pre) return pre;
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return json(req, { error: 'Invalid JSON body' }, 400);
        }

        const {
            run_id,
            nickname,
            score,
            character,
            duration_ms,
            level_reached,
            terms_accepted,
        } = body as Record<string, unknown>;

        if (!run_id || typeof run_id !== 'string') {
            return json(req, { error: 'run_id required' }, 400);
        }
        if (!nickname || typeof nickname !== 'string') {
            return json(req, { error: 'nickname required' }, 400);
        }
        const nick = nickname.trim();
        if (nick.length < 2 || nick.length > 24) {
            return json(req, { error: 'Nickname must be 2–24 characters' }, 400);
        }
        if (typeof score !== 'number' || !Number.isFinite(score) || !Number.isInteger(score) || score < 0) {
            return json(req, { error: 'score must be a non-negative integer' }, 400);
        }
        if (duration_ms != null && (typeof duration_ms !== 'number' || !Number.isFinite(duration_ms))) {
            return json(req, { error: 'duration_ms must be a number' }, 400);
        }
        if (level_reached != null && (typeof level_reached !== 'number' || !Number.isInteger(level_reached))) {
            return json(req, { error: 'level_reached must be an integer' }, 400);
        }
        if (character != null && typeof character !== 'string') {
            return json(req, { error: 'character must be a string' }, 400);
        }
        if (!terms_accepted) {
            return json(req, { error: 'terms_accepted required' }, 400);
        }

        const db = adminClient();

        const { data: run, error: runErr } = await db
            .from('game_runs')
            .select('id, campaign_id, started_at, submitted_at, campaigns(starts_at, ends_at, is_active, terms_version)')
            .eq('id', run_id)
            .single();
        if (runErr || !run) return json(req, { error: 'Run not found' }, 404);
        if (run.submitted_at) {
            return json(req, { error: 'Score already submitted for this run' }, 409);
        }

        const campaign = (run as { campaigns: { starts_at: string; ends_at: string; is_active: boolean; terms_version: string } }).campaigns;
        const now = new Date();
        if (
            !campaign.is_active ||
            now < new Date(campaign.starts_at) ||
            now > new Date(campaign.ends_at)
        ) {
            return json(req, { error: 'Campaign is not active' }, 403);
        }

        // Plausibility checks — flag, don't reject (audit trail matters)
        let suspicious = false;
        const reasons: string[] = [];

        if (score > MAX_PLAUSIBLE_SCORE) {
            suspicious = true;
            reasons.push(`score ${score} > max ${MAX_PLAUSIBLE_SCORE}`);
        }
        if (typeof duration_ms === 'number') {
            if (duration_ms < MIN_DURATION_MS) {
                suspicious = true;
                reasons.push(`duration ${duration_ms}ms < min ${MIN_DURATION_MS}ms`);
            }
            if (duration_ms > MAX_DURATION_MS) {
                suspicious = true;
                reasons.push(`duration ${duration_ms}ms > max ${MAX_DURATION_MS}ms`);
            }
            const sps = score / Math.max(1, duration_ms / 1000);
            if (sps > MAX_SCORE_PER_SECOND) {
                suspicious = true;
                reasons.push(`score-per-second ${sps.toFixed(1)} > max ${MAX_SCORE_PER_SECOND}`);
            }
            const serverDurationMs = now.getTime() - new Date(run.started_at).getTime();
            if (Math.abs(serverDurationMs - duration_ms) > SERVER_DURATION_TOLERANCE_MS) {
                suspicious = true;
                reasons.push(
                    `client/server duration mismatch (client=${duration_ms}ms server=${serverDurationMs}ms)`,
                );
            }
        }
        if (typeof level_reached === 'number' && (level_reached < 0 || level_reached > MAX_LEVEL_REACHED)) {
            suspicious = true;
            reasons.push(`level_reached ${level_reached} outside [0, ${MAX_LEVEL_REACHED}]`);
        }
        if (character && !KNOWN_CHARACTERS.has(character as string)) {
            suspicious = true;
            reasons.push(`character "${character}" not in known set`);
        }

        const suspicious_reason = suspicious ? reasons.join('; ').slice(0, 300) : null;

        const { data: scoreRow, error: scoreErr } = await db
            .from('scores')
            .insert({
                campaign_id: run.campaign_id,
                run_id,
                nickname: nick,
                score,
                character: typeof character === 'string' ? character : null,
                duration_ms: typeof duration_ms === 'number' ? duration_ms : null,
                level_reached: typeof level_reached === 'number' ? level_reached : null,
                terms_accepted_at: new Date().toISOString(),
                terms_version: campaign.terms_version,
                suspicious,
                suspicious_reason,
            })
            .select('id')
            .single();

        if (scoreErr || !scoreRow) {
            const code = (scoreErr as { code?: string } | null)?.code;
            if (code === '23505') {
                return json(req, { error: 'Score already submitted for this run' }, 409);
            }
            console.error('[submit-score] insert error:', scoreErr);
            return json(req, { error: 'Failed to save score' }, 500);
        }

        await db
            .from('game_runs')
            .update({ submitted_at: new Date().toISOString() })
            .eq('id', run_id);

        let rank: number | null = null;
        let contact_eligible = false;
        let claim_token: string | null = null;
        let claim_expires_at: string | null = null;

        if (!suspicious) {
            const { count } = await db
                .from('scores')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', run.campaign_id)
                .eq('suspicious', false)
                .gt('score', score);
            rank = (count ?? 0) + 1;
            contact_eligible = rank <= CONTACT_ELIGIBLE_RANK;

            if (contact_eligible) {
                try {
                    const issued = await issueClaimToken(scoreRow.id);
                    claim_token = issued.token;
                    claim_expires_at = issued.expires_at_iso;
                } catch (e) {
                    console.error('[submit-score] claim token issue failed:', e);
                    // Score is still saved; player cannot register an email this run.
                    contact_eligible = false;
                }
            }
        }

        const response: Record<string, unknown> = {
            score_id: scoreRow.id,
            rank,
            contact_eligible,
            suspicious,
        };
        if (claim_token) response.claim_token = claim_token;
        if (claim_expires_at) response.claim_expires_at = claim_expires_at;

        return json(req, response);
    } catch (e) {
        console.error('[submit-score] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
