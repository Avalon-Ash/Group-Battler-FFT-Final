import { Agent } from "../../../game";
import { AnimState, Role, Team } from "../../../../types";
import { getCastProgress } from "../utils";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { UnitCorePainter } from "../painters/UnitCorePainter";
import { UNIT_APPEARANCE, RoleAppearance } from "../../../../data/units/appearance";
import { MATERIAL_CONFIG } from "../../../../data/vfx/materialConfig";
import { MaterialPainter } from "../../../graphics/materials/MaterialPainter";

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

/**
 * CovenantRenderer — 盟約陣營渲染器
 * [ARCH] 資料驅動：依據 UNIT_APPEARANCE[RED] 的 Profile 進行繪製
 */
export const CovenantRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const profile = UNIT_APPEARANCE[Team.RED].roles[agent.role];
        const silhouetteColor = profile.secondaryColor;
        const breathePhase = t * 2.0;
        // [SSOT] 浮動振幅統一為 2.0px，與 ImperialRenderer 保持一致
        const floatY = (agent.hp > 0) ? Math.sin(breathePhase) * 2.0 : 0;
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
        let bodyRot = 0;

        if ((agent.animState === AnimState.ATTACK || agent.animState === AnimState.CAST_ULT) && agent.hp > 0) {
            const p = getCastProgress(agent);
            const curve = easeAttack(p);
            if (agent.role === Role.RANGER || agent.role === Role.MAGE) {
                const jerk = Math.max(0, curve);
                armX = jerk * 25; 
                if (p > 0.4 && p < 0.6) bodyRecoilX = -8; 
            } else {
                armRot = curve * (Math.PI / 1.3);
                if (curve > 0) {
                    armX = 25 * curve;
                    armY = 15 * curve; 
                    bodyRecoilX = 40 * curve; 
                    bodyRot = 0.1 * curve; 
                } else {
                    bodyRecoilX = -5; 
                    bodyRot = -0.1;   
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
            ctx.moveTo(-hw * 0.8, -60); ctx.lineTo(0, -70); ctx.lineTo(hw * 0.8, -60);
            ctx.lineTo(hw * 0.5, 0); ctx.lineTo(-hw * 0.5, 0); 
            
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.35;      // 降低：0.8 -> 0.35
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.translate(bodyRecoilX + hitShakeX, floatY);
        ctx.translate(0, -40); 
        ctx.rotate(hitShakeRot + bodyRot);
        ctx.scale(breatheScaleX, breatheScaleY * hitSquashY);
        ctx.translate(0, 40);

        if (!isSilhouette) {
            drawCovenantMantle(ctx, t, profile);
        }
        drawSpikes(ctx, t, profile);
        
        ctx.save();
        ctx.translate(-22, -30);
        ctx.translate(0, Math.sin(t * 3) * 2);
        if (agent.role === Role.TANK) drawCovenantShield(ctx, profile);
        else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) drawCovenantTotem(ctx, t, profile);
        ctx.restore();

        drawCovenantBody(ctx, agent.role, profile);

        // SSOT Core Attachment: Attached to Chest Bone
        if (agent.hp > 0 && agent.visualStatus === 'NONE') {
             ctx.save();
             // Adjusted to -28 (Chest) from -12 (Crotch)
             ctx.translate(0, -28); 
             UnitCorePainter.draw(ctx, agent, t);
             ctx.restore();
        }

        ctx.save();
        ctx.translate(22, -30);
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        drawCovenantWeapon(ctx, agent.role, t, profile);
        ctx.restore();
        
        ctx.restore();
    }
};

function drawCovenantBody(ctx: CanvasRenderingContext2D, role: Role, profile: RoleAppearance) {
    const { primaryColor, secondaryColor, accentColor, deepColor, rimColor, bodyWidth, bodyHeight, headRadius, highlightColor } = profile;
    
    const grad = ctx.createLinearGradient(-15, -50, 15, 10);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(0.6, accentColor);
    grad.addColorStop(1, deepColor || accentColor);
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = rimColor || accentColor;
    ctx.lineWidth = 1;
    
    const hw = bodyWidth / 2;
    const bodyBottom = bodyHeight - 45; // Baseline adjustment

    const traceBody = () => {
        ctx.beginPath();
        if (role === Role.TANK) {
            ctx.moveTo(-hw, -40); ctx.lineTo(hw, -40); 
            ctx.lineTo(hw * 0.6, bodyBottom + 10); ctx.lineTo(-hw * 0.6, bodyBottom + 10);
            ctx.lineTo(-hw, -40);
        } else {
            ctx.moveTo(-hw, -45); ctx.lineTo(hw, -45);
            ctx.lineTo(hw * 0.45, bodyBottom + 15); ctx.lineTo(-hw * 0.45, bodyBottom + 15);
            ctx.lineTo(-hw, -45);
        }
    };

    traceBody();
    ctx.fill();

    if (MATERIAL_CONFIG.enabled && MATERIAL_CONFIG.unit?.armor?.enabled) {
        MaterialPainter.paintArmorSurface(ctx, traceBody, highlightColor ?? '#c0392b', false);
    }

    traceBody();
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -48);
    ctx.fillStyle = accentColor;
    ctx.strokeStyle = rimColor || accentColor;
    
    ctx.beginPath();
    const hr = profile.headRadius;
    // 橫向拉寬：x = hr*1.3, y = hr*0.9，製造腫脹壓扁感
    ctx.ellipse(0, 0, hr * 1.3, hr * 0.9, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // 保留原有 secondaryColor 點綴
    ctx.fillStyle = secondaryColor;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawSpikes(ctx: CanvasRenderingContext2D, t: number, profile: RoleAppearance) {
    ctx.save();
    ctx.translate(0, -40);
    ctx.fillStyle = profile.accentColor;
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-25, -30 + Math.sin(t*5)*2); ctx.lineTo(-15, 0);
    ctx.moveTo(10, 0); ctx.lineTo(20, -25 + Math.cos(t*4)*2); ctx.lineTo(15, 0);
    ctx.fill();
    ctx.restore();
}

/**
 * drawCovenantMantle — 骨翼肩甲
 * 替代 Imperial 的流動披風，展現公約的尖銳、骸骨風格。
 */
function drawCovenantMantle(ctx: CanvasRenderingContext2D, t: number, profile: RoleAppearance) {
    ctx.save();
    ctx.translate(0, -45);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = profile.accentColor;
    
    ctx.beginPath();
    // Left Wing
    ctx.moveTo(-8, 0);
    ctx.lineTo(-30, -25);
    ctx.lineTo(-20, 5);
    ctx.closePath();
    
    // Right Wing
    ctx.moveTo(8, 0);
    ctx.lineTo(30, -25);
    ctx.lineTo(20, 5);
    ctx.closePath();
    
    ctx.fill();
    ctx.restore();
}

function drawCovenantHand(ctx: CanvasRenderingContext2D, profile: RoleAppearance) {
    ctx.fillStyle = profile.accentColor;
    ctx.beginPath(); 
    ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(4, 8); ctx.lineTo(-4, 8);
    ctx.fill();
}

function drawCovenantShield(ctx: CanvasRenderingContext2D, profile: RoleAppearance) {
    drawCovenantHand(ctx, profile);
    ctx.translate(-5, 10);
    ctx.fillStyle = profile.primaryColor;
    ctx.strokeStyle = profile.secondaryColor;
    ctx.lineWidth = 2;

    const traceShield = () => {
        ctx.beginPath();
        ctx.moveTo(-15, -25); ctx.lineTo(15, -20);
        ctx.lineTo(20, 0); ctx.lineTo(10, 25);
        ctx.lineTo(-15, 20); ctx.lineTo(-20, 0);
        ctx.closePath();
    };

    traceShield();
    ctx.fill();

    if (MATERIAL_CONFIG.enabled && MATERIAL_CONFIG.unit?.armor?.enabled) {
        MaterialPainter.paintArmorSurface(ctx, traceShield, profile.highlightColor ?? '#c0392b', false);
    }

    traceShield();
    ctx.stroke();
}

function drawCovenantTotem(ctx: CanvasRenderingContext2D, t: number, profile: RoleAppearance) {
    drawCovenantHand(ctx, profile);
    ctx.translate(0, 10);
    ctx.fillStyle = profile.accentColor;
    ctx.fillRect(-4, -40, 8, 50);
    ctx.translate(0, -45);
    ctx.fillStyle = profile.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10);
    ctx.fill();
}

function drawCovenantWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number, profile: RoleAppearance) {
    drawCovenantHand(ctx, profile);
    if (role === Role.WARRIOR) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = profile.primaryColor;
        ctx.fillRect(-3, -10, 6, 60);
        ctx.translate(0, -60);
        ctx.fillStyle = profile.accentColor;
        ctx.strokeStyle = profile.secondaryColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-25, -10);
        ctx.quadraticCurveTo(-15, 10, -25, 30);
        ctx.lineTo(0, 20);
        ctx.fill(); ctx.stroke();
    } else if (role === Role.TANK) {
        ctx.rotate(Math.PI / 3);
        ctx.fillStyle = profile.primaryColor;
        ctx.fillRect(-4, -5, 8, 20);
        ctx.fillStyle = profile.accentColor;
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(-10, -60);
        ctx.lineTo(20, -60); ctx.lineTo(20, -10); ctx.lineTo(0, 0);
        ctx.fill();
        ctx.strokeStyle = profile.secondaryColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(20, -10); ctx.stroke();
    } else if (role === Role.RANGER) {
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = profile.accentColor;
        ctx.fillRect(-5, -30, 10, 40);
        ctx.strokeStyle = profile.accentColor; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-25, -25); ctx.lineTo(0, -30); ctx.lineTo(25, -25); ctx.stroke();
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = profile.accentColor;
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-5, -30); ctx.lineTo(0, -50); ctx.lineTo(5, -30); ctx.fill();
        ctx.fillStyle = profile.secondaryColor;
        ctx.beginPath(); ctx.arc(0, -50, 3, 0, Math.PI*2); ctx.fill();
    }
}
