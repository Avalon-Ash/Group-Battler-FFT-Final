// ╔══════════════════════════════════════════════════════════╗
// ║  views/l2 — L2 設定視窗唯讀快照與查詢                      ║
// ║  職責：將引擎運鏡、玩法、音訊狀態轉為純資料，供 UI 投影     ║
// ║  [ARCH] 內容沒變時回傳同一個物件，避免無限重繪             ║
// ╚══════════════════════════════════════════════════════════╝
import type { GameEngine } from '../../../game';
import { UI_SETTINGS, SHAKE_DIRECTOR_PARAM } from '../../../../constants';
import { querySpawnableHexes } from '../editorQueries';
import { cuesInExclusiveGroup, hasCueFiles } from '../../../audio/localAudioProbe';
import type { DirectorSettingsViewModel, GameplaySettingsViewModel } from '../../../../types/ui/l2';

interface CacheEntry<T> {
    signature: string;
    view: T;
}

const directorCaches = new WeakMap<GameEngine, CacheEntry<DirectorSettingsViewModel>>();
const gameplayCaches = new WeakMap<GameEngine, CacheEntry<GameplaySettingsViewModel>>();

export function selectDirectorSettingsView(engine: GameEngine): DirectorSettingsViewModel {
    const directorEnabled = engine.director?.enabled ?? true;
    const followStiffness = engine.renderer?.camera?.followStiffness ?? UI_SETTINGS.CAMERA_STIFFNESS.followDefault;
    const zoomStiffness = engine.renderer?.camera?.zoomStiffness ?? UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault;
    const shakeTuning = engine.director?.getShakeTuning?.();
    const shakeStrength = shakeTuning?.strength ?? SHAKE_DIRECTOR_PARAM.DEFAULT_STRENGTH;
    const shakeOffFocus = shakeTuning?.offFocusScale ?? SHAKE_DIRECTOR_PARAM.OFF_FOCUS_SCALE;
    const shakeMax = shakeTuning?.maxTrauma ?? SHAKE_DIRECTOR_PARAM.MAX_TRAUMA;

    const signature = `${directorEnabled}|${followStiffness}|${zoomStiffness}|${shakeStrength}|${shakeOffFocus}|${shakeMax}`;
    const cached = directorCaches.get(engine);
    if (cached && cached.signature === signature) {
        return cached.view;
    }

    const view: DirectorSettingsViewModel = Object.freeze({
        directorEnabled,
        followStiffness,
        zoomStiffness,
        shakeStrength,
        shakeOffFocus,
        shakeMax,
    });
    directorCaches.set(engine, { signature, view });
    return view;
}

export function selectGameplaySettingsView(engine: GameEngine): GameplaySettingsViewModel {
    const zoneEnabled = engine.zoneConfig?.enabled ?? true;
    const initialRadius = engine.zoneConfig?.initialRadius ?? UI_SETTINGS.ZONE_INITIAL_RADIUS.default;
    const shrinkInterval = engine.zoneConfig?.shrinkInterval ?? UI_SETTINGS.ZONE_SHRINK_INTERVAL.default;
    const minRadius = engine.zoneConfig?.minRadius ?? UI_SETTINGS.ZONE_MIN_RADIUS.default;
    const factions = engine.battleSetup?.factions ?? UI_SETTINGS.BATTLE_FACTIONS.default;
    const unitsPerFaction = engine.battleSetup?.unitsPerFaction ?? UI_SETTINGS.BATTLE_UNITS_PER_FACTION.default;
    const pool = Math.min(querySpawnableHexes(engine).length - 1, UI_SETTINGS.BATTLE_MAX_UNITS);
    const battleFactionsMax = Math.max(UI_SETTINGS.BATTLE_FACTIONS.min, pool);
    const battleUnitsMax = Math.max(1, Math.floor(pool / Math.max(1, factions)));

    const signature = `${zoneEnabled}|${initialRadius}|${shrinkInterval}|${minRadius}|${factions}|${unitsPerFaction}|${battleFactionsMax}|${battleUnitsMax}`;
    const cached = gameplayCaches.get(engine);
    if (cached && cached.signature === signature) {
        return cached.view;
    }

    const view: GameplaySettingsViewModel = Object.freeze({
        zoneEnabled,
        initialRadius,
        shrinkInterval,
        minRadius,
        battleFactions: factions,
        battleUnitsPerFaction: unitsPerFaction,
        battleFactionsMax,
        battleUnitsMax,
    });
    gameplayCaches.set(engine, { signature, view });
    return view;
}

/** 擊殺播報語音檔是否存在（只放本機的版權音檔） */
export async function checkAnnouncerAvailable(): Promise<boolean> {
    return hasCueFiles(cuesInExclusiveGroup('ANNOUNCER'));
}
