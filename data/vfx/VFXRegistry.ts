
import { VFXAsset } from "../../types/VFXSchema";

// ==========================================
// 📚 VFX ASSET DATABASE
// ==========================================

export const VFX_REGISTRY: Record<string, VFXAsset> = {
    
    // --- 0. SYSTEM / GENERIC EVENTS ---
    
    'FX_TELEPORT': {
        id: 'FX_TELEPORT',
        description: 'Unit spawn/teleport effect',
        emitters: [
            {
                particleType: 'SHOCKWAVE',
                count: 1,
                lifetime: [0.4, 0.6],
                size: [40, 80],
                speed: [0, 0],
                colors: ['#fff'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'PILLAR',
                visualStyle: 'PILLAR_HOLY', // Using Style Registry
                count: 1,
                lifetime: [0.5, 0.5],
                size: [30, 40],
                speed: [0, 0],
                colors: ['#fff'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            }
        ]
    },

    'FX_CAST_BREAK': {
        id: 'FX_CAST_BREAK',
        description: 'Interrupt shatter',
        emitters: [
            {
                particleType: 'BLAST',
                count: 1,
                lifetime: [0.2, 0.2],
                size: [40, 60],
                speed: [0, 0],
                colors: ['#fff'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'SHARD',
                count: [6, 10],
                lifetime: [0.4, 0.7],
                size: [6, 10],
                speed: [150, 300],
                gravity: 800,
                colors: ['#cbd5e1'],
                shape: 'BURST_DIR',
                delay: 0
            }
        ]
    },

    'FX_BLOOD_RITUAL': {
        id: 'FX_BLOOD_RITUAL',
        description: 'Red faction hit',
        emitters: [
            {
                particleType: 'BLAST',
                count: 1,
                lifetime: [0.3, 0.3],
                size: [50, 70],
                speed: [0, 0],
                colors: ['#7f1d1d'],
                shape: 'POINT',
                blendMode: 'multiply', // Darken
                delay: 0
            },
            {
                particleType: 'SMOKE',
                count: [8, 12],
                lifetime: [1.0, 1.5],
                size: [20, 35],
                speed: [20, 50],
                colors: ['#991b1b', '#7f1d1d'],
                shape: 'CIRCLE',
                shapeRadius: 20,
                drag: 0.1,
                delay: 0
            }
        ]
    },

    // --- GRID IMPACTS ---
    'FX_GRID_IMPACT_BLUE': {
        id: 'FX_GRID_IMPACT_BLUE',
        description: 'Imperial Tech Grid Flash',
        emitters: [
            {
                particleType: 'GRID_FIELD',
                visualStyle: 'GRID_TECH_BLUE', // Explicit Style
                count: 1,
                lifetime: [0.8, 1.0],
                size: [36, 36], // Fits exactly on tile
                speed: [0, 0],
                colors: ['#3b82f6'], // Blue
                shape: 'POINT',
                locked: true,
                blendMode: 'screen',
                delay: 0
            }
        ]
    },
    'FX_GRID_IMPACT_RED': {
        id: 'FX_GRID_IMPACT_RED',
        description: 'Covenant Corruption Flash',
        emitters: [
            {
                particleType: 'GRID_FIELD',
                visualStyle: 'GRID_CORRUPT_RED', // Explicit Style
                count: 1,
                lifetime: [1.0, 1.2],
                size: [36, 36],
                speed: [0, 0],
                colors: ['#ef4444'], // Red
                shape: 'POINT',
                locked: true,
                blendMode: 'lighter',
                delay: 0
            }
        ]
    },
    'FX_GRID_IMPACT_VOID': {
        id: 'FX_GRID_IMPACT_VOID',
        description: 'Void Gravity Flash',
        emitters: [
            {
                particleType: 'GRID_FIELD',
                visualStyle: 'GRID_VOID', // Explicit Style
                count: 1,
                lifetime: [1.2, 1.5],
                size: [36, 36],
                speed: [0, 0],
                colors: ['#7c3aed'], // Purple
                shape: 'POINT',
                locked: true,
                blendMode: 'source-over', // Darken effect
                delay: 0
            }
        ]
    },

    // --- 1. GENERIC PHYSICAL (Slash/Smash) ---
    'FX_IMPACT_PHYSICAL': {
        id: 'FX_IMPACT_PHYSICAL',
        description: 'Standard physical hit (Flash + Sparks)',
        emitters: [
            {
                particleType: 'BLAST',
                count: 1,
                lifetime: [0.2, 0.2],
                size: [50, 70], // Increased size
                speed: [0, 0],
                colors: ['#ffffff'], 
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'CHIP', // Debris
                count: [6, 8],
                lifetime: [0.4, 0.6],
                size: [4, 6],
                speed: [300, 500], // Faster debris
                gravity: 900,
                colors: ['#e2e8f0', '#cbd5e1'], // Concrete colors
                shape: 'BURST_DIR',
                delay: 0
            },
            {
                particleType: 'SHOCKWAVE',
                count: 1,
                lifetime: [0.2, 0.3],
                size: [40, 60],
                speed: [0, 0],
                colors: ['#ffffff'],
                shape: 'POINT',
                blendMode: 'overlay',
                delay: 0
            }
        ]
    },

    // --- 2. FIRE IMPACT ---
    'FX_IMPACT_FIRE': {
        id: 'FX_IMPACT_FIRE',
        description: 'Fireball explosion',
        emitters: [
            {
                particleType: 'BLAST', // Core Flash
                count: 1,
                lifetime: [0.3, 0.3],
                size: [60, 80],
                speed: [0, 0],
                colors: ['#fef08a'], // Yellow core
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'SMOKE', // Fire Cloud
                count: [6, 10],
                lifetime: [0.5, 0.8],
                size: [30, 50],
                speed: [50, 150],
                colors: ['#ef4444', '#f97316'], // Red/Orange
                shape: 'CIRCLE',
                shapeRadius: 10,
                blendMode: 'screen',
                delay: 0,
                drag: 0.1
            },
            {
                particleType: 'SPARK', // Embers
                count: [8, 12],
                lifetime: [0.4, 0.7],
                size: [2, 4],
                speed: [200, 500],
                colors: ['#fcd34d', '#fbbf24'],
                shape: 'BURST_DIR',
                blendMode: 'lighter',
                delay: 0
            }
        ]
    },

    // --- 3. ICE IMPACT ---
    'FX_IMPACT_ICE': {
        id: 'FX_IMPACT_ICE',
        description: 'Ice shatter',
        emitters: [
            {
                particleType: 'SHOCKWAVE', // Ring
                count: 1,
                lifetime: [0.4, 0.4],
                size: [60, 90],
                speed: [0, 0],
                colors: ['#bae6fd'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'SHARD', // Ice pieces
                count: [6, 10],
                lifetime: [0.5, 0.8],
                size: [8, 15],
                speed: [150, 300],
                gravity: 600,
                colors: ['#e0f2fe', '#bae6fd'],
                shape: 'BURST_DIR',
                delay: 0,
                vRotation: [10, 30] // Spinning shards
            },
            {
                particleType: 'GLOW', // Cold Mist
                count: [3, 5],
                lifetime: [0.6, 1.0],
                size: [40, 60],
                speed: [20, 50],
                colors: ['#bfdbfe'],
                shape: 'CIRCLE',
                blendMode: 'screen',
                delay: 0
            }
        ]
    },

    // --- 4. HOLY/LIGHT IMPACT ---
    'FX_IMPACT_HOLY': {
        id: 'FX_IMPACT_HOLY',
        description: 'Divine light burst',
        emitters: [
            {
                particleType: 'PILLAR', // Vertical beam flash
                visualStyle: 'PILLAR_HOLY',
                count: 1,
                lifetime: [0.3, 0.3],
                size: [30, 40],
                speed: [0, 0],
                colors: ['#fef08a'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'GLOW',
                count: 1,
                lifetime: [0.4, 0.6],
                size: [60, 100],
                speed: [0, 0],
                colors: ['#fef9c3'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'SPARK',
                count: [5, 8],
                lifetime: [0.4, 0.6],
                size: [3, 6],
                speed: [100, 300],
                colors: ['#facc15'],
                shape: 'BURST_DIR',
                blendMode: 'lighter',
                delay: 0
            }
        ]
    },

    // --- 5. ARCANE IMPACT ---
    'FX_IMPACT_ARCANE': {
        id: 'FX_IMPACT_ARCANE',
        description: 'Magic burst',
        emitters: [
            {
                particleType: 'BLAST',
                count: 1,
                lifetime: [0.3, 0.3],
                size: [50, 70],
                speed: [0, 0],
                colors: ['#d8b4fe'],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            {
                particleType: 'SHOCKWAVE',
                count: 1,
                lifetime: [0.4, 0.4],
                size: [40, 80],
                speed: [0, 0],
                colors: ['#a855f7'],
                shape: 'POINT',
                blendMode: 'lighter',
                delay: 0.1
            },
            {
                particleType: 'SPARK',
                count: [6, 10],
                lifetime: [0.5, 0.8],
                size: [2, 4],
                speed: [100, 250],
                colors: ['#c084fc', '#e9d5ff'],
                shape: 'BURST_DIR',
                blendMode: 'lighter',
                delay: 0
            }
        ]
    },

    // --- 6. LIGHTNING IMPACT ---
    'FX_IMPACT_LIGHTNING': {
        id: 'FX_IMPACT_LIGHTNING',
        description: 'Electric shock',
        emitters: [
            {
                particleType: 'BLAST',
                count: 1,
                lifetime: [0.1, 0.2],
                size: [40, 60],
                speed: [0, 0],
                colors: ['#ffffff'],
                shape: 'POINT',
                blendMode: 'lighter',
                delay: 0
            },
            {
                particleType: 'SPARK',
                count: [8, 12],
                lifetime: [0.2, 0.4],
                size: [2, 3],
                speed: [300, 600],
                colors: ['#60a5fa', '#facc15'], // Blue/Yellow sparks
                shape: 'BURST_DIR',
                blendMode: 'lighter',
                delay: 0
            }
        ]
    },

    // --- 7. POISON IMPACT ---
    'FX_IMPACT_POISON': {
        id: 'FX_IMPACT_POISON',
        description: 'Toxic splash',
        emitters: [
            {
                particleType: 'SMOKE',
                count: [5, 8],
                lifetime: [0.8, 1.2],
                size: [20, 40],
                speed: [50, 100],
                colors: ['#a3e635', '#4ade80'],
                shape: 'CIRCLE',
                shapeRadius: 15,
                blendMode: 'source-over',
                delay: 0,
                drag: 0.1
            },
            {
                particleType: 'CHIP', // Liquid drops
                count: [4, 6],
                lifetime: [0.4, 0.6],
                size: [3, 5],
                speed: [100, 200],
                gravity: 600,
                colors: ['#84cc16'],
                shape: 'BURST_DIR',
                delay: 0
            }
        ]
    },

    // --- 8. VOID IMPACT ---
    'FX_IMPACT_VOID': {
        id: 'FX_IMPACT_VOID',
        description: 'Dark energy hit',
        emitters: [
            {
                particleType: 'BLAST',
                count: 1,
                lifetime: [0.3, 0.3],
                size: [60, 80],
                speed: [0, 0],
                colors: ['#000000'],
                shape: 'POINT',
                blendMode: 'source-over', // Darken
                delay: 0
            },
            {
                particleType: 'GLOW',
                count: [3, 5],
                lifetime: [0.5, 0.8],
                size: [30, 50],
                speed: [20, 60],
                colors: ['#581c87', '#7e22ce'],
                shape: 'BURST_DIR',
                blendMode: 'lighter',
                delay: 0
            }
        ]
    },

    // --- 9. BLOOD IMPACT ---
    'FX_IMPACT_BLOOD': {
        id: 'FX_IMPACT_BLOOD',
        description: 'Blood splatter',
        emitters: [
            {
                particleType: 'CHIP', // Liquid drops
                count: [8, 12],
                lifetime: [0.4, 0.7],
                size: [4, 7],
                speed: [150, 450],
                gravity: 1000,
                colors: ['#991b1b', '#b91c1c'],
                shape: 'BURST_DIR',
                delay: 0
            },
            {
                particleType: 'SMOKE', // Mist
                count: 3,
                lifetime: [0.3, 0.5],
                size: [25, 40],
                speed: [50, 100],
                colors: ['#7f1d1d'],
                shape: 'POINT',
                blendMode: 'source-over',
                delay: 0
            },
            {
                particleType: 'BLAST', // Wet Core
                count: 1,
                lifetime: [0.2, 0.2],
                size: [40, 50],
                speed: [0, 0],
                colors: ['#450a0a'],
                shape: 'POINT',
                blendMode: 'source-over',
                delay: 0
            }
        ]
    }
};
