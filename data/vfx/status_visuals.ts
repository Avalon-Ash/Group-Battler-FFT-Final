
type OverheadEffect = 'ICON' | 'NONE' | 'BUBBLE_POP' | 'GHOST_FLOAT'; 

export interface StatusVisualDef {
    id: string;
    label: string;
    primaryColor: string;
    secondaryColor: string;
    overheadType: OverheadEffect;
    floorColor?: string;
    floorOpacity?: number;
    modelOverride?: 'SHEEP' | 'ICE_BLOCK' | 'NONE';
}

export const STATUS_VISUALS: Record<string, StatusVisualDef> = {
    'STUN': {
        id: 'STUN', label: '暈眩',
        primaryColor: '#facc15', secondaryColor: '#a16207', overheadType: 'NONE', 
    },
    'SILENCE': {
        id: 'SILENCE', label: '沉默',
        primaryColor: '#818cf8', secondaryColor: '#3730a3', overheadType: 'NONE',
    },
    'BANISH': {
        id: 'BANISH', label: '放逐',
        primaryColor: '#a5c3cf', secondaryColor: '#475b66', overheadType: 'NONE',
    },
    'ROOT': {
        id: 'ROOT', label: '禁錮',
        primaryColor: '#84cc16', secondaryColor: '#713f12', overheadType: 'NONE',
        floorColor: '#65a30d', floorOpacity: 0.3,
    },
    'FEAR': {
        id: 'FEAR', label: '恐懼',
        primaryColor: '#8b5cf6', secondaryColor: '#2e1065', overheadType: 'NONE',
    },
    'TAUNT': {
        id: 'TAUNT', label: '嘲諷',
        primaryColor: '#ef4444', secondaryColor: '#7f1d1d', overheadType: 'NONE'
    },
    'BLIND': {
        id: 'BLIND', label: '致盲',
        primaryColor: '#94a3b8', secondaryColor: '#334155', overheadType: 'NONE'
    },
    'SHIELD': {
        id: 'SHIELD', label: '護盾',
        primaryColor: '#bae6fd', secondaryColor: '#0369a1', overheadType: 'NONE'
    },
    'POISON': {
        id: 'POISON', label: '中毒',
        primaryColor: '#84cc16', secondaryColor: '#365314', overheadType: 'NONE',
    },
    'BURN': {
        id: 'BURN', label: '燃燒',
        primaryColor: '#f97316', secondaryColor: '#dc2626', overheadType: 'NONE',
    },
    'IMMUNE': {
        id: 'IMMUNE', label: '免疫',
        primaryColor: '#9ca3af', secondaryColor: '#6b7280', overheadType: 'NONE'
    },
    'KNOCKBACK': {
        id: 'KNOCKBACK', label: '擊退',
        primaryColor: '#60a5fa', secondaryColor: '#2563eb', overheadType: 'NONE'
    },
    'PULL': {
        id: 'PULL', label: '牽引',
        primaryColor: '#c084fc', secondaryColor: '#7e22ce', overheadType: 'NONE'
    },
    'REGEN': {
        id: 'REGEN', label: '再生',
        primaryColor: '#4ade80', secondaryColor: '#166534', overheadType: 'NONE',
        floorColor: 'rgba(74, 222, 128, 0.35)',
    },
    'POLYMORPH': {
        id: 'POLYMORPH', label: '變羊',
        primaryColor: '#f9a8d4', secondaryColor: '#9d174d', overheadType: 'NONE',
        floorColor: '#f9a8d4', floorOpacity: 0.5,
        modelOverride: 'SHEEP'
    },
    'FROZEN': {
        id: 'FROZEN', label: '凍結',
        primaryColor: '#67e8f9', secondaryColor: '#0e7490', overheadType: 'NONE',
        floorColor: '#67e8f9', floorOpacity: 0.6,
        modelOverride: 'ICE_BLOCK'
    },
    'STASIS': {
        id: 'STASIS', label: '凝滯',
        primaryColor: '#f59e0b', secondaryColor: '#92400e', overheadType: 'NONE',
        floorColor: 'rgba(245, 158, 11, 0.35)', floorOpacity: 0.5,
    },
    'VULNERABLE': {
        id: 'VULNERABLE', label: '虛弱',
        primaryColor: '#ea580c', secondaryColor: '#7c2d12', overheadType: 'NONE',
    },
    'HASTE': {
        id: 'HASTE', label: '加速',
        primaryColor: '#a5f3fc', secondaryColor: '#0891b2', overheadType: 'NONE'
    },
    'REFLECT': {
        id: 'REFLECT', label: '反傷',
        primaryColor: '#e2e8f0', secondaryColor: '#64748b', overheadType: 'NONE'
    },
    'LIFESTEAL': {
        id: 'LIFESTEAL', label: '吸血',
        primaryColor: '#e11d48', secondaryColor: '#4c0519', overheadType: 'NONE'
    },
    'SLOW': {
        id: 'SLOW', label: '緩速',
        primaryColor: '#7a9cc0', secondaryColor: '#334155', overheadType: 'NONE'
    },
    'CAST_ULT': {
        id: 'CAST_ULT', label: '',
        primaryColor: '#fbbf24', secondaryColor: '#d97706', overheadType: 'NONE',
    },
    'CAST_ACTIVE': {
        id: 'CAST_ACTIVE', label: '',
        primaryColor: '#60a5fa', secondaryColor: '#2563eb', overheadType: 'NONE',
    },
    'CC_INTERRUPT': {
        id: 'CC_INTERRUPT', label: '狀態',
        primaryColor: '#facc15', secondaryColor: '#ca8a04', overheadType: 'NONE',
    },
    'EVADING': {
        id: 'EVADING', label: '',
        primaryColor: '#fff', secondaryColor: '#000', overheadType: 'NONE',
    },
    'INVINCIBLE': {
        id: 'INVINCIBLE', label: '無敵',
        primaryColor: '#fde68a',
        secondaryColor: '#d97706', overheadType: 'NONE',
        floorColor: '#fde68a',
        floorOpacity: 0.4,
    },
    'DEFAULT': {
        id: 'DEFAULT', label: '狀態',
        primaryColor: '#fff', secondaryColor: '#000', overheadType: 'NONE'
    }
};
