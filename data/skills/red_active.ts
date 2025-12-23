
import { Role, Skill, Team } from '../../types';

export const RED_ACTIVE: Skill[] = [
    // --- TANK ---
    { id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '戰爭踢擊', desc: '強力擊退', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 80, color: '#991b1b', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '死亡之鉤', desc: '抓人', range: 5, cast: 0.6, cd: 9.0, cost: 35, gain: 0, type: 'SINGLE', power: 40, color: '#450a0a', visual: 'BOLT', projectileSpeed: 700, ccType: 'PULL', ccForce: 5 },

    // --- WARRIOR ---
    { id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '撕裂傷口', desc: '重度流血', range: 1, cast: 0.4, cd: 5.0, cost: 30, gain: 0, type: 'SINGLE', power: 70, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 4 },
    { id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '投擲飛斧', desc: '遠程暈眩', range: 4, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 650, ccType: 'STUN', ccDur: 1.2 },

    // --- RANGER ---
    { id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '毒氣手雷', desc: '範圍中毒', range: 5, cast: 0.8, cd: 7.0, cost: 40, gain: 0, type: 'AOE', aoeRadius: 2, power: 50, color: '#4ade80', visual: 'BOMB', projectileSpeed: 350, ccType: 'DOT', ccForce: 30, ccDur: 5 },
    { id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '震盪彈', desc: '擊退', range: 5, cast: 1.0, cd: 9.0, cost: 50, gain: 0, type: 'SINGLE', power: 80, color: '#1f2937', visual: 'BOLT', projectileSpeed: 700, ccType: 'KNOCKBACK', ccForce: 3 },

    // --- MAGE ---
    { id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '地獄烈焰', desc: '範圍燃燒', range: 4, cast: 1.0, cd: 8.0, cost: 50, gain: 0, type: 'AOE', power: 140, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 450, ccType: 'DOT', ccForce: 30, ccDur: 5 },
    { id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '恐懼術', desc: '放逐(恐懼)', range: 4, cast: 0.5, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 20, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 2.0 },

    // --- SUPPORT ---
    { id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '巫毒圖騰', desc: '暈眩', range: 4, cast: 0.8, cd: 8.0, cost: 45, gain: 0, type: 'SINGLE', power: 40, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '治療鏈', desc: '群體治療', range: 5, cast: 1.0, cd: 6.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: -100, color: '#fde047', visual: 'BOLT', projectileSpeed: 500 },
];
