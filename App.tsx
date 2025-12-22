
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, Agent } from './engine/game';
import GameCanvas from './components/GameCanvas';
import InspectorPanel from './components/InspectorPanel';
import { ToolType, Team, Skill } from './types';
import { HexUtils } from './engine/utils';
import { OBSTACLE_DB } from './data/obstacles';

function App() {
  const engineRef = useRef(new GameEngine());
  
  // App States
  const [isShowcaseMode, setIsShowcaseMode] = useState(true); // Default to Showcase
  const [isPlaying, setIsPlaying] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const [tool, setTool] = useState<ToolType>(ToolType.SELECT);
  const [selectedObstacle, setSelectedObstacle] = useState<string>('WALL'); // New state for specific obstacle type
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<Skill | null>(null);
  const [hpInput, setHpInput] = useState(600); 
  const [mapW, setMapW] = useState(12);
  const [mapH, setMapH] = useState(8);
  const [timeScale, setTimeScale] = useState(1.0);
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [winner, setWinner] = useState<Team | null>(null);
  
  // UI Warnings
  const [showFactionWarning, setShowFactionWarning] = useState(false);
  
  // Transition Phase for Showcase Rebuild Effect
  const [transitionPhase, setTransitionPhase] = useState<'IDLE' | 'IN' | 'OUT'>('IDLE');

  // Layout Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const isResizing = useRef(false);

  // --- Showcase Logic Refactored ---

  // 1. Prepare Environment (Map & Scene only, No Units)
  const setupShowcaseMap = useCallback(() => {
      const engine = engineRef.current;
      engine.stop();
      setWinner(null);
      setSelectedAgent(null);
      
      // Randomize Map Dimensions & Scene
      engine.mapConfig.w = Math.floor(10 + Math.random() * 4);
      engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
      engine.clear(false); // Clears units, randomizes scene, rebuilds map keys
  }, []);

  // 2. Spawn Units (Assumes map is ready)
  const spawnShowcaseUnits = useCallback(() => {
      const engine = engineRef.current;
      
      const validHexes = (Array.from(engine.mapKeys) as string[]).map(k => {
          const [q, r] = k.split(',').map(Number);
          return {q, r};
      });
      
      // Shuffle Hexes
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

  // Initial Load (Combines both)
  const startShowcaseMatch = useCallback(() => {
      setupShowcaseMap();
      spawnShowcaseUnits();
  }, [setupShowcaseMap, spawnShowcaseUnits]);

  // Initial Load Trigger
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

  // --- Existing Logic ---

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
        // Validation: Check if both teams have units
        const hasBlue = engineRef.current.agents.some(a => a.team === Team.BLUE);
        const hasRed = engineRef.current.agents.some(a => a.team === Team.RED);
        
        if (!hasBlue || !hasRed) {
            setShowFactionWarning(true);
            // Auto hide after 2 seconds
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

  const handleSelectAgent = useCallback((a: Agent | null) => {
      if (isShowcaseMode) return; // Disable selection in showcase
      setSelectedAgent(a);
      if (!a) setHoveredSkill(null);
      if (a) setShowMobileInspector(true);
  }, [isShowcaseMode]);
  
  const updateMap = useCallback(() => {
      engineRef.current.mapConfig.w = mapW;
      engineRef.current.mapConfig.h = mapH;
      engineRef.current.clear(true);
      setSelectedAgent(null);
      setWinner(null);
      setShowMapSettings(false);
  }, [mapW, mapH]);

  const onWin = (team: Team) => {
    setWinner(team);
    
    if (isShowcaseMode) {
        // Auto-Restart sequence with Map Rebuild Effect
        setTimeout(() => {
            // 1. Trigger "Map Drop" animation (Exit Phase)
            setTransitionPhase('OUT');
            
            // Requirement 1: Clear units immediately when grid exits
            // We manually empty the arrays so the map falls empty
            engineRef.current.agents = [];
            engineRef.current.combat.projectiles = [];
            
            // 2. Wait for drop animation (1.5s)
            setTimeout(() => {
                // 3. Prepare NEW Map (Hidden) & Start Rise (Enter Phase)
                setupShowcaseMap(); 
                setTransitionPhase('IN'); 
                
                // 4. Wait for rise animation to mostly finish (1.2s)
                setTimeout(() => {
                    setTransitionPhase('IDLE');
                    
                    // Requirement 2: Spawn units AFTER grid is in
                    spawnShowcaseUnits(); 
                }, 1200);
            }, 1500);
        }, 2000);
    } else {
        setIsPlaying(false);
    }
  };

  const rematch = () => {
    setWinner(null);
    engineRef.current.restart();
    setIsPlaying(true);
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-200 overflow-hidden font-sans">
      
      {/* HEADER: Hidden in Showcase Mode (except for Title) */}
      <header className={`h-12 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-2 md:px-4 shrink-0 z-20 shadow-lg gap-4 transition-all duration-500 ${isShowcaseMode ? '-mt-12 opacity-0 pointer-events-none' : 'mt-0 opacity-100'}`}>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <h1 className="text-blue-500 font-bold tracking-wider text-xs md:text-sm flex items-center gap-1">
                <span className="text-lg">⚔️</span>
                <span className="hidden lg:inline">團戰模擬器 BT</span>
                <span className="lg:hidden">BT</span>
            </h1>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            
            <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold">速度</span>
                <input 
                    type="range" 
                    min="0.1" 
                    max="3.0" 
                    step="0.1" 
                    value={timeScale}
                    onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                    className="w-16 md:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[10px] w-8 text-right font-mono text-blue-300">{timeScale.toFixed(1)}x</span>
            </div>

            <div className="h-6 w-[1px] bg-slate-800"></div>

            <div className="flex gap-1 md:gap-2">
                {!isPlaying ? (
                    <button 
                      onClick={togglePlay} 
                      disabled={winner !== null}
                      className={`px-2 md:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold rounded flex items-center gap-1 ${winner !== null ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        ▶ <span className="hidden md:inline">開始</span>
                    </button>
                ) : (
                    <button onClick={togglePlay} className="px-2 md:px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] md:text-xs font-bold rounded flex items-center gap-1">
                        ⏸ <span className="hidden md:inline">暫停</span>
                    </button>
                )}
                <button 
                  onClick={handleRestart} 
                  disabled={!isPlaying || winner !== null}
                  className={`px-2 md:px-3 py-1 bg-orange-700 hover:bg-orange-600 text-white text-[10px] md:text-xs font-bold rounded ${(!isPlaying || winner !== null) ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    ↺ <span className="hidden md:inline">重置</span>
                </button>
                <button onClick={handleClear} className="px-2 md:px-3 py-1 bg-slate-800 hover:bg-red-900 border border-slate-700 text-slate-300 text-[10px] md:text-xs font-bold rounded">
                    🗑️
                </button>
                <button 
                    disabled={isPlaying || winner !== null}
                    onClick={() => setShowMapSettings(!showMapSettings)}
                    className={`ml-2 px-2 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] rounded hover:text-white ${isPlaying || winner !== null ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    🗺️
                </button>
                {/* Switch back to Showcase */}
                <button 
                    onClick={() => {
                        setIsShowcaseMode(true);
                        startShowcaseMatch();
                    }}
                    className="ml-2 px-2 py-1 bg-slate-800 border border-slate-700 text-purple-400 text-[10px] rounded hover:text-white hover:bg-purple-900"
                    title="進入展示模式"
                >
                    📺
                </button>
            </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs font-mono text-slate-500 shrink-0">
            <div className="hidden md:block">單位: <span className="text-slate-300">{unitCount}</span></div>
        </div>
      </header>

      {showMapSettings && (
          <div className="absolute top-14 left-4 z-50 bg-slate-800 border border-slate-600 p-3 rounded shadow-xl w-48">
              <h3 className="text-xs font-bold mb-2 text-slate-300">地圖設定</h3>
              <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                      <label className="text-[9px] block text-slate-500">寬</label>
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1" value={mapW} onChange={e=>setMapW(Number(e.target.value))}/>
                  </div>
                  <div className="flex-1">
                      <label className="text-[9px] block text-slate-500">高</label>
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1" value={mapH} onChange={e=>setMapH(Number(e.target.value))}/>
                  </div>
              </div>
              
              <button onClick={updateMap} className="w-full bg-blue-600 text-[10px] py-1 rounded hover:bg-blue-500 text-white font-bold">
                  應用並重置
              </button>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* FACTION WARNING TIP */}
        {showFactionWarning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
                <div className="bg-red-600 text-white px-4 py-2 rounded shadow-lg border border-red-400 flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="text-xs font-bold">需配置 藍方 與 紅方 單位才能開始戰鬥！</span>
                </div>
            </div>
        )}

        {/* Showcase Mode Overlay */}
        {isShowcaseMode && (
            <>
                <div className="absolute inset-0 z-40 pointer-events-none flex items-end justify-center pb-20 bg-gradient-to-t from-black/80 via-transparent to-black/20">
                    <div className="text-center pointer-events-auto animate-fade-in">
                        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-red-400 mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] font-serif tracking-widest">
                            BATTLE TACTICS
                        </h1>
                        <div className="text-slate-400 text-xs md:text-sm tracking-[0.3em] mb-8 uppercase opacity-80">AI Simulation Engine</div>
                        <button 
                            onClick={enterManualMode}
                            className="group relative px-8 py-3 bg-slate-900 border border-slate-700 text-white font-bold tracking-widest text-sm rounded-full overflow-hidden hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                <span>ENTER BATTLE</span>
                                <span className="text-lg">➜</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Discrete Time Control for Showcase */}
                <div className="absolute bottom-6 right-6 z-50 pointer-events-auto flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl transition-all hover:bg-black/60 hover:border-white/20 group animate-fade-in">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">Sim Speed</span>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="4.0" 
                        step="0.1" 
                        value={timeScale}
                        onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                    />
                    <span className="text-[10px] w-8 text-right font-mono text-blue-300 font-bold">{timeScale.toFixed(1)}x</span>
                </div>
            </>
        )}

        <div className="flex-1 flex flex-col relative min-w-0 bg-slate-800">
            <GameCanvas 
                engine={engineRef.current} 
                tool={tool}
                selectedObstacle={selectedObstacle}
                hpInput={hpInput}
                selectedAgent={selectedAgent}
                hoveredSkill={hoveredSkill}
                isShowcaseMode={isShowcaseMode}
                onSelect={handleSelectAgent}
                onWin={onWin}
                winner={winner}
                rematch={rematch}
                transitionPhase={transitionPhase}
            />
            
            {/* Toolbar: Hidden in Showcase */}
            <div className={`h-14 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-2 md:px-4 shrink-0 overflow-x-auto no-scrollbar gap-4 z-10 transition-all duration-500 ${isShowcaseMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Tool Selection */}
                    <button 
                        disabled={isPlaying || winner !== null} 
                        onClick={() => setTool(ToolType.SELECT)} 
                        className={`px-3 py-1.5 text-[10px] font-bold rounded border flex items-center gap-1 transition-all ${tool === ToolType.SELECT ? 'bg-slate-700 border-blue-400 text-white shadow-[0_0_0_1px_#60a5fa]' : 'bg-slate-800 border-slate-700 text-slate-400 opacity-80 hover:bg-slate-700'}`}
                        title="選取 / 移動"
                    >
                        <span>👆</span> <span className="hidden sm:inline">選取</span>
                    </button>

                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    <button disabled={isPlaying || winner !== null} onClick={() => setTool(ToolType.ADD_BLUE)} className={`px-3 py-1.5 text-[10px] font-bold rounded border flex items-center gap-1 transition-all ${tool === ToolType.ADD_BLUE ? 'bg-slate-800 border-blue-500 shadow-[0_0_0_1px_#3b82f6]' : 'bg-slate-800 border-slate-700 opacity-80'} text-blue-400 ${isPlaying || winner !== null ? 'opacity-30 cursor-not-allowed' : ''}`}><span>🔵</span> <span className="hidden sm:inline">藍方</span></button>
                    <button disabled={isPlaying || winner !== null} onClick={() => setTool(ToolType.ADD_RED)} className={`px-3 py-1.5 text-[10px] font-bold rounded border flex items-center gap-1 transition-all ${tool === ToolType.ADD_RED ? 'bg-slate-800 border-slate-700 border-red-500 shadow-[0_0_0_1px_#ef4444]' : 'bg-slate-800 border-slate-700 opacity-80'} text-red-400 ${isPlaying || winner !== null ? 'opacity-30 cursor-not-allowed' : ''}`}><span>🔴</span> <span className="hidden sm:inline">紅方</span></button>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    {/* Obstacle Tool with Type Selector */}
                    <div className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden">
                        <button
                            disabled={isPlaying || winner !== null}
                            onClick={() => setTool(ToolType.OBSTACLE)}
                            className={`px-3 py-1.5 text-[10px] font-bold flex items-center gap-1 transition-all hover:bg-slate-700 ${tool === ToolType.OBSTACLE ? 'bg-slate-700 text-white' : 'text-slate-400'} ${isPlaying || winner !== null ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            <span>🧱</span> <span className="hidden sm:inline">地形</span>
                        </button>
                        {/* Selector only shows if tool is OBSTACLE */}
                        {tool === ToolType.OBSTACLE && (
                            <div className="border-l border-slate-700 px-1 flex items-center bg-slate-700">
                                <select 
                                    className="bg-transparent text-[10px] text-white font-bold outline-none cursor-pointer w-20"
                                    value={selectedObstacle}
                                    onChange={(e) => setSelectedObstacle(e.target.value)}
                                >
                                    {Object.values(OBSTACLE_DB).map(obs => (
                                        <option key={obs.id} value={obs.id} className="bg-slate-800">{obs.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <button disabled={isPlaying || winner !== null} onClick={() => setTool(ToolType.DELETE)} className={`px-3 py-1.5 text-[10px] font-bold rounded border flex items-center gap-1 transition-all ${tool === ToolType.DELETE ? 'bg-slate-800 border-red-500 shadow-[0_0_0_1px_#ef4444]' : 'bg-slate-800 border-slate-700 opacity-80'} text-red-500 ${isPlaying || winner !== null ? 'opacity-30 cursor-not-allowed' : ''}`}><span>❌</span> <span className="hidden sm:inline">刪除</span></button>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center bg-slate-800 rounded px-2 py-1 border border-slate-700">
                        <span className="text-[9px] text-slate-500 mr-1">血量</span>
                        <input 
                            disabled={isPlaying || winner !== null}
                            type="number" 
                            className={`w-10 bg-transparent text-[10px] text-center focus:outline-none ${isPlaying || winner !== null ? 'opacity-50' : ''}`}
                            value={hpInput}
                            onChange={(e) => setHpInput(parseInt(e.target.value) || 1)}
                        />
                    </div>
                    
                    <button 
                        className="md:hidden p-2 bg-slate-800 border border-slate-700 rounded text-slate-400 active:bg-slate-700"
                        onClick={() => setShowMobileInspector(!showMobileInspector)}
                    >
                        ⚙️
                    </button>
                </div>
            </div>
        </div>

        {/* Resizer Handle: Hidden in Showcase */}
        {!isShowcaseMode && (
            <div 
                className="hidden md:flex w-2 bg-slate-950 hover:bg-blue-600 cursor-col-resize items-center justify-center shrink-0 transition-colors z-30"
                onMouseDown={startResizing}
            >
                <div className="w-1 h-8 bg-slate-700 rounded"></div>
            </div>
        )}

        {/* Inspector: Hidden in Showcase */}
        <div 
            className={`hidden md:flex flex-col shrink-0 z-10 shadow-xl bg-slate-900 border-l border-slate-700 transition-all duration-300 ${isShowcaseMode ? 'w-0 border-l-0 overflow-hidden' : ''}`}
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

        {showMobileInspector && !isShowcaseMode && (
            <div className="fixed inset-0 z-50 flex flex-col md:hidden animate-fade-in">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileInspector(false)}></div>
                <div className="absolute inset-x-2 bottom-2 top-12 bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden animate-slide-up">
                    <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-950 shrink-0">
                        <span className="font-bold text-slate-300 text-sm">監控面板</span>
                        <button 
                            onClick={() => setShowMobileInspector(false)}
                            className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded text-xs"
                        >
                            關閉 ✕
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
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
        )}
      </div>
    </div>
  );
}

export default App;
