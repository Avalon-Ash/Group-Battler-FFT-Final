
// ╔══════════════════════════════════════════════════════════╗
// ║  UnitBodyPainter — 存活單位的主體繪製                    ║
// ║  職責：hp > 0 單位的本體（精靈或替換本體）與衝刺殘影       ║
// ║  （血條在 HUDRenderer、狀態在 StatusOrchestrator）       ║
// ║  [ARCH] 陣營外觀來源：FACTION_SKINS (SSOT)               ║
// ║  [ARCH] hp <= 0 時 early return，死亡演出由 UnitDeathPainter ║
// ║  [ARCH] AnimState 由 AnimationSystem 寫入，此處唯讀       ║
// ║  [ARCH] 衝刺殘影：本體之前呼叫 UnitAfterimagePainter，偏移讀 ║
// ║  UnitFrame.ghosts（局部座標原點＝腳底繪製點，RenderSpec §10）║
// ║  [ARCH] 本體替換：變羊 → PolymorphPainter（取代精靈）、凍結 → ║
// ║  FrozenPainter（疊在精靈上）；兩者都畫在同一個局部座標，腳底  ║
// ║  貼 UNIT_SPRITE.footOffsetLocal，不新增座標／排序規則        ║
// ║  [ARCH] 純繪製動態（浮動、傾斜、奧義脈動、出生下落）參數在  ║
// ║  UNIT_BODY_MOTION；只動局部座標，不進 UnitFrame／排序鍵，   ║
// ║  發射點不跟著浮動（RenderSpec §4）                          ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../game";
import { AnimState, MovementType } from "../../../../types";
import { UNIT_SCALE, VFX_PARAM, UNIT_SPRITE, UNIT_BODY_MOTION } from "../../../../constants";
import { SpriteUnitRenderer } from "../factions/SpriteUnitRenderer";
import { PolymorphPainter } from "./PolymorphPainter";
import { FrozenPainter } from "./FrozenPainter";
import { VisualMath } from "../../../math/VisualMath";
import { getFactionSkin } from "../../../../data/units/factionSkin";
import { UnitAfterimagePainter } from "./UnitAfterimagePainter";
import type { UnitFrame } from "../../frame/UnitFrame";
import { unitFallProgress } from "../../../../data/units/appearance/fallMotion";

export const UnitBodyPainter = {
    draw(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        px: number, py: number, 
        t: number, 
        isSilhouette: boolean, 
        _isSelected: boolean,
        _scaleFactor: number,
        terrainHeight: number,
        frame: UnitFrame | null = null
    ) {
        if (agent.hp <= 0 || agent.banished || agent.outOfBounds) return;
        
        const vx = agent.physics.vx;
        const vy = agent.physics.vy;
        const speedSq = vx*vx + vy*vy;
        
        let tiltAngle = 0;

        if (speedSq > VFX_PARAM.SPEED_TRAIL_THRESHOLD_SQ) {
            const speed = Math.sqrt(speedSq);
            
            const dirX = vx / speed;
            const dot = dirX * agent.facing; 
            const tiltFactor = Math.min(1.0, speed / VFX_PARAM.SPEED_MAX_TILT_REF) * UNIT_BODY_MOTION.maxTilt;

            if (dot > 0) tiltAngle = tiltFactor * agent.facing;
            else tiltAngle = -tiltFactor * agent.facing * UNIT_BODY_MOTION.brakeTiltMult;
        }

        const finalRotation = agent.physics.angle + tiltAngle;

        const bob = agent.movementType === MovementType.FLYING ? UNIT_BODY_MOTION.flyingBob : UNIT_BODY_MOTION.groundBob;
        const bodyFloat = Math.sin(t * bob.freq) * bob.amplitude;

        // 衝刺／高速移動殘影：本體之前、單位局部座標（原點＝腳底繪製點），偏移來自 UnitFrame（RenderSpec §10）
        if (frame && frame.ghostCount > 0 && !isSilhouette && agent.visualStatus !== 'POLYMORPH') {
            UnitAfterimagePainter.draw(ctx, agent, frame, t, finalRotation, bodyFloat);
        }

        ctx.save(); 
        const pz = agent.physics.z;
        const bodyY = VisualMath.getVisualBodyCenterY(py, pz);
        ctx.translate(px + agent.visualOffset.x, bodyY + agent.visualOffset.y);

        // 墜落：繞身體中心翻滾並縮小（淡出由 UnitRenderSystem.drawAssembly 整組套用）
        const fall = unitFallProgress(pz);
        if (fall > 0) {
            ctx.rotate(fall * UNIT_BODY_MOTION.fallTumble * agent.facing);
            const fs = 1 - fall * UNIT_BODY_MOTION.fallShrink;
            ctx.scale(fs, fs);
        }

        if (agent.animState === AnimState.CAST_ULT) {
            const progress = 1 - (agent.castTimer / (agent.castingAnimationTimer || 1));
            const ultPulse = 1 + UNIT_BODY_MOTION.ultPulseAmp * Math.abs(Math.sin(progress * Math.PI * UNIT_BODY_MOTION.ultPulseCycles));
            ctx.scale(ultPulse, ultPulse);
        }

        if (agent.spawnTimer > 0) {
            const progress = 1 - (agent.spawnTimer / UNIT_SPRITE.spawnDuration); 
            const eased = 1 - Math.pow(1 - progress, 3); 
            const dropOffset = (1 - eased) * UNIT_BODY_MOTION.spawnDrop;
            ctx.translate(0, dropOffset);
            ctx.globalAlpha *= eased;
        }

        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        ctx.rotate(finalRotation);

        ctx.translate(0, bodyFloat);

        if (agent.visualStatus === 'POLYMORPH') {
            PolymorphPainter.draw(ctx, agent, t, isSilhouette);
        } else {
            // Layer 2: Main Body (Sprite Atlas with 5-line team circle fallback on load failure)
            if (SpriteUnitRenderer.canRender(agent)) {
                SpriteUnitRenderer.draw(ctx, agent, t, isSilhouette);
            } else {
                ctx.fillStyle = isSilhouette ? UNIT_SPRITE.fallbackSilhouetteColor : getFactionSkin(agent.team).fallbackBodyColor;
                ctx.beginPath();
                ctx.arc(0, 0, UNIT_SPRITE.fallbackRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Layer 3: Overlay Status (Ice Block：六角稜柱，烘焙一次)
            if (agent.visualStatus === 'FROZEN' && !isSilhouette) {
                FrozenPainter.draw(ctx);
            }
        }
        
        ctx.restore(); 
    }
};
