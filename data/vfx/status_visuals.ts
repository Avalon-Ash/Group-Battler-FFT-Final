
export type StatusIconShape = 'HEX_HALO' | 'HEX_LOCK' | 'HEX_PRISM' | 'HEX_RUNE' | 'NONE';
export type OverheadEffect = 'ICON' | 'NONE' | 'BUBBLE_POP' | 'GHOST_FLOAT'; 

export interface StatusVisualDef {
    id: string;
    label: string;
    primaryColor: string;
    secondaryColor: string;
    iconShape: StatusIconShape;
    overheadType: OverheadEffect;
    floorColor?: string;
    floorOpacity?: number;
    modelOverride?: 'SHEEP' | 'ICE_BLOCK' | 'NONE';
    
    // Persistent Particle Effect
    particleEffect?: string; 
    particleInterval?: number;
}

export const STATUS_VISUALS: Record<string, StatusVisualDef> = {
    'STUN': {
        id: 'STUN', label: '暈眩',
        primaryColor: '#facc15', secondaryColor: '#ca8a04',
        iconShape: 'HEX_HALO', overheadType: 'NONE', // Handled custom in UnitVisuals
        particleEffect: 'FX_STATUS_REGEN_LOOP', 
        particleInterval: 0.2
    },
    'SILENCE': {
        id: 'SILENCE', label: '沉默',
        primaryColor: '#94a3b8', secondaryColor: '#475569',
        iconShape: 'HEX_LOCK', overheadType: 'NONE' // Handled custom in UnitVisuals
    },
    'BANISH': {
        id: 'BANISH', label: '放逐',
        primaryColor: '#c084fc', secondaryColor: '#7e22ce',
        iconShape: 'HEX_PRISM', overheadType: 'NONE', // Handled custom in UnitVisuals
        particleEffect: 'FX_STATUS_BANISH_LOOP', particleInterval: 0.5
    },
    'POISON': {
        id: 'POISON', label: '中毒',
        primaryColor: '#a3e635', secondaryColor: '#4d7c0f',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_POISON_LOOP', particleInterval: 0.3
    },
    'BURN': {
        id: 'BURN', label: '燃燒',
        primaryColor: '#f87171', secondaryColor: '#b91c1c',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_BURN_LOOP', particleInterval: 0.2
    },
    'REGEN': {
        id: 'REGEN', label: '再生',
        primaryColor: '#86efac', secondaryColor: '#15803d',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_REGEN_LOOP', particleInterval: 0.5
    },
    'POLYMORPH': {
        id: 'POLYMORPH', label: '變形',
        primaryColor: '#fbcfe8', secondaryColor: '#ec4899',
        iconShape: 'NONE', overheadType: 'NONE',
        floorColor: '#d8b4fe', floorOpacity: 0.5,
        modelOverride: 'SHEEP'
    },
    'FROZEN': {
        id: 'FROZEN', label: '凍結',
        primaryColor: '#bae6fd', secondaryColor: '#0ea5e9',
        iconShape: 'NONE', overheadType: 'NONE',
        floorColor: '#bae6fd', floorOpacity: 0.6,
        modelOverride: 'ICE_BLOCK'
    },
    'STASIS': {
        id: 'STASIS', label: '凝滯',
        primaryColor: '#fef08a', secondaryColor: '#eab308',
        iconShape: 'HEX_PRISM', overheadType: 'NONE',
        floorColor: '#fde047', floorOpacity: 0.5
    },
    'DEFAULT': {
        id: 'DEFAULT', label: '狀態',
        primaryColor: '#fff', secondaryColor: '#000',
        iconShape: 'NONE', overheadType: 'NONE'
    }
};
