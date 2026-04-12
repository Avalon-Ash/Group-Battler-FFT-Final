
// Fix: Use 'import type' to break circular dependency with GameEngine
import type { Agent, GameEngine } from "../game";
import { NodeState } from "../../types";
import { HexUtils } from "../utils";
import { HEX_SIZE } from "../../constants";

export type BTConditionFn = (agent: Agent, engine: GameEngine, args?: any) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args?: any) => NodeState;

export const BTConditions: Record<string, BTConditionFn> = {
    "IsDead": (a) => a.hp <= 0,
    "IsAlive": (a) => a.hp > 0,
    "IsStunned": (a) => a.stunTimer > 0,
    "IsBanished": (a) => a.banishTimer > 0,
    "IsSilenced": (a) => a.silenceTimer > 0,
    "IsFeared": (a) => a.fearTimer > 0, 
    
    "HasTarget": (a, engine) => {
        if (a.target && a.target.hp > 0 && !a.target.banished) {
            return true; 
        }
        if (a.aiUpdateTimer <= 0 || !a.target || a.target.hp <= 0) {
            engine.updateTarget(a);
            a.aiUpdateTimer = a.aiUpdateInterval; 
        }
        return a.target !== null;
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "IsInWarningZone": (a, engine) => {
        return engine.isWarningTile(HexUtils.key(a));
    },
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        
        let cd = a.curCDs[idx];
        if (isNaN(cd)) cd = 0;

        const tolerance = (s.tag === 'BASIC') ? 0.15 : 0.01;
        const isOnCD = cd > tolerance; 
        
        if (isOnCD || a.mp < s.cost) return false;
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        
        return true;
    },
    
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        
        const result = engine.calculateOptimalTarget(a, skill);
        
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
            return true;
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
        const gridDist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        
        if (gridDist > effRange + 0.5) return false;

        if (effRange <= 1.0) {
            const startPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            let endPx;
            if (a.targetHex) endPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
            else endPx = { x: a.target!.px, y: a.target!.py };
            const dx = startPx.x - endPx.x;
            const dy = startPx.y - endPx.y;
            const pxDist = Math.sqrt(dx*dx + dy*dy);
            
            if (pxDist > HEX_SIZE * 2.8) return false;
        }
        
        return true;
    },
    
    "HasPushPullSkill": (a) => {
        // 檢查是否有推拉技能可用於背水一戰
        return a.skills.some((s, idx) => {
            if (!s) return false;
            const isPushPull = s.ccType === 'KNOCKBACK' || s.ccType === 'PULL' || s.ccType2 === 'KNOCKBACK' || s.ccType2 === 'PULL';
            if (!isPushPull) return false;
            
            let cd = a.curCDs[idx];
            if (isNaN(cd)) cd = 0;
            return cd <= 0.1 && a.mp >= s.cost;
        });
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
    "EscapeWarning": (a, engine) => {
        a.btStatus = "危險！逃離中";
        a.visualStatus = "DANGER"; 
        
        // 1. Ensure we have a targetHex to move to
        const myKey = HexUtils.key(a);
        if (!a.targetHex || engine.isWarningTile(HexUtils.key(a.targetHex))) {
            engine.updateTarget(a);
        }

        if (a.targetHex) {
            const state = engine.moveAgentToHex(a, a.targetHex, 0, 1.5); 
            if (state === NodeState.FAILURE) {
                // [FIX] 如果移動失敗（例如被堵死），必須清除逃生目標，讓後續戰鬥邏輯能正確鎖定敵人
                a.targetHex = null;
                return NodeState.FAILURE;
            }
            
            // [FIX] 只有在確定可以逃生 (有路徑) 的情況下，才中斷當前的詠唱。
            // 否則會導致 AI 在絕境中不斷嘗試逃跑 -> 中斷攻擊 -> 逃跑失敗 -> 重新攻擊 的無限迴圈
            if (a.castingSkillIdx !== -1) {
                const s = a.skills[a.castingSkillIdx];
                if (s && s.tag !== 'BASIC') {
                    engine.log(a, 'CC', '中斷', s.name, "為了逃命而中斷詠唱");
                    a.castingSkillIdx = -1;
                    a.castTimer = 0;
                    a.castingAnimationTimer = 0;
                }
            }

            return state;
        }
        
        // [FIX] 無路可逃時返回 FAILURE，觸發戰鬥背水一戰
        a.targetHex = null;
        return NodeState.FAILURE; 
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
        let dest = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        
        if (dest) {
            if (a.q === dest.q && a.r === dest.r) return NodeState.SUCCESS;
            return engine.moveAgentToHex(a, dest, skill.range, speedMult);
        }
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill || !a.target) return NodeState.FAILURE;
        const speedMult = (skill.tag === 'ULT') ? 1.4 : 1.1;
        a.btStatus = `追蹤 ${a.target.id}`;
        return engine.moveAgentToHex(a, {q: a.target.q, r: a.target.r}, skill.range, speedMult);
    },
    "CastPushPull": (a, engine) => {
        // 尋找第一個可用的推拉技能並釋放
        const idx = a.skills.findIndex((s, i) => {
            if (!s) return false;
            const isPushPull = s.ccType === 'KNOCKBACK' || s.ccType === 'PULL' || s.ccType2 === 'KNOCKBACK' || s.ccType2 === 'PULL';
            if (!isPushPull) return false;
            let cd = a.curCDs[i];
            return (isNaN(cd) || cd <= 0.1) && a.mp >= s.cost;
        });
        
        if (idx !== -1) {
            const skill = a.skills[idx];
            // [FIX] 使用 calculateOptimalTarget 確保技能瞄準正確的敵人或區域，而不是逃生網格
            const result = engine.calculateOptimalTarget(a, skill);
            
            if (result.targetAgent) {
                a.target = result.targetAgent;
                a.targetHex = null;
            } else if (result.targetHex) {
                a.target = null;
                a.targetHex = result.targetHex;
            } else {
                return NodeState.FAILURE;
            }

            // 檢查射程
            let tQ = a.targetHex ? a.targetHex.q : a.target!.q;
            let tR = a.targetHex ? a.targetHex.r : a.target!.r;
            const effRange = engine.getEffectiveRange(a, tQ, tR, skill.range);
            const dist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
            
            if (dist <= effRange + 0.5) {
                a.btStatus = "背水一戰：推拉！";
                return engine.initiateCast(a, idx);
            }
        }
        return NodeState.FAILURE;
    }
};
