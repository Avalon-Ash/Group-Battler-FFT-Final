
import { Role, Skill, Team } from '../../types';

export const BLUE_ACTIVE: Skill[] = [
    // --- TANK ---
    { id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '正義審判', desc: '單體暈眩', range: 1, cast: 0.4, cd: 7.0, cost: 40, gain: 0, type: 'SINGLE', power: 60, color: '#eab308', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '挑釁', desc: '單體嘲諷(牽引)', range: 4, cast: 0.3, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 10, color: '#fde047', visual: 'BEAM', projectileSpeed: 0, ccType: 'PULL', ccForce: 3 },
    { id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '復仇之盾', desc: '遠程擊暈', range: 5, cast: 0.5, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 50, color: '#fbbf24', visual: 'BOLT', projectileSpeed: 600, ccType: 'STUN', ccDur: 1.2 },

    // --- WARRIOR ---
    { id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '無畏衝鋒', desc: '衝鋒暈眩', range: 4, cast: 0.2, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 60, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.2 },
    { id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '弱點擊破', desc: '爆發傷害', range: 1, cast: 0.5, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 160, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },

    // --- RANGER ---
    { id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '擊退矢', desc: '擊退敵人', range: 4, cast: 0.6, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 70, color: '#fff', visual: 'ARROW', projectileSpeed: 800, ccType: 'KNOCKBACK', ccForce: 2 },
    { id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜陷阱', desc: '凍結', range: 5, cast: 0.8, cd: 10.0, cost: 45, gain: 0, type: 'SINGLE', power: 70, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 400, ccType: 'STUN', ccDur: 1.5 },

    // --- MAGE ---
    { id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '變形術', desc: '單體放逐', range: 5, cast: 0.8, cd: 12.0, cost: 50, gain: 0, type: 'SINGLE', power: 10, color: '#d946ef', visual: 'BOLT', projectileSpeed: 500, ccType: 'BANISH', ccDur: 2.5 },
    { id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '暴風雪', desc: '持續範圍傷', range: 6, cast: 1.2, cd: 8.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 3, power: 120, color: '#e0f2fe', visual: 'BOLT', projectileSpeed: 300 },

    // --- SUPPORT ---
    { id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '快速治療', desc: '單體大補', range: 5, cast: 0.6, cd: 4.0, cost: 40, gain: 0, type: 'SINGLE', power: -180, color: '#86efac', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '驅逐', desc: '單體擊退', range: 4, cast: 0.4, cd: 7.0, cost: 35, gain: 0, type: 'SINGLE', power: 50, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 3 },
];
