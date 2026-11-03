// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能 A/B（渲染優化輪的臨時診斷，用完刪除） ║
// ║  職責：手機開 ?perf&mute&phoneab，自動逐項改一種繪製方式， ║
// ║        最後列出每項的幀時間。第三輪只拆貼地特效。        ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderStats } from '../engine/renderers/RenderStats';
import { setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { TerrainRenderer } from '../engine/renderers/grid/TerrainRenderer';
import { GroundDrapeLayer } from '../engine/renderers/GroundDrape';
import { HexGeometry } from '../engine/graphics/utils/HexGeometry';
import { ISO_SCALE_Y } from '../constants';
import { SCENE_DB } from '../data/scenes';
import { Role, Team, type HexLayout, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 14;
const SETTLE_S = 1;
const CAST_EVERY_S = 4;
const IMMORTAL_HP = 999999;
const HEAL_BELOW_HP = 500000;
const BASE_TIER: QualityTier = 3;
const SLOW_FRAME_SHARE = 0.05;
const FIXTURE_RADIUS = 4;
const SETUP_WAIT_MS = 800;
const ASSET_POLL_MS = 200;
const REFRESH_EVERY_FRAMES = 3;
const HALF_RES = 0.5;
const ULT_PAIRS = [['mb_u1', 'rr_u2'], ['wb_u4', 'sb_u4'], ['tr_u4', 'mr_u4'], ['rb_u2', 'wr_u5']];

interface Segment {
    id: string;
    label: string;
    noDrape?: boolean;
    noClip?: boolean;
    rectClip?: boolean;
    path2dClip?: boolean;
    noBlend?: boolean;
    refreshEvery?: number;
    offscreenScale?: number;
    noBlit?: boolean;
    noPlanes?: boolean;
}

const SEGMENTS: Segment[] = [
    { id: 'base', label: '現況' },
    { id: 'no_drape', label: '不畫貼地特效', noDrape: true },
    { id: 'no_clip', label: '不裁切', noClip: true },
    { id: 'rect_clip', label: '改矩形裁切', rectClip: true },
    { id: 'path2d', label: '裁切用 Path2D', path2dClip: true },
    { id: 'no_blend', label: '不用 screen 混色', noBlend: true },
    { id: 'every3', label: '離屏每 3 幀更新', refreshEvery: REFRESH_EVERY_FRAMES },
    { id: 'half_res', label: '離屏半解析度', offscreenScale: HALF_RES },
    { id: 'no_blit', label: '只畫離屏不貼回', noBlit: true },
    { id: 'no_planes', label: '不畫詠唱環', noPlanes: true },
    { id: 'base2', label: '現況（再一次）' },
];

interface Row { label: string; fps: number; low: number; ms: number; js: number; clips: number; blits: number; offMp: number; entries: number; }

let active: Segment = SEGMENTS[0];
let frame = 0;
let mainCtx: CanvasRenderingContext2D | null = null;
let hexArgs: { x: number; y: number; r: number; layout: HexLayout } | null = null;
const hexPaths = new Map<string, Path2D>();
const counters = { clips: 0, blits: 0, offPixels: 0, frames: 0 };

interface DrapeEntryView { drawnW: number; drawnH: number; drawnStamp: number; }
interface DrapeInternals {
    ensureRendered(ctx: CanvasRenderingContext2D, e: DrapeEntryView, layout: HexLayout, battleTime: number): boolean;
    drawPlaneOnTile(...args: unknown[]): void;
    stamp: number;
    size: number;
}

function installGates(): void {
    const beginFrame = TerrainRenderer.beginFrame;
    TerrainRenderer.beginFrame = function (transitioning: boolean) {
        frame++;
        counters.frames++;
        beginFrame.call(TerrainRenderer, transitioning);
    };

    const proto = GroundDrapeLayer.prototype as unknown as DrapeInternals;
    const drawOnTile = GroundDrapeLayer.prototype.drawOnTile;
    GroundDrapeLayer.prototype.drawOnTile = function (ctx, ...rest) {
        if (active.noDrape) return;
        mainCtx = ctx;
        drawOnTile.call(this, ctx, ...rest);
        mainCtx = null;
    };

    const ensureRendered = proto.ensureRendered;
    proto.ensureRendered = function (this: DrapeInternals, ctx, e, layout, battleTime) {
        if (e.drawnStamp !== this.stamp && active.refreshEvery && frame % active.refreshEvery !== 0 && e.drawnW > 0) {
            e.drawnStamp = this.stamp;
            return true;
        }
        const fresh = e.drawnStamp !== this.stamp;
        const keepMain = mainCtx;
        mainCtx = null; // 畫離屏這段不算主畫布
        const scale = active.offscreenScale ?? 1;
        const target = scale === 1 ? ctx : ({
            getTransform: () => {
                const t = ctx.getTransform();
                return { a: t.a * scale, b: t.b * scale };
            },
        } as unknown as CanvasRenderingContext2D);
        const result = ensureRendered.call(this, target, e, layout, battleTime);
        mainCtx = keepMain;
        if (fresh) counters.offPixels += e.drawnW * e.drawnH;
        return result;
    };

    const drawPlane = proto.drawPlaneOnTile;
    proto.drawPlaneOnTile = function (this: DrapeInternals, ...args: unknown[]) {
        if (!active.noPlanes) drawPlane.apply(this, args);
    };

    const traceHex = HexGeometry.traceHex;
    HexGeometry.traceHex = function (ctx, x, y, radius, applyIso, layout) {
        if (mainCtx && ctx === mainCtx && layout && (active.rectClip || active.path2dClip || active.noClip)) {
            hexArgs = { x, y, r: radius, layout };
            return;
        }
        traceHex.call(HexGeometry, ctx, x, y, radius, applyIso, layout);
    };

    const ctxProto = CanvasRenderingContext2D.prototype;
    const clip = ctxProto.clip as (this: CanvasRenderingContext2D, ...args: unknown[]) => void;
    ctxProto.clip = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (this === mainCtx) {
            counters.clips++;
            const hex = hexArgs;
            hexArgs = null;
            if (active.noClip) return;
            if (hex && active.rectClip) {
                this.beginPath();
                this.rect(hex.x - hex.r, hex.y - hex.r * ISO_SCALE_Y, hex.r * 2, hex.r * 2 * ISO_SCALE_Y);
                clip.call(this);
                return;
            }
            if (hex && active.path2dClip) {
                const key = `${hex.r}:${hex.layout}`;
                let path = hexPaths.get(key);
                if (!path) {
                    path = new Path2D();
                    HexGeometry.getVertices(hex.r, true, hex.layout).forEach((v, i) => (i === 0 ? path!.moveTo(v.x, v.y) : path!.lineTo(v.x, v.y)));
                    path.closePath();
                    hexPaths.set(key, path);
                }
                this.translate(hex.x, hex.y);
                clip.call(this, path);
                this.translate(-hex.x, -hex.y);
                return;
            }
        }
        clip.apply(this, args);
    } as typeof ctxProto.clip;

    const gco = Object.getOwnPropertyDescriptor(ctxProto, 'globalCompositeOperation');
    if (gco?.set && gco.get) {
        const set = gco.set;
        Object.defineProperty(ctxProto, 'globalCompositeOperation', {
            get: gco.get,
            set(this: CanvasRenderingContext2D, value: GlobalCompositeOperation) {
                if (!(active.noBlend && this === mainCtx)) set.call(this, value);
            },
        });
    }

    const drawImage = ctxProto.drawImage as (this: CanvasRenderingContext2D, ...args: unknown[]) => void;
    ctxProto.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (this === mainCtx) {
            counters.blits++;
            if (active.noBlit) return;
        }
        drawImage.apply(this, args);
    } as typeof ctxProto.drawImage;
}

function setUpBattle(e: GameEngine): void {
    const cmd = (c: UICommand) => e.bus.emit('UI_COMMAND', c);
    cmd({ type: 'STOP_GAME' });
    cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
    cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const desert = SCENE_DB.find((s) => s.id === 'DESERT');
    if (desert) e.currentScene = desert;
    e.map.rebuildMap(e);
    cmd({ type: 'CLEAR_BOARD', keepScene: true });
    const cells: { q: number; r: number }[] = [];
    for (let q = -FIXTURE_RADIUS; q <= FIXTURE_RADIUS; q++) {
        for (let r = -FIXTURE_RADIUS; r <= FIXTURE_RADIUS; r++) {
            if (e.isValid(q, r) && !e.hasObstacle(q, r) && Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= FIXTURE_RADIUS) cells.push({ q, r });
        }
    }
    [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT].forEach((role, i) => {
        cmd({ type: 'PLACE_AGENT', team: Team.BLUE, ...cells.filter((c) => c.q < 0)[i * 2], hp: IMMORTAL_HP, role });
        cmd({ type: 'PLACE_AGENT', team: Team.RED, ...cells.filter((c) => c.q > 0)[i * 2], hp: IMMORTAL_HP, role });
    });
    e.play();
}

function castPair(e: GameEngine, ids: string[]): void {
    for (const id of ids) {
        const skill = e.skillDB.find((s) => s.id === id);
        if (!skill) continue;
        const caster = e.agents.find((a) => a.team === skill.team && a.hp > 0 && a.castingSkillIdx === -1);
        const foe = e.agents.find((a) => a.team !== skill.team && a.hp > 0);
        if (!caster || !foe) continue;
        caster.skillIds = [id, caster.skillIds[1], caster.skillIds[2]];
        caster.skills = [skill, caster.skills[1], caster.skills[2]];
        caster.mp = caster.maxMp;
        caster.target = foe;
        caster.targetHex = { q: foe.q, r: foe.r };
        e.initiateCast(caster, 0);
    }
}

function runSegment(e: GameEngine, seconds: number): Promise<Row> {
    return new Promise((resolve) => {
        const frames: number[] = [];
        const js: number[] = [];
        const entries: number[] = [];
        const start = performance.now();
        const drape = (e.renderer as unknown as { pipeline?: { groundDrape?: DrapeInternals } }).pipeline?.groundDrape;
        let last: number | null = null;
        let nextCast = 0;
        let pair = 0;
        let counting = false;
        const loop = (now: number) => {
            const elapsed = (now - start) / 1000;
            if (last !== null && elapsed > SETTLE_S) {
                if (!counting) {
                    counting = true;
                    counters.clips = 0;
                    counters.blits = 0;
                    counters.offPixels = 0;
                    counters.frames = 0;
                }
                frames.push(now - last);
                js.push(RenderStats.getJsTotalMs());
                entries.push(drape?.size ?? 0);
            }
            last = now;
            for (const a of e.agents) if (a.hp > 0 && a.hp < HEAL_BELOW_HP) a.hp = IMMORTAL_HP;
            if (elapsed >= nextCast) {
                castPair(e, ULT_PAIRS[pair++ % ULT_PAIRS.length]);
                nextCast += CAST_EVERY_S;
            }
            if (elapsed >= seconds) {
                const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
                const sorted = [...frames].sort((x, y) => x - y);
                const slow = sorted.slice(-Math.max(1, Math.ceil(sorted.length * SLOW_FRAME_SHARE)));
                const ms = mean(frames);
                const n = Math.max(1, counters.frames);
                resolve({
                    label: active.label, fps: 1000 / ms, low: 1000 / mean(slow), ms, js: mean(js),
                    clips: counters.clips / n, blits: counters.blits / n, offMp: counters.offPixels / n / 1e6, entries: mean(entries),
                });
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    });
}

function panel(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#000;color:#fff;font:12px/1.5 monospace;padding:8px;white-space:pre';
    document.body.appendChild(el);
    return el;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runPhoneAB(): Promise<void> {
    const win = window as unknown as { __TACTICAL_ENGINE__?: GameEngine; __ASSETS_READY__?: boolean };
    while (!win.__TACTICAL_ENGINE__ || !win.__ASSETS_READY__) await wait(ASSET_POLL_MS);
    const e = win.__TACTICAL_ENGINE__;
    const requested = Number(new URLSearchParams(location.search).get('phoneab'));
    const seconds = requested > 0 ? requested : DEFAULT_SEGMENT_S;
    try {
        await navigator.wakeLock?.request('screen');
    } catch {
        // 沒有 wake lock 只是螢幕可能變暗；量測照跑
    }

    installGates();
    const status = panel();
    document.querySelector<HTMLElement>('[data-testid="showcase-enter-btn"]')?.click();
    await wait(SETUP_WAIT_MS);
    setUpBattle(e);
    setPinnedTier(BASE_TIER);
    const rows: Row[] = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
        active = SEGMENTS[i];
        status.textContent = `第三輪量測中 ${i + 1}/${SEGMENTS.length}：${active.label}（約 ${(SEGMENTS.length - i) * seconds} 秒，請別切走）`;
        rows.push(await runSegment(e, seconds));
    }
    setPinnedTier(null);
    const lines = rows.map((r) => `${r.label.padEnd(10, '　')} ${r.fps.toFixed(1).padStart(5)} ${r.low.toFixed(1).padStart(5)} ${r.ms.toFixed(1).padStart(5)} ${r.clips.toFixed(0).padStart(4)} ${r.blits.toFixed(0).padStart(4)} ${r.offMp.toFixed(1).padStart(4)}`);
    status.textContent = ['第三輪跑完了，請截圖這張表', `${'項目'.padEnd(10, '　')}   FPS  低5%  每幀 裁切 貼回 離屏MP`, ...lines, `${navigator.userAgent.slice(0, 50)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight} 特效數 ${rows[0].entries.toFixed(1)}`].join('\n');
}
