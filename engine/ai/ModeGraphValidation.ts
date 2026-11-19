// ╔══════════════════════════════════════════════════════════╗
// ║  ModeGraphValidation — 模式圖的結構檢查（契約 G4）        ║
// ║  職責：建樹之前確認一張模式圖是完整的；有問題就列出來，    ║
// ║        由呼叫端丟錯，不再塞一個永遠失敗的假節點。          ║
// ║  [ARCH] 純函式，不依賴引擎。行為編輯器（G5）存檔前、        ║
// ║  AISystem.buildAI 建樹前都呼叫它。                          ║
// ╚══════════════════════════════════════════════════════════╝

import type { AIModeGraph, BTDef } from '../../data/ai_profiles';
import { BTConditions, BTActions } from './BTRegistry';

/**
 * 回傳問題清單（空陣列＝合格）。每一條訊息都要包含出問題的名字（模式名、條件鍵或動作鍵）。要檢查：
 *  - initial 是圖裡有的模式；
 *  - 每條邊的 to 與 from 裡的模式都存在，when／unless 恰好有一個，而且是 BTConditions 有的鍵；
 *  - 每個模式的 onFailure 指向存在的模式；
 *  - 小樹裡 CONDITION 的 key 在 BTConditions、ACTION 的 key 在 BTActions；SELECTOR／SEQUENCE 至少一個子節點。
 */
export function validateModeGraph(graph: AIModeGraph): string[] {
    const problems: string[] = [];
    const modes = graph.modes as Record<string, { tree: BTDef; onFailure?: string } | undefined>;
    const known = (m: string): boolean => Object.prototype.hasOwnProperty.call(modes, m);
    const hasKey = (table: object, key: string | undefined): boolean => key !== undefined && Object.prototype.hasOwnProperty.call(table, key);

    if (!known(graph.initial)) problems.push(`initial 指向不存在的模式 '${graph.initial}'`);

    graph.edges.forEach((e, i) => {
        const label = `邊 #${i}（${Array.isArray(e.from) ? e.from.join('/') : e.from} → ${e.to}）`;
        if (!known(e.to)) problems.push(`${label}：to 指向不存在的模式 '${e.to}'`);
        if (e.from !== '*') for (const f of e.from) if (!known(f)) problems.push(`${label}：from 指向不存在的模式 '${f}'`);
        if ((e.when === undefined) === (e.unless === undefined)) {
            problems.push(`${label}：when 與 unless 必須恰好有一個`);
        } else {
            const key = e.when ?? e.unless;
            if (!hasKey(BTConditions, key)) problems.push(`${label}：條件鍵 '${String(key)}' 不在 BTConditions`);
        }
    });

    const checkTree = (mode: string, def: BTDef): void => {
        if (def.type === 'CONDITION' || def.type === 'ACTION') {
            const table = def.type === 'CONDITION' ? BTConditions : BTActions;
            if (!hasKey(table, def.key)) problems.push(`模式 '${mode}'：${def.type === 'CONDITION' ? '條件' : '動作'}鍵 '${String(def.key)}'（節點 '${def.name}'）不在登錄表`);
            return;
        }
        if (!def.children || def.children.length === 0) {
            problems.push(`模式 '${mode}'：${def.type} 節點 '${def.name}' 沒有子節點`);
            return;
        }
        for (const c of def.children) checkTree(mode, c);
    };
    for (const [mode, def] of Object.entries(modes)) {
        if (!def) continue;
        checkTree(mode, def.tree);
        if (def.onFailure !== undefined && !known(def.onFailure)) problems.push(`模式 '${mode}'：onFailure 指向不存在的模式 '${def.onFailure}'`);
    }
    return problems;
}
