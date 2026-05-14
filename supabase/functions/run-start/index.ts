// JWS Berlin Rush — run-start
// Issues a server-generated run_id for a starting game. No user auth required.
//
// Security posture:
//   • verify_jwt is disabled (browser uses anon publishable key).
//   • CORS allow-list comes from ALLOWED_ORIGINS env var (comma-separated).
//   • Internal errors are not leaked to the client.

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

async function dbGet(path: string, key: string, url: string) {
    const r = await fetch(`${url}/rest/v1/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`DB GET ${path} ${r.status}: ${t}`);
    return JSON.parse(t);
}

async function dbPost(path: string, body: unknown, key: string, url: string) {
    const r = await fetch(`${url}/rest/v1/${path}`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`DB POST ${path} ${r.status}: ${t}`);
    return JSON.parse(t);
}

Deno.serve(async (req: Request) => {
    const pre = handlePreflight(req, 'POST');
    if (pre) return pre;
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return json(req, { error: 'Invalid JSON body' }, 400);
        }
        const { campaign_id } = body as { campaign_id?: unknown };
        if (!campaign_id || typeof campaign_id !== 'string') {
            return json(req, { error: 'campaign_id required' }, 400);
        }

        const campaigns = await dbGet(
            `campaigns?id=eq.${encodeURIComponent(campaign_id)}&select=id,starts_at,ends_at,is_active`,
            serviceRoleKey,
            supabaseUrl,
        );
        if (!campaigns.length) return json(req, { error: 'Campaign not found' }, 404);
        const campaign = campaigns[0];

        const now = new Date();
        if (
            !campaign.is_active ||
            now < new Date(campaign.starts_at) ||
            now > new Date(campaign.ends_at)
        ) {
            return json(req, { error: 'Campaign is not active' }, 403);
        }

        const runs = await dbPost(
            'game_runs',
            { campaign_id, user_agent: req.headers.get('user-agent') ?? null },
            serviceRoleKey,
            supabaseUrl,
        );
        const run = Array.isArray(runs) ? runs[0] : runs;
        return json(req, {
            run_id: run.id,
            started_at: run.started_at,
            campaign_id: run.campaign_id,
        });
    } catch (e) {
        console.error('[run-start] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
