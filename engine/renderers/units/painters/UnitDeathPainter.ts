import { Agent, MapConfig, Team } from "../../../../types";
import { UNIT_SPRITE, UNIT_SCALE, PALETTE } from "../../../../constants";
import { SpriteUnitRenderer } from "../factions/SpriteUnitRenderer";
import { DEFAULT_FRAME_COUNTS } from "../../../../data/units/appearance/selectSpriteFrame";
import { VisualMath } from "../../../math/VisualMath";
import { computeDeathOffset, DeathOffset } from "../../../../data/units/appearance/deathMotion";

export class UnitDeathPainter {

    /**
     * 死亡擊飛位移：以 Ragdoll 軀幹的初速（受擊方向）與死亡經過時間推導（渲染層無狀態）。
     * x/y 供 UnitRenderSystem 併入繪製位置與深度排序；lift 由本繪製器套用。
     */
    public static getKnockOffset(agent: Agent): DeathOffset {
        let vx = 0, vy = 0, vz = 0;
        const bones = agent.ragdoll;
        if (bones) {
            for (let i = 0; i < bones.length; i++) {
                if (bones[i].id === 'torso') {
                    vx = bones[i].vx;
                    vy = bones[i].vy;
                    vz = bones[i].vz;
                    break;
                }
            }
        }
        return computeDeathOffset(vx, vy, vz, agent.deathTimer);
    }

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
        if (agent.fullyDead || agent.outOfBounds) return;

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

        // 擊飛的水平位移已在提交繪製時併入位置與深度排序（UnitRenderSystem），這裡只負責彈跳離地高度
        const knock = UnitDeathPainter.getKnockOffset(agent);

        ctx.save();
        ctx.globalAlpha = fadeAlpha * alpha;
        ctx.translate(visX, bodyY + sinkY - knock.lift);
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
