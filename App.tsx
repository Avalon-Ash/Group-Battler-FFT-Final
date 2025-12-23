
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, Agent } from './engine/game';
import GameCanvas from './components/GameCanvas';
import InspectorPanel from './components/InspectorPanel';
import { ToolType, Team, Skill, Role } from './types';
import { OBSTACLE_DB } from './data/obstacles';

function App() {
  const engineRef = useRef(new GameEngine());
  
  // App States
  const [isShowcaseMode, setIsShowcaseMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const [showMobileInspector, setShowMobileInspector] = useState(false); // Mobile Only State
  const [showMapSettings, setShowMapSettings] = useState(false); // Mobile Map Modal
  
  // Tooling
  const [tool, setTool] = useState<ToolType>(ToolType.SELECT);
  const [selectedObstacle, setSelectedObstacle] = useState<string>('WALL'); 
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<Skill | null>(null);
  
  // Settings
  const [hpInput, setHpInput] = useState(600); 
  const [mapW, setMapW] = useState(12);
  const [mapH, setMapH] = useState(8);
  const [timeScale, setTimeScale] = useState(1.0);
  const [winner, setWinner] = useState<Team | null>(null);
  
  // Spawn Logic
  const [spawnMode, setSpawnMode] = useState<'RANDOM' | 'DRAFT'>('RANDOM');
  const [draftRole, setDraftRole] = useState<Role>(Role.WARRIOR);

  // Layout & UI
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const isResizing = useRef(false);
  const [showFactionWarning, setShowFactionWarning] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'IDLE' | 'IN' | 'OUT'>('IDLE');

  // --- Logic ---

  const setupShowcaseMap = useCallback(() => {
      const engine = engineRef.current;
      engine.stop();
      setWinner(null);
      setSelectedAgent(null);
      engine.mapConfig.w = Math.floor(10 + Math.random() * 4);
      engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
      engine.clear(false); 
  }, []);

  const spawnShowcaseUnits = useCallback(() => {
      const engine = engineRef.current;
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

  const enterManualMode = () => {
      setIsShowcaseMode(false);
      engineRef.current.stop();
      setIsPlaying(false);
      setWinner(null);
      engineRef.current.clear(true); 
      engineRef.current.agents = [];
      setUnitCount(0);
  };

  useEffect(() => {
    const interval = setInterval(() => {
        setUnitCount(engineRef.current.agents.length);
    }, 500); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      engineRef.current.timeScale = timeScale;
  }, [timeScale]);

  const startResizing = useCallback(() => {
      isResizing.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
      if (isResizing.current) {
          const newWidth = window.innerWidth - e.clientX;
          if (newWidth > 300 && newWidth < window.innerWidth * 0.9) {
              setSidebarWidth(newWidth);
          }
      }
  }, []);

  useEffect(() => {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResizing);
      };
  }, [resize, stopResizing]);

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

  const handleRestart = useCallback(() => {
    if (winner !== null) return;
    engineRef.current.restart();
    setIsPlaying(true);
    setTool(ToolType.SELECT);
  }, [winner]);

  const handleClear = useCallback(() => {
    engineRef.current.clear(); 
    setIsPlaying(false);
    setSelectedAgent(null);
    setWinner(null);
    setHoveredSkill(null);
  }, []);

  const updateMap = useCallback(() => {
      engineRef.current.mapConfig.w = mapW;
      engineRef.current.mapConfig.h = mapH;
      engineRef.current.clear(true);
      setSelectedAgent(null);
      setWinner(null);
  }, [mapW, mapH]);

  const handleSelectAgent = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
    // Removed auto-inspector logic to fix drag conflict
  }, []);

  const onWin = (team: Team) => {
    setWinner(team);
    if (isShowcaseMode) {
        setTimeout(() => {
            setTransitionPhase('OUT');
            engineRef.current.agents = [];
            engineRef.current.combat.projectiles = [];
            setTimeout(() => {
                setupShowcaseMap(); 
                setTransitionPhase('IN'); 
                setTimeout(() => {
                    setTransitionPhase('IDLE');
                    spawnShowcaseUnits(); 
                }, 1200);
            }, 1500);
        }, 2000);
    } else {
        setIsPlaying(false);
    }
  };

  const roleIcons: Record<Role, string> = {
      [Role.TANK]: '🛡️',
      [Role.WARRIOR]: '⚔️',
      [Role.RANGER]: '🏹',
      [Role.MAGE]: '🔮',
      [Role.SUPPORT]: '⚕️'
  };

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans flex flex-col relative select-none">
      
      {/* FLOATING HUD (Top Center) - Z-Index 30 */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 w-auto max-w-[95%] pointer-events-none ${isShowcaseMode ? '-translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="glass-panel px-3 py-2 rounded-xl md:rounded-full flex flex-wrap md:flex-nowrap items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] border-slate-600/50 backdrop-blur-lg pointer-events-auto">
                
                {/* Control Group */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={togglePlay} 
                        disabled={winner !== null}
                        className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all shadow-lg ${isPlaying ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-emerald-900/50 border-emerald-500 text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    
                    <button 
                        onClick={handleRestart} 
                        disabled={!isPlaying && winner === null}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-white transition-colors"
                        title="重置回合"
                    >
                        ↺
                    </button>
                </div>

                <div className="hidden xl:block w-px h-8 bg-slate-700"></div>

                {/* Speed Control - Hidden on small screens */}
                <div className="hidden xl:flex flex-1 flex-col items-center min-w-[120px]">
                    <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">模擬速度</span>
                        <div className="text-[10px] font-mono text-cyan-400">{timeScale.toFixed(1)}x</div>
                    </div>
                    <input 
                        type="range" min="0.1" max="3.0" step="0.1" 
                        value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

                {/* Mode Switch (Desktop Only) */}
                <button 
                    onClick={() => { setIsShowcaseMode(true); startShowcaseMatch(); }}
                    className="hidden lg:flex px-3 py-1.5 rounded bg-slate-800/50 hover:bg-purple-900/30 border border-transparent hover:border-purple-500/50 text-xs font-bold text-slate-400 hover:text-purple-300 transition-all items-center gap-2"
                >
                    <span>📺</span>
                    <span>展示模式</span>
                </button>
          </div>
      </div>

      {/* WARNING NOTIFICATION */}
      {showFactionWarning && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-in pointer-events-none w-[90%] max-w-md">
                <div className="bg-red-950/90 text-red-200 px-6 py-3 rounded border border-red-500 flex items-center gap-3 shadow-xl">
                    <span className="text-xl">⚠️</span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-widest text-red-400 uppercase">部署錯誤</span>
                        <span className="text-xs">請部署雙方單位以開始戰鬥。</span>
                    </div>
                </div>
            </div>
      )}

      {/* MAP SETTINGS MODAL (Mobile Only) */}
      {showMapSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowMapSettings(false)}>
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl w-full max-w-sm space-y-4 mb-32 sm:mb-0 pointer-events-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-slate-300">地圖設定</h3>
                    <button onClick={() => setShowMapSettings(false)} className="text-slate-500 hover:text-slate-300 w-8 h-8 flex items-center justify-center">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold uppercase">寬度</label>
                        <input type="number" className="tactical-input w-full text-center h-10 text-lg" value={mapW} onChange={e=>setMapW(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold uppercase">高度</label>
                        <input type="number" className="tactical-input w-full text-center h-10 text-lg" value={mapH} onChange={e=>setMapH(Number(e.target.value))} />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={() => { updateMap(); setShowMapSettings(false); }} className="flex-1 tactical-btn py-3 border-slate-600 hover:bg-slate-800">重建地圖</button>
                    <button onClick={() => { handleClear(); setShowMapSettings(false); }} className="flex-1 tactical-btn py-3 text-red-400 border-red-900 hover:bg-red-950">清空單位</button>
                </div>
            </div>
        </div>
      )}

      {/* SHOWCASE OVERLAY */}
      {isShowcaseMode && (
            <div className="absolute inset-0 z-50 flex items-end justify-center pb-32 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none">
                <div className="text-center pointer-events-auto animate-fade-in px-4">
                    <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-100 to-red-500 mb-4 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)] font-mono tracking-tighter">
                        TACTICAL<span className="text-slate-100">.</span>OS
                    </h1>
                    <div className="text-cyan-500 text-xs md:text-sm tracking-[0.5em] mb-10 uppercase font-bold text-shadow">戰場模擬引擎 v4.0</div>
                    <button 
                        onClick={enterManualMode}
                        className="group relative px-10 py-4 bg-slate-900 border border-cyan-500/50 text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase overflow-hidden hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:border-cyan-400 hover:bg-slate-800"
                    >
                        <span className="relative z-10 flex items-center gap-4">
                            <span>初始化指揮系統</span>
                            <span className="text-lg">➜</span>
                        </span>
                    </button>
                </div>
                {/* Discrete Time Control for Showcase */}
                <div className="absolute bottom-8 right-8 z-50 pointer-events-auto flex items-center gap-4 glass-panel px-5 py-3 rounded-full group animate-fade-in border-slate-600/50">
                    <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">模擬速率</span>
                    <input 
                        type="range" min="0.1" max="4.0" step="0.1" 
                        value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                        className="w-24 md:w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[10px] w-8 text-right font-mono text-cyan-300 font-bold">{timeScale.toFixed(1)}x</span>
                </div>
            </div>
      )}

      {/* MAIN CONTENT ROW */}
      <div className="flex-1 flex overflow-hidden relative z-0">
          
          {/* LEFT COLUMN: Canvas + Dock */}
          {/* CRITICAL FIX: flex-1, min-w-0, min-h-0 to ensure it shrinks properly in flex container */}
          <div className="flex-1 flex flex-col relative min-w-0 min-h-0 z-0 basis-0 bg-slate-900">
                <GameCanvas 
                    engine={engineRef.current} 
                    tool={tool}
                    selectedObstacle={selectedObstacle}
                    hpInput={hpInput}
                    selectedAgent={selectedAgent}
                    hoveredSkill={hoveredSkill}
                    isShowcaseMode={isShowcaseMode}
                    spawnMode={spawnMode}
                    draftRole={draftRole}
                    onSelect={handleSelectAgent} 
                    onWin={onWin}
                    winner={winner}
                    rematch={() => { setWinner(null); engineRef.current.restart(); setIsPlaying(true); }}
                    transitionPhase={transitionPhase}
                />

                {/* BOTTOM DOCK */}
                <div className={`bg-slate-950 border-t border-slate-800 shrink-0 z-30 transition-all duration-500 w-full ${isShowcaseMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                    
                    {/* MOBILE GRID LAYOUT (< md) - 2x4 GRID */}
                    <div className="md:hidden grid grid-cols-4 gap-2 p-2 h-auto">
                        {/* Row 1: Primary Actions */}
                        <button onClick={() => setTool(ToolType.SELECT)} className={`h-10 tactical-btn ${tool === ToolType.SELECT ? 'active' : ''}`}>
                            <span className="text-lg">⌖</span>
                        </button>
                        
                        <button onClick={() => setTool(ToolType.ADD_BLUE)} className={`h-10 tactical-btn btn-blue ${tool === ToolType.ADD_BLUE ? 'active' : 'opacity-70'}`}>
                            <span className="text-lg">🔵</span>
                        </button>
                        
                        <button onClick={() => setTool(ToolType.ADD_RED)} className={`h-10 tactical-btn btn-red ${tool === ToolType.ADD_RED ? 'active' : 'opacity-70'}`}>
                            <span className="text-lg">🔴</span>
                        </button>
                        
                        <button onClick={() => setTool(ToolType.DELETE)} className={`h-10 tactical-btn text-red-400 border-red-900/50 ${tool === ToolType.DELETE ? 'active bg-red-950/50 border-red-500' : ''}`}>
                            <span className="text-lg">❌</span>
                        </button>

                        {/* Row 2: Secondary & Config */}
                        {/* Slot 5: Obstacle Tool + Dropdown Overlay */}
                        <div className={`relative h-10 tactical-btn p-0 ${tool === ToolType.OBSTACLE ? 'active border-cyan-500' : ''}`}>
                            <button onClick={() => setTool(ToolType.OBSTACLE)} className="w-full h-full flex items-center justify-center gap-1">
                                <span className="text-lg">🧱</span>
                                <span className="text-[8px] absolute bottom-0.5 right-1 opacity-50">▼</span>
                            </button>
                            <select 
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                value={selectedObstacle} 
                                onChange={e => { setSelectedObstacle(e.target.value); setTool(ToolType.OBSTACLE); }}
                            >
                                {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        {/* Slot 6: HP Input */}
                        <div className="h-10 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-sm relative">
                            <span className="text-[8px] text-slate-500 absolute -top-1.5 left-1 bg-slate-900 px-0.5">HP</span>
                            <input 
                                type="number" 
                                value={hpInput} 
                                onChange={e => setHpInput(parseInt(e.target.value))} 
                                className="w-full h-full bg-transparent text-center text-xs font-mono text-slate-200 outline-none"
                            />
                        </div>

                        {/* Slot 7: Map Settings Toggle */}
                        <button 
                            onClick={() => setShowMapSettings(!showMapSettings)}
                            className={`h-10 tactical-btn ${showMapSettings ? 'border-cyan-500 text-cyan-400' : ''}`}
                        >
                            <span className="text-lg">🗺️</span>
                        </button>

                        {/* Slot 8: Inspect Toggle */}
                        <button 
                            onClick={() => selectedAgent && setShowMobileInspector(!showMobileInspector)}
                            disabled={!selectedAgent}
                            className={`h-10 tactical-btn ${showMobileInspector ? 'active' : ''} ${selectedAgent ? 'border-blue-500/50 text-blue-300 animate-pulse-glow' : 'opacity-30'}`}
                        >
                            <span className="text-lg">👁️</span>
                        </button>
                    </div>

                    {/* DESKTOP FLEX LAYOUT (>= md) */}
                    <div className="hidden md:flex h-40 overflow-x-auto overflow-y-hidden">
                        
                        {/* ZONE 1: COMMAND TOOLS */}
                        <div className="w-48 border-r border-slate-800 p-3 flex flex-col gap-2 shrink-0">
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">指揮工具</div>
                            <div className="grid grid-cols-2 gap-2 flex-1">
                                <button onClick={() => setTool(ToolType.SELECT)} className={`tactical-btn flex-col ${tool === ToolType.SELECT ? 'active' : ''}`}>
                                    <span className="text-lg">⌖</span>
                                    <span className="text-[9px]">選取</span>
                                </button>
                                <button onClick={() => setTool(ToolType.DELETE)} className={`tactical-btn flex-col text-red-400 border-red-900/50 hover:border-red-500 ${tool === ToolType.DELETE ? 'active border-red-500 bg-red-950/30' : ''}`}>
                                    <span className="text-lg">❌</span>
                                    <span className="text-[9px]">移除</span>
                                </button>
                                <button onClick={() => setTool(ToolType.OBSTACLE)} className={`tactical-btn flex-col col-span-2 ${tool === ToolType.OBSTACLE ? 'active' : ''}`}>
                                    <span className="flex items-center gap-2">
                                        <span className="text-lg">🧱</span>
                                        <span className="text-[9px]">地形</span>
                                    </span>
                                </button>
                            </div>
                            {tool === ToolType.OBSTACLE && (
                                <select className="bg-slate-900 border border-slate-700 text-xs p-1 rounded text-slate-400 outline-none" value={selectedObstacle} onChange={e => setSelectedObstacle(e.target.value)}>
                                    {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* ZONE 2: DEPLOYMENT (Flexible Width) */}
                        <div className="flex-1 p-3 flex flex-col gap-2 relative min-w-[300px]">
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex justify-between">
                                <span>單位部署</span>
                                <span className="text-slate-700 font-mono">單位數: {unitCount}</span>
                            </div>
                            
                            <div className="flex gap-4 h-full">
                                {/* Team Selectors (Sets Tool) */}
                                <div className="flex flex-col gap-2 w-28 shrink-0">
                                    <button onClick={() => setTool(ToolType.ADD_BLUE)} className={`flex-1 tactical-btn btn-blue flex items-center justify-between px-3 ${tool === ToolType.ADD_BLUE ? 'active' : 'opacity-60 hover:opacity-100'}`}>
                                        <span className="font-bold text-xs">藍隊</span>
                                        <span className="text-lg">🔵</span>
                                    </button>
                                    <button onClick={() => setTool(ToolType.ADD_RED)} className={`flex-1 tactical-btn btn-red flex items-center justify-between px-3 ${tool === ToolType.ADD_RED ? 'active' : 'opacity-60 hover:opacity-100'}`}>
                                        <span className="font-bold text-xs">紅隊</span>
                                        <span className="text-lg">🔴</span>
                                    </button>
                                </div>

                                {/* Mode & Draft Config */}
                                <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 flex flex-col gap-2 min-w-[200px]">
                                    <div className="flex bg-slate-950 rounded p-1 gap-1 shrink-0">
                                        <button onClick={() => setSpawnMode('RANDOM')} className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${spawnMode === 'RANDOM' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                            🎲 隨機
                                        </button>
                                        <button onClick={() => setSpawnMode('DRAFT')} className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${spawnMode === 'DRAFT' ? 'bg-slate-700 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                            📝 自選
                                        </button>
                                    </div>

                                    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                                        {spawnMode === 'RANDOM' ? (
                                            <div className="text-slate-600 font-mono text-xs flex flex-col items-center animate-pulse">
                                                <span className="text-2xl mb-1">🎲</span>
                                                <span>隨機職階</span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1.5 w-full justify-center">
                                                {Object.values(Role).map(role => (
                                                    <button 
                                                        key={role}
                                                        onClick={() => setDraftRole(role)}
                                                        className={`w-10 h-10 rounded border flex flex-col items-center justify-center transition-all ${draftRole === role ? 'bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-110' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                                                        title={role}
                                                    >
                                                        <span className="text-lg -mt-1 filter drop-shadow-md">{roleIcons[role]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* HP Pool */}
                                <div className="flex flex-col justify-center gap-1 w-16 shrink-0">
                                    <label className="text-[9px] text-slate-500 font-bold uppercase text-center">生命值</label>
                                    <input 
                                        type="number" 
                                        value={hpInput} 
                                        onChange={e => setHpInput(parseInt(e.target.value))} 
                                        className="tactical-input text-center text-lg h-10 border-slate-700 focus:border-cyan-500 px-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ZONE 3: MAP OPS */}
                        <div className="w-36 border-l border-slate-800 p-3 flex flex-col gap-2 shrink-0 bg-slate-950/50">
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">地圖操作</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-slate-500">寬度</label>
                                    <input type="number" className="tactical-input p-1 text-center" value={mapW} onChange={e=>setMapW(Number(e.target.value))}/>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[8px] text-slate-500">高度</label>
                                    <input type="number" className="tactical-input p-1 text-center" value={mapH} onChange={e=>setMapH(Number(e.target.value))}/>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <button onClick={updateMap} className="flex-1 tactical-btn text-[9px] px-1 py-2 justify-center border-slate-600 hover:bg-slate-800">重建</button>
                                <button onClick={handleClear} className="flex-1 tactical-btn text-[9px] px-1 py-2 justify-center text-red-400 border-red-900 hover:bg-red-950">清空單位</button>
                            </div>
                        </div>
                    </div>
                </div>
          </div>

          {/* RIGHT COLUMN: Inspector (Z-40) */}
          {/* Resizer - Hidden on small screens or when showcase */}
          {!isShowcaseMode && (
            <div 
                className="hidden lg:flex w-1 bg-slate-950 hover:bg-cyan-600 cursor-col-resize items-center justify-center shrink-0 transition-colors z-40 border-l border-slate-800"
                onMouseDown={startResizing}
            >
                <div className="w-[1px] h-8 bg-slate-600"></div>
            </div>
          )}

          {/* Panel - Desktop Sidebar OR Mobile Overlay */}
          <div 
            className={`
                flex flex-col z-40 shadow-2xl bg-slate-900 border-l border-slate-700 transition-all duration-300
                ${/* MOBILE MODE: Overlay */ ''}
                ${window.innerWidth < 1024 ? 'fixed inset-0 lg:static' : 'relative h-full'}
                ${/* VISIBILITY LOGIC */ ''}
                ${window.innerWidth < 1024 && !showMobileInspector ? 'pointer-events-none opacity-0 translate-x-full lg:pointer-events-auto lg:opacity-100 lg:translate-x-0' : 'opacity-100 translate-x-0'}
                ${/* SHOWCASE MODE: Hide completely on desktop */ ''}
                ${isShowcaseMode ? 'w-0 border-l-0 overflow-hidden' : ''}
            `}
            style={{ width: (window.innerWidth >= 1024 && !isShowcaseMode) ? sidebarWidth : undefined }}
          >
            {/* Mobile Header for Close */}
            <div className="lg:hidden p-3 border-b border-slate-700 bg-slate-950 flex justify-between items-center shrink-0">
                 <h3 className="font-bold text-slate-200">單位監控面板</h3>
                 <button onClick={() => setShowMobileInspector(false)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-slate-400">✕</button>
            </div>

            <InspectorPanel 
                agent={selectedAgent} 
                engine={engineRef.current}
                logs={[]} 
                db={engineRef.current.skillDB}
                onHoverSkill={setHoveredSkill}
            />
          </div>
      </div>
    </div>
  );
}

export default App;
