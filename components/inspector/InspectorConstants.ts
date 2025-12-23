
import { Role, Skill, Team } from '../../types';

export const ROLE_MAP: Record<string, string> = {
    [Role.TANK]: '坦克',
    [Role.WARRIOR]: '戰士',
    [Role.RANGER]: '遊俠',
    [Role.MAGE]: '法師',
    [Role.SUPPORT]: '輔助'
};

export const TAG_MAP: Record<string, string> = {
    'ULT': '奧義',
    'ACTIVE': '主動',
    'BASIC': '普攻'
};

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'color';

export interface FieldDef {
    key: keyof Skill;
    label: string;
    type: FieldType;
    options?: string[];
    step?: number;
}

export const SKILL_FIELD_GROUPS: { name: string; fields: FieldDef[] }[] = [
    {
        name: '基本資訊 (Basic)',
        fields: [
            { key: 'name', label: '技能名稱', type: 'text' },
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'tag', label: '類型標籤', type: 'select', options: ['BASIC', 'ACTIVE', 'ULT'] },
            { key: 'role', label: '專屬職階', type: 'select', options: Object.values(Role) },
            { key: 'team', label: '專屬陣營', type: 'select', options: ['ANY', 'BLUE', 'RED'] },
            { key: 'desc', label: '技能描述', type: 'textarea' },
        ]
    },
    {
        name: '戰鬥數值 (Combat)',
        fields: [
            { key: 'power', label: '威力 (負數為治療)', type: 'number' },
            { key: 'cost', label: '魔力消耗', type: 'number' },
            { key: 'gain', label: '魔力回復', type: 'number' },
            { key: 'cd', label: '冷卻時間 (秒)', type: 'number', step: 0.1 },
            { key: 'cast', label: '詠唱時間 (秒)', type: 'number', step: 0.1 },
            { key: 'range', label: '射程 (格)', type: 'number' },
            { key: 'type', label: '目標類型', type: 'select', options: ['SINGLE', 'AOE'] },
            { key: 'aoeRadius', label: 'AOE 半徑', type: 'number' },
        ]
    },
    {
        name: '視覺表現 (Visuals)',
        fields: [
            { key: 'visual', label: '特效模型', type: 'select', options: ['ARROW', 'FIREBALL', 'BOLT', 'SLASH', 'SMASH', 'BEAM', 'BOMB'] },
            { key: 'color', label: '主色調 (Hex/RGBA)', type: 'color' }, 
            { key: 'projectileSpeed', label: '彈速 (0=即時)', type: 'number', step: 50 },
        ]
    },
    {
        name: '特效模組 A (Primary Effect)',
        fields: [
            { key: 'ccType', label: '控場類型', type: 'select', options: ['NONE', 'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'HOT', 'SILENCE'] },
            { key: 'ccDur', label: '持續時間', type: 'number', step: 0.5 },
            { key: 'ccForce', label: '強度/層數', type: 'number' },
            { key: 'effectType', label: '特殊效果', type: 'select', options: ['NONE', 'VAMP', 'MANA_BURN', 'EXECUTE', 'MANA_RESTORE'] },
            { key: 'effectVal', label: '係數/數值', type: 'number', step: 0.1 },
        ]
    },
    {
        name: '特效模組 B (Secondary Effect)',
        fields: [
            { key: 'ccType2', label: '控場類型', type: 'select', options: ['NONE', 'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'HOT', 'SILENCE'] },
            { key: 'ccDur2', label: '持續時間', type: 'number', step: 0.5 },
            { key: 'ccForce2', label: '強度/層數', type: 'number' },
            { key: 'effectType2', label: '特殊效果', type: 'select', options: ['NONE', 'VAMP', 'MANA_BURN', 'EXECUTE', 'MANA_RESTORE'] },
            { key: 'effectVal2', label: '係數/數值', type: 'number', step: 0.1 },
        ]
    }
];
