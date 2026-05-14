// JWS Berlin Rush — leaderboard
// Returns the public, sanitized leaderboard for a campaign.
//
// Phase-1 security change:
//   • No score_id / id / run_id / contact_email exposed.
//   • Response shape: [{ rank, nickname, score, character }]

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.oneplus.ch',
    'https://oneplus.ch',
    'https://semmeli01.github.io',
    'http://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
];

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

    try {
        const url = new URL(req.url);
        const campaign_id = url.searchParams.get('campaign_id') ?? 'jws-berlin-rush';
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 100);

        const { data, error } = await adminClient()
            .from('scores')
            .select('nickname, score, character')
            .eq('campaign_id', campaign_id)
            .eq('suspicious', false)
            .order('score', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('[leaderboard] query error:', error);
            return json(req, { error: 'Failed to fetch leaderboard' }, 500);
        }

        const entries = (data ?? []).map((row, i) => ({
            rank: i + 1,
            nickname: row.nickname,
            score: row.score,
            character: row.character,
        }));

        return json(req, entries);
    } catch (e) {
        console.error('[leaderboard] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
