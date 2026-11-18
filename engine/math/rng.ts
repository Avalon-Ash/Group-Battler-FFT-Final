import { advanceMulberry32, mulberry32Value } from './hash';

/**
 * 模擬層隨機源（引擎擁有的種子化序列）。
 *
 * 兩條獨立的隨機流，互不消耗對方的序列：
 *  - 模擬流：random()，本檔管理（mulberry32，狀態為單一 uint32）。凡「影響戰鬥結果或場景生成」
 *    的隨機（傷害、暴擊、出生、地圖、AI 抖動、物理衝量、堆疊解析）一律走這裡。
 *  - 表現流：直接用 Math.random（粒子、鏡頭震動、浮動文字抖動、環境粒子、畫家函式）。
 *    表現流絕不可影響模擬狀態；tests/RngSplit.test.ts 以靜態掃描＋戰鬥重現鎖住這條界線。
 *
 * 種子化時機：
 *  - seedSimulation(seed)（GameEngine.seedSimulation 為對外入口）：工具／重播在每個場景前呼叫，同種子 → 同序列。
 *  - 尚未種子化前（引擎建構、開戰前的地圖／佈陣）random() 暫時轉呼叫 Math.random，行為與拆分前一致。
 * setRandomSource() 可注入替代序列（單元測試用），resetRandomSource() 還原。每次呼叫零配置（只改一個數字）。
 */
export type RandomSource = () => number;

let seeded = false;
let state = 0;
let seed = 0;

/** mulberry32 單步：回傳 [0,1)。 */
function nextSeeded(): number {
    state = advanceMulberry32(state);
    return mulberry32Value(state);
}

/** 預設來源：已種子化 → 模擬流；否則暫時轉呼叫 Math.random（呼叫當下才解析，vi.spyOn 仍有效）。 */
const defaultSource: RandomSource = () => (seeded ? nextSeeded() : Math.random());

/** 以新種子重設模擬流（同種子 → 同序列）。 */
export function seedSimulation(newSeed: number): void {
    seed = newSeed >>> 0;
    state = seed;
    seeded = true;
}

/** 目前模擬流的起始種子（重播／回報用；尚未種子化為 0）。 */
export function getSimulationSeed(): number {
    return seed;
}

let source: RandomSource = defaultSource;

export function random(): number {
    return source();
}

export function setRandomSource(fn: RandomSource): void {
    source = fn;
}

export function resetRandomSource(): void {
    source = defaultSource;
}

/**
 * 獨立的本地序列（同一顆 mulberry32）：不碰模擬流與佈陣流的狀態。
 * 對局流程每個展示回合用它抽陣營設定、地圖大小、出生格（engine/systems/match/MatchFlowSystem.ts）。
 */
export function createRandomStream(streamSeed: number): RandomSource {
    let s = streamSeed >>> 0;
    return () => {
        s = advanceMulberry32(s);
        return mulberry32Value(s);
    };
}

/** uint32 的範圍（取種子用）。唯一定義；UICommandSystem 產生新種子時也讀這裡 */
export const UINT32_RANGE = 0x100000000;

// ── 佈陣流（契約 S2）──────────────────────────────────────────────────────
// 手動開戰前的抽號（骰子佈陣的出生格洗牌）與組裝層取種子（setupSeed，交給對局流程當每個展示回合的起點）專用；
// 展示回合自己的抽號用 createRandomStream 的本地序列，不走這條。
// 同一顆 mulberry32、另一個狀態，和模擬流互不消耗：佈陣結果記在開戰快照裡，回放不重跑這些抽號，
// 所以這條流不需要可重現；第一次使用時才由 Math.random 取起始狀態（每次開頁不同）。
let setupState: number | null = null;

/** 佈陣流：回傳 [0,1)。不得用在模擬（tick 內）的程式碼。 */
export function setupRandom(): number {
    if (setupState === null) setupState = Math.floor(Math.random() * UINT32_RANGE) >>> 0;
    setupState = advanceMulberry32(setupState);
    return mulberry32Value(setupState);
}

/** 佈陣流取一個 uint32（外觀鹽之類的雜湊種子）。 */
export function setupSeed(): number {
    return Math.floor(setupRandom() * UINT32_RANGE) >>> 0;
}

/** 固定佈陣流（測試用）。 */
export function seedSetupStream(newSeed: number): void {
    setupState = newSeed >>> 0;
}
