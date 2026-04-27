
export type StatusIconShape = 'HEX_HALO' | 'HEX_LOCK' | 'HEX_PRISM' | 'HEX_RUNE' | 'HEX_SHIELD' | 'HEX_SKULL' | 'HEX_ANGRY' | 'HEX_EYE' | 'NONE';
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
        iconShape: 'HEX_HALO', overheadType: 'NONE', 
        particleEffect: 'FX_STATUS_STUN_LOOP', 
        particleInterval: 0.15
    },
    'SILENCE': {
        id: 'SILENCE', label: '沉默',
        primaryColor: '#94a3b8', secondaryColor: '#475569',
        iconShape: 'HEX_LOCK', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_SILENCE_LOOP',
        particleInterval: 0.25
    },
    'BANISH': {
        id: 'BANISH', label: '放逐',
        primaryColor: '#c084fc', secondaryColor: '#7e22ce',
        iconShape: 'HEX_PRISM', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_BANISH_LOOP', 
        particleInterval: 0.4
    },
    'ROOT': {
        id: 'ROOT', label: '禁錮',
        primaryColor: '#fbbf24', secondaryColor: '#d97706',
        iconShape: 'HEX_LOCK', overheadType: 'NONE',
        floorColor: '#fbbf24', floorOpacity: 0.3,
        particleEffect: 'FX_STATUS_ROOT_LOOP',
        particleInterval: 0.3
    },
    'FEAR': {
        id: 'FEAR', label: '恐懼',
        primaryColor: '#a855f7', secondaryColor: '#581c87',
        iconShape: 'HEX_SKULL', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_FEAR_LOOP', 
        particleInterval: 0.2
    },
    'TAUNT': {
        id: 'TAUNT', label: '嘲諷',
        primaryColor: '#ef4444', secondaryColor: '#991b1b',
        iconShape: 'HEX_ANGRY', overheadType: 'NONE'
    },
    'BLIND': {
        id: 'BLIND', label: '致盲',
        primaryColor: '#cbd5e1', secondaryColor: '#475569',
        iconShape: 'HEX_EYE', overheadType: 'NONE'
    },
    'SHIELD': {
        id: 'SHIELD', label: '護盾',
        primaryColor: '#bae6fd', secondaryColor: '#3b82f6',
        iconShape: 'HEX_SHIELD', overheadType: 'NONE'
    },
    'POISON': {
        id: 'POISON', label: '中毒',
        primaryColor: '#a3e635', secondaryColor: '#4d7c0f',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_POISON_LOOP', 
        particleInterval: 0.25
    },
    'BURN': {
        id: 'BURN', label: '燃燒',
        primaryColor: '#f87171', secondaryColor: '#b91c1c',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_BURN_LOOP', 
        particleInterval: 0.15
    },
    'REGEN': {
        id: 'REGEN', label: '再生',
        primaryColor: '#86efac', secondaryColor: '#15803d',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_REGEN_LOOP', 
        particleInterval: 0.4
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
    'VULNERABLE': {
        id: 'VULNERABLE', label: '虛弱',
        primaryColor: '#ef4444', secondaryColor: '#7f1d1d',
        iconShape: 'HEX_SKULL', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_VULNERABLE_LOOP',
        particleInterval: 0.3
    },
    'CAST_ULT': {
        id: 'CAST_ULT', label: '',
        primaryColor: '#fbbf24', secondaryColor: '#d97706',
        iconShape: 'NONE', overheadType: 'NONE',
        particleEffect: 'FX_CASTING_ULT',
        particleInterval: 0.1
    },
    'CAST_ACTIVE': {
        id: 'CAST_ACTIVE', label: '',
        primaryColor: '#60a5fa', secondaryColor: '#2563eb',
        iconShape: 'NONE', overheadType: 'NONE',
        particleEffect: 'FX_CASTING_ACTIVE',
        particleInterval: 0.2
    },
    'CC_INTERRUPT': {
        id: 'CC_INTERRUPT', label: '狀態',
        primaryColor: '#facc15', secondaryColor: '#ca8a04',
        iconShape: 'NONE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_STUN_LOOP',
        particleInterval: 0.15
    },
    'EVADING': {
        id: 'EVADING', label: '',
        primaryColor: '#fff', secondaryColor: '#000',
        iconShape: 'NONE', overheadType: 'NONE',
        particleEffect: 'FX_STATUS_ROOT_LOOP', // Use dust loop as footprints
        particleInterval: 0.1
    },
    'DEFAULT': {
        id: 'DEFAULT', label: '狀態',
        primaryColor: '#fff', secondaryColor: '#000',
        iconShape: 'NONE', overheadType: 'NONE'
    }
};
