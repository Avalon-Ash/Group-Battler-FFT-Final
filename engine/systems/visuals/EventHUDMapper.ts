
import { GameEvent } from "../../../types";
import { GameEngine } from "../../game";
import { HUDSystem } from "../hud";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { HUD_TEXT_OFFSET, HUD_LAYOUT } from "../../../constants";
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
            case 'CAST_FINISH':
                if (event.sourceId) {
                    hud.breakCastText(event.sourceId); // Release text gracefully on success
                }
                break;
            case 'CAST_BREAK':
                // 核心：觸發文字崩解，瞬間移除詠唱條
                if (event.sourceId) {
                    hud.breakCastText(event.sourceId);
                    // 同時彈出 "中斷" 提示
                    const baseY = visualGroundY - HUD_TEXT_OFFSET;
                    hud.addFloatingText(event.pos.x, baseY, "INTERRUPTED", "#ef4444", 16, 'CC');
                }
                break;
            case 'KILL_STREAK':
                if (event.text && event.color) {
                    const textY = visualGroundY - HUD_TEXT_OFFSET - 40;
                    const size = 32 + ((event.value || 1) * 4); 
                    hud.addFloatingText(event.pos.x, textY, event.text, event.color, size, 'KILL_STREAK');
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
            if (event.text) {
                text = `${text} ${event.text === 'ABSORB' ? '吸收' : event.text}`;
            }

            const isCrit = val > 100;
            const isDot = event.skill?.ccType === 'DOT';
            
            if (event.text === 'ABSORB') {
                color = '#bae6fd';
            } else if (isDot) {
                color = STATUS_VISUALS['POISON']?.primaryColor || '#a3e635';
            } else if (isCrit) {
                color = '#ef4444'; 
            } else {
                color = event.color || '#fff';
            }
            
            size = isCrit ? 24 : 16;
            type = 'DAMAGE';
            xOffset = (Math.random() - 0.5) * HUD_LAYOUT.DAMAGE_TEXT_SCATTER;

        } else if (event.type === 'HEAL') {
            text = "+" + Math.abs(event.value || 0);
            color = STATUS_VISUALS['REGEN']?.primaryColor || '#4ade80';
            type = 'HEAL';
            xOffset = (Math.random() - 0.5) * HUD_LAYOUT.DAMAGE_TEXT_SCATTER;
        } else {
            text = event.text || "";
            color = event.color || "#fff";
            type = 'CC';
            size = 14;
            xOffset = HUD_LAYOUT.STATUS_TEXT_OFFSET_X;
        }

        if (text) hud.addFloatingText(event.pos.x + xOffset, baseY, text, color, size, type);
    }

    private handleCastText(event: GameEvent, visualY: number, hud: HUDSystem) {
        if (event.skill && event.skill.tag !== 'BASIC') {
            const isUlt = event.skill.tag === 'ULT';
            const offsetY = isUlt ? HUD_LAYOUT.CAST_BAR_Y_OFFSET_ULT : HUD_LAYOUT.CAST_BAR_Y_OFFSET_NORMAL;
            const baseY = visualY - HUD_TEXT_OFFSET - offsetY; 
            const xOffset = HUD_LAYOUT.CAST_BAR_X_OFFSET; 
            
            hud.addFloatingText(
                event.pos.x + xOffset, 
                baseY, 
                event.skill.name, 
                event.skill.color, 
                14, 
                'SHOUT', 
                isUlt,
                event.sourceId,
                event.skill.cast 
            );
        }
    }
}
