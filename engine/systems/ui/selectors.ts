import { GameEngine } from '../../game';
import {
    AgentView,
    DirectorView,
    ZoneView,
    CameraTuningView,
    LogView,
    GamePlaybackView,
} from '../../../types/UIViewModel';
import { Skill } from '../../../types';

const agentViewCache = new Map<string, AgentView>();
let prevDirectorView: DirectorView | null = null;
let prevZoneView: ZoneView | null = null;
let prevCameraTuningView: CameraTuningView | null = null;
let prevLogView: LogView | null = null;
let prevPlaybackView: GamePlaybackView | null = null;

/**
 * Resets selector memoization caches. Primarily used in unit tests.
 */
export function clearSelectorCache(): void {
    agentViewCache.clear();
    prevDirectorView = null;
    prevZoneView = null;
    prevCameraTuningView = null;
    prevLogView = null;
    prevPlaybackView = null;
}

/**
 * Returns a stable read-only AgentView for the given agentId.
 * If properties have not changed since last query, returns the identical object reference.
 */
export function selectAgentView(
    engine: GameEngine,
    agentId: string | null | undefined
): AgentView | null {
    if (!agentId) return null;
    const agent = engine.agents.find((a) => a.id === agentId);
    if (!agent) return null;

    const prev = agentViewCache.get(agentId);

    const isDead = agent.hp <= 0 || agent.banished || agent.fullyDead;
    const targetId = agent.target ? agent.target.id : (agent.tauntTargetId ?? undefined);
    const targetHex = agent.targetHex ? { q: agent.targetHex.q, r: agent.targetHex.r } : undefined;

    const currentCastSkill =
        agent.castingSkillIdx >= 0 ? (agent.skills[agent.castingSkillIdx] ?? null) : null;
    const castProgress =
        currentCastSkill && currentCastSkill.cast > 0
            ? Math.min(1, agent.castTimer / currentCastSkill.cast)
            : 0;

    const skills = agent.skills.filter((s): s is Skill => s !== null);

    if (
        prev &&
        prev.hp === agent.hp &&
        prev.maxHp === agent.maxHp &&
        prev.mp === agent.mp &&
        prev.maxMp === agent.maxMp &&
        prev.shield === agent.shield &&
        prev.q === agent.q &&
        prev.r === agent.r &&
        prev.role === agent.role &&
        prev.animState === agent.animState &&
        prev.isDead === isDead &&
        prev.targetId === targetId &&
        prev.currentCastSkill === currentCastSkill &&
        prev.castProgress === castProgress &&
        prev.skills.length === skills.length
    ) {
        return prev;
    }

    const next: AgentView = {
        id: agent.id,
        team: agent.team,
        role: agent.role,
        hp: agent.hp,
        maxHp: agent.maxHp,
        mp: agent.mp,
        maxMp: agent.maxMp,
        shield: agent.shield,
        q: agent.q,
        r: agent.r,
        animState: agent.animState,
        isDead,
        targetId,
        targetHex,
        currentCastSkill,
        castProgress,
        skills,
    };

    agentViewCache.set(agentId, next);
    return next;
}

/**
 * Returns a stable read-only DirectorView snapshot.
 */
export function selectDirectorView(engine: GameEngine): DirectorView {
    const enabled = Boolean(engine.director.enabled);
    const targetAgentId = engine.state.director.targetId;
    const targetAgent = targetAgentId ? selectAgentView(engine, targetAgentId) : null;

    if (
        prevDirectorView &&
        prevDirectorView.enabled === enabled &&
        prevDirectorView.targetAgentId === targetAgentId &&
        prevDirectorView.targetAgent === targetAgent
    ) {
        return prevDirectorView;
    }

    const next: DirectorView = {
        enabled,
        targetAgentId,
        targetAgent,
    };

    prevDirectorView = next;
    return next;
}

/**
 * Returns a stable read-only ZoneView snapshot.
 */
export function selectZoneView(engine: GameEngine): ZoneView {
    const enabled = Boolean(engine.zoneConfig.enabled);
    const currentRadius = engine.zones.safeRadius ?? engine.zoneConfig.initialRadius;
    const initialRadius = engine.zoneConfig.initialRadius;
    const shrinkInterval = engine.zoneConfig.shrinkInterval;
    const minRadius = engine.zoneConfig.minRadius;
    const nextShrinkCountdown = Math.max(0, Math.round(engine.zones.shrinkTimer ?? 0));
    const isLastStand = Boolean(engine.state.isLastStand);

    if (
        prevZoneView &&
        prevZoneView.enabled === enabled &&
        prevZoneView.currentRadius === currentRadius &&
        prevZoneView.initialRadius === initialRadius &&
        prevZoneView.shrinkInterval === shrinkInterval &&
        prevZoneView.minRadius === minRadius &&
        prevZoneView.nextShrinkCountdown === nextShrinkCountdown &&
        prevZoneView.isLastStand === isLastStand
    ) {
        return prevZoneView;
    }

    const next: ZoneView = {
        enabled,
        currentRadius,
        initialRadius,
        shrinkInterval,
        minRadius,
        nextShrinkCountdown,
        isLastStand,
    };

    prevZoneView = next;
    return next;
}

/**
 * Returns a stable read-only CameraTuningView snapshot.
 */
export function selectCameraTuningView(engine: GameEngine): CameraTuningView {
    const followStiffness = engine.renderer?.camera.followStiffness ?? 3.5;
    const zoomStiffness = engine.renderer?.camera.zoomStiffness ?? 3.5;

    if (
        prevCameraTuningView &&
        prevCameraTuningView.followStiffness === followStiffness &&
        prevCameraTuningView.zoomStiffness === zoomStiffness
    ) {
        return prevCameraTuningView;
    }

    const next: CameraTuningView = {
        followStiffness,
        zoomStiffness,
    };

    prevCameraTuningView = next;
    return next;
}

/**
 * Returns a stable read-only LogView snapshot.
 */
export function selectLogView(engine: GameEngine): LogView {
    const logs = engine.logs;
    const totalCount = logs.length;

    if (
        prevLogView &&
        prevLogView.totalCount === totalCount &&
        prevLogView.logs === logs
    ) {
        return prevLogView;
    }

    const next: LogView = {
        logs,
        totalCount,
    };

    prevLogView = next;
    return next;
}

/**
 * Returns a stable read-only GamePlaybackView snapshot.
 */
export function selectGamePlaybackView(engine: GameEngine): GamePlaybackView {
    const isRunning = engine.isRunning;
    const timeScale = engine.state.time.timeScale;
    const turn = Math.floor(engine.state.time.battleTime);
    const winner = engine.state.victory.winningTeam;

    if (
        prevPlaybackView &&
        prevPlaybackView.isRunning === isRunning &&
        prevPlaybackView.timeScale === timeScale &&
        prevPlaybackView.turn === turn &&
        prevPlaybackView.winner === winner
    ) {
        return prevPlaybackView;
    }

    const next: GamePlaybackView = {
        isRunning,
        timeScale,
        turn,
        winner,
    };

    prevPlaybackView = next;
    return next;
}
