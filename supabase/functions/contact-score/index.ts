// JWS Berlin Rush — contact-score
// Attaches a player-supplied email to a previously submitted, contact-eligible score.
//
// Phase-1 security: requires HMAC claim_token bound to {score_id, expires_at}.
// Phase-2 security: per-IP-hash rolling-window rate limit, fail-closed on storage error.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.oneplus.ch',
    'https://oneplus.ch',
    'https://semmeli01.github.io',
    'http://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
];

const CONTACT_ELIGIBLE_RANK = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = { limit: 2, windowSeconds: 60 };

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

function getClientIp(req: Request): string {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf;
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xreal = req.headers.get('x-real-ip');
    if (xreal) return xreal;
    return 'unknown';
}

async function sha256Hex(s: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface RateInfo {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
    storageOk: boolean;
}

async function checkRateLimit(
    req: Request,
    db: SupabaseClient,
    action: string,
    limit: number,
    windowSeconds: number,
): Promise<RateInfo> {
    const secret = Deno.env.get('RATE_LIMIT_SECRET') ?? '';
    const windowMs = windowSeconds * 1000;
    const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
    const resetAtMs = windowStartMs + windowMs;
    const retryAfter = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));

    if (!secret) {
        console.error('[rate-limit] RATE_LIMIT_SECRET not configured');
        return { allowed: false, limit, remaining: 0, resetAt: resetAtMs, retryAfter, storageOk: false };
    }

    const ip = getClientIp(req);
    const ipHash = await sha256Hex(ip + secret);
    const windowStart = new Date(windowStartMs).toISOString();

    try {
        const { data, error } = await db.rpc('increment_rate_limit', {
            p_ip_hash: ipHash,
            p_action: action,
            p_window_start: windowStart,
        });
        if (error) throw error;
        const count = typeof data === 'number' ? data : Number(data);
        const remaining = Math.max(0, limit - count);
        return {
            allowed: count <= limit,
            limit,
            remaining,
            resetAt: resetAtMs,
            retryAfter,
            storageOk: true,
        };
    } catch (e) {
        console.error('[rate-limit] storage error for', action, ':', e);
        return { allowed: false, limit, remaining: 0, resetAt: resetAtMs, retryAfter, storageOk: false };
    }
}

function rateLimitHeaders(info: RateInfo): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(Math.floor(info.resetAt / 1000)),
    };
}

function tooManyResponse(req: Request, info: RateInfo): Response {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
        'Vary': 'Origin',
        'Content-Type': 'application/json',
        'Retry-After': String(info.retryAfter),
        ...rateLimitHeaders(info),
    };
    if (origin && allowedOrigins().has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
        { status: 429, headers },
    );
}

function json(req: Request, body: unknown, status = 200, rateInfo?: RateInfo): Response {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = {
        'Vary': 'Origin',
        'Content-Type': 'application/json',
    };
    if (origin && allowedOrigins().has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    if (rateInfo) Object.assign(headers, rateLimitHeaders(rateInfo));
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

async function verifyClaimToken(
    token: string,
    expected_score_id: string,
    secret: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!token || typeof token !== 'string') return { ok: false, reason: 'missing' };
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false, reason: 'malformed' };
    const [score_id, expSecStr, sig] = parts;
    if (score_id !== expected_score_id) return { ok: false, reason: 'score_id mismatch' };
    const expSec = parseInt(expSecStr, 10);
    if (!Number.isFinite(expSec) || String(expSec) !== expSecStr) {
        return { ok: false, reason: 'malformed expiry' };
    }
    if (expSec * 1000 < Date.now()) return { ok: false, reason: 'expired' };
    const expectedSig = await hmacHex(`${score_id}.${expSec}`, secret);
    if (expectedSig.length !== sig.length) return { ok: false, reason: 'invalid signature' };
    let diff = 0;
    for (let i = 0; i < expectedSig.length; i++) {
        diff |= expectedSig.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    if (diff !== 0) return { ok: false, reason: 'invalid signature' };
    return { ok: true };
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

    const db = adminClient();

    // Rate limit: fail-closed
    const rate = await checkRateLimit(req, db, 'contact-score', RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
    if (!rate.allowed) {
        if (!rate.storageOk) {
            return json(req, { error: 'Service temporarily unavailable' }, 503);
        }
        return tooManyResponse(req, rate);
    }

    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return json(req, { error: 'Invalid JSON body' }, 400, rate);
        }
        const { score_id, claim_token, email } = body as Record<string, unknown>;

        if (!score_id || typeof score_id !== 'string') {
            return json(req, { error: 'score_id required' }, 400, rate);
        }
        if (!claim_token || typeof claim_token !== 'string') {
            return json(req, { error: 'claim_token required' }, 400, rate);
        }
        if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
            return json(req, { error: 'Valid email required' }, 400, rate);
        }

        const secret = Deno.env.get('CLAIM_SECRET') ?? '';
        if (!secret) {
            console.error('[contact-score] CLAIM_SECRET not configured');
            return json(req, { error: 'Server misconfigured' }, 500);
        }

        const verdict = await verifyClaimToken(claim_token, score_id, secret);
        if (!verdict.ok) {
            console.warn('[contact-score] token reject:', verdict.reason);
            return json(req, { error: 'Invalid or expired claim token' }, 403, rate);
        }

        const { data: score, error: scoreErr } = await db
            .from('scores')
            .select('id, campaign_id, score, suspicious, contact_email')
            .eq('id', score_id)
            .single();
        if (scoreErr || !score) return json(req, { error: 'Score not found' }, 404, rate);
        if (score.suspicious) return json(req, { error: 'Score is not eligible' }, 403, rate);
        if (score.contact_email) {
            return json(req, { error: 'Contact email already submitted' }, 409, rate);
        }

        const { count } = await db
            .from('scores')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', score.campaign_id)
            .eq('suspicious', false)
            .gt('score', score.score);
        const rank = (count ?? 0) + 1;
        if (rank > CONTACT_ELIGIBLE_RANK) {
            return json(req, { error: `Score is not in top ${CONTACT_ELIGIBLE_RANK}` }, 403, rate);
        }

        const { error: upErr } = await db
            .from('scores')
            .update({
                contact_email: email.trim().toLowerCase(),
                contact_consent: true,
                contact_submitted_at: new Date().toISOString(),
            })
            .eq('id', score_id);
        if (upErr) {
            console.error('[contact-score] update error:', upErr);
            return json(req, { error: 'Failed to save contact' }, 500, rate);
        }

        return json(req, { success: true }, 200, rate);
    } catch (e) {
        console.error('[contact-score] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
