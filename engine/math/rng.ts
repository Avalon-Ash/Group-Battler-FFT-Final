/**
 * 模擬層隨機源（可注入）。
 * 預設轉呼叫 Math.random（呼叫當下才解析，故 vi.spyOn(Math, 'random') 仍有效）。
 * 測試或重播功能可用 setRandomSource() 注入確定性序列；用畢以 resetRandomSource() 還原。
 * 僅用於「影響戰鬥結果」的隨機（傷害、暴擊、出生）；純視覺粒子抖動仍可直接用 Math.random。
 */
export type RandomSource = () => number;

const defaultSource: RandomSource = () => Math.random();
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
