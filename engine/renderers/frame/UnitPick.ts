// ╔══════════════════════════════════════════════════════════╗
// ║  UnitPick — 點到哪個單位（輸入層的命中判斷，只此一處）     ║
// ║  職責：用每個單位這一幀的繪製位置（UnitFrame）建身體框，   ║
// ║        世界座標的點落在框內（外加容差）就算點到；多個重疊  ║
// ║        時選排序鍵（sortY + sortBias）最大的＝畫在最前面。  ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §3、§4：   ║
// ║  身體框 = 腳底 (footX, floorY − physics.z) 到血條錨點        ║
// ║  hudAnchorY，加轉場位移（與 UNIT op 同一把尺）；只讀         ║
// ║  UnitFrame，不自己算高度。半寬 ＝ 框高 × PICK_HALF_WIDTH_    ║
// ║  RATIO。容差（螢幕像素 ÷ 鏡頭縮放＝世界單位）由呼叫端傳入。  ║
// ║  上游：UnitRenderSystem.pickAgent（持有最近一幀的快照）、    ║
// ║  hooks/pickAgentAt.ts（點擊、按下、拖曳共用的唯一入口）。    ║
// ╚══════════════════════════════════════════════════════════╝

import { GAME_INPUT_PARAM } from '../../../constants';
import type { UnitFrame } from './UnitFrame';

/**
 * 回傳點 (worldX, worldY) 點到的單位快照，沒有就 null。
 * 活著、有畫出來（visible）的單位才算；屍體與已回收的不算。padWorld 是向外多擴的世界單位。
 */
export function pickUnitFrame(frames: readonly UnitFrame[], worldX: number, worldY: number, padWorld: number): UnitFrame | null {
    let best: UnitFrame | null = null;
    let bestKey = -Infinity;
    let bestDx = Infinity;
    for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        if (!f.visible || f.isCorpse || f.agent.hp <= 0) continue;
        const bottom = f.floorY - (f.agent.physics.z || 0) + f.transition;
        const top = f.hudAnchorY + f.transition;
        const halfWidth = (bottom - top) * GAME_INPUT_PARAM.PICK_HALF_WIDTH_RATIO;
        const dx = Math.abs(worldX - f.footX);
        if (dx > halfWidth + padWorld || worldY < top - padWorld || worldY > bottom + padWorld) continue;
        const key = f.sortY + f.sortBias;
        if (key > bestKey || (key === bestKey && dx < bestDx)) {
            best = f;
            bestKey = key;
            bestDx = dx;
        }
    }
    return best;
}
