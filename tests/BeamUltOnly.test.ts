// ╔══════════════════════════════════════════════════════════════════╗
// ║  BeamUltOnly — 光束（雷射）留給奧義（2026-10-26 使用者決定）      ║
// ║  職責：普攻與主動技的序列不得有遠程光束；只允許兩種近身線條：      ║
// ║    普攻 MELEE_PIERCE（長槍突刺）、主動技 DASH_ASSAULT（衝刺殘影）  ║
// ║  遠程的普攻與主動技一律是投射物（projectileSpeed > 0）或命中爆發   ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';
import { BASIC_VISUALS } from '../data/vfx/basic_visuals';
import { ACTIVE_VISUALS } from '../data/vfx/active_visuals';
import { GameEngine } from '../engine/game';
import { Role, Team, type GameEvent } from '../types';

describe('BeamUltOnly', () => {
    it('普攻與主動技只有突刺、衝刺可以畫光束', () => {
        const offenders: string[] = [];
        for (const skill of DEFAULT_SKILL_DB) {
            if (skill.tag !== 'BASIC' && skill.tag !== 'ACTIVE') continue;
            const beams = (SKILL_SEQUENCES[skill.id]?.actions ?? []).filter((a) => a.type === 'BEAM');
            if (beams.length === 0) continue;
            const archetype = skill.tag === 'BASIC' ? BASIC_VISUALS[skill.id]?.archetype : ACTIVE_VISUALS[skill.id]?.archetype;
            const allowed = skill.tag === 'BASIC' ? archetype === 'MELEE_PIERCE' : archetype === 'DASH_ASSAULT';
            if (!allowed) offenders.push(`${skill.id}(${archetype})`);
        }
        expect(offenders).toEqual([]);
    });

    // 原本是雷射的 12 招改成真投射物：出手時發射、抵達後才結算；治療與護盾打在友軍身上
    const CONVERTED = ['rb_b3', 'mb_b2', 'mb_b5', 'sb_b1', 'sb_b3', 'sb_b5', 'mr_b2', 'sr_b1', 'sr_b4', 'tb_a4', 'mb_a2', 'sr_a1'];
    it.each(CONVERTED)('%s：真實引擎中先 PROJECTILE_SPAWN，PROJECTILE_HIT 時才對目標結算', (id) => {
        const skill = DEFAULT_SKILL_DB.find((s) => s.id === id)!;
        expect(skill.projectileSpeed ?? 0).toBeGreaterThan(0);
        const engine = new GameEngine();
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        const friendly = skill.power < 0 || skill.ccType === 'SHIELD';
        const casterTeam = skill.team === 1 ? Team.RED : Team.BLUE;
        const otherTeam = casterTeam === Team.RED ? Team.BLUE : Team.RED;
        engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: casterTeam, q: -2, r: 0, hp: 5000, role: Role.MAGE });
        engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: friendly ? casterTeam : otherTeam, q: 1, r: 0, hp: 5000, role: Role.TANK });
        // 只有同一隊時戰鬥會直接判定結束、投射物不再推進：友軍技能另放一個遠處的敵人
        if (friendly) engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: otherTeam, q: 3, r: -3, hp: 5000, role: Role.TANK });
        engine.play();
        const [caster, target] = engine.agents;
        for (const a of engine.agents) { a.bt = null; a.spawnTimer = 0; } // 出生動畫期間 ProjectileSystem 不發射
        if (friendly) target.hp = Math.floor(target.maxHp / 2);
        const slot = 0;
        caster.skills[slot] = skill;
        caster.skillIds[slot] = skill.id;
        caster.curCDs[slot] = 0;
        caster.mp = caster.maxMp;
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        const seen: { type: string; t: number; targetId?: string }[] = [];
        engine.bus.on('GAME_EVENT', (ev: GameEvent) => {
            if (ev.sourceId === caster.id) seen.push({ type: ev.type, t: engine.battleTime, targetId: ev.targetId });
        });
        engine.combat.initiateCast(caster, slot, engine);
        expect(caster.castingSkillIdx).toBe(slot);
        for (let t = 0; t < skill.cast + 1.5; t += 1 / 60) engine.tick(1 / 60);

        const spawn = seen.find((e) => e.type === 'PROJECTILE_SPAWN');
        const hit = seen.find((e) => e.type === 'PROJECTILE_HIT');
        const effect = seen.find((e) => ['DAMAGE', 'HEAL', 'CC_APPLIED'].includes(e.type) && e.targetId === target.id);
        if (!spawn) throw new Error(`no spawn: ${seen.map((e) => e.type).join(',')} casting=${caster.castingSkillIdx} hp=${caster.hp} stun=${caster.effects.STUN.remaining}`);
        if (!hit) throw new Error(`no hit: ${seen.map((e) => e.type + '@' + e.t.toFixed(2)).join(',')} projectiles=${engine.projectiles.map((p) => p.t.toFixed(2) + '/' + p.totalDuration.toFixed(2)).join(';')}`);
        expect(hit!.t).toBeGreaterThan(spawn!.t);
        expect(effect, seen.map((e) => e.type).join(',')).toBeDefined();
        expect(effect!.t).toBeGreaterThanOrEqual(hit!.t);
    });
});
