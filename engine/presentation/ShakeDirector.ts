// ╔══════════════════════════════════════════════════════════╗
// ║  ShakeDirector — 鏡頭震動決策器                         ║
// ║  職責：彙整同 tick 鏡頭衝擊、焦點加權、取最大值與上限   ║
// ║  上游：DirectorSystem 轉發之 CAMERA_IMPACT 事件          ║
// ║  下游：DirectorSystem.update 讀取後發出 CAMERA_SHAKE      ║
// ╚══════════════════════════════════════════════════════════╝

import { CameraImpact, ImpactKind } from '../../types';
import { SHAKE_DIRECTOR_PARAM, UI_SETTINGS } from '../../constants';

export interface CameraImpactSink {
    reportImpact(kind: ImpactKind, intensity: number, targetId?: string): void;
}

export class ShakeDirector {
    public strength: number = SHAKE_DIRECTOR_PARAM.DEFAULT_STRENGTH;
    public offFocusScale: number = SHAKE_DIRECTOR_PARAM.OFF_FOCUS_SCALE;
    public maxTrauma: number = SHAKE_DIRECTOR_PARAM.MAX_TRAUMA;
    private maxIntensity: number = 0;

    /**
     * 回報衝擊。
     * 算加權值 w = impact.intensity；若 impact.kind 在 SHAKE_DIRECTOR_PARAM.MINOR_KINDS，
     * 且 focusId 不是 null，且 impact.targetId 有值又不等於 focusId，則 w *= this.offFocusScale。
     * 保留本 tick 的最大 w（取最大，不加總）。
     */
    public report(impact: CameraImpact, focusId: string | null): void {
        let w = impact.intensity;
        const isMinor = (SHAKE_DIRECTOR_PARAM.MINOR_KINDS as readonly string[]).includes(impact.kind);
        if (isMinor && focusId !== null && impact.targetId !== undefined && impact.targetId !== focusId) {
            w *= this.offFocusScale;
        }
        if (w > this.maxIntensity) {
            this.maxIntensity = w;
        }
    }

    /**
     * 消耗並回傳本 tick 決策出的震動量。
     * 回傳 min(this.maxTrauma, 本 tick 最大值 × this.strength)，並把暫存歸零；沒有衝擊回傳 0。
     */
    public consume(): number {
        const val = this.maxIntensity;
        this.maxIntensity = 0;
        return Math.min(this.maxTrauma, val * this.strength);
    }

    public setTuning(t: { strength?: number; offFocusScale?: number; maxTrauma?: number }): void {
        if (!t || typeof t !== 'object') return;
        if (typeof t.strength === 'number' && Number.isFinite(t.strength)) {
            this.strength = Math.max(
                UI_SETTINGS.SHAKE_STRENGTH.min,
                Math.min(UI_SETTINGS.SHAKE_STRENGTH.max, t.strength)
            );
        }
        if (typeof t.offFocusScale === 'number' && Number.isFinite(t.offFocusScale)) {
            this.offFocusScale = Math.max(
                UI_SETTINGS.SHAKE_OFF_FOCUS.min,
                Math.min(UI_SETTINGS.SHAKE_OFF_FOCUS.max, t.offFocusScale)
            );
        }
        if (typeof t.maxTrauma === 'number' && Number.isFinite(t.maxTrauma)) {
            this.maxTrauma = Math.max(
                UI_SETTINGS.SHAKE_MAX.min,
                Math.min(UI_SETTINGS.SHAKE_MAX.max, t.maxTrauma)
            );
        }
    }

    public reset(): void {
        this.maxIntensity = 0;
    }
}
