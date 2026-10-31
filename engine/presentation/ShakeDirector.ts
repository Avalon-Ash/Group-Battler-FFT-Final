// ╔══════════════════════════════════════════════════════════╗
// ║  ShakeDirector — 鏡頭震動決策器                         ║
// ║  職責：彙整同 tick 鏡頭衝擊、焦點加權、取最大值與上限   ║
// ║  上游：DirectorSystem 轉發之 CAMERA_IMPACT 事件          ║
// ║  下游：DirectorSystem.update 讀取後發出 CAMERA_SHAKE      ║
// ╚══════════════════════════════════════════════════════════╝

import { CameraImpact, ImpactKind } from '../../types';
import { SHAKE_DIRECTOR_PARAM } from '../../constants';

export interface CameraImpactSink {
    reportImpact(kind: ImpactKind, intensity: number, targetId?: string): void;
}

export class ShakeDirector {
    private maxIntensity: number = 0;

    /**
     * 回報衝擊。
     * 算加權值 w = impact.intensity；若 impact.kind 在 SHAKE_DIRECTOR_PARAM.MINOR_KINDS，
     * 且 focusId 不是 null，且 impact.targetId 有值又不等於 focusId，則 w *= OFF_FOCUS_SCALE。
     * 保留本 tick 的最大 w（取最大，不加總）。
     */
    public report(impact: CameraImpact, focusId: string | null): void {
        let w = impact.intensity;
        const isMinor = (SHAKE_DIRECTOR_PARAM.MINOR_KINDS as readonly string[]).includes(impact.kind);
        if (isMinor && focusId !== null && impact.targetId !== undefined && impact.targetId !== focusId) {
            w *= SHAKE_DIRECTOR_PARAM.OFF_FOCUS_SCALE;
        }
        if (w > this.maxIntensity) {
            this.maxIntensity = w;
        }
    }

    /**
     * 消耗並回傳本 tick 決策出的震動量。
     * 回傳 min(MAX_TRAUMA, 本 tick 最大值)，並把暫存歸零；沒有衝擊回傳 0。
     */
    public consume(): number {
        const val = this.maxIntensity;
        this.maxIntensity = 0;
        return Math.min(SHAKE_DIRECTOR_PARAM.MAX_TRAUMA, val);
    }

    public reset(): void {
        this.maxIntensity = 0;
    }
}
