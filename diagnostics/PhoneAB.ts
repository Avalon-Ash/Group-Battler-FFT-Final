// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能 A/B（HANDOFF I-2 岩漿掉幀的臨時診斷，  ║
// ║  用完刪除；前一版在 commit 10f5065a）                     ║
// ║  第三輪：第二輪確認卡頓來自縮圈（低 5% 19.8）。這輪縮圈全開 ║
// ║  （每段 24 秒＝兩次塌陷），拆成警告期與塌陷瞬間：關警告疊層 ║
// ║  、關掉落地塊，並分段記幀時間與地塊重烘次數。              ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderStats } from '../engine/renderers/RenderStats';
import { RenderDispatcher } from '../engine/renderers/RenderDispatcher';
import { RenderOpType } from '../engine/renderers/RenderList';
import { TerrainRenderer } from '../engine/renderers/grid/TerrainRenderer';
import { getQualityTier, setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { SCENE_DB } from '../data/scenes';
import { DEFAULT_ZONE_CONFIG } from '../constants';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 24;
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
}

// 發熱抵銷：縮圈現況放在頭尾與中間
const SEGMENTS: Segment[] = [
    { label: '無縮圈', zone: false },
    { label: '縮圈 現況', zone: true },
    { label: '縮圈 關警告疊層', zone: true, noWarnOverlay: true },
    { label: '縮圈 現況2', zone: true },
    { label: '縮圈 關掉落地塊', zone: true, noFalling: true },
    { label: '縮圈 現況3', zone: true },
    { label: '無縮圈2', zone: false },
];

interface Row {
    label: string; fps: number; low: number; ms: number; js: number; tier: number;
    /** 警告期（沒有剛塌陷）平均每幀 ms、塌陷後 1.5 秒內平均與最慢一幀 ms */
    warnMs: number; colMs: number; colMax: number;
    collapses: number; bakes: number;
}

let active: Segment = SEGMENTS[0];
let bakes = 0;
let lastCollapseAt = -Infinity;
let collapses = 0;

function installGates(e: GameEngine): void {
    const dispatch = RenderDispatcher.dispatch;
    RenderDispatcher.dispatch = function (ctx, op, ...rest) {
        if (active.noWarnOverlay && op.type === RenderOpType.OVERLAY && op.oWarning) return;
        if (active.noFalling && op.type === RenderOpType.TERRAIN && op.z < 0) return;
        dispatch.call(RenderDispatcher, ctx, op, ...rest);
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
                if (!counting) { counting = true; bakes = 0; collapses = 0; }
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
                    warnMs: mean(warn), colMs: mean(col), colMax: col.length ? Math.max(...col) : 0, collapses, bakes,
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
    const lines = rows.map((r) => `${r.label.padEnd(8, '　')}${f(r.fps, 5)}${f(r.low, 5)}${f(r.ms, 5)}${f(r.js, 4)} ${r.tier}${f(r.warnMs, 5)}${f(r.colMs, 5)}${f(r.colMax, 5, 0)}${f(r.collapses, 2, 0)}${f(r.bakes, 4, 0)}`);
    status.textContent = [
        '第三輪跑完了，請截圖這張表',
        `${'項目'.padEnd(8, '　')}  FPS 低5% 每幀  JS 階 警告 塌陷 最慢 塌 重烘`,
        ...lines,
        '警告＝警告期平均每幀 ms；塌陷＝塌陷後 1.5 秒內平均 ms；最慢＝其中最慢一幀；塌＝塌陷次數；重烘＝地塊烘焙次數',
        `${navigator.userAgent.slice(0, 50)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`,
    ].join('\n');
}
