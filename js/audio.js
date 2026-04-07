// =============================================
// JWS: BERLIN RUSH — Audio Engine
// Web Audio API chiptune + SFX
// =============================================

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this.musicPlaying = false;
        this._musicScheduler = null;
        this._nextBeatTime = 0;
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
                return;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ---- Internal helpers ----

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
        // Ascending fanfare
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

    startMusic(levelId) {
        if (!this.enabled || !this.ctx) return;
        this.stopMusic();
        this.musicPlaying = true;
        this._scheduleBgMusic(levelId);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this._musicScheduler) {
            clearTimeout(this._musicScheduler);
            this._musicScheduler = null;
        }
    }

    _scheduleBgMusic(levelId) {
        if (!this.musicPlaying || !this.ctx) return;

        // 8-bit BGM patterns (notes in Hz)
        // Each level has a distinct melody & tempo
        const tracks = {
            1: {
                bpm: 130,
                melody: [262, 330, 392, 349, 330, 294, 262, 0, 262, 330, 392, 440, 392, 349, 330, 0],
                bass:   [131, 131, 196, 175, 165, 147, 131, 0, 131, 131, 196, 220, 196, 175, 165, 0],
                perc: true
            },
            2: {
                bpm: 148,
                melody: [349, 440, 523, 494, 440, 392, 349, 0, 349, 392, 440, 494, 523, 587, 523, 0],
                bass:   [175, 220, 262, 247, 220, 196, 175, 0, 175, 196, 220, 247, 262, 294, 262, 0],
                perc: true
            },
            3: {
                bpm: 158,
                melody: [440, 554, 659, 622, 554, 494, 440, 0, 494, 587, 698, 659, 587, 523, 494, 0],
                bass:   [220, 277, 330, 311, 277, 247, 220, 0, 247, 294, 349, 330, 294, 262, 247, 0],
                perc: true
            },
            4: {
                bpm: 172,
                melody: [523, 659, 784, 740, 659, 587, 523, 0, 587, 698, 831, 784, 698, 622, 587, 0],
                bass:   [262, 330, 392, 370, 330, 294, 262, 0, 294, 349, 415, 392, 349, 311, 294, 0],
                perc: true
            }
        };

        const track = tracks[levelId] || tracks[1];
        const beatDur = 60 / track.bpm;
        const barDur = beatDur * track.melody.length;

        let beatIndex = 0;

        const scheduleBeat = () => {
            if (!this.musicPlaying || !this.ctx) return;

            const now = this.ctx.currentTime;
            // Schedule a small window ahead
            const scheduleUntil = now + 0.3;

            while (this._nextBeatTime < scheduleUntil) {
                const t = this._nextBeatTime - now;
                const i = beatIndex % track.melody.length;

                // Melody
                if (track.melody[i] > 0) {
                    this._note(track.melody[i], beatDur * 0.75, 'square', 0.07, t < 0 ? 0 : t);
                }
                // Bass
                if (track.bass[i] > 0) {
                    this._note(track.bass[i], beatDur * 0.5, 'square', 0.05, t < 0 ? 0 : t);
                }
                // Percussion (hi-hat on every beat, kick on 0 & 8)
                if (track.perc) {
                    // Hi-hat: noise burst
                    this._noiseHat(beatDur * 0.04, 0.04, t < 0 ? 0 : t);
                    if (i === 0 || i === 8) {
                        // Kick
                        this._kick(beatDur * 0.1, 0.15, t < 0 ? 0 : t);
                    }
                    if (i === 4 || i === 12) {
                        // Snare
                        this._snare(beatDur * 0.06, 0.1, t < 0 ? 0 : t);
                    }
                }

                this._nextBeatTime += beatDur;
                beatIndex++;
            }

            this._musicScheduler = setTimeout(scheduleBeat, 100);
        };

        this._nextBeatTime = this.ctx.currentTime + 0.05;
        scheduleBeat();
    }

    _noiseHat(dur, vol, when) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const t = now + (when || 0);

        const bufSize = this.ctx.sampleRate * dur;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.linearRampToValueAtTime(0, t + dur);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        src.start(t);
        src.stop(t + dur + 0.01);
    }

    _kick(dur, vol, when) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const t = now + (when || 0);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + dur);

        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.01);
    }

    _snare(dur, vol, when) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const t = now + (when || 0);

        const bufSize = Math.ceil(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.linearRampToValueAtTime(0, t + dur);

        src.connect(gain);
        gain.connect(this.masterGain);
        src.start(t);
        src.stop(t + dur + 0.01);
    }
}
