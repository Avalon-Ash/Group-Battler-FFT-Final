
import { Agent } from "../../../game";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";

// Helper: Cubic Ease In Out for Snappy Hit (Shared logic, copied for independence)
function easeAttack(t: number): number {
    if (t < 0.4) {
        // Windup (0 to 1) - Backswing
        const p = t / 0.4;
        return -0.4 * (p * p); 
    } else if (t < 0.5) {
        // Strike (0 to 1) - Fast Forward
        const p = (t - 0.4) / 0.1;
        return -0.4 + (1.4 * p); 
    } else {
        // Recover (1 to 0)
        const p = (t - 0.5) / 0.5;
        return 1.0 * (1 - p * p);
    }
}

export const CovenantRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#ef4444'; 
        
        // 1. ANIMATION STATE
        // Jittery Hover (Unstable)
        const floatY = (agent.hp > 0) ? Math.sin(t * 5) * 1.5 + (Math.random()-0.5) : 0;
        
        // Attack Vars
        let armRot = 0;
        let armX = 0;
        let armY = 0;
        let bodyRecoil = 0;

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const p = getCastProgress(agent);
            
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                // Ranged: Violent jerk
                const jerk = easeAttack(p);
                const forward = Math.max(0, jerk);
                
                armX = forward * 20;
                
                if (p > 0.4 && p < 0.5) {
                    armY = -5; // Kick up
                    bodyRecoil = -5; // Body kickback
                } 
            } else {
                // Melee: Heavy Chop (Brutal snap)
                const swing = easeAttack(p);
                
                // Big rotation: -100deg to +90deg
                armRot = swing * (Math.PI / 1.5);
                
                if (swing > 0.5) {
                    armX = 20 * swing;
                    armY = 10 * swing; // Downward slam visual
                }
            }
        }

        ctx.save();
        
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.translate(bodyRecoil, floatY);
            // Spiky box
            ctx.beginPath();
            ctx.moveTo(-15, -60); ctx.lineTo(0, -70); ctx.lineTo(15, -60);
            ctx.lineTo(10, 0); ctx.lineTo(-10, 0); ctx.closePath();
            ctx.stroke();
            ctx.restore();
            return;
        }

        // --- RIM LIGHT (OUTLINE) ---
        // Adds visibility on dark backgrounds
        if (agent.hp > 0) {
            ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'; // Reddish glow for Covenant
            ctx.shadowBlur = 10;
        }

        // --- RENDER START ---
        ctx.translate(bodyRecoil, floatY);

        // --- 1. BACK SPIKES (Layer 0) ---
        drawSpikes(ctx, t);

        // --- 2. OFF-HAND (Shield/Totem) - Screen Left ---
        ctx.save();
        ctx.translate(-22, -30);
        // Heavy breathing motion
        ctx.translate(0, Math.sin(t * 3) * 1);
        
        if (agent.role === Role.TANK) {
            drawCovenantShield(ctx);
        } else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) {
            drawCovenantTotem(ctx, t);
        }
        ctx.restore();

        // --- 3. BODY ---
        drawCovenantBody(ctx, agent.role);

        // --- 4. MAIN HAND (Weapon) - Screen Right ---
        ctx.save();
        ctx.translate(22, -30); // Shoulder
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        
        drawCovenantWeapon(ctx, agent.role, t);
        
        ctx.restore();

        // Turn off glow
        ctx.shadowBlur = 0;

        ctx.restore();
    }
};

// --- SUB-RENDERERS ---

function drawCovenantBody(ctx: CanvasRenderingContext2D, role: Role) {
    const primary = '#b91c1c'; // Blood Red
    const darkMetal = '#18181b'; // Obsidian
    const glow = '#ef4444'; // Bright Red

    // Body Gradient
    const grad = ctx.createLinearGradient(-15, -50, 15, 10);
    grad.addColorStop(0, primary);
    grad.addColorStop(0.6, darkMetal);
    grad.addColorStop(1, '#000');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#7f1d1d'; // Rust
    ctx.lineWidth = 1;

    // Shape: Angular/Coffin
    ctx.beginPath();
    if (role === Role.TANK) {
        // Bulk
        ctx.moveTo(-25, -40); ctx.lineTo(25, -40); // Broad shoulders
        ctx.lineTo(15, 10); ctx.lineTo(-15, 10);
        ctx.lineTo(-25, -40);
    } else {
        // Sharp
        ctx.moveTo(-18, -45); ctx.lineTo(18, -45);
        ctx.lineTo(8, 15); ctx.lineTo(-8, 15);
        ctx.lineTo(-18, -45);
    }
    ctx.fill();
    ctx.stroke();

    // Magma Fissure (Center Chest)
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo((Math.random()-0.5)*5, -25);
    ctx.lineTo(0, -15);
    ctx.stroke();

    // Head
    ctx.save();
    ctx.translate(0, -48);
    
    ctx.fillStyle = darkMetal;
    ctx.beginPath();
    // Horned Helm
    ctx.moveTo(-10, 5); ctx.lineTo(-12, -15); ctx.lineTo(-5, -5); 
    ctx.lineTo(5, -5); ctx.lineTo(12, -15); ctx.lineTo(10, 5);
    ctx.fill();

    // Cyclops Eye
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

function drawSpikes(ctx: CanvasRenderingContext2D, t: number) {
    ctx.save();
    ctx.translate(0, -40);
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    // Asymmetric spikes
    ctx.moveTo(-10, 0); ctx.lineTo(-25, -30 + Math.sin(t*5)*2); ctx.lineTo(-15, 0);
    ctx.moveTo(10, 0); ctx.lineTo(20, -25 + Math.cos(t*4)*2); ctx.lineTo(15, 0);
    ctx.fill();
    ctx.restore();
}

function drawCovenantHand(ctx: CanvasRenderingContext2D) {
    // "Fused Gauntlet": Angular block attached to arm
    ctx.fillStyle = '#450a0a'; // Dark Red Iron
    ctx.beginPath(); 
    ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(4, 8); ctx.lineTo(-4, 8);
    ctx.fill();
}

function drawCovenantShield(ctx: CanvasRenderingContext2D) {
    drawCovenantHand(ctx);
    ctx.translate(-5, 10);
    
    // Scrap Wall Shield
    ctx.fillStyle = '#27272a'; // Iron
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    // Jagged Octagon
    ctx.moveTo(-15, -25); ctx.lineTo(15, -20);
    ctx.lineTo(20, 0); ctx.lineTo(10, 25);
    ctx.lineTo(-15, 20); ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Spikes on shield
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -35); ctx.lineTo(5, -10); ctx.fill();
}

function drawCovenantTotem(ctx: CanvasRenderingContext2D, t: number) {
    drawCovenantHand(ctx);
    ctx.translate(0, 10); // Hold low
    
    // Totem Pole
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-4, -40, 8, 50);
    
    // Skull/Orb top
    ctx.translate(0, -45);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10);
    ctx.fill();
}

function drawCovenantWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number) {
    drawCovenantHand(ctx);

    if (role === Role.WARRIOR) {
        // BATTLE AXE
        ctx.rotate(Math.PI / 4); // Forward
        
        // Haft
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-3, -10, 6, 60); // Long handle
        
        // Blade Head
        ctx.translate(0, -60); // Top of handle
        ctx.fillStyle = '#52525b'; // Steel
        ctx.strokeStyle = '#ef4444'; // Red edge
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-25, -10); // Top tip
        ctx.quadraticCurveTo(-15, 10, -25, 30); // Blade edge curve
        ctx.lineTo(0, 20);
        ctx.fill(); ctx.stroke();
        
        // Spike on back
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 5); ctx.lineTo(0, 10); ctx.fill();

    } else if (role === Role.TANK) {
        // MEAT CLEAVER
        ctx.rotate(Math.PI / 3);
        
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-4, -5, 8, 20); // Handle
        
        ctx.fillStyle = '#7f1d1d'; // Rusted Metal
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(-10, -60); // Back spine
        ctx.lineTo(20, -60);  // Top flat
        ctx.lineTo(20, -10);  // Blade edge vertical
        ctx.lineTo(0, 0);
        ctx.fill();
        
        // Blood edge
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(20, -10); ctx.stroke();

    } else if (role === Role.RANGER) {
        // HEAVY CROSSBOW
        ctx.rotate(-Math.PI / 2); // Pointing forward
        
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-5, -30, 10, 40); // Stock
        
        // Bow Arms
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-25, -25); ctx.lineTo(0, -30); ctx.lineTo(25, -25);
        ctx.stroke();
        
        // String
        ctx.strokeStyle = '#52525b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-25, -25); ctx.lineTo(0, 0); ctx.lineTo(25, -25); ctx.stroke();

    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        // RITUAL DAGGER / WAND
        ctx.rotate(Math.PI / 6);
        
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-5, -30); // Wavy blade
        ctx.lineTo(0, -50);  // Point
        ctx.lineTo(5, -30);
        ctx.fill();
        
        // Glow Tip
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(0, -50, 3, 0, Math.PI*2); ctx.fill();
    }
}
