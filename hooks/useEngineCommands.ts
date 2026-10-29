import { useCallback } from 'react';
import { GameEngine } from '../engine/game';
import { UICommand, Role } from '../types';

/**
 * Hook providing type-safe dispatchers for UICommands to engine.bus.
 */
export function useEngineCommands(engine: GameEngine | null | undefined) {
    const send = useCallback(
        (cmd: UICommand) => {
            if (!engine) return;
            engine.bus.emit('UI_COMMAND', cmd);
        },
        [engine]
    );

    const editAgent = useCallback(
        (
            agentId: string,
            updates: { role?: Role; maxHp?: number; hp?: number; maxMp?: number }
        ) => {
            send({ type: 'EDIT_AGENT', agentId, ...updates });
        },
        [send]
    );

    const rebuildAgentAI = useCallback(
        (agentId: string) => {
            send({ type: 'REBUILD_AGENT_AI', agentId });
        },
        [send]
    );

    return {
        send,
        editAgent,
        rebuildAgentAI,
    };
}
