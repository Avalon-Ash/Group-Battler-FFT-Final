import { particleTextureStore } from "../../renderers/ParticleTextureStore";

export const ParticlePainter = {
    drawAtmosphere(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const tinted = particleTextureStore.getTintedTexture('light', color, Math.max(16, r * 2));
        if (tinted) {
            ctx.drawImage(tinted, -r, -r, r * 2, r * 2);
            return;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
    },

    drawCracks(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            let cx = 0, cy = 0;
            for (let j = 0; j < 3; j++) {
                cx += Math.cos(angle + (Math.random() - 0.5)) * (r / 3);
                cy += Math.sin(angle + (Math.random() - 0.5)) * (r / 3);
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
    },

};
