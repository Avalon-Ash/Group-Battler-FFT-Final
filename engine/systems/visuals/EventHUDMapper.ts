
import { GameEvent, GameEventType } from "../../../types";
import { GameEngine } from "../../game";
import { HUDSystem } from "../hud";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { HUD_TEXT_OFFSET } from "../../../constants";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

export class EventHUDMapper {

    public reset() {
        // No local state needed anymore
    }

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const terrainHeight = grid.getTerrainHeight(hex.q, hex.r, engine);
        const visualGroundY = event.pos.y - terrainHeight;
        
        switch (event.type) {
            case 'DAMAGE':
            case 'HEAL':
            case 'CC_APPLIED':
                this.handleCombatText(event, visualGroundY, hud);
                break;
            case 'CAST_START':
                this.handleCastText(event, visualGroundY, hud);
                break;
            case 'KILL_STREAK':
                // Now we just handle the visual text spawning, logic is upstream
                if (event.text && event.color) {
                    // Larger text, positioned higher
                    const textY = visualGroundY - HUD_TEXT_OFFSET - 40;
                    const size = 32 + ((event.value || 1) * 4); // Scale by rank
                    hud.addFloatingText(event.pos.x, textY, event.text, event.color, size, 'KILL_STREAK');
                    
                    // Camera trauma from the event
                    camera.addTrauma(0.2 + (event.value || 0) * 0.1);
                }
                break;
        }
    }

    private handleCombatText(event: GameEvent, visualY: number, hud: HUDSystem) {
        const baseY = visualY - HUD_TEXT_OFFSET; 
        let text = "";
        let color = "#fff";
        let size = 16;
        let type: 'DAMAGE' | 'HEAL' | 'CC' = 'DAMAGE';
        let xOffset = 0;

        if (event.type === 'DAMAGE') {
            const val = Math.abs(event.value || 0);
            text = val.toString();
            const isCrit = val > 100;
            
            // 2. TEXT COLORING LOGIC
            const isDot = event.skill?.ccType === 'DOT';
            
            if (isDot) {
                // Use registered poison color if available, or lime
                color = STATUS_VISUALS['POISON']?.primaryColor || '#a3e635';
            } else if (isCrit) {
                color = '#ef4444'; // Red for Crit
            } else {
                color = '#fff';    // White for normal
            }
            
            size = isCrit ? 24 : 16;
            type = 'DAMAGE';
            xOffset = (Math.random() - 0.5) * 10;

        } else if (event.type === 'HEAL') {
            text = "+" + Math.abs(event.value || 0);
            color = STATUS_VISUALS['REGEN']?.primaryColor || '#4ade80';
            type = 'HEAL';
            xOffset = (Math.random() - 0.5) * 10;
        } else {
            text = event.text || "";
            color = event.color || "#fff";
            type = 'CC';
            size = 14;
            xOffset = -45;
        }

        if (text) hud.addFloatingText(event.pos.x + xOffset, baseY, text, color, size, type);
    }

    private handleCastText(event: GameEvent, visualY: number, hud: HUDSystem) {
        if (event.skill && event.skill.tag !== 'BASIC') {
            const isUlt = event.skill.tag === 'ULT';
            const baseY = visualY - HUD_TEXT_OFFSET - (isUlt ? 30 : 10); 
            const xOffset = 55; 
            hud.addFloatingText(event.pos.x + xOffset, baseY, event.skill.name, event.skill.color, 14, 'SHOUT', isUlt);
        }
    }
}
