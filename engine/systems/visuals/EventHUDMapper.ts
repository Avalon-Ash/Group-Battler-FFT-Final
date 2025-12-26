
import { GameEvent, GameEventType } from "../../../types";
import { GameEngine } from "../../game";
import { HUDSystem } from "../hud";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { HUD_TEXT_OFFSET, KILL_STREAK_WINDOW } from "../../../constants";

export class EventHUDMapper {
    private killStreaks = new Map<string, { count: number, lastTime: number }>();
    private firstBlood = false;

    public reset() {
        this.killStreaks.clear();
        this.firstBlood = false;
    }

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        if (engine.battleTime < 0.1) this.reset();

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
            case 'KILL':
                this.handleKillStreak(event, engine, grid, hud, camera);
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
            // Check if damage comes from DOT (Poison/Burn/Bleed)
            const isDot = event.skill?.ccType === 'DOT';
            
            if (isDot) {
                color = '#a3e635'; // Lime Green for Poison/Dot
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
            color = '#4ade80';
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

    private handleKillStreak(event: GameEvent, engine: GameEngine, grid: GridSystem, hud: HUDSystem, camera: CameraSystem) {
        if (!event.sourceId) return;

        const now = engine.battleTime;
        const killer = event.sourceId;
        const killerAgent = engine.agents.find(a => a.id === killer);
        
        if (!killerAgent) return;

        // Visual Position for Streak Text
        const kHex = HexUtils.fromPx(killerAgent.px, killerAgent.py, engine.mapConfig);
        const kH = grid.getTerrainHeight(kHex.q, kHex.r, engine);
        const textY = killerAgent.py - kH - HUD_TEXT_OFFSET;

        if (!this.firstBlood) {
            this.firstBlood = true;
            hud.addFloatingText(killerAgent.px, textY - 60, "FIRST BLOOD", "#ef4444", 36, 'KILL_STREAK');
            camera.addTrauma(0.3);
        }

        let streak = 1;
        const existing = this.killStreaks.get(killer);
        if (existing && now - existing.lastTime <= KILL_STREAK_WINDOW) streak = existing.count + 1;
        
        this.killStreaks.set(killer, { count: streak, lastTime: now });
        
        if (streak >= 2) {
            let streakText = "DOUBLE KILL";
            let streakColor = "#cbd5e1";
            
            if (streak === 3) { streakText = "TRIPLE KILL"; streakColor = "#fcd34d"; }
            else if (streak === 4) { streakText = "QUADRA KILL"; streakColor = "#fb923c"; }
            else if (streak >= 5) { streakText = "PENTA KILL"; streakColor = "#ef4444"; }
            
            hud.addFloatingText(killerAgent.px, textY - 40, streakText, streakColor, 32 + (streak * 4), 'KILL_STREAK');
            camera.addTrauma(0.2 + streak * 0.1);
        }
    }
}
