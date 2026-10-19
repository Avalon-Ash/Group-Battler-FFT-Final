// ╔══════════════════════════════════════════════════════════╗
// ║  tests/CcSelf.test.ts — 控制效果自我作用測試 (SK1)        ║
// ║  職責：驗證 ccSelf / ccSelf2 機制：                      ║
// ║  - AOE 傷害技帶自我護盾打中 3 個敵人時施法者只得到 1 次護盾║
// ║  - 沒打中任何人時施法者依然得到 1 次護盾                ║
// ║  - 敵方目標不獲得自我增益，正常承受傷害與非 self 控制   ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { ProjectileSystem } from '../engine/systems/combat/ProjectileSystem';

const HP = 200;

describe('Skill ccSelf / ccSelf2 (SK1)', () => {
    let engine: GameEngine;
    let executor: SkillExecutor;

    beforeEach(() => {
        engine = new GameEngine();
        executor = new SkillExecutor();
    });

    function spawn(team: Team, q: number, r: number = 0): Agent {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, Role.TANK);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP;
        a.hp = HP;
        a.shield = 0;
        a.spawnTimer = 0;
        return a;
    }

    const aoeShieldSkill: Skill = {
        id: 'test_aoe_shield',
        name: '六稜護盾測試',
        tag: 'ACTIVE',
        role: Role.TANK,
        range: 0,
        cast: 0.1,
        cd: 1.0,
        cost: 0,
        gain: 0,
        type: 'AOE',
        aoeRadius: 1,
        power: 50,
        color: '#60a5fa',
        element: 'PHYSICAL',
        ccType: 'SHIELD',
        ccForce: 100,
        ccSelf: true,
    };

    it('AOE 傷害技帶自我護盾打中 3 個敵人時，施法者只獲得 1 次護盾且敵方承受傷害', () => {
        const caster = spawn(Team.RED, 0, 0);
        const e1 = spawn(Team.BLUE, 1, 0);
        const e2 = spawn(Team.BLUE, 0, 1);
        const e3 = spawn(Team.BLUE, -1, 1);

        executor.executeInstantSkill(caster, aoeShieldSkill, engine);

        // 施法者只得到 1 次護盾（100，而非 300）
        expect(caster.shield).toBe(100);

        // 3 個敵人都受到傷害，且都沒有獲得護盾
        expect(e1.hp).toBeLessThan(HP);
        expect(e2.hp).toBeLessThan(HP);
        expect(e3.hp).toBeLessThan(HP);
        expect(e1.shield).toBe(0);
        expect(e2.shield).toBe(0);
        expect(e3.shield).toBe(0);
    });

    it('AOE 傷害技沒打中任何目標時，施法者依然獲得 1 次護盾', () => {
        const caster = spawn(Team.RED, 0, 0);

        executor.executeInstantSkill(caster, aoeShieldSkill, engine);

        expect(caster.shield).toBe(100);
    });

    it('次控制 ccSelf2: 主控 TAUNT 對敵方生效，次控 SHIELD 只對施法者套用一次', () => {
        const caster = spawn(Team.RED, 0, 0);
        const e1 = spawn(Team.BLUE, 1, 0);
        const e2 = spawn(Team.BLUE, -1, 0);

        const aoeTauntShieldSkill: Skill = {
            id: 'test_aoe_taunt_shield',
            name: '挑釁護盾測試',
            tag: 'ACTIVE',
            role: Role.TANK,
            range: 0,
            cast: 0.1,
            cd: 1.0,
            cost: 0,
            gain: 0,
            type: 'AOE',
            aoeRadius: 1,
            power: 30,
            color: '#ef4444',
            element: 'PHYSICAL',
            ccType: 'TAUNT',
            ccDur: 2.0,
            ccType2: 'SHIELD',
            ccForce2: 150,
            ccSelf2: true,
        };

        executor.executeInstantSkill(caster, aoeTauntShieldSkill, engine);

        // 施法者獲得護盾，但不受嘲諷
        expect(caster.shield).toBe(150);
        expect(caster.effects.TAUNT.remaining).toBe(0);

        // 敵人被嘲諷，且沒有獲得護盾
        expect(e1.effects.TAUNT.remaining).toBeGreaterThan(0);
        expect(e2.effects.TAUNT.remaining).toBeGreaterThan(0);
        expect(e1.shield).toBe(0);
        expect(e2.shield).toBe(0);
    });

    it('投射物技能帶 ccSelf 時在命中時套用自我護盾一次', () => {
        const caster = spawn(Team.RED, 0, 0);
        const target = spawn(Team.BLUE, 2, 0);
        caster.target = target;

        const projSkill: Skill = {
            id: 'test_proj_shield',
            name: '投射物護盾測試',
            tag: 'ACTIVE',
            role: Role.RANGER,
            range: 3,
            cast: 0.1,
            cd: 1.0,
            cost: 0,
            gain: 0,
            type: 'SINGLE',
            power: 40,
            color: '#60a5fa',
            element: 'PHYSICAL',
            projectileSpeed: 500,
            ccType: 'SHIELD',
            ccForce: 80,
            ccSelf: true,
        };

        const projSystem = new ProjectileSystem();
        projSystem.spawnProjectile(caster, projSkill, engine);

        expect(engine.projectiles.length).toBe(1);
        expect(caster.shield).toBe(0);

        // 推進投射物直到命中
        while (engine.projectiles.length > 0) {
            projSystem.update(0.1, engine, executor);
        }

        // 命中後施法者獲得護盾一次，目標承受傷害且無護盾
        expect(caster.shield).toBe(80);
        expect(target.hp).toBeLessThan(HP);
        expect(target.shield).toBe(0);
    });

    it('刪除轉向後：傷害技若無 ccSelf，增益控制不會轉給施法者，也不會套給敵人', () => {
        const caster = spawn(Team.RED, 0, 0);
        const enemy = spawn(Team.BLUE, 1, 0);
        caster.target = enemy;

        const damageWithNoSelfBuff: Skill = {
            id: 'test_no_self_buff',
            name: '無自我標記傷害技',
            tag: 'BASIC',
            role: Role.WARRIOR,
            range: 1,
            cast: 0.1,
            cd: 1.0,
            cost: 0,
            gain: 0,
            type: 'SINGLE',
            power: 50,
            color: '#fbbf24',
            element: 'PHYSICAL',
            ccType: 'SHIELD',
            ccForce: 100,
            // 故意不設 ccSelf: true
        };

        executor.executeInstantSkill(caster, damageWithNoSelfBuff, engine);

        // 敵人受傷
        expect(enemy.hp).toBeLessThan(HP);
        // 敵人不會拿到護盾（CCManager polarity 擋住）
        expect(enemy.shield).toBe(0);
        // 施法者也不會拿到護盾（因為已刪除轉向邏輯）
        expect(caster.shield).toBe(0);
    });
});
