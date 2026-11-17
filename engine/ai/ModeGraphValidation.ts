// ╔══════════════════════════════════════════════════════════╗
// ║  ModeGraphValidation — 模式圖的結構檢查（契約 G4，空殼）   ║
// ║  職責：建樹之前確認一張模式圖是完整的；有問題就列出來，    ║
// ║        由呼叫端丟錯，不再塞一個永遠失敗的假節點。          ║
// ║  [ARCH] 純函式，不依賴引擎。行為編輯器（G5）存檔前、        ║
// ║  AISystem.buildAI 建樹前都呼叫它。                          ║
// ╚══════════════════════════════════════════════════════════╝

import type { AIModeGraph } from '../../data/ai_profiles';
import { pending } from '../core/ContractPending';

/**
 * 回傳問題清單（空陣列＝合格）。每一條訊息都要包含出問題的名字（模式名、條件鍵或動作鍵）。要檢查：
 *  - initial 是圖裡有的模式；
 *  - 每條邊的 to 與 from 裡的模式都存在，when／unless 恰好有一個，而且是 BTConditions 有的鍵；
 *  - 每個模式的 onFailure 指向存在的模式；
 *  - 小樹裡 CONDITION 的 key 在 BTConditions、ACTION 的 key 在 BTActions；SELECTOR／SEQUENCE 至少一個子節點。
 */
export function validateModeGraph(graph: AIModeGraph): string[] {
    void graph;
    return pending('G4', 'validateModeGraph');
}
