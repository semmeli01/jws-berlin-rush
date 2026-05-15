// =============================================
// JWS: BERLIN RUSH — Leaderboard Service
// Copyright © 2026 Yanick Semmler. All rights reserved.
// Game created by Yanick Semmler.
// Publicly visible, not open source.
// =============================================

const LEADERBOARD_LIMIT = 100;

class LeaderboardService {
    constructor(config) {
        this._apiUrl = (config && config.apiUrl) || '';
        this._anonKey = (config && config.anonKey) || '';
        this._campaignId = (config && config.campaignId) || 'jws-berlin-rush';
        this._termsVersion = (config && config.termsVersion) || 'v1';
        this.runId = null;
        this.scoreId = null;
        this.rank = null;
        this.contactEligible = false;
        this.claimToken = null;
        this.claimExpiresAt = null;
        // Error codes surfaced to the UI:
        //   'rateLimit' = server returned 429
        //   'token'     = claim_token rejected / expired
        //   'network'   = any other failure
        this.lastSubmitErrorCode = null;
        this.lastEmailErrorCode = null;
        this._available = !!(
            this._apiUrl &&
            this._anonKey &&
            !this._apiUrl.includes('YOUR_PROJECT')
        );
        this._runStartTime = null;

        if (!this._available) {
            console.warn('[LB] Backend not configured — running in offline mode.');
        }
    }

    _headers() {
        return {
            'Content-Type': 'application/json',
            'apikey': this._anonKey,
            'Authorization': 'Bearer ' + this._anonKey,
        };
    }

    async _post(path, body) {
        const url = this._apiUrl + path;
        const res = await fetch(url, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok) {
            let msg = text;
            try { msg = JSON.parse(text).error || text; } catch (_) {}
            const err = new Error(`${res.status}: ${msg}`);
            err.status = res.status;
            err.body = msg;
            throw err;
        }
        return JSON.parse(text);
    }

    async _get(path) {
        const url = this._apiUrl + path;
        const res = await fetch(url, { method: 'GET', headers: this._headers() });
        const text = await res.text();
        if (!res.ok) {
            const err = new Error(`${res.status}: ${text}`);
            err.status = res.status;
            throw err;
        }
        return JSON.parse(text);
    }

    /** Called at the start of each game run. */
    async startRun() {
        this.runId = null;
        this.scoreId = null;
        this.rank = null;
        this.contactEligible = false;
        this.claimToken = null;
        this.claimExpiresAt = null;
        this.lastSubmitErrorCode = null;
        this.lastEmailErrorCode = null;
        this._runStartTime = Date.now();
        this._runStartStatus = null;
        if (!this._available) return;
        try {
            const data = await this._post('/run-start', { campaign_id: this._campaignId });
            this.runId = data.run_id || null;
        } catch (e) {
            console.warn('[LB] startRun failed:', e.status || '', e.message);
            this._runStartStatus = e.status || null;
        }
    }

    /**
     * Submit final score.
     * Returns { rank, contactEligible } on success, null if offline, false on hard error.
     */
    async submitScore(payload) {
        this.lastSubmitErrorCode = null;
        if (!this._available) {
            return null;
        }

        if (!this.runId) {
            console.warn('[LB] runId missing — retrying startRun before submit...');
            await this.startRun();
        }
        if (!this.runId) {
            console.error('[LB] runId still null — cannot submit score.');
            this.lastSubmitErrorCode = (this._runStartStatus === 429) ? 'rateLimit' : 'network';
            return false;
        }

        const durationMs = this._runStartTime
            ? Math.round(Date.now() - this._runStartTime)
            : null;

        try {
            const data = await this._post('/submit-score', {
                run_id: this.runId,
                nickname: payload.nickname,
                score: payload.score,
                character: payload.characterId,
                level_reached: payload.levelsCompleted,
                duration_ms: durationMs,
                terms_accepted: true,
            });
            this.scoreId = data.score_id || null;
            this.rank = data.rank ?? null;
            this.contactEligible = !!data.contact_eligible;
            this.claimToken = data.claim_token || null;
            this.claimExpiresAt = data.claim_expires_at || null;
            return { rank: this.rank, contactEligible: this.contactEligible };
        } catch (e) {
            console.error('[LB] submitScore failed:', e.status || '', e.message);
            this.lastSubmitErrorCode = (e.status === 429) ? 'rateLimit' : 'network';
            return false;
        }
    }

    /** Fetch global leaderboard. Returns [] on failure (incl. rate-limit — silent). */
    async fetchLeaderboard() {
        if (!this._available) return [];
        try {
            const data = await this._get(
                `/leaderboard?campaign_id=${encodeURIComponent(this._campaignId)}&limit=${LEADERBOARD_LIMIT}`
            );
            return Array.isArray(data) ? data : (data.entries || []);
        } catch (e) {
            console.warn('[LB] fetchLeaderboard failed:', e.status || '', e.message);
            return [];
        }
    }

    /**
     * Store contact email for top-ranked players.
     * Returns true on success, false on failure.
     * Sets lastEmailErrorCode to 'token' | 'rateLimit' | 'network' on failure.
     */
    async submitEmail(email) {
        this.lastEmailErrorCode = null;
        if (!this._available || !this.scoreId) {
            console.warn('[LB] submitEmail skipped — not available or no scoreId.');
            this.lastEmailErrorCode = 'network';
            return false;
        }
        if (!this.claimToken) {
            console.warn('[LB] submitEmail skipped — no claim token.');
            this.lastEmailErrorCode = 'token';
            return false;
        }
        if (this.claimExpiresAt && new Date(this.claimExpiresAt).getTime() < Date.now()) {
            console.warn('[LB] submitEmail skipped — claim token expired.');
            this.lastEmailErrorCode = 'token';
            return false;
        }
        try {
            await this._post('/contact-score', {
                score_id: this.scoreId,
                claim_token: this.claimToken,
                email,
            });
            return true;
        } catch (e) {
            console.error('[LB] submitEmail failed:', e.status || '', e.message);
            if (e.status === 429) {
                this.lastEmailErrorCode = 'rateLimit';
            } else if (e.status === 403 || e.status === 401) {
                this.lastEmailErrorCode = 'token';
            } else {
                this.lastEmailErrorCode = 'network';
            }
            return false;
        }
    }
}
