// ╔══════════════════════════════════════════════════════════╗
// ║  UltFeelStore — 奧義演出狀態儲存庫 (Presentation State)    ║
// ║  職責：記錄奧義命中光爆狀態                                ║
// ║  [ARCH] 唯一寫入者：SequenceSystem (ULT_IMPACT)。          ║
// ║         VFXSystem.reset 清空；每幀零配置、固定容量槽位。   ║
// ║  詠唱暗場＋聚光已移除：詠唱只有 0.1～2 秒，只見亮暗交替。  ║
// ╚══════════════════════════════════════════════════════════╝

import { Team } from '../../../types';
import { ULT_FEEL } from '../../../constants/vfx';

export interface UltImpactRecord {
    active: boolean;
    x: number;
    y: number;
    z: number;
    team?: Team;
    time: number;
}

export class UltFeelStore {
    private readonly impacts: UltImpactRecord[];

    // Preallocated buffer for queries (zero allocations per frame)
    private readonly _activeImpactsBuffer: UltImpactRecord[] = [];

    constructor() {
        this.impacts = Array.from({ length: ULT_FEEL.MAX_IMPACTS }, () => ({
            active: false,
            x: 0,
            y: 0,
            z: 0,
            team: undefined,
            time: 0,
        }));
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
        for (let i = 0; i < this.impacts.length; i++) {
            const imp = this.impacts[i];
            imp.active = false;
            imp.x = 0;
            imp.y = 0;
            imp.z = 0;
            imp.team = undefined;
            imp.time = 0;
        }
        this._activeImpactsBuffer.length = 0;
    }
}

export const ultFeelStore = new UltFeelStore();
