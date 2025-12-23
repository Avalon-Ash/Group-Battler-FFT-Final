
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { AssetManager } from "../../../assets";
import { RenderableItem } from "../../grid";
import { getTransitionOffset, isChaosStyle } from "../utils";

const UNIT_CHEST_HEIGHT = 40;

export const ProjectileRenderer = {
    collect(
        engine: GameEngine,
        getTerrainHeight: (q: number, r: number) => number,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ): RenderableItem[] {
        const list: RenderableItem[] = [];

        engine.projectiles.forEach(p => {
             const offsetP = getTransitionOffset(p.x, p.y, engine.mapConfig, transitionT, transitionPhase);
             if (offsetP > 500) return;

             let hStart = 0, hEnd = 0;
             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             if (getTerrainHeight && engine.mapConfig) {
                 const startHex = HexUtils.fromPx(p.startX, p.startY, engine.mapConfig);
                 const targetHex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig);
                 hStart = getTerrainHeight(startHex.q, startHex.r);
                 hEnd = getTerrainHeight(targetHex.q, targetHex.r);
             }

             const getVisualPos = (lx: number, ly: number) => {
                 const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: lx, y: ly});
                 const t = Math.min(1, Math.max(0, currentDist / totalDist));
                 const currentTerrainHeight = hStart + (hEnd - hStart) * t;
                 
                 let arcOffset = 0;
                 if (p.skill.visual === 'ARROW' || p.skill.visual === 'FIREBALL' || p.skill.visual === 'BOMB') {
                     const apex = Math.min(150, totalDist * 0.3);
                     arcOffset = Math.sin(t * Math.PI) * apex; 
                 }
                 
                 const off = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 return {
                     x: lx,
                     y: ly - currentTerrainHeight - UNIT_CHEST_HEIGHT - arcOffset + off,
                     shadowY: ly - currentTerrainHeight + off
                 };
             };

             const headVis = getVisualPos(p.x, p.y);
             
             // Direction Logic
             const lookAheadDist = 5;
             const currentDir = Vector.sub(p.targetPos, {x: p.x, y: p.y});
             const distRemaining = Vector.mag(currentDir);
             let dir;
             if (distRemaining > 0.1) {
                 dir = Vector.normalize(currentDir);
             } else {
                 const totalTrajectory = Vector.sub(p.targetPos, {x: p.startX, y: p.startY});
                 const totalMag = Vector.mag(totalTrajectory);
                 dir = totalMag > 0.1 ? Vector.normalize(totalTrajectory) : {x: 1, y: 0};
             }

             const nextLx = p.x + dir.x * lookAheadDist;
             const nextLy = p.y + dir.y * lookAheadDist;
             const nextVis = getVisualPos(nextLx, nextLy);
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = p.skill.visual === 'BOMB' ? (Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y}) * 0.1) : 0;
             
             // Style Logic
             const isChaos = isChaosStyle(p.skill.color);

             list.push({
                 y: p.y + 50 + offsetP, z: 20, 
                 draw: (ctx) => {
                    // --- 1. Draw Trail ---
                    if (p.trail.length > 1) {
                        const trailVis = p.trail.map(t => getVisualPos(t.x, t.y));
                        trailVis.push(headVis);

                        ctx.save();
                        
                        if (p.skill.visual === 'ARROW') {
                            // Thin faint line
                            ctx.beginPath();
                            ctx.moveTo(trailVis[0].x, trailVis[0].y);
                            for (let i = 1; i < trailVis.length; i++) ctx.lineTo(trailVis[i].x, trailVis[i].y);
                            ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        } else {
                            // MAGICAL RIBBON
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.globalCompositeOperation = 'lighter';

                            // Draw segment by segment to allow for jitter/style
                            for (let i = 0; i < trailVis.length - 1; i++) {
                                const pt = trailVis[i];
                                const next = trailVis[i+1];
                                const ratio = i / (trailVis.length - 1); 
                                
                                const baseWidth = (p.skill.visual === 'FIREBALL' || p.skill.visual === 'SMASH') ? 24 : 12;
                                ctx.lineWidth = baseWidth * ratio;
                                ctx.strokeStyle = p.skill.color;
                                
                                ctx.beginPath();
                                
                                if (isChaos) {
                                    // CHAOS: Jittery, Electric Arc
                                    const jitterX = (Math.random() - 0.5) * 5 * (1-ratio);
                                    const jitterY = (Math.random() - 0.5) * 5 * (1-ratio);
                                    ctx.moveTo(pt.x + jitterX, pt.y + jitterY);
                                    ctx.lineTo(next.x + jitterX, next.y + jitterY);
                                    ctx.globalAlpha = ratio; 
                                } else {
                                    // ORDER: Smooth, glowing center
                                    ctx.moveTo(pt.x, pt.y);
                                    ctx.lineTo(next.x, next.y);
                                    ctx.globalAlpha = ratio * 0.6;
                                }
                                ctx.stroke();
                                
                                if (!isChaos) {
                                    // White core for Order
                                    ctx.lineWidth = baseWidth * ratio * 0.4;
                                    ctx.strokeStyle = '#fff';
                                    ctx.stroke();
                                }
                            }
                        }
                        ctx.restore();
                    }

                    // --- 2. Draw Shadow ---
                    ctx.save();
                    ctx.translate(headVis.x, headVis.shadowY);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); ctx.fill();
                    ctx.restore();

                    // --- 3. Draw Projectile Head ---
                    ctx.save();
                    ctx.translate(headVis.x, headVis.y);
                    if (p.skill.visual === 'BOMB') ctx.rotate(spin);
                    else ctx.rotate(angle);
                    
                    const img = AssetManager.getProjectile(p.skill.visual || 'BOLT', p.skill.color);
                    if (img && img.width > 0) {
                        ctx.drawImage(img, -48, -32, 96, 64);
                    }
                    ctx.restore();
                 }
             });
        });

        return list;
    }
};
