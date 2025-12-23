
import { Agent } from "../../../game";
import { AssetManager } from "../../../assets";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";

export const ImperialRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
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

        // 1. Back Arm (Weapon)
        ctx.save();
        ctx.translate(10, -10);
        ctx.rotate(armRot);
        drawImperialWeapon(ctx, agent.role, accent, isSilhouette);
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
};

function drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, accent: string, isSilhouette: boolean) {
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
