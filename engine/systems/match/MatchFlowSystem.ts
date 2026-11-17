// ╔══════════════════════════════════════════════════════════╗
// ║  MatchFlowSystem — 對局流程（契約 R2）                     ║
// ║  職責：管「一局接一局」：佈陣、開戰、結算停留、退場、換圖、 ║
// ║        進場、等素材、生成。取代 useGameApp 裡的巢狀         ║
// ║        setTimeout，流程在無畫面下也能跑、能測。             ║
// ║  上游：hooks/useGameLoop.ts（每個畫面 update 一次）、       ║
// ║        hooks/useGameApp.ts（切展示模式、手動的隨機戰場）、   ║
// ║        engine/systems/ui/views/session.ts（UI 投影）、      ║
// ║        engine/renderer.ts（每幀讀 transition）。            ║
// ║  [ARCH] 用真實時間推進，不在模擬 tick 裡。時間參數沿用      ║
// ║  GAME_APP_PARAM。                                           ║
// ║  階段多半由引擎狀態當場推導（enginePhase：打完了＝結算、    ║
// ║  開戰了＝進行中、否則大廳），所以回放、跳轉、手動重開都不用 ║
// ║  通知流程；流程自己只記計時階段（退場、進場、等素材）。     ║
// ║  不監聽 engine.bus（tests/SimBusListeners.test.ts）：回放    ║
// ║  快轉時匯流排靜音，靠事件的流程會漏接。                     ║
// ║  本檔屬模擬層，不得 import 表現層：等圖集這件事由組裝層     ║
// ║  注入 isRosterReady；下一批陣容用 MATCH_ROSTER 公布。       ║
// ║  展示回合的亂數全部來自 nextSeed：流程自己的抽號（陣營設定、║
// ║  地圖大小與佈局、出生格）用這一局的本地序列；地圖生成器與   ║
// ║  場景抽選讀的是模擬流，所以換圖前先用一個種子重設模擬流；   ║
// ║  開戰再給 START_GAME 一個種子。手動的隨機戰場不重設模擬流、 ║
// ║  用全域佈陣流（保真基準 battle_frozen 靠它固定）。          ║
// ║  寫入引擎一律送 UI_COMMAND。                                ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { BattleSetup, MatchPhase, Team, UICommand } from '../../../types';
import { GAME_APP_PARAM, UI_SETTINGS } from '../../../constants';
import { createRandomStream, setupRandom } from '../../math/rng';
import { rollShowcaseSetup } from '../ui/editorQueries';
import { planRoster, deployRoster, rollShowcaseMap, type RosterSlot } from './Deployment';

export interface MatchFlowDeps {
    /** 下一批單位的圖集載好了嗎（表現層的事）。逾時（GAME_APP_PARAM.SPAWN_ATLAS_WAIT_MAX_MS）照樣生成 */
    isRosterReady: () => boolean;
    /** 種子來源（uint32）。正式由組裝層提供隨機值；測試注入固定序列，流程就完全可重現 */
    nextSeed: () => number;
}

/** 一場的結果。平手時 winner、winnerId、winnerSide 都是 null */
export interface MatchResult {
    winner: Team | null;
    winnerId: string | null;
    winnerSide: number | null;
}

/** 流程自己計時的階段；其餘階段由引擎狀態推導 */
type TimedPhase = 'TRANSITION_OUT' | 'TRANSITION_IN' | 'SPAWN_WAIT';

/** 展示模式第一局的陣營設定：ROLL＝隨機抽；KEEP_SETUP＝沿用引擎目前的設定（玩家從手動切進展示） */
export type FirstRoundSetup = 'ROLL' | 'KEEP_SETUP';

const MS_PER_S = 1000;

/** 這一場打完了：勝利計時走完、引擎自己停下（結算慢動作中按暫停不算打完）。 */
function isMatchOver(engine: GameEngine): boolean {
    const vs = engine.state.victory;
    return vs.isFinishing && vs.victoryTimer <= 0 && !engine.isRunning;
}

/** 只看引擎狀態的階段：打完了＝結算停留；開戰了（含暫停中）＝進行中；否則大廳。 */
export function enginePhase(engine: GameEngine): MatchPhase {
    if (isMatchOver(engine)) return 'RESULT_HOLD';
    return engine.battleStarted ? 'PLAYING' : 'LOBBY';
}

/** 場上這一場的結果；還沒打完是 null。勝方陣營要趁單位還在場上時查。 */
export function liveResult(engine: GameEngine): MatchResult | null {
    if (!isMatchOver(engine)) return null;
    const vs = engine.state.victory;
    const winnerSide = vs.winnerId === null ? null : engine.agents.find((a) => a.id === vs.winnerId)?.side ?? null;
    return { winner: vs.winningTeam, winnerId: vs.winnerId, winnerSide };
}

/** 場上這一局的陣營設定：開戰後以開戰快照為準，否則用 fallback（最近一次佈陣時的設定）。 */
export function matchSetupOf(engine: GameEngine, fallback: BattleSetup): BattleSetup {
    return engine.commands.matchStart?.snapshot.battleSetup ?? fallback;
}

export class MatchFlowSystem {
    private showcase = false;
    /** 上次用 SET_SHOWCASE_MODE 公布的值（音訊在聽）；null＝還沒公布過 */
    private announcedShowcase: boolean | null = null;
    private timed: TimedPhase | null = null;
    /** 目前這個階段已經過的毫秒（計時階段，或展示模式的結算停留） */
    private elapsedMs = 0;
    /** 等素材階段已經過幾個畫面 */
    private waitFrames = 0;

    /** 已排好、還沒放上場的陣容；空＝下次佈陣時重排 */
    private roster: RosterSlot[] = [];
    /** roster 是照哪一組陣營設定排的 */
    private plannedSetup: BattleSetup;
    /** 排過幾次陣容（體型雜湊與外觀分配的鹽） */
    private rosterRound = 0;
    private readonly lookSalt: number;
    /** 最近一次放上場的陣營設定（還沒開戰時 UI 顯示它） */
    private dealtSetup: BattleSetup;
    /** 玩家自己的陣營設定：展示模式每局隨機會蓋掉 engine.battleSetup，回到手動時還原 */
    private manualSetup: BattleSetup;
    /** 展示回合：退場時抽好的下一局陣營設定，換完地圖才寫進引擎（退場時的地圖是縮圈後的殘圖，總池很小，會被夾低） */
    private nextSetup: BattleSetup | null = null;
    /** 這一個展示回合的抽號序列（每回合由 nextSeed 重新起頭） */
    private rand: () => number = setupRandom;

    /** 結算結果的鎖存：進結算那一刻記下，轉場期間清盤後 UI 仍讀得到，下一局生成才清 */
    private latched: MatchResult | null = null;
    private lastPublished: MatchPhase = 'LOBBY';

    constructor(private readonly engine: GameEngine, private readonly deps: MatchFlowDeps) {
        this.lookSalt = deps.nextSeed();
        this.plannedSetup = { ...engine.battleSetup };
        this.dealtSetup = { ...engine.battleSetup };
        this.manualSetup = { ...engine.battleSetup };
        engine.matchFlow = this;
    }

    /** 目前階段（讀取當下就正確，不必先 update） */
    public get phase(): MatchPhase {
        return this.timed ?? enginePhase(this.engine);
    }

    public get isShowcase(): boolean {
        return this.showcase;
    }

    /** 渲染用的轉場階段：退場、進場以外都是 IDLE（等素材時畫面已經是 IDLE） */
    public get transition(): 'IN' | 'OUT' | 'IDLE' {
        if (this.timed === 'TRANSITION_OUT') return 'OUT';
        return this.timed === 'TRANSITION_IN' ? 'IN' : 'IDLE';
    }

    /** 這一場的結果（轉場期間是鎖存的上一場結果）；沒有就是 null */
    public get result(): MatchResult | null {
        return this.latched ?? liveResult(this.engine);
    }

    /** 場上這一局的陣營設定 */
    public get matchSetup(): BattleSetup {
        return matchSetupOf(this.engine, this.dealtSetup);
    }

    /**
     * 開機時先標成展示模式（還沒開第一局、也不公布）：UI 第一個畫面就照展示模式畫。
     * 之後呼叫 setShowcase(true) 才真的開局。
     */
    public primeShowcase(): void {
        this.showcase = true;
    }

    /**
     * 展示模式：自動一局接一局。每次用 true 呼叫都立刻重開一個展示回合（換圖、佈陣、開戰）。
     * 關掉＝回到手動（LOBBY）：停下、清盤、還原玩家自己的陣營設定，等玩家佈陣與開戰。
     */
    public setShowcase(enabled: boolean, firstRound: FirstRoundSetup = 'ROLL'): void {
        if (enabled) {
            // 只在「從手動切進展示」那一刻記下玩家設定（開機與重複呼叫不記，否則會把隨機值存進來）
            if (!this.showcase) this.manualSetup = { ...this.engine.battleSetup };
            this.showcase = true;
            this.announceShowcase();
            this.beginRound(firstRound);
        } else {
            const wasShowcase = this.showcase;
            this.showcase = false;
            this.announceShowcase();
            if (wasShowcase) {
                this.resetTimers();
                this.send({ type: 'STOP_GAME' });
                this.send({ type: 'CLEAR_BOARD', keepScene: true });
                this.send({ type: 'SET_BATTLE_SETUP', setup: { ...this.manualSetup } });
            }
        }
        this.publish();
    }

    /**
     * 手動：換一張新戰場，照目前的陣營設定發一批陣容（骰子、下一關共用）。
     * 用全域佈陣流、不重設模擬流。start＝發完直接開戰。
     */
    public newBattlefield(start = false): void {
        this.resetTimers();
        this.send({ type: 'STOP_GAME' });
        this.send({ type: 'CLEAR_BOARD', keepScene: false });
        this.roster = [];
        this.deal(setupRandom);
        this.roster = [];
        if (start) this.send({ type: 'START_GAME' });
        this.send({ type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
        this.publish();
    }

    /**
     * 玩法面板「套用並重新開局」：這是玩家要的設定（記下來，回到手動時還原），換新戰場；
     * 展示模式直接開打（只影響這一局，下一局回到隨機），手動模式等玩家按開始。
     */
    public applyBattleSetup(): void {
        this.manualSetup = { ...this.engine.battleSetup };
        this.newBattlefield(this.showcase);
    }

    /** 每個畫面呼叫一次；realDt 是真實經過的秒數。一次最多前進一個階段。 */
    public update(realDt: number): void {
        // 分頁回到前景的那一幀可能隔了好幾秒：設上限，轉場不會被一口氣跳過
        const dtMs = Math.min(realDt * MS_PER_S, GAME_APP_PARAM.FLOW_MAX_FRAME_MS);
        switch (this.phase) {
            case 'RESULT_HOLD':
                if (!this.latched) this.latched = liveResult(this.engine);
                if (this.showcase) {
                    this.elapsedMs += dtMs;
                    if (this.elapsedMs >= GAME_APP_PARAM.RESULT_HOLD_MS) this.enterTransitionOut();
                }
                break;
            case 'TRANSITION_OUT':
                this.elapsedMs += dtMs;
                if (this.elapsedMs >= GAME_APP_PARAM.TRANSITION_OUT_MS) this.enterTransitionIn();
                break;
            case 'TRANSITION_IN':
                this.elapsedMs += dtMs;
                if (this.elapsedMs >= GAME_APP_PARAM.TRANSITION_IN_MS) this.enter('SPAWN_WAIT');
                break;
            case 'SPAWN_WAIT':
                // 不在進場結束那一幀生成：等圖集載好、且已過幾個畫面（逾時照樣生成，圖集會邊載邊出現）
                this.elapsedMs += dtMs;
                this.waitFrames++;
                if ((this.waitFrames >= GAME_APP_PARAM.SPAWN_AFTER_IDLE_FRAMES && this.deps.isRosterReady())
                    || this.elapsedMs > GAME_APP_PARAM.SPAWN_ATLAS_WAIT_MAX_MS) {
                    this.spawnAndStart();
                }
                break;
            default:
                // 進行中、大廳：沒有要計時的事；上一場的結果到此作廢
                this.elapsedMs = 0;
                this.latched = null;
        }
        this.publish();
    }

    // ── 展示回合 ─────────────────────────────────────────────────────────────

    /** 立刻開一個展示回合（開機、玩家切進展示）：不走轉場，換圖、佈陣、開戰。 */
    private beginRound(firstRound: FirstRoundSetup): void {
        this.resetTimers();
        this.rand = createRandomStream(this.deps.nextSeed());
        this.dealMap();
        if (firstRound === 'ROLL') this.send({ type: 'SET_BATTLE_SETUP', setup: rollShowcaseSetup(this.rand) });
        this.roster = [];
        this.spawnAndStart();
    }

    /** 結算停留結束：清掉舊場、抽下一局的陣營設定並排好陣容（表現層此刻起預載圖集），開始退場。 */
    private enterTransitionOut(): void {
        this.send({ type: 'STOP_GAME' });
        this.send({ type: 'CLEAR_BOARD', keepScene: true, skipRebuild: true });
        this.rand = createRandomStream(this.deps.nextSeed());
        this.nextSetup = rollShowcaseSetup(this.rand);
        this.plan(this.nextSetup);
        this.engine.bus.emit('MATCH_ROSTER', { roster: this.roster });
        this.enter('TRANSITION_OUT');
    }

    /** 退場結束（畫面全黑）：換地圖、寫入下一局的陣營設定，再切成進場。 */
    private enterTransitionIn(): void {
        this.dealMap();
        if (this.nextSetup) this.send({ type: 'SET_BATTLE_SETUP', setup: this.nextSetup });
        this.nextSetup = null;
        this.enter('TRANSITION_IN');
    }

    /** 換一張展示地圖：清盤、抽大小與佈局、重新生成。地圖生成器與場景抽選讀模擬流，所以先重設它。 */
    private dealMap(): void {
        this.send({ type: 'STOP_GAME' });
        this.send({ type: 'CLEAR_BOARD', keepScene: true, skipRebuild: true });
        this.engine.seedSimulation(this.deps.nextSeed());
        const { w, h, layout } = rollShowcaseMap(this.rand);
        this.send({ type: 'RANDOMIZE_MAP', w, h, layout });
    }

    /** 把陣容放上場並開戰；預載清單清空。 */
    private spawnAndStart(): void {
        this.deal(this.rand);
        this.roster = [];
        this.engine.bus.emit('MATCH_ROSTER', { roster: [] });
        this.resetTimers();
        this.send({ type: 'START_GAME', seed: this.deps.nextSeed() });
    }

    // ── 佈陣（展示與手動共用）───────────────────────────────────────────────

    private plan(setup: BattleSetup): void {
        this.rosterRound++;
        this.plannedSetup = { ...setup };
        this.roster = planRoster(this.plannedSetup, this.rosterRound, this.lookSalt);
    }

    /** 依這張地圖的總池重新夾一次陣營設定；和排好的陣容不同就重排，然後放上場。 */
    private deal(rand: () => number): void {
        const engine = this.engine;
        this.send({ type: 'SET_BATTLE_SETUP', setup: { ...engine.battleSetup } });
        if (this.roster.length === 0
            || this.plannedSetup.factions !== engine.battleSetup.factions
            || this.plannedSetup.unitsPerFaction !== engine.battleSetup.unitsPerFaction) {
            this.plan(engine.battleSetup);
        }
        deployRoster(engine, this.roster, this.plannedSetup, rand);
        this.dealtSetup = { ...this.plannedSetup };
    }

    // ── 內部 ─────────────────────────────────────────────────────────────────

    private send(cmd: UICommand): void {
        this.engine.bus.emit('UI_COMMAND', cmd);
    }

    private enter(phase: TimedPhase): void {
        this.timed = phase;
        this.elapsedMs = 0;
        this.waitFrames = 0;
    }

    /** 離開計時階段（開戰、回到手動、換新戰場）：上一場的結果一起作廢。 */
    private resetTimers(): void {
        this.timed = null;
        this.elapsedMs = 0;
        this.waitFrames = 0;
        this.nextSetup = null;
        this.latched = null;
    }

    private announceShowcase(): void {
        if (this.announcedShowcase === this.showcase) return;
        this.announcedShowcase = this.showcase;
        this.send({ type: 'SET_SHOWCASE_MODE', enabled: this.showcase });
    }

    /** 階段變了就公布一次（UI 立刻刷新、畫面置中、清選取都聽它）。 */
    private publish(): void {
        const phase = this.phase;
        if (phase === this.lastPublished) return;
        this.lastPublished = phase;
        this.engine.bus.emit('MATCH_PHASE', { phase });
    }
}
