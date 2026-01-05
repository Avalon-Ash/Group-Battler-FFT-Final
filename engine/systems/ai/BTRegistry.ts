
import { Agent, GameEngine } from "../game";
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
        // Update target logic:
        // 1. If we have a valid target, keep it unless taunted elsewhere
        if (a.target && a.target.hp > 0 && !a.target.banished) {
            if (a.tauntTimer > 0 && a.tauntTargetId !== a.target.id) {
                // Taunted to another person, force re-scan will happen below if we return false?
                // Actually updateTarget handles the switch logic.
            } else {
                return true; 
            }
        }

        // 2. Periodic Scan or No Target
        if (a.aiUpdateTimer <= 0 || !a.target || a.target.hp <= 0) {
            engine.updateTarget(a);
            a.aiUpdateTimer = a.aiUpdateInterval; 
        }
        
        return a.target !== null;
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        
        // Robustness: Handle NaN
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
        
        // Robustness: Add 0.5 tolerance for floating point/physics drift when adjacent
        if (gridDist > effRange + 0.5) return false;

        // Pixel check for adjacency safety
        if (effRange <= 1.0) {
            const startPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            let endPx;
            if (a.targetHex) endPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
            else endPx = { x: a.target!.px, y: a.target!.py };
            const dx = startPx.x - endPx.x;
            const dy = startPx.y - endPx.y;
            const pxDist = Math.sqrt(dx*dx + dy*dy);
            
            // Allow a bit more slack visually (2.8 tiles instead of 2.5)
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
        let dest = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        
        if (dest) {
            // Check if we are already there (redundant check but safe)
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
    }
};
