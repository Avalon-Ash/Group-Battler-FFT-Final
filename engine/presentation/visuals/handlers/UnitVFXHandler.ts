import { GameEvent } from "../../../../types";
import { GameEngine } from "../../../game";
import { VFXSystem } from "../../vfx";
import type { CameraImpactSink } from "../../ShakeDirector";
import { Point3D } from "../../../math/VisualMath";
import { HexUtils } from "../../../utils";
import { AOE_BREAK, aoeBreakFxId, castBreakFxId, castBreakBurstFxId } from "../../../../data/vfx/registry/cast_break";
import { VFX_PRESENTATION_PARAM } from "../../../../constants";

export class UnitVFXHandler {
    public static handle(event: GameEvent, engine: GameEngine, vfx: VFXSystem, impacts: CameraImpactSink, origin: Point3D, groundZ: number, hexKey?: string) {
        
        if (event.type === 'DEATH') {
            impacts.reportImpact('DEATH', VFX_PRESENTATION_PARAM.DEATH_TRAUMA, event.targetId ?? event.sourceId);
            return;
        }

        if (event.type === 'SPAWN') {
            const agent = engine.agents.find(a => a.id === event.sourceId);
            const isRed = agent?.team === 1; // Team.RED is 1
            const fxId = isRed ? 'FX_SPAWN_RED' : 'FX_SPAWN_BLUE';
            vfx.playEffect(fxId, origin.x, origin.y, groundZ, event.color, groundZ, undefined, hexKey);
            return;
        }

        if (event.type === 'CAST_BREAK') {
            const progress = event.value || VFX_PRESENTATION_PARAM.CAST_BREAK_DEFAULT_PROGRESS;
            const powerScale = 0.5 + progress;

            vfx.playEffect(castBreakBurstFxId(event.team), origin.x, origin.y, origin.z, undefined, groundZ, undefined, hexKey);
            vfx.playEffect(castBreakFxId(event.team), origin.x, origin.y, groundZ, undefined, groundZ, undefined, hexKey);
            if (event.hexes && event.hexes.length > 0) UnitVFXHandler.playAoeBreak(event, engine, vfx);
            
            if (event.skill && event.skill.tag === 'ULT') {
                impacts.reportImpact('CAST_BREAK_ULT', 0.5 * powerScale, event.sourceId);
                vfx.playEffect('FX_HIT_GENERIC', origin.x, origin.y, origin.z, undefined, groundZ, undefined, hexKey);
            } else {
                impacts.reportImpact('CAST_BREAK', VFX_PRESENTATION_PARAM.CAST_BREAK_TRAUMA * powerScale, event.sourceId); 
            }
            return;
        }
    }

    /** AOE 預警崩解（ART_SPEC §13）：由最外圈往中心依序熄滅 */
    private static playAoeBreak(event: GameEvent, engine: GameEngine, vfx: VFXSystem) {
        const hexes = event.hexes!;
        let sq = 0, sr = 0;
        for (const h of hexes) { sq += h.q; sr += h.r; }
        const center = HexUtils.round(sq / hexes.length, sr / hexes.length);
        let maxDist = 0;
        for (const h of hexes) maxDist = Math.max(maxDist, HexUtils.dist(h, center));
        for (const h of hexes) {
            const band = Math.min(AOE_BREAK.BANDS - 1, maxDist - HexUtils.dist(h, center));
            const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
            const z = engine.getTerrainHeight(h.q, h.r);
            vfx.playEffect(aoeBreakFxId(event.team, band), p.x, p.y, z, undefined, z, undefined, `${h.q},${h.r}`);
        }
    }
}
