
// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorSystem — 戰鬥演出導演                           ║
// ║  職責：從排分清單選主角、決定取景群組成員、算鏡頭目標      ║
// ║  觀看陣營 getWatchSide：擊殺播報與連殺字只給這個陣營      ║
// ║  [ARCH] targetId 只在 update 開頭改，擊殺不切鏡           ║
// ║  [ARCH] 主角是榜首：要贏過黏著分、至少看滿最短時間才換，  ║
// ║  主角失效立刻換。計分在 DirectorRoster，取景在            ║
// ║  玩家操控的單位（契約 G3）優先當主角，不看排分：玩家要   ║
// ║  一直看得到自己控的那一隻，四周留 PLAYER_VIEW_RADIUS_PX。 ║
// ║  [ARCH] 契約 R3：取景縮放、死區與焦點位移皆依              ║
// ║  effectiveViewport(screenW, screenH, viewInsets) 計算，   ║
// ║  主角落在未被 UI 蓋住的有效區域中央。                      ║
// ║  DirectorFight／DirectorShot；鏡頭只收 CAMERA_MOVE。     ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import type { ShotMember } from "../../types";
import { DirectorFight } from "./DirectorFight";
import { CameraWindow, FocusBlend, ShotZoomController, measureMembers } from "./DirectorShot";
import { DirectorRoster } from "./DirectorRoster";
import { DIRECTOR_PARAM, SHAKE_DIRECTOR_PARAM } from "../../constants";
import { ShakeDirector } from "./ShakeDirector";
import { VisualMath } from "../math/VisualMath";
import { effectiveViewport, type ViewInsets } from "./ViewInsets";

export class DirectorSystem {
    // Controls
    public enabled: boolean = true;
    /** [契約 R3] 畫面四邊被 UI 蓋住的寬度（CSS px）。唯一寫入者 UICommandSystem（SET_VIEW_INSETS） */
    public viewInsets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
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
    private fight = new DirectorFight();
    private shot = new ShotZoomController();
    private window = new CameraWindow();
    private blend = new FocusBlend();
    private engaged: boolean = false;
    private framedAnchorId: string | null = null;
    private lastFocus: { x: number; y: number } | null = null;
    /** 上一個 tick 能上鏡的人數；變少代表有人倒下 */
    private eligibleCount = 0;

    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        this.roster.reset();
        this.fight.reset();
        this.shot.reset();
        this.window.reset();
        this.blend.reset();
        this.engaged = false;
        this.framedAnchorId = null;
        this.lastFocus = null;
        this.eligibleCount = 0;
        this.shakeDirector.reset();
        this.publishedWatchSide = undefined;
        // Keep enabled state as is
    }

    /** 導播關閉時的觀看陣營：玩家點選的單位（UICommand SET_WATCH_AGENT） */
    private pickedSide: number | null = null;
    /** 玩家點選的單位（同一個指令）：場上有多個玩家操控的單位時，鏡頭優先跟它 */
    private pickedId: string | null = null;
    /** 上次發出的 WATCH_SIDE；undefined＝還沒發過 */
    private publishedWatchSide: number | null | undefined = undefined;

    public bind(engine: GameEngine) {
        engine.bus.on('CAMERA_IMPACT', (data) => {
            this.shakeDirector.report(data, engine.state.director.targetId);
        });
    }

    public setPicked(agentId: string | null, side: number | null): void {
        this.pickedId = agentId;
        this.pickedSide = side;
    }

    /** 鏡頭要跟的玩家單位：玩家操控、能上鏡；有好幾個時優先點選中的那一個。沒有回 undefined */
    private playerAnchor(engine: GameEngine): Agent | undefined {
        let first: Agent | undefined;
        for (const a of engine.agents) {
            if (a.controller !== 'PLAYER' || !this.isEligible(engine, a)) continue;
            if (a.id === this.pickedId) return a;
            first ??= a;
        }
        return first;
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

        // 玩家操控的單位優先當主角（契約 G3）：不看排分、不等最短時間，別處的奧義也不搶鏡
        const player = this.playerAnchor(engine);
        if (player) {
            if (ds.targetId !== player.id) {
                ds.targetId = player.id;
                ds.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
            }
            return;
        }

        const current = ds.targetId ? engine.agents.find(a => a.id === ds.targetId) : undefined;
        const top = this.roster.ranked[0];

        if (!current || !this.isEligible(engine, current)) {
            // 主角倒下時接它正在打的人，鏡頭留在同一場架；榜上沒人（大家都在發呆）時隨便一個能上鏡的，觀看陣營才有值
            const opponent = current?.target && this.isEligible(engine, current.target) ? current.target : undefined;
            const next = opponent ?? top?.agent ?? engine.agents.find(a => this.isEligible(engine, a));
            ds.targetId = next ? next.id : null;
            ds.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
            return;
        }

        if (!top || top.agent === current) return;

        if (ds.focusTimer > 0) {
            const skill = top.agent.castingSkillIdx !== -1 ? top.agent.skills[top.agent.castingSkillIdx] : undefined;
            const isUlt = skill?.tag === 'ULT';
            const heldEnoughForUlt = (DIRECTOR_PARAM.MIN_HOLD_S - ds.focusTimer) >= DIRECTOR_PARAM.ULT_CUT_HOLD_S;
            if (!isUlt || !heldEnoughForUlt) {
                return;
            }
        }

        if (top.score >= this.roster.scoreOf(current.id) + DIRECTOR_PARAM.STICKY_SCORE) {
            ds.targetId = top.agent.id;
            ds.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
        }
    }

    private buildFrame(engine: GameEngine, anchorId: string | null, dt: number): { x: number, y: number, zoom: number } {
        const eligibleCount = engine.agents.reduce((n, a) => n + (this.isEligible(engine, a) ? 1 : 0), 0);
        if (eligibleCount < this.eligibleCount) this.shot.releaseHold();
        this.eligibleCount = eligibleCount;

        // 1. 第一次接戰
        if (!this.engaged) {
            let hasAction = false;
            for (const a of engine.agents) {
                if (this.isEligible(engine, a) && (a.castingSkillIdx !== -1 || a.view.hitFlashTimer > 0)) {
                    hasAction = true;
                    break;
                }
            }
            if (hasAction) {
                this.engaged = true;
                if (this.lastFocus !== null) {
                    this.blend.begin(this.lastFocus.x, this.lastFocus.y);
                }
            }
        }

        // 2. 換主角
        const anchor = anchorId ? engine.agents.find(a => a.id === anchorId) : undefined;
        const currentAnchorId = anchor ? anchor.id : null;
        if (currentAnchorId !== this.framedAnchorId) {
            this.fight.reset();
            if (this.framedAnchorId !== null && this.lastFocus !== null) {
                this.blend.begin(this.lastFocus.x, this.lastFocus.y);
            }
            this.framedAnchorId = currentAnchorId;
        }

        // 3. 成員
        let members: ShotMember[] = [];
        const followsPlayer = anchor !== undefined && anchor.controller === 'PLAYER';
        if (followsPlayer) {
            // 玩家主角：開戰就跟著它（不先看全場），而且它永遠在畫面正中央。四個權重 0 的點把畫面撐開：
            // 至少看得到四周 PLAYER_VIEW_RADIUS_PX；它的目標比較遠就撐到框得進目標（最多到遠景）。
            const ax = anchor.px + anchor.physics.x;
            const ay = VisualMath.getVisualBodyCenterY(anchor.py + anchor.physics.y, anchor.physics.z);
            let r: number = DIRECTOR_PARAM.PLAYER_VIEW_RADIUS_PX;
            const target = anchor.target;
            if (target && this.isEligible(engine, target)) {
                const reach = Math.hypot(target.px - anchor.px, target.py - anchor.py) + DIRECTOR_PARAM.UNIT_MARGIN_PX;
                r = Math.min(Math.max(r, reach), DIRECTOR_PARAM.SHOT_RADIUS_PX.WIDE);
            }
            members = [
                { x: ax, y: ay, weight: DIRECTOR_PARAM.ANCHOR_WEIGHT },
                { x: ax - r, y: ay, weight: 0 }, { x: ax + r, y: ay, weight: 0 }, { x: ax, y: ay - r, weight: 0 }, { x: ax, y: ay + r, weight: 0 },
            ];
        } else if (!this.engaged) {
            for (const a of engine.agents) {
                if (!this.isEligible(engine, a)) continue;
                members.push({
                    x: a.px + a.physics.x,
                    y: VisualMath.getVisualBodyCenterY(a.py + a.physics.y, a.physics.z),
                    weight: (anchor && a === anchor) ? DIRECTOR_PARAM.ANCHOR_WEIGHT : DIRECTOR_PARAM.RELATED_WEIGHT,
                });
            }
        } else if (anchor) {
            members = this.fight.collect(anchor, engine.agents, (a) => this.isEligible(engine, a), dt);
        }

        // 4. measureMembers
        const ext = measureMembers(members);

        // 5. 焦點與縮放（契約 R3：以扣掉被 UI 蓋住四邊後的有效區域取景）
        const vp = effectiveViewport(engine.screenW, engine.screenH, this.viewInsets);
        let rawFocusX: number;
        let rawFocusY: number;
        let zoom: number;
        if (ext === null) {
            const centerQ = Math.floor((engine.mapConfig.w - 1) / 2);
            const centerR = Math.floor((engine.mapConfig.h - 1) / 2);
            const centerPx = HexUtils.toPx(centerQ, centerR, engine.mapConfig);
            rawFocusX = centerPx.x;
            rawFocusY = centerPx.y;
            zoom = this.shot.zoom;
        } else {
            rawFocusX = ext.cx;
            rawFocusY = ext.cy;
            zoom = this.shot.update(ext, vp.w, vp.h, dt);
        }

        // 6. 平滑焦點與視窗死區；最後將鏡頭目標依有效區域中心位移（除以 zoom 換算成世界座標）
        const focus = this.blend.apply(rawFocusX, rawFocusY, dt);
        this.lastFocus = focus;
        const p = this.window.update(focus.x, focus.y, zoom, vp.w, vp.h);
        return { x: p.x - vp.shiftX / zoom, y: p.y - vp.shiftY / zoom, zoom };
    }
}
