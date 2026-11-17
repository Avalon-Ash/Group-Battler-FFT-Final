// 模擬層不得監聽匯流排事件（UI_COMMAND 除外）。
// 理由：回放快轉（engine/core/Replay.ts seekTo）把匯流排靜音、只放行 FAST_FORWARD_ALLOW；
// 模擬層一旦靠別的事件改狀態，快轉出來的結果就會和現場不同。表現層（renderers、presentation）不在此限。
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FAST_FORWARD_ALLOW } from '../engine/core/Replay';

const ROOT = path.resolve(__dirname, '..');
const SIM_DIRS = ['engine/systems', 'engine/ai', 'engine/physics', 'engine/core', 'engine/math'];

/**
 * 明確允許的監聽者（整個檔案）與理由。清單只減不增；檔案不再監聽就要刪掉這一行。
 */
const ALLOWED: Record<string, string> = {
    'engine/systems/audio/AudioSystem.ts': '只把遊戲事件轉成聲音，不寫模擬狀態；快轉時靜音正是想要的結果。',
};

function listSources(dir: string): string[] {
    const out: string[] = [];
    for (const ent of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${ent.name}`;
        if (ent.isDirectory()) out.push(...listSources(rel));
        else if (/\.tsx?$/.test(ent.name)) out.push(rel);
    }
    return out;
}

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** 每個 `.on(` 呼叫的第一個參數：字面字串回傳事件名，其他（變數）回傳 null。 */
function listeners(src: string): (string | null)[] {
    const out: (string | null)[] = [];
    for (const m of stripComments(src).matchAll(/\.on\(\s*([^,)]+)/g)) {
        const lit = /^(['"`])(\w+)\1$/.exec(m[1].trim());
        out.push(lit ? lit[2] : null);
    }
    return out;
}

describe('模擬層的匯流排監聽', () => {
    const files = SIM_DIRS.flatMap(listSources);
    const found = new Map(files.map((f) => [f, listeners(fs.readFileSync(path.join(ROOT, f), 'utf8'))]));

    it('除了 UI_COMMAND（快轉放行的事件）以外不監聽任何事件', () => {
        const violations: string[] = [];
        for (const [file, events] of found) {
            if (file in ALLOWED) continue;
            for (const ev of events) {
                if (ev === null || !(FAST_FORWARD_ALLOW as ReadonlySet<string>).has(ev)) violations.push(`${file}: ${ev ?? '(非字面事件名)'}`);
            }
        }
        expect(violations).toEqual([]);
    });

    it('允許清單裡的檔案確實還在監聽（不留過期例外）', () => {
        const stale = Object.keys(ALLOWED).filter((f) => !(found.get(f)?.length));
        expect(stale).toEqual([]);
    });

    it('掃描抓得到現有的 UI_COMMAND 監聽（掃描本身有效）', () => {
        expect(found.get('engine/systems/ui/UICommandSystem.ts')).toContain('UI_COMMAND');
    });
});
