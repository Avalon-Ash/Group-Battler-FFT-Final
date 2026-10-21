
import { VFXAsset } from "../../types/VFXSchema";
import { IMPERIAL_VFX } from "./registry/imperial";
import { COVENANT_VFX } from "./registry/covenant";
import { LAST_STAND_VFX } from "./registry/last_stand";
import { HAZARD_VFX } from "./registry/hazards";
import { ULT_PART_VFX, ULT_IMPACT_VFX } from "./registry/ult_parts";
import { ULT_PART_VFX_BLUE } from "./registry/ult_parts_blue";
import { ULT_PART_VFX_RED } from "./registry/ult_parts_red";
import { ULT_PART_VFX_STORM } from "./registry/ult_parts_storm";
import { BASIC_PART_VFX } from "./registry/basic_parts";
import { ACTIVE_PART_VFX } from "./registry/active_parts";
import { CAST_BREAK_VFX } from "./registry/cast_break";
import { SHARED_PART_VFX } from "./registry/shared_parts";
import { MELEE_PART_VFX } from "./registry/melee_parts";

// ==========================================
// 📚 VFX ASSET REGISTRY (AGGREGATOR)
// 
// This file aggregates distinct visual effect modules into a single lookup object.
// To add new effects, edit the files in 'data/vfx/registry/'.
// ==========================================

export const VFX_REGISTRY: Record<string, VFXAsset> = {
    ...IMPERIAL_VFX,
    ...COVENANT_VFX,
    ...LAST_STAND_VFX,
    ...HAZARD_VFX,
    ...ULT_PART_VFX,
    ...ULT_IMPACT_VFX,
    ...ULT_PART_VFX_BLUE,
    ...ULT_PART_VFX_RED,
    ...ULT_PART_VFX_STORM,
    ...BASIC_PART_VFX,
    ...ACTIVE_PART_VFX,
    ...CAST_BREAK_VFX,
    ...SHARED_PART_VFX,
    ...MELEE_PART_VFX,
};

