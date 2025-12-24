
import { Agent } from "../../../game";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";

// Helper: Brutal Ease for Chaos
// Heavy dragging windup -> Violent release -> Shaky recovery
function easeAttack(t: number): number {
    if (t < 0.45) {
        // Windup (Longer, heavier)
        const p = t / 0.45;
        // Exponential pull back
        return -0.5 * (p * p * p); 
    } else if (t < 0.55) {
        // Strike (Very fast, over-extended)
        const p = (t - 0.45) / 0.1;
        // -0.5 -> 1.2 (Massive overshoot)
        return -0.5 + (1.7 * p); 
    } else {
        // Recover (Slow, bouncy)
        const p = (t - 0.55) / 0.45;
        // Bounce back slightly from 1.2
        return 1.2 - (1.2 * p) + Math.sin(p * Math.PI * 2) * 0.1;
    }
}

export const CovenantRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#ef4444'; 
        
        // 1. IDLE & BREATHING (Chaos: Twitchy, Unstable)
        // Irregular breathing pattern using noise-like sin combo
        const noise = Math.sin(t * 7.0) * 0.5 + Math.sin(t * 3.0);
        const floatY = (agent.hp > 0) ? noise * 1.5 : 0;
        
        // Breathing affects Width more than height (Bulging muscles/energy)
        const breatheScaleX = (agent.hp > 0) ? 1.0 + Math.sin(t * 4.0) * 0.03 : 1.0;
        const breatheScaleY = (agent.hp > 0) ? 1.0 - Math.sin(t * 4.0) * 0.02 : 1.0;

        // 2. HIT REACTION (Violent Shudder)
        let hitShakeX = 0;
        let hitShakeRot = 0;
        let hitSquashY = 1.0;

        if (agent.hitFlashTimer > 0) {
            // Very high frequency vibration
            hitShakeX = (Math.random() - 0.5) * 4.0;
            hitShakeRot = (Math.random() - 0.5) * 0.3;
            // Crumple impact
            const trauma = agent.hitFlashTimer * 5;
            hitSquashY = 1.0 - (trauma * 0.2); // Get crushed down
        }

        // 3. ATTACK ANIMATION
        let armRot = 0;
        let armX = 0;
        let armY = 0;
        let bodyRecoilX = 0;
        let bodyRecoilY = 0;
        let bodyRot = 0; // Whole body leans into attack

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const p = getCastProgress(agent);
            const curve = easeAttack(p);
            
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                // Ranged: Spasmodic Release
                const jerk = Math.max(0, curve);
                armX = jerk * 25; // Extended reach
                
                // Recoil: Violent shake
                if (p > 0.4 && p < 0.6) {
                    bodyRecoilX = -8; 
                    bodyRecoilY = (Math.random() - 0.5) * 4;
                }
                
            } else {
                // Melee: Heavy Slam (Whole body rotation)
                // Curve goes -0.5 to 1.2
                
                // Arm follows curve exaggeratedly
                armRot = curve * (Math.PI / 1.3);
                
                if (curve > 0) {
                    // Forward Momentum
                    armX = 25 * curve;
                    armY = 15 * curve; // Smash down
                    
                    // Body follows the weight
                    bodyRecoilX = 10 * curve; 
                    bodyRot = 0.1 * curve; // Lean forward
                } else {
                    // Windup
                    bodyRecoilX = -5; // Step back
                    bodyRot = -0.1;   // Lean back
                }
            }
        }

        ctx.save();
        
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.translate(bodyRecoilX, floatY);
            ctx.beginPath();
            ctx.moveTo(-15, -60); ctx.lineTo(0, -70); ctx.lineTo(15, -60);
            ctx.lineTo(10, 0); ctx.lineTo(-10, 0); ctx.closePath();
            ctx.stroke();
            ctx.restore();
            return;
        }

        if (agent.hp > 0) {
            ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
            ctx.shadowBlur = 10;
        }

        // --- HIERARCHY TRANSFORM ---
        // 1. Global Position + Hit Shudder
        ctx.translate(bodyRecoilX + hitShakeX, floatY + bodyRecoilY);
        
        // 2. Hit Deform + Breathing + Attack Lean
        ctx.translate(0, -40); // Pivot Center
        ctx.rotate(hitShakeRot + bodyRot);
        ctx.scale(breatheScaleX, breatheScaleY * hitSquashY);
        ctx.translate(0, 40);

        // --- DRAW LAYERS ---

        drawSpikes(ctx, t);

        // Off-Hand
        ctx.save();
        ctx.translate(-22, -30);
        // Heavy dragging motion
        ctx.translate(0, Math.sin(t * 3) * 2);
        if (agent.role === Role.TANK) drawCovenantShield(ctx);
        else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) drawCovenantTotem(ctx, t);
        ctx.restore();

        // Body
        drawCovenantBody(ctx, agent.role);

        // Main Hand (Weapon)
        ctx.save();
        ctx.translate(22, -30); // Shoulder
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        drawCovenantWeapon(ctx, agent.role, t);
        ctx.restore();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
};

// --- SUB-RENDERERS ---

function drawCovenantBody(ctx: CanvasRenderingContext2D, role: Role) {
    const primary = '#b91c1c';
    const darkMetal = '#18181b';
    const glow = '#ef4444';

    const grad = ctx.createLinearGradient(-15, -50, 15, 10);
    grad.addColorStop(0, primary);
    grad.addColorStop(0.6, darkMetal);
    grad.addColorStop(1, '#000');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (role === Role.TANK) {
        ctx.moveTo(-25, -40); ctx.lineTo(25, -40); 
        ctx.lineTo(15, 10); ctx.lineTo(-15, 10);
        ctx.lineTo(-25, -40);
    } else {
        ctx.moveTo(-18, -45); ctx.lineTo(18, -45);
        ctx.lineTo(8, 15); ctx.lineTo(-8, 15);
        ctx.lineTo(-18, -45);
    }
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo((Math.random()-0.5)*5, -25);
    ctx.lineTo(0, -15);
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -48);
    
    ctx.fillStyle = darkMetal;
    ctx.beginPath();
    ctx.moveTo(-10, 5); ctx.lineTo(-12, -15); ctx.lineTo(-5, -5); 
    ctx.lineTo(5, -5); ctx.lineTo(12, -15); ctx.lineTo(10, 5);
    ctx.fill();

    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

function drawSpikes(ctx: CanvasRenderingContext2D, t: number) {
    ctx.save();
    ctx.translate(0, -40);
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-25, -30 + Math.sin(t*5)*2); ctx.lineTo(-15, 0);
    ctx.moveTo(10, 0); ctx.lineTo(20, -25 + Math.cos(t*4)*2); ctx.lineTo(15, 0);
    ctx.fill();
    ctx.restore();
}

function drawCovenantHand(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#450a0a';
    ctx.beginPath(); 
    ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(4, 8); ctx.lineTo(-4, 8);
    ctx.fill();
}

function drawCovenantShield(ctx: CanvasRenderingContext2D) {
    drawCovenantHand(ctx);
    ctx.translate(-5, 10);
    
    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(-15, -25); ctx.lineTo(15, -20);
    ctx.lineTo(20, 0); ctx.lineTo(10, 25);
    ctx.lineTo(-15, 20); ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -35); ctx.lineTo(5, -10); ctx.fill();
}

function drawCovenantTotem(ctx: CanvasRenderingContext2D, t: number) {
    drawCovenantHand(ctx);
    ctx.translate(0, 10);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-4, -40, 8, 50);
    ctx.translate(0, -45);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10);
    ctx.fill();
}

function drawCovenantWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number) {
    drawCovenantHand(ctx);

    if (role === Role.WARRIOR) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-3, -10, 6, 60);
        ctx.translate(0, -60);
        ctx.fillStyle = '#52525b';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-25, -10);
        ctx.quadraticCurveTo(-15, 10, -25, 30);
        ctx.lineTo(0, 20);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 5); ctx.lineTo(0, 10); ctx.fill();

    } else if (role === Role.TANK) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-4, -5, 8, 20);
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(-10, -60);
        ctx.lineTo(20, -60); ctx.lineTo(20, -10); ctx.lineTo(0, 0);
        ctx.fill();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(20, -10); ctx.stroke();

    } else if (role === Role.RANGER) {
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-5, -30, 10, 40);
        ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-25, -25); ctx.lineTo(0, -30); ctx.lineTo(25, -25); ctx.stroke();
        ctx.strokeStyle = '#52525b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-25, -25); ctx.lineTo(0, 0); ctx.lineTo(25, -25); ctx.stroke();

    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = '#450a0a';
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-5, -30); ctx.lineTo(0, -50); ctx.lineTo(5, -30); ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(0, -50, 3, 0, Math.PI*2); ctx.fill();
    }
}
