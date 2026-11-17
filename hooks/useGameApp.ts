/// <reference types="vite/client" />
import { UI_SETTINGS } from '../constants';
import { selectionStore, usePrimarySelectedId, useWatchSelectedId } from './useSelection';
import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Team, Skill, Role, HexLayout, BodyTypeId, BattleSetup } from '../types';
import { DesignExporter } from '../engine/presentation/DesignExporter';
import { GAME_APP_PARAM, DEFAULT_HEX_LAYOUT } from '../constants';
// 佈陣流：開戰前的抽號都用它，不碰模擬流（結果記在開戰快照裡，契約 S2）
import { setupRandom, setupSeed } from '../engine/math/rng';
import { rollShowcaseSetup } from '../engine/systems/ui/editorQueries';
import { planRoster, deployRoster, rollShowcaseMap, type RosterSlot } from '../engine/systems/match/Deployment';
import { spriteAtlasStore } from '../engine/renderers/units/SpriteAtlasStore';
import { BUILD_ID, exportReplay, startReplay, takeOver } from '../engine/core/Replay';
import { downloadReplay, fetchPublicReplay, pickReplayFile, readReplayFile, replayQuery, type LoadedReplay } from '../engine/presentation/ReplayIO';

type ShowcaseSlot = RosterSlot;

type DevWindow = Window & {
    __TACTICAL_ENGINE__?: GameEngine;
};

export const useGameApp = () => {
    // [ARCH] Use a lazy initializer for the ref to avoid 'new GameEngine()' on every render
    const [initialEngine] = useState(() => {
        const eng = new GameEngine();
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
    
    const [session, setSession] = useState({
        isPlaying: false,
        winner: null as Team | null,
        winnerId: null as string | null,
        winnerSide: null as number | null,
        /** 目前場上這一局的陣營設定（生成時記下；面板改了但還沒開新局時，結算仍照這個） */
        battleSetup: { ...initialEngine.battleSetup } as BattleSetup,
        // ?replay=<檔> 開機直接播回放檔（效能基準場景），不進展示模式
        isShowcaseMode: replayQuery() === null,
        transitionPhase: 'IDLE' as 'IDLE' | 'IN' | 'OUT',
        unitCount: 0
    });

    const [editor, setEditor] = useState({
        tool: ToolType.SELECT,
        selectedObstacle: 'WALL',
        hpInput: GAME_APP_PARAM.DEFAULT_HP,
        spawnMode: 'RANDOM' as 'RANDOM' | 'DRAFT',
        draftRole: Role.WARRIOR,
        draftBodyType: undefined as BodyTypeId | undefined,
        hexLayout: DEFAULT_HEX_LAYOUT,
        mapW: GAME_APP_PARAM.DEFAULT_MAP_W,
        mapH: GAME_APP_PARAM.DEFAULT_MAP_H,
        currentSceneId: 'VOID'
    });

    const [hud, setHud] = useState({
        hoveredSkill: null as Skill | null,
        showFactionWarning: false,
        showDirectorMonitor: false 
    });

    // 下一批展示單位的陣容（planShowcaseRoster 決定，internalSpawnTeams 依它生成）與換場時的生成等待 rAF
    const rosterRef = useRef<ShowcaseSlot[]>([]);
    const rosterRoundRef = useRef(0);
    // 外觀分配的鹽：每次開頁取一次（佈陣流），之後用局數區分
    const lookSaltRef = useRef(setupSeed());
    const plannedSetupRef = useRef<BattleSetup>({ ...initialEngine.battleSetup });
    // 玩家自己的陣營設定：展示模式每局隨機會蓋掉 engine.battleSetup，回到手動時要還原
    const manualSetupRef = useRef<BattleSetup>({ ...initialEngine.battleSetup });
    const showcaseModeRef = useRef(true);
    const spawnWaitRef = useRef<number | null>(null);

    /**
     * 決定下一批展示單位的角色與體型。體型用確定性雜湊（pickBodyType，不消耗 random()），
     * 生成指令帶上它，所以 SpriteAtlasStore 能在單位出現之前就預載對應圖集。
     */
    const planShowcaseRoster = useCallback((nextSetup?: BattleSetup): ShowcaseSlot[] => {
        const round = ++rosterRoundRef.current;
        const setup = { ...(nextSetup ?? engineRef.current.battleSetup) };
        const plan = planRoster(setup, round, lookSaltRef.current);
        rosterRef.current = plan;
        plannedSetupRef.current = setup;
        return plan;
    }, []);

    const internalSpawnTeams = useCallback(() => {
        const engine = engineRef.current;
        // 依這張地圖的總池重新夾一次陣營設定；和規劃好的陣容不同就重新規劃
        engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: { ...engine.battleSetup } });
        const planned = plannedSetupRef.current;
        if (rosterRef.current.length === 0
            || planned.factions !== engine.battleSetup.factions
            || planned.unitsPerFaction !== engine.battleSetup.unitsPerFaction) {
            planShowcaseRoster();
        }
        const setup = plannedSetupRef.current;
        deployRoster(engine, rosterRef.current, setup, setupRandom);

        setSession(prev => ({ ...prev, unitCount: engine.agents.length, battleSetup: { ...setup } }));
    }, [planShowcaseRoster]);

    const setupShowcaseMap = useCallback(() => {
        const engine = engineRef.current;
        engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true, skipRebuild: true });
        selectionStore.clear();
        const { w: newW, h: newH, layout: newLayout } = rollShowcaseMap(setupRandom);
        engine.bus.emit('UI_COMMAND', {
            type: 'RANDOMIZE_MAP',
            w: newW,
            h: newH,
            layout: newLayout,
        });
        setEditor(prev => ({ ...prev, mapW: newW, mapH: newH, hexLayout: newLayout, currentSceneId: engine.currentScene.id }));
    }, []);

    useEffect(() => {
        const engine = engineRef.current;
        const handleGameOver = (data: { winner: Team | null; winnerId?: string }) => {
            const winnerSide = engine.agents.find(a => a.id === data.winnerId)?.side ?? null;
            setSession(prev => ({ ...prev, winner: data.winner, winnerId: data.winnerId ?? null, winnerSide, isPlaying: false }));
            if (engine.isRunning) {
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
            }
        };
        engine.bus.on('GAME_OVER', handleGameOver);
        return () => engine.bus.off('GAME_OVER', handleGameOver);
    }, []);

    useEffect(() => {
        // 只在「從手動切進展示」那一刻記下玩家設定。StrictMode 會重跑 effect，不比對就會把隨機值存進來。
        if (session.isShowcaseMode && !showcaseModeRef.current) manualSetupRef.current = { ...engineRef.current.battleSetup };
        showcaseModeRef.current = session.isShowcaseMode;
    }, [session.isShowcaseMode]);

    // 遊戲玩法面板「套用並重新開局」：換新地圖、依新陣營設定生成；展示模式直接開打，手動模式等玩家按開始
    useEffect(() => {
        const engine = engineRef.current;
        const handleApply = () => {
            // 玩家明確按了套用：這是他要的設定（展示模式只影響這一局，下一局回到隨機）
            manualSetupRef.current = { ...engine.battleSetup };
            rosterRef.current = [];
            engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
            engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: false });
            internalSpawnTeams();
            rosterRef.current = [];
            const autoStart = showcaseModeRef.current;
            if (autoStart) engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
            setSession(p => ({ ...p, winner: null, winnerId: null, winnerSide: null, isPlaying: autoStart }));
            engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
            setEditor(p => ({ ...p, mapW: engine.mapConfig.w, mapH: engine.mapConfig.h, currentSceneId: engine.currentScene.id }));
        };
        engine.bus.on('BATTLE_SETUP_APPLY', handleApply);
        return () => engine.bus.off('BATTLE_SETUP_APPLY', handleApply);
    }, [internalSpawnTeams]);

    const spawnShowcaseUnits = useCallback(() => {
        internalSpawnTeams();
        rosterRef.current = [];
        spriteAtlasStore.prefetchRoster([]);
        engineRef.current.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        setSession(prev => ({ ...prev, isPlaying: true, winner: null, winnerId: null }));
    }, [internalSpawnTeams]);

    useEffect(() => {
        if (session.isShowcaseMode && session.winner !== null) {
            const timer = setTimeout(() => {
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true, skipRebuild: true });
                // 陣營設定等換完地圖才寫入：現在的地圖是上一局縮圈後的殘圖，總池很小，會被夾低
                const nextSetup = rollShowcaseSetup(setupRandom);
                // 舊陣容已清空：此刻起預載下一批圖集（退場＋進場約 2.7 秒內載完，單位生成時不用再解碼）
                spriteAtlasStore.prefetchRoster(planShowcaseRoster(nextSetup));
                setSession(prev => ({ ...prev, transitionPhase: 'OUT' }));
                setTimeout(() => {
                    setupShowcaseMap();
                    engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: nextSetup });
                    setSession(prev => ({ ...prev, transitionPhase: 'IN' }));
                    setTimeout(() => {
                        setSession(prev => ({ ...prev, transitionPhase: 'IDLE' }));
                        // 不在 IDLE 邊界那一幀生成：等圖集載好、且已過幾個畫面（逾時照樣生成）
                        const waitStart = performance.now();
                        let frames = 0;
                        const waitThenSpawn = () => {
                            frames++;
                            const ready = spriteAtlasStore.isPrefetchReady();
                            if ((frames >= GAME_APP_PARAM.SPAWN_AFTER_IDLE_FRAMES && ready)
                                || performance.now() - waitStart > GAME_APP_PARAM.SPAWN_ATLAS_WAIT_MAX_MS) {
                                spawnWaitRef.current = null;
                                spawnShowcaseUnits();
                            } else {
                                spawnWaitRef.current = requestAnimationFrame(waitThenSpawn);
                            }
                        };
                        spawnWaitRef.current = requestAnimationFrame(waitThenSpawn);
                    }, GAME_APP_PARAM.TRANSITION_IN_MS);
                }, GAME_APP_PARAM.TRANSITION_OUT_MS);
            }, GAME_APP_PARAM.RESULT_HOLD_MS);
            return () => {
                clearTimeout(timer);
                if (spawnWaitRef.current !== null) { cancelAnimationFrame(spawnWaitRef.current); spawnWaitRef.current = null; }
            };
        }
    }, [session.winner, session.isShowcaseMode, setupShowcaseMap, spawnShowcaseUnits, planShowcaseRoster]);

    /** 換掉整場的操作（重開、換圖、切模式）先結束回放：回放進行中遊戲指令會被擋 */
    const leaveReplay = useCallback(() => {
        const engine = engineRef.current;
        const playing = engine.commands.replay;
        if (playing) takeOver(engine, playing);
    }, []);

    /** 播一份回放檔（契約 S3）：離開展示模式、從它的開戰快照開始。版本不同只警告，照樣播 */
    const playReplay = useCallback((loaded: LoadedReplay) => {
        const engine = engineRef.current;
        if (loaded.versionMismatch) {
            console.warn(`回放檔由 ${loaded.file.build} 產生，現在是 ${BUILD_ID}：模擬可能改過，結果不一定和當時相同`);
        }
        // 先關展示旗標（回放開始後展示流程送的清盤、佈陣都會被擋）
        engine.bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: false });
        selectionStore.clear();
        startReplay(engine, loaded.file);
        setSession(prev => ({ ...prev, isShowcaseMode: false, isPlaying: true, winner: null, winnerId: null, winnerSide: null, transitionPhase: 'IDLE', battleSetup: { ...engine.battleSetup }, unitCount: engine.agents.length }));
        setEditor(prev => ({ ...prev, mapW: engine.mapConfig.w, mapH: engine.mapConfig.h, hexLayout: engine.mapConfig.layout, currentSceneId: engine.currentScene.id }));
    }, []);

    useEffect(() => { 
        const replayName = replayQuery();
        if (replayName !== null) {
            fetchPublicReplay(replayName).then(playReplay).catch((err: unknown) => console.error(err));
            return;
        }
        if (session.isShowcaseMode) {
            setupShowcaseMap(); 
            engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: rollShowcaseSetup(setupRandom) });
            spawnShowcaseUnits();
        }
    }, []);

    useEffect(() => {
        engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: session.isShowcaseMode });
    }, [session.isShowcaseMode]);

    useEffect(() => {
        const interval = setInterval(() => setSession(prev => ({ ...prev, unitCount: engineRef.current.agents.length })), GAME_APP_PARAM.UNIT_POLL_MS);
        return () => clearInterval(interval);
    }, []);


    // 點選的單位同步給引擎：導播關閉時擊殺播報只給它的陣營
    const selectedAgentId = usePrimarySelectedId();
    const watchSelectedAgentId = useWatchSelectedId();
    useEffect(() => {
        engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: watchSelectedAgentId });
    }, [watchSelectedAgentId]);

    const enterManualMode = () => {
        leaveReplay();
        const engine = engineRef.current;
        engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
        engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: { ...manualSetupRef.current } });
        setSession(prev => ({ ...prev, isShowcaseMode: false, isPlaying: false, winner: null, unitCount: 0 }));
        setEditor(prev => ({ 
            ...prev, 
            mapW: engine.mapConfig.w, 
            mapH: engine.mapConfig.h, 
            hexLayout: engine.mapConfig.layout, 
            currentSceneId: engine.currentScene.id 
        }));
    };

    return {
        engineRef,
        state: { 
            isShowcaseMode: session.isShowcaseMode, isPlaying: session.isPlaying, unitCount: session.unitCount, winner: session.winner, winnerId: session.winnerId, winnerSide: session.winnerSide, battleSetup: session.battleSetup, transitionPhase: session.transitionPhase,
            tool: editor.tool, selectedObstacle: editor.selectedObstacle, hpInput: editor.hpInput, mapW: editor.mapW, mapH: editor.mapH, currentSceneId: editor.currentSceneId, spawnMode: editor.spawnMode, draftRole: editor.draftRole, draftBodyType: editor.draftBodyType, hexLayout: editor.hexLayout,
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
            setIsShowcaseMode: (isShowcaseMode: boolean) => setSession(p => ({...p, isShowcaseMode})),
            setHoveredSkill: (hoveredSkill: Skill | null) => setHud(p => ({...p, hoveredSkill})),
            setShowDirectorMonitor: (v: boolean) => setHud(p => ({...p, showDirectorMonitor: v}))
        },
        actions: {
            enterManualMode,
            handleUpdateMapSize: (w: number, h: number) => {
                setEditor(p => ({...p, mapW: w, mapH: h}));
                engineRef.current.bus.emit('UI_COMMAND', {
                    type: 'RANDOMIZE_MAP',
                    w,
                    h,
                    randomizeScene: false,
                });
                engineRef.current.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
            },
            handleUpdateLayout: (l: HexLayout) => {
                setEditor(p => ({...p, hexLayout: l}));
                engineRef.current.bus.emit('UI_COMMAND', {
                    type: 'RANDOMIZE_MAP',
                    layout: l,
                    randomizeScene: false,
                });
                engineRef.current.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
            },
            handleSetScene: (id: string) => {
                engineRef.current.bus.emit('UI_COMMAND', {
                    type: 'RANDOMIZE_MAP',
                    sceneId: id,
                    randomizeScene: false,
                });
                setEditor(p => ({...p, currentSceneId: id}));
            },
            handleRandomBattlefield: () => { 
                leaveReplay();
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: false });
                rosterRef.current = [];
                internalSpawnTeams();
                setSession(p => ({...p, winner: null, winnerId: null, isPlaying: false}));
                engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
                setEditor(p => ({...p, mapW: engine.mapConfig.w, mapH: engine.mapConfig.h, currentSceneId: engine.currentScene.id})); 
            },
            handleReset: () => {
                leaveReplay();
                engineRef.current.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
                setSession(p => ({...p, isPlaying: false, winner: null, winnerId: null}));
                engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
            },
            togglePlay: () => { 
                if(session.winner) return;
                const engine = engineRef.current;
                if(session.isPlaying) {
                    engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                    setSession(p => ({...p, isPlaying: false}));
                } else {
                    if(engine.agents.some(a => a.team === Team.BLUE) && engine.agents.some(a => a.team === Team.RED)) {
                        engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
                        setSession(p => ({...p, isPlaying: true}));
                    } else {
                        setHud(p => ({...p, showFactionWarning: true}));
                        setTimeout(() => setHud(p => ({...p, showFactionWarning: false})), GAME_APP_PARAM.WARNING_MS);
                    }
                }
            },
            handleNextLevel: () => { 
                leaveReplay();
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: false });
                rosterRef.current = [];
                internalSpawnTeams(); 
                setSession(p => ({...p, isPlaying: false, winner: null, winnerId: null}));
                engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
            },
            rematch: () => {
                leaveReplay();
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
                setSession(p => ({...p, isPlaying: true, winner: null, winnerId: null}));
                engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: UI_SETTINGS.TIME_SCALE.default });
            },
            startShowcaseMatch: () => { leaveReplay(); setupShowcaseMap(); spawnShowcaseUnits(); },
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
            rewindToStart: () => {
                const engine = engineRef.current;
                const playing = engine.commands.replay;
                const file = playing?.active ? playing.file : (engine.commands.matchStart ? exportReplay(engine) : null);
                if (!file) return;
                startReplay(engine, file);
                setSession(p => ({ ...p, isPlaying: true, winner: null, winnerId: null, winnerSide: null }));
            },
            downloadSpec: DesignExporter.downloadAll,
            handleSelectAgent: (a: Agent | null) => selectionStore.set(a ? [a.id] : [])
        }
    };
};
