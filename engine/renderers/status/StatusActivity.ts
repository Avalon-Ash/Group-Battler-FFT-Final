// ╔══════════════════════════════════════════════════════════╗
// ║  StatusActivity — 「這個狀態現在成立嗎」的純判斷           ║
// ║  職責：Agent 欄位 → STATUS_PARTS 鍵是否成立、剩餘時間比例    ║
// ║ [ARCH] 持續狀態委派 core/StatusQueries，live slots 為準。 ║
// ║ [ARCH] isStatusVisible 保留既有戰場外觀；完整資料查詢不截斷。║
// ║        （唯讀、零配置；單位身上的零件層與 HUD 圖示列共用）    ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import { AIState } from "../../../types";
import { castingAiState } from "../../core/AgentDerived";
import { isPersistentStatusActive, statusProgress } from '../../core/StatusQueries';
import { STATUS_DISPLAY, type StatusDisplayKey } from '../../../data/status/status_display';
import type { StatusPartKey } from "../../../data/vfx/status_parts";

/** 持續狀態由 neutral query 統一判斷；施法／AI 提示維持原 API。 */
export function statusFraction(key: StatusPartKey, a: Agent): number {
    if (key === 'CC_INTERRUPT') return statusProgress('STUN', a);
    return key in STATUS_DISPLAY ? statusProgress(key as StatusDisplayKey, a) : 1;
}

export function isStatusActive(key: StatusPartKey, a: Agent): boolean {
    if (key in STATUS_DISPLAY) return isPersistentStatusActive(key as StatusDisplayKey, a, a.ccVisual === 'FROZEN' ? a.ccVisual : a.view.visualStatus);
    switch (key) {
        case 'CC_INTERRUPT': return a.aiState === AIState.CC_INTERRUPTED && a.effects.STUN.remaining <= 0;
        case 'CAST_ULT': return castingAiState(a) === AIState.CASTING_ULT;
        case 'CAST_ACTIVE': return castingAiState(a) === AIState.CASTING_ACTIVE;
        case 'EVADING': return a.aiState === AIState.EVADING_URGENT;
        default: return false;
    }
}

/** 定案範圍要求戰場圖示與零件維持現行，與面板完整槽位投影分開。 */
export function isStatusVisible(key: StatusPartKey, a: Agent): boolean {
    switch (key) {
        case 'BANISH': return a.banished && a.effects.BANISH.remaining > 0 && a.effects.STASIS.remaining <= 0;
        case 'FROZEN': return a.view.visualStatus === 'FROZEN';
        case 'STUN': return a.effects.STUN.remaining > 0 && a.view.visualStatus !== 'FROZEN';
        case 'POLYMORPH': return a.view.visualStatus === 'POLYMORPH';
        case 'INVINCIBLE': return a.view.visualStatus === 'INVINCIBLE';
        default: return isStatusActive(key, a);
    }
}
