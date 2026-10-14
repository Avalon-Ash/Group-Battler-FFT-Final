import { Role, Team } from "../../types";
import { PALETTE } from "../../constants";
import { createCanvas } from "./CanvasUtils";

export interface UnitAssetsFull {
    base: HTMLCanvasElement;
    rim: HTMLCanvasElement;
    core: HTMLCanvasElement;
    icon: HTMLCanvasElement;
    color: string;
}

export const UnitFactory = {
    generateTokenBase(team: Team): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(64, 64);
        const palette = PALETTE.TEAMS[team] || PALETTE.TEAMS[Team.BLUE];
        ctx.fillStyle = palette.main;
        ctx.beginPath();
        ctx.arc(32, 32, 24, 0, Math.PI * 2);
        ctx.fill();
        return canvas;
    },

    generateRoleIcon(_role: Role, team: Team): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(48, 48);
        const palette = PALETTE.TEAMS[team] || PALETTE.TEAMS[Team.BLUE];
        ctx.fillStyle = palette.glow;
        ctx.beginPath();
        ctx.arc(24, 24, 12, 0, Math.PI * 2);
        ctx.fill();
        return canvas;
    },

    generateLayers(role: Role, team: Team): UnitAssetsFull {
        const palette = PALETTE.TEAMS[team] || PALETTE.TEAMS[Team.BLUE];
        const base = this.generateTokenBase(team);
        const icon = this.generateRoleIcon(role, team);
        return {
            base,
            rim: base,
            core: icon,
            icon,
            color: palette.glow,
        };
    },

    // Special Shared Models (Sheep, IceBlock) remain here as utils
    generateSheep(): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(64, 64);
        const cx = 32, cy = 45;
        
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI*2);
        ctx.arc(cx-10, cy-5, 10, 0, Math.PI*2);
        ctx.arc(cx+10, cy-5, 10, 0, Math.PI*2);
        ctx.fill();

        return canvas;
    }
};
