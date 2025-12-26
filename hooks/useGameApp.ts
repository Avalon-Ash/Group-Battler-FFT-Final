
import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Team, Skill, Role } from '../types';
import { SCENE_DB } from '../data/scenes';
import { DesignExporter } from '../engine/systems/DesignExporter';

export const useGameApp = () => {
    const engineRef = useRef(new GameEngine());
    
    // --- STATE ---
    const [isShowcaseMode, setIsShowcaseMode] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [unitCount, setUnitCount] = useState(0); 
    const [tool, setTool] = useState<ToolType>(ToolType.SELECT);
    const [selectedObstacle, setSelectedObstacle] = useState<string>('WALL'); 
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [hoveredSkill, setHoveredSkill] = useState<Skill | null>(null);
    const [hpInput, setHpInput] = useState(600); 
    const [mapW, setMapW] = useState(12);
    const [mapH, setMapH] = useState(8);
    const [timeScale, setTimeScale] = useState(1.0);
    const [winner, setWinner] = useState<Team | null>(null);
    const [currentSceneId, setCurrentSceneId] = useState('VOID');
    const [spawnMode, setSpawnMode] = useState<'RANDOM' | 'DRAFT'>('RANDOM');
    const [draftRole, setDraftRole] = useState<Role>(Role.WARRIOR);
    
    // UI State
    const [showLogs, setShowLogs] = useState(false);
    const [showDB, setShowDB] = useState(false);
    const [showVFXMap, setShowVFXMap] = useState(false); // NEW
    const [transitionPhase, setTransitionPhase] = useState<'IDLE' | 'IN' | 'OUT'>('IDLE');
    const [showFactionWarning, setShowFactionWarning] = useState(false);

    // --- EVENT LISTENER SETUP ---
    // This allows the engine to drive state changes without prop drilling
    useEffect(() => {
        const engine = engineRef.current;
        
        const handleGameOver = (data: { winner: Team }) => {
            setWinner(data.winner);
            if (engine.isRunning) engine.stop(); 
            setIsPlaying(false);
        };

        engine.bus.on('GAME_OVER', handleGameOver);
        
        return () => {
            engine.bus.off('GAME_OVER', handleGameOver);
        };
    }, []);

    // Showcase Auto-Loop Logic (Reactive to winner state)
    useEffect(() => {
        if (isShowcaseMode && winner !== null) {
            // STEP 1: Battle Ends.
            const timer = setTimeout(() => {
                
                // STEP 2: Trigger OUT (Blur Ramps Up + Map Falls Down)
                setTransitionPhase('OUT');
                engineRef.current.agents = [];
                engineRef.current.combat.projectiles = [];
                
                // Wait 1.2s for OUT animation to complete fully (Cinematic feel)
                setTimeout(() => {
                    setupShowcaseMap(); 
                    
                    // STEP 3: Trigger IN (Map Rises Up + Blur Fades Out)
                    setTransitionPhase('IN'); 
                    
                    // Wait 1.2s for IN animation to assemble
                    setTimeout(() => {
                        setTransitionPhase('IDLE');
                        spawnShowcaseUnits(); 
                    }, 1200); 
                }, 1200); 
            }, 800); 
            return () => clearTimeout(timer);
        }
    }, [winner, isShowcaseMode]);

    // --- LOGIC ---

    const setupShowcaseMap = useCallback(() => {
        const engine = engineRef.current;
        engine.stop();
        setWinner(null);
        setSelectedAgent(null);
        engine.mapConfig.w = Math.floor(10 + Math.random() * 4);
        engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
        engine.randomizeEnvironment(); 
        setCurrentSceneId(engine.currentScene.id);
    }, []);

    const spawnShowcaseUnits = useCallback(() => {
        const engine = engineRef.current;
        const validHexes = (Array.from(engine.mapKeys) as string[]).map(k => {
            const [q, r] = k.split(',').map(Number);
            return {q, r};
        });
        // Fisher-Yates shuffle
        for (let i = validHexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validHexes[i], validHexes[j]] = [validHexes[j], validHexes[i]];
        }
        
        let spawnIndex = 0;
        const spawn = (team: Team) => {
            if (spawnIndex < validHexes.length) {
                const h = validHexes[spawnIndex++];
                const hp = 500 + Math.floor(Math.random() * 400); 
                engine.addAgent(team, h.q, h.r, hp);
            }
        };
        for(let i=0; i<5; i++) spawn(Team.BLUE);
        for(let i=0; i<5; i++) spawn(Team.RED);
        engine.play();
        setIsPlaying(true);
    }, []);

    const startShowcaseMatch = useCallback(() => {
        setupShowcaseMap();
        spawnShowcaseUnits();
    }, [setupShowcaseMap, spawnShowcaseUnits]);

    // Initial Start
    useEffect(() => {
        startShowcaseMatch();
    }, [startShowcaseMatch]);

    // Stats Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setUnitCount(engineRef.current.agents.length);
        }, 500); 
        return () => clearInterval(interval);
    }, []);

    // Time Scale Sync
    useEffect(() => {
        engineRef.current.timeScale = timeScale;
    }, [timeScale]);

    // --- HANDLERS ---

    const enterManualMode = () => {
        setIsShowcaseMode(false);
        engineRef.current.stop();
        setIsPlaying(false);
        setWinner(null);
        engineRef.current.clear(true); 
        engineRef.current.agents = [];
        setUnitCount(0);
        setMapW(engineRef.current.mapConfig.w);
        setMapH(engineRef.current.mapConfig.h);
        setCurrentSceneId(engineRef.current.currentScene.id);
    };

    const handleUpdateMapSize = useCallback((w: number, h: number) => {
        setMapW(w);
        setMapH(h);
        engineRef.current.mapConfig.w = w;
        engineRef.current.mapConfig.h = h;
        engineRef.current.clear(false); 
        setSelectedAgent(null);
        setWinner(null);
    }, []);

    const handleSetScene = useCallback((id: string) => {
        const scene = SCENE_DB.find(s => s.id === id);
        if (scene) {
            engineRef.current.currentScene = scene;
            engineRef.current.map.rebuildMap(engineRef.current);
            setCurrentSceneId(id);
        }
    }, []);

    const handleRandomBattlefield = useCallback(() => {
        const engine = engineRef.current;
        engine.stop();
        setWinner(null);
        setSelectedAgent(null);
        engine.clear(false); 
        
        engine.randomizeEnvironment();
        setMapW(engine.mapConfig.w);
        setMapH(engine.mapConfig.h);
        setCurrentSceneId(engine.currentScene.id);

        // Quick Spawn logic for manual random
        const validHexes = (Array.from(engine.mapKeys) as string[]).map(k => {
            const [q, r] = k.split(',').map(Number);
            return {q, r};
        });
        for (let i = validHexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validHexes[i], validHexes[j]] = [validHexes[j], validHexes[i]];
        }
        let spawnIndex = 0;
        const spawn = (team: Team) => {
            if (spawnIndex < validHexes.length) {
                const h = validHexes[spawnIndex++];
                const hp = 500 + Math.floor(Math.random() * 400); 
                engine.addAgent(team, h.q, h.r, hp);
            }
        };
        for(let i=0; i<5; i++) spawn(Team.BLUE);
        for(let i=0; i<5; i++) spawn(Team.RED);
        
        setIsPlaying(false); 
    }, []);

    const handleNextLevel = useCallback(() => {
        handleRandomBattlefield();
        const engine = engineRef.current;
        engine.play();
        setIsPlaying(true);
        setTool(ToolType.SELECT);
    }, [handleRandomBattlefield]);

    const handleReset = useCallback(() => {
        engineRef.current.restart();
        setIsPlaying(false); 
        setWinner(null);
    }, []);

    const togglePlay = useCallback(() => {
        if (winner !== null) return;
        
        if (isPlaying) {
            engineRef.current.stop();
            setIsPlaying(false);
        } else {
            const hasBlue = engineRef.current.agents.some(a => a.team === Team.BLUE);
            const hasRed = engineRef.current.agents.some(a => a.team === Team.RED);
            
            if (!hasBlue || !hasRed) {
                setShowFactionWarning(true);
                setTimeout(() => setShowFactionWarning(false), 2500);
                return;
            }

            engineRef.current.play();
            setIsPlaying(true);
            setTool(ToolType.SELECT);
        }
    }, [isPlaying, winner]);

    const handleSelectAgent = (a: Agent | null) => {
        setSelectedAgent(a);
    };

    // --- RETURN ---
    return {
        engineRef,
        state: {
            isShowcaseMode, isPlaying, unitCount, tool, selectedObstacle,
            selectedAgent, hoveredSkill, hpInput, mapW, mapH, timeScale,
            winner, currentSceneId, spawnMode, draftRole, showLogs, showDB, showVFXMap,
            transitionPhase, showFactionWarning
        },
        setters: {
            setTool, setSelectedObstacle, setHpInput, setTimeScale, 
            setSpawnMode, setDraftRole, setShowLogs, setShowDB, setShowVFXMap,
            setIsShowcaseMode, setSelectedAgent, setHoveredSkill
        },
        actions: {
            enterManualMode,
            handleUpdateMapSize,
            handleSetScene,
            handleRandomBattlefield,
            handleNextLevel,
            handleReset,
            togglePlay,
            onWin: (team: Team) => { engineRef.current.bus.emit('GAME_OVER', {winner: team}) },
            handleSelectAgent,
            startShowcaseMatch,
            downloadSpec: DesignExporter.downloadSpec,
            rematch: () => { 
                setWinner(null); 
                engineRef.current.restart(); 
                engineRef.current.play(); 
                setIsPlaying(true); 
            }
        }
    };
};
