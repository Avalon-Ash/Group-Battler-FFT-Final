import { Agent, MapConfig, Team } from "../../../../types";
import { UNIT_SPRITE, UNIT_SCALE, PALETTE } from "../../../../constants";
import { SpriteUnitRenderer } from "../factions/SpriteUnitRenderer";
import { DEFAULT_FRAME_COUNTS } from "../../../../data/units/appearance/selectSpriteFrame";
import { VisualMath } from "../../../math/VisualMath";
import { computeDeathOffset } from "../../../../data/units/appearance/deathMotion";

export class UnitDeathPainter {

    /**
     * 繪製死亡中的單位（hp <= 0 且尚未 fullyDead）
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        agent: Agent,
        visX: number,
        visY: number,
        alpha: number,
        t: number,
        _cfg: Partial<MapConfig> = {},
        _terrainHeight: number,
        _simDt: number = 0.016
    ): void {
        if (agent.fullyDead) return;

        const totalAnimTime = (DEFAULT_FRAME_COUNTS.death ?? 6) / (UNIT_SPRITE.deathFps || 8);
        const duration = agent.DEATH_ANIM_DURATION || 5.5;
        const fadeDuration = UNIT_SPRITE.deathFadeDuration || 1.2;
        const fadeStart = Math.max(totalAnimTime, duration - fadeDuration);

        let fadeAlpha = 1.0;
        let sinkY = 0;
        if (agent.deathTimer > fadeStart) {
            const fadeProg = Math.min(1.0, (agent.deathTimer - fadeStart) / Math.max(0.01, duration - fadeStart));
            fadeAlpha = 1.0 - fadeProg;
            sinkY = fadeProg * (UNIT_SPRITE.deathSinkDistance || 12);
        }

        if (fadeAlpha <= 0) return;

        const pz = agent.physics.z;
        const bodyY = VisualMath.getVisualBodyCenterY(visY, pz);

        // 擊飛：以 Ragdoll 軀幹的初速（impact 方向）與死亡經過時間推導滑行與彈跳（渲染層無狀態）
        let torsoVx = 0, torsoVy = 0, torsoVz = 0;
        const bones = agent.ragdoll;
        if (bones) {
            for (let i = 0; i < bones.length; i++) {
                if (bones[i].id === 'torso') {
                    torsoVx = bones[i].vx;
                    torsoVy = bones[i].vy;
                    torsoVz = bones[i].vz;
                    break;
                }
            }
        }
        const knock = computeDeathOffset(torsoVx, torsoVy, torsoVz, agent.deathTimer);

        ctx.save();
        ctx.globalAlpha = fadeAlpha * alpha;
        ctx.translate(visX + knock.x, bodyY + sinkY + knock.y - knock.lift);
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        if (SpriteUnitRenderer.canRender(agent)) {
            SpriteUnitRenderer.draw(ctx, agent, t, false);
        } else {
            const palette = PALETTE.TEAMS[agent.team] || PALETTE.TEAMS[Team.BLUE];
            ctx.fillStyle = palette.main;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * 計算死亡進度（0.0 = 剛死，1.0 = 完全消失）
     */
    public static getDeathProgress(agent: Agent): number {
        if (!agent.deathTimer || agent.deathTimer <= 0) return 0;
        const duration = agent.DEATH_ANIM_DURATION; 
        return Math.min(1.0, agent.deathTimer / duration);
    }
}
