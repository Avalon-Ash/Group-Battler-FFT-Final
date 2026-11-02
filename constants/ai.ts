// AI 行為樹、選敵與尋路參數 SSOT。

/** AI 狀態拓樸（ModeMachine） */
export const AI_MODE_RULES = {
    /** 每個單位保留的轉換紀錄筆數。 */
    TRACE_LENGTH: 10,
    /** 一次 AI 決策內最多走幾條邊。 */
    MAX_HOPS_PER_TICK: 6,
} as const;

export const BT_RULES = {
    /** 擊退預測步頻（次／秒）。 */
    PREDICTION_TICKS_PER_SEC: 30,
    /** 擊退預測步數（次）。 */
    PREDICTION_TICKS: 8,
    /** 塌陷前施法安全餘裕（秒）。 */
    COLLAPSE_CAST_BUFFER: 0.2,
    /** 啟用像素近戰檢查的射程上限（格）。 */
    MELEE_CHECK_RANGE: 1.1,
    /** 像素近戰距離上限相對 HEX_SIZE 的倍率。 */
    MELEE_PIXEL_RANGE_FACTOR: 2.2,
    /** 逃生鄰格有敵人的成本（分）。 */
    ENEMY_OCCUPANCY_PENALTY: 5,
    /** 逃生移動速度倍率。 */
    ESCAPE_SPEED_MULTIPLIER: 1.8,
    /** 警告格剩這麼多時間以內才算不能走進去（秒）。 */
    WARNING_ENTER_MIN_S: 3,
    /** 站在警告格上：算好走到安全格的時間後，再多留這麼多才動身（秒）。 */
    RETREAT_MARGIN_S: 2,
    /** 脫困：確定走不到敵人後，等多久才強制跳上鄰格（秒）。 */
    UNSTICK_WAIT_S: 0.5,
    /** 低血追擊的目標生命比例門檻。 */
    LOW_HP_THRESHOLD: 0.25,
    /** 低血目標追擊速度倍率。 */
    LOW_HP_SPEED_MULTIPLIER: 1.6,
    /** 支援技能靠近目標時的速度倍率。 */
    SUPPORT_APPROACH_SPEED: 1.5,
} as const;

export const TARGET_RULES = {
    /** 選定目標後鎖定多久才重新評分（秒）。 */
    LOCK_S: 2,
    /** 射程劣勢判定的高度差（像素）。 */
    LOW_GROUND_THRESHOLD: -4,
    /** 安全格後備搜尋半徑上限（格）。 */
    SAFETY_SEARCH_RADIUS: 12,
    /** 選敵距離倒數評分權重（分）。 */
    DISTANCE_SCORE_WEIGHT: 2000,
    /** 目標缺血比例評分權重（分）。 */
    MISSING_HP_SCORE_WEIGHT: 50,
    /** 目標施放大招的威脅分數（分）。 */
    ULT_CAST_THREAT_SCORE: 200,
    /** 目標施放主動技能的威脅分數（分）。 */
    ACTIVE_CAST_THREAT_SCORE: 50,
    /** 目前目標黏著加分（分）。 */
    STICKY_TARGET_BONUS: 300,
    /** 斬殺加分的生命比例門檻。 */
    KILL_SHOT_HP_THRESHOLD: 0.25,
    /** 低血目標斬殺加分（分）。 */
    KILL_SHOT_BONUS: 400,
    /** 自身位於警告格時的加分（分）。 */
    SELF_WARNING_BONUS: 500,
    /** 雙方位於警告格時的目標加分（分）。 */
    TARGET_WARNING_BONUS: 200,
    /** 追擊需進入警告區的扣分（分）。 */
    ENTER_WARNING_PENALTY: 800,
    /** 自傷群補可選自身的生命比例上限。 */
    SELF_DAMAGE_HEAL_HP_THRESHOLD: 0.8,
    /** 範圍技能命中大招詠唱者的加分（分）。 */
    AOE_ULT_INTERRUPT_BONUS: 50,
    /** 近戰選敵：路徑成本比直線多出的每一單位（繞路、爬坡）扣的分（分／成本）。 */
    MELEE_DETOUR_PENALTY_PER_COST: 40,
    /** 近戰選敵：繞路扣分的上限（分）。須遠小於「完全走不到」的 MELEE_UNREACHABLE_PENALTY。 */
    MELEE_DETOUR_PENALTY_CAP: 400,
} as const;

export const PATH_RULES = {
    /** 目的地變了但路徑還能走時，至少隔多久才重新尋路（秒）。 */
    REPATH_MIN_S: 0.25,
    /** 六角格鄰格數（格）。 */
    HEX_NEIGHBOR_COUNT: 6,
    /** 一般尋路警告格成本（分）。 */
    WARNING_COST: 20,
    /** 逃生尋路警告格成本（分）。 */
    ESCAPE_WARNING_COST: 5,
    /** 敵方危害格成本（分）。 */
    ENEMY_HAZARD_COST: 15,
    /** 非上坡移動額外成本（分）。 */
    DESCENT_COST: 0.2,
    /** 找到安全格後可提前結束的迭代門檻（次）。 */
    SAFETY_EARLY_EXIT_ITERATIONS: 200,
    /** 搜尋安全格時警告格成本（分）。 */
    SAFETY_WARNING_COST: 30,
    /** 搜尋安全格時單位佔格成本（分）。 */
    SAFETY_OCCUPANCY_COST: 50,
} as const;

