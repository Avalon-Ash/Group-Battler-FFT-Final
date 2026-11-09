// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能 A/B（HANDOFF I-2 岩漿掉幀的臨時診斷，  ║
// ║  用完刪除；前一版在 commit 10f5065a）                     ║
// ║  第二輪：第一輪在固定階層 1、無導播、無縮圈下 20 人岩漿有  ║
// ║  約 50 FPS，液面／漂浮／環境粒子都不是原因。這輪改量第一輪 ║
// ║  關掉的條件：階層 0（多色調分級）、導播、縮圈、實際設定（自動畫質）。  ║
// ║  每個變因前後都夾一段基準，抵銷手機發熱。                  ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderStats } from '../engine/renderers/RenderStats';
import { getQualityTier, setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { SCENE_DB } from '../data/scenes';
import { DEFAULT_ZONE_CONFIG } from '../constants';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 14;
const SETTLE_S = 3;
const CAST_EVERY_S = 4;
const IMMORTAL_HP = 999999;
const HEAL_BELOW_HP = 500000;
const SLOW_FRAME_SHARE = 0.05;
const PER_SIDE = 10;
const SETUP_WAIT_MS = 800;
const ASSET_POLL_MS = 200;
const ULT_PAIRS = [['mb_u1', 'rr_u2'], ['wb_u4', 'sb_u4'], ['tr_u4', 'mr_u4'], ['rb_u2', 'wr_u5']];
const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

interface Segment {
    label: string;
    /** null＝自動畫質（實際遊玩的設定） */
    tier: QualityTier | null;
    director: boolean;
    zone: boolean;
}

const BASE: Segment = { label: '基準 階層1', tier: 1, director: false, zone: false };
const SEGMENTS: Segment[] = [
    BASE,
    { label: '階層0 色調', tier: 0, director: false, zone: false },
    BASE,
    { label: '開導播', tier: 1, director: true, zone: false },
    BASE,
    { label: '開縮圈', tier: 1, director: false, zone: true },
    BASE,
    { label: '實際：自動＋導播＋縮圈', tier: null, director: true, zone: true },
    BASE,
];

interface Row { label: string; fps: number; low: number; ms: number; js: number; tier: number; units: number; zoom: number; }

function setUpBattle(e: GameEngine, segment: Segment): void {
    const cmd = (c: UICommand) => e.bus.emit('UI_COMMAND', c);
    cmd({ type: 'STOP_GAME' });
    cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: segment.director });
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
        const zooms: number[] = [];
        const start = performance.now();
        let last: number | null = null;
        let nextCast = 0;
        let pair = 0;
        const loop = (now: number) => {
            const elapsed = (now - start) / 1000;
            if (last !== null && elapsed > SETTLE_S) {
                frames.push(now - last);
                js.push(RenderStats.getJsTotalMs());
                zooms.push(e.renderer?.camera.zoom ?? 0);
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
                    units: e.agents.filter((a) => a.hp > 0 && !a.outOfBounds && !a.banished).length, zoom: mean(zooms),
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
    // 每段至少比暖機期多 2 秒，否則一幀都量不到
    const seconds = Math.max(SETTLE_S + 2, requested > 0 ? requested : DEFAULT_SEGMENT_S);
    try {
        await navigator.wakeLock?.request('screen');
    } catch {
        // 沒有 wake lock 只是螢幕可能變暗；量測照跑
    }

    const status = panel();
    document.querySelector<HTMLElement>('[data-testid="showcase-enter-btn"]')?.click();
    await wait(SETUP_WAIT_MS);
    const rows: Row[] = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
        const segment = SEGMENTS[i];
        status.textContent = `量測中 ${i + 1}/${SEGMENTS.length}：${segment.label}（約 ${(SEGMENTS.length - i) * seconds} 秒，請別切走）`;
        setPinnedTier(segment.tier);
        setUpBattle(e, segment);
        rows.push(await runSegment(e, segment, seconds));
    }
    setPinnedTier(null);
    const lines = rows.map((r) => `${r.label.slice(0, 9).padEnd(9, '　')} ${r.fps.toFixed(1).padStart(5)} ${r.low.toFixed(1).padStart(5)} ${r.ms.toFixed(1).padStart(5)} ${r.js.toFixed(1).padStart(4)} ${String(r.tier).padStart(2)} ${String(r.units).padStart(3)} ${r.zoom.toFixed(2).padStart(5)}`);
    status.textContent = ['第二輪跑完了，請截圖這張表', `${'項目'.padEnd(9, '　')}   FPS  低5%  每幀  JS 階層 人數 縮放`, ...lines, `${navigator.userAgent.slice(0, 50)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`].join('\n');
}
