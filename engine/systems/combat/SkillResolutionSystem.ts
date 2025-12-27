
import { Agent, GameEngine } from "../../game";
import { Skill, GameEventType, AnimState, Hex } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { HexMath } from "../../math/HexMath";
import { BLOCK_HEIGHT } from "../../../constants";
import { DamageCalculator } from "./DamageCalculator";

export class SkillResolutionSystem {

    // ... (Previous logic unchanged, omitting for brevity until spawnHazards) ...

    public updateCasting(a: Agent, dt: number, engine: GameEngine) {
        if (a.stunTimer > 0 || a.banished || a.hp <= 0) {
            this.handleInterruption(a, engine);
            return;
        }
        if (a.silenceTimer > 0 && a.castingSkillIdx !== -1) {
            const currentSkill = a.skills[a.castingSkillIdx];
            if (currentSkill && currentSkill.tag !== 'BASIC') {
                this.handleInterruption(a, engine);
                return;
            }
        }
        a.castTimer -= dt;
        if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt; 
        if (a.castTimer <= 0) {
            this.completeCast(a, engine);
        }
    }

    private handleInterruption(a: Agent, engine: GameEngine) {
        const skillIdx = a.castingSkillIdx;
        if (skillIdx !== -1 && a.castTimer > 0 && a.skills[skillIdx]) {
            const s = a.skills[skillIdx]!;
            engine.log(a, 'CC', '中斷', s.name, '詠唱被打斷');
            let centerPos = { x: a.px, y: a.py };
            engine.events.push({ type: 'CAST_BREAK', pos: centerPos, value: 0, color: s.color, skill: s });
        }
        a.castingSkillIdx = -1;
        a.castTimer = 0;
        a.castingAnimationTimer = 0;
        a.setAnim(AnimState.IDLE); 
    }

    private completeCast(a: Agent, engine: GameEngine) {
        const s = a.skills[a.castingSkillIdx]!;
        a.mp = Math.min(a.maxMp, Math.max(0, a.mp - s.cost + s.gain));
        a.curCDs[a.castingSkillIdx] = s.cd;
        if (s.projectileSpeed && s.projectileSpeed > 0) {
             engine.combat.spawnProjectile(a, s, engine);
        } else {
            this.executeInstantSkill(a, s, engine);
        }
        a.castingSkillIdx = -1;
        a.castingAnimationTimer = 0;
        a.setAnim(AnimState.COMBAT_IDLE);
    }

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        let targets: Agent[] = [];
        let origin = {x: source.px, y: source.py}; 
        let targetHex = source.targetHex || (source.target ? {q: source.target.q, r: source.target.r} : {q: source.q, r: source.r});

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
            
            this.spawnHazards(source, impactCells, skill, engine);

        } else {
            if (source.target && source.target.hp > 0 && !source.target.banished) {
                const effRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (HexMath.distance(source, source.target) <= effRange) {
                    targets.push(source.target);
                }
            }
        }
        
        targets.forEach(t => {
            const dist = HexMath.distance(source, t);
            if (dist > 1) engine.events.push({ type: 'VISUAL_BEAM', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            else engine.events.push({ type: 'VISUAL_SLASH', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            this.resolveHit(source, t, skill, origin, engine);
        });

        engine.events.push({ type: 'CAST_FINISH', pos: {x: source.px, y: source.py}, skill: skill });
    }

    private spawnHazards(source: Agent, cells: {q: number, r: number}[], skill: Skill, engine: GameEngine) {
        const dur = skill.ccDur || 5.0;
        let hType: any = null;

        if (skill.ccType === 'DOT') hType = 'POISON';
        if (skill.element === 'FIRE') hType = 'FIRE';
        if (skill.element === 'ICE') hType = 'ICE';
        if (skill.element === 'VOID' || skill.ccType === 'PULL') hType = 'GRAVITY';

        if (hType) {
            cells.forEach(tile => {
                engine.map.addHazard(
                    tile.q, tile.r, 
                    hType, 
                    dur, 
                    source.id, 
                    source.team, 
                    skill.color,
                    (Math.abs(skill.power) * 0.2) || 10, 
                    0.5,
                    engine // Pass engine for VFX trigger
                );
            });
        }
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        const result = DamageCalculator.calculate(source, target, skill);
        const oldHp = Math.ceil(target.hp);
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
            const originPx = origin ? origin : {x: source.px, y: source.py};
            const impulse = this.calculateImpulseVector(originPx, {x: target.px, y: target.py}, Math.abs(result.finalValue));
            target.physics.vx += impulse.x;
            target.physics.vy += impulse.y;
            target.physics.vAngle += (Math.random() - 0.5) * 0.5;
        }

        if (result.isExecute) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "斬殺!", color: "#dc2626" });
        if (result.isCrit) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "CRIT!", color: "#ef4444" });
        if (result.isBlock) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "BLOCK", color: "#9ca3af" });

        engine.events.push({
            type: result.finalValue < 0 ? 'DAMAGE' : 'HEAL',
            pos: { x: target.px, y: target.py },
            value: result.finalValue,
            sourceId: source.id,
            targetId: target.id,
            skill: skill,
            color: skill.color
        });

        this.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        this.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);

        const newHp = Math.ceil(target.hp);
        const actionType = result.finalValue < 0 ? 'HIT' : 'HEAL';
        engine.log(source, actionType, skill.name, target.id, `${actionType === 'HIT' ? '造成傷害' : '回復生命'} ${Math.abs(result.finalValue)} (HP: ${oldHp} -> ${newHp})`);

        if (oldHp > 0 && newHp <= 0) {
            engine.log(source, 'DEATH', '擊殺', target.id, `${target.id} 已陣亡`);
            engine.events.push({ type: 'KILL', pos: { x: target.px, y: target.py }, sourceId: source.id, targetId: target.id });
        }
    }

    private calculateImpulseVector(origin: {x: number, y: number}, target: {x: number, y: number}, damage: number) {
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const force = Math.min(400, Math.max(100, damage * 1.5));
        if (len <= 0.1) {
            const ang = Math.random() * Math.PI * 2;
            return { x: Math.cos(ang) * force, y: Math.sin(ang) * force };
        }
        return { x: (dx / len) * force, y: (dy / len) * force };
    }

    public applyCC(source: Agent, target: Agent, skill: Skill, type: string | undefined, dur: number | undefined, force: number | undefined, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        if (!type || type === 'NONE') return;
        const { effectiveDuration, isImmune } = this.checkDR(target, type, dur || 0);
        if (isImmune) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "免疫", color: "#9ca3af" });
            return;
        }

        let statusText = "";
        let statusColor = "#fff";

        switch (type) {
            case 'STUN':
                if (effectiveDuration > target.stunTimer) {
                    target.stunTimer = effectiveDuration;
                    target.stunMax = effectiveDuration;
                }
                target.isMoving = false;
                target.setAnim(AnimState.STUN);
                statusText = "暈眩"; statusColor = "#facc15";
                if (skill.element === 'ICE') target.visualStatus = 'FROZEN';
                break;
            case 'SILENCE':
                if (effectiveDuration > target.silenceTimer) {
                    target.silenceTimer = effectiveDuration;
                    target.silenceMax = effectiveDuration;
                }
                statusText = "沉默"; statusColor = "#94a3b8";
                break;
            case 'BANISH':
                if (effectiveDuration > target.banishTimer) {
                    target.banishTimer = effectiveDuration;
                    target.banishMax = effectiveDuration;
                }
                target.banished = true;
                target.isMoving = false;
                target.setAnim(AnimState.STUN);
                statusText = "放逐"; statusColor = "#c084fc";
                if (skill.specialVisualStatus) target.visualStatus = skill.specialVisualStatus;
                break;
            case 'KNOCKBACK':
            case 'PULL':
                const result = this.calculateKnockback(target, force || 0, source, origin, type, engine);
                if (result.applied) {
                    statusText = type === 'PULL' ? "牽引" : "擊退";
                    target.setAnim(AnimState.HIT);
                    target.physics.vz += 200; 
                }
                break;
            case 'DOT':
                target.dotDmg = force || 10;
                target.dotTimer = effectiveDuration;
                statusText = "中毒"; statusColor = "#10b981";
                break;
            case 'HOT':
                target.hotVal = force || 10;
                target.hotTimer = effectiveDuration;
                statusText = "再生"; statusColor = "#86efac";
                break;
        }

        if (statusText) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: statusText, color: statusColor });
        }
    }

    private checkDR(target: Agent, type: string, baseDuration: number) {
        const isHardCC = ['STUN', 'SILENCE', 'BANISH'].includes(type);
        if (!isHardCC) return { effectiveDuration: baseDuration, isImmune: false };
        const stacks = target.drStacks[type] || 0;
        const multiplier = Math.pow(0.5, stacks);
        if (multiplier < 0.2) return { effectiveDuration: 0, isImmune: true };
        target.drStacks[type] = stacks + 1;
        target.drTimers[type] = 10.0;
        return { effectiveDuration: baseDuration * multiplier, isImmune: false };
    }

    private calculateKnockback(target: Agent, force: number, source: Agent, origin: {x: number, y: number} | undefined, type: string, engine: GameEngine) {
        const rawForce = Math.max(1, force);
        const resistance = target.weight || 1; 
        const tilesToPush = Math.max(0, rawForce - resistance);
        if (tilesToPush === 0) return { applied: false };

        const originPx = origin ? origin : {x: source.px, y: source.py};
        const dir = Vector.normalize(Vector.sub({x: target.px, y: target.py}, originPx));
        const vector = type === 'KNOCKBACK' ? dir : Vector.mult(dir, -1);
        
        let currentH = {q: target.q, r: target.r};
        let finalH = currentH;

        for(let k=0; k<tilesToPush; k++) {
            const neighbors = HexUtils.neighbors(currentH);
            let bestN: Hex | null = null;
            let bestDot = -99;
            for(const n of neighbors) {
                const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                const cPx = HexUtils.toPx(currentH.q, currentH.r, engine.mapConfig);
                const nDir = Vector.normalize(Vector.sub(nPx, cPx));
                const dot = nDir.x * vector.x + nDir.y * vector.y;
                if (dot > bestDot) {
                    bestDot = dot;
                    bestN = n;
                }
            }
            if (bestN) {
                if (!engine.map.isValid(bestN.q, bestN.r) || engine.map.hasObstacle(bestN.q, bestN.r)) break; 
                if (engine.getAgentAt(bestN.q, bestN.r)) break;
                const curHeight = engine.map.getTerrainHeight(currentH.q, currentH.r);
                const nextHeight = engine.map.getTerrainHeight(bestN.q, bestN.r);
                if (nextHeight > curHeight + 24) break; 
                currentH = bestN;
                finalH = bestN;
            } else {
                break;
            }
        }
        
        if (finalH.q !== target.q || finalH.r !== target.r) {
            engine.updateAgentPosition(target, finalH.q, finalH.r);
            if (target.isMoving) {
                target.isMoving = false;
                target.path = [];
            }
            return { applied: true };
        }
        return { applied: false };
    }
}
