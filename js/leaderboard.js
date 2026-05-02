// =============================================
// JWS: BERLIN RUSH — Leaderboard Service
// Handles all backend API communication
// =============================================

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
        this._available = !!(this._apiUrl && this._anonKey && !this._apiUrl.includes('YOUR_PROJECT'));
        this._runStartTime = null;
    }

    _headers() {
        return {
            'Content-Type': 'application/json',
            'apikey': this._anonKey,
            'Authorization': 'Bearer ' + this._anonKey
        };
    }

    async _post(path, body) {
        const res = await fetch(this._apiUrl + path, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API ${path} ${res.status}: ${text}`);
        }
        return res.json();
    }

    async _get(path) {
        const res = await fetch(this._apiUrl + path, {
            method: 'GET',
            headers: this._headers()
        });
        if (!res.ok) throw new Error(`API ${path} ${res.status}`);
        return res.json();
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
        } catch (e) {
            console.warn('[LB] startRun failed (offline?):', e.message);
        }
    }

    /**
     * Submit final score.
     * @param {object} payload - { nickname, score, characterId, levelsCompleted }
     * @param {string} termsAcceptedAt - ISO timestamp of when terms were accepted
     * @returns {{ rank: number, contactEligible: boolean } | null}
     */
    async submitScore(payload, termsAcceptedAt) {
        if (!this._available || !this.runId) return null;
        const duration = this._runStartTime
            ? Math.round((Date.now() - this._runStartTime) / 1000)
            : null;
        try {
            const data = await this._post('/submit-score', {
                run_id: this.runId,
                campaign_id: this._campaignId,
                nickname: payload.nickname,
                score: payload.score,
                character_id: payload.characterId,
                levels_completed: payload.levelsCompleted,
                duration_seconds: duration,
                terms_accepted_at: termsAcceptedAt,
                terms_version: this._termsVersion
            });
            this.scoreId = data.score_id || null;
            this.rank = data.rank || null;
            this.contactEligible = !!data.contact_eligible;
            return { rank: this.rank, contactEligible: this.contactEligible };
        } catch (e) {
            console.warn('[LB] submitScore failed:', e.message);
            return null;
        }
    }

    /**
     * Fetch global leaderboard.
     * @returns {Array<{ rank, nickname, score, character_id }>}
     */
    async fetchLeaderboard() {
        if (!this._available) return [];
        try {
            const data = await this._get(
                `/leaderboard?campaign_id=${encodeURIComponent(this._campaignId)}&limit=50`
            );
            return Array.isArray(data) ? data : (data.entries || []);
        } catch (e) {
            console.warn('[LB] fetchLeaderboard failed:', e.message);
            return [];
        }
    }

    /**
     * Store optional contact email for top-ranked players.
     * @param {string} email
     */
    async submitEmail(email) {
        if (!this._available || !this.scoreId) return false;
        try {
            await this._post(`/scores/${this.scoreId}/contact`, { email });
            return true;
        } catch (e) {
            console.warn('[LB] submitEmail failed:', e.message);
            return false;
        }
    }
}
