
import { Agent, GameEngine } from "../game";
import { NodeState, Skill } from "../../types";
import { HexUtils } from "../utils";

export type BTConditionFn = (agent: Agent, engine: GameEngine, args?: any) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args?: any) => NodeState;

/**
 * 行為樹註冊表 v28.0 (ECS 邏輯核心)
 * 解決奧義滿 MP 發呆：主動掃描感應與積極追擊
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
        
        // 絕對遵守數學引用：處理冷卻時間的微量浮點誤差
        const isOnCD = a.curCDs[idx] > 0.005; 
        if (isOnCD || a.mp < s.cost) return false;
        
        // 控制狀態判定
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        
        return true;
    },
    
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;

        // 核心修復：奧義積極感應
        // 如果是奧義(ULT)，感知範圍擴大，防止因為敵人稍遠就判定為「無目標可打」導致發呆
        const visionRange = (skill.tag === 'ULT') ? skill.range + 5 : skill.range + 2;
        
        const result = engine.movement.calculateOptimalTarget(a, skill, engine);
        
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
            // 只要目標在感應半徑內，就回傳 Success 讓後續 Chase 節點執行
            const dist = HexUtils.dist(a, result.targetAgent);
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
        const speedMult = (skill.tag === 'ULT') ? 1.5 : 1.0;
        if (a.targetHex) return engine.movement.moveAgentToHex(a, a.targetHex, skill.range, engine, speedMult);
        if (a.target) return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill || !a.target) return NodeState.FAILURE;
        
        // 積極追擊：奧義準備好時稍微提速
        const speedMult = (skill.tag === 'ULT') ? 1.4 : 1.1;
        a.btStatus = `追擊 ${a.target.id}`;
        return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
    }
};
