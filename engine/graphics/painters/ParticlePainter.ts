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


};
