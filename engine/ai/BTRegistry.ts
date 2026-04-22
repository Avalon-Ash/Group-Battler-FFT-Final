
// Fix: Use 'import type' to break circular dependency with GameEngine
import type { Agent, GameEngine } from "../game";
import { NodeState, AIState } from "../../types";
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
        
        // [FIX] 正在詠唱時（包含前搖）不應評估其他技能的施放條件，避免因為高頻 tick 導致其他技能覆蓋當前的 targetHex
        if (a.castingSkillIdx !== -1 && a.castingSkillIdx !== idx) return false;
        
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
        
        // [FIX] 若該技能正在詠唱中，直接保持當前選定的目標，避免詠唱中覆蓋 targetHex 導致朝非預期方向/對象施放
        if (a.castingSkillIdx === idx) return true;
        
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
        
        // [FIX] 正在詠唱時不重新判定距離，避免極限範圍內目標移動導致動作被取消或目標迷失
        if (a.castingSkillIdx === idx) return true;
        
        let tQ = 0, tR = 0;
        if (a.targetHex) { tQ = a.targetHex.q; tR = a.targetHex.r; }
        else if (a.target) { tQ = a.target.q; tR = a.target.r; }
        else return false;
        
        const effRange = engine.getEffectiveRange(a, tQ, tR, skill.range);
        const gridDist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        
        // [FIX] 使用更嚴格的容差，與 SkillExecutor 保持同步，避免 AI 誤判射程導致空放
        if (gridDist > effRange + 0.1) return false;

        if (effRange <= 1.1) {
            const startPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            let endPx;
            if (a.targetHex) endPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
            else endPx = { x: a.target!.px, y: a.target!.py };
            const dx = startPx.x - endPx.x;
            const dy = startPx.y - endPx.y;
            const pxDist = Math.sqrt(dx*dx + dy*dy);
            
            // 普攻/近戰目標的像素距離檢查
            if (pxDist > HEX_SIZE * 2.2) return false;
        }
        
        return true;
    },
    
    "HasPushPullSkill": (a) => {
        // [FIX] 如果正在詠唱非普攻技能，先讓它放完，不急著觸發背水一戰判定，避免邏輯抖動
        if (a.castingSkillIdx !== -1) {
            const currentSkill = a.skills[a.castingSkillIdx];
            if (currentSkill && currentSkill.tag !== 'BASIC') {
                // 檢查是否當前正在詠唱的就是推拉技能，如果是，則視為 Ready 以維持 BT 狀態
                const isPushPull = currentSkill.ccType === 'KNOCKBACK' || currentSkill.ccType === 'PULL' || 
                                 currentSkill.ccType2 === 'KNOCKBACK' || currentSkill.ccType2 === 'PULL';
                return isPushPull;
            }
        }

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
        a.aiState = args.state || AIState.WAITING;
        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        a.aiState = AIState.IDLE;
        if (a.isMoving) {
            a.isMoving = false;
            a.path = [];
        }
        return NodeState.SUCCESS;
    },
    "EscapeWarning": (a, engine) => {
        const myKey = HexUtils.key(a);
        const inDanger = engine.isWarningTile(myKey);
        if (!inDanger) return NodeState.FAILURE;

        // [FIX] 如果正在詠唱非普攻技能，絕對不中斷，直到釋放完成
        if (a.castingSkillIdx !== -1 && a.stuckTicks === 0) {
            const s = a.skills[a.castingSkillIdx];
            if (s && s.tag !== 'BASIC') return NodeState.FAILURE;
        }

        a.visualStatus = "DANGER"; 
        
        // 1. 確保有逃生地塊
        if (!a.targetHex || engine.isWarningTile(HexUtils.key(a.targetHex))) {
            engine.updateTarget(a);
        }

        if (a.targetHex && !engine.isWarningTile(HexUtils.key(a.targetHex))) {
            const state = engine.moveAgentToHex(a, a.targetHex, 0, 1.5, true); 
            if (state === NodeState.FAILURE) {
                if (a.castingSkillIdx === -1) a.targetHex = null;
                a.escapeCooldown = 0.2; 
                return NodeState.FAILURE;
            }
            
            // 只有成功開始逃跑才切換 AI 狀態，避免中斷詠唱動畫的感知
            a.aiState = AIState.EVADING_URGENT; 

            if (a.castingSkillIdx !== -1 && a.stuckTicks === 0) {
                const s = a.skills[a.castingSkillIdx];
                if (s && s.tag === 'BASIC') {
                    engine.log(a, 'CC', '中斷', s.name, "為了逃命而中斷普攻");
                    a.castingSkillIdx = -1;
                    a.castTimer = 0;
                    a.castingAnimationTimer = 0;
                }
            }
            return state;
        }
        
        if (a.castingSkillIdx === -1) a.targetHex = null;
        a.escapeCooldown = 0.2;
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
        a.aiState = AIState.TRACKING;
        return engine.moveAgentToHex(a, {q: a.target.q, r: a.target.r}, skill.range, speedMult);
    },
    "CastPushPull": (a, engine) => {
        // 尋找第一個可用的推拉技能
        const idx = a.skills.findIndex((s, i) => {
            if (!s) return false;
            const isPushPull = s.ccType === 'KNOCKBACK' || s.ccType === 'PULL' || s.ccType2 === 'KNOCKBACK' || s.ccType2 === 'PULL';
            if (!isPushPull) return false;
            let cd = a.curCDs[i];
            return (isNaN(cd) || cd <= 0.1) && a.mp >= s.cost;
        });

        if (idx === -1) return NodeState.FAILURE;

        // [FIX] 詠唱衝突檢查
        if (a.castingSkillIdx !== -1) {
            if (a.castingSkillIdx === idx) return NodeState.RUNNING;
            
            const s = a.skills[a.castingSkillIdx];
            if (s && s.tag === 'BASIC') {
                a.castingSkillIdx = -1;
                a.castTimer = 0;
                a.castingAnimationTimer = 0;
            } else {
                return NodeState.FAILURE;
            }
        }

        const skill = a.skills[idx]!;
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
            
            if (dist <= effRange + 0.1) {
                a.aiState = AIState.LAST_STAND_PUSH;
                return engine.initiateCast(a, idx);
            }
        
        return NodeState.FAILURE;
    }
};
