// =============================================
// JWS: BERLIN RUSH — Level Configurations
// =============================================

const LEVELS = [
    {
        id: 1,
        name: 'BERLINER\nHAUPTBAHNHOF',
        description: 'Berlin calling! Navigiere dich durch den chaotischen Hauptbahnhof und reach die Innenstadt.',
        scrollSpeed: 240,          // px/s
        speedIncreaseRate: 8,      // px/s per second
        levelGoalDistance: 5000,   // px of scrolling to complete
        // Colors
        skyTop: '#0a1628',
        skyBottom: '#1a2a4a',
        groundColor: '#1f4a7a',
        groundTop: '#4a9edd',
        platformTileColor: '#163a5c',
        accentColor: '#00d4ff',
        buildingColorFar: '#0d1f3c',
        buildingColorNear: '#0a1628',
        // Obstacle types available in this level
        obstacleTypes: ['suitcase', 'tourist', 'stairs', 'bouncer', 'drama_bubble'],
        obstacleMinGap: 1.6,      // min seconds between obstacles
        obstacleMaxGap: 3.2,
        collectibleMinGap: 0.9,
        collectibleMaxGap: 2.2,
        hasBoss: false,
        // Background elements
        bgElements: ['stars', 'buildings', 'train_signs']
    },
    {
        id: 2,
        name: 'PRENZLAUER\nBERG',
        description: 'Durch Graffiti-Wände und U-Bahn-Stationen – weiter zum nächsten Spot!',
        scrollSpeed: 290,
        speedIncreaseRate: 10,
        levelGoalDistance: 6500,
        skyTop: '#0d0020',
        skyBottom: '#1a0a2e',
        groundColor: '#3a1260',
        groundTop: '#7b32a0',
        platformTileColor: '#2c0e4a',
        accentColor: '#ff0090',
        buildingColorFar: '#12003a',
        buildingColorNear: '#0a0020',
        obstacleTypes: ['bouncer', 'paparazzi', 'ex_char', 'tourist', 'stairs', 'drama_bubble'],
        obstacleMinGap: 1.4,
        obstacleMaxGap: 2.8,
        collectibleMinGap: 0.8,
        collectibleMaxGap: 2.0,
        hasBoss: false,
        bgElements: ['stars', 'graffiti', 'street_lights']
    },
    {
        id: 3,
        name: 'CLUB-\nEINGANG',
        description: 'Türsteher, lange Schlangen und pures Drama. Sammle 3 VIP-Sticker für den Boss-Fight!',
        scrollSpeed: 320,
        speedIncreaseRate: 12,
        levelGoalDistance: 7000,
        skyTop: '#000010',
        skyBottom: '#0a0a1a',
        groundColor: '#1a1a3a',
        groundTop: '#3a3aaa',
        platformTileColor: '#111128',
        accentColor: '#ffd700',
        buildingColorFar: '#080818',
        buildingColorNear: '#050510',
        obstacleTypes: ['bouncer', 'drama_bubble', 'paparazzi', 'ex_char', 'ambulance'],
        obstacleMinGap: 1.2,
        obstacleMaxGap: 2.5,
        collectibleMinGap: 0.7,
        collectibleMaxGap: 1.8,
        hasBoss: false,
        vipStickersNeeded: 3,
        bgElements: ['neon_signs', 'crowd', 'red_ropes']
    },
    {
        id: 4,
        name: 'CLUB\nFLOOR',
        description: 'Strobo, Chaos und volle Power! Das ist das Finale – Berlin Nacht! Sammle 3 VIP-Sticker für den Boss-Fight!',
        scrollSpeed: 370,
        speedIncreaseRate: 15,
        levelGoalDistance: 8000,
        skyTop: '#020008',
        skyBottom: '#0a0020',
        groundColor: '#1a0030',
        groundTop: '#6600aa',
        platformTileColor: '#100020',
        accentColor: '#ff00ff',
        buildingColorFar: '#080015',
        buildingColorNear: '#040010',
        obstacleTypes: ['bouncer', 'drama_bubble', 'ambulance', 'ex_char', 'paparazzi'],
        obstacleMinGap: 1.0,
        obstacleMaxGap: 2.2,
        collectibleMinGap: 0.6,
        collectibleMaxGap: 1.5,
        hasBoss: true,
        vipStickersNeeded: 3,
        bgElements: ['strobe', 'lasers', 'dj_booth']
    }
];

// Obstacle definitions: geometry + visual config
const OBSTACLE_DEFS = {
    suitcase: {
        w: 58, h: 52,
        groundOffset: 0,   // sits on ground
        color: '#8b6914',
        accentColor: '#c9a227',
        needsJump: true,
        needsDuck: false,
        label: '🧳'
    },
    tourist: {
        w: 76, h: 76,
        groundOffset: 0,
        color: '#4a90d9',
        accentColor: '#7ab8f8',
        needsJump: true,
        needsDuck: false,
        label: '🗺'
    },
    stairs: {
        w: 70, h: 32,
        groundOffset: 0,
        color: '#666677',
        accentColor: '#9999aa',
        needsJump: false,
        needsDuck: false, // stepped — jump or duck
        label: '▲'
    },
    bouncer: {
        w: 44, h: 84,
        groundOffset: 0,
        color: '#1a1a3a',
        accentColor: '#4444cc',
        needsJump: true,
        needsDuck: false,
        label: '🚫'
    },
    paparazzi: {
        w: 36, h: 70,
        groundOffset: 0,
        color: '#885500',
        accentColor: '#ffcc00',
        needsJump: true,
        needsDuck: false,
        label: '📸'
    },
    ex_char: {
        w: 36, h: 68,
        groundOffset: 0,
        color: '#7b0000',
        accentColor: '#dd2222',
        needsJump: true,
        needsDuck: false,
        label: '💔'
    },
    drama_bubble: {
        w: 220, h: 50,
        groundOffset: 48,  // requires duck (between duck-height 42 and stand-height 74)
        color: '#55106a',
        accentColor: '#aa40cc',
        needsJump: false,
        needsDuck: true,
        label: '💬'
    },
    ambulance: {
        w: 150, h: 72,
        groundOffset: 0,
        color: '#aa0000',
        accentColor: '#ff3300',
        needsJump: true,
        needsDuck: false,
        label: '🚑'
    }
};

// Collectible definitions
const COLLECTIBLE_DEFS = {
    shot: {
        w: 24, h: 30,
        heightRange: [20, 50],  // px above ground
        color: '#f39c12',
        glowColor: '#f39c1266',
        points: 10,
        label: '🥃'
    },
    heart: {
        w: 28, h: 26,
        heightRange: [80, 150],
        color: '#e74c3c',
        glowColor: '#e74c3c66',
        points: 0,   // gives life, not points
        label: '♥'
    },
    star: {
        w: 30, h: 30,
        heightRange: [120, 200],
        color: '#ffd700',
        glowColor: '#ffd70066',
        points: 25,
        label: '★'
    },
    oneplus: {
        w: 54, h: 54,
        heightRange: [160, 240],
        color: '#ff3300',
        glowColor: '#ff330066',
        points: 50,
        label: '1+'
    }
};
