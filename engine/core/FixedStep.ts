// ╔══════════════════════════════════════════════════════════╗
// ║  FixedStep — 遊戲迴圈的固定步長排程（純函式、無狀態）       ║
// ║  職責：把「真實經過時間 × 倍率」換算成這一幀要跑幾個固定步長 ║
// ║        的 tick。倍率只改 tick 的數量，不改每個 tick 的 dt，   ║
// ║        所以同一串指令在任何倍率下模擬結果都一樣（回放前提）。 ║
// ║  上游：hooks/useGameLoop（每幀呼叫一次）。                   ║
// ║  [ARCH] 積欠超過 maxTicks 個步長的部分直接丟掉（掉幀時遊戲  ║
// ║  變慢，不追趕），避免越追越慢的死亡螺旋。                    ║
// ╚══════════════════════════════════════════════════════════╝

export interface FixedStepPlan {
    /** 這一幀要跑的 tick 數 */
    ticks: number;
    /** 跑完後留到下一幀的累加時間（模擬毫秒） */
    acc: number;
}

/**
 * @param accMs 上一幀留下的累加時間（模擬毫秒）
 * @param realDtMs 這一幀經過的真實時間（毫秒）
 * @param timeScale 時間倍率（0＝暫停）
 * @param stepMs 每個 tick 的固定步長（模擬毫秒）
 * @param maxTicks 每幀最多跑幾個 tick
 */
export function planFixedSteps(accMs: number, realDtMs: number, timeScale: number, stepMs: number, maxTicks: number): FixedStepPlan {
    let acc = accMs + Math.max(0, realDtMs) * Math.max(0, timeScale);
    const cap = stepMs * maxTicks;
    if (acc > cap) acc = cap;
    const ticks = Math.floor(acc / stepMs);
    return { ticks, acc: acc - ticks * stepMs };
}
