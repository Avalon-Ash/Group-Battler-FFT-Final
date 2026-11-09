// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能 A/B（HANDOFF I-2 岩漿掉幀的臨時診斷，  ║
// ║  用完刪除；前一版在 commit 10f5065a）                     ║
// ║  第四輪：第三輪找到縮圈的警告疊層每幀約 +6 ms（關掉 17.8 對 ║
// ║  24.5／23.1 ms），塌陷瞬間不是主因。這輪比較警告格的畫法：  ║
// ║  現況（save＋切 screen 混色＋restore）、不切混色、連 save／  ║
// ║  restore 都不用，並以關警告為下限。                         ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderStats } from '../engine/renderers/RenderStats';
import { RenderDispatcher } from '../engine/renderers/RenderDispatcher';
import { RenderOpType } from '../engine/renderers/RenderList';
import { TerrainRenderer } from '../engine/renderers/grid/TerrainRenderer';
import { GridOverlays } from '../engine/renderers/grid/GridOverlays';
import { SoftTile, type SoftTileLook } from '../engine/renderers/grid/SoftTile';
import { VisualMath } from '../engine/math/VisualMath';
import { getQualityTier, setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { SCENE_DB } from '../data/scenes';
import { DEFAULT_ZONE_CONFIG, GRID_OVERLAY } from '../constants';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 16;
const SETTLE_S = 3;
const CAST_EVERY_S = 4;
const IMMORTAL_HP = 999999;
const HEAL_BELOW_HP = 500000;
const SLOW_FRAME_SHARE = 0.05;
const PER_SIDE = 10;
const TIER: QualityTier = 1;
/** 塌陷後這段時間內的幀算「塌陷瞬間」 */
const COLLAPSE_WINDOW_S = 1.5;
const SETUP_WAIT_MS = 800;
const ASSET_POLL_MS = 200;
const ULT_PAIRS = [['mb_u1', 'rr_u2'], ['wb_u4', 'sb_u4'], ['tr_u4', 'mr_u4'], ['rb_u2', 'wr_u5']];
const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

interface Segment {
    label: string;
    zone: boolean;
    noWarnOverlay?: boolean;
    noFalling?: boolean;
    /** 只有警告的格子改用的畫法：noGco＝save／restore 但不切混色；bare＝不 save／restore、不切混色 */
    warnDraw?: 'noGco' | 'bare';
}

// 發熱抵銷：縮圈現況放在頭尾與中間
const SEGMENTS: Segment[] = [
    { label: '警告 現況', zone: true },
    { label: '警告 不切混色', zone: true, warnDraw: 'noGco' },
    { label: '警告 現況2', zone: true },
    { label: '警告 無save', zone: true, warnDraw: 'bare' },
    { label: '警告 現況3', zone: true },
    { label: '關警告', zone: true, noWarnOverlay: true },
    { label: '警告 現況4', zone: true },
];

const W = GRID_OVERLAY.WARNING;
const WARN_LOOK: SoftTileLook = { fill: W.FILL, edge: W.EDGE, fillAlpha: Math.min(W.FILL_ALPHA, GRID_OVERLAY.PRIORITY.WARNING_FILL_MAX), edgeAlpha: W.EDGE_ALPHA, coreAlpha: W.CORE_ALPHA };

interface Row {
    label: string; fps: number; low: number; ms: number; js: number; tier: number;
    /** 警告期（沒有剛塌陷）平均每幀 ms、塌陷後 1.5 秒內平均與最慢一幀 ms */
    warnMs: number; colMs: number; colMax: number;
    collapses: number; bakes: number; custom: number;
}

let active: Segment = SEGMENTS[0];
let bakes = 0;
/** 改用替代畫法畫的警告格數（證明替代路徑真的有跑） */
let custom = 0;
let lastCollapseAt = -Infinity;
let collapses = 0;

function installGates(e: GameEngine): void {
    const dispatch = RenderDispatcher.dispatch;
    RenderDispatcher.dispatch = function (ctx, op, ...rest) {
        if (active.noWarnOverlay && op.type === RenderOpType.OVERLAY && op.oWarning) return;
        if (active.noFalling && op.type === RenderOpType.TERRAIN && op.z < 0) return;
        dispatch.call(RenderDispatcher, ctx, op, ...rest);
    };
    const overlays = GridOverlays.drawOverlays;
    GridOverlays.drawOverlays = function (ctx, x, baseY, height, size, specialStatus, zoneInfo, lightColor, lightIntensity, isRange, rangeColor, isHover, isWarning, isLastStand, hasUnit, q, r, globalTime, layout) {
        const mode = active.warnDraw;
        if (!mode || !isWarning || isRange || isHover || hasUnit || isLastStand) {
            overlays.call(GridOverlays, ctx, x, baseY, height, size, specialStatus, zoneInfo, lightColor, lightIntensity, isRange, rangeColor, isHover, isWarning, isLastStand, hasUnit, q, r, globalTime, layout);
            return;
        }
        overlays.call(GridOverlays, ctx, x, baseY, height, size, specialStatus, zoneInfo, lightColor, lightIntensity, false, rangeColor, false, false, false, false, q, r, globalTime, layout);
        custom++;
        const y = VisualMath.applyLayerBias(VisualMath.getIsoVisualY(baseY, height), 'OVERLAY') - GRID_OVERLAY.MARK_LIFT;
        const alpha = W.ALPHA_MIN + ((Math.sin(globalTime * W.FREQ) + 1) / 2) * W.ALPHA_PULSE;
        if (mode === 'noGco') {
            ctx.save();
            ctx.translate(x, y);
            ctx.globalAlpha = alpha;
            SoftTile.draw(ctx, WARN_LOOK, size, layout);
            ctx.restore();
        } else {
            const prev = ctx.globalAlpha;
            ctx.translate(x, y);
            ctx.globalAlpha = alpha;
            SoftTile.draw(ctx, WARN_LOOK, size, layout);
            ctx.globalAlpha = prev;
            ctx.translate(-x, -y);
        }
    };
    const bake = TerrainRenderer.bakeBlock;
    TerrainRenderer.bakeBlock = function (...args) {
        bakes++;
        return bake.apply(TerrainRenderer, args);
    };
    e.bus.on('ZONE_SHRUNK', () => {
        lastCollapseAt = performance.now();
        collapses++;
    });
}

function setUpBattle(e: GameEngine, segment: Segment): void {
    const cmd = (c: UICommand) => e.bus.emit('UI_COMMAND', c);
    cmd({ type: 'STOP_GAME' });
    cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
    cmd({ type: 'SET_ZONE_CONFIG', config: { ...DEFAULT_ZONE_CONFIG, enabled: segment.zone } });
    const scene = SCENE_DB.find((s) => s.id === 'MAGMA');
    if (scene) e.currentScene = scene;
    e.map.rebuildMap(e);
    cmd({ type: 'CLEAR_BOARD', keepScene: true });
    // 整張圖的可站格，各方取離中心最近的 PER_SIDE 格（固定半徑在小地圖上放不滿 20 人）
    const cells = [...e.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
        .filter((c) => !e.hasObstacle(c.q, c.r))
        .sort((a, b) => (Math.abs(a.q) + Math.abs(a.r) + Math.abs(a.q + a.r)) - (Math.abs(b.q) + Math.abs(b.r) + Math.abs(b.q + b.r)) || a.q - b.q || a.r - b.r);
    const blue = cells.filter((c) => c.q < 0);
    const red = cells.filter((c) => c.q > 0);
    for (let i = 0; i < PER_SIDE; i++) {
        const role = ROLES[i % ROLES.length];
        if (blue[i]) cmd({ type: 'PLACE_AGENT', team: Team.BLUE, ...blue[i], hp: IMMORTAL_HP, role });
        if (red[i]) cmd({ type: 'PLACE_AGENT', team: Team.RED, ...red[i], hp: IMMORTAL_HP, role });
    }
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

function runSegment(e: GameEngine, segment: Segment, seconds: number): Promise<Row> {
    return new Promise((resolve) => {
        const frames: number[] = [];
        const js: number[] = [];
        const warn: number[] = [];
        const col: number[] = [];
        const start = performance.now();
        let last: number | null = null;
        let nextCast = 0;
        let pair = 0;
        let counting = false;
        const loop = (now: number) => {
            const elapsed = (now - start) / 1000;
            if (last !== null && elapsed > SETTLE_S) {
                if (!counting) { counting = true; bakes = 0; collapses = 0; custom = 0; }
                const ms = now - last;
                frames.push(ms);
                js.push(RenderStats.getJsTotalMs());
                if ((now - lastCollapseAt) / 1000 <= COLLAPSE_WINDOW_S) col.push(ms);
                else if (e.map.warningTiles.size > 0) warn.push(ms);
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
                resolve({
                    label: segment.label, fps: 1000 / ms, low: 1000 / mean(slow), ms, js: mean(js), tier: getQualityTier(),
                    warnMs: mean(warn), colMs: mean(col), colMax: col.length ? Math.max(...col) : 0, collapses, bakes, custom: custom / Math.max(1, frames.length),
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
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#000;color:#fff;font:11px/1.5 monospace;padding:8px;white-space:pre';
    document.body.appendChild(el);
    return el;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runPhoneAB(): Promise<void> {
    const win = window as unknown as { __TACTICAL_ENGINE__?: GameEngine; __ASSETS_READY__?: boolean };
    while (!win.__TACTICAL_ENGINE__ || !win.__ASSETS_READY__) await wait(ASSET_POLL_MS);
    const e = win.__TACTICAL_ENGINE__;
    const requested = Number(new URLSearchParams(location.search).get('phoneab'));
    // 每段至少比暖機期多 2 秒，否則一幀都量不到
    const seconds = Math.max(SETTLE_S + 2, requested > 0 ? requested : DEFAULT_SEGMENT_S);
    try {
        await navigator.wakeLock?.request('screen');
    } catch {
        // 沒有 wake lock 只是螢幕可能變暗；量測照跑
    }

    installGates(e);
    const status = panel();
    document.querySelector<HTMLElement>('[data-testid="showcase-enter-btn"]')?.click();
    await wait(SETUP_WAIT_MS);
    const rows: Row[] = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
        const segment = SEGMENTS[i];
        active = segment;
        status.textContent = `量測中 ${i + 1}/${SEGMENTS.length}：${segment.label}（約 ${(SEGMENTS.length - i) * seconds} 秒，請別切走）`;
        setPinnedTier(TIER);
        setUpBattle(e, segment);
        rows.push(await runSegment(e, segment, seconds));
    }
    active = SEGMENTS[0];
    setPinnedTier(null);
    const f = (v: number, w: number, d = 1) => v.toFixed(d).padStart(w);
    const lines = rows.map((r) => `${r.label.padEnd(8, '　')}${f(r.fps, 5)}${f(r.low, 5)}${f(r.ms, 5)}${f(r.js, 4)} ${r.tier}${f(r.warnMs, 5)}${f(r.colMs, 5)}${f(r.colMax, 5, 0)}${f(r.collapses, 2, 0)}${f(r.bakes, 4, 0)}${f(r.custom, 4, 0)}`);
    status.textContent = [
        '第四輪跑完了，請截圖這張表',
        `${'項目'.padEnd(8, '　')}  FPS 低5% 每幀  JS 階 警告 塌陷 最慢 塌 重烘 自畫`,
        ...lines,
        '警告＝警告期平均每幀 ms；塌陷＝塌陷後 1.5 秒內平均 ms；最慢＝其中最慢一幀；塌＝塌陷次數；重烘＝地塊烘焙次數；自畫＝每幀用替代畫法的警告格數',
        `${navigator.userAgent.slice(0, 50)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`,
    ].join('\n');
}
