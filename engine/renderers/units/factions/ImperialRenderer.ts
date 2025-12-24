
import { Agent } from "../../../game";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";

// Helper: Improved Ease for Disciplined Combat
// Fast snap, rigid hold, smooth recovery
function easeAttack(t: number): number {
    // Phase 1: Windup (0.0 - 0.3) - Pull back slowly
    if (t < 0.3) {
        const p = t / 0.3;
        return -0.25 * (p * p); 
    } 
    // Phase 2: Strike (0.3 - 0.45) - Instant Snap
    else if (t < 0.45) {
        const p = (t - 0.3) / 0.15;
        // Cubic easing for explosion speed
        // Maps -0.25 -> 1.1 (Overshoot for impact)
        return -0.25 + (1.35 * (p * p * p)); 
    } 
    // Phase 3: Recovery (0.45 - 1.0) - Damping settle
    else {
        const p = (t - 0.45) / 0.55;
        // Decay from 1.1 -> 0.0
        // Use cos to simulate a heavy object stopping
        return 1.1 * Math.cos(p * Math.PI / 2);
    }
}

export const ImperialRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#60a5fa'; 
        
        // 1. IDLE & BREATHING (Order: Rhythmic, Slow)
        // Combine vertical float with slight scaling (Breathing)
        // Up = Inhale (Expand), Down = Exhale (Compress)
        const breathePhase = t * 2.0;
        const floatY = (agent.hp > 0) ? Math.sin(breathePhase) * 2.5 : 0;
        const breatheScale = (agent.hp > 0) ? 1.0 + Math.sin(breathePhase) * 0.02 : 1.0;
        
        // 2. HIT REACTION (Procedural Squash & Shake)
        let hitShakeRot = 0;
        let hitSquashX = 1.0;
        let hitSquashY = 1.0;

        if (agent.hitFlashTimer > 0) {
            // High frequency shake
            hitShakeRot = (Math.random() - 0.5) * 0.15; 
            // Impact Squash (Flatten Y, Expand X)
            const trauma = agent.hitFlashTimer * 5; // 0.0 - 1.0 approx
            hitSquashY = 1.0 - (trauma * 0.15);
            hitSquashX = 1.0 + (trauma * 0.1);
        }

        // 3. ATTACK ANIMATION
        let armRot = 0;
        let armX = 0;
        let armY = 0;
        let bodyRecoilX = 0;
        let bodyRecoilY = 0;

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const p = getCastProgress(agent);
            const curve = easeAttack(p);
            
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                // Ranged: Recoil based
                // Weapon pushes forward, Body kicks back
                const kick = Math.max(0, curve);
                armX = kick * 12;
                
                // Recoil logic: When arm goes forward, body goes back
                if (p > 0.3 && p < 0.6) {
                    bodyRecoilX = -4 * kick;
                }
                
                // Aim Adjust (Windup tilts up, Fire levels out)
                if (p < 0.3) armRot = -0.3 * (p/0.3); 
                
            } else {
                // Melee: Weighty Swing
                // Rotation: -45deg (Windup) -> +100deg (Strike)
                armRot = curve * (Math.PI / 1.6); 
                
                // Extension: Thrust weapon out at apex
                if (curve > 0.5) {
                    armX = 18 * curve;
                    // Step into the swing
                    bodyRecoilX = 5 * curve; 
                } else if (curve < 0) {
                    // Windup leaning back
                    bodyRecoilX = -2;
                }
            }
        }

        ctx.save();
        
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.translate(bodyRecoilX, floatY);
            ctx.strokeRect(-15, -60, 30, 60);
            ctx.restore();
            return;
        }

        if (agent.hp > 0) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
            ctx.shadowBlur = 10;
        }

        // --- HIERARCHY TRANSFORM ---
        // 1. Global Position
        ctx.translate(bodyRecoilX, floatY + bodyRecoilY);
        
        // 2. Hit Shake & Breathing (Center pivot approx)
        ctx.translate(0, -40); // Pivot at chest
        ctx.rotate(hitShakeRot);
        ctx.scale(breatheScale * hitSquashX, breatheScale * hitSquashY);
        ctx.translate(0, 40);  // Restore

        // --- DRAW LAYERS ---

        // Cape (Wind follows motion)
        drawCape(ctx, t, '#2563eb', bodyRecoilX);

        // Off-Hand
        ctx.save();
        ctx.translate(-20, -35);
        // Counter-balance animation
        ctx.translate(0, Math.sin(t * 2.5 + Math.PI) * 2); 
        if (agent.role === Role.TANK) drawImperialShield(ctx);
        else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) drawImperialTome(ctx, t);
        ctx.restore();

        // Body
        drawImperialBody(ctx, agent.role);

        // Main Hand (Weapon)
        ctx.save();
        ctx.translate(20, -35);
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        drawImperialWeapon(ctx, agent.role, t);
        ctx.restore();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
};

// --- SUB-COMPONENT RENDERERS ---

function drawImperialBody(ctx: CanvasRenderingContext2D, role: Role) {
    const primary = '#2563eb';
    const secondary = '#facc15';
    const armorLight = '#f8fafc';
    const armorDark = '#1e3a8a';

    const grad = ctx.createLinearGradient(-15, -50, 15, 0);
    grad.addColorStop(0, armorLight);
    grad.addColorStop(0.5, armorDark);
    grad.addColorStop(1, primary);

    ctx.fillStyle = grad;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (role === Role.TANK) {
        ctx.moveTo(-22, -45); ctx.lineTo(22, -45);
        ctx.lineTo(15, 0); ctx.lineTo(-15, 0);
        ctx.lineTo(-22, -45);
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.moveTo(-12, -45); ctx.lineTo(12, -45);
        ctx.lineTo(18, 10); ctx.lineTo(-18, 10);
        ctx.lineTo(-12, -45);
    } else {
        ctx.moveTo(-18, -45); ctx.lineTo(18, -45);
        ctx.lineTo(12, 5); ctx.lineTo(-12, 5);
        ctx.lineTo(-18, -45);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(6, -25); ctx.lineTo(0, -15); ctx.lineTo(-6, -25); ctx.fill();

    ctx.save();
    ctx.translate(0, -50);
    
    if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.strokeStyle = secondary;
        ctx.beginPath(); ctx.arc(0, -5, 16, 0, Math.PI*2); ctx.stroke();
    }

    ctx.fillStyle = armorLight;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (role === Role.TANK) ctx.rect(-10, -12, 20, 18); 
    else ctx.ellipse(0, -2, 9, 11, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = primary;
    ctx.fillRect(-8, -4, 16, 3);
    
    ctx.restore();
}

function drawCape(ctx: CanvasRenderingContext2D, t: number, color: string, speedX: number) {
    ctx.save();
    ctx.translate(0, -45);
    // Cape lags behind movement
    const drag = -speedX * 1.5;
    const wave = Math.sin(t * 3) * 3;
    
    ctx.fillStyle = 'rgba(30, 58, 138, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-15 + wave + drag, 50);
    ctx.lineTo(15 + wave + drag, 50);
    ctx.lineTo(10, 0);
    ctx.fill();
    ctx.restore();
}

function drawImperialHand(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
}

function drawImperialShield(ctx: CanvasRenderingContext2D) {
    drawImperialHand(ctx);
    ctx.translate(-5, 10);
    ctx.rotate(-Math.PI/12);
    
    const grad = ctx.createLinearGradient(0, -30, 0, 30);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#2563eb');
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(-15, -30); ctx.lineTo(15, -30);
    ctx.lineTo(15, 10); ctx.lineTo(0, 40); ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-5, -20, 10, 40);
    ctx.fillRect(-12, -5, 24, 10);
}

function drawImperialTome(ctx: CanvasRenderingContext2D, t: number) {
    drawImperialHand(ctx);
    ctx.translate(0, -10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -12, 20, 24); 
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-12, -12, 4, 24); 
    
    if (Math.sin(t*5) > 0) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(5, -20, 2, 2);
        ctx.fillRect(8, -25, 2, 2);
    }
}

function drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number) {
    drawImperialHand(ctx);

    if (role === Role.WARRIOR) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-4, -10, 8, 20); 
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-12, -10, 24, 4); 
        ctx.fillStyle = 'rgba(147, 197, 253, 0.8)';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -10); ctx.lineTo(-4, -70); ctx.lineTo(0, -80);
        ctx.lineTo(4, -70); ctx.lineTo(6, -10);
        ctx.fill(); ctx.stroke();

    } else if (role === Role.TANK) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-3, -10, 6, 50);
        ctx.translate(0, -50);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.fillRect(-12, -15, 24, 30);
        ctx.strokeRect(-12, -15, 24, 30);
        ctx.fillStyle = '#2563eb';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-20, 0); ctx.lineTo(0, 15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(20, 0); ctx.lineTo(0, 15); ctx.fill();

    } else if (role === Role.RANGER) {
        ctx.translate(10, 0);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 30, -Math.PI/2 - 0.5, Math.PI/2 + 0.5); ctx.stroke();
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.stroke();

    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-3, -40, 6, 80);
        ctx.translate(0, -45);
        const float = Math.sin(t * 4) * 3;
        ctx.translate(0, float);
        ctx.fillStyle = role === Role.MAGE ? '#3b82f6' : '#facc15';
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
    }
}
