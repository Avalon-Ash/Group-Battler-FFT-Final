import { Agent, GameEngine } from "../../game";
import { Skill } from "../../../types";
import { HexUtils } from "../../utils";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";
import { COMBAT_PARAM } from "../../../constants";

export class SkillExecutor {

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        let targets: Agent[] = [];
        
        // 1. 確定施法中心點
        let targetHex;
        if (skill.range === 0) {
            targetHex = { q: source.q, r: source.r };
        } else {
            targetHex = source.targetHex || (source.target ? {q: source.target.q, r: source.target.r} : {q: source.q, r: source.r});
        }

        // 2. 獲取受影響區域
        const impactCells = engine.movement.targeting.getImpactArea(source, targetHex, skill, engine);
        const p = HexUtils.toPx(targetHex.q, targetHex.r, engine.mapConfig);
        const origin = { x: p.x, y: p.y };

        // [NEW] DASH Effect: Move caster towards targetHex
        if (skill.effectType === 'DASH' || skill.effectType2 === 'DASH') {
            let bestH = null;
            let minDist = Infinity;
            
            // If targetHex is empty, dash directly there
            const targetOccupant = engine.getAgentAt(targetHex.q, targetHex.r);
            if (engine.map.isValid(targetHex.q, targetHex.r) && (!targetOccupant || targetOccupant === source) && !engine.map.hasObstacle(targetHex.q, targetHex.r)) {
                bestH = targetHex;
            } else {
                // Otherwise find an empty neighbor
                for (const n of HexUtils.neighbors(targetHex)) {
                    const occupant = engine.getAgentAt(n.q, n.r);
                    if (engine.map.isValid(n.q, n.r) && (!occupant || occupant === source) && !engine.map.hasObstacle(n.q, n.r)) {
                        const dist = HexUtils.dist(source, n);
                        if (dist < minDist) {
                            minDist = dist;
                            bestH = n;
                        }
                    }
                }
            }
            
            if (bestH) {
                engine.updateAgentPosition(source, bestH.q, bestH.r);
                const newPx = HexUtils.toPx(bestH.q, bestH.r, engine.mapConfig);
                source.px = newPx.x;
                source.py = newPx.y;
                source.physics.vz += 150; // Visual jump
                engine.events.push({ type: 'CC_APPLIED', pos: {x: source.px, y: source.py}, text: "突進", color: "#60a5fa" });
            }
        }

        // 3. 判定受擊目標
        let isAOE = skill.type === 'AOE' || impactCells.length > 1;
        
        if (isAOE) {
            impactCells.forEach(cell => {
                const u = engine.getAgentAt(cell.q, cell.r);
                if (u && u.hp > 0 && !u.banished) {
                    // 敵我識別
                    if (skill.power >= 0 && u.team !== source.team) targets.push(u);
                    else if (skill.power < 0 && u.team === source.team) targets.push(u);
                }
            });
            
            engine.events.push({ type: 'IMPACT_AOE', pos: origin, skill, color: skill.color });
            HazardManager.spawnHazards(source, impactCells, skill, engine);
        } else {
            if (source.target && source.target.hp > 0 && !source.target.banished) {
                const effRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (HexUtils.dist(source, source.target) <= effRange + 0.1) {
                    targets.push(source.target);
                }
            }
        }
        
        if (targets.length === 0 && skill.power <= 0 && skill.type === 'SINGLE') {
            targets.push(source);
        }

        // 4. 結算效果
        targets.forEach(target => {
            // [FIX] For SINGLE target skills, origin should be undefined so CCManager uses the caster's position.
            // For AOE skills, origin is the center of the AOE.
            this.resolveHit(source, target, skill, isAOE ? origin : undefined, engine);
        });
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        if (!target || target.hp <= 0 || target.banished) return;

        // A. Damage Calculation
        const result = DamageCalculator.calculate(source, target, skill, engine.battleTime);
        
        if (result.isMiss) {
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, text: "MISS", color: '#9ca3af' });
            engine.log(source, 'HIT', '閃避', target.id, `攻擊未命中`);
            return;
        }

        if (result.isBlock) {
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, text: "BLOCK", color: '#fb923c' });
            engine.log(source, 'HIT', '格擋', target.id, `減少15%傷害`);
        }

        if (result.shieldAbsorb > 0) {
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, value: -Math.floor(result.shieldAbsorb), color: '#bae6fd', text: "ABSORB" });
            engine.log(source, 'HIT', '吸收', target.id, `護盾吸收 ${Math.floor(result.shieldAbsorb)} 傷害`);
        }

        if (result.finalValue !== 0) {
            target.hp = Math.max(0, Math.min(target.maxHp, target.hp + result.finalValue));
            
            // Visual Event
            const isHeal = result.finalValue > 0;
            const evtType = isHeal ? 'HEAL' : 'DAMAGE';
            const color = isHeal ? '#86efac' : (result.isCrit ? '#ef4444' : skill.color);
            
            engine.events.push({ 
                type: evtType, 
                pos: {x: target.px, y: target.py}, 
                value: Math.abs(Math.floor(result.finalValue)), 
                color,
                skill,
                targetId: target.id,
                sourceId: source.id
            });

            const actionName = isHeal ? '治療' : (result.isCrit ? '爆擊' : '命中');
            const logType = isHeal ? 'HEAL' : 'HIT';
            engine.log(source, logType, actionName, target.id, `造成 ${Math.abs(Math.floor(result.finalValue))} ${isHeal ? '治療' : '傷害'}`);

            // SSOT: Trigger Animation System
            if (!isHeal) {
                target.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
                
                // Physics Impulse (Small nudge on hit)
                if (origin && !skill.ccType) {
                    PhysicsEngine.applyImpulse(target, origin, COMBAT_PARAM.HIT_IMPULSE_MIN);
                }
            }
        }

        // B. Secondary Effects (Vamp, Mana, Self Damage)
        if (result.vampAmount > 0) {
            source.hp = Math.min(source.maxHp, source.hp + result.vampAmount);
            engine.events.push({ type: 'HEAL', pos: {x: source.px, y: source.py}, value: result.vampAmount, color: '#be123c', text: "VAMP" });
            engine.log(source, 'HEAL', '吸血', source.id, `回復 ${Math.floor(result.vampAmount)} HP`);
        }
        if (result.manaBurn > 0) {
            target.mp = Math.max(0, target.mp - result.manaBurn);
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, value: result.manaBurn, color: '#8b5cf6', text: "BURN" });
            engine.log(source, 'HIT', '燃魔', target.id, `燃燒 ${Math.floor(result.manaBurn)} MP`);
        }
        if (result.manaRestore > 0) {
            target.mp = Math.min(target.maxMp, target.mp + result.manaRestore);
            engine.events.push({ type: 'HEAL', pos: {x: target.px, y: target.py}, value: result.manaRestore, color: '#60a5fa', text: "MP" });
            engine.log(source, 'HEAL', '回魔', target.id, `回復 ${Math.floor(result.manaRestore)} MP`);
        }
        
        const isSelfDmg1 = skill.effectType === 'SELF_DAMAGE';
        const isSelfDmg2 = skill.effectType2 === 'SELF_DAMAGE';
        if (isSelfDmg1 || isSelfDmg2) {
            const dmgVal = (isSelfDmg1 ? skill.effectVal : skill.effectVal2) || 50;
            source.hp = Math.max(0, source.hp - dmgVal);
            engine.events.push({ type: 'DAMAGE', pos: {x: source.px, y: source.py}, value: dmgVal, color: '#991b1b', text: "SACRIFICE" });
            engine.log(source, 'HIT', '自殘', source.id, `消耗 ${dmgVal} HP`);
            if (source.hp <= 0) {
                engine.agentManager.handleDeadState(source, engine);
                engine.pushEvent('KILL', {x: source.px, y: source.py}, { sourceId: source.id, targetId: source.id });
            }
        }

        // C. Crowd Control (CC) Application
        // Cast to string to allow 'NONE' check against strictly typed Union
        if (skill.ccType && (skill.ccType as string) !== 'NONE') {
            CCManager.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        }
        if (skill.ccType2 && (skill.ccType2 as string) !== 'NONE') {
            CCManager.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);
        }

        // D. Death Check
        if (target.hp <= 0) {
            engine.agentManager.handleDeadState(target, engine);
            if (result.isExecute) {
                engine.log(source, 'HIT', '斬殺', target.id, `造成 ${Math.abs(result.finalValue)} 傷害 (斬殺)`);
            } else {
                engine.pushEvent('KILL', {x: target.px, y: target.py}, { sourceId: source.id, targetId: target.id });
            }
        }
    }
}