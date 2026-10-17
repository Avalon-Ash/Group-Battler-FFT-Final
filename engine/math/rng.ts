/**
 * 模擬層隨機源（引擎擁有的種子化序列）。
 *
 * 兩條獨立的隨機流，互不消耗對方的序列：
 *  - 模擬流：random()，本檔管理（mulberry32，狀態為單一 uint32）。凡「影響戰鬥結果或場景生成」
 *    的隨機（傷害、暴擊、出生、地圖、AI 抖動、物理衝量、堆疊解析）一律走這裡。
 *  - 表現流：直接用 Math.random（粒子、鏡頭震動、浮動文字抖動、環境粒子、畫家函式）。
 *    表現流絕不可影響模擬狀態；tests/RngSplit.test.ts 以靜態掃描＋戰鬥重現鎖住這條界線。
 *
 * 種子：模組載入時自 Math.random 取一次（工具在載入前先固定 Math.random，因此仍可重現）。
 * 之後模擬流只靠 seedSimulation() 重設（GameEngine.seedSimulation 為對外入口，工具在每個場景前呼叫）。
 * setRandomSource() 可注入替代序列（單元測試用），resetRandomSource() 還原為種子化序列。
 * 每次呼叫零配置（只改一個數字）。
 */
export type RandomSource = () => number;

let state = 0;
let seed = 0;

/** mulberry32 單步：回傳 [0,1)。 */
function nextSeeded(): number {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 以新種子重設模擬流（同種子 → 同序列）。 */
export function seedSimulation(newSeed: number): void {
    seed = newSeed >>> 0;
    state = seed;
}

/** 目前模擬流的起始種子（重播／回報用）。 */
export function getSimulationSeed(): number {
    return seed;
}

let source: RandomSource = nextSeeded;

export function random(): number {
    return source();
}

export function setRandomSource(fn: RandomSource): void {
    source = fn;
}

export function resetRandomSource(): void {
    source = nextSeeded;
}

// 初始種子：載入時取一次 Math.random（此後模擬流不再碰 Math.random）。
seedSimulation(Math.floor(Math.random() * 4294967296));
