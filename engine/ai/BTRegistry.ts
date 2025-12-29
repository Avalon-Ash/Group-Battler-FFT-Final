
import { Agent, GameEngine } from "../game";
import { NodeState, Skill } from "../../types";
import { HexUtils } from "../utils";

export type BTConditionFn = (agent: Agent, engine: GameEngine, args?: any) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args?: any) => NodeState;

/**
 * 行為樹註冊表 v29.0
 * 核心升級：主動式奧義感應與追擊
 */
export const BTConditions: Record<string, BTConditionFn> = {
    "IsDead": (a) => a.hp <= 0,
    "IsAlive": (a) => a.hp > 0,
    "IsStunned": (a) => a.stunTimer > 0,
    "IsBanished": (a) => a.banishTimer > 0,
    "IsSilenced": (a) => a.silenceTimer > 0,
    "HasTarget": (a, engine) => {
        engine.movement.updateTarget(a, engine);
        return a.target !== null;
    },
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        
        // 絕對遵守數學引用：處理 CD 的極限精度問題 (Epsilon = 0.01)
        const isOnCD = a.curCDs[idx] > 0.01; 
        if (isOnCD || a.mp < s.cost) return false;
        
        // 硬控判定
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        // 沉默僅封鎖非基礎攻擊
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        
        return true;
    },
    
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;

        // 核心邏輯優化：奧義積極感知
        // 當 MP 滿且奧義準備好時，感應範圍擴大 5 格，讓單位「預知」目標並主動前進
        const perceptionBonus = (skill.tag === 'ULT') ? 5 : 2;
        const visionRange = skill.range + perceptionBonus;
        
        const result = engine.movement.calculateOptimalTarget(a, skill, engine);
        
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
            const dist = HexUtils.dist(a, result.targetAgent);
            // 只要在感知視野內，就視為 FindTarget 成功，引導至後續的 Chase 或 Move 節點
            return dist <= visionRange;
        } 
        else if (result.targetHex) {
            a.target = null;
            a.targetHex = result.targetHex;
            return true;
        }
        return false;
    },
    
    "IsTargetInRange": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;

        let tQ = 0, tR = 0;
        if (a.targetHex) { tQ = a.targetHex.q; tR = a.targetHex.r; }
        else if (a.target) { tQ = a.target.q; tR = a.target.r; }
        else return false;

        const effRange = engine.movement.getEffectiveRange(a, tQ, tR, skill.range, engine);
        const dist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        return dist <= effRange;
    }
};

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.btStatus = args.status || "等待";
        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        a.btStatus = "待機中";
        return NodeState.SUCCESS;
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        return engine.combat.initiateCast(a, idx, engine);
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;
        // 奧義追擊時，給予 1.3x 的物理推進加速
        const speedMult = (skill.tag === 'ULT') ? 1.3 : 1.0;
        if (a.targetHex) return engine.movement.moveAgentToHex(a, a.targetHex, skill.range, engine, speedMult);
        if (a.target) return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;
        if (!a.target) engine.movement.updateTarget(a, engine); 
        if (!a.target) return NodeState.FAILURE;
        
        // 奧義鎖定追擊
        const speedMult = (skill.tag === 'ULT') ? 1.4 : 1.1;
        a.btStatus = `鎖定 ${a.target.id}`;
        return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
    }
};
