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
import { SurfacePainter } from '../engine/graphics/painters/SurfacePainter';
import { SCENE_DB } from '../data/scenes';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 16;
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
    css?: string;
    skipOps?: RenderOpType[];
    noLiquid?: boolean;
    noComposite?: boolean;
    bitmapSources?: boolean;
}

const NO_BACKDROP = '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
const NO_DOM = '#root *{visibility:hidden!important}#root canvas{visibility:visible!important}';

const SEGMENTS: Segment[] = [
    { id: 'showcase', label: '展示模式 現況', battle: false },
    { id: 'showcase_no_dom', label: '展示 隱藏所有 UI', battle: false, css: NO_DOM },
    { id: 'base', label: '戰鬥 現況', battle: true },
    { id: 'tier1', label: '解析度 ×2', battle: true, tier: 1 },
    { id: 'no_backdrop', label: '關毛玻璃', battle: true, css: NO_BACKDROP },
    { id: 'no_dom', label: '隱藏所有 UI', battle: true, css: NO_DOM },
    { id: 'no_liquid', label: '不畫液面', battle: true, noLiquid: true },
    { id: 'no_hazard', label: '不畫危害區', battle: true, skipOps: [RenderOpType.HAZARD] },
    { id: 'no_terrain', label: '不畫地塊', battle: true, skipOps: [RenderOpType.TERRAIN] },
    { id: 'no_composite', label: '不切混色', battle: true, noComposite: true },
    { id: 'bitmap', label: '貼圖改 bitmap', battle: true, bitmapSources: true },
    { id: 'base2', label: '戰鬥 現況（再一次）', battle: true },
];

interface Row { label: string; fps: number; low: number; ms: number; js: number; }

let active: Segment = SEGMENTS[0];
const bitmaps = new WeakMap<HTMLCanvasElement, ImageBitmap>();
const pendingBitmaps = new WeakSet<HTMLCanvasElement>();

function installGates(): void {
    const dispatch = RenderDispatcher.dispatch;
    RenderDispatcher.dispatch = function (ctx, op: RenderOp, ...rest) {
        if (active.skipOps?.includes(op.type)) return;
        dispatch.call(RenderDispatcher, ctx, op, ...rest);
    };

    const drawLiquid = SurfacePainter.drawLiquid;
    SurfacePainter.drawLiquid = function (...args) {
        if (active.noLiquid) return;
        drawLiquid.apply(SurfacePainter, args);
    };

    const proto = CanvasRenderingContext2D.prototype;
    const gco = Object.getOwnPropertyDescriptor(proto, 'globalCompositeOperation');
    if (gco?.set && gco.get) {
        const set = gco.set;
        Object.defineProperty(proto, 'globalCompositeOperation', {
            get: gco.get,
            set(this: CanvasRenderingContext2D, value: GlobalCompositeOperation) {
                if (!active.noComposite) set.call(this, value);
            },
        });
    }

    const drawImage = proto.drawImage as (this: CanvasRenderingContext2D, ...args: unknown[]) => void;
    proto.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        const source = args[0];
        if (active.bitmapSources && source instanceof HTMLCanvasElement) {
            const bitmap = bitmaps.get(source);
            if (bitmap) {
                drawImage.call(this, bitmap, ...args.slice(1));
                return;
            }
            if (!pendingBitmaps.has(source) && source.width > 0 && source.height > 0) {
                pendingBitmaps.add(source);
                void createImageBitmap(source).then((made) => bitmaps.set(source, made));
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
                resolve({ label: active.label, fps: 1000 / ms, low: 1000 / mean(slow), ms, js: mean(js) });
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
    const style = document.createElement('style');
    document.head.appendChild(style);
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
        style.textContent = active.css ?? '';
        setPinnedTier(active.tier ?? BASE_TIER);
        rows.push(await runSegment(e, seconds));
    }
    style.textContent = '';
    setPinnedTier(null);
    const lines = rows.map((r) => `${r.label.padEnd(12, '　')} ${r.fps.toFixed(1).padStart(5)} ${r.low.toFixed(1).padStart(5)} ${r.ms.toFixed(1).padStart(6)} ${r.js.toFixed(1).padStart(5)}`);
    status.textContent = ['跑完了，請截圖這張表', `${'項目'.padEnd(12, '　')}   FPS   低5% 每幀ms  JSms`, ...lines, `${navigator.userAgent.slice(0, 60)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`].join('\n');
}
