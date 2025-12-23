
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

        // Animation Vars
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

        // --- 1. BODY SHAPE ---
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'transparent';
        } else {
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = '#450a0a'; // Dark Outline
            ctx.lineWidth = 1.5;
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
                // Tank: Large, Heavy Oval
                ctx.ellipse(0, -10, 22, 30, 0, 0, Math.PI*2);
        } else if (agent.role === Role.MAGE) {
                // Mage: Inverted Sharp Triangle (Floating)
                ctx.moveTo(-12, -35); ctx.lineTo(12, -35);
                ctx.lineTo(0, 15); ctx.lineTo(-12, -35);
        } else if (agent.role === Role.SUPPORT) {
                // Support: Diamond / Rhombus (Floating)
                ctx.moveTo(0, -40); ctx.lineTo(14, -10);
                ctx.lineTo(0, 20); ctx.lineTo(-14, -10); ctx.lineTo(0, -40);
        } else if (agent.role === Role.RANGER) {
                // Ranger: Slim, Tapered
                ctx.ellipse(0, -10, 10, 22, 0, 0, Math.PI*2);
        } else {
                // Warrior: Standard Spiked Oval
                ctx.ellipse(0, -10, 14, 26, 0, 0, Math.PI*2);
        }
        
        if (isSilhouette) {
            ctx.stroke();
        } else {
            ctx.fill();
            ctx.stroke();
        }
        
        // --- 2. FLOATING ORBS (Core Feature) ---
        // Only for Mage/Support active visuals
        if ((agent.role === Role.MAGE || agent.role === Role.SUPPORT) && agent.hp > 0) {
            const orbGlow = AssetManager.getGlowSprite(glowColor);
            const count = agent.role === Role.MAGE ? 3 : 2;
            
            for(let i=0; i<count; i++) {
                const speed = agent.role === Role.MAGE ? 2 : 1.5;
                const angle = t * speed + (i * Math.PI * 2 / count);
                const ox = Math.cos(angle) * 20 * (1 - energyGather * 0.8);
                const oy = Math.sin(angle) * 8 - 20; // Flattened orbit
                
                ctx.save(); ctx.translate(ox, oy);
                if(!isSilhouette) { 
                    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
                    ctx.drawImage(orbGlow, -10, -10, 20, 20);
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
                    ctx.fillStyle = glowColor;
                    
                    ctx.beginPath();
                    if (agent.role === Role.MAGE) {
                        // Mage: Shards
                        ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); 
                    } else {
                        // Support: Spheres
                        ctx.arc(0, 0, 3, 0, Math.PI*2);
                    }
                    ctx.fill();
                } else {
                    ctx.strokeStyle = glowColor;
                    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.stroke();
                }
                ctx.restore();
            }
        }
        
        // Core Body Detail (Glow)
        if (!isSilhouette) {
            ctx.fillStyle = secondary;
            
            // Draw core shape
            if (agent.role === Role.TANK) {
                // Tank Core: Blocky
                ctx.fillRect(-8, -20, 16, 20);
            } else {
                ctx.beginPath(); ctx.ellipse(0, -10, 6, 15, 0, 0, Math.PI*2); ctx.fill();
            }

            const coreGlow = AssetManager.getGlowSprite(glowColor);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 + Math.sin(t*10)*0.2 + energyGather * 0.5;
            ctx.drawImage(coreGlow, -10, -25, 20, 20); ctx.restore();
            
            ctx.fillStyle = glowColor;
            ctx.beginPath(); ctx.arc(0, -15, 4, 0, Math.PI*2); ctx.fill();
        }

        // --- 3. HEAD ---
        ctx.save();
        const headBob = (agent.hp > 0) ? Math.sin(t*3.5)*2 : 0;
        ctx.translate(0, (agent.role === Role.TANK ? -45 : -40) + headBob); 
        
        if (isSilhouette) {
            ctx.fillStyle = 'transparent'; ctx.strokeStyle = silhouetteColor;
        } else {
            ctx.fillStyle = '#f5f5f4'; // Bone color
            ctx.strokeStyle = '#450a0a';
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
            // Tank: Bull/Demon Horns
            ctx.moveTo(-15, -8); ctx.lineTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(15, -8); // Horns
            ctx.lineTo(10, 12); ctx.lineTo(-10, 12); // Jaw
        } else if (agent.role === Role.WARRIOR) {
            // Warrior: Spiked Mask
            ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(0, 10);
            ctx.moveTo(-8, -8); ctx.lineTo(-10, -15); // Spike L
            ctx.moveTo(8, -8); ctx.lineTo(10, -15); // Spike R
        } else {
            // Standard: Simple Skull mask
            ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(0, 8);
        }
        
        if (isSilhouette) {
            ctx.stroke();
        } else {
            ctx.fill();
            ctx.stroke();
            // Red Eyes
            ctx.fillStyle = glowColor;
            ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(1, -4, 3, 3);
        }
        ctx.restore();

        // --- 4. WEAPON (Floating) ---
        ctx.save();
        
        // Positioning Logic
        if (agent.role === Role.RANGER) {
            ctx.translate(10, -5);
        } else {
            ctx.translate(20, -15);
        }

        if (agent.role === Role.TANK) {
            // --- TANK: GIANT CRESCENT BLADE/SHIELD ---
            const angle = (agent.hp > 0) ? Math.sin(t) * 0.1 : 0;
            ctx.rotate(angle);
            
            ctx.lineWidth = 4;
            if (!isSilhouette) ctx.strokeStyle = '#7f1d1d'; // Dark Red Metal
            else ctx.strokeStyle = silhouetteColor;
            
            // Outer Blade
            ctx.beginPath(); 
            ctx.arc(0, 0, 24, Math.PI/2, 3*Math.PI/2); 
            ctx.stroke();
            
            if (!isSilhouette) {
                // Inner Glow
                ctx.lineWidth = 2;
                ctx.strokeStyle = glowColor;
                ctx.beginPath(); ctx.arc(0, 0, 18, Math.PI/2, 3*Math.PI/2); ctx.stroke();
            }

        } else if (agent.role === Role.WARRIOR) {
            // --- WARRIOR: JAGGED CLEAVER ---
            const angle = (agent.hp > 0) ? Math.sin(t) * 0.2 + (agent.animState === AnimState.ATTACK ? -1 : 0) : 0;
            ctx.rotate(angle);
            
            ctx.beginPath();
            // Serrated Blade
            ctx.moveTo(0, 10); 
            ctx.lineTo(8, -20); // Top tip
            ctx.lineTo(4, -15); // Tooth 1
            ctx.lineTo(4, -10); // Tooth 2
            ctx.lineTo(-4, -5); // Base
            ctx.closePath();

            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor; ctx.stroke();
            } else {
                ctx.fillStyle = '#b91c1c'; ctx.fill(); 
                ctx.strokeStyle = '#450a0a'; ctx.stroke();
                // Edge Glow
                ctx.strokeStyle = glowColor; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(8, -20); ctx.stroke();
            }

        } else if (agent.role === Role.RANGER) {
            // --- RANGER: FLOATING BONE BOW ---
            const angle = agent.animState === AnimState.ATTACK ? -0.5 : 0;
            ctx.rotate(angle);
            
            // Upper Limb
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -10, 0, -20);
            if (isSilhouette) { ctx.strokeStyle = silhouetteColor; ctx.stroke(); }
            else { ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth=3; ctx.stroke(); }
            
            // Lower Limb
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, 10, 0, 20);
            if (isSilhouette) { ctx.strokeStyle = silhouetteColor; ctx.stroke(); }
            else { ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth=3; ctx.stroke(); }
            
            // String (Energy)
            if (!isSilhouette) {
                ctx.strokeStyle = glowColor; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke();
            }
        }
        
        ctx.restore();
        ctx.restore(); 
    }
};
