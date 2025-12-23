
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
          if (newWidth > 300 && newWidth < window.innerWidth * 0.6) {
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
    <div className="h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans flex flex-col relative select-none">
      
      {/* FLOATING HUD (Top Center) */}
      <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${isShowcaseMode ? '-translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="glass-panel px-6 py-2 rounded-full flex items-center gap-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] border-slate-600/50">
                <button 
                    onClick={togglePlay} 
                    disabled={winner !== null}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all ${isPlaying ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-emerald-900/50 border-emerald-500 text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>
                
                <div className="flex flex-col items-center w-32">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Time Scale</span>
                    <input 
                        type="range" min="0.1" max="3.0" step="0.1" 
                        value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 mt-1"
                    />
                    <div className="text-[10px] font-mono text-cyan-400">{timeScale.toFixed(1)}x</div>
                </div>

                <button 
                    onClick={handleRestart} 
                    disabled={!isPlaying && winner === null}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-white transition-colors"
                    title="Reset Round"
                >
                    ↺
                </button>

                <div className="w-px h-8 bg-slate-700 mx-2"></div>

                <button 
                    onClick={() => { setIsShowcaseMode(true); startShowcaseMatch(); }}
                    className="text-xs font-bold text-slate-500 hover:text-purple-400 transition-colors"
                >
                    📺 TV MODE
                </button>
          </div>
      </div>

      {/* WARNING NOTIFICATION */}
      {showFactionWarning && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in pointer-events-none">
                <div className="bg-red-950/90 text-red-200 px-6 py-3 rounded border border-red-500 flex items-center gap-3 shadow-xl">
                    <span className="text-xl">⚠️</span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-widest text-red-400 uppercase">Deployment Error</span>
                        <span className="text-xs">Deploy units for BOTH factions to engage.</span>
                    </div>
                </div>
            </div>
      )}

      {/* SHOWCASE OVERLAY */}
      {isShowcaseMode && (
            <div className="absolute inset-0 z-50 flex items-end justify-center pb-32 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none">
                <div className="text-center pointer-events-auto animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-100 to-red-500 mb-4 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)] font-mono tracking-tighter">
                        TACTICAL<span className="text-slate-100">.</span>OS
                    </h1>
                    <div className="text-cyan-500 text-xs md:text-sm tracking-[0.5em] mb-10 uppercase font-bold text-shadow">Battlefield Simulation Engine v4.0</div>
                    <button 
                        onClick={enterManualMode}
                        className="group relative px-10 py-4 bg-slate-900 border border-cyan-500/50 text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase overflow-hidden hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:border-cyan-400 hover:bg-slate-800"
                    >
                        <span className="relative z-10 flex items-center gap-4">
                            <span>Initialize Command</span>
                            <span className="text-lg">➜</span>
                        </span>
                    </button>
                </div>
                {/* Discrete Time Control for Showcase */}
                <div className="absolute bottom-8 right-8 z-50 pointer-events-auto flex items-center gap-4 glass-panel px-5 py-3 rounded-full group animate-fade-in border-slate-600/50">
                    <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">Sim Rate</span>
                    <input 
                        type="range" min="0.1" max="4.0" step="0.1" 
                        value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                        className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[10px] w-8 text-right font-mono text-cyan-300 font-bold">{timeScale.toFixed(1)}x</span>
                </div>
            </div>
      )}

      {/* MAIN CONTENT ROW */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT COLUMN: Canvas + Dock */}
          <div className="flex-1 flex flex-col relative min-w-0">
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
                    onSelect={handleSelectAgent} // Needs wrap
                    onWin={onWin}
                    winner={winner}
                    rematch={() => { setWinner(null); engineRef.current.restart(); setIsPlaying(true); }}
                    transitionPhase={transitionPhase}
                />

                {/* BOTTOM DOCK */}
                <div className={`h-40 bg-slate-950 border-t border-slate-800 shrink-0 z-30 flex transition-all duration-500 ${isShowcaseMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                    
                    {/* ZONE 1: COMMAND TOOLS */}
                    <div className="w-48 border-r border-slate-800 p-3 flex flex-col gap-2 shrink-0">
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Command Tools</div>
                        <div className="grid grid-cols-2 gap-2 flex-1">
                            <button onClick={() => setTool(ToolType.SELECT)} className={`tactical-btn flex-col ${tool === ToolType.SELECT ? 'active' : ''}`}>
                                <span className="text-lg">⌖</span>
                                <span className="text-[9px]">SELECT</span>
                            </button>
                            <button onClick={() => setTool(ToolType.DELETE)} className={`tactical-btn flex-col text-red-400 border-red-900/50 hover:border-red-500 ${tool === ToolType.DELETE ? 'active border-red-500 bg-red-950/30' : ''}`}>
                                <span className="text-lg">❌</span>
                                <span className="text-[9px]">DELETE</span>
                            </button>
                            <button onClick={() => setTool(ToolType.OBSTACLE)} className={`tactical-btn flex-col col-span-2 ${tool === ToolType.OBSTACLE ? 'active' : ''}`}>
                                <span className="flex items-center gap-2">
                                    <span className="text-lg">🧱</span>
                                    <span className="text-[9px]">OBSTACLE</span>
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
                    <div className="flex-1 p-3 flex flex-col gap-2 relative">
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex justify-between">
                            <span>Unit Deployment</span>
                            <span className="text-slate-700 font-mono">UNITS: {unitCount}</span>
                        </div>
                        
                        <div className="flex gap-4 h-full">
                            {/* Team Selectors (Sets Tool) */}
                            <div className="flex flex-col gap-2 w-32 shrink-0">
                                <button onClick={() => setTool(ToolType.ADD_BLUE)} className={`flex-1 tactical-btn btn-blue flex items-center justify-between px-3 ${tool === ToolType.ADD_BLUE ? 'active' : 'opacity-60 hover:opacity-100'}`}>
                                    <span className="font-bold text-xs">BLUE</span>
                                    <span className="text-lg">🔵</span>
                                </button>
                                <button onClick={() => setTool(ToolType.ADD_RED)} className={`flex-1 tactical-btn btn-red flex items-center justify-between px-3 ${tool === ToolType.ADD_RED ? 'active' : 'opacity-60 hover:opacity-100'}`}>
                                    <span className="font-bold text-xs">RED</span>
                                    <span className="text-lg">🔴</span>
                                </button>
                            </div>

                            {/* Mode & Draft Config */}
                            <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 flex flex-col gap-2">
                                <div className="flex bg-slate-950 rounded p-1 gap-1 shrink-0">
                                    <button onClick={() => setSpawnMode('RANDOM')} className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${spawnMode === 'RANDOM' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                        🎲 RANDOM
                                    </button>
                                    <button onClick={() => setSpawnMode('DRAFT')} className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${spawnMode === 'DRAFT' ? 'bg-slate-700 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                        📝 DRAFT
                                    </button>
                                </div>

                                <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                                    {spawnMode === 'RANDOM' ? (
                                        <div className="text-slate-600 font-mono text-xs flex flex-col items-center animate-pulse">
                                            <span className="text-2xl mb-1">🎲</span>
                                            <span>RANDOM CLASS</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 w-full justify-center">
                                            {Object.values(Role).map(role => (
                                                <button 
                                                    key={role}
                                                    onClick={() => setDraftRole(role)}
                                                    className={`w-12 h-12 rounded border flex flex-col items-center justify-center transition-all ${draftRole === role ? 'bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-110' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                                                    title={role}
                                                >
                                                    <span className="text-lg mb-0.5 filter drop-shadow-md">{roleIcons[role]}</span>
                                                    <span className="text-[8px] font-bold uppercase">{role.substring(0,3)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* HP Pool */}
                            <div className="flex flex-col justify-center gap-1 w-20 shrink-0">
                                <label className="text-[9px] text-slate-500 font-bold uppercase text-center">HP Pool</label>
                                <input 
                                    type="number" 
                                    value={hpInput} 
                                    onChange={e => setHpInput(parseInt(e.target.value))} 
                                    className="tactical-input text-center text-lg h-10 border-slate-700 focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ZONE 3: MAP OPS */}
                    <div className="w-40 border-l border-slate-800 p-3 flex flex-col gap-2 shrink-0 bg-slate-950/50">
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Map Operations</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <label className="text-[8px] text-slate-500">WIDTH</label>
                                <input type="number" className="tactical-input p-1 text-center" value={mapW} onChange={e=>setMapW(Number(e.target.value))}/>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[8px] text-slate-500">HEIGHT</label>
                                <input type="number" className="tactical-input p-1 text-center" value={mapH} onChange={e=>setMapH(Number(e.target.value))}/>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-auto">
                            <button onClick={updateMap} className="flex-1 tactical-btn text-[9px] px-1 py-2 justify-center border-slate-600 hover:bg-slate-800">REBUILD</button>
                            <button onClick={handleClear} className="flex-1 tactical-btn text-[9px] px-1 py-2 justify-center text-red-400 border-red-900 hover:bg-red-950">CLEAR</button>
                        </div>
                    </div>
                </div>
          </div>

          {/* RIGHT COLUMN: Inspector */}
          {/* Resizer */}
          {!isShowcaseMode && (
            <div 
                className="w-1 bg-slate-950 hover:bg-cyan-600 cursor-col-resize flex items-center justify-center shrink-0 transition-colors z-30 border-l border-slate-800"
                onMouseDown={startResizing}
            >
                <div className="w-[1px] h-8 bg-slate-600"></div>
            </div>
          )}

          {/* Panel */}
          <div 
            className={`flex flex-col shrink-0 z-20 shadow-2xl bg-slate-900 border-l border-slate-700 transition-all duration-300 ${isShowcaseMode ? 'w-0 border-l-0 overflow-hidden' : ''}`}
            style={{ width: isShowcaseMode ? 0 : sidebarWidth }}
          >
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
