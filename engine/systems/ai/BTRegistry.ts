
import { Agent, GameEngine } from "../game";
import { NodeState } from "../../types";
import { HexUtils } from "../utils";

export type BTConditionFn = (agent: Agent, engine: GameEngine, args?: any) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args?: any) => NodeState;

export const BTConditions: Record<string, BTConditionFn> = {
    "IsDead": (a) => a.hp <= 0,
    "IsAlive": (a) => a.hp > 0,
    "IsStunned": (a) => a.stunTimer > 0,
    "IsBanished": (a) => a.banishTimer > 0,
    "IsSilenced": (a) => a.silenceTimer > 0,
    
    "HasTarget": (a, engine) => {
        // Sticky Targeting V2:
        // 如果當前有有效目標，且未被放逐/死亡，直接返回 True。
        // 不再受 aiUpdateTimer 限制，防止在攻擊間隙丟失目標。
        if (a.target && a.target.hp > 0 && !a.target.banished) {
            // 只有在真的需要切換目標（例如嘲諷）時才強制檢查
            if (a.tauntTimer > 0 && a.tauntTargetId !== a.target.id) {
                // Let fall through to update logic
            } else {
                return true; 
            }
        }

        // 只有當「沒有目標」或者「Timer 歸零」時才掃描
        if (a.aiUpdateTimer <= 0 || !a.target || a.target.hp <= 0) {
            engine.updateTarget(a);
            a.aiUpdateTimer = a.aiUpdateInterval; // Reset timer
        }
        
        return a.target !== null;
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        
        // CD Tolerance Optimization:
        // 普攻 (BASIC) 允許 0.2s 的預熱時間。
        // 這意味著如果 CD 還剩 0.15s，我們也視為 Ready，開始進入 Cast 流程 (播放動畫)。
        // 當動畫播放到判定點時，CD 已經轉好了。這能完美填充垃圾時間。
        const tolerance = (s.tag === 'BASIC') ? 0.2 : 0.01;
        const isOnCD = a.curCDs[idx] > tolerance; 
        
        if (isOnCD || a.mp < s.cost) return false;
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        
        return true;
    },
    
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        
        const perceptionBonus = (skill.tag === 'ULT') ? 5 : 2;
        const visionRange = skill.range + perceptionBonus;
        
        const result = engine.calculateOptimalTarget(a, skill);
        
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
            const dist = HexUtils.dist(a, result.targetAgent);
            return dist <= visionRange;
        } else if (result.targetHex) {
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
        
        const effRange = engine.getEffectiveRange(a, tQ, tR, skill.range);
        const dist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        
        // 寬鬆判定：允許 0.1 的誤差，避免因為浮點數距離導致的「在邊緣不攻擊」
        return dist <= (effRange + 0.1);
    }
};

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.btStatus = args.status || "等待";
        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        a.btStatus = "待機中";
        if (a.isMoving) {
            a.isMoving = false;
            a.path = [];
        }
        return NodeState.SUCCESS;
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        return engine.initiateCast(a, idx);
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;
        
        const speedMult = (skill.tag === 'ULT') ? 1.3 : 1.0;
        
        let dest = null;
        if (a.targetHex) dest = a.targetHex;
        else if (a.target) dest = {q: a.target.q, r: a.target.r};
        
        if (dest) {
            return engine.moveAgentToHex(a, dest, skill.range, speedMult);
        }
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;
        
        // 容錯：Chase 時強制獲取目標，不依賴 Timer
        if (!a.target) engine.updateTarget(a); 
        if (!a.target) return NodeState.FAILURE;
        
        const speedMult = (skill.tag === 'ULT') ? 1.4 : 1.1;
        a.btStatus = `鎖定 ${a.target.id}`;
        
        return engine.moveAgentToHex(a, {q: a.target.q, r: a.target.r}, skill.range, speedMult);
    }
};
