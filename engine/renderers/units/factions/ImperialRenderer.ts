import { Agent } from "../../../game";
import { AnimState, Role, Team } from "../../../../types";
import { getCastProgress } from "../utils";
import { THEME_IMPERIAL } from "../../../../constants";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";

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

export const ImperialRenderer = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const faction = FACTION_VISUALS[Team.BLUE];
        const silhouetteColor = faction.secondaryColor; 
        const breathePhase = t * 2.0;
        const floatY = (agent.hp > 0) ? Math.sin(breathePhase) * 2.5 : 0;
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

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
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
            ctx.shadowBlur = 10;
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.fillStyle = silhouetteColor;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            if (agent.role === Role.TANK) {
                ctx.moveTo(-15, -50); ctx.lineTo(15, -50);
                ctx.lineTo(10, 0); ctx.lineTo(-10, 0);
            } else {
                ctx.moveTo(-10, -50); ctx.lineTo(10, -50);
                ctx.lineTo(5, 0); ctx.lineTo(-5, 0);
            }
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.8; 
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.translate(bodyRecoilX, floatY);
        ctx.translate(0, -40); 
        ctx.rotate(hitShakeRot);
        ctx.scale(breatheScale * hitSquashX, breatheScale * hitSquashY);
        ctx.translate(0, 40);

        drawCape(ctx, t, THEME_IMPERIAL.cape, bodyRecoilX);
        
        ctx.save();
        ctx.translate(-20, -35);
        ctx.translate(0, Math.sin(t * 2.5 + Math.PI) * 2); 
        if (agent.role === Role.TANK) drawImperialShield(ctx);
        else if (agent.role === Role.SUPPORT || agent.role === Role.MAGE) drawImperialTome(ctx, t);
        ctx.restore();

        drawImperialBody(ctx, agent.role);

        ctx.save();
        ctx.translate(20, -35);
        ctx.rotate(armRot);
        ctx.translate(armX, armY);
        drawImperialWeapon(ctx, agent.role, t);
        ctx.restore();
        
        ctx.restore();
    }
};

function drawImperialBody(ctx: CanvasRenderingContext2D, role: Role) {
    const faction = FACTION_VISUALS[Team.BLUE];
    const { primaryColor, secondaryColor, darkColor } = faction;
    
    const grad = ctx.createLinearGradient(-15, -50, 15, 0);
    grad.addColorStop(0, THEME_IMPERIAL.armorLight);
    grad.addColorStop(0.5, darkColor);
    grad.addColorStop(1, primaryColor);
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = THEME_IMPERIAL.secondary;
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

    ctx.save();
    ctx.translate(0, -50);
    ctx.fillStyle = THEME_IMPERIAL.armorLight;
    ctx.strokeStyle = THEME_IMPERIAL.secondary;
    ctx.beginPath();
    if (role === Role.TANK) ctx.rect(-10, -12, 20, 18); 
    else ctx.ellipse(0, -2, 9, 11, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    
    // Visor glow sync
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-8, -4, 16, 3);
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

function drawImperialHand(ctx: CanvasRenderingContext2D) {
    const faction = FACTION_VISUALS[Team.BLUE];
    ctx.fillStyle = faction.darkColor;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = THEME_IMPERIAL.secondary;
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
}

function drawImperialShield(ctx: CanvasRenderingContext2D) {
    const faction = FACTION_VISUALS[Team.BLUE];
    drawImperialHand(ctx);
    ctx.translate(-5, 10);
    ctx.rotate(-Math.PI/12);
    const grad = ctx.createLinearGradient(0, -30, 0, 30);
    grad.addColorStop(0, THEME_IMPERIAL.armorLight);
    grad.addColorStop(1, faction.primaryColor);
    ctx.fillStyle = grad;
    ctx.strokeStyle = THEME_IMPERIAL.secondary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -30); ctx.lineTo(15, -30);
    ctx.lineTo(15, 10); ctx.lineTo(0, 40); ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = faction.secondaryColor;
    ctx.fillRect(-5, -20, 10, 40);
}

function drawImperialTome(ctx: CanvasRenderingContext2D, t: number) {
    drawImperialHand(ctx);
    ctx.translate(0, -10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -12, 20, 24); 
    ctx.fillStyle = THEME_IMPERIAL.primary;
    ctx.fillRect(-12, -12, 4, 24); 
    if (Math.sin(t*5) > 0) {
        ctx.fillStyle = THEME_IMPERIAL.secondary;
        ctx.fillRect(5, -20, 2, 2);
    }
}

function drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, t: number) {
    const faction = FACTION_VISUALS[Team.BLUE];
    drawImperialHand(ctx);
    if (role === Role.WARRIOR) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-4, -10, 8, 20); 
        ctx.fillStyle = 'rgba(147, 197, 253, 0.8)';
        ctx.strokeStyle = faction.primaryColor;
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
        ctx.fillStyle = THEME_IMPERIAL.armorLight;
        ctx.strokeStyle = THEME_IMPERIAL.secondary;
        ctx.lineWidth = 2;
        ctx.fillRect(-12, -15, 24, 30);
        ctx.strokeRect(-12, -15, 24, 30);
        ctx.fillStyle = faction.primaryColor;
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-20, 0); ctx.lineTo(0, 15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(20, 0); ctx.lineTo(0, 15); ctx.fill();
    } else if (role === Role.RANGER) {
        ctx.translate(10, 0);
        ctx.strokeStyle = THEME_IMPERIAL.armorLight;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 30, -Math.PI/2 - 0.5, Math.PI/2 + 0.5); ctx.stroke();
        ctx.strokeStyle = faction.secondaryColor; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.stroke();
    } else if (role === Role.MAGE || role === Role.SUPPORT) {
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-3, -40, 6, 80);
        ctx.translate(0, -45);
        const float = Math.sin(t * 4) * 3;
        ctx.translate(0, float);
        ctx.fillStyle = role === Role.MAGE ? faction.secondaryColor : THEME_IMPERIAL.secondary;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
    }
}