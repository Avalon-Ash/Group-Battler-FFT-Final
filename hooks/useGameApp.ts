/// <reference types="vite/client" />
// ╔══════════════════════════════════════════════════════════╗
// ║  useGameApp — 組裝層：建立引擎與對局流程、把 UI 操作翻成   ║
// ║  指令、保管編輯器的 UI 狀態。                              ║
// ║  [ARCH] 對局狀態（階段、是否進行中、勝方、單位數、戰場大小）║
// ║  不存在這裡：一律用 selector 從引擎讀（selectSessionView、  ║
// ║  selectBoardView）。一局接一局的流程在                      ║
// ║  engine/systems/match/MatchFlowSystem.ts（契約 R2），這裡   ║
// ║  只注入「圖集載好了嗎」與種子來源，並轉接它公布的事件       ║
// ║  （預載圖集、清選取、刷新 UI）。                            ║
// ╚══════════════════════════════════════════════════════════╝
import { GAME_APP_PARAM, UI_SETTINGS } from '../constants';
import { selectionStore, usePrimarySelectedId, useWatchSelectedId } from './useSelection';
import { useEngineView, refreshEngineViews } from './useEngineView';
import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Team, Skill, Role, HexLayout, BodyTypeId, EventMap } from '../types';
// 佈陣流：種子都從它取，不碰模擬流（結果記在開戰快照裡，契約 S2）
import { setupSeed } from '../engine/math/rng';
import { MatchFlowSystem } from '../engine/systems/match/MatchFlowSystem';
import { selectSessionView, selectBoardView, appModeOf } from '../engine/systems/ui/views/session';
import { spriteAtlasStore } from '../engine/renderers/units/SpriteAtlasStore';
import { BUILD_ID, exportReplay, startReplay, takeOver } from '../engine/core/Replay';
import { downloadReplay, fetchPublicReplay, pickReplayFile, readReplayFile, replayQuery, type LoadedReplay } from '../engine/presentation/ReplayIO';

type DevWindow = Window & {
    __TACTICAL_ENGINE__?: GameEngine;
};

export const useGameApp = () => {
    // [ARCH] Use a lazy initializer for the ref to avoid 'new GameEngine()' on every render
    const [initialEngine] = useState(() => {
        const eng = new GameEngine();
        // 對局流程建構時自己掛到 eng.matchFlow。等圖集是表現層的事，由這裡注入
        const flow = new MatchFlowSystem(eng, { isRosterReady: () => spriteAtlasStore.isPrefetchReady(), nextSeed: setupSeed });
        // ?replay=<檔> 開機直接播回放檔（效能基準場景），不進展示模式；否則第一個畫面就照展示模式畫
        if (replayQuery() === null) flow.primeShowcase();
        if (import.meta.env.DEV && typeof window !== 'undefined') {
            (window as DevWindow).__TACTICAL_ENGINE__ = eng;
        }
        return eng;
    });
    const engineRef = useRef<GameEngine>(initialEngine);
    // StrictMode（以及 Fast Refresh）會執行「掛載 → 清理 → 重新掛載」並重用同一個 engineRef。
    // 若清理階段立刻 destroy()，重新掛載後引擎已停止且指令系統已解除，整個畫面會凍結。
    // 因此銷毀延後一個 tick 執行；若期間發生重新掛載則取消，只有真正卸載時才銷毀。
    const pendingDestroyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const currentEngine = engineRef.current;
        if (pendingDestroyRef.current !== null) {
            clearTimeout(pendingDestroyRef.current);
            pendingDestroyRef.current = null;
        }
        if (import.meta.env.DEV && typeof window !== 'undefined') {
            const devWindow = window as DevWindow;
            devWindow.__TACTICAL_ENGINE__ = currentEngine;
        }
        return () => {
            pendingDestroyRef.current = setTimeout(() => {
                pendingDestroyRef.current = null;
                currentEngine.destroy();
                if (import.meta.env.DEV && typeof window !== 'undefined') {
                    const devWindow = window as DevWindow;
                    if (devWindow.__TACTICAL_ENGINE__ === currentEngine) {
                        delete devWindow.__TACTICAL_ENGINE__;
                    }
                }
            }, 0);
        };
    }, []);

    // 對局狀態與戰場設定：從引擎讀（內容沒變時 selector 回傳同一個物件，不重繪）
    const session = useEngineView(initialEngine, selectSessionView) ?? selectSessionView(initialEngine);
    const board = useEngineView(initialEngine, selectBoardView) ?? selectBoardView(initialEngine);

    const [editor, setEditor] = useState({
        tool: ToolType.SELECT,
        selectedObstacle: 'WALL',
        hpInput: GAME_APP_PARAM.DEFAULT_HP,
        spawnMode: 'RANDOM' as 'RANDOM' | 'DRAFT',
        draftRole: Role.WARRIOR,
        draftBodyType: undefined as BodyTypeId | undefined,
    });

    const [hud, setHud] = useState({
        hoveredSkill: null as Skill | null,
        showFactionWarning: false,
        showDirectorMonitor: false
    });

    /** 送一串指令，送完立刻刷新 UI（不等輪詢），按鈕狀態才不會慢一拍 */
    const act = useCallback((fn: (engine: GameEngine) => void) => {
        fn(engineRef.current);
        refreshEngineViews();
    }, []);

    // 轉接對局流程公布的事件
    useEffect(() => {
        const engine = engineRef.current;
        const onPhase = (data: EventMap['MATCH_PHASE']) => {
            // 換圖（進場開始）時清選取：舊的選取 id 可能對到下一局的新單位
            if (data.phase === 'TRANSITION_IN') selectionStore.clear();
            refreshEngineViews();
        };
        // 下一批陣容：此刻起預載圖集（退場＋進場約 2.7 秒內載完，單位生成時不用再解碼）
        const onRoster = (data: EventMap['MATCH_ROSTER']) => spriteAtlasStore.prefetchRoster(data.roster);
        // 玩法面板「套用並重新開局」
        const onApply = () => {
            engine.matchFlow?.applyBattleSetup();
            refreshEngineViews();
        };
        engine.bus.on('MATCH_PHASE', onPhase);
        engine.bus.on('MATCH_ROSTER', onRoster);
        engine.bus.on('BATTLE_SETUP_APPLY', onApply);
        return () => {
            engine.bus.off('MATCH_PHASE', onPhase);
            engine.bus.off('MATCH_ROSTER', onRoster);
            engine.bus.off('BATTLE_SETUP_APPLY', onApply);
        };
    }, []);

    /** 換掉整場的操作（重開、換圖、切模式）先結束回放：回放進行中遊戲指令會被擋 */
    const leaveReplay = useCallback(() => {
        const engine = engineRef.current;
        const playing = engine.commands.replay;
        if (playing) takeOver(engine, playing);
    }, []);

    /** 播一份回放檔（契約 S3）：離開展示模式、從它的開戰快照開始。版本不同只警告，照樣播 */
    const playReplay = useCallback((loaded: LoadedReplay) => {
        if (loaded.versionMismatch) {
            console.warn(`回放檔由 ${loaded.file.build} 產生，現在是 ${BUILD_ID}：模擬可能改過，結果不一定和當時相同`);
        }
        act((engine) => {
            // 先離開展示模式（回放開始後展示流程送的清盤、佈陣都會被擋）
            engine.matchFlow?.setShowcase(false);
            selectionStore.clear();
            startReplay(engine, loaded.file);
        });
    }, [act]);

    // 開機：?replay= 播回放檔；否則開第一個展示回合
    useEffect(() => {
        const replayName = replayQuery();
        if (replayName !== null) {
            fetchPublicReplay(replayName).then(playReplay).catch((err: unknown) => console.error(err));
            return;
        }
        act((engine) => engine.matchFlow?.setShowcase(true));
    }, []);

    // 點選的單位同步給引擎：導播關閉時擊殺播報只給它的陣營
    const selectedAgentId = usePrimarySelectedId();
    const watchSelectedAgentId = useWatchSelectedId();
    useEffect(() => {
        engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: watchSelectedAgentId });
    }, [watchSelectedAgentId]);

    /** 換一張新戰場並照目前的陣營設定發陣容（骰子、下一關共用），不開戰 */
    const newBattlefield = () => {
        leaveReplay();
        act((engine) => engine.matchFlow?.newBattlefield());
    };

    return {
        engineRef,
        state: {
            appMode: appModeOf(session), isShowcaseMode: session.isShowcase, isPlaying: session.isPlaying, unitCount: session.unitCount, winner: session.winner, winnerId: session.winnerId, winnerSide: session.winnerSide, battleSetup: session.battleSetup,
            tool: editor.tool, selectedObstacle: editor.selectedObstacle, hpInput: editor.hpInput, mapW: board.mapW, mapH: board.mapH, currentSceneId: board.sceneId, spawnMode: editor.spawnMode, draftRole: editor.draftRole, draftBodyType: editor.draftBodyType, hexLayout: board.hexLayout,
            selectedAgent: selectedAgentId ? (engineRef.current.agents.find((a) => a.id === selectedAgentId) ?? null) : null, hoveredSkill: hud.hoveredSkill, showFactionWarning: hud.showFactionWarning,
            showDirectorMonitor: hud.showDirectorMonitor,
            logs: engineRef.current.logs
        },
        setters: {
            setTool: (tool: ToolType) => setEditor(p => ({...p, tool})),
            setSelectedObstacle: (selectedObstacle: string) => setEditor(p => ({...p, selectedObstacle})),
            setHpInput: (hpInput: number) => setEditor(p => ({...p, hpInput})),
            setSpawnMode: (spawnMode: 'RANDOM' | 'DRAFT') => setEditor(p => ({...p, spawnMode})),
            setDraftRole: (draftRole: Role) => setEditor(p => ({...p, draftRole})),
            setDraftBodyType: (draftBodyType?: BodyTypeId) => setEditor(p => ({...p, draftBodyType})),
            setHoveredSkill: (hoveredSkill: Skill | null) => setHud(p => ({...p, hoveredSkill})),
            setShowDirectorMonitor: (v: boolean) => setHud(p => ({...p, showDirectorMonitor: v}))
        },
        actions: {
            /** 回到手動：停下、清盤、還原玩家自己的陣營設定 */
            enterManualMode: () => {
                leaveReplay();
                act((engine) => engine.matchFlow?.setShowcase(false));
            },
            /** 從手動切進展示：沿用玩家目前的陣營設定開第一局，之後每局隨機 */
            startShowcase: () => {
                leaveReplay();
                selectionStore.clear();
                act((engine) => engine.matchFlow?.setShowcase(true, 'KEEP_SETUP'));
            },
            handleUpdateMapSize: (w: number, h: number) => act((engine) => {
                engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w, h, randomizeScene: false });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
            }),
            handleUpdateLayout: (l: HexLayout) => act((engine) => {
                engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', layout: l, randomizeScene: false });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
            }),
            handleSetScene: (id: string) => act((engine) => {
                engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', sceneId: id, randomizeScene: false });
            }),
            handleRandomBattlefield: newBattlefield,
            handleNextLevel: newBattlefield,
            handleReset: () => {
                leaveReplay();
                act((engine) => {
                    engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
                    engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
                });
            },
            togglePlay: () => act((engine) => {
                const now = selectSessionView(engine);
                // 已經分出勝負（含平手）：要重開或換下一關，不能直接繼續
                if (now.phase === 'RESULT_HOLD') return;
                if (now.isPlaying) {
                    engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                } else if (engine.agents.some(a => a.team === Team.BLUE) && engine.agents.some(a => a.team === Team.RED)) {
                    engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
                } else {
                    setHud(p => ({...p, showFactionWarning: true}));
                    setTimeout(() => setHud(p => ({...p, showFactionWarning: false})), GAME_APP_PARAM.WARNING_MS);
                }
            }),
            rematch: () => {
                leaveReplay();
                act((engine) => {
                    engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
                    engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
                    engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
                });
            },
            /** 存回放（結算畫面）：正在播回放就存那一份（整場），否則存這一場到目前為止 */
            saveReplay: () => {
                const engine = engineRef.current;
                const playing = engine.commands.replay;
                if (playing?.active) downloadReplay(playing.file);
                else if (engine.commands.matchStart) downloadReplay(exportReplay(engine));
            },
            loadReplay: () => pickReplayFile((blob) => {
                readReplayFile(blob).then(playReplay).catch((err: unknown) => console.error(err));
            }),
            /** 回放這一場（結算畫面）：從開戰快照重播（含戰中指令）；正在播回放就從那一份的開頭 */
            rewindToStart: () => act((engine) => {
                const playing = engine.commands.replay;
                const file = playing?.active ? playing.file : (engine.commands.matchStart ? exportReplay(engine) : null);
                if (file) startReplay(engine, file);
            }),
            /** 白皮書原文與常數表只在按下載時才載入（U2），不進進入點 */
            downloadSpec: () => {
                import('../engine/presentation/DesignExporter')
                    .then((m) => m.DesignExporter.downloadAll())
                    .catch((err: unknown) => console.error(err));
            },
            handleSelectAgent: (a: Agent | null) => selectionStore.set(a ? [a.id] : [])
        }
    };
};
