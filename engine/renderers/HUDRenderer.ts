
import { Agent } from "../game";
import { UNIT_VISUAL_HEIGHT, HUD_PADDING } from "../../constants";
import { HexUtils, MapConfig } from "../utils";
import { HUDSystem } from "../systems/hud";

// Sub-painters
import { BarPainter } from "./hud/BarPainter";
import { GaugePainter } from "./hud/GaugePainter";
import { TextPainter } from "./hud/TextPainter";

export class HUDRenderer {

    public draw(ctx: CanvasRenderingContext2D, hud: HUDSystem, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig, highlight: Agent | null, time: number) {
        agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.spawnTimer > 0) return; 
            
            let h = 0;
            if (a.isMoving && a.path.length > 0) {
                const startH = getTerrainHeight(a.q, a.r);
                const endHex = a.path[0];
                const endH = getTerrainHeight(endHex.q, endHex.r);
                h = HexUtils.lerp(startH, endH, a.moveProgress);
            } else {
                const visualHex = HexUtils.fromPx(a.px, a.py, mapConfig);
                h = getTerrainHeight(visualHex.q, visualHex.r);
            }

            const groundY = a.py - h;
            const physicsOffsetY = a.physics.y - a.physics.z; 
            const anchorY = groundY - UNIT_VISUAL_HEIGHT + physicsOffsetY - HUD_PADDING;
            const headX = a.px + a.physics.x;

            const isSelected = (a === highlight);
            
            // Delegate to specialized painters
            BarPainter.drawUnitBars(ctx, a, headX, anchorY, isSelected);
            GaugePainter.drawUnitStatusGauges(ctx, a, headX, anchorY);
        });

        TextPainter.drawFloatingText(ctx, hud);
    }
}
