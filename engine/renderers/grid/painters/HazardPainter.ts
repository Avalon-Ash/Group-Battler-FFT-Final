
import { GroundHazard } from "../../../../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../../constants";
import { HAZARD_VISUALS } from "../../../../../data/vfx/hazard_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { VisualMath } from "../../../math/VisualMath";

export const HazardPainter = {
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, hazard: GroundHazard, globalTime: number) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        // Smooth fade out at end of duration
        let fade = hazard.duration < 0.8 ? hazard.duration / 0.8 : 1.0;
        
        ctx.save();
        ctx.globalAlpha = fade;
        const drawY = VisualMath.applyLayerBias(y, 'HAZARD');

        if (def.type === 'FOG') {
            const texture = VFXFactory.getTexture('SMOKE', def.primaryColor);
            const speed = globalTime * def.speed;
            
            // VOLUMETRIC STACKING (3 Layers)
            // Draw multiple layers at different Y offsets to simulate 3D volume
            const layers = 3;
            const baseSize = HEX_SIZE * 3.5;
            
            for(let i = 0; i < layers; i++) {
                const layerProgress = i / (layers - 1); // 0.0 to 1.0
                
                // Higher layers are drawn "higher" (smaller Y in screen space)
                // -25px total height variance
                const layerY = drawY - (i * 12); 
                
                // Parallax scale: Top layers slightly larger and more transparent
                const scale = 1.0 + (i * 0.1) + Math.sin(speed + i) * 0.05;
                const size = baseSize * scale;
                
                ctx.save();
                ctx.translate(x, layerY + VisualMath.Z_LAYERS.HAZARD_FOG);
                ctx.scale(1, ISO_SCALE_Y);
                
                // Rotation variance per layer creates depth
                const rotation = (i % 2 === 0 ? 1 : -1) * (speed * (0.1 + i * 0.05)) + i;
                ctx.rotate(rotation);
                
                if (i === 0) {
                    // Base Layer: Darker, Grounded
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = def.intensity * 0.6 * fade;
                } else if (i === 1) {
                    // Mid Layer: Body
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = def.intensity * 0.4 * fade;
                } else {
                    // Top Layer: Highlights/Wisps
                    ctx.globalCompositeOperation = 'screen';
                    ctx.globalAlpha = def.intensity * 0.3 * fade;
                }

                ctx.drawImage(texture, -size/2, -size/2, size, size);
                ctx.restore();
            }
        }
        else if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed * 0.8) * 0.15);
            const liquidY = drawY + VisualMath.Z_LAYERS.LIQUID_OFFSET;

            // Draw base liquid
            SurfacePainter.drawLiquid(ctx, x, liquidY, def.primaryColor, speed, Math.min(1.0, intensity * 1.2));
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, liquidY, def.secondaryColor, intensity);
            
            // Enhanced Fire Visuals
            if (hazard.type === 'FIRE') {
                const flameTex = VFXFactory.getTexture('SMOKE', '#fca5a5');
                const glowTex = VFXFactory.getTexture('GLOW', '#f97316');
                
                // 1. Core Glow (Ground)
                ctx.save();
                ctx.translate(x, liquidY);
                ctx.scale(1, ISO_SCALE_Y);
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.6 * fade;
                const glowSize = HEX_SIZE * 2.5 + Math.sin(globalTime * 10) * 10;
                ctx.drawImage(glowTex, -glowSize/2, -glowSize/2, glowSize, glowSize);
                ctx.restore();

                // 2. Rising Flame Tongues (Volumetric)
                const flameCount = 3;
                for(let i=0; i<flameCount; i++) {
                    const offset = i * (Math.PI * 2 / flameCount);
                    const cycle = (globalTime * 1.5 + offset) % 1; // 0 to 1 loop
                    
                    const riseH = cycle * 80; // Height
                    const wiggle = Math.sin(globalTime * 5 + i) * 15;
                    
                    const scaleBase = 1.0 - cycle; // Shrink as rising
                    const scaleY = 1.5 + Math.sin(globalTime * 10) * 0.5; // Flicker stretch
                    
                    ctx.save();
                    ctx.translate(x + wiggle, liquidY - riseH);
                    ctx.scale(scaleBase, scaleBase * scaleY);
                    
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = (1.0 - cycle) * intensity * fade;
                    
                    const fSize = 60;
                    ctx.drawImage(flameTex, -fSize/2, -fSize/2, fSize, fSize);
                    ctx.restore();
                }
            }
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, drawY, HEX_SIZE * 0.8, 8, def.primaryColor, 0.7);
            ctx.save();
            ctx.translate(x, drawY - 5); ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.6;
            ctx.drawImage(VFXFactory.getTexture('ROCK', def.secondaryColor), -15, -15, 30, 30);
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            const r = HEX_SIZE * 1.6;
            ctx.save();
            ctx.translate(x, drawY); ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI*2); ctx.fill();
            
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.lineWidth = 4; 
            ctx.strokeStyle = def.secondaryColor;
            ctx.shadowColor = def.secondaryColor; 
            ctx.shadowBlur = 20;
            
            ctx.rotate(globalTime * 3);
            ctx.beginPath();
            for(let i=0; i<3; i++) {
                const ang = i * (Math.PI*2/3); ctx.moveTo(0,0);
                ctx.quadraticCurveTo(Math.cos(ang)*r, Math.sin(ang)*r, Math.cos(ang+1)*r, Math.sin(ang+1)*r);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }
};
