
// Fix: Use 'import type' to break circular dependency with GameEngine
import type { Agent, GameEngine } from "../game";
import { NodeState, AIState, MovementType } from "../../types";
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
    "IsEvading": (a) => a.aiState === AIState.EVADING_URGENT,
    
    "HasTarget": (a, engine) => {
        if (a.target && a.target.hp > 0 && !a.target.banished) {
            return true; 
        }
        // target 死亡或不存在：立刻重新選目標，不受 timer 保護
        engine.updateTarget(a);
        a.aiUpdateTimer = a.aiUpdateInterval; 
        return a.target !== null;
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "IsInWarningZone": (a, engine) => {
        // [Task 2] SSOT-Separated Dynamic Prediction
        // 1. Check current position (Warning Tiles & Hazards)
        const myKey = HexUtils.key(a);
        const hazard = engine.state.hazards.get(myKey);
        if (engine.isWarningTile(myKey) || (hazard && hazard.team !== a.team)) return true;

        // 2. Predict based on movement state
        if (a.isMoving && a.path && a.path.length > 0) {
            // Autonomous moving: check destination
            const lastHex = a.path[a.path.length - 1];
            if (engine.isWarningTile(HexUtils.key(lastHex))) return true;
        }

        if (a.stuckTicks > 0) {
            // Controlled displacement: project based on physics velocity
            const dt_est = 1 / 30; 
            const predPx = a.px + a.physics.vx * a.stuckTicks * dt_est;
            const predPy = a.py + a.physics.vy * a.stuckTicks * dt_est;
            const predHex = HexUtils.fromPx(predPx, predPy, engine.mapConfig);
            if (engine.isWarningTile(HexUtils.key(predHex))) return true;
        }

        return false;
    },
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        
        // [FIX] 正在詠唱自己時，直接 return true 跳過所有後續判斷
        // 讓 BT 繼續往 CastSkill 走，由 initiateCast 的 RUNNING guard 接管
        if (a.castingSkillIdx === idx) return true;
        
        // 正在詠唱其他技能：整條 skill branch 失敗
        if (a.castingSkillIdx !== -1) return false;
        
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
            // 不清除 a.target，保留作為單體目標退化之用 (解決 AOE 跑到空地發呆)
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
        // [FIX v2] Early exit during cooldown — 必須在任何 updateTarget 或 moveAgentToHex 之前
        if (a.escapeCooldown > 0) {
            // 即使在 cooldown 期間，如果已經安全，立刻解除逃生狀態
            const stillInDanger = BTConditions["IsInWarningZone"](a, engine);
            if (!stillInDanger) {
                a.aiState = AIState.IDLE;
                a.visualStatus = "NONE";
                a.escapeCooldown = 0;  // 提前清除 cooldown
                return NodeState.FAILURE;
            }
            a.aiState = AIState.EVADING_URGENT;
            return NodeState.RUNNING;
        }

        // [FIX] Use BTConditions["IsInWarningZone"] for consistent safe-exit logic
        const inDanger = BTConditions["IsInWarningZone"](a, engine);
        const myKey = HexUtils.key(a);
        
        if (!inDanger) {
            if (a.aiState === AIState.EVADING_URGENT) {
                a.aiState = AIState.IDLE;
                a.visualStatus = "NONE";
            }
            return NodeState.FAILURE;
        }

        // [Task 3] Precise Casting Interruption
        const hazard = engine.state.hazards.get(myKey);
        const isWarning = engine.isWarningTile(myKey);

        // Check for fatal casting
        if (a.castingSkillIdx !== -1) {
            const skill = a.skills[a.castingSkillIdx];
            if (skill) {
                const remainingCast = a.castTimer;
                let isFatal = false;

                // [FIX] 縮圈警告格：只要腳下是 warning tile，一律視為致命
                // 不再依賴 shrinkTimer 時間比較（shrinkTimer 是下次縮圈倒計時，不是當前格消失時間）
                if (isWarning) {
                    isFatal = true;
                }
                
                if (!isFatal && hazard && hazard.team !== a.team) {
                    if (hazard.timer < remainingCast) {
                        isFatal = true;
                    }
                }

                if (isFatal) {
                    engine.log(a, 'CC', '中斷', skill.name, "判定預測必死，強制中斷詠唱逃生");
                    a.castingSkillIdx = -1;
                    a.castTimer = 0;
                    a.castingAnimationTimer = 0;
                } else {
                    // 非致命：BASIC 中斷、非 BASIC 先放完
                    if (skill.tag !== 'BASIC') {
                        // [FIX] 不 return FAILURE，改為 RUNNING——維持逃生意圖，讓詠唱繼續
                        // 但設定 EVADING_URGENT，確保詠唱完後下一幀立刻逃
                        a.aiState = AIState.EVADING_URGENT;
                        return NodeState.RUNNING;
                    }
                    // BASIC 技能：直接中斷
                    a.castingSkillIdx = -1;
                    a.castTimer = 0;
                    a.castingAnimationTimer = 0;
                }
            }
        }

        a.visualStatus = "DANGER"; 
        
        // 1. 確保有逃生地塊
        if (!a.targetHex || engine.isWarningTile(HexUtils.key(a.targetHex))) {
            const path = engine.movement.pathfinder.findPathToSafety(a, engine, engine.movement.targeting);
            if (path.length > 0) {
                a.targetHex = path[path.length - 1];
            } else {
                a.targetHex = null;
            }
        }

        if (a.targetHex && !engine.isWarningTile(HexUtils.key(a.targetHex))) {
            const state = engine.moveAgentToHex(a, a.targetHex, 0, 1.5, true); 
            if (state === NodeState.FAILURE) {
                // [FIX] If path is blocked, reset targetHex so we try a different safe spot next time
                // and give a tiny cooldown to let others move
                if (a.castingSkillIdx === -1) a.targetHex = null;
                a.escapeCooldown = 0.2; 
                return NodeState.FAILURE;
            }
            
            a.aiState = AIState.EVADING_URGENT; 

            // Casting is already handled by fatal check above, but we clean up leftovers if any
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
        
        a.escapeCooldown = 0.2;
        return NodeState.FAILURE; 
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        // 已在詠唱自己：維持 RUNNING，讓 combat.update 自行推進 castTimer
        if (a.castingSkillIdx === idx) return NodeState.RUNNING;
        return engine.initiateCast(a, idx);
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;
        const isLowHp = a.target && (a.target.hp / a.target.maxHp < 0.25);
        const speedMult = isLowHp ? 1.6 : (skill.tag === 'ULT' ? 1.3 : 1.0);
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
        const isLowHp = a.target.hp / a.target.maxHp < 0.25;
        const speedMult = isLowHp ? 1.6 : ((skill.tag === 'ULT') ? 1.4 : 1.1);
        a.aiState = AIState.TRACKING;
        return engine.moveAgentToHex(a, {q: a.target.q, r: a.target.r}, skill.range, speedMult);
    },
    "CastPushPull": (a, engine) => {
        // [Task 5] Decoupled Path-Clearing Targeting
        // 尋找第一個可用的推拉技能
        const idx = a.skills.findIndex((s, i) => {
            if (!s) return false;
            const isPushPull = s.ccType === 'KNOCKBACK' || s.ccType === 'PULL' || s.ccType2 === 'KNOCKBACK' || s.ccType2 === 'PULL';
            if (!isPushPull) return false;
            let cd = a.curCDs[i];
            return (isNaN(cd) || cd <= 0.1) && a.mp >= s.cost;
        });

        if (idx === -1) return NodeState.FAILURE;
        const skill = a.skills[idx]!;

        // 1. Path-Clearing Logic: Only trigger if in danger or evading
        if (a.aiState === AIState.EVADING_URGENT || BTConditions["IsInWarningZone"](a, engine)) {
            let isTargetSafe = false;
            if (a.targetHex) {
                const targetKey = HexUtils.key(a.targetHex);
                const hazard = engine.state.hazards.get(targetKey);
                isTargetSafe = !engine.isWarningTile(targetKey) && (!hazard || hazard.team === a.team);
            }
            if (isTargetSafe) {
                // Get line towards safety
                const line = HexUtils.line(a, a.targetHex);
                for (const h of line) {
                    if (h.q === a.q && h.r === a.r) continue;
                    const occupant = engine.getAgentAt(h.q, h.r);
                    if (occupant && occupant.team !== a.team) {
                        a.target = occupant;
                        a.targetHex = null;
                        break;
                    }
                    if (engine.map.hasObstacle(h.q, h.r)) break; 
                }
            }
        }

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

        // 射程不夠：嘗試走近，而非直接放棄
        // 只有在危險狀態下才主動移近（避免安全時因為推拉技能莫名接近敵人）
        if (a.aiState === AIState.EVADING_URGENT || BTConditions["IsInWarningZone"](a, engine)) {
            const dest = a.targetHex ?? (a.target ? { q: a.target.q, r: a.target.r } : null);
            if (dest) {
                return engine.moveAgentToHex(a, dest, skill.range, 1.5, false);
            }
        }
        
        return NodeState.FAILURE;
    }
};
