// JWS Berlin Rush — run-start
// Issues a server-generated run_id for a starting game. No user auth required.
//
// Phase-2 (rate-limiting): per-IP-hash rolling-window cap, fail-closed on storage error.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.oneplus.ch',
    'https://oneplus.ch',
    'https://semmeli01.github.io',
    'http://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
];

const RATE_LIMIT = { limit: 30, windowSeconds: 60 };

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
    const pre = handlePreflight(req, 'POST');
    if (pre) return pre;
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

    const db = adminClient();

    // Rate limit: fail-closed
    const rate = await checkRateLimit(req, db, 'run-start', RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
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
        const { campaign_id } = body as { campaign_id?: unknown };
        if (!campaign_id || typeof campaign_id !== 'string') {
            return json(req, { error: 'campaign_id required' }, 400, rate);
        }

        const { data: campaigns, error: campErr } = await db
            .from('campaigns')
            .select('id, starts_at, ends_at, is_active')
            .eq('id', campaign_id)
            .limit(1);
        if (campErr) throw campErr;
        if (!campaigns || campaigns.length === 0) {
            return json(req, { error: 'Campaign not found' }, 404, rate);
        }
        const campaign = campaigns[0];

        const now = new Date();
        if (
            !campaign.is_active ||
            now < new Date(campaign.starts_at) ||
            now > new Date(campaign.ends_at)
        ) {
            return json(req, { error: 'Campaign is not active' }, 403, rate);
        }

        const { data: run, error: insErr } = await db
            .from('game_runs')
            .insert({ campaign_id, user_agent: req.headers.get('user-agent') ?? null })
            .select('id, started_at, campaign_id')
            .single();
        if (insErr || !run) throw insErr ?? new Error('insert returned no row');

        return json(req, {
            run_id: run.id,
            started_at: run.started_at,
            campaign_id: run.campaign_id,
        }, 200, rate);
    } catch (e) {
        console.error('[run-start] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
