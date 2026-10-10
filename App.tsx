import React from 'react';
import GameCanvas from './components/GameCanvas';
import { ShowcaseOverlay } from './components/ui/showcase/ShowcaseOverlay';
import { PlaybackHUD } from './components/ui/PlaybackHUD';
import { MapEditorToolbar } from './components/ui/MapEditorToolbar';
import { UnitInspectorHUD } from './components/ui/UnitInspectorHUD';
import { SystemMenu } from './components/ui/SystemMenu';
import { WindowLayer } from './components/ui/window/WindowLayer';
import { RegisteredWindows } from './components/ui/window/windowRegistry';
import { useWindowActions, useWindowState } from './hooks/useWindowStore';
import { Icons } from './components/ui/icons';
import { useGameApp } from './hooks/useGameApp';


function App() {
  const { engineRef, state, setters, actions } = useGameApp();
  const windowActions = useWindowActions();
  const monitorState = useWindowState('monitor');
  const isMonitorOpen = monitorState?.isOpen ?? false;
  const isGameOver = state.winner !== null;
  const hideHUD = state.isShowcaseMode || isGameOver;

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans flex flex-col relative select-none touch-none">
      {state.showFactionWarning && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-in pointer-events-none w-[90%] max-w-md">
                <div className="liquid-glass px-6 py-3 rounded-full border-red-500/50 flex items-center gap-3 shadow-xl text-red-200 bg-red-950/80">
                    <Icons.Warning className="w-6 h-6 text-red-400" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-widest text-red-400 uppercase">部署錯誤</span>
                        <span className="text-xs">請部署雙方單位以開始戰鬥。</span>
                    </div>
                </div>
            </div>
      )}
      
      {state.isShowcaseMode && (
        <ShowcaseOverlay 
            onEnter={actions.enterManualMode} 
            timeScale={state.timeScale} 
            setTimeScale={setters.setTimeScale} 
            engine={engineRef.current} 
            showDirectorMonitor={isMonitorOpen}
            setShowDirectorMonitor={(v: boolean) => (v ? windowActions.open('monitor') : windowActions.close('monitor'))}
        />
      )}

      <PlaybackHUD 
          hidden={hideHUD}
          isPlaying={state.isPlaying}
          winner={state.winner}
          timeScale={state.timeScale}
          onTogglePlay={actions.togglePlay}
          onRestart={actions.handleReset}
          onRandom={actions.handleRandomBattlefield} 
          onSetTimeScale={setters.setTimeScale}
          onShowcase={() => { setters.setIsShowcaseMode(true); actions.startShowcaseMatch(); }}
      />
      {!hideHUD && (
          <SystemMenu 
              onDownloadSpec={actions.downloadSpec}
              engine={engineRef.current} 
          />
      )}


      {!hideHUD && state.selectedAgent && (
          <UnitInspectorHUD 
              agent={state.selectedAgent} 
              engine={engineRef.current}
              onClose={() => actions.handleSelectAgent(null)} 
          />
      )}
      {/* Floating tool windows. RegisteredWindows filters by visibleInShowcase in showcase mode. */}
      <WindowLayer>
          <RegisteredWindows engine={engineRef.current} showcaseMode={state.isShowcaseMode} />
      </WindowLayer>

      <div className="flex-1 relative z-0 bg-slate-900">
            <GameCanvas 
                engine={engineRef.current} 
                tool={state.tool}
                selectedObstacle={state.selectedObstacle}
                hpInput={state.hpInput}
                selectedAgent={state.selectedAgent}
                hoveredSkill={state.hoveredSkill}
                isShowcaseMode={state.isShowcaseMode}
                spawnMode={state.spawnMode}
                draftRole={state.draftRole}
                onSelect={actions.handleSelectAgent} 
                winner={state.winner}
                rematch={actions.rematch}
                nextLevel={actions.handleNextLevel} 
                transitionPhase={state.transitionPhase}
                onOpenLogs={() => windowActions.open('logs')}
            />
      </div>
      {!hideHUD && (
          <MapEditorToolbar 
              tool={state.tool}
              setTool={setters.setTool}
              mapW={state.mapW} setMapW={(w) => actions.handleUpdateMapSize(w, state.mapH)}
              mapH={state.mapH} setMapH={(h) => actions.handleUpdateMapSize(state.mapW, h)}
              currentSceneId={state.currentSceneId}
              onSetScene={actions.handleSetScene}
              spawnMode={state.spawnMode} setSpawnMode={setters.setSpawnMode}
              draftRole={state.draftRole} setDraftRole={setters.setDraftRole}
              hpInput={state.hpInput} setHpInput={setters.setHpInput}
              selectedObstacle={state.selectedObstacle} setSelectedObstacle={setters.setSelectedObstacle}
              hexLayout={state.hexLayout} onSetLayout={actions.handleUpdateLayout}
          />
      )}
    </div>
  );
}

export default App;