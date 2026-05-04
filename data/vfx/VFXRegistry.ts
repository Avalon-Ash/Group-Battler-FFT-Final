
import { VFXAsset } from "../../types/VFXSchema";
import { SHARED_VFX } from "./registry/shared";
import { IMPERIAL_VFX } from "./registry/imperial";
import { COVENANT_VFX } from "./registry/covenant";
import { LAST_STAND_VFX } from "./registry/last_stand";
import { HAZARD_VFX } from "./registry/hazards";

// ==========================================
// 📚 VFX ASSET REGISTRY (AGGREGATOR)
// 
// This file aggregates distinct visual effect modules into a single lookup object.
// To add new effects, edit the files in 'data/vfx/registry/'.
// ==========================================

export const VFX_REGISTRY: Record<string, VFXAsset> = {
    ...SHARED_VFX,
    ...IMPERIAL_VFX,
    ...COVENANT_VFX,
    ...LAST_STAND_VFX,
    ...HAZARD_VFX
};

export { PROJECTILE_VISUALS } from "./projectile_visuals";
