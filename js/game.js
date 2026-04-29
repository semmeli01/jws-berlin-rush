// =============================================
// JWS: BERLIN RUSH — Main Game Engine
// =============================================


// Canvas logical size (landscape, desktop-first 16:9)
const W = 960;
const H = 540;

// Physics
const GRAVITY = 2000;
const JUMP_V = -720;
const PLAYER_X = 80;
const PLAYER_W = 40;
const PLAYER_H_STAND = 74;
const PLAYER_H_DUCK = 42;

// State enum
const S = {
    START: 0, CHAR_SELECT: 1, LEVEL_INTRO: 2,
    PLAYING: 3, PAUSED: 4, GAME_OVER: 5, WIN: 6, NAME_INPUT: 7
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.renderer = new Renderer(this.ctx, W, H);

        this._resizeCanvas();
        window.addEventListener('resize', () => {
            this._resizeCanvas();
            if (this.state === S.CHAR_SELECT) this._resizeCharGrid();
        });

        this.audio = new AudioEngine();
        this.input = new InputManager(this.canvas);

        // Game state
        this.state = S.START;
        this.char = null;        // selected character
        this.playerName = '';    // entered player name
        this.lvlIdx = 0;         // current level index
        this.score = 0;
        this.lives = 3;
        this.multi = 1;          // score multiplier
        this.shieldActive = false;
        this.vipStickers = 0;
        this.bossActive = false;
        this.bossDefeated = false;
        this.boss = null;
        this.bossProjectiles = [];

        // Player
        this.player = null;

        // Entity pools
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];     // bg particles
        this.fxParticles = [];   // score popups

        // Timers
        this.obsTimer = 0;
        this.colTimer = 0;
        this.scrollX = 0;
        this.scrollSpeed = 0;
        this.levelDist = 0;

        // Timing
        this.lastT = 0;
        this.introTimer = 0;

        // Debug: rolling frame log (last 120 frames)
        this._dbg = [];
        window.g = this; // expose game to console: g.player, g.input, glog()
        window.glog = () => {
            const rows = this._dbg.slice(-30).map(f =>
                `t=${f.t.toFixed(3)}s  dt=${f.dt.toFixed(4)}  state=${f.ps}  hurt=${f.hurt.toFixed(2)}  duck=${f.duck ? 1 : 0}  keys=[${f.keys}]  frame=${f.frame}`
            ).join('\n');
            console.log('--- last frames ---\n' + rows);
            return this._dbg.slice(-30);
        };

        this._setupUI();
        requestAnimationFrame(t => this._loop(t));
    }

    _resizeCanvas() {
        const ratio = W / H;
        let cw = window.innerWidth;
        let ch = window.innerHeight;
        if (cw / ch > ratio) { cw = ch * ratio; } else { ch = cw / ratio; }
        this.canvas.width = W;
        this.canvas.height = H;
        this.canvas.style.width = cw + 'px';
        this.canvas.style.height = ch + 'px';
    }

    // ---- UI WIRING ----

    _setupUI() {
        const $ = id => document.getElementById(id);

        $('muteBtn').onclick = () => {
            this.audio.toggle();
            $('muteBtn').textContent = this.audio.enabled ? '🔊' : '🔇';
        };
        $('startBtn').onclick = () => {
            this.audio.resume();
            this._setState(S.CHAR_SELECT);
        };
        $('confirmCharBtn').onclick = () => { if (this.char) this._setState(S.NAME_INPUT); };
        $('retryBtn').onclick = () => this._setState(S.NAME_INPUT);
        $('confirmNameBtn').onclick = () => {
            const val = $('playerNameInput').value.trim();
            if (!val) return;
            this.playerName = val;
            this._startGame();
        };
        $('playerNameInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const val = $('playerNameInput').value.trim();
                if (val) { this.playerName = val; this._startGame(); }
            }
        });
        $('charSelectBtn').onclick = () => this._setState(S.CHAR_SELECT);
        $('playAgainBtn').onclick = () => this._setState(S.CHAR_SELECT);
        $('resumeBtn').onclick = () => { this.audio.resume(); this._setState(S.PLAYING); };
        $('quitBtn').onclick = () => this._setState(S.START);

        $('showHighscoresBtn').onclick = () => {
            this._renderHighscores('highscoreListOverlay');
            $('hsOverlay').classList.remove('hidden');
        };
        $('closeHighscoresBtn').onclick = () => {
            $('hsOverlay').classList.add('hidden');
        };

        this._buildCharGrid();
        this._renderHighscores();
    }

    _buildCharGrid() {
        const grid = document.getElementById('charGrid');
        grid.innerHTML = '';

        for (const c of CHARACTERS) {
            const card = document.createElement('div');
            card.className = 'char-card';

            // Photo avatar (real cast photo with pixelation)
            const av = document.createElement('img');
            av.src = c.photoSrc;
            av.alt = c.name;
            av.className = 'char-avatar';
            av.loading = 'lazy';
            // Fallback: draw pixel avatar if photo fails
            av.onerror = () => {
                const cvs = document.createElement('canvas');
                cvs.width = 52; cvs.height = 60; cvs.className = 'char-avatar';
                const actx = cvs.getContext('2d');
                const r = new Renderer(actx, 52, 60);
                r.drawCharAvatar(3, 2, c, 2);
                card.replaceChild(cvs, av);
            };

            const nameEl = document.createElement('div');
            nameEl.className = 'char-card-name';
            nameEl.textContent = c.name.toUpperCase();

            const originEl = document.createElement('div');
            originEl.className = 'char-card-origin';
            originEl.textContent = `${c.age}J \u2022 ${c.origin}`;

            card.append(av, nameEl);

            card.onclick = () => {
                grid.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
                card.classList.add('selected');
                this.char = c;

                // Desktop info panel (right side)
                const panel = document.getElementById('charInfoPanel');
                if (panel) {
                    panel.querySelector('.panel-placeholder').style.display = 'none';
                    const photo = panel.querySelector('.panel-photo');
                    photo.src = c.photoSrc;
                    photo.style.display = 'block';
                    panel.querySelector('.panel-name').textContent = c.name.toUpperCase();
                    panel.querySelector('.panel-name').style.display = 'block';
                    panel.querySelector('.panel-origin').textContent = `${c.age} Jahre \u2022 ${c.origin}`;
                    panel.querySelector('.panel-origin').style.display = 'block';
                    panel.querySelector('.panel-ability').textContent = `\u2726 ${c.abilityName}\n${c.abilityDesc}`;
                    panel.querySelector('.panel-ability').style.display = 'block';
                    const btn = document.getElementById('confirmCharBtn');
                    btn.style.display = 'block';
                }

                this.audio.resume();
                this.audio.playCollectShot();
            };

            grid.appendChild(card);
        }
    }

    _resizeCharGrid() {
        const grid = document.getElementById('charGrid');
        if (!grid) return;
        const { width: availW, height: availH } = grid.getBoundingClientRect();
        if (availW <= 0 || availH <= 0) return;
        const COLS = 7, ROWS = 2, GAP = 6;
        const tileByW = (availW - (COLS - 1) * GAP) / COLS;
        const tileByH = (availH - (ROWS - 1) * GAP) / ROWS;
        const tile = Math.floor(Math.min(tileByW, tileByH));
        grid.style.setProperty('--tile', tile + 'px');
    }

    _setState(s) {
        this.state = s;
        const screens = ['startScreen', 'charSelectScreen', 'levelIntroScreen',
            null, 'pauseScreen', 'gameOverScreen', 'winScreen', 'nameInputScreen'];
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));

        const screenId = screens[s];
        if (screenId) document.getElementById(screenId).classList.remove('hidden');

        document.getElementById('muteBtn').classList.toggle('visible',
            s === S.PLAYING || s === S.PAUSED);

        if (s === S.CHAR_SELECT) {
            this.char = null;
            document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
            requestAnimationFrame(() => this._resizeCharGrid());
            // Reset desktop info panel
            const panel = document.getElementById('charInfoPanel');
            if (panel) {
                panel.querySelector('.panel-placeholder').style.display = '';
                panel.querySelector('.panel-photo').style.display = 'none';
                panel.querySelector('.panel-name').style.display = 'none';
                panel.querySelector('.panel-origin').style.display = 'none';
                panel.querySelector('.panel-ability').style.display = 'none';
                document.getElementById('confirmCharBtn').style.display = 'none';
            }
        }
        if (s === S.NAME_INPUT) {
            const charLabel = document.getElementById('nameInputChar');
            if (charLabel && this.char) charLabel.textContent = this.char.name.toUpperCase();
            const input = document.getElementById('playerNameInput');
            if (input) {
                input.value = this.playerName || '';
                requestAnimationFrame(() => input.focus());
            }
        }
        if (s === S.GAME_OVER) {
            document.getElementById('finalScore').textContent = this.score.toLocaleString();
            this.audio.stopMusic();
            this.audio.playGameOver();
            this._saveScore();
        }
        if (s === S.WIN) {
            document.getElementById('winScore').textContent = this.score.toLocaleString();
            this.audio.stopMusic();
            this.audio.playLevelComplete();
            this._saveScore();
        }
        if (s === S.START) {
            this.audio.stopMusic();
            this._renderHighscores();
        }
    }

    // ---- GAME INIT ----

    _startGame() {
        this.audio.resume();
        this.lvlIdx = 0;
        this.score = 0;
        this.multi = this.char.ability === 'score_boost' ? 2 : 1;
        this.lives = this.char.ability === 'extra_life' ? 4 : 3;
        this.shieldActive = (this.char.ability === 'shield');
        this.shieldSpawned = (this.char.ability === 'shield'); // only one shield per run
        this.dramaBubbleCount = 0; // alternates bubble text per spawn
        this.vipStickers = 0;
        this._initLevel();
        this._showLevelIntro();
    }

    _initLevel() {
        const lvl = LEVELS[this.lvlIdx];
        // Level 1: use base speed. All subsequent levels: carry over current speed.
        if (this.lvlIdx === 0) {
            this.scrollSpeed = lvl.scrollSpeed;
            if (this.char.ability === 'speed_boost') this.scrollSpeed *= 1.15;
            if (this.char.ability === 'slow_obstacles') this.scrollSpeed *= 0.85;
        }

        this.scrollX = 0;
        this.levelDist = 0;
        this.obstacles = [];
        this.collectibles = [];
        this.fxParticles = [];
        this.obsTimer = 2.0;   // grace period
        this.colTimer = 1.0;
        this.levelStartTime = Date.now();
        this.bossActive = false;
        this.bossDefeated = false;
        this.boss = null;
        this.bossProjectiles = [];
        this.transitionGate = null;
        this.vipCompleteTime = 0;

        // Init player
        const gy = this.renderer.getGroundY();
        this.player = {
            x: PLAYER_X, y: gy - PLAYER_H_STAND,
            w: PLAYER_W, h: PLAYER_H_STAND,
            vy: 0,
            state: 'run',   // run | jump | duck
            jumpsLeft: this.char.maxJumps,
            maxJumps: this.char.maxJumps,
            frame: 0, frameTimer: 0,
            hurtTimer: 0
        };

        // Background particles
        this.particles = [];
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * W,
                y: Math.random() * (H - 200),
                s: 1 + Math.random() * 2,
                sp: 0.1 + Math.random() * 0.5,
                a: 0.15 + Math.random() * 0.5,
                c: lvl.accentColor
            });
        }

        this.audio.startMusic(lvl.id);
    }

    _showLevelIntro() {
        const lvl = LEVELS[this.lvlIdx];
        document.getElementById('levelIntroNumber').textContent = `LEVEL ${lvl.id}`;
        document.getElementById('levelIntroName').textContent = lvl.name.replace('\n', ' ');
        document.getElementById('levelIntroDesc').textContent = lvl.description;
        this._setState(S.LEVEL_INTRO);
        this.introTimer = 2.2;
    }

    // ---- MAIN LOOP ----

    _loop(t) {
        const dt = Math.min((t - this.lastT) / 1000, 0.05);
        this.lastT = t;

        if (this.state === S.LEVEL_INTRO) {
            this.introTimer -= dt;
            if (this.introTimer <= 0) {
                this._setState(S.PLAYING);
                this.input.reset();
            }
        }

        if (this.state === S.PLAYING) {
            this._update(dt);
        }

        // Debug frame log
        if (this.state === S.PLAYING && this.player) {
            const p = this.player;
            this._dbg.push({
                t: t / 1000,
                dt,
                ps: p.state,
                hurt: p.hurtTimer || 0,
                duck: this.input.duckHeld,
                keys: [...this.input._keys].join(','),
                frame: p.frame
            });
            if (this._dbg.length > 120) this._dbg.shift();
        }

        this._render();
        requestAnimationFrame(t2 => this._loop(t2));
    }

    // ---- UPDATE ----

    _update(dt) {
        const p = this.player;
        const lvl = LEVELS[this.lvlIdx];
        const gy = this.renderer.getGroundY();

        // Pause
        if (this.input.consumePause()) {
            this._setState(S.PAUSED);
            return;
        }

        // Jump
        if (this.input.consumeJump() && p.jumpsLeft > 0 && p.state !== 'duck') {
            p.vy = JUMP_V;
            p.jumpsLeft--;
            p.state = 'jump';
            if (p.jumpsLeft < p.maxJumps - 1) {
                this.audio.playDoubleJump();
            } else {
                this.audio.playJump();
            }
        }

        // Duck
        const wantDuck = this.input.isDucking;
        const onGround = (p.y + p.h >= gy - 1);

        if (wantDuck && onGround && p.state !== 'jump') {
            p.state = 'duck';
            p.h = PLAYER_H_DUCK;
            p.y = gy - p.h;
        } else if (p.state === 'duck' && !wantDuck) {
            p.state = 'run';
            p.h = PLAYER_H_STAND;
            p.y = gy - p.h;
        }

        // Gravity
        if (!onGround || p.vy < 0) {
            p.vy += GRAVITY * dt;
            p.y += p.vy * dt;
        }

        // Land
        if (p.y + p.h >= gy) {
            p.y = gy - p.h;
            p.vy = 0;
            p.jumpsLeft = p.maxJumps;
            if (p.state === 'jump') p.state = 'run';
        }

        // Hurt cooldown
        if (p.hurtTimer > 0) p.hurtTimer -= dt;

        // Animation
        p.frameTimer += dt;
        if (p.frameTimer > 0.12) { p.frame++; p.frameTimer = 0; }

        // Boss phase: freeze level progress; otherwise scroll normally
        const bossSlowSpeed = this.scrollSpeed * 0.25;
        if (!this.bossActive) {
            // Scroll
            this.scrollX += this.scrollSpeed * dt;
            this.levelDist += this.scrollSpeed * dt;
            this.score += Math.floor(this.scrollSpeed * dt * 0.1 * this.multi);

            // Speed up gradually
            this.scrollSpeed += lvl.speedIncreaseRate * dt;

            // Spawn obstacles (stop when transition gate is active)
            if (!this.transitionGate) {
                this.obsTimer -= dt;
                if (this.obsTimer <= 0) {
                    this._spawnObstacle(lvl);
                    this.obsTimer = lvl.obstacleMinGap + Math.random() * (lvl.obstacleMaxGap - lvl.obstacleMinGap);
                }

                // Spawn collectibles
                this.colTimer -= dt;
                if (this.colTimer <= 0) {
                    this._spawnCollectible(lvl);
                    this.colTimer = lvl.collectibleMinGap + Math.random() * (lvl.collectibleMaxGap - lvl.collectibleMinGap);
                }
            }
        } else {
            // Background scrolls slowly for atmosphere
            this.scrollX += bossSlowSpeed * dt;

            // Keep spawning oneplus until player has 3 VIP stickers
            if (this.vipStickers < 3) {
                this.colTimer -= dt;
                if (this.colTimer <= 0) {
                    const gy = this.renderer.getGroundY();
                    const def = COLLECTIBLE_DEFS['oneplus'];
                    const hOff = def.heightRange[0] + Math.random() * (def.heightRange[1] - def.heightRange[0]);
                    const baseY = gy - hOff - def.h;
                    this.collectibles.push({
                        type: 'oneplus', x: W + 20, y: baseY, baseY,
                        w: def.w, h: def.h, color: def.color, glow: def.glowColor,
                        points: def.points, bobT: 0, hit: false
                    });
                    this.colTimer = 2.5 + Math.random() * 1.5;
                }
            }
        }

        // Particles (always scroll, slower during boss)
        const ptSpeed = this.bossActive ? bossSlowSpeed : this.scrollSpeed;
        for (const pt of this.particles) {
            pt.x -= pt.sp * ptSpeed * dt * 0.08;
            if (pt.x < -4) pt.x = W + 4;
        }

        // FX particles (score popups)
        this.fxParticles = this.fxParticles.filter(fx => {
            fx.y -= 40 * dt;
            fx.life -= dt;
            return fx.life > 0;
        });

        // Move obstacles (slower during boss)
        const obsSpeed = this.bossActive ? bossSlowSpeed : this.scrollSpeed;
        this.obstacles = this.obstacles.filter(o => {
            o.x -= obsSpeed * dt;
            return o.x + o.w > -60;
        });

        // Move collectibles (slower during boss)
        this.collectibles = this.collectibles.filter(c => {
            c.x -= obsSpeed * dt;
            c.bobT += dt;
            c.y = c.baseY + Math.sin(c.bobT * 3.5) * 6;
            return c.x + c.w > -40;
        });

        // Magnet ability
        if (this.char.ability === 'magnet') {
            for (const c of this.collectibles) {
                const dx = c.x - p.x;
                if (dx > 0 && dx < 180) {
                    c.x -= (180 - dx) * 1.8 * dt;
                }
            }
        }

        // Collision: obstacles
        if (p.hurtTimer <= 0) {
            for (const o of this.obstacles) {
                if (o.hit) continue;
                if (this._aabb(p, o)) {
                    o.hit = true;
                    if (this.shieldActive) {
                        this.shieldActive = false;
                        this.audio.playShield();
                        this._addFx(o.x, o.y, 'SHIELD!', '#00d4ff');
                    } else {
                        this.lives--;
                        p.hurtTimer = 1.8;
                        this.audio.playHit();
                        this._addFx(p.x, p.y, '-1', '#ff3300');
                        if (this.lives <= 0) {
                            this._setState(S.GAME_OVER);
                            return;
                        }
                    }
                }
            }
        }

        // Collision: collectibles
        for (const c of this.collectibles) {
            if (c.hit) continue;
            if (this._aabb(p, c)) {
                c.hit = true;
                this._collectItem(c);
            }
        }
        this.collectibles = this.collectibles.filter(c => !c.hit);

        // Boss spawn check
        if (lvl.hasBoss && !this.bossActive && !this.bossDefeated
                && this.levelDist >= lvl.levelGoalDistance * 0.72) {
            this._spawnBoss();
        }

        // Boss update
        if (this.bossActive && this.boss) {
            const b = this.boss;
            b.hitTimer = Math.max(0, b.hitTimer - dt);
            b.oscillateT += dt;

            if (this.vipStickers < 3) {
                // Phase 1: stay on right side, throw lipsticks
                const holdX = W * 0.72;
                if (b.x > holdX) {
                    b.x -= b.baseSpeed * dt;
                } else {
                    b.x = holdX + Math.sin(b.oscillateT * 2.0) * 14;
                }

                b.projTimer -= dt;
                if (b.projTimer <= 0) {
                    const gy = this.renderer.getGroundY();
                    const PW = 40, PH = 16;
                    const isHigh = Math.random() < 0.5;
                    const py = isHigh ? gy - PH - 60 : gy - PH;
                    this.bossProjectiles.push({
                        x: b.x, y: py, w: PW, h: PH,
                        speed: 400, high: isHigh, hit: false
                    });
                    b.projTimer = 1.0 + Math.random() * 0.5;
                }
            } else {
                // Phase 2: 3 VIPs collected — charge toward player
                const targetX = PLAYER_X + PLAYER_W + 5;
                if (b.x > targetX + 20) {
                    b.x -= b.baseSpeed * 2.5 * dt;
                } else {
                    b.x = targetX + Math.sin(b.oscillateT * 2.5) * 22;
                }
            }

            // Move lipstick projectiles + collision
            this.bossProjectiles = this.bossProjectiles.filter(proj => {
                proj.x -= proj.speed * dt;
                if (proj.x + proj.w < 0) return false;
                if (!proj.hit && p.hurtTimer <= 0 && this._aabb(p, proj)) {
                    proj.hit = true;
                    if (this.shieldActive) {
                        this.shieldActive = false;
                        this.audio.playShield();
                        this._addFx(proj.x, proj.y, 'SHIELD!', '#00d4ff');
                    } else {
                        this.lives--;
                        p.hurtTimer = 1.8;
                        this.audio.playHit();
                        this._addFx(p.x, p.y - 20, '💄 -1', '#ff3300');
                        if (this.lives <= 0) {
                            this._setState(S.GAME_OVER);
                            return false;
                        }
                    }
                }
                return !proj.hit;
            });

            // Collision with boss
            if (p.hurtTimer <= 0 && b.hitTimer <= 0 && this._aabb(p, b)) {
                b.hitTimer = 0.6;
                if (this.vipStickers >= 3) {
                    this.bossDefeated = true;
                    this.bossActive = false;
                    this.boss = null;
                    this.audio.playLevelComplete();
                    this._addFx(PLAYER_X + 140, H / 2, "VIP! YOU'RE IN!", '#ffd700');
                    this.score += Math.floor(500 * this.multi);
                    this.levelDist = lvl.levelGoalDistance; // end level
                } else {
                    this.lives--;
                    p.hurtTimer = 1.8;
                    this.audio.playHit();
                    this._addFx(p.x, p.y, '-1', '#ff3300');
                    this._addFx(b.x, b.y - 18, `NOCH ${3 - this.vipStickers} VIP`, '#ffd700');
                    if (this.lives <= 0) {
                        this._setState(S.GAME_OVER);
                        return;
                    }
                }
            }
        }

        // Spawn transition gate when goal is reached (boss levels: wait for defeat)
        if (!this.transitionGate && this.levelDist >= lvl.levelGoalDistance
                && (!lvl.hasBoss || this.bossDefeated)) {
            this._spawnTransitionGate(lvl);
        }

        // Move transition gate; complete level when player passes through
        if (this.transitionGate) {
            this.transitionGate.x -= this.scrollSpeed * dt;
            // Trigger when gap center passes player center
            if (this.transitionGate.x + this.transitionGate.colW < PLAYER_X + PLAYER_W * 0.5) {
                this.transitionGate = null;
                this._levelComplete();
            }
        }
    }

    _spawnTransitionGate(lvl) {
        this.transitionGate = {
            x: W + 60,
            colW: 35,
            gapW: 110,
            w: 180,   // 35 + 110 + 35
            h: 270,
            lvlId: lvl.id
        };
        // Stop spawning new obstacles (existing ones stay)
        this.obsTimer = 99;
        this.audio.playPowerUp();
    }

    // ---- HIGH SCORES ----

    _saveScore() {
        const key = 'jws_highscores';
        let scores = [];
        try { scores = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
        scores.push({
            score: this.score,
            char: this.char ? this.char.name : '?',
            player: this.playerName || '?',
            date: new Date().toLocaleDateString('de-CH')
        });
        scores.sort((a, b) => b.score - a.score);
        scores.splice(10);
        try { localStorage.setItem(key, JSON.stringify(scores)); } catch (e) {}
    }

    _renderHighscores(targetId = 'highscoreList') {
        const list = document.getElementById(targetId);
        if (!list) return;
        let scores = [];
        try { scores = JSON.parse(localStorage.getItem('jws_highscores') || '[]'); } catch (e) {}
        if (scores.length === 0) {
            list.innerHTML = '<div class="hs-empty">Noch keine Einträge</div>';
            return;
        }
        list.innerHTML = scores.slice(0, 10).map((s, i) => {
            const label = s.player && s.player !== '?'
                ? `${s.player} mit ${s.char}`
                : s.char;
            return `<div class="hs-row">` +
                `<span class="hs-rank">#${i + 1}</span>` +
                `<span class="hs-char">${label.toUpperCase()}</span>` +
                `<span class="hs-score">${s.score.toLocaleString()}</span>` +
                `</div>`;
        }).join('');
    }

    _aabb(a, b) {
        const m = 6; // collision margin (forgiving)
        return a.x + m < b.x + b.w - m &&
               a.x + a.w - m > b.x + m &&
               a.y + m < b.y + b.h - m &&
               a.y + a.h - m > b.y + m;
    }

    _spawnObstacle(lvl) {
        const types = lvl.obstacleTypes;
        const typeKey = types[Math.floor(Math.random() * types.length)];
        const def = OBSTACLE_DEFS[typeKey];
        if (!def) return;

        const gy = this.renderer.getGroundY();
        const extra = typeKey === 'drama_bubble'
            ? { textVariant: this.dramaBubbleCount++ % 2 }
            : {};
        this.obstacles.push({
            type: typeKey,
            x: W + 20,
            y: gy - def.h - def.groundOffset,
            w: def.w,
            h: def.h,
            color: def.color,
            accent: def.accentColor,
            label: def.label,
            hit: false,
            ...extra
        });
    }

    _spawnCollectible(lvl) {
        const types = ['shot', 'shot', 'shot', 'shot', 'star', 'star', 'doener', 'doener', 'oneplus', 'heart', 'shield'];
        let typeKey = types[Math.floor(Math.random() * types.length)];
        if (typeKey === 'shield' && this.shieldSpawned) typeKey = 'shot'; // only one shield per run
        if (typeKey === 'shield') this.shieldSpawned = true;
        const def = COLLECTIBLE_DEFS[typeKey];
        if (!def) return;

        const gy = this.renderer.getGroundY();
        const hOff = def.heightRange[0] + Math.random() * (def.heightRange[1] - def.heightRange[0]);
        const baseY = gy - hOff - def.h;

        this.collectibles.push({
            type: typeKey,
            x: W + 20,
            y: baseY,
            baseY: baseY,
            w: def.w,
            h: def.h,
            color: def.color,
            glow: def.glowColor,
            points: def.points,
            bobT: Math.random() * 6,
            hit: false
        });
    }

    _spawnBoss() {
        const gy = this.renderer.getGroundY();
        this.bossActive = true;
        this.obstacles = [];
        this.bossProjectiles = [];
        this.boss = {
            x: W + 60,
            y: gy - 140,
            w: 80,
            h: 140,
            baseSpeed: 200,
            hitTimer: 0,
            oscillateT: 0,
            projTimer: 1.0
        };
        this._addFx(W / 2, H / 2 - 30, '★ BOSS ★', '#ffd700');
        this.audio.playPowerUp();
    }

    _collectItem(c) {
        let pts = c.points;

        switch (c.type) {
            case 'shot':
                if (this.char.ability === 'double_collect' || this.char.ability === 'shot_double') pts *= 2;
                this.scrollSpeed += 15;
                this.audio.playCollectShot();
                break;
            case 'heart':
                this.lives = Math.min(this.lives + 1, 5);
                if (this.char.ability === 'heart_triple') pts = 15;
                this.audio.playCollectHeart();
                break;
            case 'star':
                this.multi = Math.min(this.multi + 0.5, 5);
                if (this.char.ability === 'double_collect') pts *= 2;
                this.audio.playCollectStar();
                break;
            case 'oneplus':
                this.multi = Math.min(this.multi + 1, 5);
                if (LEVELS[this.lvlIdx].hasBoss) {
                    this.vipStickers++;
                    if (this.vipStickers >= 3 && !this.vipCompleteTime) {
                        this.vipCompleteTime = Date.now();
                    }
                }
                this.audio.playCollectOneplus();
                break;
            case 'doener':
                this.multi = Math.min(this.multi + 1.0, 5);
                this.audio.playCollectStar();
                break;
            case 'shield':
                this.shieldActive = true;
                this.audio.playShield();
                this._addFx(this.player.x, this.player.y, 'SHIELD!', '#00d4ff');
                break;
        }

        pts = Math.floor(pts * this.multi);
        this.score += pts;
        this._addFx(c.x, c.y, `+${pts}`, c.color);
    }

    _addFx(x, y, text, color) {
        this.fxParticles.push({ x, y, text, color, life: 0.9 });
    }

    _levelComplete() {
        this.audio.stopMusic();
        this.audio.playLevelComplete();
        this.lvlIdx++;
        if (this.lvlIdx >= LEVELS.length) {
            this._setState(S.WIN);
        } else {
            this._initLevel();
            this._showLevelIntro();
        }
    }

    // ---- RENDER ----

    _render() {
        const r = this.renderer;
        r.clear();

        if (this.state === S.PLAYING || this.state === S.PAUSED) {
            const lvl = LEVELS[this.lvlIdx];
            const p = this.player;

            // Screen shake when recently hurt (fades out over 0.4s)
            let shakeActive = false;
            if (p && p.hurtTimer > 1.4) {
                const t = (p.hurtTimer - 1.4) / 0.4;
                const intensity = t * 7;
                this.ctx.save();
                this.ctx.translate(
                    (Math.random() - 0.5) * intensity,
                    (Math.random() - 0.5) * intensity * 0.6
                );
                shakeActive = true;
            }

            r.drawBackground(lvl, this.scrollX, this.particles);
            r.drawGround(lvl, this.scrollX);

            for (const c of this.collectibles) r.drawCollectible(c);
            r.playerX = this.player ? this.player.x : 0;
            for (const o of this.obstacles) r.drawObstacle(o);
            for (const proj of this.bossProjectiles) r.drawLipstick(proj);
            if (this.transitionGate) r.drawTransitionGate(this.transitionGate);
            if (this.bossActive && this.boss) r.drawBoss(this.boss, LEVELS[this.lvlIdx].accentColor, this.vipCompleteTime);

            r.drawPlayer(this.player, this.char, this.shieldActive);

            // FX popups
            const ctx = this.ctx;
            for (const fx of this.fxParticles) {
                ctx.save();
                ctx.globalAlpha = Math.min(fx.life * 2, 1);
                ctx.fillStyle = fx.color;
                ctx.font = 'bold 16px "Zuume", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(fx.text, fx.x + 20, fx.y);
                ctx.restore();
            }

            if (shakeActive) this.ctx.restore(); // HUD drawn outside shake

            r.drawHUD(this.score, this.lives, this.multi,
                lvl.id, lvl.accentColor, this.vipStickers, lvl.hasBoss);
            r.drawProgressBar(this.levelDist / lvl.levelGoalDistance, lvl.accentColor);

            // Keyboard hints (level 1 only, fade out after 10s)
            if (this.lvlIdx === 0) {
                const elapsed = (Date.now() - this.levelStartTime) / 1000;
                const hintAlpha = elapsed < 10 ? 1.0 : Math.max(0, 1 - (elapsed - 10) / 2);
                r.drawKeyboardHints(hintAlpha);
            }
        } else {
            r.drawDarkBg();
        }
    }
}

// ---- BOOT ----
window.addEventListener('DOMContentLoaded', () => new Game());
