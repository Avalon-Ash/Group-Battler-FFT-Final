// ╔══════════════════════════════════════════════════════════╗
// ║  constants/combat.ts — 戰鬥、物理、AI 與控制常數 SSOT       ║
// ║  職責：定義戰鬥數值、物理彈簧、強制位移、AI 間隔與施法鎖定 ║
// ╚══════════════════════════════════════════════════════════╝

export const KILL_STREAK_WINDOW = 5.0;

export const PHYSICS = {
    GRAVITY: 3500,
    SAFE_FALL_VELOCITY: 1000,
    FATAL_FALL_VELOCITY: 3000,
    FALL_DAMAGE_MIN: 200,
    STIFFNESS_ALIVE: 150,
    DAMPING_ALIVE: 25,
    DRIFT_SPEED: 25.0, 
    TERMINAL_VELOCITY_IMPULSE: 400,
    DEFAULT_DRAG: 0.94,
    VISUAL_JUMP_DASH: 250,
    VISUAL_JUMP_KNOCKBACK: 200,
    DASH_BURST_FACTOR: 12,
    DASH_ARC_HEIGHT: 18,
    LUNGE_SPEED_BASIC: 420,
    LUNGE_SPEED_ACTIVE: 540,
};

/**
 * 強制位移（擊退／拉扯）的撞擊傷害，仿 Tactics Ogre：撞上爬不上去的高牆、障礙物或其他單位時，
 * 沒走完的格數越多、牆越高，傷害越大。全部以「目標最大 HP 的比例」表示，才不會對高血量單位無感、
 * 對低血量單位一擊斃命；單次撞擊再用 IMPACT_MAX_PCT 封頂。
 * 例（maxHp 100）：力道 3 擊退，貼牆（牆比跳躍上限高 2 格）→ 剩 3 格：
 * 3×0.05 + 2×0.05 = 25 傷害；撞單位時雙方各吃一半。
 */
export const FORCED_MOVE = {
    /** 每個「沒走完的格」造成的傷害（maxHp 比例） */
    IMPACT_BASE_PCT: 0.05,
    /** 撞牆時，牆每高出起點一格（BLOCK_HEIGHT）追加的傷害（maxHp 比例） */
    IMPACT_PER_HEIGHT_PCT: 0.05,
    /** 單次撞擊傷害上限（maxHp 比例） */
    IMPACT_MAX_PCT: 0.35,
    /** 撞到其他單位時，被撞的一方承受撞擊傷害的比例 */
    IMPACT_UNIT_SHARE: 0.5,
    /** 撞擊傷害下限（避免低血量單位被取整成 0） */
    IMPACT_MIN: 1,
    /** 撞擊的 HUD 文字 */
    IMPACT_TEXT: '撞擊',
    /** 撞擊的受擊特效（VFXRegistry 鍵） */
    IMPACT_FX: 'FX_HIT_RED_HEAVY',
    /** 撞擊鏡頭震動強度 */
    IMPACT_SHAKE: 0.3,
};

export const COMBAT_PARAM = {
    HIT_IMPULSE_MAX: 600,
    HIT_IMPULSE_MIN: 150,
    HIT_MEDIUM_THRESHOLD: 150,
    DR_RESET_TIME: 10.0,
    /** 硬控基礎韌性（0 = 無減免）。尚無資料來源（單位/裝備皆未定義），日後接 UNIT_DB 時由此擴充。*/
    BASE_CC_RESILIENCE: 0,
    EXECUTE_THRESHOLD: 0.25,
    BASE_EXECUTE_MULTIPLIER: 2.0,
    BASE_VAMP_PCT: 0.35,
    MANA_BURN_DEFAULT: 25,
    MANA_RESTORE_DEFAULT: 25,
    GRAVITY_PULL_FORCE: 150,
    GRAVITY_MIN_DIST: 5,
    GRAVITY_SPEED_REDUCTION: 0.3,
    ICE_SPEED_REDUCTION: 0.5,
    HIT_FLASH_DURATION: 0.1,
    AI_CD_TOLERANCE: 0.01,
    AI_PERCEPTION_BONUS_ULT: 5,
    AI_PERCEPTION_BONUS_NORMAL: 2,
    MOVE_SPEED_ULT: 1.3,
    MOVE_SPEED_NORMAL: 1.0,
    CHASE_SPEED_ULT: 1.4,
    CHASE_SPEED_NORMAL: 1.1,
    HIT_FX_OFFSET: 8
};

export const AGENT_CONSTANTS = {
    DEFAULT_AI_UPDATE_INTERVAL: 0.08,
    AI_UPDATE_INTERVAL_JITTER: 0.02,
    DEATH_ANIM_DURATION: 5.5,
    /** RagdollBone.color 佔位色。目前單位走精靈渲染，此值僅滿足型別契約。*/
    RAGDOLL_BONE_PLACEHOLDER_COLOR: '#ffffff',
    AI_UPDATE_INTERVAL_BY_ROLE: {
        TANK: 0.08,
        WARRIOR: 0.06,
        RANGER: 0.07,
        MAGE: 0.08,
        SUPPORT: 0.10
    }
};

/** 施法中斷後禁止立刻重新詠唱的秒數（_interruptCooldown，施法域唯一寫入）。 */
export const CAST_LOCKOUT = {
    /** 一般中斷：避免同一 tick 重複記錄／重施。 */
    INTERRUPT: 0.1,
    /** 地面將塌陷而放棄詠唱：確保單位真的先去逃生。 */
    FATAL_BREAK: 0.5,
} as const;

/** 狀態效果參數上限（百分比 100 ＝ +100%）。 */
export const EFFECT_LIMITS = {
    HASTE_MAX_PCT: 100,
    REFLECT_MAX_PCT: 100,
    LIFESTEAL_MAX_PCT: 100,
} as const;
