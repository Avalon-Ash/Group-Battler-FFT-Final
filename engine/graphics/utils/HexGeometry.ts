
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";

const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_COS: number[] = [];
const HEX_SIN: number[] = [];

for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_COS.push(Math.cos(angle));
    HEX_SIN.push(Math.sin(angle));
}

export const GEOMETRY = {
    HEX_COS,
    HEX_SIN,
    START_ANGLE
};

export const HexGeometry = {
    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
        ctx.beginPath();
        const startX = x + radius * HEX_COS[0];
        const startY = y + radius * HEX_SIN[0] * ISO_SCALE_Y;
        ctx.moveTo(startX, startY);
        
        for (let i = 1; i < 6; i++) {
            const vx = x + radius * HEX_COS[i];
            const vy = y + radius * HEX_SIN[i] * ISO_SCALE_Y;
            ctx.lineTo(vx, vy);
        }
        ctx.closePath();
    }
};
