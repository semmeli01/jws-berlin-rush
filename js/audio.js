// =============================================
// JWS: BERLIN RUSH — Audio Engine
// Web Audio API SFX + HTML Audio for BGM
// =============================================

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this._currentLevelId = null;

        // Background song (HTML Audio — reliable MP3 looping)
        this._bgAudio = null;
        this._bgTargetVol = 0; // tracks desired volume while enabled
    }

    /** Must be called after a user gesture (browser autoplay policy) */
    resume() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {
                this.enabled = false;
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();

        // Start background song at 50% on first user interaction
        if (!this._bgAudio) {
            this._bgAudio = new Audio('jws-song-8bit/jws-song-8bit-loop-short.mp3');
            this._bgAudio.loop = true;
            this._bgTargetVol = 0.15;
            this._bgAudio.volume = this.enabled ? 0.15 : 0;
            this._bgAudio.play().catch(() => {});
        }
    }

    // ---- Internal SFX helpers ----

    _note(freq, dur, type = 'square', vol = 0.12, when = 0) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const t = now + when;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.008);
        gain.gain.setValueAtTime(vol, t + dur * 0.7);
        gain.gain.linearRampToValueAtTime(0, t + dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    _chord(freqs, dur, type = 'square', vol = 0.08, when = 0) {
        freqs.forEach(f => this._note(f, dur, type, vol, when));
    }

    // ---- SFX ----

    playJump() {
        this._note(330, 0.04, 'square', 0.15);
        this._note(494, 0.07, 'square', 0.12, 0.04);
    }

    playDoubleJump() {
        this._note(440, 0.03, 'square', 0.12);
        this._note(587, 0.04, 'square', 0.12, 0.04);
        this._note(784, 0.07, 'square', 0.14, 0.08);
    }

    playCollectShot() {
        this._note(523, 0.05, 'square', 0.14);
        this._note(659, 0.05, 'square', 0.14, 0.05);
        this._note(784, 0.08, 'square', 0.14, 0.10);
    }

    playCollectHeart() {
        this._note(440, 0.06, 'square', 0.16);
        this._note(660, 0.10, 'square', 0.14, 0.07);
    }

    playCollectStar() {
        for (let i = 0; i < 5; i++) {
            this._note(523 + i * 100, 0.06, 'square', 0.12, i * 0.05);
        }
    }

    playCollectOneplus() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => this._note(f, 0.12, 'square', 0.15, i * 0.08));
        this._chord([523, 659, 784], 0.25, 'square', 0.1, 0.32);
    }

    playHit() {
        this._note(180, 0.06, 'sawtooth', 0.25);
        this._note(130, 0.10, 'sawtooth', 0.20, 0.06);
        this._note(100, 0.12, 'sawtooth', 0.15, 0.16);
    }

    playShield() {
        this._note(880, 0.04, 'square', 0.18);
        this._note(1047, 0.08, 'square', 0.15, 0.05);
    }

    playGameOver() {
        const melody = [523, 440, 349, 330, 262];
        melody.forEach((f, i) => this._note(f, 0.22, 'square', 0.18, i * 0.24));
    }

    playLevelComplete() {
        const melody = [523, 587, 659, 698, 784, 880, 988, 1047];
        melody.forEach((f, i) => this._note(f, 0.10, 'square', 0.15, i * 0.09));
        this._chord([523, 659, 784, 1047], 0.5, 'square', 0.12, melody.length * 0.09 + 0.05);
    }

    playPowerUp() {
        for (let i = 0; i < 7; i++) {
            this._note(330 + i * 70, 0.05, 'square', 0.14, i * 0.05);
        }
    }

    playMagnetPulse() {
        this._note(660, 0.03, 'triangle', 0.1);
    }

    // ---- Background Music ----

    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.enabled ? 0.6 : 0, this.ctx.currentTime);
        }
        if (this._bgAudio) {
            this._bgAudio.muted = !this.enabled;
        }
    }

    /** Called when entering gameplay — full volume */
    startMusic(levelId) {
        this._currentLevelId = levelId;
        if (!this._bgAudio) return;
        this._bgTargetVol = 0.3;
        if (this.enabled) this._bgAudio.volume = 0.3;
    }

    /** Called on game over / level complete / quit — ambient volume */
    stopMusic() {
        if (!this._bgAudio) return;
        this._bgTargetVol = 0.15;
        if (this.enabled) this._bgAudio.volume = 0.15;
    }
}
