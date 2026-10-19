// ╔══════════════════════════════════════════════════════════╗
// ║  tests/NewStatusEffects.test.ts — 三種新效果單元測試 (SK2)   ║
// ║  職責：依據 AGENT_PROMPT §2 SK2 驗證三種新效果：           ║
// ║  - HASTE: 冷卻遞減與移動速度倍率（與危害減速相乘）       ║
// ║  - REFLECT: 反彈量、DOT 不觸發、反傷不連鎖、可致死       ║
// ║  - LIFESTEAL: 回復量與技能自帶 VAMP 相加                  ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { CCManager } from '../engine/systems/combat/CCManager';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { CooldownSystem } from '../engine/systems/status/CooldownSystem';
import { MotionEngine } from '../engine/systems/movement/MotionEngine';
import { EffectSystem } from '../engine/systems/status/EffectSystem';
import { applyDirectDamage } from '../engine/systems/combat/DirectDamage';
import { DamageCalculator } from '../engine/systems/combat/DamageCalculator';
import { setRandomSource, resetRandomSource } from '../engine/math/rng';
import { COMBAT_PARAM } from '../constants';

const HP = 500;

describe('New Status Effects (SK2)', () => {
    let engine: GameEngine;
    let executor: SkillExecutor;

    beforeEach(() => {
        setRandomSource(() => 0.5);
        engine = new GameEngine();
        executor = new SkillExecutor();
    });

    afterEach(() => {
        resetRandomSource();
    });

    function spawn(team: Team, q: number, r: number = 0): Agent {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, Role.WARRIOR);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP;
        a.hp = HP;
        a.shield = 0;
        a.spawnTimer = 0;
        return a;
    }

    describe('HASTE 加速', () => {
        it('冷卻遞減速度依 HASTE 百分比加速遞減，上限 100%', () => {
            const agent = spawn(Team.BLUE, 0, 0);
            const cdSystem = new CooldownSystem();

            // 技能 0 冷卻設為 10.0 秒
            agent.curCDs[0] = 10.0;

            // 套用 +50% 加速，持續 5 秒
            CCManager.applyCC(agent, agent, {} as Skill, 'HASTE', 5.0, 50, undefined, engine);
            expect(agent.effects.HASTE.remaining).toBe(5.0);
            expect(agent.effects.HASTE.value).toBe(50);

            // 更新 1 秒：冷卻應遞減 1.0 * (1 + 0.5) = 1.5 秒
            cdSystem.update(agent, 1.0);
            expect(agent.curCDs[0]).toBeCloseTo(8.5);

            // 超過 100% 時夾在 100% (+100% => 2x 遞減)
            agent.effects.HASTE.value = 250;
            cdSystem.update(agent, 1.0);
            expect(agent.curCDs[0]).toBeCloseTo(6.5);
        });

        it('移動速度依 HASTE 倍率放大，且與危害減速相乘', () => {
            const agent = spawn(Team.BLUE, 0, 0);
            agent.moveSpeed = 2.0;
            agent.moveSpeedMult = 1.0;
            agent.path = [{ q: 1, r: 0 }];
            agent.isMoving = true;

            // 套用 +30% 加速
            CCManager.applyCC(agent, agent, {} as Skill, 'HASTE', 3.0, 30, undefined, engine);

            // 無危害減速時：moveDelta = 2.0 * 1.0 * 1.3 * 0.1 = 0.26
            MotionEngine.updateMovement(agent, 0.1, engine, 1.0);
            expect(agent.moveProgress).toBeCloseTo(0.26);

            // 有危害減速（如 ICE 0.5）時相乘：moveDelta = 2.0 * 0.5 * 1.3 * 0.1 = 0.13
            agent.moveProgress = 0;
            agent.path = [{ q: 1, r: 0 }];
            agent.isMoving = true;
            MotionEngine.updateMovement(agent, 0.1, engine, 0.5);
            expect(agent.moveProgress).toBeCloseTo(0.13);
        });
    });

    describe('REFLECT 反傷', () => {
        const directDmgSkill: Skill = {
            id: 'test_direct_dmg',
            name: '直接打擊',
            tag: 'ACTIVE',
            role: Role.WARRIOR,
            range: 1,
            cast: 0.1,
            cd: 1.0,
            cost: 0,
            gain: 0,
            type: 'SINGLE',
            power: 100,
            color: '#ef4444',
            element: 'PHYSICAL',
        };

        it('受到敵方技能直接傷害後對攻擊者反彈 實際扣血量×v/100 真實傷害，可致死', () => {
            const attacker = spawn(Team.BLUE, 0, 0);
            const defender = spawn(Team.RED, 1, 0);
            attacker.target = defender;

            // 防守者開啟 40% 反傷
            CCManager.applyCC(defender, defender, {} as Skill, 'REFLECT', 3.0, 40, undefined, engine);

            const defenderHpBefore = defender.hp;
            const attackerHpBefore = attacker.hp;

            executor.executeInstantSkill(attacker, directDmgSkill, engine);

            const defenderLost = defenderHpBefore - defender.hp;
            expect(defenderLost).toBeGreaterThan(0);

            // 攻擊者承受真實反傷 = 扣血量 * 40%
            const expectedReflect = Math.floor(defenderLost * 0.4);
            expect(attacker.hp).toBe(attackerHpBefore - expectedReflect);

            // 驗證反傷可致死
            attacker.hp = 5;
            executor.executeInstantSkill(attacker, directDmgSkill, engine);
            expect(attacker.hp).toBeLessThanOrEqual(0);
        });

        it('DOT 傷害不觸發反傷', () => {
            const attacker = spawn(Team.BLUE, 0, 0);
            const defender = spawn(Team.RED, 1, 0);

            // 防守者開啟 50% 反傷
            CCManager.applyCC(defender, defender, {} as Skill, 'REFLECT', 5.0, 50, undefined, engine);

            // 攻擊者給防守者掛上 DOT
            CCManager.applyCC(attacker, defender, {} as Skill, 'DOT', 3.0, 40, undefined, engine);

            const attackerHpBefore = attacker.hp;
            const effectSystem = new EffectSystem();

            // 推進 DOT 一跳
            effectSystem.update(defender, 1.0, engine);

            // 防守者受 DOT 扣血
            expect(defender.hp).toBeLessThan(HP);
            // 攻擊者未受反傷
            expect(attacker.hp).toBe(attackerHpBefore);
        });

        it('反傷不連鎖：攻擊者與防守者皆有 REFLECT 時，反傷本身不再次反彈', () => {
            const attacker = spawn(Team.BLUE, 0, 0);
            const defender = spawn(Team.RED, 1, 0);
            attacker.target = defender;

            // 雙方皆有反傷
            CCManager.applyCC(attacker, attacker, {} as Skill, 'REFLECT', 5.0, 50, undefined, engine);
            CCManager.applyCC(defender, defender, {} as Skill, 'REFLECT', 5.0, 40, undefined, engine);

            const defenderHpBefore = defender.hp;
            const attackerHpBefore = attacker.hp;

            executor.executeInstantSkill(attacker, directDmgSkill, engine);

            const defenderLost = defenderHpBefore - defender.hp;
            const expectedReflectToAttacker = Math.floor(defenderLost * 0.4);

            // 攻擊者只承受防守者的反彈傷害
            expect(attacker.hp).toBe(attackerHpBefore - expectedReflectToAttacker);

            // 防守者沒有再次承受攻擊者的反彈（不連鎖！）
            expect(defender.hp).toBe(defenderHpBefore - defenderLost);
        });
    });

    describe('LIFESTEAL 吸血', () => {
        it('造成技能直接傷害時，額外回復 實際扣血量×v/100，且與技能自帶 VAMP 相加', () => {
            const attacker = spawn(Team.BLUE, 0, 0);
            const defender = spawn(Team.RED, 1, 0);
            attacker.target = defender;
            attacker.hp = 100; // 殘血以便吸收回復

            // 技能自帶 30% VAMP
            const vampSkill: Skill = {
                id: 'test_vamp_skill',
                name: '吸血打擊',
                tag: 'ACTIVE',
                role: Role.WARRIOR,
                range: 1,
                cast: 0.1,
                cd: 1.0,
                cost: 0,
                gain: 0,
                type: 'SINGLE',
                power: 100,
                color: '#ef4444',
                element: 'PHYSICAL',
                effectType: 'VAMP',
                effectVal: 0.3,
            };

            // 攻擊者擁有 25% LIFESTEAL 增益
            CCManager.applyCC(attacker, attacker, {} as Skill, 'LIFESTEAL', 4.0, 25, undefined, engine);

            const calcResult = DamageCalculator.calculate(attacker, defender, vampSkill, engine.battleTime);
            const damage = Math.abs(calcResult.finalValue);

            // vampAmount 應為 damage * (0.3 + 0.25) = damage * 0.55
            const expectedVamp = Math.floor(damage * 0.55);
            expect(calcResult.vampAmount).toBe(expectedVamp);

            // 執行技能，確認攻擊者獲得回復
            const attackerHpBefore = attacker.hp;
            executor.executeInstantSkill(attacker, vampSkill, engine);
            expect(attacker.hp).toBe(attackerHpBefore + expectedVamp);
        });
    });
});
