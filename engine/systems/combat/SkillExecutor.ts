
import { Agent, GameEngine } from "../../game";
import { Skill, AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";
import { COMBAT_PARAM } from "../../../constants";

export class SkillExecutor {

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        let targets: Agent[] = [];
        
        // 1. 確定施法中心點 (Origin)
        // 如果是 Range 0 技能 (PBAOE)，強制中心點為自身，無視 AI 可能傳來的偏差
        let targetHex;
        if (skill.range === 0) {
            targetHex = { q: source.q, r: source.r };
        } else {
            targetHex = source.targetHex || (source.target ? {q: source.target.q, r: source.target.r} : {q: source.q, r: source.r});
        }

        // 2. 獲取受影響區域 (Impact Area)
        const impactCells = engine.movement.targeting.getImpactArea(source, targetHex, skill, engine);
        
        // 3. 視覺中心點 (Visual Origin)
        const p = HexUtils.toPx(targetHex.q, targetHex.r, engine.mapConfig);
        const origin = { x: p.x, y: p.y };

        // 4. 判定受擊目標
        if (skill.type === 'AOE' || impactCells.length > 1) {
            impactCells.forEach(cell => {
                const u = engine.getAgentAt(cell.q, cell.r);
                if (u && u.hp > 0 && !u.banished) {
                    // 敵我識別 (友軍傷害檢查)
                    // 目前邏輯：傷害技打敵人，治療技打友軍
                    if (skill.power >= 0 && u.team !== source.team) targets.push(u);
                    else if (skill.power < 0 && u.team === source.team) targets.push(u);
                }
            });
            
            // 觸發 AOE 視覺事件
            engine.events.push({ type: 'IMPACT_AOE', pos: origin, skill, color: skill.color });
            
            // 生成地面災害 (Hazards)
            HazardManager.spawnHazards(source, impactCells, skill, engine);
        } else {
            // 單體技能邏輯
            if (source.target && source.target.hp > 0 && !source.target.banished) {
                const effRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (HexUtils.dist(source, source.target) <= effRange) {
                    targets.push(source.target);
                }
            }
        }
        
        // 特殊情況：自身單體 Buff (例如治療自己)
        if (targets.length === 0 && skill.power <= 0 && skill.type === 'SINGLE') {
            targets.push(source);
        }
        
        // 5. 結算所有目標
        targets.forEach(t => {
            const dist = HexUtils.dist(source, t);
            // 視覺連線：如果距離遠，畫光束；距離近，畫斬擊
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
        
        // 閃避處理
        if (result.isMiss) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "MISS", color: "#94a3b8" });
            engine.log(source, 'HIT', '未命中', target.id, `${skill.name} 被閃避`);
            return;
        }

        const oldHp = Math.ceil(target.hp);
        if (result.shieldAbsorb > 0) target.shield -= result.shieldAbsorb;

        // 應用傷害/治療
        target.hp = Math.min(target.maxHp, target.hp + result.finalValue);
        
        // 吸血處理
        if (result.vampAmount > 0 && source.hp > 0) {
            source.hp = Math.min(source.maxHp, source.hp + result.vampAmount);
            engine.events.push({ type: 'HEAL', pos: {x: source.px, y: source.py}, value: result.vampAmount, color: '#86efac' });
            engine.log(source, 'HEAL', '吸血', '自身', `獲得治療 ${result.vampAmount}`);
        }

        const isDamage = result.finalValue < 0;
        const absVal = Math.abs(result.finalValue);

        if (isDamage) { 
            target.setAnim(AnimState.HIT);
            target.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
            
            // 物理擊退力道計算
            const originPx = origin ? origin : {x: source.px, y: source.py};
            // 傷害越高，擊退感越強 (Min 100, Max 600)
            const damageForce = Math.min(600, 100 + absVal * 1.5);
            PhysicsEngine.applyImpulse(target, originPx, damageForce, 0.4);
            
            engine.log(source, 'HIT', '命中', target.id, `${skill.name} 造成 ${absVal} 傷害${result.isCrit ? ' (暴擊!)' : ''}`);
        } else {
            engine.log(source, 'HEAL', '治療', target.id, `${skill.name} 恢復 ${absVal} 生命`);
        }

        // 發送事件供前端顯示
        engine.events.push({
            type: isDamage ? 'DAMAGE' : 'HEAL',
            pos: { x: target.px, y: target.py },
            value: result.finalValue,
            sourceId: source.id,
            targetId: target.id,
            skill: skill,
            color: skill.color
        });

        // 應用控制效果 (CC)
        CCManager.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        CCManager.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);

        // 死亡判定
        if (oldHp > 0 && target.hp <= 0) {
            engine.events.push({ type: 'KILL', pos: { x: target.px, y: target.py }, sourceId: source.id, targetId: target.id });
        }
    }
}
