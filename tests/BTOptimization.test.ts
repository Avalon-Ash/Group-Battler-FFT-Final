import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role, NodeState, type Skill, type Agent } from '../types';
import { HexUtils } from '../engine/utils';
import { COMBAT_PARAM } from '../constants';
import { BTConditions, BTActions } from '../engine/ai/BTRegistry';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { CombatSystem } from '../engine/systems/combat/CombatSystem';

describe('BTOptimization (行為樹與目標選擇優化)', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
        engine.play();
        // 清理地圖障礙物與高度
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    describe('1. HasTarget 與目標管理：防止友軍主目標殘留', () => {
        it('HasTarget 在 a.target 為友軍時必回傳 false 並嘗試重選敵方目標', () => {
            const ally1 = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
            const ally2 = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 500, Role.WARRIOR);
            if (!ally1 || !ally2) throw new Error('addAgent failed');

            // 只有友軍，沒有敵人
            ally1.target = ally2;
            const hasTarget = BTConditions["HasTarget"](ally1, engine, {});
            expect(hasTarget).toBe(false);
            expect(ally1.target).toBeNull();
        });

        it('若有敵軍且原 target 為友軍，HasTarget 自動還原 _savedCombatTarget 或重新選定敵軍', () => {
            const ally = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
            const friend = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 500, Role.WARRIOR);
            const enemy = engine.agentManager.addAgent(engine, Team.RED, 4, 0, 500, Role.TANK);
            if (!ally || !friend || !enemy) throw new Error('addAgent failed');

            ally.target = friend;
            ally._savedCombatTarget = enemy;

            const hasTarget = BTConditions["HasTarget"](ally, engine, {});
            expect(hasTarget).toBe(true);
            expect(ally.target?.id).toBe(enemy.id);
            expect(ally.target?.team).toBe(Team.RED);
            expect(ally._savedCombatTarget).toBeNull();
        });

        it('FindOptimalTarget 對友軍施法成功時保存 _savedCombatTarget，失敗時還原敵軍目標', () => {
            const ally = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
            const friend = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 500, Role.WARRIOR);
            const enemy = engine.agentManager.addAgent(engine, Team.RED, 4, 0, 500, Role.TANK);
            if (!ally || !friend || !enemy) throw new Error('addAgent failed');

            // 友軍受損，治療技能可選中
            friend.hp = 200;
            ally.target = enemy;

            // 找一個單體治療技能（如 power < 0, range > 0）
            const healSkill: Skill = {
                id: 'test_heal', tag: 'ACTIVE', role: Role.SUPPORT, name: '測試治療',
                range: 6, cast: 0.5, cd: 5, cost: 0, gain: 0,
                type: 'SINGLE', power: -200, color: '#fff'
            };
            ally.skills[1] = healSkill;

            const found = BTConditions["FindOptimalTarget"](ally, engine, { slot: 1 });
            expect(found).toBe(true);
            expect(ally.target?.id).toBe(friend.id);
            expect(ally._savedCombatTarget?.id).toBe(enemy.id);

            // 當友軍滿血後，再次調用 FindOptimalTarget 應失敗並還原 enemy
            friend.hp = friend.maxHp;
            const foundAfterHeal = BTConditions["FindOptimalTarget"](ally, engine, { slot: 1 });
            expect(foundAfterHeal).toBe(false);
            expect(ally.target?.id).toBe(enemy.id);
            expect(ally.target?.team).toBe(Team.RED);
        });
    });

    describe('2. PBAOE（range === 0, type === AOE）敵方檢查與 ChaseTarget 追擊距離', () => {
        it('對敵 PBAOE 在半徑內無敵軍時回傳 targetHex: null，在有敵軍時回傳腳下格', () => {
            const warrior = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.WARRIOR);
            const enemy = engine.agentManager.addAgent(engine, Team.RED, 5, 0, 500, Role.TANK);
            if (!warrior || !enemy) throw new Error('addAgent failed');

            const pbaoeSkill: Skill = {
                id: 'wr_a1', tag: 'ACTIVE', role: Role.WARRIOR, name: '戰爭踐踏',
                range: 0, cast: 0.2, cd: 7.5, cost: 35, gain: 0,
                type: 'AOE', aoeRadius: 1, power: 120, color: '#fff', ccType: 'STUN', ccDur: 1.5
            };
            warrior.skills[1] = pbaoeSkill;

            // 敵人離 5 格，aoeRadius = 1
            const resFar = engine.movement.targeting.calculateOptimalTarget(warrior, pbaoeSkill, engine);
            expect(resFar.targetHex).toBeNull();
            expect(resFar.targetAgent).toBeNull();

            // 將敵人移至相鄰格（距離 1）
            engine.updateAgentPosition(enemy, 1, 0);
            const resNear = engine.movement.targeting.calculateOptimalTarget(warrior, pbaoeSkill, engine);
            expect(resNear.targetHex).toEqual({ q: warrior.q, r: warrior.r });
        });

        it('ChaseTarget 在 skill.range === 0 時使用 Math.max(1, aoeRadius) 尋路接近，而非要求踏入敵人格子', () => {
            const warrior = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.WARRIOR);
            const enemy = engine.agentManager.addAgent(engine, Team.RED, 3, 0, 500, Role.TANK);
            if (!warrior || !enemy) throw new Error('addAgent failed');

            const pbaoeSkill: Skill = {
                id: 'wr_a1', tag: 'ACTIVE', role: Role.WARRIOR, name: '戰爭踐踏',
                range: 0, cast: 0.2, cd: 7.5, cost: 35, gain: 0,
                type: 'AOE', aoeRadius: 1, power: 120, color: '#fff', ccType: 'STUN', ccDur: 1.5
            };
            warrior.skills[1] = pbaoeSkill;
            warrior.target = enemy;

            const state = BTActions["ChaseTarget"](warrior, engine, { slot: 1 });
            expect(state).toBe(NodeState.RUNNING);
            expect(warrior.isMoving).toBe(true);
            expect(warrior.path.length).toBeGreaterThan(0);
            // 尋路終點應該停在離敵人 1 格處，而非敵人佔據的 (3, 0)
            const lastStep = warrior.path[warrior.path.length - 1];
            expect(HexUtils.dist(lastStep, enemy)).toBe(1);
        });
    });

    describe('3. 治療技能目標選擇：防止對滿血友軍空放與自殘治療選自己', () => {
        it('純單體治療在所有友軍 >= 95% HP 時回傳 null，不空放', () => {
            const healer = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
            const ally = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 500, Role.TANK);
            const enemy = engine.agentManager.addAgent(engine, Team.RED, 4, 0, 500, Role.WARRIOR);
            if (!healer || !ally || !enemy) throw new Error('addAgent failed');

            healer.target = enemy;
            const singleHeal: Skill = {
                id: 'sr_b4', tag: 'BASIC', role: Role.SUPPORT, name: '鮮血治癒',
                range: 6, cast: 0.4, cd: 2.0, cost: 0, gain: 20,
                type: 'SINGLE', power: -90, color: '#fff'
            };

            // 雙方滿血
            const resFull = engine.movement.targeting.calculateOptimalTarget(healer, singleHeal, engine);
            expect(resFull.targetAgent).toBeNull();
            expect(resFull.targetHex).toBeNull();

            // 友軍受損 (80% HP)
            ally.hp = ally.maxHp * 0.8;
            const resInjured = engine.movement.targeting.calculateOptimalTarget(healer, singleHeal, engine);
            expect(resInjured.targetAgent?.id).toBe(ally.id);
        });

        it('群體治療在範圍內無人受損時回傳 null，有人受損時回傳腳下格', () => {
            const healer = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
            const ally = engine.agentManager.addAgent(engine, Team.BLUE, 2, 0, 500, Role.TANK);
            if (!healer || !ally) throw new Error('addAgent failed');

            const aoeHeal: Skill = {
                id: 'sb_u2', tag: 'ULT', role: Role.SUPPORT, name: '復活之光',
                range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0,
                type: 'AOE', aoeRadius: 4, power: -450, color: '#fff'
            };

            // 滿血不施放
            const resFull = engine.movement.targeting.calculateOptimalTarget(healer, aoeHeal, engine);
            expect(resFull.targetHex).toBeNull();

            // 隊友受損施放
            ally.hp = ally.maxHp * 0.7;
            const resInjured = engine.movement.targeting.calculateOptimalTarget(healer, aoeHeal, engine);
            expect(resInjured.targetHex).toEqual({ q: healer.q, r: healer.r });
        });

        it('自殘犧牲治療（sr_a1/sr_a5）不會將施法者自身選為治療目標', () => {
            const healer = engine.agentManager.addAgent(engine, Team.RED, 0, 0, 500, Role.SUPPORT);
            const ally = engine.agentManager.addAgent(engine, Team.RED, 2, 0, 500, Role.WARRIOR);
            if (!healer || !ally) throw new Error('addAgent failed');

            const sacrificeHeal: Skill = {
                id: 'sr_a5', tag: 'ACTIVE', role: Role.SUPPORT, name: '黑暗犧牲',
                range: 6, cast: 0.5, cd: 9.0, cost: 0, gain: 40,
                type: 'SINGLE', power: -500, color: '#fff',
                effectType: 'SELF_DAMAGE', effectVal: 140
            };

            // 只有施法者自己受損，隊友滿血：不應對自己施放
            healer.hp = 200;
            ally.hp = ally.maxHp;
            const resSelfInjured = engine.movement.targeting.calculateOptimalTarget(healer, sacrificeHeal, engine);
            expect(resSelfInjured.targetAgent).toBeNull();

            // 隊友受損：正常選中隊友
            ally.hp = 300;
            const resAllyInjured = engine.movement.targeting.calculateOptimalTarget(healer, sacrificeHeal, engine);
            expect(resAllyInjured.targetAgent?.id).toBe(ally.id);
        });
    });

    describe('4. 自身短效增益與護盾：防止開場遠距空開', () => {
        it('滿血且最近敵人 > 3 格時不開增益，進入 <= 3 格或自身受損時施放', () => {
            const tank = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 800, Role.TANK);
            const enemy = engine.agentManager.addAgent(engine, Team.RED, 6, 0, 500, Role.WARRIOR);
            if (!tank || !enemy) throw new Error('addAgent failed');

            const buffSkill: Skill = {
                id: 'tb_a5', tag: 'ACTIVE', role: Role.TANK, name: '稜鏡反射',
                range: 0, cast: 0.3, cd: 10.0, cost: 40, gain: 0,
                type: 'SINGLE', power: 0, color: '#fff', ccType: 'REFLECT', ccDur: 4.0
            };

            // 距離 6 格且滿血：不施放
            const resFar = engine.movement.targeting.calculateOptimalTarget(tank, buffSkill, engine);
            expect(resFar.targetHex).toBeNull();

            // 敵人接近至 3 格內：施放
            engine.updateAgentPosition(enemy, 3, 0);
            const resNear = engine.movement.targeting.calculateOptimalTarget(tank, buffSkill, engine);
            expect(resNear.targetHex).toEqual({ q: tank.q, r: tank.r });

            // 敵人回到 6 格但自身受損 (< 95% HP)：施放
            engine.updateAgentPosition(enemy, 6, 0);
            tank.hp = tank.maxHp * 0.8;
            const resInjured = engine.movement.targeting.calculateOptimalTarget(tank, buffSkill, engine);
            expect(resInjured.targetHex).toEqual({ q: tank.q, r: tank.r });
        });
    });

    describe('5. 30 場無頭對戰稽核（SEED = 42, BATTLES = 30）', () => {
        it('emptyPbaoeCasts === 0, healFullHpCasts === 0, allyTargetTicks === 0', () => {
            const HOSTILE_CC_SET = new Set(['STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'POLYMORPH', 'VULNERABLE']);

            let allyTargetTicks = 0;
            let idleAllyTicks = 0;
            let castingAllyTicks = 0;
            let emptyPbaoeCasts = 0;
            let healFullHpCasts = 0;

            const origInitiate = CombatSystem.prototype.initiateCast;
            CombatSystem.prototype.initiateCast = function (a, skillIdx, simEngine) {
                const skill = a.skills[skillIdx];
                if (skill) {
                    const hasHostileCC = (skill.ccType && HOSTILE_CC_SET.has(skill.ccType)) || (skill.ccType2 && HOSTILE_CC_SET.has(skill.ccType2));

                    // 檢查 PBAOE 空放（對敵傷害或對敵控制）
                    if (skill.range === 0 && skill.type === 'AOE' && (skill.power > 0 || hasHostileCC)) {
                        const radius = Math.max(1, skill.aoeRadius || 1);
                        const enemies = simEngine.agents.filter(e => e.team !== a.team && e.hp > 0 && !e.banished && !e.outOfBounds && HexUtils.dist(a, e) <= radius);
                        if (enemies.length === 0) {
                            emptyPbaoeCasts++;
                        }
                    }

                    // 檢查對滿血友軍空補或自殘補自己（排除帶有主動增益如 INVINCIBLE/SHIELD 的技能）
                    const isFriendlyBuff = ['SHIELD', 'INVINCIBLE', 'HASTE', 'REFLECT', 'LIFESTEAL'].includes(skill.ccType as string) ||
                                           ['SHIELD', 'INVINCIBLE', 'HASTE', 'REFLECT', 'LIFESTEAL'].includes(skill.ccType2 as string);

                    if (skill.power < 0 && !hasHostileCC && !isFriendlyBuff) {
                        if (skill.type === 'SINGLE') {
                            const isSelfDamage = skill.effectType === 'SELF_DAMAGE' || skill.effectType2 === 'SELF_DAMAGE' || Boolean(skill.ccSelf);
                            if (isSelfDamage && a.target && a.target.id === a.id) {
                                healFullHpCasts++;
                            } else if (a.target && a.target.team === a.team && a.target.hp >= a.target.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD) {
                                healFullHpCasts++;
                            }
                        } else if (skill.type === 'AOE') {
                            const radius = Math.max(1, skill.aoeRadius || 1);
                            const injuredAllies = simEngine.agents.filter(u => u.team === a.team && u.hp > 0 && !u.banished && !u.outOfBounds && HexUtils.dist(a, u) <= radius && u.hp < u.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD);
                            const enemies = simEngine.agents.filter(e => e.team !== a.team && e.hp > 0 && !e.banished && !e.outOfBounds && HexUtils.dist(a, e) <= radius);
                            if (skill.id === 'sr_a3') {
                                if (injuredAllies.length === 0 && enemies.length === 0) {
                                    healFullHpCasts++;
                                    console.log(`[HEAL CHECK sr_a3] ${a.id} cast sr_a3 with 0 injured allies and 0 enemies`);
                                }
                            } else {
                                if (injuredAllies.length === 0) {
                                    healFullHpCasts++;
                                    console.log(`[HEAL CHECK AOE] ${a.id} cast ${skill.id} with 0 injured allies`);
                                }
                            }
                        }
                    }
                }
                return origInitiate.call(this, a, skillIdx, simEngine);
            };

            const idleStateBreakdown: Record<string, number> = {};
            try {
                const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
                const SEED = 42;
                const BATTLES = 30;
                const DT = 1 / 60;
                const MAX_TIME = 180;

                for (let b = 0; b < BATTLES; b++) {
                    const sim = new GameEngine();
                    sim.seedSimulation(SEED * 100000 + b);
                    sim.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });
                    const radius = Math.floor(Math.max(sim.mapConfig.w, sim.mapConfig.h) / 2) + 1;
                    const valid = [...sim.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
                        .filter((h) => !sim.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < radius);
                    const left = valid.filter((h) => h.q < -1), right = valid.filter((h) => h.q > 1);
                    let s = (SEED * 7919 + b * 104729) >>> 0;
                    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
                    for (const arr of [left, right]) for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
                    for (let i = 0; i < 5; i++) {
                        const bh = left[i], rh = right[i];
                        sim.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: bh.q, r: bh.r, role: roles[i] });
                        sim.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: rh.q, r: rh.r, role: roles[i] });
                    }

                    let winner: unknown = null;
                    sim.bus.on('GAME_OVER', (d) => { winner = d.winner ?? 'DRAW'; });
                    sim.play();
                    let t = 0;
                    while (winner === null && t < MAX_TIME) {
                        sim.tick(DT);
                        t += DT;
                        for (const a of sim.agents) {
                            if (a.hp > 0 && !a.banished && !a.outOfBounds) {
                                // 稽核「非施法時段 a.target 絕不殘留為友軍」（BT_OPT_AGENT_PROMPT.md §2.1）
                                if (a.target && a.target.team === a.team && a.castingSkillIdx === -1) {
                                    allyTargetTicks++;
                                }
                            }
                        }
                    }
                }
            } finally {
                CombatSystem.prototype.initiateCast = origInitiate;
            }

            expect(emptyPbaoeCasts).toBe(0);
            expect(healFullHpCasts).toBe(0);
            expect(allyTargetTicks).toBe(0);
        }, 120000);
    });
});
