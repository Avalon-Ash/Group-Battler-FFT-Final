
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, Agent } from './engine/game';
import GameCanvas from './components/GameCanvas';
import { ToolType, Team, Skill, Role } from './types';
import { SCENE_DB } from './data/scenes';

// UI Components
import { ShowcaseOverlay } from './components/ui/ShowcaseOverlay';
import { PlaybackHUD } from './components/ui/PlaybackHUD';
import { MapEditorToolbar } from './components/ui/MapEditorToolbar';
import { UnitInspectorHUD } from './components/ui/UnitInspectorHUD';
import { SystemMenu } from './components/ui/SystemMenu';
import { UnitDetailView } from './components/ui/UnitDetailView';

// Independent Tab Contents
import { LogTab } from './components/inspector/tabs/LogTab';
import { SkillDbTab } from './components/inspector/tabs/SkillDbTab';

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
  const [currentSceneId, setCurrentSceneId] = useState('VOID');
  
  // Spawn Logic
  const [spawnMode, setSpawnMode] = useState<'RANDOM' | 'DRAFT'>('RANDOM');
  const [draftRole, setDraftRole] = useState<Role>(Role.WARRIOR);

  // Modals
  const [showLogs, setShowLogs] = useState(false);
  const [showDB, setShowDB] = useState(false);
  const [showUnitDetail, setShowUnitDetail] = useState(false);
  
  const [transitionPhase, setTransitionPhase] = useState<'IDLE' | 'IN' | 'OUT'>('IDLE');
  const [showFactionWarning, setShowFactionWarning] = useState(false);

  // --- Logic ---

  const setupShowcaseMap = useCallback(() => {
      const engine = engineRef.current;
      engine.stop();
      setWinner(null);
      setSelectedAgent(null);
      setShowUnitDetail(false); // Close details on reset
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
      setMapW(engineRef.current.mapConfig.w);
      setMapH(engineRef.current.mapConfig.h);
      setCurrentSceneId(engineRef.current.currentScene.id);
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

  // --- Map Editor Logic ---

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

  const handleReset = useCallback(() => {
      engineRef.current.restart();
      setIsPlaying(false); 
      setWinner(null);
  }, []);

  // --- Interaction ---

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

  const handleSelectAgent = (a: Agent | null) => {
      setSelectedAgent(a);
      if (!a) setShowUnitDetail(false);
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

      {/* SHOWCASE OVERLAY */}
      {isShowcaseMode && (
        <ShowcaseOverlay 
            onEnter={enterManualMode} 
            timeScale={timeScale} 
            setTimeScale={setTimeScale} 
        />
      )}

      {/* --- HUD LAYERS --- */}
      
      {/* 1. Playback Controls (Top Center) */}
      <PlaybackHUD 
          hidden={isShowcaseMode}
          isPlaying={isPlaying}
          winner={winner}
          timeScale={timeScale}
          onTogglePlay={togglePlay}
          onRestart={handleReset}
          onSetTimeScale={setTimeScale}
          onShowcase={() => { setIsShowcaseMode(true); startShowcaseMatch(); }}
      />

      {/* 2. System Menu (Top Right) */}
      {!isShowcaseMode && (
          <SystemMenu 
              onToggleLogs={() => setShowLogs(!showLogs)} 
              onToggleDB={() => setShowDB(!showDB)} 
          />
      )}

      {/* 3. Unit Inspector (Floating Right Bottom) */}
      {!isShowcaseMode && selectedAgent && (
          <UnitInspectorHUD 
              agent={selectedAgent} 
              onClose={() => handleSelectAgent(null)} 
              onExpand={() => setShowUnitDetail(true)}
          />
      )}

      {/* 4. MODALS (Logs / DB / Unit Detail) */}
      {/* Wrapper */}
      {(showLogs || showDB || (showUnitDetail && selectedAgent)) && !isShowcaseMode && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-fade-in" 
               onClick={() => { setShowLogs(false); setShowDB(false); setShowUnitDetail(false); }}>
              
              {/* Maximize modal size for better visibility */}
              <div className="w-full h-[95%] max-w-[95%] bg-slate-900 border border-slate-700 shadow-2xl rounded-lg overflow-hidden flex flex-col transition-all" onClick={e => e.stopPropagation()}>
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center p-3 md:p-4 border-b border-slate-800 bg-slate-950 shrink-0">
                      <h2 className="text-base md:text-lg font-bold text-cyan-400 truncate pr-4">
                          {showLogs && '戰況紀錄'}
                          {showDB && '技能資料庫'}
                          {showUnitDetail && '單位神經網路分析'}
                      </h2>
                      <button onClick={() => { setShowLogs(false); setShowDB(false); setShowUnitDetail(false); }} className="text-slate-500 hover:text-white px-2 py-1">✕</button>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="flex-1 overflow-hidden relative bg-slate-900 min-h-0">
                      {showLogs && <LogTab engine={engineRef.current} />}
                      {showDB && <SkillDbTab db={engineRef.current.skillDB} onUpdate={() => {}} />}
                      {showUnitDetail && selectedAgent && <UnitDetailView agent={selectedAgent} db={engineRef.current.skillDB} engine={engineRef.current} />}
                  </div>
              </div>
          </div>
      )}

      {/* MAIN GAME VIEW */}
      <div className="flex-1 relative z-0 bg-slate-900">
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
      </div>

      {/* 5. Map Editor Toolbar (Bottom) */}
      {!isShowcaseMode && (
          <MapEditorToolbar 
              tool={tool}
              setTool={setTool}
              mapW={mapW} setMapW={(w) => handleUpdateMapSize(w, mapH)}
              mapH={mapH} setMapH={(h) => handleUpdateMapSize(mapW, h)}
              currentSceneId={currentSceneId}
              onSetScene={handleSetScene}
              spawnMode={spawnMode} setSpawnMode={setSpawnMode}
              draftRole={draftRole} setDraftRole={setDraftRole}
              hpInput={hpInput} setHpInput={setHpInput}
              selectedObstacle={selectedObstacle} setSelectedObstacle={setSelectedObstacle}
              onRandomBattlefield={handleRandomBattlefield}
              onReset={handleReset}
          />
      )}
    </div>
  );
}

export default App;
