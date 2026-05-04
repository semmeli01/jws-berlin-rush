// =============================================
// JWS: BERLIN RUSH — Cast Characters (Staffel 8)
// Copyright © 2026 Yanick Semmler. All rights reserved.
// Game created by Yanick Semmler.
// Publicly visible, not open source.
// =============================================

const CHARACTERS = [
    {
        id: 'diego',
        name: 'Diego',
        age: 21,
        origin: 'Adlikon ZH',
        bodyColor: '#e67e22',
        ability: 'triple_jump',
        abilityName: '3-WAY JUMP',
        abilityDesc: 'Dreierkuss-Modus: Dreifach-Sprung möglich',
        maxJumps: 3,
        photoSrc: 'img/chars/diego.jpg',
        sprite: {
            skinColor: '#c8956c',
            hairColor: '#111111',
            hairLen: 'short',
            hairStyle: 'side_part',   // slicked to one side
            hat: null,
            topColor: '#f0f0f0',      // white shirt
            topStyle: 'shirt',
            pantsColor: '#2c3e50',
            accessories: ['watch_r'], // watch on right wrist
            necklaceColor: null
        }
    },
    {
        id: 'nils',
        name: 'Nils',
        age: 23,
        origin: 'Stüsslingen SO',
        bodyColor: '#c0392b',
        ability: 'shield',
        abilityName: 'KOMMENTAR-SCHILD',
        abilityDesc: 'Nils\' Aussage schützt vor einem Treffer',
        maxJumps: 2,
        photoSrc: 'img/chars/nils.jpg',
        sprite: {
            skinColor: '#f5cba7',
            hairColor: '#2c1810',
            hairLen: 'medium',
            hairStyle: 'wavy',        // wavy, slightly wild
            hat: null,
            topColor: '#d4789a',      // pink/mauve cardigan
            topStyle: 'cardigan',
            topInner: '#222222',      // black tee underneath
            pantsColor: '#1a1a2e',
            accessories: [],
            necklaceColor: null
        }
    },
    {
        id: 'anastasia',
        name: 'Anastasia',
        age: 20,
        origin: 'Eschenbach SG',
        bodyColor: '#8e44ad',
        ability: 'double_collect',
        abilityName: 'DOPPEL-COLLECT',
        abilityDesc: 'Alle Collectibles zählen doppelt',
        maxJumps: 2,
        photoSrc: 'img/chars/ana.jpg',
        sprite: {
            skinColor: '#d4a574',
            hairColor: '#5c3317',
            hairLen: 'long',
            hairStyle: 'straight',    // long sleek straight
            hat: null,
            topColor: '#111111',      // black halter
            topStyle: 'halter',
            pantsColor: '#1a1a2e',
            accessories: ['necklace', 'tattoo_l'],
            necklaceColor: '#d4d4d4'  // silver chain
        }
    },
    {
        id: 'eric',
        name: 'Eric',
        age: 22,
        origin: 'Kriens LU',
        bodyColor: '#2980b9',
        ability: 'speed_boost',
        abilityName: 'TURBO-SPRINT',
        abilityDesc: 'Permanenter Speed-Boost dank Adrenalinstoß',
        maxJumps: 2,
        photoSrc: 'img/chars/eric.jpg',
        sprite: {
            skinColor: '#f5cba7',
            hairColor: '#c8a060',     // light blonde
            hairLen: 'short',
            hairStyle: 'tousled',
            hat: { type: 'beanie', color: '#2c2c2c' }, // dark beanie
            topColor: '#f0f0f0',      // white tank
            topStyle: 'tank',
            pantsColor: '#3a6ea8',    // blue jeans
            accessories: [],
            necklaceColor: null
        }
    },
    {
        id: 'timmo',
        name: 'Timmo',
        age: 21,
        origin: 'Reigoldswil BL',
        bodyColor: '#27ae60',
        ability: 'extra_life',
        abilityName: '50-EURO-TROST',
        abilityDesc: 'Startet mit einem Extra-Leben',
        maxJumps: 2,
        photoSrc: 'img/chars/timmo.jpg',
        sprite: {
            skinColor: '#d4a574',
            hairColor: '#2c1810',
            hairLen: 'medium',
            hairStyle: 'straight',
            hat: { type: 'cap', color: '#1a3a6e' }, // blue baseball cap
            topColor: '#b09ccc',      // lavender/purple shirt
            topStyle: 'shirt',
            pantsColor: '#1a1a2e',
            accessories: ['rainbow_neck'],
            necklaceColor: null
        }
    },
    {
        id: 'alexander',
        name: 'Alexander',
        age: 20,
        origin: 'Balsthal SO',
        bodyColor: '#d35400',
        ability: 'magnet',
        abilityName: 'CHARME-MAGNET',
        abilityDesc: 'Collectibles werden magnetisch angezogen',
        maxJumps: 2,
        photoSrc: 'img/chars/alex.jpg',
        sprite: {
            skinColor: '#f5cba7',
            hairColor: '#c8a060',     // light/blonde, spiked up
            hairLen: 'short',
            hairStyle: 'spiked',      // pointing upward
            hat: null,
            topColor: '#111111',      // black v-neck
            topStyle: 'vneck',
            pantsColor: '#2c2c2c',
            accessories: ['tattoo_r', 'tattoo_l', 'watch_r'],
            necklaceColor: null
        }
    },
    {
        id: 'martha',
        name: 'Martha',
        age: 21,
        origin: 'Oltingen BL',
        bodyColor: '#e91e8c',
        ability: 'double_jump',
        abilityName: 'DOPPELSPRUNG',
        abilityDesc: 'Kann einmal in der Luft nochmal springen',
        maxJumps: 2,
        photoSrc: 'img/chars/martha.jpg',
        sprite: {
            skinColor: '#f5cba7',
            hairColor: '#0a0a0a',     // jet black
            hairLen: 'long',
            hairStyle: 'straight',    // very long, sleek
            hat: null,
            topColor: '#6b0f1a',      // deep burgundy/red dress
            topStyle: 'dress',
            pantsColor: '#6b0f1a',    // same as dress
            accessories: ['necklace'],
            necklaceColor: '#ffd700'  // gold pendant
        }
    },
    {
        id: 'lia',
        name: 'Lia',
        age: 20,
        origin: 'Lyss BE',
        bodyColor: '#16a085',
        ability: 'slow_obstacles',
        abilityName: 'DRAMA-CHILL',
        abilityDesc: 'Obstacles bewegen sich 15% langsamer',
        maxJumps: 2,
        photoSrc: 'img/chars/lia.jpg',
        sprite: {
            skinColor: '#fce5d0',
            hairColor: '#d4b86a',     // blonde/honey
            hairLen: 'medium',
            hairStyle: 'voluminous',  // shoulder length with volume
            hat: null,
            topColor: '#2a6bcc',      // blue/white stripes
            topStyle: 'stripes',
            topStripe: '#f0f0f0',     // white stripes
            pantsColor: '#c8d8e8',    // light jeans
            accessories: [],
            necklaceColor: null
        }
    },
    {
        id: 'jamie',
        name: 'Jamie',
        age: 22,
        origin: 'Thun BE',
        bodyColor: '#f39c12',
        ability: 'double_jump',
        abilityName: 'CLUB-HOP',
        abilityDesc: 'Doppelsprung für maximale Bewegungsfreiheit',
        maxJumps: 2,
        photoSrc: 'img/chars/jamie.jpg',
        sprite: {
            skinColor: '#c8956c',
            hairColor: '#2c1810',     // dark brown, short textured
            hairLen: 'short',
            hairStyle: 'textured',
            hat: null,
            topColor: '#6b8c42',      // olive/sage green
            topStyle: 'shirt',
            pantsColor: '#2c2c2c',
            accessories: ['necklace', 'watch_l'],
            necklaceColor: '#d4d4d4'  // silver chain
        }
    },
    {
        id: 'shinara',
        name: 'Shinara',
        age: 20,
        origin: 'Buchs ZH',
        bodyColor: '#7d3c98',
        ability: 'score_boost',
        abilityName: 'STAR-POWER',
        abilityDesc: 'Score-Multiplikator startet bei ×2',
        maxJumps: 2,
        photoSrc: 'img/chars/shinara.jpg',
        sprite: {
            skinColor: '#fce5d0',
            hairColor: '#d4b86a',     // blonde/light, long wavy — hangs below cap
            hairLen: 'long',
            hairStyle: 'wavy',
            hat: { type: 'cap', color: '#cc1111' }, // red baseball cap
            topColor: '#8b7355',      // khaki/brown oversized shirt
            topStyle: 'shirt',
            pantsColor: '#1a1a2e',
            accessories: [],
            necklaceColor: null
        }
    },
    {
        id: 'alina',
        name: 'Alina',
        age: 19,
        origin: 'Matzingen TG',
        bodyColor: '#ff69b4',
        ability: 'shield',
        abilityName: 'GEHEIMES LÄCHELN',
        abilityDesc: 'Schützt vor dem ersten Treffer',
        maxJumps: 2,
        photoSrc: 'img/chars/alina.jpg',
        sprite: {
            skinColor: '#fce5d0',
            hairColor: '#8b6330',     // caramel/warm brown
            hairLen: 'long',
            hairStyle: 'straight',
            hat: null,
            topColor: '#111111',      // black velvet halter
            topStyle: 'halter',
            pantsColor: '#1a1a2e',
            accessories: [],
            necklaceColor: null
        }
    },
    {
        id: 'erica',
        name: 'Erica',
        age: 20,
        origin: 'Hüttwilen TG',
        bodyColor: '#e74c3c',
        ability: 'heart_triple',
        abilityName: 'FLIRT-POWER',
        abilityDesc: 'Herzen geben dreifache Punkte',
        maxJumps: 2,
        photoSrc: 'img/chars/erica.jpg',
        sprite: {
            skinColor: '#d4a574',
            hairColor: '#6b3a2a',     // brown, wavy, long
            hairLen: 'long',
            hairStyle: 'wavy',
            hat: null,
            topColor: '#111111',      // black crop top
            topStyle: 'crop',
            pantsColor: '#1a1a2e',
            accessories: ['tattoo_r', 'tattoo_l'],
            necklaceColor: null
        }
    },
    {
        id: 'sandro',
        name: 'Sandro',
        age: 21,
        origin: 'Greifensee ZH',
        bodyColor: '#3498db',
        ability: 'speed_boost',
        abilityName: 'FLIRT-SPRINT',
        abilityDesc: 'Erhöhte Startgeschwindigkeit',
        maxJumps: 2,
        photoSrc: 'img/chars/sandro.jpg',
        sprite: {
            skinColor: '#c8956c',
            hairColor: '#2c1810',     // dark, short
            hairLen: 'short',
            hairStyle: 'textured',
            hat: null,
            topColor: '#111111',      // black tank
            topStyle: 'tank',
            pantsColor: '#1a1a2e',
            accessories: ['rainbow_head'],  // rainbow headband on forehead
            necklaceColor: null
        }
    },
    {
        id: 'ermioni',
        name: 'Ermioni',
        age: 20,
        origin: 'Zofingen AG',
        bodyColor: '#1abc9c',
        ability: 'shot_double',
        abilityName: 'PARTY-BOOST',
        abilityDesc: 'Shot-Gläser geben doppelte Punkte',
        maxJumps: 2,
        photoSrc: 'img/chars/ermioni.jpg',
        sprite: {
            skinColor: '#fce5d0',
            hairColor: '#d4b86a',     // blonde, wavy, long
            hairLen: 'long',
            hairStyle: 'wavy',
            hat: null,
            topColor: '#cc2200',      // red bandeau top
            topStyle: 'crop',
            pantsColor: '#1a1a2e',
            accessories: ['watch_l'],
            necklaceColor: null
        }
    }
];
