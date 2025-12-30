
import { Agent } from "../../../game";
import { AnimState, Role } from "../../../../types";
import { getCastProgress } from "../utils";
import { THEME_COVENANT } from "../../../../constants";
function easeAttack(t: number): number {
    if (t < 0.45) {
        const p = t / 0.45;
        return -0.5 * (p * p * p); 
    } else if (t < 0.55) {
        const p = (t - 0.45) / 0.1;
        return -0.5 + (1.7 * p); 
    } else {
        const p = (t - 0.55) / 0.45;
        return 1.2 - (1.2 * p) + Math.sin(p * Math.PI * 2) * 0.1;
    }
}
export const CovenantRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = THEME_COVENANT.secondary; // Red for Covenant
        const noise = Math.sin(t * 7.0) * 0.5 + Math.sin(t * 3.0);
        const floatY = (agent.hp > 0) ? noise * 1.5 : 0;
        const breatheScaleX = (agent.hp > 0) ? 1.0 + Math.sin(t * 4.0) * 0.03 : 1.0;
        const breatheScaleY = (agent.hp > 0) ? 1.0 - Math.sin(t * 4.0) * 0.02 : 1.0;
        let hitShakeX = 0;
        let hitShakeRot = 0;
        let hitSquashY = 1.0;
        if (agent.hitFlashTimer > 0) {
            hitShakeX = (Math.random() - 0.5) * 4.0;
            hitShakeRot = (Math.random() - 0.5) * 0.3;
            const trauma = agent.hitFlashTimer * 5;
            hitSquashY = 1.0 - (trauma * 0.2); 
        }
        let armRot = 0;
        let armX = 0;
        let armY = 0;
        let bodyRecoilX = 0;
        let bodyRecoilY = 0;
        let bodyRot = 0;
        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const p = getCastProgress(agent);
            const curve = easeAttack(p);
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                const jerk = Math.max(0, curve);
                armX = jerk * 25; 
                if (p > 0.4 && p < 0.6) {
                    bodyRecoilX = -8; 
                    bodyRecoilY = (Math.random() - 0.5) * 4;
                }
            } else {
                armRot = curve * (Math.PI / 1.3);
                if (curve > 0) {
                    armX = 25 * curve;
                    armY = 15 * curve; 
                    bodyRecoilX = 10 * curve; 
                    bodyRot = 0.1 * curve; 
                } else {
                    bodyRecoilX = -5; 
                    bodyRot = -0.1;   
                }
            }
        }
        ctx.save();
        
        // --- SILHOUETTE PASS (X-RAY) ---
        if (isSilhouette) {
            ctx.translate(bodyRecoilX, floatY);
            
            // Red Outline
            ctx.shadowColor = silhouetteColor;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            
            // X-Ray Fill
            ctx.fillStyle = silhouetteColor;
            ctx.globalAlpha = 0.2;
            
            ctx.beginPath();
            // Simplified "Spikey" shape
            ctx.moveTo(-15, -60); ctx.lineTo(0, -70); ctx.lineTo(15, -60);
            ctx.lineTo(10, 0); ctx.lineTo(-10, 0); 
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 0.8;
            ctx.stroke();
            
            // Spikes hint
            ctx.beginPath();
            ctx.moveTo(-20, -40); ctx.lineTo(-5, -45);
            ctx.moveTo(20, -40); ctx.lineTo(5, -45);
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
            return;
        }

        // --- NORMAL RENDER ---
        ctx.translate(bodyRecoilX + hitShakeX, floatY + bodyRecoilY);
        ctx.translate(0, -40); 
        ctx.rotate(hitShakeRot + bodyRot);
        ctx.scale(breatheScaleX, breatheScaleY * hitSquashY);
        ctx.translate(0, 40);
        drawSpikes(ctx, t);
        ctx.save();
        ctx.translate(-22, -30);
        ctx.translate(0, Math.sin(t * 3) * 2);
        if (agent.role === Role.TANK) drawCovenantShield(ctx);
        else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) drawCovenantTotem(ctx, t);
        ctx.restore();
        drawCovenantBody(ctx, agent.role);
        ctx.save();
        ctx.translate(22, -30);
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        drawCovenantWeapon(ctx, agent.role, t);
        ctx.restore();
        ctx.restore();
    }
};
function drawCovenantBody(ctx: CanvasRenderingContext2D, role: Role) {
    const { primary, armorDark, armorBase, accent, secondary } = THEME_COVENANT;
    const grad = ctx.createLinearGradient(-15, -50, 15, 10);
    grad.addColorStop(0, primary);
    grad.addColorStop(0.6, armorDark);
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.strokeStyle = accent;
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
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo((Math.random()-0.5)*5, -25);
    ctx.lineTo(0, -15);
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -48);
    ctx.fillStyle = armorDark;
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
    ctx.fillStyle = THEME_COVENANT.spike;
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-25, -30 + Math.sin(t*5)*2); ctx.lineTo(-15, 0);
    ctx.moveTo(10, 0); ctx.lineTo(20, -25 + Math.cos(t*4)*2); ctx.lineTo(15, 0);
    ctx.fill();
    ctx.restore();
}
function drawCovenantHand(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = THEME_COVENANT.armorDark;
    ctx.beginPath(); 
    ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(4, 8); ctx.lineTo(-4, 8);
    ctx.fill();
}
function drawCovenantShield(ctx: CanvasRenderingContext2D) {
    drawCovenantHand(ctx);
    ctx.translate(-5, 10);
    ctx.fillStyle = THEME_COVENANT.armorBase;
    ctx.strokeStyle = THEME_COVENANT.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -25); ctx.lineTo(15, -20);
    ctx.lineTo(20, 0); ctx.lineTo(10, 25);
    ctx.lineTo(-15, 20); ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = THEME_COVENANT.accent;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -35); ctx.lineTo(5, -10); ctx.fill();
}
function drawCovenantTotem(ctx: CanvasRenderingContext2D, t: number) {
    drawCovenantHand(ctx);
    ctx.translate(0, 10);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-4, -40, 8, 50);
    ctx.translate(0, -45);
    ctx.fillStyle = THEME_COVENANT.secondary;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10);
    ctx.fill();
}
function drawCovenantWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number) {
    drawCovenantHand(ctx);
    if (role === Role.WARRIOR) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = THEME_COVENANT.armorBase;
        ctx.fillRect(-3, -10, 6, 60);
        ctx.translate(0, -60);
        ctx.fillStyle = '#52525b';
        ctx.strokeStyle = THEME_COVENANT.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-25, -10);
        ctx.quadraticCurveTo(-15, 10, -25, 30);
        ctx.lineTo(0, 20);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 5); ctx.lineTo(0, 10); ctx.fill();
    } else if (role === Role.TANK) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = THEME_COVENANT.armorBase;
        ctx.fillRect(-4, -5, 8, 20);
        ctx.fillStyle = THEME_COVENANT.accent;
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(-10, -60);
        ctx.lineTo(20, -60); ctx.lineTo(20, -10); ctx.lineTo(0, 0);
        ctx.fill();
        ctx.strokeStyle = THEME_COVENANT.secondary; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(20, -10); ctx.stroke();
    } else if (role === Role.RANGER) {
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = THEME_COVENANT.armorDark;
        ctx.fillRect(-5, -30, 10, 40);
        ctx.strokeStyle = THEME_COVENANT.accent; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-25, -25); ctx.lineTo(0, -30); ctx.lineTo(25, -25); ctx.stroke();
        ctx.strokeStyle = '#52525b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-25, -25); ctx.lineTo(0, 0); ctx.lineTo(25, -25); ctx.stroke();
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = '#450a0a';
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-5, -30); ctx.lineTo(0, -50); ctx.lineTo(5, -30); ctx.fill();
        ctx.fillStyle = THEME_COVENANT.secondary;
        ctx.beginPath(); ctx.arc(0, -50, 3, 0, Math.PI*2); ctx.fill();
    }
}
