import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { UICommand } from './types';
import GameCanvas from './components/GameCanvas';
import { ShowcaseOverlay } from './components/ui/showcase/ShowcaseOverlay';
import { SystemMenu } from './components/ui/SystemMenu';
import { WindowLayer } from './components/ui/window/WindowLayer';
import { RegisteredWindows } from './components/ui/window/windowRegistry';
import { useWindowActions, useWindowState } from './hooks/useWindowStore';
import { FactionWarning } from './components/ui/FactionWarning';
import { useGameApp } from './hooks/useGameApp';
import { EngineProvider } from './hooks/useEnginePort';
import { useCompactViewport } from './hooks/useCompactViewport';

// PLAY 模式的畫面延遲載入：展示模式用不到，不進進入點（docs/plans/play-mode.md P4）
const PlaySetup = lazy(() => import('./components/ui/play/PlaySetup').then((m) => ({ default: m.PlaySetup })));
const PlayResult = lazy(() => import('./components/ui/play/PlayResult').then((m) => ({ default: m.PlayResult })));
const PlayHUD = lazy(() => import('./components/ui/play/PlayHUD').then((m) => ({ default: m.PlayHUD })));
// 地圖編輯工具列只在手動模式（HUD 開著）出現，首屏的展示模式用不到；延遲載入讓出進入點預算（WORKLOG §2 DF）
const MapEditorToolbar = lazy(() => import('./components/ui/MapEditorToolbar').then((m) => ({ default: m.MapEditorToolbar })));
// 播放列在展示模式與 PLAY 模式是隱藏的（hidden），首屏用不到；一樣延遲載入讓出進入點預算（ADR 0026 K3 前置）
const PlaybackHUD = lazy(() => import('./components/ui/PlaybackHUD').then((m) => ({ default: m.PlaybackHUD })));

function App() {
  const { engineRef, state, setters, actions } = useGameApp();
  const windowActions = useWindowActions();
  const monitorState = useWindowState('monitor');
  const isMonitorOpen = monitorState?.isOpen ?? false;
  const inspectorState = useWindowState('inspector');
  const isInspectorOpen = inspectorState?.isOpen ?? false;
  const prevSelectedAgentIdRef = useRef<string | null>(null);
  const quickCastRef = useRef<((slot: number) => UICommand | null) | null>(null);
  const [playSetupOpen, setPlaySetupOpen] = useState(false);
  const isCompact = useCompactViewport();

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

  const isGameOver = state.appMode === 'GAME_OVER';
  const hideHUD = state.isShowcaseMode || isGameOver || state.isPlayMode;

  const handleEnterManualMode = () => {
    windowActions.close('showcaseSettings');
    actions.enterManualMode();
  };

  return (
    <EngineProvider engine={engineRef.current}>
    <div data-hud={hideHUD ? 'off' : 'on'} className="h-dvh w-screen bg-surface-base text-fg-secondary overflow-hidden font-sans flex flex-col relative select-none">
      <FactionWarning show={state.showFactionWarning} />
      
      {state.isShowcaseMode && (
        <ShowcaseOverlay 
            onEnter={handleEnterManualMode}
            onPlay={() => setPlaySetupOpen(true)}
            battleSetup={state.battleSetup}
            engine={engineRef.current} 
            showDirectorMonitor={isMonitorOpen}
            setShowDirectorMonitor={(v: boolean) => (v ? windowActions.open('monitor') : windowActions.close('monitor'))}
        />
      )}

      <Suspense fallback={null}>
        {playSetupOpen && state.isShowcaseMode && (
          <PlaySetup
            isCompact={isCompact}
            onCancel={() => setPlaySetupOpen(false)}
            onStart={(hero) => { setPlaySetupOpen(false); actions.startPlay(hero); }}
          />
        )}
        {state.isPlayMode && state.playOutcome === null && (
          <PlayHUD onTogglePause={actions.togglePlay} quickCastRef={quickCastRef} />
        )}
        {state.playOutcome !== null && (
          <PlayResult
            outcome={state.playOutcome}
            isCompact={isCompact}
            onNext={actions.nextPlayMatch}
            onMenu={actions.exitPlay}
            onOpenLogs={() => windowActions.open('logs')}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <PlaybackHUD
            hidden={hideHUD}
            isPlaying={state.isPlaying}
            winner={state.winner}
            onTogglePlay={actions.togglePlay}
            onRestart={actions.handleReset}
            onRandom={actions.handleRandomBattlefield}
            onShowcase={actions.startShowcase}
        />
      </Suspense>
      {/* 有勝方就收起選單：手動模式的結算畫面，以及展示模式從分出勝負到下一局開打之間 */}
      {state.winner === null && (
          <SystemMenu 
              mode={state.appMode}
              onDownloadSpec={actions.downloadSpec}
              onLoadReplay={actions.loadReplay}
          />
      )}

      {/* Floating tool windows. RegisteredWindows keeps the windows whose modes include the current app mode. */}
      <WindowLayer>
          <RegisteredWindows
              onCloseInspector={() => actions.handleSelectAgent(null)}
              mode={state.appMode}
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
                isPlayMode={state.isPlayMode}
                spawnMode={state.spawnMode}
                draftRole={state.draftRole}
                draftBodyType={state.draftBodyType}
                onSelect={actions.handleSelectAgent} 
                winner={state.winner}
                winnerId={state.winnerId}
                winnerSide={state.winnerSide}
                battleSetup={state.battleSetup}
                rematch={actions.rematch}
                onReplay={actions.rewindToStart}
                onSaveReplay={actions.saveReplay}
                nextLevel={actions.handleNextLevel} 
                onOpenLogs={() => windowActions.open('logs')}
                quickCastRef={quickCastRef}
            />
      </div>
      {!hideHUD && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
    </EngineProvider>
  );
}

export default App;
