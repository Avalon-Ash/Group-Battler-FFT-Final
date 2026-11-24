import { useSyncExternalStore } from 'react';

/**
 * 技能圖示線條資料（public/assets/ui/skill_glyphs.json，由 `npm run gen:skill-glyphs` 從 lucide 抽出，WORKLOG §2 DE）。
 * 第一次有元件要用時才下載，之後共用同一份；下載失敗就是空表，SkillIcon 退回舊的程序圖示。
 * 不打進程式包：首屏與預載的 vendor 包預算都快滿了（tools/check-bundle-budget.mjs）。
 */
type SkillGlyphNode = readonly (readonly [string, Readonly<Record<string, string>>])[];
type GlyphTable = Readonly<Record<string, SkillGlyphNode>>;

const GLYPH_PATH = 'assets/ui/skill_glyphs.json';
const EMPTY: GlyphTable = {};

let table: GlyphTable | null = null;
let requested = false;
const listeners = new Set<() => void>();

function settle(next: GlyphTable): void {
    table = next;
    for (const l of listeners) l();
}

function request(): void {
    if (requested) return;
    requested = true;
    fetch(`${import.meta.env.BASE_URL}${GLYPH_PATH}`)
        .then((r) => (r.ok ? r.json() as Promise<GlyphTable> : EMPTY))
        .then(settle, () => settle(EMPTY));
}

function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);
    request();
    return () => { listeners.delete(onChange); };
}

/** 線條資料表；還沒載完是 null */
export function useSkillGlyphs(): GlyphTable | null {
    return useSyncExternalStore(subscribe, () => table, () => null);
}
