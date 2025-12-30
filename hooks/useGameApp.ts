
import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Team, Skill, Role, HexLayout } from '../types';
import { SCENE_DB } from '../data/scenes';
import { DesignExporter } from '../engine/systems/DesignExporter';
import { DEFAULT_HEX_LAYOUT } from '../constants';
export const useGameApp = () => {
    const engineRef = useRef(new GameEngine());
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
    const [hexLayout, setHexLayout] = useState<HexLayout>(DEFAULT_HEX_LAYOUT);
    const [showLogs, setShowLogs] = useState(false);
    const [showDB, setShowDB] = useState(false);
    const [showVFXMap, setShowVFXMap] = useState(false); 
    const [transitionPhase, setTransitionPhase] = useState<'IDLE' | 'IN' | 'OUT'>('IDLE');
    const [showFactionWarning, setShowFactionWarning] = useState(false);
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
    useEffect(() => {
        if (isShowcaseMode && winner !== null) {
            const timer = setTimeout(() => {
                setTransitionPhase('OUT');
                engineRef.current.agents = [];
                // Fix: projectiles exists directly on GameEngine, not on the combat system.
                engineRef.current.projectiles = [];
                // Adjusted timers to match slower transition speed (0.5 factor)
                // 2.0s duration approx for transition 0->1
                setTimeout(() => {
                    setupShowcaseMap(); 
                    setTransitionPhase('IN'); 
                    setTimeout(() => {
                        setTransitionPhase('IDLE');
                        spawnShowcaseUnits(); 
                    }, 1800); // Increased from 1200
                }, 1800); // Increased from 1200
            }, 1000); 
            return () => clearTimeout(timer);
        }
    }, [winner, isShowcaseMode]);
    const setupShowcaseMap = useCallback(() => {
        const engine = engineRef.current;
        engine.stop();
        setWinner(null);
        setSelectedAgent(null);
        engine.mapConfig.w = Math.floor(10 + Math.random() * 4);
        engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
        const newLayout: HexLayout = Math.random() > 0.5 ? 'FLAT' : 'POINTY';
        engine.mapConfig.layout = newLayout;
        setHexLayout(newLayout);
        engine.randomizeEnvironment(); 
        setCurrentSceneId(engine.currentScene.id);
    }, []);
    const spawnShowcaseUnits = useCallback(() => {
        const engine = engineRef.current;
        let validHexes = (Array.from(engine.mapKeys) as string[])
            .map(k => {
                const [q, r] = k.split(',').map(Number);
                return {q, r};
            })
            .filter(h => !engine.map.hasObstacle(h.q, h.r));
        for (let i = validHexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validHexes[i], validHexes[j]] = [validHexes[j], validHexes[i]];
        }
        let spawnIndex = 0;
        const TARGET_PER_TEAM = 5;
        const roles: Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        
        const spawnTeam = (team: Team) => {
            let count = 0;
            while (count < TARGET_PER_TEAM && spawnIndex < validHexes.length) {
                const h = validHexes[spawnIndex++];
                const hp = 500 + Math.floor(Math.random() * 400); 
                // 依序分配職業，確保 5 個單位包含完整職業種類
                const role = roles[count % roles.length];
                const agent = engine.addAgent(team, h.q, h.r, hp, role);
                if (agent) count++;
            }
        };
        spawnTeam(Team.BLUE);
        spawnTeam(Team.RED);
        engine.play();
        setIsPlaying(true);
    }, []);
    const startShowcaseMatch = useCallback(() => {
        setupShowcaseMap();
        spawnShowcaseUnits();
    }, [setupShowcaseMap, spawnShowcaseUnits]);
    useEffect(() => {
        startShowcaseMatch();
    }, [startShowcaseMatch]);
    useEffect(() => {
        const interval = setInterval(() => {
            setUnitCount(engineRef.current.agents.length);
        }, 500); 
        return () => clearInterval(interval);
    }, []);
    useEffect(() => {
        engineRef.current.timeScale = timeScale;
    }, [timeScale]);
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
        setHexLayout(engineRef.current.mapConfig.layout);
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
    const handleUpdateLayout = useCallback((l: HexLayout) => {
        setHexLayout(l);
        engineRef.current.mapConfig.layout = l;
        engineRef.current.clear(true); 
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
        const newLayout: HexLayout = Math.random() > 0.5 ? 'FLAT' : 'POINTY';
        engine.mapConfig.layout = newLayout;
        setHexLayout(newLayout);
        engine.randomizeEnvironment();
        setMapW(engine.mapConfig.w);
        setMapH(engine.mapConfig.h);
        setCurrentSceneId(engine.currentScene.id);
        let validHexes = (Array.from(engine.mapKeys) as string[])
            .map(k => {
                const [q, r] = k.split(',').map(Number);
                return {q, r};
            })
            .filter(h => !engine.map.hasObstacle(h.q, h.r));
        for (let i = validHexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validHexes[i], validHexes[j]] = [validHexes[j], validHexes[i]];
        }
        let spawnIndex = 0;
        const TARGET_PER_TEAM = 5;
        const roles: Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

        const spawnTeam = (team: Team) => {
            let count = 0;
            while (count < TARGET_PER_TEAM && spawnIndex < validHexes.length) {
                const h = validHexes[spawnIndex++];
                const hp = 500 + Math.floor(Math.random() * 400); 
                const role = roles[count % roles.length];
                const agent = engine.addAgent(team, h.q, h.r, hp, role);
                if (agent) count++;
            }
        };
        spawnTeam(Team.BLUE);
        spawnTeam(Team.RED);
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
    return {
        engineRef,
        state: {
            isShowcaseMode, isPlaying, unitCount, tool, selectedObstacle,
            selectedAgent, hoveredSkill, hpInput, mapW, mapH, timeScale,
            winner, currentSceneId, spawnMode, draftRole, showLogs, showDB, showVFXMap,
            transitionPhase, showFactionWarning, hexLayout
        },
        setters: {
            setTool, setSelectedObstacle, setHpInput, setTimeScale, 
            setSpawnMode, setDraftRole, setShowLogs, setShowDB, setShowVFXMap,
            setIsShowcaseMode, setSelectedAgent, setHoveredSkill
        },
        actions: {
            enterManualMode,
            handleUpdateMapSize,
            handleUpdateLayout,
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
