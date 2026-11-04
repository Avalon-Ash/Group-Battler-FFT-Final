import React, { createContext, useContext, useMemo } from 'react';
import type { GameEngine } from '../engine/game';
import { useEngineCommands } from './useEngineCommands';
import { useEngineView } from './useEngineView';

/**
 * UI 碰引擎的唯一入口（docs/UI_REFRESH_PLAN.md）。
 * components 用 useView(selector) 讀 view model、用 useCommands() 發指令，不收 GameEngine prop，
 * 也不 import engine/game。之後要換指令排程（tick 開頭處理、回放）只改這裡和 useEngineCommands。
 */
const EngineContext = createContext<GameEngine | null>(null);

export const EngineProvider: React.FC<{ engine: GameEngine; children: React.ReactNode }> = ({ engine, children }) => (
    <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
);

/** 只給 hooks 層的轉接函式用（技能圖示、特效縮圖等）；components 不准呼叫。 */
export function useEngineHandle(): GameEngine | null {
    return useContext(EngineContext);
}

export function useView<T>(selector: (engine: GameEngine) => T): T | null {
    return useEngineView(useContext(EngineContext), selector);
}

export function useCommands() {
    const engine = useContext(EngineContext);
    const commands = useEngineCommands(engine);
    return useMemo(() => commands, [commands]);
}
