import { Agent, GameEngine } from "../../game";
import { Skill, AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";

export class SkillExecutor {
    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        let targets: Agent[] = [];
        let origin = { x: source.px, y: source.py };
        let targetHex = source.targetHex || (source.target ? { q: source.target.q, r: source.target.r } : { q: source.q, r: source.r });
        const impactCells = engine.movement.targeting.getImpactArea(source, targetHex, skill, engine);

        if (skill.type === 'AOE' || impactCells.length > 1) {
            impactCells.forEach(cell => {
                const u = engine.getAgentAt(cell.q, cell.r);
                if (u && u.hp > 0 && !u.banished) {
                    if (skill.power >= 0 && u.team !== source.team) targets.push(u);
                    else if (skill.power < 0 && u.team === source.team) targets.push(u);
                }
            });
            const p = HexUtils.toPx(targetHex.q, targetHex.r, engine.mapConfig);
            origin = { x: p.x, y: p.y };
            engine.events.push({ type: 'IMPACT_AOE', pos: origin, skill, color: skill.color });
            HazardManager.spawnHazards(source, impactCells, skill, engine);
        } else {
            if (source.target && source.target.hp > 0 && !source.target.banished) {
                const effRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (HexUtils.dist(source, source.target) <= effRange) {
                    targets.push(source.target);
                }
            }
        }

        targets.forEach(t => {
            const dist = HexUtils.dist(source, t);
            if (dist > 1) {
                engine.events.push({ type: 'VISUAL_BEAM', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            } else {
                engine.events.push({ type: 'VISUAL_SLASH', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            }
            this.resolveHit(source, t, skill, origin, engine);
        });

        if (skill.tag !== 'BASIC') {
            engine.events.push({ type: 'CAST_FINISH', pos: { x: source.px, y: source.py }, skill: skill });
        }
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: { x: number, y: number } | undefined, engine: GameEngine) {
        const result = DamageCalculator.calculate(source, target, skill);
        if (result.isMiss) {
            engine.events.push({ type: 'CC_APPLIED', pos: { x: target.px, y: target.py }, text: "MISS", color: "#94a3b8" });
            return;
        }

        const oldHp = Math.ceil(target.hp);
        if (result.shieldAbsorb > 0) target.shield -= result.shieldAbsorb;
        target.hp = Math.min(target.maxHp, target.hp + result.finalValue);

        if (result.vampAmount > 0 && source.hp > 0) {
            source.hp = Math.min(source.maxHp, source.hp + result.vampAmount);
            engine.events.push({ type: 'HEAL', pos: { x: source.px, y: source.py }, value: result.vampAmount, color: '#86efac' });
        }

        if (result.finalValue < 0) {
            target.setAnim(AnimState.HIT);
            target.hitFlashTimer = 0.2;
            const originPx = origin ? origin : { x: source.px, y: source.py };
            const damageForce = Math.min(800, Math.abs(result.finalValue) * 3.5);
            PhysicsEngine.applyImpulse(target, originPx, damageForce, 0.6);
        }

        engine.events.push({
            type: result.finalValue < 0 ? 'DAMAGE' : 'HEAL',
            pos: { x: target.px, y: target.py },
            value: result.finalValue,
            sourceId: source.id,
            targetId: target.id,
            skill: skill,
            color: skill.color
        });

        CCManager.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        CCManager.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);

        if (oldHp > 0 && target.hp <= 0) {
            engine.events.push({ type: 'KILL', pos: { x: target.px, y: target.py }, sourceId: source.id, targetId: target.id });
        }
    }
}