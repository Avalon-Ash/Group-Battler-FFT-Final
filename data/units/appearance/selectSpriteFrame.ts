/**
 * selectSpriteFrame — 單位精靈逐格動畫與原生四向選格純函式 (SSOT)
 * -----------------------------------------------------------------------------
 * 優先序：死亡 > 受擊 > 施法/攻擊 > 移動(walk) > idle
 * 映射規則：
 *  - 死亡/受擊/攻擊/施法：以時間/進度映射至 0..frames-1
 *  - 死亡播完停在最後一格 (frames - 1)
 *  - 缺少 cast 動畫時退回 attack
 *  - idle / walk 以 t * fps 循環，並依 agent.id 進行相位偏移避免整隊同步
 *  - 方向：依 agent.facing (+1 右, -1 左) 與垂直相對方向選取原生 SE/SW/NE/NW
 *  - 垂直方向滯後（Hysteresis）防止目標位置微動時來回閃爍
 */

import { Agent } from '../../../engine/core/Agent';
import { AnimState, ActionState, Role } from '../../../types';
import { UNIT_SPRITE } from '../../../constants';
import { getCastProgress } from '../../../engine/renderers/units/utils';

export type SpriteDirection = 'SE' | 'SW' | 'NE' | 'NW';

export interface SpriteFrameSelection {
    anim: string;
    dir: SpriteDirection;
    frameIndex: number;
    isDeathFinished?: boolean;
}

// 預設每種動畫之標準影格數（對齊 KayKit manifest）
export const DEFAULT_FRAME_COUNTS: Record<string, number> = {
    idle: 6,
    walk: 6,
    attack: 6,
    cast: 6,
    hit: 3,
    death: 6,
};

// 避免 Agent 污染之外部方向狀態暫存（WeakMap 自動 GC）
interface DirState {
    dir: SpriteDirection;
    lastSwitchTime: number;
}
const agentDirMap = new WeakMap<Agent, DirState>();

/**
 * 依 Agent ID 計算確定性雜湊偏移（0.0 ~ 1.0），用於錯開步頻與呼吸相位
 */
export function getAgentPhaseOffset(agentId: string): number {
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
        hash = (hash * 31 + agentId.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash % 1000) / 1000;
}

/**
 * 依據水平面向與垂直目標/路徑判斷原生四向（SE / SW / NE / NW）
 */
export function selectSpriteDirection(
    agent: Agent,
    currentTime: number = 0,
    hysteresisThresholdPx: number = 6
): SpriteDirection {
    const isFacingEast = agent.facing > 0;
    let wantsNorth = false;

    // 1. 若在移動中，依下一個路徑點之 screen Y 判斷
    if (agent.isMoving && agent.path && agent.path.length > 0) {
        const nextHex = agent.path[0];
        // 平頂六角格中，r 較小通常在畫面上方 (North)
        if (nextHex.r < agent.r) {
            wantsNorth = true;
        } else if (nextHex.r > agent.r) {
            wantsNorth = false;
        }
    } else if (agent.target) {
        // 2. 若有鎖定目標，依目標 py 判斷
        const diffY = agent.target.py - agent.py;
        if (diffY < -hysteresisThresholdPx) {
            wantsNorth = true;
        } else if (diffY > hysteresisThresholdPx) {
            wantsNorth = false;
        }
    }

    // 3. 滯後（Hysteresis）防抖檢驗
    const desiredDir: SpriteDirection = isFacingEast
        ? (wantsNorth ? 'NE' : 'SE')
        : (wantsNorth ? 'NW' : 'SW');

    const state = agentDirMap.get(agent);
    if (!state) {
        agentDirMap.set(agent, { dir: desiredDir, lastSwitchTime: currentTime });
        return desiredDir;
    }

    const hysteresisSec = (UNIT_SPRITE.facingHysteresisMs || 120) / 1000;
    const isHorizontalFlip = (state.dir.endsWith('E') && !desiredDir.endsWith('E')) ||
                             (state.dir.endsWith('W') && !desiredDir.endsWith('W'));

    // 水平轉向立即響應（facing 改變），垂直轉向套用滯後防抖
    if (isHorizontalFlip || (currentTime - state.lastSwitchTime >= hysteresisSec)) {
        if (state.dir !== desiredDir) {
            state.dir = desiredDir;
            state.lastSwitchTime = currentTime;
        }
    }

    return state.dir;
}

/**
 * selectSpriteFrame — 核心選格純函式
 * @param agent 單位資料實體
 * @param t 全域戰鬥時間 (battleTime)
 * @param hasCastAnim 是否具備 cast 專屬動畫（若為 false 且處於施法時退回 attack）
 * @param frameCounts 可自訂之每種動畫格數（預設 6 格，hit 3 格）
 */
export function selectSpriteFrame(
    agent: Agent,
    t: number,
    hasCastAnim?: boolean,
    frameCounts: Record<string, number> = DEFAULT_FRAME_COUNTS
): SpriteFrameSelection {
    const dir = selectSpriteDirection(agent, t);

    // 自動判斷職業是否原生支援 cast（MAGE 與 SUPPORT 原生支援）
    const supportsCast = hasCastAnim !== undefined
        ? hasCastAnim
        : (agent.role === Role.MAGE || agent.role === Role.SUPPORT);

    // ══════════════════════════════════════════════════════════════
    // 動畫優先序 1：死亡 (DEATH)
    // ══════════════════════════════════════════════════════════════
    const isDead = agent.hp <= 0 || agent.animState === AnimState.DEAD || agent.fullyDead || agent.deathTimer > 0;
    if (isDead) {
        const anim = 'death';
        const totalFrames = frameCounts[anim] ?? 6;
        const fps = UNIT_SPRITE.deathFps || 8;
        const animDuration = totalFrames / fps; // 例如 6 格 / 8 fps = 0.75 秒
        const tDead = Math.max(0, agent.deathTimer);
        const progress = animDuration > 0 ? tDead / animDuration : 1.0;
        const frameIndex = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));
        return {
            anim,
            dir,
            frameIndex,
            isDeathFinished: progress >= 1.0
        };
    }

    // ══════════════════════════════════════════════════════════════
    // 動畫優先序 2：受擊 (HIT)
    // ══════════════════════════════════════════════════════════════
    const isHit = agent.hitFlashTimer > 0.05 || agent.animState === AnimState.HIT;
    if (isHit) {
        const anim = 'hit';
        const totalFrames = frameCounts[anim] ?? 3;
        const flashDur = UNIT_SPRITE.hitFlashDuration || 0.15;
        // hitFlashTimer 從 flashDur 倒數至 0
        const progress = Math.max(0, Math.min(1, 1 - (agent.hitFlashTimer / flashDur)));
        const frameIndex = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));
        return { anim, dir, frameIndex };
    }

    // ══════════════════════════════════════════════════════════════
    // 動畫優先序 3：施法或攻擊 (CAST / ATTACK)
    // ══════════════════════════════════════════════════════════════
    const isCasting = agent.castingSkillIdx !== -1 || agent.actionState === ActionState.CASTING;
    const isAttacking = agent.animState === AnimState.ATTACK ||
                        agent.animState === AnimState.CAST_ULT ||
                        agent.actionState === ActionState.ATTACKING;

    if (isCasting || isAttacking) {
        let anim = isCasting ? (supportsCast ? 'cast' : 'attack') : 'attack';
        const totalFrames = frameCounts[anim] ?? 6;

        let progress = 0;
        if (agent.castingSkillIdx !== -1) {
            progress = getCastProgress(agent);
        } else if (agent.castingAnimationTimer > 0) {
            progress = Math.max(0, Math.min(1, 1 - (agent.castTimer / agent.castingAnimationTimer)));
        } else {
            // 無進度計時器時，沿用 t 循環
            const fps = UNIT_SPRITE.attackFps || 12;
            const idx = Math.floor(t * fps) % totalFrames;
            return { anim, dir, frameIndex: idx };
        }

        const frameIndex = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));
        return { anim, dir, frameIndex };
    }

    // ══════════════════════════════════════════════════════════════
    // 動畫優先序 4：移動 (WALK)
    // ══════════════════════════════════════════════════════════════
    const isMoving = agent.animState === AnimState.MOVE ||
                     agent.isMoving ||
                     agent.actionState === ActionState.WALKING ||
                     agent.actionState === ActionState.EVADING;

    if (isMoving) {
        const anim = 'walk';
        const totalFrames = frameCounts[anim] ?? 6;
        const fps = UNIT_SPRITE.walkFps || 10;
        const phase = getAgentPhaseOffset(agent.id);
        const frameIndex = Math.floor((t + phase) * fps) % totalFrames;
        return { anim, dir, frameIndex };
    }

    // ══════════════════════════════════════════════════════════════
    // 動畫優先序 5：閒置 (IDLE)
    // ══════════════════════════════════════════════════════════════
    const anim = 'idle';
    const totalFrames = frameCounts[anim] ?? 6;
    const fps = UNIT_SPRITE.idleFps || 6;
    const phase = getAgentPhaseOffset(agent.id);
    const frameIndex = Math.floor((t + phase) * fps) % totalFrames;
    return { anim, dir, frameIndex };
}
