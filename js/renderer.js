// =============================================
// JWS: BERLIN RUSH — Renderer
// All drawing/rendering functions
// =============================================

const PX = 4; // base pixel size for 8-bit look

// ---- 8-bit Pixel Art: Naomi (Boss) ----
// 16-wide × 28-tall grid, drawn scaled to boss.w × boss.h
const NAOMI_PAL = {
    'H': '#E8B028', // blonde hair
    'h': '#B08010', // hair shadow
    'S': '#FFD8A8', // skin
    's': '#DBA870', // skin shadow
    'P': '#F860A8', // pink dress
    'p': '#C03878', // dress shadow
    'B': '#181818', // black slipper
    'E': '#201000', // eye
    'L': '#E02040', // lip
    'C': '#C0C8D0', // cross necklace
};
const NAOMI_GRID = [
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HHHHHHHHHHHH..',
    '..HHhSSSSSShHH..',
    '..HHSSSSSSSSHh..',
    '..HHSESSSSEsSH..',
    '..HHSSsssSsSHH..',
    '..HHSSsLLLsSHH..',
    '..HHSSSSSSSSHh..',
    '...hSSSCSSSShH..',
    '..SSSSSSSSSSSS..',
    '..PPpSSSSSSPPP..',
    '.PPPPPPPPPPPPPP.',
    '.PPpPPPPPPPPpPP.',
    '.PPPPPPPPPPPPPP.',
    '.PPpPPPPPPPPpPP.',
    '.PPPPPPPPPPPPPP.',
    '.PPpPPPPPPPPpPP.',
    '.PPPPPPPPPPPPPP.',
    '.PPpPPPPPPPPpPP.',
    '.PPPPPPPPPPPPPP.',
    '....PPPPPPPP....',
    '....SSSSSSSS....',
    '....SSSSsSSSs...',
    '....SSSSSSSS....',
    '....SSSSsSSSs...',
    '..BBBBB..BBBBB..',
    '..BBBBB..BBBBB..',
];

// ---- 8-bit Pixel Art: Jeremy (ex_char obstacle) ----
// 10-wide × 22-tall grid, drawn scaled to obs.w × obs.h
const JEREMY_PAL = {
    'K': '#150808', // black hair
    'S': '#C8783A', // skin
    's': '#A05020', // skin shadow
    'W': '#F0F0F0', // white tank top
    'w': '#D0D0D0', // tank shadow
    'G': '#2A6832', // green cargo pants
    'g': '#1A4A22', // pants shadow
    'N': '#E0E0D0', // sneakers
    'E': '#200800', // eye
};
const JEREMY_GRID = [
    '..KKKKKK..',
    '.KKKKKKKK.',
    'KSSSSSSssK',
    'KSESSsESsK',
    'KSSSsSsSsK',
    'KSSssSSSsK',
    'SSSSSSSSSS',
    'wWWSSSSWWw',
    'WWWWWWWWWW',
    'WWWWWWWWWW',
    'WwWWWWWWwW',
    'GGGGGGGGGG',
    'GGGGGGGGGG',
    'GGgg..ggGG',
    'GGgg..ggGG',
    'GGGGGGGGGG',
    'GGGGGGGGGG',
    'GGGGGGGGGG',
    'GGGGGGGGGG',
    'NNN....NNN',
    'NNNN.NNNNN',
    '..........',
];

// ---- 8-bit Pixel Art: Isabelle (tourist obstacle) ----
// 12-wide × 22-tall; blonde, glasses, pink leopard dress, black heels, blue suitcase
const ISABELLE_PAL = {
    'H': '#EED070', // blonde hair
    'h': '#C0A030', // hair shadow
    'S': '#FFD8A8', // skin
    's': '#DBA870', // skin shadow
    'G': '#C8C8C8', // glasses frame
    'P': '#E02898', // pink dress
    'p': '#A01860', // dress shadow / leopard spot
    'K': '#181818', // black heels
    'B': '#0840B0', // blue suitcase body
    'b': '#0428A0', // suitcase shadow/edge
    'L': '#88AACE', // suitcase city lights
    'l': '#5080AA', // city lights shadow
    'W': '#D0D8E0', // suitcase wheel
    'E': '#201000', // eye
    'N': '#E8C890', // neck
};
// 16-wide × 22-tall: Isabelle (cols 0-8) + clearly visible blue suitcase (cols 9-15)
const ISABELLE_GRID = [
    '..HHHHHH........',  //  0  head
    '.HHHHHHH........',  //  1
    '.HHGGhGGH.......',  //  2  glasses
    '.HHHHsHHH.......',  //  3  face
    '..HHHssHHBBBBb..',  //  4  chin + suitcase handle (top)
    '...NNNNNBBBBBb..',  //  5  neck + suitcase top
    '..sPPPPsBBLLBb..',  //  6  dress + suitcase with city lights
    '..PPpPPsBBLlBb..',  //  7
    '..PPpPP.BbLlBb..',  //  8
    '..PPPpP.BbLLBb..',  //  9
    '..PPpPP.BbLlBb..',  // 10
    '..PPPpP.BbLLBb..',  // 11
    '...SSPp.BbLlBb..',  // 12  legs
    '...SSSs.BbBBBb..',  // 13  suitcase lower
    '...SSSSsBBBBbb..',  // 14
    '...SSs..BBWWBB..',  // 15  suitcase wheels
    '....Ss..........',  // 16
    '...KKs..........',  // 17  heels
    '...KKK..........',  // 18
    '...KKK..........',  // 19
    '....KK..........',  // 20
    '................',  // 21
];

// ---- 8-bit Pixel Art: Biggie (bouncer obstacle, 3 dance frames) ----
// 12-wide × 22-tall, scaled to obs.w × obs.h; cycle at ~380ms/frame
const BIGGIE_PAL = {
    'H': '#F0D0A8', // skin / bald head
    's': '#C8A878', // skin shadow
    'G': '#D8D8D8', // glasses frame
    'g': '#909098', // glasses lens
    'B': '#1A40CC', // blue jersey
    'b': '#1028A0', // jersey shadow
    'R': '#CC2020', // red #8 on jersey
    'D': '#1C1C3C', // dark shorts
    'd': '#0C0C22', // shorts shadow
    'W': '#F2F2F2', // white sneakers/socks
    'w': '#D0D0D0', // socks shadow
    'N': '#DDB890', // neck
};
// Shared static rows (0-6 head/neck, 12-21 lower body) + 3 arm variants for rows 7-11
const _BIGGIE_STATIC_TOP = [
    '...HHHHHH...',  // 0  bald head
    '..HHHHHHHH..',  // 1
    '.HHHHHHHHHH.',  // 2
    '.HHGgHHGgHH.',  // 3  glasses
    '.HHHsssHHHH.',  // 4  face
    '..HHHsHHHH..',  // 5  chin
    '..NNNNNNNN..',  // 6  neck
];
const _BIGGIE_STATIC_BOT = [
    '.BBBBBBBBBB.',  // 12 jersey bottom
    '.DDDDDDDDDD.',  // 13 shorts
    '.DDdDDDDdDD.',  // 14
    '.DWDDDDDDDW.',  // 15 white side stripe
    '.DDDDDDDDDD.',  // 16
    '..WWWWWWWW..',  // 17 socks
    '.WWWWWWWWWW.',  // 18 sneakers
    'WWWWWWWWWWWW',  // 19
    '.WWWWWWWWWW.',  // 20
    '............',  // 21
];
const _BIGGIE_ARMS = [
    // Frame 0 — right arm forward (like the pointing photo pose)
    [
        '.BBBBBBBBBBB',  // 7  right arm extends
        '.BBBBBBBBBbB',  // 8
        '.BBbBRBBBbBB',  // 9  blue jersey + red #8
        '.BBBBBBBBBBB',  // 10
        'BBBBBBBBBBB.',  // 11 left arm out
    ],
    // Frame 1 — left arm raised high (+ bounce -3px applied in draw)
    [
        'BBBBBBBBBBBB',  // 7  full width
        '.BBBBBBBBbBB',  // 8
        '.BBbBRBBBbBB',  // 9
        '.BBBBBBBBBBB',  // 10
        '.BBBBBBBBBB.',  // 11
    ],
    // Frame 2 — right arm raised high
    [
        'BBBBBBBBBBBB',  // 7
        'BBBBBBBBBbBB',  // 8
        'BBbBRBBBBbBB',  // 9
        'BBBBBBBBBBBB',  // 10
        '.BBBBBBBBBB.',  // 11
    ],
];
// Pre-assemble the 3 complete frames, patching in arm rows for frames 1+2
const BIGGIE_FRAMES = _BIGGIE_ARMS.map((arms, fi) => {
    const top = [..._BIGGIE_STATIC_TOP];
    // Frames 1 & 2: arm pixel shows above shoulder line
    if (fi === 1) top[5] = 'B.HHHsHHHH..'; // left arm at face-level
    if (fi === 1) top[6] = 'BBNNNNNNNN..'; // arm connecting to body
    if (fi === 2) top[5] = '..HHHsHHHH.B'; // right arm at face-level
    if (fi === 2) top[6] = '..NNNNNNNNBB'; // arm connecting to body
    return [...top, ...arms, ..._BIGGIE_STATIC_BOT];
});

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

        // tourist → 8-bit Isabelle with suitcase
        if (obs.type === 'tourist') {
            this._drawPixelArt(obs.x, obs.y, obs.w, obs.h, ISABELLE_GRID, ISABELLE_PAL);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(obs.x + 3, obs.y + obs.h, obs.w - 4, 4);
            return;
        }

        // stairs → recognizable staircase (4 steps ascending left→right)
        if (obs.type === 'stairs') {
            const steps = 4;
            const sw = obs.w / steps;
            const sh = obs.h / steps;
            for (let i = 0; i < steps; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#888899' : '#7a7a8b';
                ctx.fillRect(obs.x + i * sw, obs.y + obs.h - (i + 1) * sh, sw + 1, (i + 1) * sh);
                ctx.fillStyle = '#aaaacc'; // top-edge highlight
                ctx.fillRect(obs.x + i * sw, obs.y + obs.h - (i + 1) * sh, sw + 1, 3);
                ctx.fillStyle = '#555566'; // right-edge shadow
                ctx.fillRect(obs.x + (i + 1) * sw - 2, obs.y + obs.h - (i + 1) * sh, 2, (i + 1) * sh);
            }
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(obs.x + 4, obs.y + obs.h, obs.w - 2, 4);
            return;
        }

        // paparazzi → camera flash when player is nearby
        if (obs.type === 'paparazzi') {
            // Standard block + emoji
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.fillStyle = obs.accent;
            ctx.fillRect(obs.x, obs.y, obs.w, 3);
            ctx.fillRect(obs.x, obs.y, 3, obs.h);
            ctx.strokeStyle = obs.accent;
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);
            const fs = Math.min(obs.w, obs.h) * 0.5;
            ctx.font = `${fs}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📸', obs.x + obs.w / 2, obs.y + obs.h / 2);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(obs.x + 4, obs.y + obs.h, obs.w - 2, 4);
            // Flash effect when player within ~220px — screen-filling white burst
            const dist = Math.abs((this.playerX || 999) - (obs.x + obs.w / 2));
            if (dist < 220) {
                const cycle = Date.now() % 1000;
                if (cycle < 250) {
                    const t = cycle / 250;
                    // Full-screen white overlay (strong!) + radial source burst
                    const screenAlpha = (1 - t) * 0.75;
                    ctx.fillStyle = `rgba(255,255,240,${screenAlpha})`;
                    ctx.fillRect(0, 0, this.W, this.H);
                    // Bright lens burst at camera
                    const cx = obs.x + obs.w * 0.6, cy = obs.y + obs.h * 0.3;
                    const radius = 20 + t * 180;
                    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                    grd.addColorStop(0, `rgba(255,255,255,${(1 - t) * 0.95})`);
                    grd.addColorStop(0.3, `rgba(255,255,220,${(1 - t) * 0.6})`);
                    grd.addColorStop(1, 'rgba(255,255,220,0)');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            return;
        }

        // drama_bubble → speech bubble with custom text, auto-width
        if (obs.type === 'drama_bubble') {
            const bubbleText = 'säg mir nöd meitli! 🙄';
            ctx.save();
            ctx.font = 'bold 15px "Zuume", monospace';
            const textW = ctx.measureText(bubbleText).width;
            const bw = Math.max(obs.w, textW + 26);
            ctx.fillStyle = '#55106a';
            ctx.fillRect(obs.x, obs.y, bw, obs.h);
            ctx.strokeStyle = '#aa40cc';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(obs.x + 1, obs.y + 1, bw - 2, obs.h - 2);
            // Bubble tail pointing downward
            ctx.fillStyle = '#55106a';
            ctx.beginPath();
            ctx.moveTo(obs.x + 28, obs.y + obs.h);
            ctx.lineTo(obs.x + 18, obs.y + obs.h + 13);
            ctx.lineTo(obs.x + 46, obs.y + obs.h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#aa40cc';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px "Zuume", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(bubbleText, obs.x + 12, obs.y + obs.h / 2);
            ctx.restore();
            return;
        }

        // bouncer → 8-bit Biggie with dance animation
        if (obs.type === 'bouncer') {
            const frame = Math.floor(Date.now() / 380) % 3;
            const yBounce = frame === 1 ? -3 : 0;
            this._drawPixelArt(obs.x, obs.y + yBounce, obs.w, obs.h, BIGGIE_FRAMES[frame], BIGGIE_PAL);
            // "BIGGIE" label above
            ctx.fillStyle = '#4466EE';
            ctx.font = 'bold 9px "Zuume", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('BIGGIE', obs.x + obs.w / 2, obs.y - 5);
            // drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(obs.x + 3, obs.y + obs.h, obs.w - 4, 4);
            return;
        }

        // ex_char → 8-bit Jeremy with ascending broken hearts
        if (obs.type === 'ex_char') {
            this._drawPixelArt(obs.x, obs.y, obs.w, obs.h, JEREMY_GRID, JEREMY_PAL);
            // broken heart on chest
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💔', obs.x + obs.w / 2, obs.y + obs.h * 0.42);
            // ascending floating hearts
            const now = Date.now();
            const heartPositions = [
                { xFrac: 0.15, speed: 0.8, delay: 0.0 },
                { xFrac: 0.55, speed: 1.0, delay: 0.4 },
                { xFrac: 0.85, speed: 0.7, delay: 0.75 },
            ];
            ctx.save();
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const hp of heartPositions) {
                const cycle = ((now * 0.001 * hp.speed + hp.delay) % 1);
                const hy = obs.y - 8 - cycle * 36;
                const hx = obs.x + obs.w * hp.xFrac;
                const alpha = cycle < 0.65 ? 1 : 1 - (cycle - 0.65) / 0.35;
                ctx.globalAlpha = alpha;
                ctx.fillText('💔', hx, hy);
            }
            ctx.restore();
            // drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(obs.x + 3, obs.y + obs.h, obs.w - 4, 4);
            return;
        }

        // ambulance → white vehicle with flashing sirens
        if (obs.type === 'ambulance') {
            // Body
            ctx.fillStyle = '#f2f2f2';
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            // Cab (front section, slightly darker)
            ctx.fillStyle = '#dde';
            ctx.fillRect(obs.x + obs.w * 0.7, obs.y, obs.w * 0.3, obs.h);
            // Red cross on side
            ctx.fillStyle = '#cc0000';
            const cx = obs.x + obs.w * 0.28, cy = obs.y + obs.h * 0.3;
            const cw2 = obs.w * 0.14, ch2 = obs.h * 0.4;
            ctx.fillRect(cx - cw2 / 2, cy, cw2, ch2);
            ctx.fillRect(cx - ch2 * 0.6, cy + ch2 * 0.35, ch2 * 1.2, cw2);
            // Red stripe along body
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(obs.x, obs.y + obs.h * 0.55, obs.w * 0.7, obs.h * 0.12);
            // Windows
            ctx.fillStyle = '#88ccff';
            ctx.fillRect(obs.x + obs.w * 0.72, obs.y + obs.h * 0.08, obs.w * 0.22, obs.h * 0.3);
            // Wheels
            ctx.fillStyle = '#333';
            ctx.fillRect(obs.x + obs.w * 0.1, obs.y + obs.h - 6, obs.w * 0.18, 8);
            ctx.fillRect(obs.x + obs.w * 0.68, obs.y + obs.h - 6, obs.w * 0.18, 8);
            // Siren lights on roof (flashing red ↔ blue alternating)
            const sirenPhase = Math.floor(Date.now() / 200) % 2;
            const sirenW = obs.w * 0.18, sirenH = 10;
            const sirenY = obs.y - sirenH;
            // Red light (left)
            if (sirenPhase === 0) {
                ctx.save();
                ctx.shadowColor = '#ff2200';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#ff2200';
                ctx.fillRect(obs.x + obs.w * 0.2, sirenY, sirenW, sirenH);
                ctx.restore();
            } else {
                ctx.fillStyle = '#551100';
                ctx.fillRect(obs.x + obs.w * 0.2, sirenY, sirenW, sirenH);
            }
            // Blue light (right)
            if (sirenPhase === 1) {
                ctx.save();
                ctx.shadowColor = '#0055ff';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#2255ff';
                ctx.fillRect(obs.x + obs.w * 0.55, sirenY, sirenW, sirenH);
                ctx.restore();
            } else {
                ctx.fillStyle = '#111144';
                ctx.fillRect(obs.x + obs.w * 0.55, sirenY, sirenW, sirenH);
            }
            // Drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(obs.x + 4, obs.y + obs.h, obs.w - 2, 4);
            return;
        }

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

    // ---- BOSS ----

    drawBoss(boss, accentColor, vipCompleteTime) {
        const ctx = this.ctx;

        // 8-bit Naomi with pink glow
        ctx.save();
        ctx.shadowColor = '#F860A8';
        ctx.shadowBlur = 14 + Math.sin(Date.now() * 0.006) * 6;
        this._drawPixelArt(boss.x, boss.y, boss.w, boss.h, NAOMI_GRID, NAOMI_PAL);
        ctx.restore();

        // Pixelated boob flash: triggers immediately when 3rd VIP collected, lasts 1s
        if (vipCompleteTime > 0) {
            const elapsed = Date.now() - vipCompleteTime;
            if (elapsed < 1000) {
                // Fade in 0-150ms, full 150-850ms, fade out 850-1000ms
                const t = elapsed < 150 ? elapsed / 150
                        : elapsed < 850 ? 1
                        : 1 - (elapsed - 850) / 150;
                const cw = boss.w / 16;
                const ch = boss.h / 28;
                ctx.save();
                ctx.globalAlpha = t;
                // Left chest (cols 4-6, rows 11-13)
                ctx.fillStyle = '#FFD8A8';
                ctx.fillRect(boss.x + 4 * cw, boss.y + 11 * ch, 3 * cw, 3 * ch);
                ctx.fillStyle = '#DBA870';
                ctx.fillRect(boss.x + 4 * cw, boss.y + 13 * ch, 3 * cw, ch);
                ctx.fillStyle = '#F860A8'; // nipple pixel
                ctx.fillRect(boss.x + 5 * cw, boss.y + 12 * ch, cw, ch);
                // Right chest (cols 9-11, rows 11-13)
                ctx.fillStyle = '#FFD8A8';
                ctx.fillRect(boss.x + 9 * cw, boss.y + 11 * ch, 3 * cw, 3 * ch);
                ctx.fillStyle = '#DBA870';
                ctx.fillRect(boss.x + 9 * cw, boss.y + 13 * ch, 3 * cw, ch);
                ctx.fillStyle = '#F860A8';
                ctx.fillRect(boss.x + 10 * cw, boss.y + 12 * ch, cw, ch);
                ctx.restore();
            }
        }

        // Name label above
        ctx.fillStyle = '#F860A8';
        ctx.font = 'bold 13px "Zuume", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('★ NAOMI ★', boss.x + boss.w / 2, boss.y - 8);

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(boss.x + 6, boss.y + boss.h, boss.w - 8, 6);
    }

    // ---- LEVEL TRANSITION GATE ----

    drawTransitionGate(gate) {
        const ctx = this.ctx;
        const gy = this.getGroundY();
        const gx = gate.x;
        const cw = gate.colW;   // column width each side
        const gw = gate.gapW;   // gap width
        const top = gy - gate.h;

        ctx.save();

        if (gate.lvlId === 1) {
            // ── BRANDENBURGER TOR ──────────────────────────────────────
            const stone = '#C8A060', shadow = '#906830', dark = '#604820';
            const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.003);

            // Sandstone glow
            ctx.shadowColor = '#D4A040';
            ctx.shadowBlur = 18 * pulse;

            // Left column group (2 sub-columns)
            ctx.fillStyle = stone;
            ctx.fillRect(gx, top, cw, gate.h);
            ctx.fillStyle = shadow;
            ctx.fillRect(gx, top, 6, gate.h);
            ctx.fillRect(gx + cw - 6, top, 6, gate.h);
            // sub-column divider
            ctx.fillStyle = dark;
            ctx.fillRect(gx + cw / 2 - 1, top + 20, 2, gate.h - 20);

            // Right column group
            ctx.fillStyle = stone;
            ctx.fillRect(gx + cw + gw, top, cw, gate.h);
            ctx.fillStyle = shadow;
            ctx.fillRect(gx + cw + gw, top, 6, gate.h);
            ctx.fillRect(gx + cw + gw + cw - 6, top, 6, gate.h);
            ctx.fillStyle = dark;
            ctx.fillRect(gx + cw + gw + cw / 2 - 1, top + 20, 2, gate.h - 20);

            // Entablature (horizontal beam)
            ctx.shadowBlur = 0;
            ctx.fillStyle = stone;
            ctx.fillRect(gx, top, gate.w, 28);
            ctx.fillStyle = shadow;
            ctx.fillRect(gx, top + 28, gate.w, 5); // bottom shadow of beam
            ctx.fillStyle = '#E0B870'; // highlight on top
            ctx.fillRect(gx, top, gate.w, 4);

            // Pediment (triangle) above beam
            ctx.fillStyle = stone;
            ctx.beginPath();
            ctx.moveTo(gx, top);
            ctx.lineTo(gx + gate.w / 2, top - 38);
            ctx.lineTo(gx + gate.w, top);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = shadow;
            ctx.beginPath();
            ctx.moveTo(gx, top);
            ctx.lineTo(gx + 10, top);
            ctx.lineTo(gx + gate.w / 2, top - 34);
            ctx.closePath();
            ctx.fill();

            // Quadriga silhouette on top
            ctx.fillStyle = '#704000';
            ctx.fillRect(gx + gate.w / 2 - 20, top - 52, 40, 14);
            // horses silhouette (simple blocks)
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(gx + gate.w / 2 - 22 + i * 11, top - 64, 7, 12);
            }

            // Gate arch opening hint
            ctx.fillStyle = 'rgba(200,160,60,0.18)';
            ctx.fillRect(gx + cw, gy - gate.h + 33, gw, gate.h - 33);

            // "BERLIN" label in arch
            ctx.shadowColor = '#FFD080';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#FFD080';
            ctx.font = 'bold 14px "Zuume", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('BERLIN', gx + cw + gw / 2, top + 56);

        } else if (gate.lvlId === 2) {
            // ── U-BAHN ENTRANCE ARCH ──────────────────────────────────
            const green = '#1A6B30', lightGreen = '#2EA050', tile = '#D8E8D8';
            const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.004);

            ctx.shadowColor = '#2EA050';
            ctx.shadowBlur = 16 * pulse;

            // Side walls
            ctx.fillStyle = green;
            ctx.fillRect(gx, top + 40, cw, gate.h - 40);
            ctx.fillRect(gx + cw + gw, top + 40, cw, gate.h - 40);

            // Wall tiles pattern
            ctx.fillStyle = lightGreen;
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 2; col++) {
                    const tx = gx + (col === 0 ? 4 : gx + cw + gw + 4 - gx);
                    const ty = top + 50 + row * 20;
                    const ox = col === 0 ? 4 : gx + cw + gw + 4 - gx;
                    ctx.strokeStyle = '#0A3A18';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(gx + (col === 1 ? cw + gw : 0) + 4, ty, cw - 8, 16);
                }
            }

            // Round arch over the opening
            ctx.fillStyle = green;
            ctx.beginPath();
            const archCX = gx + cw + gw / 2;
            const archR = gw / 2 + cw;
            ctx.arc(archCX, top + 40, archR, Math.PI, 0, false);
            ctx.lineTo(gx + gate.w, top + 40);
            ctx.lineTo(gx, top + 40);
            ctx.closePath();
            ctx.fill();

            // Inner arch opening (lighter to show passage)
            ctx.fillStyle = lightGreen;
            ctx.beginPath();
            ctx.arc(archCX, top + 40, archR - 8, Math.PI, 0, false);
            ctx.lineTo(gx + gate.w - 8, top + 40);
            ctx.lineTo(gx + 8, top + 40);
            ctx.closePath();
            ctx.fill();

            // "U" circle emblem
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFD700';
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(archCX, top - 4, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#003010';
            ctx.font = 'bold 26px "Zuume", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('U', archCX, top - 3);

            // Station name
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px "Zuume", monospace';
            ctx.fillText('PRENZLAUER BERG', archCX, top + 20);

        } else if (gate.lvlId === 3) {
            // ── CLUB ENTRANCE ─────────────────────────────────────────
            const darkWall = '#0a0014', neonPink = '#ff0090', neonCyan = '#00d4ff';
            const flicker = Math.random() > 0.05 ? 1 : 0.6; // occasional neon flicker

            // Dark side walls
            ctx.fillStyle = darkWall;
            ctx.fillRect(gx, top, cw, gate.h);
            ctx.fillRect(gx + cw + gw, top, cw, gate.h);

            // Neon arch outline
            ctx.shadowColor = neonPink;
            ctx.shadowBlur = 24 * flicker;
            ctx.strokeStyle = neonPink;
            ctx.lineWidth = 4;
            ctx.strokeRect(gx + 3, top + 10, cw - 6, gate.h - 10);
            ctx.strokeRect(gx + cw + gw + 3, top + 10, cw - 6, gate.h - 10);

            // Top bar connecting walls
            ctx.fillStyle = darkWall;
            ctx.fillRect(gx, top, gate.w, 50);
            ctx.shadowColor = neonPink;
            ctx.shadowBlur = 20 * flicker;
            ctx.strokeStyle = neonPink;
            ctx.lineWidth = 3;
            ctx.strokeRect(gx + 2, top + 2, gate.w - 4, 46);

            // "EINGANG" neon sign
            ctx.shadowBlur = 30 * flicker;
            ctx.fillStyle = neonPink;
            ctx.font = 'bold 20px "CHMedia", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EINGANG', gx + gate.w / 2, top + 26);

            // Cyan accent line
            ctx.shadowColor = neonCyan;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = neonCyan;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gx, top + 50);
            ctx.lineTo(gx + gate.w, top + 50);
            ctx.stroke();

            // Velvet rope (red line at mid-height of columns)
            const ropeY = top + gate.h * 0.55;
            ctx.shadowColor = '#cc0000';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#cc0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(gx + cw, ropeY);
            ctx.quadraticCurveTo(gx + cw + gw / 2, ropeY + 10, gx + cw + gw, ropeY);
            ctx.stroke();
            // Rope posts
            ctx.fillStyle = '#gold';
            ctx.fillStyle = '#D4A020';
            ctx.fillRect(gx + cw - 3, ropeY - 16, 6, 20);
            ctx.fillRect(gx + cw + gw - 3, ropeY - 16, 6, 20);

        } else {
            // ── CLUB FLOOR VICTORY ARCH (L4) ──────────────────────────
            const gold = '#FFD700', magenta = '#ff00ff';
            const t = Date.now() * 0.004;
            const pulse = 0.7 + 0.3 * Math.sin(t);

            // Gold columns
            ctx.shadowColor = gold;
            ctx.shadowBlur = 22 * pulse;
            ctx.fillStyle = '#B89000';
            ctx.fillRect(gx, top + 20, cw, gate.h - 20);
            ctx.fillRect(gx + cw + gw, top + 20, cw, gate.h - 20);
            // Gold highlight edge
            ctx.fillStyle = gold;
            ctx.fillRect(gx, top + 20, 4, gate.h - 20);
            ctx.fillRect(gx + cw - 4, top + 20, 4, gate.h - 20);
            ctx.fillRect(gx + cw + gw, top + 20, 4, gate.h - 20);
            ctx.fillRect(gx + cw + gw + cw - 4, top + 20, 4, gate.h - 20);

            // Arch beam
            ctx.fillStyle = '#B89000';
            ctx.fillRect(gx, top + 20, gate.w, 26);
            ctx.fillStyle = gold;
            ctx.fillRect(gx, top + 20, gate.w, 4);
            ctx.fillRect(gx, top + 42, gate.w, 3);

            // Glowing arch curve
            ctx.shadowColor = magenta;
            ctx.shadowBlur = 28 * pulse;
            ctx.strokeStyle = magenta;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(gx + gate.w / 2, top + 46, gate.w / 2 - 4, Math.PI, 0);
            ctx.stroke();

            // Star burst centre
            ctx.shadowColor = gold;
            ctx.shadowBlur = 30;
            ctx.fillStyle = gold;
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', gx + gate.w / 2, top + 6);

            // "VIP FLOOR" text
            ctx.fillStyle = gold;
            ctx.font = 'bold 16px "CHMedia", sans-serif';
            ctx.fillText('VIP FLOOR', gx + gate.w / 2, top + 62);

            // Confetti pixels
            const colors = ['#ff00ff', '#ffd700', '#00d4ff', '#ff0090', '#ffffff'];
            const seed = Math.floor(Date.now() / 80);
            for (let i = 0; i < 18; i++) {
                const cx2 = gx + (((seed * 31 + i * 17) % 180));
                const cy2 = top + (((seed * 13 + i * 29) % 260));
                ctx.fillStyle = colors[i % colors.length];
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 6;
                ctx.fillRect(cx2, cy2, 4, 4);
            }
        }

        ctx.restore();
    }

    // ---- PIXEL ART HELPER ----

    // Draws a pixel-art grid scaled to fit (x,y,w,h).
    // grid: array of equal-length strings; palette: char→hex map; '.' = transparent.
    _drawPixelArt(x, y, w, h, grid, palette) {
        const ctx = this.ctx;
        const rows = grid.length;
        const cols = grid[0].length;
        const cw = w / cols;
        const ch = h / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ch_code = grid[r][c];
                if (ch_code === '.') continue;
                const color = palette[ch_code];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(
                    Math.floor(x + c * cw),
                    Math.floor(y + r * ch),
                    Math.ceil(cw),
                    Math.ceil(ch)
                );
            }
        }
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
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(col.x, col.y, col.w, col.h);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(col.x + 1, col.y + 1, col.w - 2, col.h - 2);
            const lineH = col.h * 0.32;
            ctx.font = `bold ${Math.floor(col.w * 0.32)}px "Zuume", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('JWS', col.x + col.w / 2, col.y + lineH);
            ctx.fillStyle = '#ffd700';
            ctx.fillText('VIP', col.x + col.w / 2, col.y + col.h - lineH);
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

        // HUD bar — full width, taller for desktop
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, this.W, 48);

        // Score (left)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Zuume", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE  ${score.toLocaleString()}`, 16, 31);

        // Multiplier next to score
        if (multiplier > 1) {
            ctx.fillStyle = accentColor;
            ctx.font = 'bold 18px "Zuume", monospace';
            ctx.fillText(`×${multiplier.toFixed(1)}`, 200, 31);
        }

        // Level (center)
        ctx.textAlign = 'center';
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 16px "Zuume", monospace';
        ctx.fillText(`— LEVEL ${levelId} —`, this.W / 2, 20);

        // VIP stickers (center below level)
        if (hasBoss) {
            ctx.font = '14px monospace';
            ctx.fillStyle = '#ffd700';
            const filled = Math.min(vipStickers || 0, 3);
            const empty = 3 - filled;
            ctx.fillText('VIP  ' + '\u2B50'.repeat(filled) + '\u25CB'.repeat(empty), this.W / 2, 40);
        }

        // Lives (right)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#e74c3c';
        ctx.font = '22px sans-serif';
        let livesStr = '';
        for (let i = 0; i < lives; i++) livesStr += '\u2665 ';
        ctx.fillText(livesStr.trim(), this.W - 16, 32);
    }

    drawProgressBar(progress, accentColor) {
        const ctx = this.ctx;
        const barY = 48;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, barY, this.W, 4);

        ctx.fillStyle = accentColor;
        ctx.fillRect(0, barY, this.W * Math.min(progress, 1), 4);

        // Finish flag
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(this.W - 6, barY - 2, 6, 8);
    }

    drawKeyboardHints(alpha) {
        if (alpha <= 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;

        const gy = this.getGroundY();
        const hints = [
            { key: 'SPACE / ↑', label: 'JUMP',  color: '#00d4ff' },
            { key: '↓  /  S',   label: 'DUCK',  color: '#ff0090' },
            { key: 'P / ESC',   label: 'PAUSE', color: '#ffd700' },
        ];

        const bw = 160, bh = 44, gap = 14;
        const totalW = hints.length * bw + (hints.length - 1) * gap;
        let bx = (this.W - totalW) / 2;
        const by = gy + 8;

        // Dark backdrop behind all tiles
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(bx - 12, by - 6, totalW + 24, bh + 12);

        hints.forEach(h => {
            // Tile background
            ctx.fillStyle = h.color + '33';
            ctx.fillRect(bx, by, bw, bh);
            // Solid border
            ctx.strokeStyle = h.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            // Action label (big, colored)
            ctx.fillStyle = h.color;
            ctx.font = 'bold 18px "Zuume", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(h.label, bx + bw / 2, by + 20);

            // Key label (smaller, white)
            ctx.fillStyle = '#ffffff';
            ctx.font = '13px "Zuume", monospace';
            ctx.fillText(`[ ${h.key} ]`, bx + bw / 2, by + 37);

            bx += bw + gap;
        });

        ctx.restore();
    }

    drawDarkBg() {
        this.ctx.fillStyle = '#050010';
        this.ctx.fillRect(0, 0, this.W, this.H);
    }

    getGroundY() {
        // Desktop: ground at 76% of height (leaves room for ground + keyboard hints below)
        return Math.floor(this.H * 0.76);
    }
}
