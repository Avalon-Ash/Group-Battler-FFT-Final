import { Agent } from "../game";
import { HUD_BAR_OFFSET } from "../../constants";
import { HexUtils, MapConfig } from "../utils";
import { HUDSystem } from "../systems/hud";
import { VisualMath } from "../math/VisualMath";
import { BarPainter } from "./hud/BarPainter";
import { GaugePainter } from "./hud/GaugePainter";
import { TextPainter } from "./hud/TextPainter";

export class HUDRenderer {
    public draw(ctx: CanvasRenderingContext2D, hud: HUDSystem, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig, highlight: Agent | null, time: number) {
        agents.forEach(a => {
            if (a.hp <= 0 || a.spawnTimer > 0) return;
            
            let h = 0;
            if (a.isMoving && a.path.length > 0) {
                const startH = getTerrainHeight(a.q, a.r);
                const endH = getTerrainHeight(a.path[0].q, a.path[0].r);
                h = HexUtils.lerp(startH, endH, a.moveProgress);
            } else {
                const vHex = HexUtils.fromPx(a.px, a.py, mapConfig);
                h = getTerrainHeight(vHex.q, vHex.r);
            }

            // SSOT: Use Unified Projection Formula
            const anchorY = VisualMath.getEntityVisualY(a.py, h, a.physics.y, a.physics.z, -HUD_BAR_OFFSET);
            const headX = a.px + a.physics.x;

            const isSelected = (a === highlight);
            BarPainter.drawUnitBars(ctx, a, headX, anchorY, isSelected);
            GaugePainter.drawUnitStatusGauges(ctx, a, headX, anchorY);
        });
        TextPainter.drawFloatingText(ctx, hud);
    }
}