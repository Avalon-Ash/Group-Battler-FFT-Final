
import { Agent } from "../../game";
import { AssetManager } from "../../assets";
import { AnimState, Role, Team } from "../../../types";

// Helper to calculate animation progress
export function getCastProgress(agent: Agent): number {
    if (agent.castingSkillIdx === -1) return 0;
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return 0;
    const raw = agent.castTimer / skill.cast;
    return Math.max(0, Math.min(1, 1 - raw)); 
}

// =================================================================================
// STYLE A: THE IMPERIAL LEGION (Blue Team)
// =================================================================================
export function drawImperialLegion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
    const silhouetteColor = '#3b82f6'; 
    let grad: any = silhouetteColor;
    let accent = silhouetteColor;

    if (!isSilhouette) {
        grad = ctx.createLinearGradient(-20, -40, 20, 40);
        grad.addColorStop(0, '#eff6ff'); 
        grad.addColorStop(0.5, '#93c5fd'); 
        grad.addColorStop(1, '#2563eb');   
        accent = '#3b82f6'; 
    }

    let breathe = (agent.hp > 0) ? Math.sin(t * 3) * 1 : 0;
    let thrustX = 0;
    let armRot = 0;

    if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
        const progress = getCastProgress(agent);
        if (progress < 0.3) {
            thrustX = -5 * (progress / 0.3);
            armRot = -0.5 * (progress / 0.3);
        } else if (progress < 0.5) {
            thrustX = 15;
            armRot = 1.0;
        } else {
            thrustX = 15 * (1 - (progress - 0.5)/0.5);
            armRot = 1.0 * (1 - (progress - 0.5)/0.5);
        }
    }

    ctx.save();
    ctx.translate(thrustX, breathe);

    // 1. Back Arm
    ctx.save();
    ctx.translate(10, -10);
    ctx.rotate(armRot);
    drawImperialWeapon(ctx, agent.role, grad, accent, isSilhouette);
    ctx.restore();

    // 2. Body Shape
    if (isSilhouette) {
        ctx.strokeStyle = silhouetteColor;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'transparent'; 
    } else {
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#1e3a8a'; 
        ctx.lineWidth = 1.5;
    }
    
    ctx.beginPath();
    if (agent.role === Role.TANK) {
        ctx.moveTo(-18, -30); ctx.lineTo(18, -30);  
        ctx.lineTo(12, 15); ctx.lineTo(-12, 15);   
    } else if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
        ctx.moveTo(-10, -25); ctx.lineTo(10, -25);  
        ctx.lineTo(16, 25); ctx.lineTo(-16, 25);
    } else if (agent.role === Role.RANGER) {
        ctx.moveTo(-8, -25); ctx.lineTo(8, -25);  
        ctx.lineTo(6, 15); ctx.lineTo(-6, 15);
    } else {
        ctx.moveTo(-12, -25); ctx.lineTo(12, -25);  
        ctx.lineTo(8, 15); ctx.lineTo(-8, 15);   
    }
    ctx.closePath();
    
    if (isSilhouette) {
        ctx.stroke();
    } else {
        ctx.fill();
        ctx.fillStyle = '#172554';
        ctx.stroke();
        // Rivets
        if (agent.role === Role.TANK) {
            [[-12,-25], [12,-25], [-8, 10], [8, 10]].forEach(([rx, ry]) => {
                ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI*2); ctx.fill();
            });
        }
    }

    // 3. Head
    ctx.save();
    ctx.translate(0, (agent.role === Role.TANK ? -35 : -32) + breathe * 0.5);
    if (isSilhouette) {
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = silhouetteColor;
    } else {
        ctx.fillStyle = grad;
    }
    
    ctx.beginPath();
    if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
        ctx.moveTo(-10, 5); ctx.lineTo(-8, -15); ctx.lineTo(8, -15); ctx.lineTo(10, 5);
    } else if (agent.role === Role.TANK) {
        ctx.rect(-10, -14, 20, 16);
    } else {
        ctx.rect(-8, -12, 16, 14);
    }
    
    if (isSilhouette) ctx.stroke();
    else {
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fef08a'; ctx.fillRect(-6, -8, 12, 2);
    }
    ctx.restore();

    // 4. Front Arm / Shield
    ctx.save();
    ctx.translate(-12, -8);
    if (agent.role === Role.TANK) {
        ctx.rotate(armRot * 0.2);
        ctx.translate(-5, 5);
        
        if (isSilhouette) {
            ctx.fillStyle = 'transparent';
            ctx.strokeStyle = silhouetteColor;
        } else {
            ctx.fillStyle = '#2563eb'; ctx.strokeStyle = '#fcd34d'; 
        }
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(-10, -20); ctx.lineTo(10, -20);
        ctx.lineTo(10, 10); ctx.lineTo(0, 25); ctx.lineTo(-10, 10);
        ctx.closePath();
        
        if (isSilhouette) ctx.stroke();
        else { ctx.fill(); ctx.stroke(); }
        
    } else if (agent.role === Role.RANGER) {
        ctx.rotate(armRot);
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.strokeRect(-2, -2, 4, 15);
        } else {
            ctx.fillStyle = '#334155'; ctx.fillRect(-2, -2, 4, 15);
        }
    } else {
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); 
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor; ctx.stroke();
        } else {
            ctx.fillStyle = grad; ctx.fill();
        }
    }
    ctx.restore();

    ctx.restore(); 
}

function drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, grad: any, accent: string, isSilhouette: boolean) {
    if (isSilhouette) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
    }

    if (role === Role.WARRIOR) {
        ctx.beginPath();
        ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
        ctx.lineTo(2, -40); ctx.lineTo(0, -45); ctx.lineTo(-2, -40);
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#f59e0b'; ctx.fillRect(-6, 0, 12, 3);
        }
    } else if (role === Role.RANGER) {
        ctx.rotate(-Math.PI/2);
        if (isSilhouette) ctx.strokeRect(0, -3, 30, 4);
        else {
            ctx.fillStyle = '#475569'; ctx.fillRect(0, -3, 30, 4);
            ctx.fillStyle = '#78350f'; ctx.fillRect(-10, -2, 10, 6);
        }
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        if (isSilhouette) ctx.strokeRect(-2, -40, 4, 50);
        else {
            ctx.fillStyle = '#475569'; ctx.fillRect(-2, -40, 4, 50);
            const glow = AssetManager.getGlowSprite(accent);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(glow, -16, -55, 32, 32); ctx.restore();
            ctx.fillStyle = accent; ctx.fillRect(-6, -45, 12, 12);
        }
    }
}

// =================================================================================
// STYLE B: THE ARCANE COVENANT (Red Team)
// =================================================================================
export function drawArcaneCovenant(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
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
