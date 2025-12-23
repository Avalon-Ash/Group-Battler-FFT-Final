
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
        // Draw weapon BEHIND body for standard view
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
            // Tank: Bulky Heavy Armor
            ctx.moveTo(-18, -32); ctx.lineTo(18, -32);  
            ctx.lineTo(14, 15); ctx.lineTo(-14, 15);   
        } else if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
            // Robes: Flared bottom
            ctx.moveTo(-10, -28); ctx.lineTo(10, -28);  
            ctx.lineTo(18, 25); ctx.lineTo(-18, 25);
        } else if (agent.role === Role.RANGER) {
            // Light Armor: Slim
            ctx.moveTo(-8, -25); ctx.lineTo(8, -25);  
            ctx.lineTo(6, 15); ctx.lineTo(-6, 15);
        } else {
            // Warrior: Standard Plate
            ctx.moveTo(-12, -28); ctx.lineTo(12, -28);  
            ctx.lineTo(8, 15); ctx.lineTo(-8, 15);   
        }
        ctx.closePath();
        
        if (isSilhouette) {
            ctx.stroke();
        } else {
            ctx.fill();
            ctx.fillStyle = '#172554';
            ctx.stroke();
            
            // Details
            if (agent.role === Role.TANK) {
                // Heavy rivets
                [[-12,-25], [12,-25], [-10, 5], [10, 5]].forEach(([rx, ry]) => {
                    ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI*2); ctx.fill();
                });
            } else if (agent.role === Role.WARRIOR) {
                // Chest plate line
                ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.stroke();
            }
        }

        // 3. Head
        ctx.save();
        ctx.translate(0, (agent.role === Role.TANK ? -38 : -34) + breathe * 0.5);
        
        if (isSilhouette) {
            ctx.fillStyle = 'transparent';
            ctx.strokeStyle = silhouetteColor;
        } else {
            ctx.fillStyle = grad;
        }
        
        ctx.beginPath();
        if (agent.role === Role.MAGE) {
            // Hood / Hat
            ctx.moveTo(-10, 5); ctx.lineTo(0, -20); ctx.lineTo(10, 5);
        } else if (agent.role === Role.SUPPORT) {
            // Rounder Hood
            ctx.arc(0, -5, 10, Math.PI, 0); 
            ctx.lineTo(10, 5); ctx.lineTo(-10, 5);
        } else if (agent.role === Role.TANK) {
            // Great Helm (Boxy)
            ctx.rect(-11, -15, 22, 18);
        } else {
            // Standard Helm
            ctx.rect(-8, -12, 16, 14);
        }
        
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fill(); ctx.stroke();
            // Visor / Face
            ctx.fillStyle = '#fef08a'; 
            if(agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
                ctx.fillStyle = '#1e3a8a'; // Dark face in hood
                ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillRect(-6, -8, 12, 3);
            }
        }
        ctx.restore();

        // 4. Front Arm / Shield
        ctx.save();
        ctx.translate(-12, -8);
        
        if (agent.role === Role.TANK) {
            // --- TOWER SHIELD ---
            ctx.rotate(armRot * 0.2);
            ctx.translate(-6, 8);
            
            if (isSilhouette) {
                ctx.fillStyle = 'transparent';
                ctx.strokeStyle = silhouetteColor;
            } else {
                ctx.fillStyle = '#1e40af'; // Darker blue shield
                ctx.strokeStyle = '#fcd34d'; // Gold trim
            }
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            // Kite Shield Shape
            ctx.moveTo(-12, -22); ctx.lineTo(12, -22);
            ctx.lineTo(12, 5); ctx.lineTo(0, 25); ctx.lineTo(-12, 5);
            ctx.closePath();
            
            if (isSilhouette) ctx.stroke();
            else { 
                ctx.fill(); ctx.stroke(); 
                // Shield Emblem
                ctx.fillStyle = '#fcd34d';
                ctx.beginPath(); ctx.arc(0, -5, 4, 0, Math.PI*2); ctx.fill();
            }
            
        } else if (agent.role === Role.RANGER) {
            // --- CROSSBOW STOCK ARM ---
            ctx.rotate(armRot);
            ctx.translate(5, 5); // Shift forward to hold gun
            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor;
                ctx.strokeRect(-2, -2, 12, 6);
            } else {
                ctx.fillStyle = '#334155'; 
                ctx.fillRect(-2, -2, 12, 6); // Forearm holding stock
            }
        } else {
            // --- STANDARD HAND / BUCKLER ---
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); 
            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor; ctx.stroke();
            } else {
                ctx.fillStyle = grad; ctx.fill();
                // Warrior gets a small buckler
                if(agent.role === Role.WARRIOR) {
                    ctx.strokeStyle = '#fcd34d';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
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
        // --- SWORD ---
        ctx.beginPath();
        ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
        ctx.lineTo(2, -45); ctx.lineTo(0, -50); ctx.lineTo(-2, -45);
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#f59e0b'; ctx.fillRect(-6, 0, 12, 3); // Crossguard
        }
    } else if (role === Role.TANK) {
        // --- MACE ---
        ctx.beginPath();
        ctx.moveTo(-3, 0); ctx.lineTo(3, 0); // Handle Base
        ctx.lineTo(3, -35); ctx.lineTo(-3, -35); // Shaft
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fillStyle = '#475569'; ctx.fill(); ctx.stroke();
            // Mace Head
            ctx.fillStyle = '#cbd5e1'; 
            ctx.fillRect(-8, -45, 16, 12);
            ctx.strokeRect(-8, -45, 16, 12);
        }
    } else if (role === Role.RANGER) {
        // --- CROSSBOW / RIFLE ---
        ctx.rotate(-Math.PI/2);
        if (isSilhouette) ctx.strokeRect(0, -3, 35, 6);
        else {
            ctx.fillStyle = '#475569'; ctx.fillRect(0, -3, 35, 6); // Barrel
            ctx.fillStyle = '#78350f'; ctx.fillRect(-8, -2, 10, 8); // Stock
        }
    } else if (role === Role.MAGE) {
        // --- GEM STAFF ---
        if (isSilhouette) {
            ctx.strokeRect(-2, -40, 4, 50);
            ctx.strokeRect(-6, -50, 12, 12);
        } else {
            ctx.fillStyle = '#475569'; ctx.fillRect(-2, -40, 4, 50);
            const glow = AssetManager.getGlowSprite(accent);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(glow, -16, -55, 32, 32); ctx.restore();
            // Gem
            ctx.fillStyle = accent; 
            ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(5, -45); ctx.lineTo(0, -35); ctx.lineTo(-5, -45); ctx.fill();
        }
    } else if (role === Role.SUPPORT) {
        // --- CLERIC STAFF ---
        if (isSilhouette) {
            ctx.strokeRect(-2, -40, 4, 50);
            ctx.beginPath(); ctx.arc(0, -45, 8, 0, Math.PI*2); ctx.stroke();
        } else {
            ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-2, -40, 4, 50); // White staff
            // Halo / Ring
            ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -45, 8, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -53); ctx.lineTo(0, -37); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-8, -45); ctx.lineTo(8, -45); ctx.stroke();
        }
    }
}
