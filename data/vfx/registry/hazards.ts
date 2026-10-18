import { VFXAsset } from "../../../types/VFXSchema";
import type { VFXRampId } from "../parts/vfxPalette";
import { part } from "./ult_parts";
import { groundRing } from "./basic_parts";

// ==========================================
// 危害場生成（HAZARD_SPAWN）的地面爆點（零件版）。
// 持續的場面由 HazardPainter 依 HAZARD_VISUALS 逐格繪製；這裡只負責「場出現的那一下」。
// EventVFXMapper 先用 HAZARD_VISUALS[type].spawnVfx（FIRE／POISON／ICE／GRAVITY 各有自己的命中特效），
// 沒有 spawnVfx 的型別（GENERIC）才播 FX_HAZARD_FIELD_<type>；tests/ReferenceIntegrity 要求每個型別都有這個鍵。
// 原版是 lifetime 4 s 的 GRID_FIELD（危害場改由 HazardPainter 繪製前的舊做法）。
// ==========================================

const FIELD_RAMPS: ReadonlyArray<readonly [string, VFXRampId]> = [
    ['FIRE', 'ASH_FIRE'],
    ['POISON', 'ASH_POISON'],
    ['ICE', 'LION_ICE'],
    ['GRAVITY', 'ASH_VOID'],
    ['GENERIC', 'STATUS_SLATE'],
];

function fieldBurst(id: string, ramp: VFXRampId): VFXAsset {
    return {
        id,
        emitters: [
            groundRing(ramp, 30, 1.4, 0.35, { thickness: 5 }),
            part({ particleType: 'PART_GROUND', part: { kind: 'glow', radius: 40, ramp }, count: 1, lifetime: 0.5, delay: 0, size: 40,
                partAnim: { fadeIn: 0.15, fadeOut: 0.7, alpha: 0.3 } }),
        ],
    };
}

export const HAZARD_VFX: Record<string, VFXAsset> = Object.fromEntries(
    FIELD_RAMPS.map(([type, ramp]) => [`FX_HAZARD_FIELD_${type}`, fieldBurst(`FX_HAZARD_FIELD_${type}`, ramp)]),
);
