// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能 A/B（HANDOFF I-2 岩漿掉幀的臨時診斷，  ║
// ║  用完刪除；前一版在 commit 10f5065a）                     ║
// ║  職責：手機開 ?perf&mute&phoneab，自動在岩漿圖上跑 10v10， ║
// ║        每段關掉一個嫌疑（液面、地塊漂浮、環境粒子），沙漠  ║
// ║        當對照，最後列出每段的幀時間。                      ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderStats } from '../engine/renderers/RenderStats';
import { getQualityTier, setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { SurfacePainter } from '../engine/graphics/painters/SurfacePainter';
import { VisualMath } from '../engine/math/VisualMath';
import { VFXAmbience } from '../engine/presentation/vfx/VFXAmbience';
import { SCENE_DB } from '../data/scenes';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 14;
const SETTLE_S = 3;
const CAST_EVERY_S = 4;
const IMMORTAL_HP = 999999;
const HEAL_BELOW_HP = 500000;
const SLOW_FRAME_SHARE = 0.05;
const PER_SIDE = 10;
const TIER: QualityTier = 1;
const SETUP_WAIT_MS = 800;
const ASSET_POLL_MS = 200;
const ULT_PAIRS = [['mb_u1', 'rr_u2'], ['wb_u4', 'sb_u4'], ['tr_u4', 'mr_u4'], ['rb_u2', 'wr_u5']];
const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

interface Segment {
    label: string;
    scene: 'MAGMA' | 'DESERT';
    noLiquid?: boolean;
    noBob?: boolean;
    noAmbience?: boolean;
}

// 交替排：同一設定前後各一次，抵銷手機發熱降頻
const SEGMENTS: Segment[] = [
    { label: '岩漿 現況', scene: 'MAGMA' },
    { label: '岩漿 不畫液面', scene: 'MAGMA', noLiquid: true },
    { label: '岩漿 不漂浮', scene: 'MAGMA', noBob: true },
    { label: '岩漿 無環境粒子', scene: 'MAGMA', noAmbience: true },
    { label: '岩漿 三項全關', scene: 'MAGMA', noLiquid: true, noBob: true, noAmbience: true },
    { label: '沙漠 對照', scene: 'DESERT' },
    { label: '岩漿 現況2', scene: 'MAGMA' },
    { label: '岩漿 不畫液面2', scene: 'MAGMA', noLiquid: true },
];

interface Row { label: string; fps: number; low: number; ms: number; js: number; tier: number; liq: number; amb: number; bob: number; }

/** 每段實際呼叫次數（證明開關生效）：液面繪製、環境粒子更新、非零漂浮位移 */
const calls = { liq: 0, amb: 0, bob: 0 };

let active: Segment = SEGMENTS[0];

function installGates(): void {
    const drawLiquid = SurfacePainter.drawLiquid;
    SurfacePainter.drawLiquid = function (...args) {
        if (active.noLiquid) return;
        calls.liq++;
        drawLiquid.apply(SurfacePainter, args);
    };
    const bob = VisualMath.floatBobAt;
    VisualMath.floatBobAt = (x, y, t) => {
        if (active.noBob) return 0;
        const v = bob.call(VisualMath, x, y, t);
        if (v !== 0) calls.bob++;
        return v;
    };
    const ambience = VFXAmbience.prototype.update;
    VFXAmbience.prototype.update = function (this: VFXAmbience, ...args) {
        if (active.noAmbience) return;
        calls.amb++;
        ambience.apply(this, args);
    };
}

function setUpBattle(e: GameEngine, segment: Segment): void {
    const cmd = (c: UICommand) => e.bus.emit('UI_COMMAND', c);
    cmd({ type: 'STOP_GAME' });
    cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
    cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const scene = SCENE_DB.find((s) => s.id === segment.scene);
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
        const start = performance.now();
        let counted = 0;
        let last: number | null = null;
        let nextCast = 0;
        let pair = 0;
        const loop = (now: number) => {
            const elapsed = (now - start) / 1000;
            if (last !== null && elapsed > SETTLE_S) {
                if (counted++ === 0) { calls.liq = 0; calls.amb = 0; calls.bob = 0; }
                frames.push(now - last);
                js.push(RenderStats.getJsTotalMs());
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
                const n = Math.max(1, frames.length);
                resolve({ label: segment.label, fps: 1000 / ms, low: 1000 / mean(slow), ms, js: mean(js), tier: getQualityTier(), liq: calls.liq / n, amb: calls.amb / n, bob: calls.bob / n });
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
    // 每段至少比暖機期多 2 秒，否則一幀都量不到
    const seconds = Math.max(SETTLE_S + 2, requested > 0 ? requested : DEFAULT_SEGMENT_S);
    try {
        await navigator.wakeLock?.request('screen');
    } catch {
        // 沒有 wake lock 只是螢幕可能變暗；量測照跑
    }

    installGates();
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
    const lines = rows.map((r) => `${r.label.padEnd(9, '　')} ${r.fps.toFixed(1).padStart(5)} ${r.low.toFixed(1).padStart(5)} ${r.ms.toFixed(1).padStart(5)} ${r.js.toFixed(1).padStart(4)} ${String(r.tier).padStart(2)} ${r.liq.toFixed(0).padStart(3)} ${r.amb.toFixed(1).padStart(3)} ${r.bob.toFixed(0).padStart(3)}`);
    status.textContent = ['跑完了，請截圖這張表', `${'項目'.padEnd(9, '　')}   FPS  低5%  每幀  JS 階層 液面 粒子 漂浮（每幀呼叫數）`, ...lines, `單位 ${e.agents.length}`, `${navigator.userAgent.slice(0, 50)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`].join('\n');
}
