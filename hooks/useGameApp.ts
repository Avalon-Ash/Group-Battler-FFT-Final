import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Team, Skill, Role, HexLayout } from '../types';
import { SCENE_DB } from '../data/scenes';
import { DesignExporter } from '../engine/systems/DesignExporter';
import { DEFAULT_HEX_LAYOUT } from '../constants';
import { HexUtils } from '../engine/utils';

export const useGameApp = () => {
    const engineRef = useRef(new GameEngine());
    
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
        hpInput: 600,
        spawnMode: 'RANDOM' as 'RANDOM' | 'DRAFT',
        draftRole: Role.WARRIOR,
        hexLayout: DEFAULT_HEX_LAYOUT,
        mapW: 12,
        mapH: 8,
        currentSceneId: 'VOID'
    });

    const [hud, setHud] = useState({
        selectedAgent: null as Agent | null,
        hoveredSkill: null as Skill | null,
        showLogs: false,
        showDB: false,
        showVFXMap: false,
        showFactionWarning: false,
        showDirectorMonitor: false 
    });

    const internalSpawnTeams = useCallback(() => {
        const engine = engineRef.current;
        const w = engine.mapConfig.w;
        const h = engine.mapConfig.h;
        
        // Filter valid hexes and avoid the outermost edges
        let validHexes = Array.from(engine.mapKeys).map((k: string) => {
            const [q, r] = k.split(',').map(Number);
            return {q, r};
        }).filter(hex => {
            if (engine.map.hasObstacle(hex.q, hex.r)) return false;
            const offset = HexUtils.axialToOffset(hex.q, hex.r, engine.mapConfig);
            return offset.col > 0 && offset.col < w - 1 && offset.row > 0 && offset.row < h - 1;
        });
        
        // Separate into left (Blue) and right (Red) sides
        const midCol = Math.floor(w / 2);
        let leftHexes = validHexes.filter(hex => HexUtils.axialToOffset(hex.q, hex.r, engine.mapConfig).col < midCol);
        let rightHexes = validHexes.filter(hex => HexUtils.axialToOffset(hex.q, hex.r, engine.mapConfig).col >= midCol);

        // Shuffle both arrays
        for (let i = leftHexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [leftHexes[i], leftHexes[j]] = [leftHexes[j], leftHexes[i]];
        }
        for (let i = rightHexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightHexes[i], rightHexes[j]] = [rightHexes[j], rightHexes[i]];
        }

        const roles: Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        
        const spawn = (team: Team, hexes: {q: number, r: number}[]) => {
            let spawnIdx = 0;
            for(let i=0; i<5; i++) {
                if (spawnIdx >= hexes.length) break;
                const hex = hexes[spawnIdx++];
                engine.addAgent(team, hex.q, hex.r, 600 + Math.random()*400, roles[i % roles.length]);
            }
        };

        spawn(Team.BLUE, leftHexes); 
        spawn(Team.RED, rightHexes);
        setSession(prev => ({ ...prev, unitCount: engine.agents.length }));
    }, []);

    const setupShowcaseMap = useCallback(() => {
        const engine = engineRef.current;
        engine.stop();
        engine.clear(true); 
        setHud(prev => ({ ...prev, selectedAgent: null }));
        engine.mapConfig.w = Math.floor(10 + Math.random() * 4);
        engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
        const newLayout: HexLayout = Math.random() > 0.5 ? 'FLAT' : 'POINTY';
        engine.mapConfig.layout = newLayout;
        engine.randomizeEnvironment(); 
        setEditor(prev => ({ ...prev, hexLayout: newLayout, currentSceneId: engine.currentScene.id }));
    }, []);

    useEffect(() => {
        const engine = engineRef.current;
        const handleGameOver = (data: { winner: Team }) => {
            setSession(prev => ({ ...prev, winner: data.winner, isPlaying: false }));
            if (engine.isRunning) engine.stop(); 
        };
        engine.bus.on('GAME_OVER', handleGameOver);
        return () => engine.bus.off('GAME_OVER', handleGameOver);
    }, []);

    const spawnShowcaseUnits = useCallback(() => {
        const engine = engineRef.current;
        internalSpawnTeams();
        engine.play();
        setSession(prev => ({ ...prev, isPlaying: true, winner: null }));
    }, [internalSpawnTeams]);

    useEffect(() => {
        if (session.isShowcaseMode && session.winner !== null) {
            const timer = setTimeout(() => {
                const engine = engineRef.current;
                engine.stop();
                engine.clear(true); 
                setSession(prev => ({ ...prev, transitionPhase: 'OUT' }));
                setTimeout(() => {
                    setupShowcaseMap(); 
                    setSession(prev => ({ ...prev, transitionPhase: 'IN' })); 
                    setTimeout(() => {
                        setSession(prev => ({ ...prev, transitionPhase: 'IDLE' }));
                        spawnShowcaseUnits(); 
                    }, 1500);
                }, 1200);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [session.winner, session.isShowcaseMode, setupShowcaseMap, spawnShowcaseUnits]);

    useEffect(() => { 
        if (session.isShowcaseMode) {
            setupShowcaseMap(); 
            spawnShowcaseUnits(); 
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setSession(prev => ({ ...prev, unitCount: engineRef.current.agents.length })), 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { 
        engineRef.current.targetTimeScale = session.timeScale; 
    }, [session.timeScale]);

    const enterManualMode = () => {
        engineRef.current.stop();
        engineRef.current.clear(true);
        setSession(prev => ({ ...prev, isShowcaseMode: false, isPlaying: false, winner: null, unitCount: 0 }));
        setEditor(prev => ({ 
            ...prev, 
            mapW: engineRef.current.mapConfig.w, 
            mapH: engineRef.current.mapConfig.h, 
            hexLayout: engineRef.current.mapConfig.layout, 
            currentSceneId: engineRef.current.currentScene.id 
        }));
    };

    return {
        engineRef,
        state: { 
            isShowcaseMode: session.isShowcaseMode, isPlaying: session.isPlaying, unitCount: session.unitCount, winner: session.winner, timeScale: session.timeScale, transitionPhase: session.transitionPhase,
            tool: editor.tool, selectedObstacle: editor.selectedObstacle, hpInput: editor.hpInput, mapW: editor.mapW, mapH: editor.mapH, currentSceneId: editor.currentSceneId, spawnMode: editor.spawnMode, draftRole: editor.draftRole, hexLayout: editor.hexLayout,
            selectedAgent: hud.selectedAgent, hoveredSkill: hud.hoveredSkill, showLogs: hud.showLogs, showDB: hud.showDB, showVFXMap: hud.showVFXMap, showFactionWarning: hud.showFactionWarning,
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
            setShowLogs: (showLogs: boolean) => setHud(p => ({...p, showLogs})),
            setShowDB: (showDB: boolean) => setHud(p => ({...p, showDB})),
            setShowVFXMap: (showVFXMap: boolean) => setHud(p => ({...p, showVFXMap})),
            setIsShowcaseMode: (isShowcaseMode: boolean) => setSession(p => ({...p, isShowcaseMode})),
            setSelectedAgent: (selectedAgent: Agent | null) => setHud(p => ({...p, selectedAgent})),
            setHoveredSkill: (hoveredSkill: Skill | null) => setHud(p => ({...p, hoveredSkill})),
            setShowDirectorMonitor: (v: boolean) => setHud(p => ({...p, showDirectorMonitor: v}))
        },
        actions: {
            enterManualMode,
            handleUpdateMapSize: (w: number, h: number) => { setEditor(p => ({...p, mapW: w, mapH: h})); engineRef.current.mapConfig.w = w; engineRef.current.mapConfig.h = h; engineRef.current.clear(true); },
            handleUpdateLayout: (l: HexLayout) => { setEditor(p => ({...p, hexLayout: l})); engineRef.current.mapConfig.layout = l; engineRef.current.clear(true); },
            handleSetScene: (id: string) => { const s = SCENE_DB.find(x => x.id === id); if(s) { engineRef.current.currentScene = s; engineRef.current.map.rebuildMap(engineRef.current); setEditor(p => ({...p, currentSceneId: id})); } },
            handleRandomBattlefield: () => { 
                engineRef.current.stop(); 
                engineRef.current.clear(true);
                engineRef.current.randomizeEnvironment(); 
                internalSpawnTeams();
                setSession(p => ({...p, winner: null, isPlaying: false})); 
                setEditor(p => ({...p, mapW: engineRef.current.mapConfig.w, mapH: engineRef.current.mapConfig.h, currentSceneId: engineRef.current.currentScene.id})); 
            },
            handleReset: () => { engineRef.current.restart(); setSession(p => ({...p, isPlaying: false, winner: null})); },
            togglePlay: () => { 
                if(session.winner) return;
                if(session.isPlaying) { engineRef.current.stop(); setSession(p => ({...p, isPlaying: false})); }
                else {
                    if(engineRef.current.agents.some(a => a.team === Team.BLUE) && engineRef.current.agents.some(a => a.team === Team.RED)) {
                        engineRef.current.play(); setSession(p => ({...p, isPlaying: true}));
                    } else { setHud(p => ({...p, showFactionWarning: true})); setTimeout(() => setHud(p => ({...p, showFactionWarning: false})), 2500); }
                }
            },
            handleNextLevel: () => { 
                engineRef.current.stop(); 
                engineRef.current.clear(true); 
                engineRef.current.randomizeEnvironment(); 
                internalSpawnTeams(); 
                setSession(p => ({...p, isPlaying: false, winner: null})); 
            },
            rematch: () => { engineRef.current.restart(); engineRef.current.play(); setSession(p => ({...p, isPlaying: true, winner: null})); },
            startShowcaseMatch: () => { setupShowcaseMap(); spawnShowcaseUnits(); },
            downloadSpec: DesignExporter.downloadSpec,
            handleSelectAgent: (a: Agent | null) => setHud(p => ({...p, selectedAgent: a}))
        }
    };
};
