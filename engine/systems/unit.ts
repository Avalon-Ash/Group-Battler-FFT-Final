
import { Agent } from "../game";
import { SpriteManager } from "../sprites";
import { AssetManager } from "../assets";
import { AnimState, Role, Team } from "../../types";
import { RenderableItem } from "./grid";
import { HEX_SIZE } from "../../constants";
import { HexUtils, MapConfig, Vector } from "../utils";

// Visual Constants
const MAX_UNIT_SIZE_RATIO = 0.85; 
const UNIT_REFERENCE_HEIGHT = 100; 

export class UnitRenderSystem {
    
    public collectRenderables(
        agents: Agent[], 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        highlightAgent: Agent | null,
        mapConfig: MapConfig
    ): RenderableItem[] {
        const list: RenderableItem[] = [];
        
        agents.forEach(agent => {
            if (agent.hp <= 0 && agent.fullyDead) return;

            // --- HEIGHT CORRECTION LOGIC ---
            let h = 0;
            
            if (agent.isMoving && agent.path.length > 0) {
                // Movement Interpolation
                // Linearly interpolate between start tile height and end tile height based on move progress
                const h1 = getTerrainHeight(agent.q, agent.r);
                const nextHex = agent.path[0];
                const h2 = getTerrainHeight(nextHex.q, nextHex.r);
                h = HexUtils.lerp(h1, h2, agent.moveProgress);
            } else {
                // Static / Physics Drift
                // If the unit has drifted significantly from its logical tile center (e.g., knockback),
                // sample height at its visual position to prevent clipping through walls.
                const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
                const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
                
                if (distSq > 100) {
                    const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                    h = getTerrainHeight(visualHex.q, visualHex.r);
                } else {
                    h = getTerrainHeight(agent.q, agent.r);
                }
            }

            // Apply Visual Offset (Y is down in Canvas, so subtract height to move "up")
            const visualY = agent.py - h;
            
            list.push({
                y: agent.py + 1, // Sort by base position (ground level) to maintain consistency with terrain sorting
                z: 10,
                draw: (ctx) => this.drawAssembly(
                    ctx, 
                    agent, 
                    agent.px, 
                    visualY, 
                    globalTime, 
                    highlightAgent === agent,
                    false // Normal Mode
                )
            });
        });

        return list;
    }

    // Called by Renderer for Occlusion Pass
    public drawSilhouette(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        getTerrainHeight: (q: number, r: number) => number,
        globalTime: number,
        mapConfig: MapConfig
    ) {
        // Consistent height logic for silhouettes
        let h = 0;
        if (agent.isMoving && agent.path.length > 0) {
            const h1 = getTerrainHeight(agent.q, agent.r);
            const nextHex = agent.path[0];
            const h2 = getTerrainHeight(nextHex.q, nextHex.r);
            h = HexUtils.lerp(h1, h2, agent.moveProgress);
        } else {
            const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
            const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
            if (distSq > 100) {
                const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                h = getTerrainHeight(visualHex.q, visualHex.r);
            } else {
                h = getTerrainHeight(agent.q, agent.r);
            }
        }
        
        const visualY = agent.py - h;

        this.drawAssembly(ctx, agent, agent.px, visualY, globalTime, false, true);
    }

    // =================================================================================
    // 🎨 HIERARCHICAL VECTOR ASSEMBLY RENDERER
    // =================================================================================

    private drawAssembly(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        drawX: number, 
        drawY: number, 
        globalTime: number, 
        isSelected: boolean,
        isSilhouette: boolean
    ) {
        // 1. Setup Constraint Space
        const maxDimension = HEX_SIZE * 2 * MAX_UNIT_SIZE_RATIO;
        
        // Distinct Scale Factors for Roles
        let roleScaleMod = 1.0;
        switch(agent.role) {
            case Role.TANK: roleScaleMod = 1.25; break; // Bulky
            case Role.WARRIOR: roleScaleMod = 1.1; break; // Standard strong
            case Role.RANGER: roleScaleMod = 0.9; break; // Agile/Slim
            case Role.MAGE: roleScaleMod = 0.9; break; // Small/Floating
            case Role.SUPPORT: roleScaleMod = 0.95; break;
        }

        const scaleFactor = (maxDimension / UNIT_REFERENCE_HEIGHT) * roleScaleMod;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(scaleFactor, scaleFactor);

        // 3. Apply Physics (Z-Jump / Blast)
        // We apply Physics Z translation to the whole container (Base + Body)
        const physX = agent.physics.x / scaleFactor;
        const physY = agent.physics.y / scaleFactor;
        const physZ = agent.physics.z / scaleFactor; 

        ctx.translate(physX, physY - physZ); 
        ctx.rotate(agent.physics.angle); // Apply Ragdoll Rotation

        // --- DRAW BASE (Ground Level) ---
        // The base should strictly align with the grid face (0,0 local)
        if (!isSilhouette && agent.hp > 0 && agent.visualStatus !== 'POLYMORPH') {
            const assets = SpriteManager.getUnitImages(agent.role, agent.team);
            ctx.save();
            // Center of base sprite ellipse is at (64, 79). 
            // We draw at (-64, -79) to align it with (0,0).
            ctx.drawImage(assets.base, -64, -79); 
            
            // Casting Floor Rune (Ground level)
            if (agent.castingSkillIdx !== -1) {
                const skill = agent.skills[agent.castingSkillIdx];
                if (skill) {
                    const circle = AssetManager.getMagicCircle(skill.color, skill.tag === 'ULT');
                    ctx.save(); 
                    ctx.scale(1, 0.5); 
                    ctx.rotate(globalTime * 2);
                    ctx.globalAlpha = 0.6;
                    ctx.drawImage(circle, -64, -64, 128, 128); 
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        // --- PREPARE BODY TRANSFORM ---
        // Shift up to align body feet with ground (y=0)
        // Standard body drawing has feet around y=15. So we shift up by -15.
        const BODY_GROUNDING_OFFSET = -15; 
        
        let bodyFloat = BODY_GROUNDING_OFFSET; 
        
        // Add Breathing / Hovering
        if (agent.hp > 0) {
             if ((agent.role === Role.MAGE || agent.role === Role.SUPPORT) && !agent.isMoving && agent.visualStatus === 'NONE') {
                bodyFloat -= 5 + Math.sin(globalTime * 2) * 3; // Mages float higher
            }
        } else {
            bodyFloat = -5; // Dead units sink slightly into ground
        }

        ctx.translate(0, bodyFloat);

        // --- 2. Spawn Animation (Materialize) ---
        // Applies scale stretch and alpha fade if spawning
        let spawnAlpha = 1.0;
        let whiteOverlay = 0;

        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; // From game.ts init
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); // 0 -> 1
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic Out
            
            spawnAlpha = eased;
            const spawnStretch = 2.0 - eased; // 2.0 -> 1.0
            whiteOverlay = 1 - eased; // 1 -> 0
            
            // Scale body vertically around its feet (now at 0,0 due to translate)
            ctx.scale(1, spawnStretch);
            ctx.globalAlpha *= spawnAlpha;
        }

        // Hit Flash / Death Filter
        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(80%)'; 
        } else if (!isSilhouette && agent.hitFlashTimer > 0) {
            ctx.filter = 'brightness(200%)'; 
        } else if (whiteOverlay > 0) {
            ctx.filter = `brightness(${100 + whiteOverlay * 200}%)`;
        }

        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        // SILHOUETTE MODE SETUP
        if (isSilhouette) {
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.globalAlpha = 0.8; 
        }

        // 4. Render Body (or Special Form)
        if (agent.visualStatus === 'POLYMORPH') {
            // Draw Sheep
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(globalTime * 5) * 5);
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            // Standard Unit Render
            if (agent.team === Team.BLUE) {
                this.drawImperialLegion(ctx, agent, globalTime, isSilhouette);
            } else {
                this.drawArcaneCovenant(ctx, agent, globalTime, isSilhouette);
            }
            
            // Casting VFX (Only if alive)
            if (!isSilhouette && agent.hp > 0 && agent.castingSkillIdx !== -1) {
                this.drawCastingVFX(ctx, agent, globalTime);
            }
            
            // Frozen Overlay
            if (agent.visualStatus === 'FROZEN') {
                const ice = SpriteManager.getSpecialModel('ICE');
                ctx.save();
                ctx.globalCompositeOperation = 'hard-light';
                // Ice block needs to cover body, roughly centered
                ctx.drawImage(ice, -48, -75, 96, 128);
                ctx.restore();
            }
            
            // Stasis Overlay
            if (agent.visualStatus === 'STASIS') {
                ctx.save();
                ctx.fillStyle = '#facc15';
                ctx.globalAlpha = 0.4;
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                ctx.ellipse(0, -15, 25, 50, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        // 6. Selection Ring & Status (Only Normal Mode & Alive)
        if (!isSilhouette) {
            this.drawStatusIcons(ctx, agent, globalTime, drawX, drawY, scaleFactor);
            this.drawStatusEffects(ctx, agent, globalTime);
            
            if (isSelected && agent.hp > 0) {
                // Draw Selection Ring around Body center (approx -20)
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / scaleFactor; 
                ctx.beginPath();
                ctx.ellipse(0, -20, 30, 15, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore(); // End Assembly

        // 7. NEW: Spawn Role Indicator
        // Drawn AFTER restore so it is not affected by body stretch/fade/rotation
        if (agent.spawnTimer > 0 && !isSilhouette) {
            this.drawSpawnIndicator(ctx, agent, drawX, drawY, scaleFactor);
        }
    }

    private drawSpawnIndicator(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, scale: number) {
        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        const totalDuration = 0.5;
        const alpha = Math.max(0, agent.spawnTimer / totalDuration);
        const yOffset = -40 * scale; 

        ctx.save();
        ctx.translate(x, y + yOffset);
        const popScale = 1.0 + alpha * 0.2;
        ctx.scale(popScale, popScale);
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'; 
        ctx.strokeStyle = agent.team === Team.BLUE ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill(); ctx.stroke();

        ctx.drawImage(assets.icon, -12, -12, 24, 24);
        
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(agent.role, 0, 28);
        ctx.fillText(agent.role, 0, 28);

        ctx.restore();
    }

    private drawStatusEffects(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        if (agent.hp <= 0) return;
        
        ctx.save();
        // Undo facing flip so icons don't flip
        if (agent.facing < 0) ctx.scale(-1, 1);
        
        const HEAD_Y = -75; // Adjusted head position for icons

        // 1. STUN
        if (agent.stunTimer > 0 && !agent.banished && agent.visualStatus !== 'FROZEN') {
            const icon = AssetManager.getStatusIcon('STUN');
            const angle = t * 5;
            ctx.drawImage(icon, -20 + Math.cos(angle)*10, HEAD_Y + Math.sin(angle)*5, 24, 24);
            ctx.drawImage(icon, -10 + Math.cos(angle + 2)*10, HEAD_Y - 10 + Math.sin(angle + 2)*5, 16, 16);
        }

        // 2. SILENCE
        if (agent.silenceTimer > 0) {
            const icon = AssetManager.getStatusIcon('SILENCE');
            ctx.drawImage(icon, 15, HEAD_Y - 5 + Math.sin(t * 3) * 3, 24, 24);
        }

        // 3. BANISH
        if (agent.banished && agent.visualStatus === 'NONE') {
            const icon = AssetManager.getStatusIcon('BANISH');
            ctx.globalAlpha = 0.7;
            ctx.drawImage(icon, -12, HEAD_Y - 20 + Math.sin(t * 2) * 5, 24, 24);
        }

        // 4. DoT
        if (agent.dotTimer > 0) {
            const pulse = 1 + Math.sin(t * 10) * 0.2;
            const iconSize = 28 * pulse; 
            const icon = AssetManager.getStatusIcon('POISON'); 
            const glow = AssetManager.getGlowSprite('#ef4444');
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(glow, -35 - iconSize/2, HEAD_Y - iconSize/2, iconSize*2, iconSize*2);
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(icon, -35, HEAD_Y, iconSize, iconSize);

            ctx.globalAlpha = 0.8;
            for(let i=0; i<5; i++) {
                const cycle = (t * 2 + i * 0.7) % 1;
                const yOff = -cycle * 60; 
                const xOff = Math.sin(t * 5 + i) * 15;
                const size = (1 - cycle) * 7;
                ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#a855f7';
                if (cycle < 1) {
                    ctx.beginPath(); ctx.arc(xOff, -20 + yOff, size, 0, Math.PI*2); ctx.fill();
                }
            }
        }

        // 5. HoT
        if (agent.hotTimer > 0) {
            const icon = AssetManager.getStatusIcon('REGEN');
            ctx.drawImage(icon, 25, HEAD_Y, 24, 24);
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 14px sans-serif';
            for(let i=0; i<3; i++) {
                const cycle = (t * 1.5 + i * 0.4) % 1;
                const yOff = -cycle * 40;
                const xOff = Math.cos(t * 3 + i) * 15;
                if (cycle < 1) ctx.fillText('+', xOff, -20 + yOff);
            }
        }

        ctx.restore();
    }
    
    // --- VFX METHODS ---

    private drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        if (agent.facing < 0) ctx.scale(-1, 1);

        // 1. Rising Energy Lines
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3; 
        const lineCount = 5 + Math.floor(progress * 8); 
        for(let i=0; i<lineCount; i++) {
            const h = (t * 150 + i * 40) % 90; 
            const alpha = 1 - (h / 90);
            const xOff = Math.sin(t * 15 + i) * 20 * (1-progress); 
            ctx.globalAlpha = alpha;
            ctx.beginPath(); ctx.moveTo(xOff, 15 - h); ctx.lineTo(xOff, 15 - h - 20); ctx.stroke();
        }

        // 2. Converging Rings
        if (progress > 0.2) {
            const ringScale = (1 - progress) * 2.5; 
            ctx.globalAlpha = progress;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, -20, 30 * ringScale, 10 * ringScale, 0, 0, Math.PI*2); ctx.stroke();
            
            ctx.save(); ctx.translate(0, -20); ctx.rotate(t * 10);
            ctx.beginPath(); ctx.ellipse(0, 0, 20 * ringScale, 5 * ringScale, 0, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }

        // 3. Hand Glow
        ctx.globalAlpha = 0.4 + (Math.sin(t * 20) * 0.2) + (progress * 0.6);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, -20, 10 + progress * 15, 0, Math.PI*2); ctx.fill();

        // 4. Final Flash
        if (progress > 0.9) {
            ctx.globalAlpha = (progress - 0.9) * 10;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, -20, 30, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }

    private drawStatusIcons(ctx: CanvasRenderingContext2D, agent: Agent, t: number, drawX: number, drawY: number, scaleFactor: number) {
         if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill && skill.visual) {
                const icon = AssetManager.getSkillIcon(skill.visual, skill.color);
                ctx.save();
                // Move Higher relative to Body top (approx -120 local)
                ctx.translate(0, -110);
                const pulse = 1 + Math.sin(t * 10) * 0.1;
                ctx.scale(pulse, pulse);
                
                const glow = AssetManager.getGlowSprite(skill.color);
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.6;
                ctx.drawImage(glow, -32, -32, 64, 64);
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;

                ctx.drawImage(icon, -12, -12, 24, 24);
                
                // Cast Bar
                ctx.fillStyle = '#000';
                ctx.fillRect(-14, 20, 28, 5); 
                ctx.fillStyle = skill.color;
                const pct = Math.max(0, 1 - (agent.castTimer / skill.cast));
                ctx.fillRect(-14, 20, 28 * pct, 5);
                ctx.restore();
            }
        }
    }

    // =================================================================================
    // STYLE A: THE IMPERIAL LEGION
    // =================================================================================
    private drawImperialLegion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#3b82f6'; 
        let grad: any = silhouetteColor;
        let accent = silhouetteColor;

        if (!isSilhouette) {
            grad = ctx.createLinearGradient(-20, -40, 20, 40);
            grad.addColorStop(0, '#eff6ff'); 
            grad.addColorStop(0.5, '#93c5fd'); 
            grad.addColorStop(1, '#2563eb');   
            accent = '#3b82f6'; 
        }

        let breathe = (agent.hp > 0) ? Math.sin(t * 3) * 1 : 0;
        let thrustX = 0;
        let armRot = 0;

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const progress = this.getCastProgress(agent);
            if (progress < 0.3) {
                thrustX = -5 * (progress / 0.3);
                armRot = -0.5 * (progress / 0.3);
            } else if (progress < 0.5) {
                thrustX = 15;
                armRot = 1.0;
            } else {
                thrustX = 15 * (1 - (progress - 0.5)/0.5);
                armRot = 1.0 * (1 - (progress - 0.5)/0.5);
            }
        }

        ctx.save();
        ctx.translate(thrustX, breathe);

        // 1. Back Arm
        ctx.save();
        ctx.translate(10, -10);
        ctx.rotate(armRot);
        this.drawImperialWeapon(ctx, agent.role, grad, accent, isSilhouette);
        ctx.restore();

        // 2. Body Shape
        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'transparent'; 
        } else {
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#1e3a8a'; 
            ctx.lineWidth = 1.5;
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
            ctx.moveTo(-18, -30); ctx.lineTo(18, -30);  
            ctx.lineTo(12, 15); ctx.lineTo(-12, 15);   
        } else if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
            ctx.moveTo(-10, -25); ctx.lineTo(10, -25);  
            ctx.lineTo(16, 25); ctx.lineTo(-16, 25);
        } else if (agent.role === Role.RANGER) {
            ctx.moveTo(-8, -25); ctx.lineTo(8, -25);  
            ctx.lineTo(6, 15); ctx.lineTo(-6, 15);
        } else {
            ctx.moveTo(-12, -25); ctx.lineTo(12, -25);  
            ctx.lineTo(8, 15); ctx.lineTo(-8, 15);   
        }
        ctx.closePath();
        
        if (isSilhouette) {
            ctx.stroke();
        } else {
            ctx.fill();
            ctx.fillStyle = '#172554';
            ctx.stroke();
            // Rivets
            if (agent.role === Role.TANK) {
                [[-12,-25], [12,-25], [-8, 10], [8, 10]].forEach(([rx, ry]) => {
                    ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI*2); ctx.fill();
                });
            }
        }

        // 3. Head
        ctx.save();
        ctx.translate(0, (agent.role === Role.TANK ? -35 : -32) + breathe * 0.5);
        if (isSilhouette) {
            ctx.fillStyle = 'transparent';
            ctx.strokeStyle = silhouetteColor;
        } else {
            ctx.fillStyle = grad;
        }
        
        ctx.beginPath();
        if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
            ctx.moveTo(-10, 5); ctx.lineTo(-8, -15); ctx.lineTo(8, -15); ctx.lineTo(10, 5);
        } else if (agent.role === Role.TANK) {
            ctx.rect(-10, -14, 20, 16);
        } else {
            ctx.rect(-8, -12, 16, 14);
        }
        
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fef08a'; ctx.fillRect(-6, -8, 12, 2);
        }
        ctx.restore();

        // 4. Front Arm / Shield
        ctx.save();
        ctx.translate(-12, -8);
        if (agent.role === Role.TANK) {
            ctx.rotate(armRot * 0.2);
            ctx.translate(-5, 5);
            
            if (isSilhouette) {
                ctx.fillStyle = 'transparent';
                ctx.strokeStyle = silhouetteColor;
            } else {
                ctx.fillStyle = '#2563eb'; ctx.strokeStyle = '#fcd34d'; 
            }
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(-10, -20); ctx.lineTo(10, -20);
            ctx.lineTo(10, 10); ctx.lineTo(0, 25); ctx.lineTo(-10, 10);
            ctx.closePath();
            
            if (isSilhouette) ctx.stroke();
            else { ctx.fill(); ctx.stroke(); }
            
        } else if (agent.role === Role.RANGER) {
            ctx.rotate(armRot);
            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor;
                ctx.strokeRect(-2, -2, 4, 15);
            } else {
                ctx.fillStyle = '#334155'; ctx.fillRect(-2, -2, 4, 15);
            }
        } else {
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); 
            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor; ctx.stroke();
            } else {
                ctx.fillStyle = grad; ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore(); 
    }

    private drawImperialWeapon(ctx: CanvasRenderingContext2D, role: Role, grad: any, accent: string, isSilhouette: boolean) {
        if (isSilhouette) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
        }

        if (role === Role.WARRIOR) {
            ctx.beginPath();
            ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
            ctx.lineTo(2, -40); ctx.lineTo(0, -45); ctx.lineTo(-2, -40);
            if (isSilhouette) ctx.stroke();
            else {
                ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#f59e0b'; ctx.fillRect(-6, 0, 12, 3);
            }
        } else if (role === Role.RANGER) {
            ctx.rotate(-Math.PI/2);
            if (isSilhouette) ctx.strokeRect(0, -3, 30, 4);
            else {
                ctx.fillStyle = '#475569'; ctx.fillRect(0, -3, 30, 4);
                ctx.fillStyle = '#78350f'; ctx.fillRect(-10, -2, 10, 6);
            }
        } else if (role === Role.MAGE || role === Role.SUPPORT) {
            if (isSilhouette) ctx.strokeRect(-2, -40, 4, 50);
            else {
                ctx.fillStyle = '#475569'; ctx.fillRect(-2, -40, 4, 50);
                const glow = AssetManager.getGlowSprite(accent);
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(glow, -16, -55, 32, 32); ctx.restore();
                ctx.fillStyle = accent; ctx.fillRect(-6, -45, 12, 12);
            }
        }
    }

    // =================================================================================
    // STYLE B: THE ARCANE COVENANT
    // =================================================================================
    private drawArcaneCovenant(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean) {
        const silhouetteColor = '#ef4444'; 
        let bodyColor = isSilhouette ? 'transparent' : '#78350f'; 
        let glowColor = isSilhouette ? silhouetteColor : '#ef4444'; 
        let secondary = isSilhouette ? silhouetteColor : '#1c1917'; 

        const floatY = (agent.hp > 0) ? Math.sin(t * 2) * 3 : 0;
        let jitterX = 0; let jitterY = 0; let energyGather = 0;

        if (agent.animState === AnimState.ATTACK && agent.hp > 0) {
            const progress = this.getCastProgress(agent);
            if (progress < 0.6) {
                energyGather = progress;
                jitterX = (Math.random() - 0.5) * 3 * progress;
                jitterY = (Math.random() - 0.5) * 3 * progress;
            } else {
                const recoil = (progress - 0.6) / 0.4;
                jitterX = -5 * recoil; 
            }
        }

        ctx.save();
        ctx.translate(jitterX, floatY + jitterY);

        if (isSilhouette) {
            ctx.strokeStyle = silhouetteColor;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'transparent';
        } else {
            ctx.fillStyle = bodyColor;
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
             ctx.ellipse(0, -10, 18, 28, 0, 0, Math.PI*2);
        } else if (agent.role === Role.MAGE || agent.role === Role.SUPPORT) {
             ctx.moveTo(-10, -30); ctx.lineTo(10, -30);
             ctx.lineTo(14, 15); ctx.lineTo(0, 20); ctx.lineTo(-14, 15);
        } else {
             ctx.ellipse(0, -10, 12, 25, 0, 0, Math.PI*2);
        }
        
        if (isSilhouette) ctx.stroke();
        else ctx.fill();
        
        if ((agent.role === Role.MAGE || agent.role === Role.SUPPORT) && agent.hp > 0) {
            const orbGlow = AssetManager.getGlowSprite(glowColor);
            for(let i=0; i<3; i++) {
                const angle = t * 2 + (i * Math.PI * 2 / 3);
                const ox = Math.cos(angle) * (agent.role === Role.MAGE ? 20 : 15) * (1 - energyGather * 0.8);
                const oy = Math.sin(angle) * 5;
                ctx.save(); ctx.translate(ox, oy - 20);
                if(!isSilhouette) { 
                    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
                    ctx.drawImage(orbGlow, -10, -15, 20, 20);
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
                    ctx.fillStyle = glowColor;
                    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.fill();
                } else {
                    ctx.strokeStyle = glowColor;
                    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.stroke();
                }
                ctx.restore();
            }
        }
        
        if (!isSilhouette) {
            ctx.fillStyle = secondary;
            ctx.beginPath(); ctx.ellipse(0, -10, 6, 15, 0, 0, Math.PI*2); ctx.fill();
            const coreGlow = AssetManager.getGlowSprite(glowColor);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 + Math.sin(t*10)*0.2 + energyGather * 0.5;
            ctx.drawImage(coreGlow, -10, -25, 20, 20); ctx.restore();
            ctx.fillStyle = glowColor;
            ctx.beginPath(); ctx.arc(0, -15, 4, 0, Math.PI*2); ctx.fill();
        }

        ctx.save();
        const headBob = (agent.hp > 0) ? Math.sin(t*3.5)*2 : 0;
        ctx.translate(0, (agent.role === Role.TANK ? -45 : -40) + headBob); 
        
        if (isSilhouette) {
            ctx.fillStyle = 'transparent'; ctx.strokeStyle = silhouetteColor;
        } else {
            ctx.fillStyle = '#f5f5f4';
        }
        
        ctx.beginPath();
        if (agent.role === Role.TANK) {
            ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(0, 12);
        } else {
            ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(0, 8);
        }
        
        if (isSilhouette) ctx.stroke();
        else {
            ctx.fill();
            ctx.fillStyle = glowColor;
            ctx.fillRect(-3, -4, 2, 2); ctx.fillRect(1, -4, 2, 2);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(15, -15);
        if (agent.role === Role.WARRIOR || agent.role === Role.TANK) {
            const bladeAngle = (agent.hp > 0) ? Math.sin(t) * 0.2 + (agent.animState === AnimState.ATTACK ? -1 : 0) : 0;
            ctx.rotate(bladeAngle);
            if(!isSilhouette) {
                const wepGlow = AssetManager.getGlowSprite(glowColor);
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4;
                ctx.drawImage(wepGlow, -10, -20, 30, 30); ctx.restore();
            } else {
                ctx.strokeStyle = silhouetteColor;
            }
            
            if (agent.role === Role.TANK) {
                ctx.lineWidth = 3;
                if (!isSilhouette) ctx.strokeStyle = glowColor;
                ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI/2, 3*Math.PI/2); ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(0, 10); ctx.lineTo(5, -30); ctx.lineTo(-2, -25);
                if (isSilhouette) ctx.stroke(); else { ctx.fillStyle = glowColor; ctx.fill(); }
            }
        } else if (agent.role === Role.RANGER) {
            ctx.translate(5, 0);
            ctx.rotate(agent.animState === AnimState.ATTACK ? -0.5 : 0);
            if (isSilhouette) {
                ctx.strokeStyle = silhouetteColor;
                ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(15, 0); ctx.lineTo(-5, 5); ctx.stroke();
            } else {
                ctx.fillStyle = secondary;
                ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(15, 0); ctx.lineTo(-5, 5); ctx.fill();
                const wepGlow = AssetManager.getGlowSprite(glowColor);
                ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4;
                ctx.drawImage(wepGlow, 0, -10, 20, 20); ctx.restore();
                ctx.fillStyle = glowColor; ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore(); 
    }

    private getCastProgress(agent: Agent): number {
        if (agent.castingSkillIdx === -1) return 0;
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return 0;
        const raw = agent.castTimer / skill.cast;
        return Math.max(0, Math.min(1, 1 - raw)); 
    }
}
