// JWS Berlin Rush — leaderboard
// Returns the public, sanitized leaderboard for a campaign.
//
// Phase-1 security: no score_id / id / contact_email exposed.
// Phase-2 security: per-IP-hash rate limit (120/min). Fail-OPEN on storage error so
// a transient DB issue doesn't break the public game's leaderboard display.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.oneplus.ch',
    'https://oneplus.ch',
    'https://semmeli01.github.io',
    'http://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
];

const RATE_LIMIT = { limit: 120, windowSeconds: 60 };

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

function adminClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
    );
}

Deno.serve(async (req: Request) => {
    const pre = handlePreflight(req, 'GET');
    if (pre) return pre;
    if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405);

    const db = adminClient();

    // Rate limit: fail-OPEN. If storage check fails, still serve the leaderboard.
    // If the user is over the limit (and storage worked), block.
    const rate = await checkRateLimit(req, db, 'leaderboard', RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
    if (!rate.allowed && rate.storageOk) {
        return tooManyResponse(req, rate);
    }

    try {
        const url = new URL(req.url);
        const campaign_id = url.searchParams.get('campaign_id') ?? 'jws-berlin-rush';
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 100);

        const { data, error } = await db
            .from('scores')
            .select('nickname, score, character')
            .eq('campaign_id', campaign_id)
            .eq('suspicious', false)
            .order('score', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('[leaderboard] query error:', error);
            return json(req, { error: 'Failed to fetch leaderboard' }, 500, rate);
        }

        const entries = (data ?? []).map((row, i) => ({
            rank: i + 1,
            nickname: row.nickname,
            score: row.score,
            character: row.character,
        }));

        return json(req, entries, 200, rate);
    } catch (e) {
        console.error('[leaderboard] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
