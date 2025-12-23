
import { Agent } from "../../../game";
import { AssetManager } from "../../../assets";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";

export const CovenantRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#ef4444'; 
        let bodyColor = isSilhouette ? 'transparent' : '#78350f'; 
        let glowColor = isSilhouette ? silhouetteColor : '#ef4444'; 
        let secondary = isSilhouette ? silhouetteColor : '#1c1917'; 

        const floatY = (agent.hp > 0) ? Math.sin(t * 2) * 3 : 0;
        let jitterX = 0; let jitterY = 0; let energyGather = 0;

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const progress = getCastProgress(agent);
            if (progress < 0.6) {
                energyGather = progress;
                jitterX = (Math.random() - 0.5) * 3 * progress;
                jitterY = (Math.random() - 0.5) * 3 * progress;
            } else {
                const recoil = (progress - 0.6) / 0.4;
                jitterX = -5 * recoil; 
            }
        }

        ctx.save();
        ctx.translate(jitterX, floatY + jitterY);

        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'transparent';
        } else {
            ctx.fillStyle = bodyColor;
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
                ctx.ellipse(0, -10, 18, 28, 0, 0, Math.PI*2);
        } else if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
                ctx.moveTo(-10, -30); ctx.lineTo(10, -30);
                ctx.lineTo(14, 15); ctx.lineTo(0, 20); ctx.lineTo(-14, 15);
        } else {
                ctx.ellipse(0, -10, 12, 25, 0, 0, Math.PI*2);
        }
        
        if (isSilhouette) ctx.stroke();
        else ctx.fill();
        
        // Floating Orbs (Mage/Support)
        if ((agent.role === Role.MAGE || agent.role === Role.SUPPORT) && agent.hp > 0) {
            const orbGlow = AssetManager.getGlowSprite(glowColor);
            for(let i=0; i<3; i++) {
                const angle = t * 2 + (i * Math.PI * 2 / 3);
                const ox = Math.cos(angle) * (agent.role === Role.MAGE ? 20 : 15) * (1 - energyGather * 0.8);
                const oy = Math.sin(angle) * 5;
                ctx.save(); ctx.translate(ox, oy - 20);
                if(!isSilhouette) { 
                    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
                    ctx.drawImage(orbGlow, -10, -15, 20, 20);
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
                    ctx.fillStyle = glowColor;
                    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.fill();
                } else {
                    ctx.strokeStyle = glowColor;
                    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.stroke();
                }
                ctx.restore();
            }
        }
        
        if (!isSilhouette) {
            ctx.fillStyle = secondary;
            ctx.beginPath(); ctx.ellipse(0, -10, 6, 15, 0, 0, Math.PI*2); ctx.fill();
            const coreGlow = AssetManager.getGlowSprite(glowColor);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 + Math.sin(t*10)*0.2 + energyGather * 0.5;
            ctx.drawImage(coreGlow, -10, -25, 20, 20); ctx.restore();
            ctx.fillStyle = glowColor;
            ctx.beginPath(); ctx.arc(0, -15, 4, 0, Math.PI*2); ctx.fill();
        }

        // Head
        ctx.save();
        const headBob = (agent.hp > 0) ? Math.sin(t*3.5)*2 : 0;
        ctx.translate(0, (agent.role === Role.TANK ? -45 : -40) + headBob); 
        
        if (isSilhouette) {
            ctx.fillStyle = 'transparent'; ctx.strokeStyle = silhouetteColor;
        } else {
            ctx.fillStyle = '#f5f5f4';
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
            ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(0, 12);
        } else {
            ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(0, 8);
        }
        
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fill();
            ctx.fillStyle = glowColor;
            ctx.fillRect(-3, -4, 2, 2); ctx.fillRect(1, -4, 2, 2);
        }
        ctx.restore();

        // Weapon (Floating)
        ctx.save();
        ctx.translate(15, -15);
        if (agent.role === Role.WARRIOR || agent.role === Role.TANK) {
            const bladeAngle = (agent.hp > 0) ? Math.sin(t) * 0.2 + (agent.animState === AnimState.ATTACK ? -1 : 0) : 0;
            ctx.rotate(bladeAngle);
            if(!isSilhouette) {
                const wepGlow = AssetManager.getGlowSprite(glowColor);
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4;
                ctx.drawImage(wepGlow, -10, -20, 30, 30); ctx.restore();
            } else {
                ctx.strokeStyle = silhouetteColor;
            }
            
            if (agent.role === Role.TANK) {
                ctx.lineWidth = 3;
                if (!isSilhouette) ctx.strokeStyle = glowColor;
                ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI/2, 3*Math.PI/2); ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(0, 10); ctx.lineTo(5, -30); ctx.lineTo(-2, -25);
                if (isSilhouette) ctx.stroke(); else { ctx.fillStyle = glowColor; ctx.fill(); }
            }
        } else if (agent.role === Role.RANGER) {
            ctx.translate(5, 0);
            ctx.rotate(agent.animState === AnimState.ATTACK ? -0.5 : 0);
            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor;
                ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(15, 0); ctx.lineTo(-5, 5); ctx.stroke();
            } else {
                ctx.fillStyle = secondary;
                ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(15, 0); ctx.lineTo(-5, 5); ctx.fill();
                const wepGlow = AssetManager.getGlowSprite(glowColor);
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4;
                ctx.drawImage(wepGlow, 0, -10, 20, 20); ctx.restore();
                ctx.fillStyle = glowColor; ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore(); 
    }
};
