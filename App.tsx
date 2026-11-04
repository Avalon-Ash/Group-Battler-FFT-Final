import React, { useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { ShowcaseOverlay } from './components/ui/showcase/ShowcaseOverlay';
import { PlaybackHUD } from './components/ui/PlaybackHUD';
import { MapEditorToolbar } from './components/ui/MapEditorToolbar';
import { SystemMenu } from './components/ui/SystemMenu';
import { WindowLayer } from './components/ui/window/WindowLayer';
import { RegisteredWindows } from './components/ui/window/windowRegistry';
import { useWindowActions, useWindowState } from './hooks/useWindowStore';
import { FactionWarning } from './components/ui/FactionWarning';
import { useGameApp } from './hooks/useGameApp';
import { EngineProvider } from './hooks/useEnginePort';

function App() {
  const { engineRef, state, setters, actions } = useGameApp();
  const windowActions = useWindowActions();
  const monitorState = useWindowState('monitor');
  const isMonitorOpen = monitorState?.isOpen ?? false;
  const inspectorState = useWindowState('inspector');
  const isInspectorOpen = inspectorState?.isOpen ?? false;
  const prevSelectedAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = state.selectedAgent?.id ?? null;
    const prevId = prevSelectedAgentIdRef.current;
    if (currentId !== prevId) {
      prevSelectedAgentIdRef.current = currentId;
      if (currentId && !isInspectorOpen) {
        windowActions.open('inspector');
      } else if (!currentId && isInspectorOpen) {
        windowActions.close('inspector');
      }
    }
  }, [state.selectedAgent, isInspectorOpen, windowActions]);

  const isGameOver = state.winner !== null;
  const hideHUD = state.isShowcaseMode || isGameOver;

  const handleEnterManualMode = () => {
    windowActions.close('showcaseSettings');
    actions.enterManualMode();
  };

  return (
    <EngineProvider engine={engineRef.current}>
    <div className="h-dvh w-screen bg-surface-base text-fg-secondary overflow-hidden font-sans flex flex-col relative select-none">
      <FactionWarning show={state.showFactionWarning} />
      
      {state.isShowcaseMode && (
        <ShowcaseOverlay 
            onEnter={handleEnterManualMode}
            battleSetup={state.battleSetup}
            engine={engineRef.current} 
            showDirectorMonitor={isMonitorOpen}
            setShowDirectorMonitor={(v: boolean) => (v ? windowActions.open('monitor') : windowActions.close('monitor'))}
        />
      )}

      <PlaybackHUD 
          hidden={hideHUD}
          isPlaying={state.isPlaying}
          winner={state.winner}
          onTogglePlay={actions.togglePlay}
          onRestart={actions.handleReset}
          onRandom={actions.handleRandomBattlefield} 
          onShowcase={() => { setters.setIsShowcaseMode(true); actions.startShowcaseMatch(); }}
      />
      {!isGameOver && (
          <SystemMenu 
              mode={state.isShowcaseMode ? 'showcase' : 'manual'}
              onDownloadSpec={actions.downloadSpec}
          />
      )}

      {/* Floating tool windows. RegisteredWindows filters by visibleInShowcase in showcase mode. */}
      <WindowLayer>
          <RegisteredWindows
              onCloseInspector={() => actions.handleSelectAgent(null)}
              showcaseMode={state.isShowcaseMode}
              isGameOver={isGameOver}
          />
      </WindowLayer>

      <div className="flex-1 min-h-0 relative z-0 bg-surface-panel touch-none">
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
                draftBodyType={state.draftBodyType}
                onSelect={actions.handleSelectAgent} 
                winner={state.winner}
                winnerId={state.winnerId}
                winnerSide={state.winnerSide}
                battleSetup={state.battleSetup}
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
              draftBodyType={state.draftBodyType} setDraftBodyType={setters.setDraftBodyType}
              hpInput={state.hpInput} setHpInput={setters.setHpInput}
              selectedObstacle={state.selectedObstacle} setSelectedObstacle={setters.setSelectedObstacle}
              hexLayout={state.hexLayout} onSetLayout={actions.handleUpdateLayout}
          />
      )}
    </div>
    </EngineProvider>
  );
}

export default App;
