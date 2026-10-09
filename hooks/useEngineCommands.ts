import { useCallback } from 'react';
import { GameEngine } from '../engine/game';
import { UICommand, Role, ZoneConfig } from '../types';

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

    const setDirectorEnabled = useCallback(
        (enabled: boolean) => {
            send({ type: 'SET_DIRECTOR_ENABLED', enabled });
        },
        [send]
    );

    const setCameraTuning = useCallback(
        (tuning: { followStiffness?: number; zoomStiffness?: number }) => {
            send({ type: 'SET_CAMERA_TUNING', ...tuning });
        },
        [send]
    );

    const setZoneConfig = useCallback(
        (config: Partial<ZoneConfig>) => {
            send({ type: 'SET_ZONE_CONFIG', config });
        },
        [send]
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

    const resetGame = useCallback(() => {
        send({ type: 'RESET_GAME' });
    }, [send]);

    const pauseGame = useCallback(() => {
        send({ type: 'PAUSE_GAME' });
    }, [send]);

    const resumeGame = useCallback(() => {
        send({ type: 'RESUME_GAME' });
    }, [send]);

    const setTimeScale = useCallback(
        (timeScale: number) => {
            send({ type: 'SET_TIME_SCALE', timeScale });
        },
        [send]
    );

    return {
        send,
        setDirectorEnabled,
        setCameraTuning,
        setZoneConfig,
        editAgent,
        rebuildAgentAI,
        resetGame,
        pauseGame,
        resumeGame,
        setTimeScale,
    };
}
