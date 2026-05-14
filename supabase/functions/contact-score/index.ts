// JWS Berlin Rush — contact-score
// Attaches a player-supplied email to a previously submitted, contact-eligible
// score. Phase-1 security: requires a `claim_token` issued by submit-score.
//
// Token format: `${score_id}.${expires_at_unix_seconds}.${hmac_sha256_hex}`
//   signed with CLAIM_SECRET, payload = `${score_id}.${expires_at_unix_seconds}`.
// Unix-seconds is used (not ISO) so the `.` delimiter never collides with the
// `.` inside an ISO millisecond fragment.
// Token is bound to a specific score_id and expires after 10 minutes.
// Replay is bounded by the one-time `contact_email already set` check.

import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    // Constant-time compare
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

    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return json(req, { error: 'Invalid JSON body' }, 400);
        }
        const { score_id, claim_token, email } = body as Record<string, unknown>;

        if (!score_id || typeof score_id !== 'string') {
            return json(req, { error: 'score_id required' }, 400);
        }
        if (!claim_token || typeof claim_token !== 'string') {
            return json(req, { error: 'claim_token required' }, 400);
        }
        if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
            return json(req, { error: 'Valid email required' }, 400);
        }

        const secret = Deno.env.get('CLAIM_SECRET') ?? '';
        if (!secret) {
            console.error('[contact-score] CLAIM_SECRET not configured');
            return json(req, { error: 'Server misconfigured' }, 500);
        }

        const verdict = await verifyClaimToken(claim_token, score_id, secret);
        if (!verdict.ok) {
            console.warn('[contact-score] token reject:', verdict.reason);
            return json(req, { error: 'Invalid or expired claim token' }, 403);
        }

        const db = adminClient();

        const { data: score, error: scoreErr } = await db
            .from('scores')
            .select('id, campaign_id, score, suspicious, contact_email')
            .eq('id', score_id)
            .single();
        if (scoreErr || !score) return json(req, { error: 'Score not found' }, 404);
        if (score.suspicious) return json(req, { error: 'Score is not eligible' }, 403);
        if (score.contact_email) {
            return json(req, { error: 'Contact email already submitted' }, 409);
        }

        const { count } = await db
            .from('scores')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', score.campaign_id)
            .eq('suspicious', false)
            .gt('score', score.score);
        const rank = (count ?? 0) + 1;
        if (rank > CONTACT_ELIGIBLE_RANK) {
            return json(req, { error: `Score is not in top ${CONTACT_ELIGIBLE_RANK}` }, 403);
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
            return json(req, { error: 'Failed to save contact' }, 500);
        }

        return json(req, { success: true });
    } catch (e) {
        console.error('[contact-score] error:', e);
        return json(req, { error: 'Internal server error' }, 500);
    }
});
