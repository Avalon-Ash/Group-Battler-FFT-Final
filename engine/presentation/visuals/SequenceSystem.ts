
// ╔══════════════════════════════════════════════════════════════════╗
// ║  SequenceSystem — 技能特效時序與動作排程系統                      ║
// ║  職責：管理 VFXSequence 動態動作佇列與派發（PARTICLE / BEAM 等）  ║
// ║  [ARCH] 遵守 RenderSpec §4.1 目標錨點採樣時點規則：             ║
// ║    單體有詠唱非投射物在 lockAt 前每幀採樣 VisualMath.getUnitAnchor║
// ║    首次 battleTime >= lockAt 鎖定錨點；AOE 與舊呼叫維持原快照     ║
// ║    鎖定前已生成的粒子（充能式資產在詠唱開始就生成）跟著目標平移   ║
// ║  [ARCH] 每次 run 有編號，生成的粒子記 seqRun；CAST_BREAK 只清掉  ║
// ║    被打斷那次詠唱序列（castRun）的佇列與粒子，不動同施法者的舊餘波║
// ╚══════════════════════════════════════════════════════════════════╝

import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { Point3D } from "../../math/VisualMath";
import { VFXSequence, VFXAction } from "../../../types/VFXSchema";
import { VisualMath } from "../../math/VisualMath";
import { ISO_SCALE_Y, PHYSICS, ULT_FEEL } from "../../../constants";
import { Agent, Team } from "../../../types";
import { Particle } from "../vfx/state";
import { vfxPartStore } from "../../renderers/vfxparts/VFXPartStore";
import { METEOR_PARTS, METEOR_NEUTRAL, METEOR_SIZE, METEOR_SHADOW_ANIM } from "../../../data/vfx/registry/shared_parts";

import { HexUtils, MapConfig } from "../../utils";
import { ultFeelStore } from "../vfx/UltFeelStore";

export interface SequenceRunOptions {
    targetId?: string;
    lockAt?: number;
    /** CAST_START 的詠唱序列：CAST_BREAK 時 cancel(sourceId) 清掉這次的佇列與已生成粒子 */
    castRun?: boolean;
}

interface SequenceTargetBinding {
    targetId: string;
    lockAt: number;
    locked: boolean;
    lastAnchor: Point3D;
    /** 目標腳下地面高度（粒子跟隨時只補地面高低差，不跟 physics.z 跳動） */
    lastGround: number;
    runId: number;
    /** 鎖定前由這個序列生成、要跟著目標平移的粒子 */
    particles: Set<Particle>;
}

interface QueuedAction {
    executeAt: number;
    action: VFXAction;
    target: Point3D;
    source?: Point3D;
    sourceId?: string; // Track who started this sequence
    binding?: SequenceTargetBinding;
    runId: number;
}

export class SequenceSystem {
    private actionQueue: QueuedAction[] = [];
    private scratchOffset = { x: 0, y: 0 };
    private nextRunId = 1;
    /** 每個施法者最近一次詠唱序列的編號（cancel 用） */
    private castRunBySource = new Map<string, number>();
    /** 還沒鎖定、帶著已生成粒子的綁定（佇列清空後仍要跟到 lockAt） */
    private following = new Set<SequenceTargetBinding>();

    /**
     * 確定性向日葵分佈偏移（C: STORM 落點散布）
     * 角度 k × 2.39996（黃金角）、距離 √((k + 0.5) / count) × 半徑像素；
     * 半徑像素＝scatterRings 圈最外層格心與中心格心的距離。不得用 Math.random。
     */
    public static computeScatterOffset(
        scatterRings: number,
        k: number,
        count: number,
        mapConfig: MapConfig,
        out?: { x: number; y: number }
    ): { x: number; y: number } {
        const pt = out ?? { x: 0, y: 0 };
        if (scatterRings <= 0 || count <= 0) {
            pt.x = 0;
            pt.y = 0;
            return pt;
        }
        const p0 = HexUtils.toPx(0, 0, mapConfig);
        const pR = HexUtils.toPx(scatterRings, 0, mapConfig);
        const radiusPx = Math.hypot(pR.x - p0.x, pR.y - p0.y);
        const theta = k * 2.39996;
        const dist = Math.sqrt((k + 0.5) / count) * radiusPx;
        pt.x = Math.cos(theta) * dist;
        pt.y = Math.sin(theta) * dist;
        return pt;
    }

    /**
     * 散布落點邊界約束（UF4 / ART_SPEC §6）：
     * 若落點超出地圖，沿中心方向以固定比例收縮（最多 MAX_STEPS 次，仍出界則落在中心 (0, 0)），確定性。
     */
    public static clampScatterToMap(
        target: { x: number; y: number },
        offset: { x: number; y: number },
        mapConfig: MapConfig,
        isValidTile: (q: number, r: number) => boolean,
        retractRatio: number = ULT_FEEL.SCATTER_CLAMP_RETRACT_RATIO,
        maxSteps: number = ULT_FEEL.SCATTER_CLAMP_MAX_STEPS
    ): { x: number; y: number } {
        let hex = HexUtils.fromPx(target.x + offset.x, target.y + offset.y, mapConfig);
        if (isValidTile(hex.q, hex.r)) {
            return offset;
        }
        for (let step = 0; step < maxSteps; step++) {
            offset.x *= retractRatio;
            offset.y *= retractRatio;
            hex = HexUtils.fromPx(target.x + offset.x, target.y + offset.y, mapConfig);
            if (isValidTile(hex.q, hex.r)) {
                return offset;
            }
        }
        offset.x = 0;
        offset.y = 0;
        return offset;
    }

    public clear() {
        this.actionQueue = [];
        this.castRunBySource.clear();
        this.following.clear();
    }

    /**
     * 詠唱被打斷：清掉這個施法者的待派發動作，以及最近一次詠唱序列已生成的粒子
     * （充能式奧義在詠唱開始就生成全部粒子，命中發射器靠 delay 倒數，不清會在原本的命中時刻爆開）
     */
    public cancel(sourceId: string, vfx?: VFXSystem) {
        if (!sourceId) return;
        this.actionQueue = this.actionQueue.filter(item => item.sourceId !== sourceId);
        const runId = this.castRunBySource.get(sourceId);
        if (runId === undefined) return;
        this.castRunBySource.delete(sourceId);
        for (const binding of this.following) {
            if (binding.runId === runId) this.following.delete(binding);
        }
        if (vfx) vfx.state.cancelSequenceRun(runId);
    }

    public run(
        sequence: VFXSequence,
        target: Point3D,
        engine: GameEngine,
        vfx: VFXSystem,
        sourceId?: string,
        startDelay: number = 0,
        options?: SequenceRunOptions
    ) {
        let sourcePos: Point3D | undefined;
        if (sourceId) {
            const agent = engine.agents.find(a => a.id === sourceId);
            if (agent) sourcePos = VisualMath.getCoreAnchor(agent, engine);
        }

        const runId = this.nextRunId++;
        if (options?.castRun && sourceId) this.castRunBySource.set(sourceId, runId);

        let binding: SequenceTargetBinding | undefined;
        if (options?.targetId && typeof options.lockAt === 'number') {
            const targetAgent = engine.agents.find(a => a.id === options.targetId);
            if (targetAgent) {
                const anchor = VisualMath.getUnitAnchor(targetAgent, engine);
                binding = {
                    targetId: options.targetId,
                    lockAt: options.lockAt,
                    locked: engine.battleTime >= options.lockAt,
                    lastAnchor: { x: anchor.x, y: anchor.y, z: anchor.z },
                    lastGround: this.groundOf(targetAgent, engine),
                    runId,
                    particles: new Set(),
                };
            }
        }

        const baseTime = engine.battleTime;
        sequence.actions.forEach(action => {
            const executeAt = baseTime + startDelay + (action.delay || 0);
            if (executeAt <= baseTime) {
                const actionTarget = binding ? (binding.locked ? binding.lastAnchor : { ...binding.lastAnchor }) : target;
                this.dispatch(action, actionTarget, sourcePos, vfx, engine, runId, binding, sourceId);
            } else {
                this.actionQueue.push({ executeAt, action, target, source: sourcePos, sourceId, binding, runId });
            }
        });
    }

    private groundOf(agent: Agent, engine: GameEngine): number {
        return VisualMath.getUnitGroundHeight(agent, (q, r) => engine.getTerrainHeight(q, r), engine.mapConfig);
    }

    /** 已生成的粒子跟著目標平移（粒子 y 是未投影座標，要除 ISO_SCALE_Y；高度只補地面高低差）。光束兩端另有自己的座標，不動 */
    private follow(binding: SequenceTargetBinding, dx: number, dy: number, dz: number) {
        const rawDy = dy / ISO_SCALE_Y;
        for (const p of binding.particles) {
            if (!p.active || p.seqRun !== binding.runId) {
                binding.particles.delete(p);
                continue;
            }
            if (p.lockReason === 'BEAM') continue;
            p.x += dx;
            p.y += rawDy;
            p.z += dz;
            if (p.spawnZ !== undefined) p.spawnZ += dz;
            if (p.targetX !== undefined) p.targetX += dx;
            if (p.targetY !== undefined) p.targetY += rawDy;
        }
    }

    public update(engine: GameEngine, vfx: VFXSystem) {
        const now = engine.battleTime;

        // F02: 在派發到期 action 之前更新尚未鎖定的 binding（佇列裡的，以及帶著已生成粒子的）
        const activeBindings = new Set<SequenceTargetBinding>(this.following);
        for (const item of this.actionQueue) {
            if (item.binding && !item.binding.locked) {
                activeBindings.add(item.binding);
            }
        }

        for (const binding of activeBindings) {
            const targetAgent = engine.agents.find(a => a.id === binding.targetId);
            if (targetAgent) {
                // 目標在 engine.agents 中（含 hp <= 0 仍在集合中的情況），更新為最新錨點
                const anchor = VisualMath.getUnitAnchor(targetAgent, engine);
                const ground = this.groundOf(targetAgent, engine);
                if (binding.particles.size > 0) {
                    this.follow(binding, anchor.x - binding.lastAnchor.x, anchor.y - binding.lastAnchor.y, ground - binding.lastGround);
                }
                binding.lastAnchor = { x: anchor.x, y: anchor.y, z: anchor.z };
                binding.lastGround = ground;
            }
            // 首次 battleTime >= lockAt 時永久鎖定；已生成的粒子從此留在原地
            if (now >= binding.lockAt) {
                binding.locked = true;
                binding.particles.clear();
                this.following.delete(binding);
            }
        }

        for (let i = this.actionQueue.length - 1; i >= 0; i--) {
            const item = this.actionQueue[i];
            if (now >= item.executeAt) {
                let liveSource = item.source;
                if (item.sourceId) {
                    const agent = engine.agents.find(a => a.id === item.sourceId);
                    if (agent && agent.hp > 0) {
                        liveSource = VisualMath.getCoreAnchor(agent, engine);
                    }
                }
                const actionTarget = item.binding ? item.binding.lastAnchor : item.target;
                this.dispatch(item.action, actionTarget, liveSource, vfx, engine, item.runId, item.binding, item.sourceId);
                this.actionQueue.splice(i, 1);
            }
        }
    }

    private teamOf(sourceId: string | undefined, engine: GameEngine): Team | undefined {
        return sourceId ? engine.agents.find(a => a.id === sourceId)?.team : undefined;
    }

    private dispatch(
        action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine,
        runId: number, binding?: SequenceTargetBinding, sourceId?: string
    ) {
        const firstNew = vfx.state.particles.length;
        this.dispatchAction(action, target, source, vfx, engine, sourceId);
        // 這次派發新增的粒子都接在 particles 尾端（VFXPlayer、playBeam、HEAVEN_FALL 都是 push）
        const particles = vfx.state.particles;
        const follows = binding !== undefined && !binding.locked;
        for (let i = firstNew; i < particles.length; i++) {
            particles[i].seqRun = runId;
            if (follows) binding.particles.add(particles[i]);
        }
        if (follows && binding.particles.size > 0) this.following.add(binding);
    }

    private dispatchAction(action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine, sourceId?: string) {
        const effectId = action.id || 'FX_HIT_GENERIC';
        
        const groundZ = target.z - VisualMath.Z_LAYERS.DECAL; 

        switch (action.type) {
            case 'PARTICLE':
                if (action.scatterRings && action.scatterRings > 0) {
                    SequenceSystem.computeScatterOffset(
                        action.scatterRings,
                        action.scatterIndex ?? 0,
                        action.scatterCount ?? 1,
                        engine.mapConfig,
                        this.scratchOffset
                    );
                    const isTileValid = (q: number, r: number): boolean => engine.isValid(q, r);
                    SequenceSystem.clampScatterToMap(
                        target,
                        this.scratchOffset,
                        engine.mapConfig,
                        isTileValid
                    );
                    const finalX = target.x + this.scratchOffset.x;
                    const finalY = target.y + this.scratchOffset.y;
                    const hex = HexUtils.fromPx(finalX, finalY, engine.mapConfig);
                    const finalZ = engine.getTerrainHeight(hex.q, hex.r) + 5;
                    const finalGroundZ = finalZ - VisualMath.Z_LAYERS.DECAL;
                    vfx.playEffect(effectId, finalX, finalY, finalZ, action.color, finalGroundZ, undefined, undefined, action.scale ?? 1);
                } else {
                    vfx.playEffect(effectId, target.x, target.y, target.z, action.color, groundZ, undefined, undefined, action.scale ?? 1);
                }
                break;
            case 'BEAM':
                if (source) {
                    vfx.playBeam(action.style || 'GENERIC_BEAM', source, target, action.color, action.duration || 0.4, action.scale ?? 1, this.teamOf(sourceId, engine));
                }
                break;
            case 'SHAKE':
                engine.bus.emit('CAMERA_SHAKE', { intensity: action.shakeIntensity || 0.3 });
                break;
            case 'GRID_PULSE':
                // 依施法者陣營選格子脈衝；曾用 action.color 是否含 '#3b' 判斷，29 個藍方技能播成紅色（docs/VFX_PIPELINE_MAP.md §2.3）
                vfx.playEffect(this.teamOf(sourceId, engine) === Team.BLUE ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED', target.x, target.y, groundZ + VisualMath.Z_LAYERS.HAZARD, action.color, groundZ, undefined, undefined, action.scale ?? 1);
                break;
            case 'HEAVEN_FALL': {
                const h = action.height || 1200;
                const life = Math.sqrt((2 * h) / PHYSICS.GRAVITY) + METEOR_SIZE.FALL_PAD;
                const size = (action.scale || 1.8) * 80;
                const spawn = (): Particle => {
                    const p = vfx.state.getParticle();
                    p.x = target.x; p.y = target.y; p.z = target.z + h;
                    p.vz = 0;
                    p.life = life; p.maxLife = life;
                    p.color = action.color || '#fff';
                    p.size = size;
                    p.locked = false;
                    p.pIsUlt = true;
                    vfx.state.particles.push(p);
                    return p;
                };
                // 隕石零件（data/vfx/registry/shared_parts.ts）：岩塊＋光暈兩顆 PART_DEBRIS 同步自由落體。
                // 序列只產生 METEOR 樣式；查不到施法者陣營時用中性色階。
                const team = this.teamOf(sourceId, engine);
                const m = team !== undefined ? METEOR_PARTS[team] : METEOR_NEUTRAL;
                const rock = spawn();
                rock.type = 'PART_DEBRIS';
                rock.part = vfxPartStore.get({ kind: 'shard', size: size * METEOR_SIZE.ROCK, shape: 'rock', ramp: m.rockRamp, seed: METEOR_SIZE.SEED });
                rock.vRotation = METEOR_SIZE.SPIN[0] + Math.random() * (METEOR_SIZE.SPIN[1] - METEOR_SIZE.SPIN[0]);
                const glow = spawn();
                glow.type = 'PART_DEBRIS';
                glow.part = vfxPartStore.get({ kind: 'glow', radius: size * METEOR_SIZE.GLOW, ramp: m.glowRamp });
                // 落點影子：貼地、不動，壽命＝墜落時間，越接近落地越大越深（讓玩家看得出會砸在哪）
                const shadow = spawn();
                shadow.type = 'PART_GROUND';
                shadow.z = groundZ;
                shadow.locked = true;
                shadow.life = shadow.maxLife = life - METEOR_SIZE.FALL_PAD;
                shadow.part = vfxPartStore.get({ kind: 'smoke', radius: size * METEOR_SIZE.SHADOW, color: 'CHAR', roughness: METEOR_SIZE.SHADOW_ROUGHNESS, seed: METEOR_SIZE.SEED });
                shadow.partAnim = METEOR_SHADOW_ANIM;
                break;
            }
            case 'ULT_IMPACT':
                ultFeelStore.recordImpact(
                    target.x,
                    target.y,
                    target.z,
                    this.teamOf(sourceId, engine),
                    engine.battleTime
                );
                break;
        }
    }
}
