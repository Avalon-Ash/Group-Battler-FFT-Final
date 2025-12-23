
import { Agent } from "../../../game";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";

// Helper: Cubic Ease In Out for Snappy Hit
function easeAttack(t: number): number {
    // Input t: 0.0 -> 1.0
    // We want the "Hit" to happen around 0.4-0.5
    // Windup: 0.0 -> 0.4 (Slow back)
    // Strike: 0.4 -> 0.5 (Fast forward)
    // Recover: 0.5 -> 1.0 (Slow return)
    
    if (t < 0.4) {
        // Windup (0 to 1)
        const p = t / 0.4;
        return -0.3 * (p * p); // Pull back slightly
    } else if (t < 0.5) {
        // Strike (0 to 1)
        const p = (t - 0.4) / 0.1;
        // Map -0.3 -> 1.0 very fast
        return -0.3 + (1.3 * p); 
    } else {
        // Recover (1 to 0)
        const p = (t - 0.5) / 0.5;
        // Ease out from 1.0 back to 0
        return 1.0 * (1 - p * p);
    }
}

export const ImperialRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#60a5fa'; 
        
        // 1. ANIMATION STATE CALCULATION
        // Body Float: Gentle vertical motion
        const floatY = (agent.hp > 0) ? Math.sin(t * 2) * 2 : 0;
        
        // Attack Animation Vars
        let armRot = 0;     // Weapon rotation
        let armX = 0;       // Weapon reach
        let armY = 0;
        let bodyRecoil = 0; // Body moving back slightly during hit

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const p = getCastProgress(agent);
            
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                // Ranged/Magic: Thrust forward / Recoil
                // Use custom ease for thrust
                const thrust = easeAttack(p);
                // Clamp negative windup for ranged visuals
                const forward = Math.max(0, thrust); 
                
                armX = forward * 15;
                if (p > 0.4 && p < 0.6) bodyRecoil = -3; // Kickback at fire moment
                if (p < 0.4) armRot = -0.2 * (p/0.4); // Aim adjust
                
            } else {
                // Melee: Swing Arc with SNAP
                const swing = easeAttack(p);
                
                // Swing Rotation: -60deg (Back) to +90deg (Forward)
                // easeAttack returns approx -0.3 to 1.0
                // Map that to angle
                armRot = (swing * Math.PI / 1.8); 
                
                // Extension during hit
                if (swing > 0.5) armX = 15 * swing; // Reach out
            }
        }

        ctx.save();
        
        // Apply Silhouette settings if needed
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.translate(bodyRecoil, floatY);
            // Simple box for occlusion
            ctx.strokeRect(-15, -60, 30, 60);
            ctx.restore();
            return;
        }

        // --- RIM LIGHT (OUTLINE) ---
        // Adds visibility on dark backgrounds
        if (agent.hp > 0) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
            ctx.shadowBlur = 10;
        }

        // --- RENDER START ---
        
        // Apply Global Position Offsets
        ctx.translate(bodyRecoil, floatY);

        // --- 1. BACK WEAPON / CAPE (Layer 0) ---
        // Imperial Cape
        drawCape(ctx, t, '#2563eb');

        // --- 2. OFF-HAND (Shield/Book) - Right Hand (Screen Left) ---
        // For Tank/Support, they hold something here.
        ctx.save();
        ctx.translate(-20, -35); // Left Shoulder position
        // Idle bob for offhand
        ctx.translate(0, Math.sin(t * 2.5 + 1) * 2); 
        
        if (agent.role === Role.TANK) {
            drawImperialShield(ctx);
        } else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) {
            drawImperialTome(ctx, t);
        }
        ctx.restore();

        // --- 3. BODY (Torso + Head) ---
        drawImperialBody(ctx, agent.role);

        // --- 4. MAIN HAND (Weapon) - Left Hand (Screen Right) ---
        ctx.save();
        ctx.translate(20, -35); // Right Shoulder pivot
        ctx.rotate(armRot);     // Apply Attack Rotation
        ctx.translate(armX, armY); // Apply Reach
        
        drawImperialWeapon(ctx, agent.role, t);
        
        ctx.restore();

        // Turn off glow for status effects
        ctx.shadowBlur = 0;

        ctx.restore();
    }
};

// --- SUB-COMPONENT RENDERERS ---

function drawImperialBody(ctx: CanvasRenderingContext2D, role: Role) {
    const primary = '#2563eb'; // Blue
    const secondary = '#facc15'; // Gold
    const armorLight = '#f8fafc'; // White ceramic
    const armorDark = '#1e3a8a';  // Dark Blue

    // Torso Gradient
    const grad = ctx.createLinearGradient(-15, -50, 15, 0);
    grad.addColorStop(0, armorLight);
    grad.addColorStop(0.5, armorDark);
    grad.addColorStop(1, primary);

    ctx.fillStyle = grad;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.5;

    // Armor Shape
    ctx.beginPath();
    if (role === Role.TANK) {
        // Heavy Plate
        ctx.moveTo(-22, -45); ctx.lineTo(22, -45); // Wide Shoulders
        ctx.lineTo(15, 0); ctx.lineTo(-15, 0);     // Waist
        ctx.lineTo(-22, -45);
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        // Robe Form
        ctx.moveTo(-12, -45); ctx.lineTo(12, -45);
        ctx.lineTo(18, 10); ctx.lineTo(-18, 10);
        ctx.lineTo(-12, -45);
    } else {
        // Standard Plate
        ctx.moveTo(-18, -45); ctx.lineTo(18, -45);
        ctx.lineTo(12, 5); ctx.lineTo(-12, 5);
        ctx.lineTo(-18, -45);
    }
    ctx.fill();
    ctx.stroke();

    // Core Crystal (Soul)
    ctx.fillStyle = '#fff';
    // Inner glow
    ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(6, -25); ctx.lineTo(0, -15); ctx.lineTo(-6, -25); ctx.fill();

    // Head
    ctx.save();
    ctx.translate(0, -50);
    
    // Halo
    if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.strokeStyle = secondary;
        ctx.beginPath(); ctx.arc(0, -5, 16, 0, Math.PI*2); ctx.stroke();
    }

    ctx.fillStyle = armorLight;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (role === Role.TANK) ctx.rect(-10, -12, 20, 18); // Square Helm
    else ctx.ellipse(0, -2, 9, 11, 0, 0, Math.PI*2);    // Round Helm
    ctx.fill(); ctx.stroke();

    // Visor
    ctx.fillStyle = primary;
    ctx.fillRect(-8, -4, 16, 3);
    
    ctx.restore();
}

function drawCape(ctx: CanvasRenderingContext2D, t: number, color: string) {
    ctx.save();
    ctx.translate(0, -45);
    const wave = Math.sin(t * 3) * 5;
    ctx.fillStyle = 'rgba(30, 58, 138, 0.8)'; // Dark Blue liner
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-15 + wave, 50);
    ctx.lineTo(15 + wave, 50);
    ctx.lineTo(10, 0);
    ctx.fill();
    ctx.restore();
}

function drawImperialHand(ctx: CanvasRenderingContext2D) {
    // "Servo-Hand": A floating sphere that magnetically holds weapons
    ctx.fillStyle = '#1e293b'; // Dark joint
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#facc15'; // Gold plate
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
}

function drawImperialShield(ctx: CanvasRenderingContext2D) {
    drawImperialHand(ctx);
    
    // Tower Shield
    ctx.translate(-5, 10); // Offset from hand
    ctx.rotate(-Math.PI/12); // Tilt
    
    // Shield Body
    const grad = ctx.createLinearGradient(0, -30, 0, 30);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#2563eb');
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(-15, -30); ctx.lineTo(15, -30); // Top
    ctx.lineTo(15, 10);   // Right vertical
    ctx.lineTo(0, 40);    // Bottom tip
    ctx.lineTo(-15, 10);  // Left vertical
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Energy Cross
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-5, -20, 10, 40);
    ctx.fillRect(-12, -5, 24, 10);
}

function drawImperialTome(ctx: CanvasRenderingContext2D, t: number) {
    drawImperialHand(ctx);
    ctx.translate(0, -10);
    // Floating Book
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -12, 20, 24); // Pages
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-12, -12, 4, 24); // Spine
    
    // Magic particles
    if (Math.sin(t*5) > 0) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(5, -20, 2, 2);
        ctx.fillRect(8, -25, 2, 2);
    }
}

function drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number) {
    drawImperialHand(ctx); // The Servo Hand

    if (role === Role.WARRIOR) {
        // ENERGY CLAYMORE
        ctx.rotate(Math.PI / 2); // Point forward
        
        // Hilt
        ctx.fillStyle = '#475569';
        ctx.fillRect(-4, -10, 8, 20); // Grip
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-12, -10, 24, 4); // Crossguard
        
        // Blade (Energy)
        ctx.fillStyle = 'rgba(147, 197, 253, 0.8)'; // Light blue glass
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(-6, -10); 
        ctx.lineTo(-4, -70); // Tip Left
        ctx.lineTo(0, -80);  // Point
        ctx.lineTo(4, -70);  // Tip Right
        ctx.lineTo(6, -10);  // Base
        ctx.fill(); ctx.stroke();

    } else if (role === Role.TANK) {
        // POWER MACE
        ctx.rotate(Math.PI / 3); // Held angled
        
        // Handle
        ctx.fillStyle = '#475569';
        ctx.fillRect(-3, -10, 6, 50);
        
        // Head
        ctx.translate(0, -50);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        
        // Central Block
        ctx.fillRect(-12, -15, 24, 30);
        ctx.strokeRect(-12, -15, 24, 30);
        
        // Flanges
        ctx.fillStyle = '#2563eb';
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-20, 0); ctx.lineTo(0, 15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(20, 0); ctx.lineTo(0, 15); ctx.fill();

    } else if (role === Role.RANGER) {
        // COMPOSITE BOW
        // Held vertically
        ctx.translate(10, 0);
        
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        
        // Bow Arc
        ctx.beginPath();
        ctx.arc(0, 0, 30, -Math.PI/2 - 0.5, Math.PI/2 + 0.5);
        ctx.stroke();
        
        // Energy String
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -30); ctx.lineTo(0, 30);
        ctx.stroke();

    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        // STAFF
        ctx.rotate(-Math.PI / 6); // Angled back
        
        // Shaft
        ctx.fillStyle = '#b45309'; // Wood/Gold
        ctx.fillRect(-3, -40, 6, 80);
        
        // Head
        ctx.translate(0, -45);
        
        // Floating Crystal
        const float = Math.sin(t * 4) * 3;
        ctx.translate(0, float);
        
        ctx.fillStyle = role === Role.MAGE ? '#3b82f6' : '#facc15';
        
        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0);
        ctx.fill();
        
        // Orbitals
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
    }
}
