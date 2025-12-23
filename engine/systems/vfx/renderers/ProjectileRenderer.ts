
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

             // Calculate Visual Position with Arcing/Wobble
             const getVisualPos = (lx: number, ly: number, flightProgress: number) => {
                 const t = flightProgress;
                 const currentTerrainHeight = hStart + (hEnd - hStart) * t;
                 
                 let arcOffset = 0;
                 
                 // TYPE 1: PHYSICAL ARC (Arrow, Bomb) - Gravity based
                 if (p.skill.visual === 'ARROW' || p.skill.visual === 'BOMB') {
                     // High arc for bombs, shallow for arrows
                     const arcHeight = p.skill.visual === 'BOMB' ? 250 : 80; 
                     // Parabola: 4 * h * t * (1-t)
                     arcOffset = 4 * arcHeight * t * (1 - t);
                 } 
                 // TYPE 2: MAGICAL (Bolt, Fireball) - Wobble/Straight
                 else if (p.skill.visual === 'BOLT' || p.skill.visual === 'FIREBALL') {
                     // Sine wave wobble based on distance traveled
                     const wobbleFreq = 0.2; 
                     const wobbleAmp = 10;
                     arcOffset = Math.sin(lx * wobbleFreq + ly * wobbleFreq) * wobbleAmp;
                 }
                 
                 const off = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 return {
                     x: lx,
                     y: ly - currentTerrainHeight - UNIT_CHEST_HEIGHT - arcOffset + off,
                     shadowY: ly - currentTerrainHeight + off
                 };
             };

             const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y});
             const progress = Math.min(1, Math.max(0, currentDist / totalDist));
             const headVis = getVisualPos(p.x, p.y, progress);
             
             // Look-Ahead Rotation Calculation
             // We sample a point slightly ahead on the ideal trajectory to determine angle
             const lookAheadDist = 10;
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextLx = p.x + rawDir.x * lookAheadDist;
             const nextLy = p.y + rawDir.y * lookAheadDist;
             const nextProgress = Math.min(1, Math.max(0, Vector.dist({x: p.startX, y: p.startY}, {x: nextLx, y: nextLy}) / totalDist));
             
             const nextVis = getVisualPos(nextLx, nextLy, nextProgress);
             
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = p.skill.visual === 'BOMB' ? (progress * 15) : 0;
             
             // Style Logic
             const isChaos = isChaosStyle(p.skill.color);

             list.push({
                 y: p.y + 50 + offsetP, z: 20, 
                 draw: (ctx) => {
                    // --- 1. Draw Trail ---
                    if (p.trail.length > 1) {
                        // Re-calculate trail visual positions based on their stored world pos
                        // Note: trails store just {x, y}, we need to derive progress for height
                        
                        ctx.save();
                        
                        if (p.skill.visual === 'ARROW') {
                            // Thin faint line
                            ctx.beginPath();
                            // Move to tail
                            const tail = p.trail[0];
                            const tailDist = Vector.dist({x: p.startX, y: p.startY}, tail);
                            const tailVis = getVisualPos(tail.x, tail.y, tailDist/totalDist);
                            ctx.moveTo(tailVis.x, tailVis.y);
                            ctx.lineTo(headVis.x, headVis.y);
                            
                            ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        } else {
                            // MAGICAL RIBBON
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.globalCompositeOperation = 'lighter';

                            const trailPoints = p.trail.map(t => {
                                const d = Vector.dist({x: p.startX, y: p.startY}, t);
                                return getVisualPos(t.x, t.y, d/totalDist);
                            });
                            trailPoints.push(headVis);

                            // Draw segment by segment
                            for (let i = 0; i < trailPoints.length - 1; i++) {
                                const pt = trailPoints[i];
                                const next = trailPoints[i+1];
                                const ratio = i / (trailPoints.length - 1); 
                                
                                const baseWidth = (p.skill.visual === 'FIREBALL' || p.skill.visual === 'SMASH') ? 24 : 12;
                                ctx.lineWidth = baseWidth * ratio;
                                ctx.strokeStyle = p.skill.color;
                                
                                ctx.beginPath();
                                ctx.moveTo(pt.x, pt.y);
                                ctx.lineTo(next.x, next.y);
                                
                                if (isChaos) {
                                    ctx.globalAlpha = ratio * 0.8; 
                                } else {
                                    ctx.globalAlpha = ratio * 0.5;
                                }
                                ctx.stroke();
                                
                                if (!isChaos) {
                                    ctx.lineWidth = baseWidth * ratio * 0.3;
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
                    const altitude = headVis.shadowY - headVis.y;
                    const shadowScale = Math.max(0.2, 1 - altitude/300);
                    ctx.scale(shadowScale, shadowScale);
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
