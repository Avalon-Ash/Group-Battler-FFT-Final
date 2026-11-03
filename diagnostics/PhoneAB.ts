// ╔══════════════════════════════════════════════════════════╗
// ║  PhoneAB — 實機效能驗收（渲染優化輪的臨時診斷，用完刪除） ║
// ║  職責：手機開 ?perf&mute&phoneab，自動跑各解析度、10v10   ║
// ║        與真實導播鏡頭，最後列出每項的幀時間。            ║
// ║  只在網址有 phoneab 時由 index.tsx 動態載入，平常不下載。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../engine/game';
import { RenderStats } from '../engine/renderers/RenderStats';
import { getQualityTier, setPinnedTier, type QualityTier } from '../engine/renderers/RenderQuality';
import { SCENE_DB } from '../data/scenes';
import { Role, Team, type UICommand } from '../types';

const DEFAULT_SEGMENT_S = 14;
const SETTLE_S = 2;
const CAST_EVERY_S = 4;
const IMMORTAL_HP = 999999;
const HEAL_BELOW_HP = 500000;
const SLOW_FRAME_SHARE = 0.05;
const FIXTURE_RADIUS = 5;
const SETUP_WAIT_MS = 800;
const ASSET_POLL_MS = 200;
const ULT_PAIRS = [['mb_u1', 'rr_u2'], ['wb_u4', 'sb_u4'], ['tr_u4', 'mr_u4'], ['rb_u2', 'wr_u5']];
const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

interface Segment {
    label: string;
    perSide: number;
    tier: QualityTier | null;
    director: boolean;
}

const SEGMENTS: Segment[] = [
    { label: '5v5 階層3', perSide: 5, tier: 3, director: false },
    { label: '5v5 階層2', perSide: 5, tier: 2, director: false },
    { label: '5v5 階層1', perSide: 5, tier: 1, director: false },
    { label: '5v5 階層0', perSide: 5, tier: 0, director: false },
    { label: '10v10 階層1', perSide: 10, tier: 1, director: false },
    { label: '10v10 階層3', perSide: 10, tier: 3, director: false },
    { label: '5v5 自動＋導播', perSide: 5, tier: null, director: true },
    { label: '10v10 自動＋導播', perSide: 10, tier: null, director: true },
];

interface Row { label: string; fps: number; low: number; ms: number; js: number; tier: number; }

function setUpBattle(e: GameEngine, segment: Segment): void {
    const cmd = (c: UICommand) => e.bus.emit('UI_COMMAND', c);
    cmd({ type: 'STOP_GAME' });
    cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const desert = SCENE_DB.find((s) => s.id === 'DESERT');
    if (desert) e.currentScene = desert;
    e.map.rebuildMap(e);
    cmd({ type: 'CLEAR_BOARD', keepScene: true });
    cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: segment.director });
    const cells: { q: number; r: number }[] = [];
    for (let q = -FIXTURE_RADIUS; q <= FIXTURE_RADIUS; q++) {
        for (let r = -FIXTURE_RADIUS; r <= FIXTURE_RADIUS; r++) {
            if (e.isValid(q, r) && !e.hasObstacle(q, r) && Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= FIXTURE_RADIUS) cells.push({ q, r });
        }
    }
    const blue = cells.filter((c) => c.q < 0);
    const red = cells.filter((c) => c.q > 0);
    for (let i = 0; i < segment.perSide; i++) {
        const role = ROLES[i % ROLES.length];
        cmd({ type: 'PLACE_AGENT', team: Team.BLUE, ...blue[i], hp: IMMORTAL_HP, role });
        cmd({ type: 'PLACE_AGENT', team: Team.RED, ...red[i], hp: IMMORTAL_HP, role });
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
                resolve({ label: segment.label, fps: 1000 / ms, low: 1000 / mean(slow), ms, js: mean(js), tier: getQualityTier() });
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

    const status = panel();
    document.querySelector<HTMLElement>('[data-testid="showcase-enter-btn"]')?.click();
    await wait(SETUP_WAIT_MS);
    const rows: Row[] = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
        const segment = SEGMENTS[i];
        status.textContent = `驗收量測中 ${i + 1}/${SEGMENTS.length}：${segment.label}（約 ${(SEGMENTS.length - i) * seconds} 秒，請別切走）`;
        setPinnedTier(segment.tier);
        setUpBattle(e, segment);
        rows.push(await runSegment(e, segment, seconds));
    }
    setPinnedTier(null);
    const lines = rows.map((r) => `${r.label.padEnd(12, '　')} ${r.fps.toFixed(1).padStart(5)} ${r.low.toFixed(1).padStart(5)} ${r.ms.toFixed(1).padStart(5)} ${r.js.toFixed(1).padStart(4)} ${String(r.tier).padStart(2)}`);
    status.textContent = ['驗收跑完了，請截圖這張表', `${'項目'.padEnd(12, '　')}   FPS  低5%  每幀  JS 階層`, ...lines, `${navigator.userAgent.slice(0, 50)}`, `dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`].join('\n');
}
