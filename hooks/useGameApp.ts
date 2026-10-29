/// <reference types="vite/client" />
import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Team, Skill, Role, HexLayout, BodyTypeId } from '../types';
import { DesignExporter } from '../engine/presentation/DesignExporter';
import { GAME_APP_PARAM, DEFAULT_HEX_LAYOUT } from '../constants';
import { HexUtils } from '../engine/utils';
import { random } from '../engine/math/rng';
import { queryMapKeys, queryHasObstacle } from '../engine/systems/ui/editorQueries';
import { pickBodyType } from '../data/units/appearance/bodyTypes';
import { spriteAtlasStore } from '../engine/renderers/units/SpriteAtlasStore';

/** 展示陣容的一個位置：角色與體型在生成前就決定，圖集才能在轉場期間預載 */
interface ShowcaseSlot { team: Team; role: Role; bodyType: BodyTypeId }
const SHOWCASE_ROLES: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

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
        timeScale: 1.0,
        isShowcaseMode: true, 
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
        selectedAgent: null as Agent | null,
        hoveredSkill: null as Skill | null,
        showFactionWarning: false,
        showDirectorMonitor: false 
    });

    // 下一批展示單位的陣容（planShowcaseRoster 決定，internalSpawnTeams 依它生成）與換場時的生成等待 rAF
    const rosterRef = useRef<ShowcaseSlot[]>([]);
    const rosterRoundRef = useRef(0);
    const spawnWaitRef = useRef<number | null>(null);

    /**
     * 決定下一批展示單位的角色與體型。體型用確定性雜湊（pickBodyType，不消耗 random()），
     * 生成指令帶上它，所以 SpriteAtlasStore 能在單位出現之前就預載對應圖集。
     */
    const planShowcaseRoster = useCallback((): ShowcaseSlot[] => {
        const round = ++rosterRoundRef.current;
        const plan: ShowcaseSlot[] = [];
        for (const team of [Team.BLUE, Team.RED]) {
            for (let i = 0; i < GAME_APP_PARAM.TEAM_SIZE; i++) {
                plan.push({ team, role: SHOWCASE_ROLES[i % SHOWCASE_ROLES.length], bodyType: pickBodyType(`SHOWCASE-${team}-${i}`, round) });
            }
        }
        rosterRef.current = plan;
        return plan;
    }, []);

    const internalSpawnTeams = useCallback(() => {
        const engine = engineRef.current;
        const radius = Math.floor(Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2) + 1;
        
        // Find valid spawnable hexes (not blocked, not extreme edge)
        let validHexes = queryMapKeys(engine).map((k: string) => {
            const [q, r] = k.split(',').map(Number);
            return {q, r};
        }).filter(hex => {
            if (queryHasObstacle(engine, hex.q, hex.r)) return false;
            // Don't spawn on the extreme outer edge
            const dist = HexUtils.dist({q:0, r:0}, hex);
            return dist < radius;
        });
        
        // Since it's a giant hexagon centered at (0,0), it's symmetric.
        // We can split the teams perfectly by `q` (left/right) or another dividing plane.
        // For axial (q, r), q < 0 is roughly left, q > 0 is roughly right.
        let leftHexes = validHexes.filter(hex => hex.q < -1);
        let rightHexes = validHexes.filter(hex => hex.q > 1);

        // Shuffle arrays
        const shuffle = <T,>(array: T[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        };
        shuffle(leftHexes);
        shuffle(rightHexes);

        if (rosterRef.current.length === 0) planShowcaseRoster();
        
        const spawn = (team: Team, hexes: {q: number, r: number}[]) => {
            const slots = rosterRef.current.filter(s => s.team === team);
            let spawnIdx = 0;
            for(let i=0; i<GAME_APP_PARAM.TEAM_SIZE; i++) {
                if (spawnIdx >= hexes.length) break;
                const hex = hexes[spawnIdx++];
                engine.bus.emit('UI_COMMAND', {
                    type: 'PLACE_AGENT',
                    team,
                    q: hex.q,
                    r: hex.r,
                    hp: GAME_APP_PARAM.SPAWN_HP_MIN + random() * GAME_APP_PARAM.SPAWN_HP_RANGE,
                    role: slots[i].role,
                    bodyType: slots[i].bodyType,
                });
            }
        };

        spawn(Team.BLUE, leftHexes); 
        spawn(Team.RED, rightHexes);
        setSession(prev => ({ ...prev, unitCount: engine.agents.length }));
    }, [planShowcaseRoster]);

    const setupShowcaseMap = useCallback(() => {
        const engine = engineRef.current;
        engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true, skipRebuild: true });
        setHud(prev => ({ ...prev, selectedAgent: null }));
        const newW = Math.floor(GAME_APP_PARAM.SHOWCASE_MIN_W + random() * GAME_APP_PARAM.SHOWCASE_SIZE_RANGE);
        const newH = Math.floor(GAME_APP_PARAM.SHOWCASE_MIN_H + random() * GAME_APP_PARAM.SHOWCASE_SIZE_RANGE);
        const newLayout: HexLayout = random() > 0.5 ? 'FLAT' : 'POINTY';
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
        const handleGameOver = (data: { winner: Team }) => {
            setSession(prev => ({ ...prev, winner: data.winner, isPlaying: false }));
            if (engine.isRunning) {
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
            }
        };
        engine.bus.on('GAME_OVER', handleGameOver);
        return () => engine.bus.off('GAME_OVER', handleGameOver);
    }, []);

    const spawnShowcaseUnits = useCallback(() => {
        internalSpawnTeams();
        rosterRef.current = [];
        spriteAtlasStore.prefetchRoster([]);
        engineRef.current.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        setSession(prev => ({ ...prev, isPlaying: true, winner: null }));
    }, [internalSpawnTeams]);

    useEffect(() => {
        if (session.isShowcaseMode && session.winner !== null) {
            const timer = setTimeout(() => {
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true, skipRebuild: true });
                // 舊陣容已清空：此刻起預載下一批圖集（退場＋進場約 2.7 秒內載完，單位生成時不用再解碼）
                spriteAtlasStore.prefetchRoster(planShowcaseRoster());
                setSession(prev => ({ ...prev, transitionPhase: 'OUT' }));
                setTimeout(() => {
                    setupShowcaseMap(); 
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

    useEffect(() => { 
        if (session.isShowcaseMode) {
            setupShowcaseMap(); 
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

    useEffect(() => { 
        engineRef.current.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: session.timeScale });
    }, [session.timeScale]);

    const enterManualMode = () => {
        const engine = engineRef.current;
        engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
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
            isShowcaseMode: session.isShowcaseMode, isPlaying: session.isPlaying, unitCount: session.unitCount, winner: session.winner, timeScale: session.timeScale, transitionPhase: session.transitionPhase,
            tool: editor.tool, selectedObstacle: editor.selectedObstacle, hpInput: editor.hpInput, mapW: editor.mapW, mapH: editor.mapH, currentSceneId: editor.currentSceneId, spawnMode: editor.spawnMode, draftRole: editor.draftRole, draftBodyType: editor.draftBodyType, hexLayout: editor.hexLayout,
            selectedAgent: hud.selectedAgent, hoveredSkill: hud.hoveredSkill, showFactionWarning: hud.showFactionWarning,
            showDirectorMonitor: hud.showDirectorMonitor,
            logs: engineRef.current.logs
        },
        setters: {
            setTool: (tool: ToolType) => setEditor(p => ({...p, tool})),
            setSelectedObstacle: (selectedObstacle: string) => setEditor(p => ({...p, selectedObstacle})),
            setHpInput: (hpInput: number) => setEditor(p => ({...p, hpInput})),
            setTimeScale: (timeScale: number) => setSession(p => ({...p, timeScale})),
            setSpawnMode: (spawnMode: 'RANDOM' | 'DRAFT') => setEditor(p => ({...p, spawnMode})),
            setDraftRole: (draftRole: Role) => setEditor(p => ({...p, draftRole})),
            setDraftBodyType: (draftBodyType?: BodyTypeId) => setEditor(p => ({...p, draftBodyType})),
            setIsShowcaseMode: (isShowcaseMode: boolean) => setSession(p => ({...p, isShowcaseMode})),
            setSelectedAgent: (selectedAgent: Agent | null) => setHud(p => ({...p, selectedAgent})),
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
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: false });
                internalSpawnTeams();
                setSession(p => ({...p, winner: null, isPlaying: false, timeScale: 1.0})); 
                setEditor(p => ({...p, mapW: engine.mapConfig.w, mapH: engine.mapConfig.h, currentSceneId: engine.currentScene.id})); 
            },
            handleReset: () => {
                engineRef.current.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
                setSession(p => ({...p, isPlaying: false, winner: null, timeScale: 1.0}));
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
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: false });
                internalSpawnTeams(); 
                setSession(p => ({...p, isPlaying: false, winner: null, timeScale: 1.0})); 
            },
            rematch: () => {
                const engine = engineRef.current;
                engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
                engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
                setSession(p => ({...p, isPlaying: true, winner: null, timeScale: 1.0}));
            },
            startShowcaseMatch: () => { setupShowcaseMap(); spawnShowcaseUnits(); },
            downloadSpec: DesignExporter.downloadAll,
            handleSelectAgent: (a: Agent | null) => setHud(p => ({...p, selectedAgent: a}))
        }
    };
};
