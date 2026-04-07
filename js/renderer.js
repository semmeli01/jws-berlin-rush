// =============================================
// JWS: BERLIN RUSH — Renderer
// All drawing/rendering functions
// =============================================

const PX = 4; // base pixel size for 8-bit look

class Renderer {
    constructor(ctx, W, H) {
        this.ctx = ctx;
        this.W = W;
        this.H = H;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.W, this.H);
    }

    // ---- BACKGROUND ----

    drawBackground(level, scrollX, particles) {
        const ctx = this.ctx;
        const groundY = this.getGroundY();

        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, groundY);
        grad.addColorStop(0, level.skyTop);
        grad.addColorStop(1, level.skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.W, groundY);

        // Particles (stars/neon dots)
        ctx.save();
        for (const p of particles) {
            ctx.globalAlpha = p.a;
            ctx.fillStyle = p.c;
            ctx.fillRect(p.x, p.y, p.s, p.s);
        }
        ctx.restore();

        // Far buildings
        this._drawBuildings(level.buildingColorFar, scrollX * 0.2, 70, 120, 8, groundY);
        // Near buildings
        this._drawBuildings(level.buildingColorNear, scrollX * 0.5, 50, 90, 6, groundY);

        // Neon accent lines (level 3+)
        if (level.id >= 3) {
            ctx.save();
            ctx.strokeStyle = level.accentColor + '33';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const lx = ((i * 130 - scrollX * 0.7) % (this.W + 130) + this.W + 130) % (this.W + 130) - 130;
                ctx.beginPath();
                ctx.moveTo(lx, 0);
                ctx.lineTo(lx + 50, groundY);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Strobe effect for level 4
        if (level.id === 4) {
            const strobeAlpha = Math.sin(Date.now() * 0.015) * 0.04 + 0.02;
            ctx.fillStyle = `rgba(255,255,255,${Math.max(0, strobeAlpha)})`;
            ctx.fillRect(0, 0, this.W, groundY);
        }
    }

    _drawBuildings(color, offset, minH, maxH, count, groundY) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        const totalW = this.W + 100;
        for (let i = 0; i < count; i++) {
            const seed = i * 7919;
            const bw = 50 + (seed % 40);
            const bh = minH + (seed % (maxH - minH));
            const bx = ((i * (totalW / count) - offset) % totalW + totalW) % totalW - 50;
            ctx.fillRect(bx, groundY - bh, bw, bh);
            // Windows
            ctx.fillStyle = color === this.ctx.fillStyle ? color : color;
            const winColor = 'rgba(255,255,200,0.06)';
            ctx.fillStyle = winColor;
            for (let wy = groundY - bh + 8; wy < groundY - 10; wy += 16) {
                for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
                    ctx.fillRect(wx, wy, 6, 8);
                }
            }
            ctx.fillStyle = color;
        }
    }

    // ---- GROUND ----

    drawGround(level, scrollX) {
        const ctx = this.ctx;
        const gy = this.getGroundY();
        const gh = this.H - gy;

        ctx.fillStyle = level.groundColor;
        ctx.fillRect(0, gy, this.W, gh);

        // Top neon line
        ctx.fillStyle = level.groundTop;
        ctx.fillRect(0, gy, this.W, 4);

        // Tile pattern
        ctx.fillStyle = level.platformTileColor;
        const tw = 48;
        const off = (scrollX * 0.8) % tw;
        for (let x = -off - tw; x < this.W + tw; x += tw) {
            ctx.fillRect(x + 2, gy + 10, tw - 4, 6);
            ctx.fillRect(x + tw / 2, gy + 24, tw - 4, 6);
        }

        // Horizontal lines
        ctx.fillStyle = level.groundTop + '44';
        ctx.fillRect(0, gy + 18, this.W, 1);
        ctx.fillRect(0, gy + 32, this.W, 1);
    }

    // ---- PLAYER ----

    drawPlayer(player, char, shieldActive) {
        const ctx = this.ctx;
        const p = player;

        // Hurt flicker
        if (p.hurtTimer > 0 && Math.floor(p.hurtTimer * 10) % 2 === 0) return;

        // Shield glow
        if (shieldActive) {
            ctx.save();
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur = 18;
        }

        this._drawCharBody(p.x, p.y, p.w, p.h, char, p.state, p.frame);

        if (shieldActive) {
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = '#00d4ff88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 8, p.h / 2 + 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawCharBody(x, y, w, h, char, state, frame) {
        const ctx = this.ctx;
        const bc = char.bodyColor;
        const hc = char.hairColor;
        const sc = char.skinColor;

        if (state === 'duck') {
            // Ducking: squashed horizontally
            // Hair/head
            ctx.fillStyle = hc;
            ctx.fillRect(x + 4, y, w - 8, 16);
            ctx.fillStyle = sc;
            ctx.fillRect(x + 8, y + 3, w - 16, 12);
            // Eyes
            ctx.fillStyle = '#111';
            ctx.fillRect(x + 10, y + 6, 4, 4);
            ctx.fillRect(x + w - 14, y + 6, 4, 4);
            // Body wide
            ctx.fillStyle = bc;
            ctx.fillRect(x, y + 16, w, h - 28);
            // Legs flat
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x, y + h - 12, w, 8);
            ctx.fillStyle = '#222';
            ctx.fillRect(x, y + h - 4, 14, 4);
            ctx.fillRect(x + w - 14, y + h - 4, 14, 4);
            return;
        }

        const alt = Math.floor(frame) % 2 === 0;
        const jumping = state === 'jump';

        // Head
        ctx.fillStyle = hc;
        ctx.fillRect(x + 6, y, 28, 20);
        ctx.fillStyle = sc;
        ctx.fillRect(x + 9, y + 4, 22, 15);
        // Eyes
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 12, y + 8, 4, 4);
        ctx.fillRect(x + 24, y + 8, 4, 4);
        // Mouth
        ctx.fillStyle = '#c03030';
        ctx.fillRect(x + 15, y + 14, 10, 2);

        // Body
        ctx.fillStyle = bc;
        ctx.fillRect(x + 4, y + 20, 32, 30);

        // Arms
        if (jumping) {
            ctx.fillRect(x - 2, y + 18, 6, 16);
            ctx.fillRect(x + w - 4, y + 18, 6, 16);
        } else if (alt) {
            ctx.fillRect(x - 2, y + 22, 6, 18);
            ctx.fillRect(x + w - 4, y + 20, 6, 14);
        } else {
            ctx.fillRect(x - 2, y + 20, 6, 14);
            ctx.fillRect(x + w - 4, y + 22, 6, 18);
        }

        // Pants
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x + 4, y + 50, 32, 18);

        // Legs + shoes
        if (jumping) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x + 4, y + 54, 12, 14);
            ctx.fillRect(x + 24, y + 54, 12, 14);
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 2, y + 66, 14, 6);
            ctx.fillRect(x + 24, y + 66, 14, 6);
        } else if (alt) {
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 2, y + 68, 16, 6);
            ctx.fillRect(x + 22, y + 64, 14, 6);
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 2, y + 64, 14, 6);
            ctx.fillRect(x + 24, y + 68, 16, 6);
        }
    }

    drawCharAvatar(x, y, char, scale) {
        // Mini version for character select
        const ctx = this.ctx;
        const s = scale || 2;
        const bc = char.bodyColor;
        const hc = char.hairColor;
        const sc = char.skinColor;

        // Head
        ctx.fillStyle = hc;
        ctx.fillRect(x + 4 * s, y, 14 * s, 10 * s);
        ctx.fillStyle = sc;
        ctx.fillRect(x + 6 * s, y + 2 * s, 10 * s, 8 * s);
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 7 * s, y + 4 * s, 2 * s, 2 * s);
        ctx.fillRect(x + 13 * s, y + 4 * s, 2 * s, 2 * s);
        // Body
        ctx.fillStyle = bc;
        ctx.fillRect(x + 3 * s, y + 10 * s, 16 * s, 12 * s);
        // Legs
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x + 3 * s, y + 22 * s, 16 * s, 6 * s);
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 2 * s, y + 26 * s, 8 * s, 3 * s);
        ctx.fillRect(x + 12 * s, y + 26 * s, 8 * s, 3 * s);
    }

    // ---- OBSTACLES ----

    drawObstacle(obs) {
        const ctx = this.ctx;

        // Body
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Accent top/left
        ctx.fillStyle = obs.accent;
        ctx.fillRect(obs.x, obs.y, obs.w, 3);
        ctx.fillRect(obs.x, obs.y, 3, obs.h);

        // Border
        ctx.strokeStyle = obs.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);

        // Emoji label
        const fontSize = Math.min(obs.w, obs.h) * 0.5;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obs.label, obs.x + obs.w / 2, obs.y + obs.h / 2);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(obs.x + 4, obs.y + obs.h, obs.w - 2, 4);
    }

    // ---- COLLECTIBLES ----

    drawCollectible(col) {
        const ctx = this.ctx;
        ctx.save();
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 12;

        if (col.type === 'heart') {
            this._drawPixelHeart(col.x, col.y, col.w, col.color);
        } else if (col.type === 'star') {
            this._drawStar(col.x + col.w / 2, col.y + col.h / 2, col.w / 2, col.color);
        } else if (col.type === 'oneplus') {
            ctx.fillStyle = '#ff3300';
            ctx.fillRect(col.x, col.y, col.w, col.h);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${col.w * 0.55}px "Zuume", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('1+', col.x + col.w / 2, col.y + col.h / 2);
        } else {
            // Shot glass
            ctx.fillStyle = col.color;
            ctx.fillRect(col.x + 4, col.y, col.w - 8, col.h - 6);
            ctx.fillRect(col.x + 2, col.y + col.h - 8, col.w - 4, 8);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(col.x + 6, col.y + 2, 3, col.h - 10);
        }

        ctx.restore();

        // Points label
        if (col.points > 0) {
            ctx.fillStyle = '#ffffffaa';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`+${col.points}`, col.x + col.w / 2, col.y - 4);
        }
    }

    _drawPixelHeart(x, y, w, color) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        const p = Math.floor(w / 7);
        // Pixel heart pattern
        const rows = [
            [0, 1, 1, 0, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 0, 0, 0]
        ];
        rows.forEach((row, ry) => {
            row.forEach((v, rx) => {
                if (v) ctx.fillRect(x + rx * p, y + ry * p, p, p);
            });
        });
    }

    _drawStar(cx, cy, r, color) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
            const rad = i % 2 === 0 ? r : r * 0.4;
            ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
    }

    // ---- HUD ----

    drawHUD(score, lives, multiplier, levelId, accentColor, vipStickers, hasBoss) {
        const ctx = this.ctx;

        // HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, this.W, 52);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Zuume", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE ${score.toLocaleString()}`, 10, 28);

        // Multiplier
        if (multiplier > 1) {
            ctx.fillStyle = accentColor;
            ctx.font = '13px "Zuume", monospace';
            ctx.fillText(`x${multiplier.toFixed(1)}`, 10, 44);
        }

        // Lives
        ctx.textAlign = 'right';
        ctx.fillStyle = '#e74c3c';
        ctx.font = '20px sans-serif';
        let livesStr = '';
        for (let i = 0; i < lives; i++) livesStr += '\u2665 ';
        ctx.fillText(livesStr.trim(), this.W - 10, 30);

        // Level
        ctx.textAlign = 'center';
        ctx.fillStyle = accentColor;
        ctx.font = '12px "Zuume", monospace';
        ctx.fillText(`LEVEL ${levelId}`, this.W / 2, 20);

        // VIP stickers
        if (hasBoss) {
            ctx.font = '11px monospace';
            ctx.fillStyle = '#ffd700';
            const filled = Math.min(vipStickers || 0, 3);
            const empty = 3 - filled;
            ctx.fillText('\u2B50'.repeat(filled) + '\u25CB'.repeat(empty), this.W / 2, 42);
        }
    }

    drawProgressBar(progress, accentColor) {
        const ctx = this.ctx;
        const barY = 52;

        ctx.fillStyle = '#222';
        ctx.fillRect(0, barY, this.W, 3);

        ctx.fillStyle = accentColor;
        ctx.fillRect(0, barY, this.W * Math.min(progress, 1), 3);

        // Finish marker
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.W - 4, barY, 4, 3);
    }

    drawTouchHints(alpha) {
        if (alpha <= 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;

        // Left = jump
        ctx.fillStyle = '#00d4ff15';
        ctx.fillRect(0, this.H - 120, this.W / 2, 120);
        ctx.fillStyle = '#00d4ff';
        ctx.font = '16px "Zuume", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TAP = JUMP', this.W / 4, this.H - 55);
        ctx.font = '22px monospace';
        ctx.fillText('\u2191', this.W / 4, this.H - 80);

        // Right = duck
        ctx.fillStyle = '#ff009015';
        ctx.fillRect(this.W / 2, this.H - 120, this.W / 2, 120);
        ctx.fillStyle = '#ff0090';
        ctx.font = '16px "Zuume", monospace';
        ctx.fillText('HOLD = DUCK', this.W * 3 / 4, this.H - 55);
        ctx.font = '22px monospace';
        ctx.fillText('\u2193', this.W * 3 / 4, this.H - 80);

        // Divider
        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.W / 2, this.H - 120);
        ctx.lineTo(this.W / 2, this.H);
        ctx.stroke();

        ctx.restore();
    }

    drawDarkBg() {
        this.ctx.fillStyle = '#050010';
        this.ctx.fillRect(0, 0, this.W, this.H);
    }

    getGroundY() {
        return this.H - 140;
    }
}
