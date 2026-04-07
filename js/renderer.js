// =============================================
// JWS: BERLIN RUSH — Renderer
// All drawing/rendering functions
// =============================================

const PX = 4; // base pixel size for 8-bit look

// Utility: darken a hex color by 30%
function _darken(hex) {
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*0.7)},${Math.floor(g*0.7)},${Math.floor(b*0.7)})`;
}
// Utility: lighten a hex color by 30%
function _lighten(hex) {
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.min(255,Math.floor(r*1.4))},${Math.min(255,Math.floor(g*1.4))},${Math.min(255,Math.floor(b*1.4))})`;
}

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

    // ---- PER-CHARACTER SPRITE SYSTEM ----

    _sp(char) {
        // Return sprite config, fallback to defaults
        return char.sprite || {
            skinColor: '#fdbcb4', hairColor: '#2c1810', hairLen: 'short',
            hairStyle: 'straight', hat: null, topColor: char.bodyColor || '#3498db',
            topStyle: 'shirt', pantsColor: '#1a1a2e', accessories: [], necklaceColor: null
        };
    }

    _drawCharBody(x, y, w, h, char, state, frame) {
        const ctx = this.ctx;
        const sp = this._sp(char);
        const skin = sp.skinColor;
        const hair = sp.hairColor;
        const alt  = Math.floor(frame) % 2 === 0;
        const jump = state === 'jump';
        const duck = state === 'duck';

        // ---- DUCKING POSE ----
        if (duck) {
            const dh = h; // duck height already set by physics
            // Long hair trails behind when ducking
            if (sp.hairLen === 'long') {
                ctx.fillStyle = hair;
                ctx.fillRect(x - 8, y + 2, 16, dh - 16); // hair cascade
            }
            // Head
            ctx.fillStyle = hair;
            ctx.fillRect(x + 4, y, w - 4, 15);
            ctx.fillStyle = skin;
            ctx.fillRect(x + 8, y + 3, w - 12, 11);
            // Hat on ducked head
            if (sp.hat) {
                ctx.fillStyle = sp.hat.color;
                if (sp.hat.type === 'beanie') {
                    ctx.fillRect(x + 4, y - 4, w - 4, 8);
                } else {
                    ctx.fillRect(x + 4, y - 5, w - 4, 6);
                    ctx.fillRect(x - 2, y - 1, w + 4, 3); // brim
                }
            }
            // Eyes
            ctx.fillStyle = '#111';
            ctx.fillRect(x + 10, y + 5, 4, 4);
            ctx.fillRect(x + w - 12, y + 5, 4, 4);
            // Body squashed
            ctx.fillStyle = sp.topColor;
            ctx.fillRect(x, y + 15, w, dh - 25);
            // Stripes
            if (sp.topStyle === 'stripes' && sp.topStripe) {
                ctx.fillStyle = sp.topStripe;
                for (let sx = x + 4; sx < x + w - 4; sx += 8) {
                    ctx.fillRect(sx, y + 15, 4, dh - 25);
                }
            }
            // Pants + shoes flat
            ctx.fillStyle = sp.pantsColor;
            ctx.fillRect(x, y + dh - 10, w, 6);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x, y + dh - 4, 14, 4);
            ctx.fillRect(x + w - 14, y + dh - 4, 14, 4);
            return;
        }

        // ---- LONG HAIR (behind body) ----
        if (sp.hairLen === 'long') {
            ctx.fillStyle = hair;
            const hx = sp.hairStyle === 'wavy' ? x + 1 : x + 2;
            ctx.fillRect(hx - 2, y + 18, 8, 36);      // left side
            ctx.fillRect(x + w - 6, y + 18, 8, 36);    // right side
            if (sp.hairStyle === 'wavy') {
                // Wavy bumps
                ctx.fillRect(hx - 4, y + 28, 6, 6);
                ctx.fillRect(hx - 4, y + 42, 6, 6);
                ctx.fillRect(x + w - 4, y + 28, 6, 6);
                ctx.fillRect(x + w - 4, y + 42, 6, 6);
            }
        }

        // ---- HEAD ----
        // Base head block
        ctx.fillStyle = hair;
        ctx.fillRect(x + 6, y, 28, 22);
        ctx.fillStyle = skin;
        ctx.fillRect(x + 9, y + 4, 22, 17);

        // ---- HAIR STYLES ----
        ctx.fillStyle = hair;
        switch (sp.hairStyle) {
            case 'side_part':
                ctx.fillRect(x + 6, y, 20, 6);  // swept left
                ctx.fillRect(x + 6, y - 2, 14, 4);
                break;
            case 'wavy':
                // Wavy bumps on top
                ctx.fillRect(x + 5, y - 3, 8, 6);
                ctx.fillRect(x + 15, y - 5, 8, 8);
                ctx.fillRect(x + 25, y - 3, 8, 6);
                ctx.fillRect(x + 3, y + 4, 6, 8);
                ctx.fillRect(x + 31, y + 4, 6, 8);
                break;
            case 'spiked':
                // Spikes upward
                ctx.fillRect(x + 10, y - 8, 6, 10);
                ctx.fillRect(x + 18, y - 10, 6, 12);
                ctx.fillRect(x + 26, y - 7, 6, 9);
                break;
            case 'voluminous':
                // Puffed out sides
                ctx.fillRect(x + 2, y + 4, 8, 16);
                ctx.fillRect(x + w - 10, y + 4, 8, 16);
                ctx.fillRect(x + 6, y - 2, 28, 6);
                break;
            case 'textured':
                // Short choppy
                ctx.fillRect(x + 7, y - 1, 6, 4);
                ctx.fillRect(x + 15, y - 3, 6, 5);
                ctx.fillRect(x + 23, y - 1, 6, 4);
                break;
            case 'tousled':
                ctx.fillRect(x + 8, y - 2, 24, 5);
                ctx.fillRect(x + 6, y + 1, 6, 4);
                ctx.fillRect(x + 28, y + 1, 6, 4);
                break;
            default: // straight short
                ctx.fillRect(x + 6, y, 28, 6);
                break;
        }

        // ---- HAT (over hair) ----
        if (sp.hat) {
            ctx.fillStyle = sp.hat.color;
            if (sp.hat.type === 'beanie') {
                ctx.fillRect(x + 4, y - 6, 32, 14);
                // Beanie rib texture
                ctx.fillStyle = _darken(sp.hat.color);
                for (let bx = x + 6; bx < x + 34; bx += 6) {
                    ctx.fillRect(bx, y - 6, 2, 14);
                }
                // Left/right ears covered
                ctx.fillStyle = sp.hat.color;
                ctx.fillRect(x + 4, y + 4, 6, 8);
                ctx.fillRect(x + 30, y + 4, 6, 8);
            } else { // cap
                ctx.fillRect(x + 6, y - 8, 28, 12); // cap dome
                ctx.fillRect(x + 4, y + 2, 32, 4);  // cap band
                ctx.fillRect(x + 2, y + 2, 10, 3);  // brim left
                ctx.fillRect(x + 28, y + 2, 10, 3); // brim right
                // Cap logo dot
                ctx.fillStyle = _lighten(sp.hat.color);
                ctx.fillRect(x + 18, y - 4, 4, 4);
            }
        }

        // ---- FACE ----
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 12, y + 8, 4, 4); // left eye
        ctx.fillRect(x + 24, y + 8, 4, 4); // right eye
        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 13, y + 8, 2, 2);
        ctx.fillRect(x + 25, y + 8, 2, 2);
        // Mouth
        ctx.fillStyle = '#c03030';
        ctx.fillRect(x + 15, y + 14, 10, 2);

        // Rainbow headband (Sandro)
        if (sp.accessories && sp.accessories.includes('rainbow_head')) {
            const rb = ['#ff0000','#ff7700','#ffff00','#00cc00','#0000ff','#8800aa'];
            rb.forEach((c, i) => {
                ctx.fillStyle = c;
                ctx.fillRect(x + 8 + i * 4, y + 17, 4, 3);
            });
        }

        // ---- NECK ----
        ctx.fillStyle = skin;
        ctx.fillRect(x + 15, y + 21, 10, 5);

        // Necklace
        if (sp.necklaceColor) {
            ctx.fillStyle = sp.necklaceColor;
            ctx.fillRect(x + 12, y + 23, 16, 2);
        }

        // Rainbow neck lei (Timmo)
        if (sp.accessories && sp.accessories.includes('rainbow_neck')) {
            const rb = ['#ff0000','#ff7700','#ffff00','#00cc00','#0000ff','#8800aa','#ff0090'];
            rb.forEach((c, i) => {
                ctx.fillStyle = c;
                ctx.fillRect(x + 8 + i * 4, y + 24, 4, 4);
            });
        }

        // ---- BODY / TOP ----
        ctx.fillStyle = sp.topColor;
        if (sp.topStyle === 'halter' || sp.topStyle === 'crop') {
            ctx.fillRect(x + 8, y + 26, 24, sp.topStyle === 'crop' ? 20 : 28);
            // Skin shoulders
            ctx.fillStyle = skin;
            ctx.fillRect(x + 4, y + 26, 6, 10);
            ctx.fillRect(x + w - 10, y + 26, 6, 10);
        } else if (sp.topStyle === 'tank') {
            ctx.fillRect(x + 6, y + 26, 28, 28);
            ctx.fillStyle = skin;
            ctx.fillRect(x + 4, y + 26, 4, 14); // shoulder
            ctx.fillRect(x + w - 8, y + 26, 4, 14);
        } else if (sp.topStyle === 'vneck') {
            ctx.fillRect(x + 4, y + 26, 32, 28);
            // V-neck cutout
            ctx.fillStyle = skin;
            ctx.fillRect(x + 16, y + 26, 4, 8);
            ctx.fillRect(x + 14, y + 26, 6, 4);
        } else if (sp.topStyle === 'dress') {
            ctx.fillRect(x + 4, y + 26, 32, 44); // longer
        } else if (sp.topStyle === 'cardigan') {
            ctx.fillRect(x + 4, y + 26, 32, 28);
            if (sp.topInner) {
                ctx.fillStyle = sp.topInner;
                ctx.fillRect(x + 14, y + 26, 12, 28); // inner shirt shows
            }
            // Cardigan lapels
            ctx.fillStyle = sp.topColor;
            ctx.fillRect(x + 4, y + 26, 10, 28);
            ctx.fillRect(x + 26, y + 26, 10, 28);
        } else { // shirt / default
            ctx.fillRect(x + 4, y + 26, 32, 28);
        }

        // Stripes
        if (sp.topStyle === 'stripes' && sp.topStripe) {
            ctx.fillStyle = sp.topColor;
            ctx.fillRect(x + 4, y + 26, 32, 28);
            ctx.fillStyle = sp.topStripe;
            for (let sx = 0; sx < 4; sx++) {
                ctx.fillRect(x + 6 + sx * 8, y + 26, 4, 28);
            }
        }

        // ---- ARMS ----
        ctx.fillStyle = sp.topStyle === 'tank' || sp.topStyle === 'halter' || sp.topStyle === 'crop'
            ? skin : sp.topColor;
        if (jump) {
            ctx.fillRect(x - 2, y + 22, 6, 18); // arms up
            ctx.fillRect(x + w - 4, y + 22, 6, 18);
        } else if (alt) {
            ctx.fillRect(x - 2, y + 26, 6, 20); // swing forward
            ctx.fillRect(x + w - 4, y + 22, 6, 16);
        } else {
            ctx.fillRect(x - 2, y + 22, 6, 16);
            ctx.fillRect(x + w - 4, y + 26, 6, 20);
        }
        // Skin forearms for tank/halter
        if (sp.topStyle === 'tank' || sp.topStyle === 'halter' || sp.topStyle === 'crop') {
            ctx.fillStyle = skin;
            if (jump) {
                ctx.fillRect(x - 2, y + 32, 6, 8);
                ctx.fillRect(x + w - 4, y + 32, 6, 8);
            } else if (alt) {
                ctx.fillRect(x - 2, y + 38, 6, 8);
                ctx.fillRect(x + w - 4, y + 34, 6, 8);
            } else {
                ctx.fillRect(x - 2, y + 30, 6, 8);
                ctx.fillRect(x + w - 4, y + 38, 6, 8);
            }
        }

        // Tattoo marks
        if (sp.accessories) {
            ctx.fillStyle = '#6644aa';
            if (sp.accessories.includes('tattoo_l')) {
                ctx.fillRect(x - 1, y + 30, 4, 2);
                ctx.fillRect(x - 1, y + 34, 4, 2);
            }
            if (sp.accessories.includes('tattoo_r')) {
                ctx.fillRect(x + w - 3, y + 30, 4, 2);
                ctx.fillRect(x + w - 3, y + 34, 4, 2);
            }
            // Watch
            ctx.fillStyle = '#888';
            if (sp.accessories.includes('watch_r')) {
                ctx.fillRect(x + w - 4, y + 36, 6, 4);
            }
            if (sp.accessories.includes('watch_l')) {
                ctx.fillRect(x - 2, y + 36, 6, 4);
            }
        }

        // ---- PANTS / DRESS BOTTOM ----
        if (sp.topStyle !== 'dress') {
            ctx.fillStyle = sp.pantsColor;
            ctx.fillRect(x + 4, y + 54, 32, 14);
        }

        // ---- LEGS + SHOES ----
        const shoeColor = '#1a1a1a';
        const legColor = sp.topStyle === 'dress' ? sp.topColor : sp.pantsColor;

        if (jump) {
            ctx.fillStyle = legColor;
            ctx.fillRect(x + 4, y + 56, 13, 12);
            ctx.fillRect(x + 23, y + 56, 13, 12);
            ctx.fillStyle = shoeColor;
            ctx.fillRect(x + 2, y + 67, 16, 5);
            ctx.fillRect(x + 22, y + 67, 16, 5);
        } else if (alt) {
            ctx.fillStyle = legColor;
            ctx.fillRect(x + 4, y + 54, 13, 16);
            ctx.fillRect(x + 23, y + 56, 13, 12);
            ctx.fillStyle = shoeColor;
            ctx.fillRect(x + 2, y + 69, 16, 5);
            ctx.fillRect(x + 23, y + 67, 14, 5);
        } else {
            ctx.fillStyle = legColor;
            ctx.fillRect(x + 4, y + 56, 13, 12);
            ctx.fillRect(x + 23, y + 54, 13, 16);
            ctx.fillStyle = shoeColor;
            ctx.fillRect(x + 3, y + 67, 14, 5);
            ctx.fillRect(x + 23, y + 69, 16, 5);
        }

        // Jean detail (lighter stripe) for blue jeans
        if (sp.pantsColor === '#3a6ea8') {
            ctx.fillStyle = '#5a8ec8';
            ctx.fillRect(x + 8, y + 54, 2, 18);
            ctx.fillRect(x + 30, y + 54, 2, 18);
        }
    }

    drawCharAvatar(x, y, char, scale) {
        // Mini avatar for char-select — draws bust portrait
        const ctx = this.ctx;
        const s = scale || 2;
        const sp = this._sp(char);
        const skin = sp.skinColor;
        const hair = sp.hairColor;

        // Long hair behind
        if (sp.hairLen === 'long') {
            ctx.fillStyle = hair;
            ctx.fillRect(x + 1 * s, y + 6 * s, 3 * s, 16 * s);
            ctx.fillRect(x + 18 * s, y + 6 * s, 3 * s, 16 * s);
        }

        // Head
        ctx.fillStyle = hair;
        ctx.fillRect(x + 3 * s, y, 16 * s, 11 * s);
        ctx.fillStyle = skin;
        ctx.fillRect(x + 5 * s, y + 2 * s, 12 * s, 9 * s);

        // Hair style
        ctx.fillStyle = hair;
        switch(sp.hairStyle) {
            case 'wavy':
                ctx.fillRect(x + 2 * s, y, 18 * s, 3 * s);
                ctx.fillRect(x + 1 * s, y + 3 * s, 4 * s, 4 * s);
                ctx.fillRect(x + 17 * s, y + 3 * s, 4 * s, 4 * s);
                break;
            case 'spiked':
                ctx.fillRect(x + 6 * s, y - 4 * s, 3 * s, 5 * s);
                ctx.fillRect(x + 11 * s, y - 5 * s, 3 * s, 6 * s);
                ctx.fillRect(x + 16 * s, y - 3 * s, 3 * s, 4 * s);
                break;
            case 'side_part':
                ctx.fillRect(x + 3 * s, y, 11 * s, 3 * s);
                ctx.fillRect(x + 3 * s, y - 1 * s, 7 * s, 2 * s);
                break;
            case 'voluminous':
                ctx.fillRect(x + 1 * s, y + 3 * s, 4 * s, 8 * s);
                ctx.fillRect(x + 17 * s, y + 3 * s, 4 * s, 8 * s);
                ctx.fillRect(x + 3 * s, y - 1 * s, 16 * s, 3 * s);
                break;
            case 'tousled':
                ctx.fillRect(x + 3 * s, y - 1 * s, 16 * s, 4 * s);
                ctx.fillRect(x + 2 * s, y + 2 * s, 3 * s, 3 * s);
                ctx.fillRect(x + 17 * s, y + 2 * s, 3 * s, 3 * s);
                break;
            default:
                ctx.fillRect(x + 3 * s, y, 16 * s, 3 * s);
                break;
        }

        // Hat
        if (sp.hat) {
            ctx.fillStyle = sp.hat.color;
            if (sp.hat.type === 'beanie') {
                ctx.fillRect(x + 2 * s, y - 3 * s, 18 * s, 7 * s);
            } else {
                ctx.fillRect(x + 3 * s, y - 4 * s, 16 * s, 6 * s);
                ctx.fillRect(x + 1 * s, y + 1 * s, 20 * s, 2 * s); // brim
            }
        }

        // Eyes
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 6 * s, y + 4 * s, 2 * s, 2 * s);
        ctx.fillRect(x + 14 * s, y + 4 * s, 2 * s, 2 * s);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 6 * s, y + 4 * s, 1 * s, 1 * s);
        ctx.fillRect(x + 14 * s, y + 4 * s, 1 * s, 1 * s);
        // Mouth
        ctx.fillStyle = '#c03030';
        ctx.fillRect(x + 8 * s, y + 7 * s, 6 * s, 1 * s);

        // Neck + body
        ctx.fillStyle = skin;
        ctx.fillRect(x + 9 * s, y + 11 * s, 4 * s, 3 * s);

        // Necklace
        if (sp.necklaceColor) {
            ctx.fillStyle = sp.necklaceColor;
            ctx.fillRect(x + 7 * s, y + 13 * s, 8 * s, 1 * s);
        }

        // Top
        ctx.fillStyle = sp.topColor;
        if (sp.topStyle === 'halter' || sp.topStyle === 'crop') {
            ctx.fillRect(x + 6 * s, y + 14 * s, 10 * s, 8 * s);
            ctx.fillStyle = skin;
            ctx.fillRect(x + 3 * s, y + 14 * s, 4 * s, 5 * s);
            ctx.fillRect(x + 15 * s, y + 14 * s, 4 * s, 5 * s);
        } else if (sp.topStyle === 'tank') {
            ctx.fillRect(x + 5 * s, y + 14 * s, 12 * s, 8 * s);
            ctx.fillStyle = skin;
            ctx.fillRect(x + 3 * s, y + 14 * s, 3 * s, 4 * s);
            ctx.fillRect(x + 16 * s, y + 14 * s, 3 * s, 4 * s);
        } else if (sp.topStyle === 'stripes' && sp.topStripe) {
            ctx.fillRect(x + 3 * s, y + 14 * s, 16 * s, 8 * s);
            ctx.fillStyle = sp.topStripe;
            for (let si = 0; si < 3; si++) {
                ctx.fillRect(x + (4 + si * 5) * s, y + 14 * s, 2 * s, 8 * s);
            }
        } else if (sp.topStyle === 'cardigan') {
            ctx.fillRect(x + 3 * s, y + 14 * s, 16 * s, 8 * s);
            if (sp.topInner) {
                ctx.fillStyle = sp.topInner;
                ctx.fillRect(x + 8 * s, y + 14 * s, 6 * s, 8 * s);
            }
            ctx.fillStyle = sp.topColor;
            ctx.fillRect(x + 3 * s, y + 14 * s, 5 * s, 8 * s);
            ctx.fillRect(x + 14 * s, y + 14 * s, 5 * s, 8 * s);
        } else {
            ctx.fillRect(x + 3 * s, y + 14 * s, 16 * s, 8 * s);
        }

        // Rainbow neck lei (Timmo)
        if (sp.accessories && sp.accessories.includes('rainbow_neck')) {
            const rb = ['#ff0000','#ff7700','#ffff00','#00cc00','#0000ff','#ff0090'];
            rb.forEach((c, i) => {
                ctx.fillStyle = c;
                ctx.fillRect(x + (4 + i * 3) * s, y + 13 * s, 2 * s, 2 * s);
            });
        }
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
