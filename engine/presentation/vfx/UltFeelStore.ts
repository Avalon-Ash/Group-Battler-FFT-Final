// ╔══════════════════════════════════════════════════════════╗
// ║  UltFeelStore — 奧義演出狀態儲存庫 (Presentation State)    ║
// ║  職責：記錄奧義詠唱施法者（暗場聚光）與命中光爆狀態        ║
// ║  [ARCH] 寫入者唯二：VisualSystem (CAST_START / CAST_BREAK) ║
// ║         與 SequenceSystem (ULT_IMPACT)。VFXSystem.reset 清空║
// ║         每幀零配置、固定容量槽位。                         ║
// ╚══════════════════════════════════════════════════════════╝

import { Team } from '../../../types';
import { ULT_FEEL } from '../../../constants/vfx';

export interface UltCasterRecord {
    active: boolean;
    casterId: string;
    skillName: string;
    team: Team;
    startTime: number;
    castDuration: number;
}

export interface UltImpactRecord {
    active: boolean;
    x: number;
    y: number;
    z: number;
    team?: Team;
    time: number;
}

export class UltFeelStore {
    private readonly casters: UltCasterRecord[];
    private readonly impacts: UltImpactRecord[];

    // Preallocated buffers for queries (zero allocations per frame)
    private readonly _activeSpotlightBuffer: UltCasterRecord[] = [];
    private readonly _activeImpactsBuffer: UltImpactRecord[] = [];
    private readonly _sortScratch: UltCasterRecord[] = [];

    constructor() {
        this.casters = Array.from({ length: ULT_FEEL.MAX_CASTERS }, () => ({
            active: false,
            casterId: '',
            skillName: '',
            team: Team.BLUE,
            startTime: 0,
            castDuration: 0,
        }));

        this.impacts = Array.from({ length: ULT_FEEL.MAX_IMPACTS }, () => ({
            active: false,
            x: 0,
            y: 0,
            z: 0,
            team: undefined,
            time: 0,
        }));
    }

    /** 記錄奧義詠唱開始（寫入者：VisualSystem） */
    public recordCastStart(casterId: string, skillName: string, team: Team, castDuration: number, now: number): void {
        // 1. 記錄施法者槽位
        let slot = this.casters.find(c => c.active && c.casterId === casterId);
        if (!slot) {
            slot = this.casters.find(c => !c.active);
        }
        if (!slot) {
            // 所有槽位皆被佔用時，替換最舊的施法者
            let oldest = this.casters[0];
            for (let i = 1; i < this.casters.length; i++) {
                if (this.casters[i].startTime < oldest.startTime) {
                    oldest = this.casters[i];
                }
            }
            slot = oldest;
        }

        slot.active = true;
        slot.casterId = casterId;
        slot.skillName = skillName;
        slot.team = team;
        slot.startTime = now;
        slot.castDuration = castDuration;
    }

    /** 移除施法者（寫入者：VisualSystem 在 CAST_BREAK 時呼叫） */
    public removeCaster(casterId: string): void {
        for (let i = 0; i < this.casters.length; i++) {
            const c = this.casters[i];
            if (c.active && c.casterId === casterId) {
                c.active = false;
            }
        }
    }

    /** 記錄命中光爆（寫入者：SequenceSystem ULT_IMPACT 動作） */
    public recordImpact(x: number, y: number, z: number, team: Team | undefined, time: number): void {
        let slot = this.impacts.find(imp => !imp.active);
        if (!slot) {
            // 替換最舊的命中記錄
            let oldest = this.impacts[0];
            for (let i = 1; i < this.impacts.length; i++) {
                if (this.impacts[i].time < oldest.time) {
                    oldest = this.impacts[i];
                }
            }
            slot = oldest;
        }

        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.z = z;
        slot.team = team;
        slot.time = time;
    }

    /**
     * 取得最新的最多 2 個施法者（供聚光使用，RenderSpec 錨點讀 UnitFrame）
     */
    public getActiveSpotlightCasters(now: number): readonly UltCasterRecord[] {
        this._sortScratch.length = 0;
        for (let i = 0; i < this.casters.length; i++) {
            const c = this.casters[i];
            if (!c.active) continue;
            // 檢查是否已過期：超過 castDuration + DIM_FADE_OUT 則過期
            if (now >= c.startTime + c.castDuration + ULT_FEEL.DIM_FADE_OUT) {
                c.active = false;
                continue;
            }
            if (now >= c.startTime) {
                this._sortScratch.push(c);
            }
        }

        // 依 startTime 降序排序（最新優先）
        this._sortScratch.sort((a, b) => b.startTime - a.startTime);

        this._activeSpotlightBuffer.length = 0;
        const count = Math.min(ULT_FEEL.SPOTLIGHT_MAX_CASTERS, this._sortScratch.length);
        for (let i = 0; i < count; i++) {
            this._activeSpotlightBuffer.push(this._sortScratch[i]);
        }
        return this._activeSpotlightBuffer;
    }

    /**
     * 取得所有進行中施法者（供測試或總覽）
     */
    public getActiveCasters(now: number): readonly UltCasterRecord[] {
        return this.getActiveSpotlightCasters(now);
    }

    /**
     * 計算目前暗場不透明度（0 到 DIM_ALPHA）
     * 詠唱中隨進度淡入，命中後／詠唱結束後在 DIM_FADE_OUT 內淡出
     */
    public getDimAlpha(now: number, isLowTier = false): number {
        let maxAlpha = 0;
        const peakAlpha = isLowTier ? ULT_FEEL.DIM_ALPHA_LOW_TIER : ULT_FEEL.DIM_ALPHA;

        for (let i = 0; i < this.casters.length; i++) {
            const c = this.casters[i];
            if (!c.active) continue;
            if (now < c.startTime) continue;

            const castEnd = c.startTime + c.castDuration;
            const fullEnd = castEnd + ULT_FEEL.DIM_FADE_OUT;

            if (now >= fullEnd) {
                c.active = false;
                continue;
            }

            let alpha = 0;
            if (now < castEnd) {
                // 詠唱淡入期
                const elapsed = now - c.startTime;
                const fadeIn = Math.max(0.01, Math.min(c.castDuration * 0.5, ULT_FEEL.DIM_FADE_IN));
                alpha = peakAlpha * Math.min(1, elapsed / fadeIn);
            } else {
                // 命中後淡出期
                const fadeElapsed = now - castEnd;
                const t = Math.min(1, Math.max(0, fadeElapsed / ULT_FEEL.DIM_FADE_OUT));
                alpha = peakAlpha * (1 - t);
            }

            if (alpha > maxAlpha) {
                maxAlpha = alpha;
            }
        }

        return maxAlpha;
    }

    /**
     * 取得進行中的命中光爆
     */
    public getActiveImpacts(now: number): readonly UltImpactRecord[] {
        this._activeImpactsBuffer.length = 0;
        for (let i = 0; i < this.impacts.length; i++) {
            const imp = this.impacts[i];
            if (!imp.active) continue;
            const elapsed = now - imp.time;
            if (elapsed < 0 || elapsed >= ULT_FEEL.IMPACT_BURST_DURATION) {
                imp.active = false;
                continue;
            }
            this._activeImpactsBuffer.push(imp);
        }
        return this._activeImpactsBuffer;
    }

    /** 清空狀態（VFXSystem.reset 呼叫） */
    public reset(): void {
        for (let i = 0; i < this.casters.length; i++) {
            const c = this.casters[i];
            c.active = false;
            c.casterId = '';
            c.skillName = '';
            c.team = Team.BLUE;
            c.startTime = 0;
            c.castDuration = 0;
        }
        for (let i = 0; i < this.impacts.length; i++) {
            const imp = this.impacts[i];
            imp.active = false;
            imp.x = 0;
            imp.y = 0;
            imp.z = 0;
            imp.team = undefined;
            imp.time = 0;
        }
        this._activeSpotlightBuffer.length = 0;
        this._activeImpactsBuffer.length = 0;
        this._sortScratch.length = 0;
    }
}

export const ultFeelStore = new UltFeelStore();
