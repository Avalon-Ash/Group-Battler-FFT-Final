
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, Agent } from './engine/game';
import GameCanvas from './components/GameCanvas';
import InspectorPanel from './components/InspectorPanel';
import { ToolType, Team, Skill, Role } from './types';

// UI Components
import { ShowcaseOverlay } from './components/ui/ShowcaseOverlay';
import { MapSettingsModal } from './components/ui/MapSettingsModal';
import { PlaybackHUD } from './components/ui/PlaybackHUD';
import { ControlDock } from './components/ui/ControlDock';

function App() {
  const engineRef = useRef(new GameEngine());
  
  // App States
  const [isShowcaseMode, setIsShowcaseMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  const [showMapSettings, setShowMapSettings] = useState(false);
  
  // Layout State (Responsive)
  const [isLargeScreen, setIsLargeScreen] = useState(() => window.innerWidth >= 1024);

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

  // --- Responsive Listener ---
  useEffect(() => {
      const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // --- Hybrid Input Resizing (Mouse & Touch) ---
  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      isResizing.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      // Prevent scrolling on touch
      if ('touches' in e) e.stopPropagation();
  }, []);

  const stopResizing = useCallback(() => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
  }, []);

  const performResize = useCallback((clientX: number) => {
      if (isResizing.current) {
          const newWidth = window.innerWidth - clientX;
          // Constraints for Tablet/Desktop
          const maxWidth = window.innerWidth * 0.8;
          if (newWidth > 300 && newWidth < maxWidth) {
              setSidebarWidth(newWidth);
          }
      }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => performResize(e.clientX), [performResize]);
  const handleTouchMove = useCallback((e: TouchEvent) => performResize(e.touches[0].clientX), [performResize]);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', stopResizing);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', stopResizing);
          window.removeEventListener('touchmove', handleTouchMove);
          window.removeEventListener('touchend', stopResizing);
      };
  }, [handleMouseMove, handleTouchMove, stopResizing]);

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

  const handleShowcaseStart = () => {
      setIsShowcaseMode(true);
      startShowcaseMatch();
  };

  // Helper to toggle tools (clicking active tool turns it off)
  const toggleTool = (t: ToolType) => {
      if (tool === t) setTool(ToolType.SELECT);
      else setTool(t);
  };

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans flex flex-col relative select-none touch-none">
      
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
        <MapSettingsModal 
            width={mapW} height={mapH} 
            onChangeW={setMapW} onChangeH={setMapH}
            onRebuild={updateMap} onClear={handleClear}
            onClose={() => setShowMapSettings(false)}
        />
      )}

      {/* SHOWCASE OVERLAY */}
      {isShowcaseMode && (
        <ShowcaseOverlay 
            onEnter={enterManualMode} 
            timeScale={timeScale} 
            setTimeScale={setTimeScale} 
        />
      )}

      {/* MAIN CONTENT ROW */}
      <div className="flex-1 flex overflow-hidden relative z-0">
          
          {/* LEFT COLUMN: Canvas + Dock + Floating HUD */}
          <div className="flex-1 flex flex-col relative min-w-0 min-h-0 z-0 basis-0 bg-slate-900">
                
                {/* FLOATING HUD */}
                <PlaybackHUD 
                    hidden={isShowcaseMode}
                    isPlaying={isPlaying}
                    winner={winner}
                    timeScale={timeScale}
                    onTogglePlay={togglePlay}
                    onRestart={handleRestart}
                    onSetTimeScale={setTimeScale}
                    onShowcase={handleShowcaseStart}
                />

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
                <ControlDock 
                    hidden={isShowcaseMode}
                    tool={tool}
                    setTool={setTool}
                    spawnMode={spawnMode}
                    setSpawnMode={setSpawnMode}
                    draftRole={draftRole}
                    setDraftRole={setDraftRole}
                    selectedObstacle={selectedObstacle}
                    setSelectedObstacle={setSelectedObstacle}
                    hpInput={hpInput}
                    setHpInput={setHpInput}
                    mapW={mapW}
                    setMapW={setMapW}
                    mapH={mapH}
                    setMapH={setMapH}
                    unitCount={unitCount}
                    onUpdateMap={updateMap}
                    onClearMap={handleClear}
                    showMapSettings={showMapSettings}
                    setShowMapSettings={setShowMapSettings}
                    showMobileInspector={showMobileInspector}
                    setShowMobileInspector={setShowMobileInspector}
                    hasSelectedAgent={!!selectedAgent}
                />
          </div>

          {/* RIGHT COLUMN: Inspector (Z-40) */}
          {isLargeScreen && !isShowcaseMode && (
            <div 
                className="hidden lg:flex w-1 bg-slate-950 hover:bg-cyan-600 cursor-col-resize items-center justify-center shrink-0 transition-colors z-40 border-l border-slate-800"
                onMouseDown={startResizing}
                onTouchStart={startResizing}
            >
                <div className="w-[1px] h-8 bg-slate-600"></div>
            </div>
          )}

          {/* Panel - Desktop Sidebar OR Mobile Overlay Drawer */}
          {isLargeScreen ? (
              // DESKTOP LAYOUT
              <div 
                className={`
                    flex flex-col z-40 shadow-2xl bg-slate-900 border-l border-slate-700 transition-all duration-300 relative h-full
                    ${isShowcaseMode ? 'w-0 border-l-0 overflow-hidden' : ''}
                `}
                style={{ width: !isShowcaseMode ? sidebarWidth : 0 }}
              >
                <InspectorPanel 
                    agent={selectedAgent} 
                    engine={engineRef.current}
                    logs={[]} 
                    db={engineRef.current.skillDB}
                    onHoverSkill={setHoveredSkill}
                />
              </div>
          ) : (
              // MOBILE DRAWER LAYOUT
              <div 
                className={`fixed inset-0 z-50 transition-opacity duration-300 ${showMobileInspector ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setShowMobileInspector(false)}
              >
                  {/* Backdrop */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                  
                  {/* Slide-in Panel */}
                  <div 
                    className={`absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-slate-900 shadow-2xl border-l border-slate-700 transform transition-transform duration-300 flex flex-col ${showMobileInspector ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                      {/* Mobile Header */}
                      <div className="p-4 border-b border-slate-700 bg-slate-950 flex justify-between items-center shrink-0 pt-safe-top">
                           <h3 className="font-bold text-slate-200 text-lg">單位監控面板</h3>
                           <button onClick={() => setShowMobileInspector(false)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-400 active:scale-95">✕</button>
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
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
