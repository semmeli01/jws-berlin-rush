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
        console.log('[LB] POST', url, JSON.stringify(body));
        const res = await fetch(url, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(body),
        });
        const text = await res.text();
        console.log('[LB] POST', url, '→', res.status, text);
        if (!res.ok) {
            let msg = text;
            try { msg = JSON.parse(text).error || text; } catch (_) {}
            throw new Error(`${res.status}: ${msg}`);
        }
        return JSON.parse(text);
    }

    async _get(path) {
        const url = this._apiUrl + path;
        console.log('[LB] GET', url);
        const res = await fetch(url, { method: 'GET', headers: this._headers() });
        const text = await res.text();
        console.log('[LB] GET', url, '→', res.status, text.slice(0, 200));
        if (!res.ok) throw new Error(`${res.status}: ${text}`);
        return JSON.parse(text);
    }

    /** Called at the start of each game run. */
    async startRun() {
        this.runId = null;
        this.scoreId = null;
        this.rank = null;
        this.contactEligible = false;
        this._runStartTime = Date.now();
        if (!this._available) return;
        try {
            const data = await this._post('/run-start', { campaign_id: this._campaignId });
            this.runId = data.run_id || null;
            console.log('[LB] run started:', this.runId);
        } catch (e) {
            console.warn('[LB] startRun failed:', e.message);
        }
    }

    /**
     * Submit final score.
     * Returns { rank, contactEligible } on success, null if offline, false on hard error.
     */
    async submitScore(payload) {
        if (!this._available) {
            console.log('[LB] Offline mode — skipping score submit.');
            return null;
        }

        // If startRun() failed earlier, retry now before submitting
        if (!this.runId) {
            console.warn('[LB] runId missing — retrying startRun before submit...');
            await this.startRun();
        }
        if (!this.runId) {
            console.error('[LB] runId still null — cannot submit score.');
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
                character: payload.characterId,        // backend field: character
                level_reached: payload.levelsCompleted, // backend field: level_reached
                duration_ms: durationMs,                // backend field: duration_ms
                terms_accepted: true,                   // backend validates this boolean
            });
            this.scoreId = data.score_id || null;
            this.rank = data.rank ?? null;
            this.contactEligible = !!data.contact_eligible;
            console.log('[LB] score submitted — rank:', this.rank, 'eligible:', this.contactEligible);
            return { rank: this.rank, contactEligible: this.contactEligible };
        } catch (e) {
            console.error('[LB] submitScore failed:', e.message);
            return false;
        }
    }

    /** Fetch global leaderboard. Returns [] on failure. */
    async fetchLeaderboard() {
        if (!this._available) return [];
        try {
            const data = await this._get(
                `/leaderboard?campaign_id=${encodeURIComponent(this._campaignId)}&limit=${LEADERBOARD_LIMIT}`
            );
            return Array.isArray(data) ? data : (data.entries || []);
        } catch (e) {
            console.warn('[LB] fetchLeaderboard failed:', e.message);
            return [];
        }
    }

    /** Store contact email for top-ranked players. Returns true on success. */
    async submitEmail(email) {
        if (!this._available || !this.scoreId) {
            console.warn('[LB] submitEmail skipped — not available or no scoreId.');
            return false;
        }
        try {
            await this._post('/contact-score', { score_id: this.scoreId, email });
            console.log('[LB] email stored for score:', this.scoreId);
            return true;
        } catch (e) {
            console.error('[LB] submitEmail failed:', e.message);
            return false;
        }
    }
}
