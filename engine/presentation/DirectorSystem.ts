
// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorSystem — 戰鬥演出導演                           ║
// ║  職責：從排分清單選主角、決定取景群組成員、算鏡頭目標      ║
// ║  觀看陣營 getWatchSide：擊殺播報與連殺字只給這個陣營      ║
// ║  [ARCH] targetId 只在 update 開頭改，擊殺不切鏡           ║
// ║  [ARCH] 主角是榜首：要贏過黏著分、至少看滿最短時間才換，  ║
// ║  主角失效立刻換。計分在 DirectorRoster，取景在            ║
// ║  CameraTargetGroup；鏡頭只收 CAMERA_MOVE（CameraSystem）。 ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { CameraTargetGroup } from "./CameraTargetGroup";
import { DirectorRoster } from "./DirectorRoster";
import { DIRECTOR_PARAM, HEX_SIZE, SHAKE_DIRECTOR_PARAM } from "../../constants";
import { ShakeDirector } from "./ShakeDirector";
import { VisualMath } from "../math/VisualMath";

export class DirectorSystem {
    // Controls
    public enabled: boolean = true;
    public shakeDirector = new ShakeDirector();

    public setShakeTuning(t: { strength?: number; offFocusScale?: number; maxTrauma?: number }): void {
        this.shakeDirector.setTuning(t);
    }

    public getShakeTuning(): { strength: number; offFocusScale: number; maxTrauma: number } {
        return {
            strength: this.shakeDirector.strength,
            offFocusScale: this.shakeDirector.offFocusScale,
            maxTrauma: this.shakeDirector.maxTrauma,
        };
    }

    // State
    private roster = new DirectorRoster();
    private targetGroup = new CameraTargetGroup();
    /** 上次送出的縮放；null＝這局還沒送過 */
    private frameZoom: number | null = null;

    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        this.roster.reset();
        this.targetGroup.clear();
        this.frameZoom = null;
        this.shakeDirector.reset();
        this.publishedWatchSide = undefined;
        // Keep enabled state as is
    }

    /** 導播關閉時的觀看陣營：玩家點選的單位（UICommand SET_WATCH_AGENT） */
    private pickedSide: number | null = null;
    /** 上次發出的 WATCH_SIDE；undefined＝還沒發過 */
    private publishedWatchSide: number | null | undefined = undefined;

    public bind(engine: GameEngine) {
        engine.bus.on('CAMERA_IMPACT', (data) => {
            this.shakeDirector.report(data, engine.state.director.targetId);
        });
    }

    public setPickedSide(side: number | null): void {
        this.pickedSide = side;
    }

    /**
     * 觀看陣營：導播開著看導播目標的陣營，關著看玩家點選的單位；都沒有回 null（不播）。
     * 擊殺不切鏡，所以同一個 tick 稍後讀到的仍是擊殺發生前的目標。
     */
    public getWatchSide(engine: GameEngine): number | null {
        if (!this.enabled) return this.pickedSide;
        const id = engine.state.director.targetId;
        const target = id ? engine.agents.find(a => a.id === id) : undefined;
        return target ? target.side : null;
    }

    /** 觀看陣營改變才發 WATCH_SIDE（AudioSystem 只能經 bus 取得） */
    private publishWatchSide(engine: GameEngine): void {
        const side = this.getWatchSide(engine);
        if (side === this.publishedWatchSide) return;
        this.publishedWatchSide = side;
        engine.bus.emit('WATCH_SIDE', { side });
    }

    public update(engine: GameEngine, dt: number) {
        const shake = this.shakeDirector.consume();
        if (shake >= SHAKE_DIRECTOR_PARAM.MIN_OUTPUT) {
            engine.bus.emit('CAMERA_SHAKE', { intensity: shake });
        }
        if (!this.enabled) {
            this.publishWatchSide(engine);
            return;
        }

        const ds = engine.state.director;
        const isEligible = (a: Agent) => this.isEligible(engine, a);
        this.roster.update(engine.agents, dt, isEligible);
        this.decideTarget(engine, ds, dt);
        this.publishWatchSide(engine);

        const frame = this.buildFrame(engine, ds.targetId, dt);
        engine.bus.emit('CAMERA_MOVE', frame);
    }

    /** 能上鏡：活著、在場上、沒有正在墜落（避免鏡頭被帶走） */
    private isEligible(engine: GameEngine, a: Agent): boolean {
        return a.hp > 0 && !a.banished && !a.outOfBounds
            && a.physics.z >= -DIRECTOR_PARAM.FALL_DEPTH && engine.isValid(a.q, a.r);
    }

    private decideTarget(engine: GameEngine, ds: GameEngine['state']['director'], dt: number) {
        if (ds.focusTimer > 0) ds.focusTimer -= dt;

        const current = ds.targetId ? engine.agents.find(a => a.id === ds.targetId) : undefined;
        const top = this.roster.ranked[0];

        if (!current || !this.isEligible(engine, current)) {
            // 榜上沒人（大家都在發呆）時隨便一個能上鏡的，觀看陣營才有值
            const next = top?.agent ?? engine.agents.find(a => this.isEligible(engine, a));
            ds.targetId = next ? next.id : null;
            ds.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
            return;
        }

        if (ds.focusTimer > 0 || !top || top.agent === current) return;
        if (top.score >= this.roster.scoreOf(current.id) + DIRECTOR_PARAM.STICKY_SCORE) {
            ds.targetId = top.agent.id;
            ds.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
        }
    }

    private agentVisualY(a: Agent): number {
        return VisualMath.getVisualBodyCenterY(a.py + a.physics.y, a.physics.z);
    }

    private wantAgent(a: Agent, weight: number, radius: number) {
        this.targetGroup.want(a.id, a.px + a.physics.x, this.agentVisualY(a), weight, radius);
    }

    /** 群組成員：主角、和主角有關的人、所有放奧義的人（和主角無關也算）、榜上前幾名 */
    private buildFrame(engine: GameEngine, anchorId: string | null, dt: number): { x: number, y: number, zoom: number } {
        const anchor = anchorId ? engine.agents.find(a => a.id === anchorId) : undefined;
        if (anchor) {
            this.wantAgent(anchor, DIRECTOR_PARAM.ANCHOR_WEIGHT, DIRECTOR_PARAM.ANCHOR_RADIUS);
            const target = anchor.target;
            if (target && this.isEligible(engine, target)) {
                this.wantAgent(target, DIRECTOR_PARAM.RELATED_WEIGHT, DIRECTOR_PARAM.RELATED_RADIUS);
            }
        }

        for (const a of engine.agents) {
            if (!this.isEligible(engine, a) || a.castingSkillIdx === -1) continue;
            const skill = a.skills[a.castingSkillIdx];
            if (skill?.tag === 'ULT') {
                this.wantAgent(a, DIRECTOR_PARAM.ULT_WEIGHT, DIRECTOR_PARAM.ULT_RADIUS);
                if (skill.type === 'AOE' && a.targetHex) {
                    const p = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
                    this.targetGroup.want(`${a.id}:aoe`, p.x, p.y, DIRECTOR_PARAM.AOE_WEIGHT, (skill.aoeRadius || 1) * HEX_SIZE);
                }
            } else if (anchor && a.target === anchor) {
                this.wantAgent(a, DIRECTOR_PARAM.ATTACKER_WEIGHT, DIRECTOR_PARAM.RELATED_RADIUS);
            }
        }

        let extras = 0;
        for (const entry of this.roster.ranked) {
            if (extras >= DIRECTOR_PARAM.TOP_EXTRAS) break;
            if (entry.agent === anchor) continue;
            this.wantAgent(entry.agent, DIRECTOR_PARAM.TOP_WEIGHT, DIRECTOR_PARAM.TOP_RADIUS);
            extras++;
        }

        this.targetGroup.advance(dt);

        if (this.targetGroup.size === 0) {
            const centerQ = Math.floor((engine.mapConfig.w - 1) / 2);
            const centerR = Math.floor((engine.mapConfig.h - 1) / 2);
            const centerPx = HexUtils.toPx(centerQ, centerR, engine.mapConfig);
            return { x: centerPx.x, y: centerPx.y, zoom: this.limitZoom(DIRECTOR_PARAM.EMPTY_ZOOM, dt) };
        }

        const solved = this.targetGroup.solve(engine.screenW, engine.screenH);
        solved.zoom = this.limitZoom(solved.zoom, dt);
        return solved;
    }

    /** 縮放的速度上限（比例速度，放大縮小看起來一樣快） */
    private limitZoom(zoom: number, dt: number): number {
        if (this.frameZoom === null) {
            this.frameZoom = zoom;
            return zoom;
        }
        const step = DIRECTOR_PARAM.ZOOM_RATE_PER_S * dt;
        const delta = Math.max(-step, Math.min(step, Math.log(zoom / this.frameZoom)));
        this.frameZoom *= Math.exp(delta);
        return this.frameZoom;
    }
}
