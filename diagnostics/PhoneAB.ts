// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能 A/B（渲染優化輪的臨時診斷，用完刪除） ║
// ║  職責：手機開 ?perf&mute&phoneab，自動逐項關掉一種繪製或  ║
// ║        DOM 效果，最後列出每項的幀時間。                  ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderDispatcher } from '../engine/renderers/RenderDispatcher';
import { RenderOpType, type RenderOp } from '../engine/renderers/RenderList';
import { RenderStats } from '../engine/renderers/RenderStats';
import { setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { TerrainRenderer } from '../engine/renderers/grid/TerrainRenderer';
import { GridOverlays } from '../engine/renderers/grid/GridOverlays';
import { GroundDrapeLayer } from '../engine/renderers/GroundDrape';
import { SCENE_DB } from '../data/scenes';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 14;
const ATLAS_SIZE = 4096;
const ATLAS_PAD = 2;
const SETTLE_S = 1;
const CAST_EVERY_S = 4;
const IMMORTAL_HP = 999999;
const HEAL_BELOW_HP = 500000;
const BASE_TIER: QualityTier = 3;
const SLOW_FRAME_SHARE = 0.05;
const FIXTURE_RADIUS = 4;
const SETUP_WAIT_MS = 800;
const ASSET_POLL_MS = 200;
const ULT_PAIRS = [['mb_u1', 'rr_u2'], ['wb_u4', 'sb_u4'], ['tr_u4', 'mr_u4'], ['rb_u2', 'wr_u5']];

interface Segment {
    id: string;
    label: string;
    battle: boolean;
    tier?: QualityTier;
    skip?: 'block' | 'detail' | 'overlay' | 'drape';
    atlas?: boolean;
    bake?: boolean;
    director?: boolean;
}

const SEGMENTS: Segment[] = [
    { id: 'base', label: '現況', battle: true },
    { id: 'no_block', label: '不貼地塊圖', battle: true, skip: 'block' },
    { id: 'no_detail', label: '不畫地表細節', battle: true, skip: 'detail' },
    { id: 'no_overlay', label: '不畫疊層', battle: true, skip: 'overlay' },
    { id: 'no_drape', label: '不畫貼地特效', battle: true, skip: 'drape' },
    { id: 'atlas', label: '地塊共用大圖', battle: true, atlas: true },
    { id: 'bake', label: '整片烘成一張', battle: true, bake: true },
    { id: 'bake_tier1', label: '一張＋解析度×2', battle: true, bake: true, tier: 1 },
    { id: 'director', label: '現況＋導播鏡頭', battle: true, director: true },
    { id: 'base2', label: '現況（再一次）', battle: true },
];

interface Row { label: string; fps: number; low: number; ms: number; js: number; miss: number; }

let active: Segment = SEGMENTS[0];

// 測「來源畫布切換」的成本：地塊 sprite 複製到同一張大圖再貼
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = ATLAS_SIZE;
atlasCanvas.height = ATLAS_SIZE;
const atlasCtx = atlasCanvas.getContext('2d');
const atlasSlots = new WeakMap<HTMLCanvasElement, { x: number; y: number }>();
let shelfX = 0;
let shelfY = 0;
let shelfH = 0;

function atlasSlot(source: HTMLCanvasElement): { x: number; y: number } | null {
    const hit = atlasSlots.get(source);
    if (hit) return hit;
    if (!atlasCtx) return null;
    if (shelfX + source.width + ATLAS_PAD > ATLAS_SIZE) { shelfX = 0; shelfY += shelfH + ATLAS_PAD; shelfH = 0; }
    if (shelfY + source.height > ATLAS_SIZE) return null;
    const slot = { x: shelfX, y: shelfY };
    inBlock = false; // 複製進大圖這次不經過大圖替換
    atlasCtx.drawImage(source, slot.x, slot.y);
    inBlock = true;
    atlasSlots.set(source, slot);
    shelfX += source.width + ATLAS_PAD;
    shelfH = Math.max(shelfH, source.height);
    return slot;
}

let inBlock = false;
let bakeCanvas: HTMLCanvasElement | null = null;
let bakeCtx: CanvasRenderingContext2D | null = null;
let bakeFramesLeft = 0;
let firstBlockOfFrame = false;

function installGates(): void {
    const beginFrame = TerrainRenderer.beginFrame;
    TerrainRenderer.beginFrame = function (transitioning: boolean) {
        firstBlockOfFrame = true;
        if (bakeFramesLeft > 0) bakeFramesLeft--;
        beginFrame.call(TerrainRenderer, transitioning);
    };

    const drawBlock = TerrainRenderer.drawBlock;
    TerrainRenderer.drawBlock = function (ctx, ...rest) {
        if (active.skip === 'block') return;
        if (active.bake) {
            if (!bakeCanvas || bakeCanvas.width !== ctx.canvas.width || bakeCanvas.height !== ctx.canvas.height) {
                bakeCanvas = document.createElement('canvas');
                bakeCanvas.width = ctx.canvas.width;
                bakeCanvas.height = ctx.canvas.height;
                bakeCtx = bakeCanvas.getContext('2d');
                bakeFramesLeft = 2;
            }
            if (bakeFramesLeft > 0 && bakeCtx) {
                if (firstBlockOfFrame) { bakeCtx.setTransform(1, 0, 0, 1, 0, 0); bakeCtx.clearRect(0, 0, bakeCanvas.width, bakeCanvas.height); firstBlockOfFrame = false; }
                bakeCtx.setTransform(ctx.getTransform());
                drawBlock.call(TerrainRenderer, bakeCtx, ...rest);
                drawBlock.call(TerrainRenderer, ctx, ...rest);
                return;
            }
            if (firstBlockOfFrame) {
                firstBlockOfFrame = false;
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(bakeCanvas, 0, 0);
                ctx.restore();
            }
            return;
        }
        inBlock = true;
        drawBlock.call(TerrainRenderer, ctx, ...rest);
        inBlock = false;
    };

    const drawDetail = TerrainRenderer.drawTerrainDetail;
    TerrainRenderer.drawTerrainDetail = function (...args) {
        if (active.skip !== 'detail') drawDetail.apply(TerrainRenderer, args);
    };

    const drawOverlays = GridOverlays.drawOverlays;
    GridOverlays.drawOverlays = function (...args) {
        if (active.skip !== 'overlay') drawOverlays.apply(GridOverlays, args);
    };

    const drawOnTile = GroundDrapeLayer.prototype.drawOnTile;
    GroundDrapeLayer.prototype.drawOnTile = function (...args) {
        if (active.skip !== 'drape') drawOnTile.apply(this, args);
    };

    const proto = CanvasRenderingContext2D.prototype;
    const drawImage = proto.drawImage as (this: CanvasRenderingContext2D, ...args: unknown[]) => void;
    proto.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        const source = args[0];
        if (active.atlas && inBlock && source instanceof HTMLCanvasElement && args.length <= 5) {
            const slot = atlasSlot(source);
            if (slot) {
                const w = args.length === 5 ? args[3] : source.width;
                const h = args.length === 5 ? args[4] : source.height;
                drawImage.call(this, atlasCanvas, slot.x, slot.y, source.width, source.height, args[1], args[2], w, h);
                return;
            }
        }
        drawImage.apply(this, args);
    } as typeof proto.drawImage;
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
        const start = performance.now();
        const missStart = TerrainRenderer.store.getStats().misses;
        let last: number | null = null;
        let nextCast = 0;
        let pair = 0;
        const loop = (now: number) => {
            const elapsed = (now - start) / 1000;
            if (last !== null && elapsed > SETTLE_S) {
                frames.push(now - last);
                js.push(RenderStats.getJsTotalMs());
            }
            last = now;
            if (active.battle) {
                for (const a of e.agents) if (a.hp > 0 && a.hp < HEAL_BELOW_HP) a.hp = IMMORTAL_HP;
                if (elapsed >= nextCast) {
                    castPair(e, ULT_PAIRS[pair++ % ULT_PAIRS.length]);
                    nextCast += CAST_EVERY_S;
                }
            }
            if (elapsed >= seconds) {
                const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
                const sorted = [...frames].sort((x, y) => x - y);
                const slow = sorted.slice(-Math.max(1, Math.ceil(sorted.length * SLOW_FRAME_SHARE)));
                const ms = mean(frames);
                resolve({ label: active.label, fps: 1000 / ms, low: 1000 / mean(slow), ms, js: mean(js), miss: TerrainRenderer.store.getStats().misses - missStart });
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    });
}

function panel(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#000;color:#fff;font:13px/1.5 monospace;padding:8px;white-space:pre';
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
    const rows: Row[] = [];
    let inBattle = false;
    for (let i = 0; i < SEGMENTS.length; i++) {
        active = SEGMENTS[i];
        status.textContent = `A/B 量測中 ${i + 1}/${SEGMENTS.length}：${active.label}（約 ${(SEGMENTS.length - i) * seconds} 秒，請別切走）`;
        if (active.battle && !inBattle) {
            document.querySelector<HTMLElement>('[data-testid="showcase-enter-btn"]')?.click();
            await wait(SETUP_WAIT_MS);
            setUpBattle(e);
            inBattle = true;
        }
        e.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: !!active.director });
        bakeCanvas = null;
        setPinnedTier(active.tier ?? BASE_TIER);
        rows.push(await runSegment(e, seconds));
    }
    setPinnedTier(null);
    const lines = rows.map((r) => `${r.label.padEnd(12, '　')} ${r.fps.toFixed(1).padStart(5)} ${r.low.toFixed(1).padStart(5)} ${r.ms.toFixed(1).padStart(6)} ${r.js.toFixed(1).padStart(5)} ${String(r.miss).padStart(4)}`);
    status.textContent = ['跑完了，請截圖這張表', `${'項目'.padEnd(12, '　')}   FPS   低5% 每幀ms  JSms 重烘`, ...lines, `${navigator.userAgent.slice(0, 60)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`].join('\n');
}
