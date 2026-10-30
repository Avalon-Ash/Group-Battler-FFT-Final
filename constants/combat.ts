// ╔══════════════════════════════════════════════════════════╗
// ║  constants/combat.ts — 戰鬥、物理、AI 與控制常數 SSOT       ║
// ║  職責：定義戰鬥數值、物理彈簧、強制位移、AI 間隔與施法鎖定 ║
// ╚══════════════════════════════════════════════════════════╝

export const KILL_STREAK_WINDOW = 5.0;
/** 累計擊殺播報：個人第 2 殺起播報，達此數後都播最高階 */
export const KILL_SPREE_MIN_KILLS = 2;
export const KILL_SPREE_MAX_TIER = 7;

export const PHYSICS = {
    /** 移動朝向更新所需的水平位移門檻（像素）。 */
    FACING_THRESHOLD: 1.5,
    /** 近身前衝所需的最小目標距離（像素）。 */
    LUNGE_MIN_DISTANCE: 1.5,
    /** 完成移動後保留的水平速度比例。 */
    MOVE_FINISH_VELOCITY_FACTOR: 0.1,
    /** 重疊單位擠出時的水平衝量速度（像素／秒）。 */
    STACKING_EXPULSION_SPEED: 200,
    /** 外力衝量速度下限（像素／秒）。 */
    MIN_IMPULSE: 50,
    /** 隨機選擇衝量方向的距離門檻（像素）。 */
    IMPULSE_RANDOM_DIRECTION_DISTANCE: 0.1,
    /** 墜入虛空出界的相對高度門檻（像素）。 */
    VOID_DESPAWN_Z: -1000,
    /** 存活單位彈簧剛性倍率。 */
    STIFFNESS_FACTOR: 1.2,
    /** 存活單位阻尼倍率。 */
    DAMPING_FACTOR: 1.1,
    /** 旋轉彈簧相對位移彈簧的剛性倍率。 */
    ROTATION_STIFFNESS_FACTOR: 0.1,
    /** 失去地面時刷新暈眩的最小剩餘時間（秒）。 */
    VOID_STUN_REFRESH: 0.1,
    /** 飛行懸浮基準高度（像素）。 */
    FLYING_HOVER_HEIGHT: 55,
    /** 飛行懸浮振盪角頻率（弧度／秒）。 */
    FLYING_HOVER_FREQUENCY: 2.5,
    /** 飛行懸浮振盪振幅（像素）。 */
    FLYING_HOVER_AMPLITUDE: 5,
    /** 懸浮高度差轉換為加速度的係數（每平方秒）。 */
    FLYING_HOVER_GAIN: 5,
    /** 每物理子步保留的飛行垂直速度比例。 */
    FLYING_VERTICAL_DRAG: 0.92,
    /** 重力分支的離地高度門檻（像素）。 */
    AIRBORNE_HEIGHT_THRESHOLD: 0.1,
    /** 墜落受傷閃光時間（秒）。 */
    FALL_HIT_FLASH_DURATION: 0.2,
    /** 受傷落地後垂直反彈速度比例。 */
    FALL_BOUNCE_FACTOR: 0.3,
    /** 負高度阻尼後貼地的相對高度門檻（像素）。 */
    GROUND_SNAP_Z: -0.5,
    /** 允許向格心漂移的水平速度平方上限（平方像素／平方秒）。 */
    DRIFT_MAX_SPEED_SQ: 5000,
    /** 軀幹初始相對高度（像素）。 */
    RAGDOLL_TORSO_HEIGHT: 20,
    /** 軀幹初始上拋速度（像素／秒）。 */
    RAGDOLL_TORSO_VERTICAL_SPEED: 150,
    /** 頭部初始相對高度（像素）。 */
    RAGDOLL_HEAD_HEIGHT: 35,
    /** 頭部水平衝擊速度倍率。 */
    RAGDOLL_HEAD_IMPACT_FACTOR: 0.4,
    /** 頭部初始上拋速度（像素／秒）。 */
    RAGDOLL_HEAD_VERTICAL_SPEED: 200,
    /** 頭部骨骼半徑（像素）。 */
    RAGDOLL_HEAD_RADIUS: 7,
    /** 手臂初始相對高度（像素）。 */
    RAGDOLL_ARM_HEIGHT: 18,
    /** 左臂水平衝擊速度倍率。 */
    RAGDOLL_LEFT_ARM_IMPACT_FACTOR: 0.7,
    /** 左臂初始上拋速度（像素／秒）。 */
    RAGDOLL_LEFT_ARM_VERTICAL_SPEED: 120,
    /** 四肢骨骼半徑（像素）。 */
    RAGDOLL_LIMB_RADIUS: 5,
    /** 右臂水平衝擊速度倍率。 */
    RAGDOLL_RIGHT_ARM_IMPACT_FACTOR: 0.3,
    /** 右臂初始上拋速度（像素／秒）。 */
    RAGDOLL_RIGHT_ARM_VERTICAL_SPEED: 130,
    /** 腿部初始水平位置偏移量（像素）。 */
    RAGDOLL_LEG_X_OFFSET: 6,
    /** 腿部初始縱向位置偏移量（像素）。 */
    RAGDOLL_LEG_Y_OFFSET: 8,
    /** 腿部初始相對高度（像素）。 */
    RAGDOLL_LEG_HEIGHT: 8,
    /** 左腿水平衝擊速度倍率。 */
    RAGDOLL_LEFT_LEG_IMPACT_FACTOR: 0.6,
    /** 左腿初始上拋速度（像素／秒）。 */
    RAGDOLL_LEFT_LEG_VERTICAL_SPEED: 80,
    /** 右腿水平衝擊速度倍率。 */
    RAGDOLL_RIGHT_LEG_IMPACT_FACTOR: 0.4,
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
    /** 鄰格方向內積比較的初始下界（無單位）。 */
    INITIAL_STEP_DOT: -2,
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
    /** 每次傷害擲骰的暴擊機率。 */
    CRIT_CHANCE: 0.1,
    /** 技能射程判斷容差（格）。 */
    RANGE_TOLERANCE: 0.1,
    /** 推拉與突進技能冷卻可用容差（秒）。 */
    READY_CD_TOLERANCE: 0.1,
    /** 普攻起手冷卻容差（秒）。 */
    BASIC_CD_TOLERANCE: 0.15,
    /** 非普攻起手冷卻容差（秒）。 */
    SKILL_CD_TOLERANCE: 0.05,
    /** 2026-10-28 使用者決定：射程 <= 1 為近戰，每層高低差消耗一格射程（雙向相同）。 */
    MELEE_RANGE: 1,
    /** 近戰普攻打不到（沒有同層可站鄰格或走不到）的目標扣分；不排除，自己有可用突進／拉取時不扣（2026-10-28） */
    MELEE_UNREACHABLE_PENALTY: 1500,
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
    AI_HEAL_HP_THRESHOLD: 0.95,
    /**
     * 奧義（tag ULT）的有效詠唱下限（秒，模擬時間）。預設資料與 UPDATE_SKILL 都以 data/ui/skillEditor.ts 的
     * normalizeSkillCast 套用，所以 skill.cast 本身就是有效值：計時、讀條、CAST_START 與演出排程都直接讀它，
     * 執行期不另外 clamp（避免讀條／特效與計時各用一個值，ULT-T01）。
     */
    ULT_MIN_CAST_SEC: 1.5,
    AI_SELF_BUFF_ENGAGE_DIST: 3,
    MOVE_SPEED_ULT: 1.3,
    MOVE_SPEED_NORMAL: 1.0,
    CHASE_SPEED_ULT: 1.4,
    CHASE_SPEED_NORMAL: 1.1,
    HIT_FX_OFFSET: 8,
    /** 多段命中 CLUSTER 節奏：每組段數（段）。 */
    HIT_CLUSTER_SIZE: 3,
    /** 多段命中 CLUSTER 節奏：組與組的間隔（倍 interval）。 */
    HIT_CLUSTER_GAP_MULT: 2.5,
    /** 多段命中 CLUSTER 節奏：組內相鄰兩段的間隔（倍 interval）。 */
    HIT_CLUSTER_INTRA_MULT: 0.5,
    /**
     * 多段命中「到期」判定的浮點容差（s）。排程器與畫面序列（SequenceSystem）都拿「起點＋偏移」的浮點和去比逐 tick 累加的引擎時間，
     * 剛好落在整數 tick 的邊界會差 1e-16 而慢一個 tick；兩邊用同一個容差，傷害與落點才會同一個 tick。
     */
    HIT_TIME_EPSILON_S: 1e-6
};

export const AGENT_CONSTANTS = {
    /** 無攻擊者時隨機死亡衝擊的強度倍率。 */
    RANDOM_DEATH_IMPACT_FACTOR: 0.6,
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

export const DAMAGE_RULES = {
    /** 延長戰鬥後治療倍率下限。 */
    MIN_HEAL_MULTIPLIER: 0.1,
    /** 延長戰鬥每秒治療倍率衰減（倍率／秒）。 */
    OVERTIME_HEAL_DECAY: 0.05,
    /** 延長戰鬥每秒傷害倍率增量（倍率／秒）。 */
    OVERTIME_DAMAGE_GAIN: 0.05,
    /** 易傷目標承受傷害倍率。 */
    VULNERABLE_MULTIPLIER: 1.35,
    /** 斬殺缺血加成的正規化除數。 */
    EXECUTE_SCALING_DIVISOR: 5,
    /** 暴擊傷害倍率。 */
    CRIT_MULTIPLIER: 1.5,
    /** 坦克承受傷害倍率。 */
    TANK_DAMAGE_MULTIPLIER: 0.85,
} as const;

export const CAST_RULES = {
    /** 起手時詠唱與動畫計時下限（秒）。 */
    MIN_CAST_DURATION: 0.016,
    /** 失敗普攻重試冷卻下限（秒）。 */
    MIN_BASIC_RETRY_CD: 0.1,
    /** 失敗非普攻重試冷卻下限（秒）。 */
    MIN_SKILL_RETRY_CD: 0.3,
    /** 施法完成後禁止立即重放的時間（秒）。 */
    COMPLETE_COOLDOWN: 0.15,
} as const;

export const CC_RULES = {
    /** 未指定控制強度時護盾增量（生命值）。 */
    DEFAULT_SHIELD_AMOUNT: 50,
    /** 推拉命中閃光持續時間（秒）。 */
    KNOCKBACK_HIT_FLASH_DURATION: 0.2,
    /** 顯示控制遞減標籤的倍率上界。 */
    DR_LABEL_UPPER_BOUND: 0.95,
    /** 顯示控制遞減標籤的倍率下界。 */
    DR_LABEL_LOWER_BOUND: 0.05,
    /** 控制遞減進入免疫的倍率門檻（WoW 式：100% → 50% → 25% → 免疫，所以第 4 次的 0.125 倍率以下免疫）。 */
    DR_IMMUNITY_THRESHOLD: 0.125,
} as const;

export const HIT_REACTION_RULES = {
    /** 命中晃動幅度上限（像素）。 */
    SHAKE_MAX: 12,
    /** 傷害換算晃動幅度的除數（生命值／像素）。 */
    DAMAGE_PER_SHAKE_PX: 8,
} as const;

export const HAZARD_RULES = {
    /** 危害預設持續時間（秒）。 */
    DEFAULT_DURATION: 5,
    /** 危害區跳傷間隔（秒）。 */
    TICK_INTERVAL: 0.5,
    /** 技能範圍換算牽引像素半徑的倍率。 */
    PULL_RADIUS_FACTOR: 1.5,
    /** 技能威力換算每跳危害威力的倍率。 */
    DAMAGE_FACTOR: 0.2,
    /** 未指定牽引範圍時相對 HEX_SIZE 的半徑倍率。 */
    DEFAULT_PULL_RADIUS_FACTOR: 5,
} as const;

export const PROJECTILE_RULES = {
    /** 投射物預設速度（像素／秒）。 */
    DEFAULT_SPEED: 800,
    /** 投射物飛行時間下限（秒）。 */
    MIN_DURATION: 0.1,
} as const;

export const CONTROL_RULES = {
    /** 恐懼目的地搜尋半徑（格）。 */
    FEAR_SEARCH_RADIUS: 5,
    /** 恐懼遠離來源時的移動速度倍率。 */
    FEAR_SPEED_MULTIPLIER: 1.4,
    /** 恐懼未持續移動時的重新選點間隔（秒）。 */
    FEAR_RETRY_DELAY: 0.8,
    /** 恐懼後備隨機移動速度倍率。 */
    FEAR_FALLBACK_SPEED_MULTIPLIER: 1.2,
} as const;

export const BATTLE_RULES = {
    /** 勝負已定時的時間流速倍率。 */
    FINISH_TIME_SCALE: 0.4,
    /** 五連殺門檻與播報等級（擊殺數）。 */
    PENTA_KILL_TIER: 5,
    /** 戰鬥日誌保留上限（筆）。 */
    MAX_LOGS: 5000,
    /** 日誌序號補零的最小長度（字元）。 */
    LOG_ID_DIGITS: 5,
    /** 時間流速直接貼合目標的差值門檻（倍率）。 */
    TIME_SCALE_SNAP_THRESHOLD: 0.01,
    /** 時間流速向目標內插速率（每秒）。 */
    TIME_SCALE_BLEND_RATE: 5,
} as const;

export const MOVEMENT_RULES = {
    /** 等待擠入佔格後放棄路徑的 tick 門檻（次）。 */
    MAX_STUCK_TICKS: 15,
    /** 背水一戰到達中心的距離門檻（像素）。 */
    LAST_STAND_ARRIVAL_RADIUS: 15,
    /** 背水一戰靠近中心時的速度增量係數（每平方秒）。 */
    LAST_STAND_NEAR_PULL_GAIN: 5,
    /** 背水一戰外圈向心牽引加速度（像素／平方秒）。 */
    LAST_STAND_PULL_FORCE: 400,
} as const;
