import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { groundRing } from "./basic_parts";

// 縮圈終局（Last Stand）：鎖定格子的地面脈衝（零件版；原 SHOCKWAVE 80～120、紫色 screen）
export const LAST_STAND_VFX: Record<string, VFXAsset> = {
    'FX_LAST_STAND_LOCKED': {
        id: 'FX_LAST_STAND_LOCKED',
        description: 'Ground EMP for Last Stand entry',
        emitters: [
            groundRing('ASH_VOID', 48, 1.8, 0.4, { thickness: 6 }),
            part({ particleType: 'PART_GROUND', part: { kind: 'glow', radius: 44, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.4, delay: 0, size: 44,
                partAnim: { scaleFrom: 0.8, scaleTo: 1.2, fadeOut: 0.8, alpha: 0.35 } }),
        ],
    },
};
