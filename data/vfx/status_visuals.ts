
type StatusIconShape = 'HEX_HALO' | 'HEX_LOCK' | 'HEX_PRISM' | 'HEX_RUNE' | 'HEX_SHIELD' | 'HEX_SKULL' | 'HEX_ANGRY' | 'HEX_EYE' | 'NONE';
type OverheadEffect = 'ICON' | 'NONE' | 'BUBBLE_POP' | 'GHOST_FLOAT'; 

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
}

export const STATUS_VISUALS: Record<string, StatusVisualDef> = {
    'STUN': {
        id: 'STUN', label: '暈眩',
        primaryColor: '#facc15', secondaryColor: '#ca8a04',
        iconShape: 'HEX_HALO', overheadType: 'NONE', 
    },
    'SILENCE': {
        id: 'SILENCE', label: '沉默',
        primaryColor: '#94a3b8', secondaryColor: '#475569',
        iconShape: 'HEX_LOCK', overheadType: 'NONE',
    },
    'BANISH': {
        id: 'BANISH', label: '放逐',
        primaryColor: '#c084fc', secondaryColor: '#7e22ce',
        iconShape: 'HEX_PRISM', overheadType: 'NONE',
    },
    'ROOT': {
        id: 'ROOT', label: '禁錮',
        primaryColor: '#fbbf24', secondaryColor: '#d97706',
        iconShape: 'HEX_LOCK', overheadType: 'NONE',
        floorColor: '#fbbf24', floorOpacity: 0.3,
    },
    'FEAR': {
        id: 'FEAR', label: '恐懼',
        primaryColor: '#a855f7', secondaryColor: '#581c87',
        iconShape: 'HEX_SKULL', overheadType: 'NONE',
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
        primaryColor: '#10b981', secondaryColor: '#4d7c0f',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
    },
    'BURN': {
        id: 'BURN', label: '燃燒',
        primaryColor: '#f97316', secondaryColor: '#b91c1c',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
    },
    'IMMUNE': {
        id: 'IMMUNE', label: '免疫',
        primaryColor: '#9ca3af', secondaryColor: '#6b7280',
        iconShape: 'HEX_SHIELD', overheadType: 'NONE'
    },
    'KNOCKBACK': {
        id: 'KNOCKBACK', label: '擊退',
        primaryColor: '#60a5fa', secondaryColor: '#2563eb',
        iconShape: 'NONE', overheadType: 'NONE'
    },
    'PULL': {
        id: 'PULL', label: '牽引',
        primaryColor: '#c084fc', secondaryColor: '#7e22ce',
        iconShape: 'NONE', overheadType: 'NONE'
    },
    'REGEN': {
        id: 'REGEN', label: '再生',
        primaryColor: '#86efac', secondaryColor: '#15803d',
        iconShape: 'HEX_RUNE', overheadType: 'NONE',
        floorColor: 'rgba(134, 239, 172, 0.35)',
    },
    'POLYMORPH': {
        id: 'POLYMORPH', label: '變羊',
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
        primaryColor: '#fef08a', secondaryColor: '#fde047',
        iconShape: 'HEX_HALO', overheadType: 'NONE',
        floorColor: 'rgba(254, 240, 138, 0.35)', floorOpacity: 0.5,
    },
    'VULNERABLE': {
        id: 'VULNERABLE', label: '虛弱',
        primaryColor: '#ef4444', secondaryColor: '#7f1d1d',
        iconShape: 'HEX_SKULL', overheadType: 'NONE',
    },
    'HASTE': {
        id: 'HASTE', label: '加速',
        primaryColor: '#38bdf8', secondaryColor: '#0284c7',
        iconShape: 'NONE', overheadType: 'NONE'
    },
    'REFLECT': {
        id: 'REFLECT', label: '反傷',
        primaryColor: '#f59e0b', secondaryColor: '#b45309',
        iconShape: 'NONE', overheadType: 'NONE'
    },
    'LIFESTEAL': {
        id: 'LIFESTEAL', label: '吸血',
        primaryColor: '#be123c', secondaryColor: '#881337',
        iconShape: 'NONE', overheadType: 'NONE'
    },
    'SLOW': {
        id: 'SLOW', label: '緩速',
        primaryColor: '#7dd3fc', secondaryColor: '#0369a1',
        iconShape: 'NONE', overheadType: 'NONE'
    },
    'CAST_ULT': {
        id: 'CAST_ULT', label: '',
        primaryColor: '#fbbf24', secondaryColor: '#d97706',
        iconShape: 'NONE', overheadType: 'NONE',
    },
    'CAST_ACTIVE': {
        id: 'CAST_ACTIVE', label: '',
        primaryColor: '#60a5fa', secondaryColor: '#2563eb',
        iconShape: 'NONE', overheadType: 'NONE',
    },
    'CC_INTERRUPT': {
        id: 'CC_INTERRUPT', label: '狀態',
        primaryColor: '#facc15', secondaryColor: '#ca8a04',
        iconShape: 'NONE', overheadType: 'NONE',
    },
    'EVADING': {
        id: 'EVADING', label: '',
        primaryColor: '#fff', secondaryColor: '#000',
        iconShape: 'NONE', overheadType: 'NONE',
    },
    'INVINCIBLE': {
        id: 'INVINCIBLE', label: '無敵',
        primaryColor: '#fde68a',
        secondaryColor: '#f59e0b',
        iconShape: 'HEX_HALO',
        overheadType: 'NONE',
        floorColor: '#fde68a',
        floorOpacity: 0.4,
    },
    'DEFAULT': {
        id: 'DEFAULT', label: '狀態',
        primaryColor: '#fff', secondaryColor: '#000',
        iconShape: 'NONE', overheadType: 'NONE'
    }
};
