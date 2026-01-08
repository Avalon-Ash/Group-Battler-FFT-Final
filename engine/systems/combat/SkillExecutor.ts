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

        // 3. 判定受擊目標
        if (skill.type === 'AOE' || impactCells.length > 1) {
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
                if (HexUtils.dist(source, source.target) <= effRange) {
                    targets.push(source.target);
                }
            }
        }
        
        if (targets.length === 0 && skill.power <= 0 && skill.type === 'SINGLE') {
            targets.push(source);
        }

        // 4. 結算效果
        targets.forEach(target => {
            this.resolveHit(source, target, skill, origin, engine);
        });
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        if (!target || target.hp <= 0 || target.banished) return;

        // A. Damage Calculation
        const result = DamageCalculator.calculate(source, target, skill);
        
        if (result.isMiss) {
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, text: "MISS", color: '#9ca3af' });
            return;
        }

        if (result.shieldAbsorb > 0) {
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, value: -Math.floor(result.shieldAbsorb), color: '#bae6fd', text: "ABSORB" });
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

            // SSOT: Trigger Animation System
            if (!isHeal) {
                target.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
                
                // Physics Impulse (Small nudge on hit)
                if (origin && !skill.ccType) {
                    PhysicsEngine.applyImpulse(target, origin, COMBAT_PARAM.HIT_IMPULSE_MIN);
                }
            }
        }

        // B. Secondary Effects (Vamp, Mana)
        if (result.vampAmount > 0) {
            source.hp = Math.min(source.maxHp, source.hp + result.vampAmount);
            engine.events.push({ type: 'HEAL', pos: {x: source.px, y: source.py}, value: result.vampAmount, color: '#be123c', text: "VAMP" });
        }
        if (result.manaBurn > 0) {
            target.mp = Math.max(0, target.mp - result.manaBurn);
            engine.events.push({ type: 'DAMAGE', pos: {x: target.px, y: target.py}, value: result.manaBurn, color: '#8b5cf6', text: "BURN" });
        }
        if (result.manaRestore > 0) {
            target.mp = Math.min(target.maxMp, target.mp + result.manaRestore);
            engine.events.push({ type: 'HEAL', pos: {x: target.px, y: target.py}, value: result.manaRestore, color: '#60a5fa', text: "MP" });
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