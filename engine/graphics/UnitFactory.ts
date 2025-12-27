
import { Role, Team } from "../../types";
import { PALETTE } from "../../constants";
import { createCanvas } from "./CanvasUtils";
import { ImperialTokenFactory } from "./units/ImperialTokenFactory";
import { CovenantTokenFactory } from "./units/CovenantTokenFactory";

export const UnitFactory = {
    
    generateTokenBase(team: Team): HTMLCanvasElement {
        if (team === Team.BLUE) {
            return ImperialTokenFactory.generateBase();
        } else {
            return CovenantTokenFactory.generateBase();
        }
    },

    generateRoleIcon(role: Role, team: Team): HTMLCanvasElement {
        if (team === Team.BLUE) {
            return ImperialTokenFactory.generateIcon(role);
        } else {
            return CovenantTokenFactory.generateIcon(role);
        }
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
