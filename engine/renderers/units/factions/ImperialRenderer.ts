import { Agent } from "../../../game";
import { AnimState, Role, Team } from "../../../../types";
import { getCastProgress } from "../utils";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { UnitCorePainter } from "../painters/UnitCorePainter";
import { UNIT_APPEARANCE, RoleAppearance } from "../../../../data/units/appearance";

function easeAttack(t: number): number {
    if (t < 0.3) {
        const p = t / 0.3;
        return -0.25 * (p * p); 
    } else if (t < 0.45) {
        const p = (t - 0.3) / 0.15;
        return -0.25 + (1.35 * (p * p * p)); 
    } else {
        const p = (t - 0.45) / 0.55;
        return 1.1 * Math.cos(p * Math.PI / 2);
    }
}

/**
 * ImperialRenderer — 帝國陣營渲染器
 * [ARCH] 資料驅動：依據 UNIT_APPEARANCE[BLUE] 的 Profile 進行繪製
 * 不在此處硬編碼顏色與尺寸，確保美術資產與邏輯分離。
 */
export const ImperialRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const profile = UNIT_APPEARANCE[Team.BLUE].roles[agent.role];
        const silhouetteColor = profile.secondaryColor; 
        const breathePhase = t * 2.0;
        // [SSOT] 浮動振幅統一為 2.0px，與 CovenantRenderer 保持一致
        const floatY = (agent.hp > 0) ? Math.sin(breathePhase) * 2.0 : 0;
        const breatheScale = (agent.hp > 0) ? 1.0 + Math.sin(breathePhase) * 0.02 : 1.0;
        
        let hitShakeRot = 0;
        let hitSquashX = 1.0;
        let hitSquashY = 1.0;
        
        if (agent.hitFlashTimer > 0) {
            hitShakeRot = (Math.random() - 0.5) * 0.15; 
            const trauma = agent.hitFlashTimer * 5; 
            hitSquashY = 1.0 - (trauma * 0.15);
            hitSquashX = 1.0 + (trauma * 0.1);
        }

        let armRot = 0;
        let armX = 0;
        let armY = 0;
        let bodyRecoilX = 0;

        if ((agent.animState === AnimState.ATTACK || agent.animState === AnimState.CAST_ULT) && agent.hp > 0) {
            const p = getCastProgress(agent);
            const curve = easeAttack(p);
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                const kick = Math.max(0, curve);
                armX = kick * 12;
                if (p > 0.3 && p < 0.6) bodyRecoilX = -4 * kick;
                if (p < 0.3) armRot = -0.3 * (p/0.3); 
            } else {
                armRot = curve * (Math.PI / 1.6); 
                if (curve > 0.5) {
                    armX = 18 * curve;
                    bodyRecoilX = 35 * curve; 
                } else if (curve < 0) {
                    bodyRecoilX = -5; 
                }
            }
        }

        ctx.save();
        
        if (isSilhouette) {
            ctx.translate(bodyRecoilX, floatY);
            ctx.shadowColor = silhouetteColor;
            ctx.shadowBlur = 4;          // 降低：10 -> 4
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 1.5;         // 降低：2 -> 1.5
            ctx.fillStyle = silhouetteColor;
            ctx.globalAlpha = 0.08;      // 降低：0.2 -> 0.08
            ctx.beginPath();
            
            const hw = profile.bodyWidth / 2;
            ctx.moveTo(-hw * 0.8, -50); ctx.lineTo(hw * 0.8, -50);
            ctx.lineTo(hw * 0.5, 0); ctx.lineTo(-hw * 0.5, 0);
            
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.35;      // 降低：0.8 -> 0.35
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.translate(bodyRecoilX, floatY);
        ctx.translate(0, -40); 
        ctx.rotate(hitShakeRot);
        ctx.scale(breatheScale * hitSquashX, breatheScale * hitSquashY);
        ctx.translate(0, 40);

        if (profile.capeColor) {
            drawCape(ctx, t, profile.capeColor, bodyRecoilX);
        }
        
        ctx.save();
        ctx.translate(-20, -35);
        ctx.translate(0, Math.sin(t * 2.5 + Math.PI) * 2); 
        if (agent.role === Role.TANK) drawImperialShield(ctx, profile);
        else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) drawImperialTome(ctx, t, profile);
        ctx.restore();

        drawImperialBody(ctx, agent.role, profile);

        // SSOT Core Attachment: Attached to Chest Bone
        if (agent.hp > 0 && agent.visualStatus === 'NONE') {
             ctx.save();
             // Adjusted to -28 (Chest) from -12 (Crotch)
             ctx.translate(0, -28); 
             UnitCorePainter.draw(ctx, agent, t);
             ctx.restore();
        }

        ctx.save();
        ctx.translate(20, -35);
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        drawImperialWeapon(ctx, agent.role, t, profile);
        ctx.restore();
        
        ctx.restore();
    }
};

function drawImperialBody(ctx: CanvasRenderingContext2D, role: Role, profile: RoleAppearance) {
    const { primaryColor, secondaryColor, accentColor, deepColor, rimColor, bodyWidth, bodyHeight, headRadius } = profile;
    
    const grad = ctx.createLinearGradient(-15, -50, 15, 0);
    grad.addColorStop(0, secondaryColor); // Use secondary for highlights
    grad.addColorStop(0.5, primaryColor);
    grad.addColorStop(1, deepColor || primaryColor);
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = rimColor || accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const hw = bodyWidth / 2;
    const bodyBottom = bodyHeight - 45; // Relativize to -45 baseline
    
    if (role === Role.TANK) {
        ctx.moveTo(-hw, -45); ctx.lineTo(hw, -45);
        ctx.lineTo(hw * 0.7, bodyBottom); ctx.lineTo(-hw * 0.7, bodyBottom);
        ctx.lineTo(-hw, -45);
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.moveTo(-hw * 0.7, -45); ctx.lineTo(hw * 0.7, -45);
        ctx.lineTo(hw * 1.5, bodyBottom + 10); ctx.lineTo(-hw * 1.5, bodyBottom + 10);
        ctx.lineTo(-hw * 0.7, -45);
    } else {
        ctx.moveTo(-hw, -45); ctx.lineTo(hw, -45);
        ctx.lineTo(hw * 0.7, bodyBottom + 5); ctx.lineTo(-hw * 0.7, bodyBottom + 5);
        ctx.lineTo(-hw, -45);
    }
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -50);
    ctx.fillStyle = secondaryColor;
    ctx.strokeStyle = rimColor || accentColor;
    if (role === Role.TANK) {
        ctx.beginPath();
        ctx.rect(-10, -12, 20, 18); 
        ctx.fill(); ctx.stroke();
    } else {
        ctx.beginPath();
        const hr = headRadius;
        // 方形基底 + 切角：製造頭盔感
        ctx.moveTo(-hr * 0.8, -hr * 1.2);
        ctx.lineTo( hr * 0.8, -hr * 1.2);
        ctx.lineTo( hr * 1.0,  hr * 0.2);
        ctx.lineTo( hr * 0.6,  hr * 0.8);
        ctx.lineTo(-hr * 0.6,  hr * 0.8);
        ctx.lineTo(-hr * 1.0,  hr * 0.2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Visor 縫線
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(-hr * 0.6, -hr * 0.1, hr * 1.2, hr * 0.3);
    }
    
    // Visor glow sync (Legacy override check)
    // ctx.fillStyle = secondaryColor;
    // ctx.fillRect(-8, -4, 16, 3);
    ctx.restore();
}

function drawCape(ctx: CanvasRenderingContext2D, t: number, color: string, speedX: number) {
    ctx.save();
    ctx.translate(0, -45);
    const drag = -speedX * 1.5;
    const wave = Math.sin(t * 3) * 3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-15 + wave + drag, 50);
    ctx.lineTo(15 + wave + drag, 50);
    ctx.lineTo(10, 0);
    ctx.fill();
    ctx.restore();
}

function drawImperialHand(ctx: CanvasRenderingContext2D, profile: RoleAppearance) {
    ctx.fillStyle = profile.primaryColor;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = profile.accentColor;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
}

function drawImperialShield(ctx: CanvasRenderingContext2D, profile: RoleAppearance) {
    drawImperialHand(ctx, profile);
    ctx.translate(-5, 10);
    ctx.rotate(-Math.PI/12);
    const grad = ctx.createLinearGradient(0, -30, 0, 30);
    grad.addColorStop(0, profile.secondaryColor);
    grad.addColorStop(1, profile.primaryColor);
    ctx.fillStyle = grad;
    ctx.strokeStyle = profile.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -30); ctx.lineTo(15, -30);
    ctx.lineTo(15, 10); ctx.lineTo(0, 40); ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = profile.secondaryColor;
    ctx.fillRect(-5, -20, 10, 40);
}

function drawImperialTome(ctx: CanvasRenderingContext2D, t: number, profile: RoleAppearance) {
    drawImperialHand(ctx, profile);
    ctx.translate(0, -10);
    ctx.fillStyle = profile.secondaryColor;
    ctx.fillRect(-10, -12, 20, 24); 
    ctx.fillStyle = profile.primaryColor;
    ctx.fillRect(-12, -12, 4, 24); 
    if (Math.sin(t*5) > 0) {
        ctx.fillStyle = profile.accentColor;
        ctx.fillRect(5, -20, 2, 2);
    }
}

function drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number, profile: RoleAppearance) {
    drawImperialHand(ctx, profile);
    if (role === Role.WARRIOR) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = profile.primaryColor;
        ctx.fillRect(-4, -10, 8, 20); 
        ctx.fillStyle = profile.secondaryColor;
        ctx.strokeStyle = profile.primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -10); ctx.lineTo(-4, -70); ctx.lineTo(0, -80);
        ctx.lineTo(4, -70); ctx.lineTo(6, -10);
        ctx.fill(); ctx.stroke();
    } else if (role === Role.TANK) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = profile.primaryColor;
        ctx.fillRect(-3, -10, 6, 50);
        ctx.translate(0, -50);
        ctx.fillStyle = profile.secondaryColor;
        ctx.strokeStyle = profile.accentColor;
        ctx.lineWidth = 2;
        ctx.fillRect(-12, -15, 24, 30);
        ctx.strokeRect(-12, -15, 24, 30);
        ctx.fillStyle = profile.primaryColor;
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-20, 0); ctx.lineTo(0, 15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(20, 0); ctx.lineTo(0, 15); ctx.fill();
    } else if (role === Role.RANGER) {
        ctx.translate(10, 0);
        ctx.strokeStyle = profile.secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 30, -Math.PI/2 - 0.5, Math.PI/2 + 0.5); ctx.stroke();
        ctx.strokeStyle = profile.secondaryColor; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.stroke();
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = profile.primaryColor;
        ctx.fillRect(-3, -40, 6, 80);
        ctx.translate(0, -45);
        const float = Math.sin(t * 4) * 3;
        ctx.translate(0, float);
        ctx.fillStyle = profile.accentColor;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0); ctx.fill();
        ctx.strokeStyle = profile.secondaryColor; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
    }
}
