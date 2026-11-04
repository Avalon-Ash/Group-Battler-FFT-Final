// ╔══════════════════════════════════════════════════════════╗
// ║  views/l4 — L4 視窗的唯讀快照（技能庫、戰鬥日誌）          ║
// ║  職責：提供 SkillDbView 與 LogView 快照，UI 不碰引擎內部   ║
// ║  [ARCH] 內容沒變就回傳同一個物件，避免 useSyncExternalStore║
// ║  無限重繪                                                 ║
// ╚══════════════════════════════════════════════════════════╝
import type { GameEngine } from '../../../game';
import type { Skill } from '../../../../types';
import type { SkillDbView } from '../../../../types/ui/l4';

interface CacheEntry {
    signature: string;
    view: SkillDbView;
}

const skillDbCaches = new WeakMap<GameEngine, CacheEntry>();

function computeSkillDbSignature(skills: readonly Skill[]): string {
    return JSON.stringify(skills);
}

export function selectSkillDbView(engine: GameEngine): SkillDbView {
    const skills = engine.skillDB;
    const signature = computeSkillDbSignature(skills);

    const prev = skillDbCaches.get(engine);
    if (prev && prev.signature === signature) {
        return prev.view;
    }

    const view: SkillDbView = {
        skills: [...skills],
        totalCount: skills.length,
    };
    skillDbCaches.set(engine, { signature, view });
    return view;
}

export { selectLogView } from '../selectors';
