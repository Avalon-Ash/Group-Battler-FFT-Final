// ╔══════════════════════════════════════════════════════════╗
// ║  MatchFlowSystem — 對局流程（契約 R2，空殼）               ║
// ║  職責：一台狀態機管「一局接一局」：佈陣、開戰、結算停留、  ║
// ║        退場、換圖、進場、等素材、生成。取代 useGameApp 裡  ║
// ║        的巢狀 setTimeout，讓流程在無畫面下也能跑、能測。   ║
// ║  [ARCH] 用真實時間推進：遊戲迴圈每個畫面呼叫 update 一次，  ║
// ║  不在模擬 tick 裡。時間參數沿用 GAME_APP_PARAM。            ║
// ║  本檔屬模擬層，不得 import 表現層：等圖集這件事由組裝層     ║
// ║  注入 isRosterReady；下一批陣容用 engine.bus 公布。         ║
// ║  流程裡所有的抽號（地圖大小、佈局、陣營設定、出生格、開戰   ║
// ║  種子）只來自 nextSeed，不用模擬流，也不用 Math.random。    ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { MatchPhase } from '../../../types';
import { pending } from '../../core/ContractPending';

export interface MatchFlowDeps {
    /** 下一批單位的圖集載好了嗎（表現層的事）。逾時（GAME_APP_PARAM.SPAWN_ATLAS_WAIT_MAX_MS）照樣生成 */
    isRosterReady: () => boolean;
    /** 種子來源（uint32）。正式由組裝層提供隨機值；測試注入固定序列，流程就完全可重現 */
    nextSeed: () => number;
}

export class MatchFlowSystem {
    constructor(engine: GameEngine, deps: MatchFlowDeps) {
        void engine; void deps;
        return pending('R2', 'MatchFlowSystem');
    }

    /** 目前階段 */
    public get phase(): MatchPhase {
        return pending('R2', 'MatchFlowSystem.phase');
    }

    /** 展示模式：自動一局接一局。關掉＝回到手動（LOBBY），等玩家佈陣與開戰 */
    public setShowcase(enabled: boolean): void {
        void enabled;
        return pending('R2', 'MatchFlowSystem.setShowcase');
    }

    /** 每個畫面呼叫一次；realDt 是真實經過的秒數 */
    public update(realDt: number): void {
        void realDt;
        return pending('R2', 'MatchFlowSystem.update');
    }
}
