
// =========================================================================================
// 😵 STATUS VISUAL CONFIGURATION
// 
// Defines how buffs, debuffs, and control effects look across the UI and Game World.
// Usage: Used by UIFactory (Icons), UnitVisuals (Overhead), and GridOverlays (Floor).
// =========================================================================================

export type StatusIconShape = 'SPIRAL' | 'MUTE_BUBBLE' | 'SKULL' | 'FLAME' | 'CROSS' | 'GHOST' | 'SHEEP' | 'SHIELD' | 'NONE';
export type OverheadEffect = 'STAR_SPIN' | 'BUBBLE_POP' | 'GHOST_FLOAT' | 'NONE';

export interface StatusVisualDef {
    id: string;
    label: string;
    
    // Colors
    primaryColor: string;   // Main Icon / Text Color
    secondaryColor: string; // Shadow / Glow
    
    // UI Representation
    iconShape: StatusIconShape;
    
    // World Representation
    overheadType: OverheadEffect; // Animation above head
    floorColor?: string;          // If set, tints the ground tile (e.g. Frozen/Stasis)
    floorOpacity?: number;
    
    // Model Overrides
    modelOverride?: 'SHEEP' | 'ICE_BLOCK' | 'NONE';
}

export const STATUS_VISUALS: Record<string, StatusVisualDef> = {
    // --- CROWD CONTROL ---
    'STUN': {
        id: 'STUN', label: '暈眩',
        primaryColor: '#facc15', secondaryColor: '#ca8a04',
        iconShape: 'SPIRAL',
        overheadType: 'STAR_SPIN'
    },
    'SILENCE': {
        id: 'SILENCE', label: '沉默',
        primaryColor: '#94a3b8', secondaryColor: '#475569',
        iconShape: 'MUTE_BUBBLE',
        overheadType: 'BUBBLE_POP'
    },
    'BANISH': {
        id: 'BANISH', label: '放逐',
        primaryColor: '#c084fc', secondaryColor: '#7e22ce',
        iconShape: 'GHOST',
        overheadType: 'GHOST_FLOAT'
    },
    'POLYMORPH': {
        id: 'POLYMORPH', label: '變形',
        primaryColor: '#fbcfe8', secondaryColor: '#ec4899',
        iconShape: 'SHEEP',
        overheadType: 'NONE',
        floorColor: '#d8b4fe', floorOpacity: 0.5,
        modelOverride: 'SHEEP'
    },
    'FROZEN': {
        id: 'FROZEN', label: '凍結',
        primaryColor: '#bae6fd', secondaryColor: '#0ea5e9',
        iconShape: 'NONE', // Frozen usually blocks actions, implies stun icon or separate
        overheadType: 'NONE',
        floorColor: '#bae6fd', floorOpacity: 0.6,
        modelOverride: 'ICE_BLOCK'
    },
    'STASIS': {
        id: 'STASIS', label: '凝滯',
        primaryColor: '#fef08a', secondaryColor: '#eab308',
        iconShape: 'SHIELD',
        overheadType: 'NONE',
        floorColor: '#fde047', floorOpacity: 0.5
    },

    // --- DOTs / HOTs ---
    'POISON': {
        id: 'POISON', label: '中毒',
        primaryColor: '#a3e635', secondaryColor: '#4d7c0f',
        iconShape: 'SKULL',
        overheadType: 'NONE'
    },
    'BURN': {
        id: 'BURN', label: '燃燒',
        primaryColor: '#f87171', secondaryColor: '#b91c1c',
        iconShape: 'FLAME',
        overheadType: 'NONE'
    },
    'REGEN': {
        id: 'REGEN', label: '再生',
        primaryColor: '#86efac', secondaryColor: '#15803d',
        iconShape: 'CROSS',
        overheadType: 'NONE'
    },
    
    // --- GENERIC FALLBACK ---
    'DEFAULT': {
        id: 'DEFAULT', label: '狀態',
        primaryColor: '#fff', secondaryColor: '#000',
        iconShape: 'NONE',
        overheadType: 'NONE'
    }
};
