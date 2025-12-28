
import { Agent, GameEngine } from "../../game";
import { Skill, AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { HexMath } from "../../math/HexMath";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";

export class SkillExecutor {

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        let targets: Agent[] = [];
        let origin = {x: source.px, y: source.py}; 
        let targetHex = source.targetHex || (source.target ? {q: source.target.q, r: source.target.r} : {q: source.q, r: source.r});

        // 1. Calculate Impact Area
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
            
            // Spawn Hazards (Delegated)
            HazardManager.spawnHazards(source, impactCells, skill, engine);

        } else {
            if (source.target && source.target.hp > 0 && !source.target.banished) {
                const effRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (HexMath.distance(source, source.target) <= effRange) {
                    targets.push(source.target);
                }
            }
        }
        
        if (targets.length === 0 && skill.power <= 0 && skill.type === 'SINGLE') {
            targets.push(source);
        }
        
        // 2. Resolve Hits
        targets.forEach(t => {
            const dist = HexMath.distance(source, t);
            if (dist > 1) {
                engine.events.push({ type: 'VISUAL_BEAM', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            } else {
                engine.events.push({ type: 'VISUAL_SLASH', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            }
            this.resolveHit(source, t, skill, origin, engine);
        });

        if (skill.tag !== 'BASIC') {
            engine.events.push({ type: 'CAST_FINISH', pos: {x: source.px, y: source.py}, skill: skill });
        }
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        const result = DamageCalculator.calculate(source, target, skill);
        
        if (result.isMiss) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "未命中", color: "#94a3b8" });
            return;
        }

        const oldHp = Math.ceil(target.hp);
        
        if (result.shieldAbsorb > 0) {
            target.shield -= result.shieldAbsorb;
            if (result.shieldAbsorb > 20) {
                engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "吸收", color: "#bae6fd" });
            }
        }

        target.hp = Math.min(target.maxHp, target.hp + result.finalValue);
        
        if (result.vampAmount > 0 && source.hp > 0) {
            source.hp = Math.min(source.maxHp, source.hp + result.vampAmount);
            engine.events.push({ type: 'HEAL', pos: {x: source.px, y: source.py}, value: result.vampAmount, color: '#86efac' });
        }
        if (result.manaBurn > 0) {
            target.mp = Math.max(0, target.mp - result.manaBurn);
            source.mp = Math.min(source.maxMp, source.mp + result.manaBurn);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: `-${result.manaBurn} MP`, color: "#3b82f6" });
        }
        if (result.manaRestore > 0) {
             target.mp = Math.min(target.maxMp, target.mp + result.manaRestore);
             engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: `+${result.manaRestore} MP`, color: "#60a5fa" });
        }

        if (result.finalValue < 0) { 
            target.setAnim(AnimState.HIT);
            target.hitFlashTimer = 0.2;
            
            // Delegate Impulse Calc to PhysicsEngine
            const originPx = origin ? origin : {x: source.px, y: source.py};
            const damageForce = Math.abs(result.finalValue) * 2.0;
            PhysicsEngine.applyImpulse(target, originPx, damageForce, 0.5);
        }

        if (result.isExecute) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "斬殺!", color: "#dc2626" });
        if (result.isCrit) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "暴擊!", color: "#ef4444" });
        if (result.isBlock) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "格擋", color: "#9ca3af" });

        engine.events.push({
            type: result.finalValue < 0 ? 'DAMAGE' : 'HEAL',
            pos: { x: target.px, y: target.py },
            value: result.finalValue,
            sourceId: source.id,
            targetId: target.id,
            skill: skill,
            color: skill.color
        });

        // 9. Apply Status Effects (Delegated to CCManager)
        CCManager.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        CCManager.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);

        const newHp = Math.ceil(target.hp);
        const actionType = result.finalValue < 0 ? 'HIT' : 'HEAL';
        
        const shouldLog = skill.tag !== 'BASIC' || result.isCrit || result.isExecute || newHp <= 0;
        
        if (shouldLog) {
            engine.log(source, actionType, skill.name, target.id, `${actionType === 'HIT' ? '造成傷害' : '回復生命'} ${Math.abs(result.finalValue)} (HP: ${oldHp} -> ${newHp})`);
        }

        if (oldHp > 0 && newHp <= 0) {
            engine.log(source, 'DEATH', '擊殺', target.id, `${target.id} 已陣亡`);
            engine.events.push({ type: 'KILL', pos: { x: target.px, y: target.py }, sourceId: source.id, targetId: target.id });
        }
    }
}
