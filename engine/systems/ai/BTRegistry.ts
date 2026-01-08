
import { Agent, GameEngine } from "../game";
import { NodeState, AnimState } from "../../types";
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
        // [Logic Update] Periodic Re-scan
        // 即使有目標，定時器到了也要重新掃描 (AI Update Tick)，以免無視身邊的高威脅單位
        // TargetingSystem 內部的分數機制 (Sticky Bonus) 會防止頻繁亂切換
        if (a.aiUpdateTimer <= 0) {
            engine.updateTarget(a);
            a.aiUpdateTimer = a.aiUpdateInterval; 
        }

        // 立即檢查目標有效性 (防止追打屍體)
        if (a.target && (a.target.hp <= 0 || a.target.banished)) {
            a.target = null;
            // 如果當前目標失效，強制立刻重搜
            engine.updateTarget(a);
        }

        return a.target !== null;
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        
        let cd = a.curCDs[idx];
        if (isNaN(cd)) cd = 0;

        // Tolerance allows "queueing" the skill slightly before it's ready
        // Increased slightly for basics to make combo strings smoother
        const tolerance = (s.tag === 'BASIC') ? 0.15 : 0.05;
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
        
        // Increased tolerance to 0.6 to prevent pixel-perfect flickering
        if (gridDist > effRange + 0.6) return false;

        // Pixel check for adjacency safety (Visual check)
        if (effRange <= 1.0) {
            const startPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            let endPx;
            if (a.targetHex) endPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
            else endPx = { x: a.target!.px, y: a.target!.py };
            const dx = startPx.x - endPx.x;
            const dy = startPx.y - endPx.y;
            const pxDist = Math.sqrt(dx*dx + dy*dy);
            
            // Allow more visual overlap for melee
            if (pxDist > HEX_SIZE * 2.8) return false;
        }
        
        return true;
    }
};

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.btStatus = args.status || "等待";
        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        a.btStatus = "待機中";
        // Only stop if we really have nothing to do and aren't mid-move
        if (a.isMoving && a.path.length === 0) {
            a.isMoving = false;
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
        let dest = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        
        if (dest) {
            if (a.q === dest.q && a.r === dest.r) return NodeState.SUCCESS;
            return engine.moveAgentToHex(a, dest, skill.range, speedMult);
        }
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot; // Usually passed as slot 2 (Basic) for general chasing
        const skill = a.skills[idx] || a.skills[2]; // Fallback to Basic
        
        if (!skill || !a.target) return NodeState.FAILURE;
        
        // --- SMART CHASE LOGIC ---
        // If we are already in range for the Basic Attack, DO NOT MOVE.
        // This prevents the unit from jittering back and forth during Cooldowns.
        const effRange = engine.getEffectiveRange(a, a.target.q, a.target.r, skill.range);
        const dist = HexUtils.dist(a, a.target);
        
        // Use a slightly tighter range for "Stopping" to ensure we are comfortably inside
        if (dist <= effRange) {
            if (a.isMoving) {
                a.isMoving = false;
                a.path = [];
            }
            // Turn to face target
            const dx = a.target.px - a.px;
            if (Math.abs(dx) > 1) a.facing = dx > 0 ? 1 : -1;
            
            a.btStatus = "戰鬥鎖定";
            a.setAnim(AnimState.COMBAT_IDLE);
            return NodeState.SUCCESS;
        }

        const speedMult = (skill.tag === 'ULT') ? 1.4 : 1.1;
        a.btStatus = `追蹤 ${a.target.id}`;
        return engine.moveAgentToHex(a, {q: a.target.q, r: a.target.r}, skill.range, speedMult);
    }
};