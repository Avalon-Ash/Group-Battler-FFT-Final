// ╔══════════════════════════════════════════════════════════╗
// ║ ReplayIO — 回放檔的下載、選檔讀取與網址載入（契約 S3）     ║
// ║ 職責：ReplayFile ⇄ JSON 檔。格式與版本檢查在               ║
// ║       engine/core/Replay.ts（isReplayFile、BUILD_ID）。     ║
// ║ 上游：hooks/useGameApp.ts（存回放、載入回放、?replay=）。   ║
// ║ [ARCH] 不改引擎狀態；載入後怎麼播由呼叫端交給 startReplay。 ║
// ╚══════════════════════════════════════════════════════════╝
import type { ReplayFile } from '../../types';
import { BUILD_ID, isReplayFile } from '../core/Replay';

/** public/ 底下放回放檔的資料夾（?replay=<name> 從這裡讀） */
const REPLAY_PUBLIC_DIR = 'replays/';
/** 網址參數：開機直接載入 public/replays/<name> */
const REPLAY_QUERY_KEY = 'replay';

const JSON_TYPE = 'application/json;charset=utf-8';

/** 載入結果：versionMismatch＝產生它的程式版本和現在不同（模擬可能改過，回放不一定和當時相同） */
export interface LoadedReplay {
    file: ReplayFile;
    versionMismatch: boolean;
}

function check(data: unknown, source: string): LoadedReplay {
    if (!isReplayFile(data)) throw new Error(`${source} 不是看得懂的回放檔`);
    return { file: data, versionMismatch: data.build !== BUILD_ID };
}

export function downloadReplay(file: ReplayFile): void {
    const blob = new Blob([JSON.stringify(file)], { type: JSON_TYPE });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tactical-replay-${file.build}-${file.endTick}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function readReplayFile(blob: Blob): Promise<LoadedReplay> {
    return check(JSON.parse(await blob.text()), '選的檔案');
}

/** 開系統的選檔視窗挑一份回放檔（比照下載，用暫時的元素，不放進畫面） */
export function pickReplayFile(onPicked: (file: Blob) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
        const file = input.files?.[0];
        if (file) onPicked(file);
    };
    input.click();
}

/** 讀 public/replays/<name>；name 只取檔名，不接受路徑 */
export async function fetchPublicReplay(name: string): Promise<LoadedReplay> {
    const safe = name.split(/[\\/]/).pop() ?? '';
    if (!safe) throw new Error('回放檔名是空的');
    const res = await fetch(`${import.meta.env.BASE_URL}${REPLAY_PUBLIC_DIR}${encodeURIComponent(safe)}`);
    if (!res.ok) throw new Error(`讀不到回放檔 ${safe}（${res.status}）`);
    return check(await res.json(), safe);
}

/** 網址上的 ?replay=<name>；沒有就是 null */
export function replayQuery(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(REPLAY_QUERY_KEY);
}
