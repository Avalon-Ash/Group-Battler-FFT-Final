// 座標協議守門測試（engine/renderers/RenderSpec.ts、docs/COORDINATE_AUDIT.md）。
// 高度、錨點、發射點、排序鍵、漂浮位移都有唯一的 SSOT 函式；各處自己重算就會「又」對不齊（2026-10 曾發生）。
// 靜態家族：「目前違規」必須與 coordinate-protocol.baseline.json 完全相同——新增違規直接失敗，
// 基準內已修好的項目也失敗（強迫同步刪除基準），所以基準只會縮小。另有 RenderSpec 與實作一致性、行為測試。
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { RenderSpec } from '../engine/renderers/RenderSpec';
import { VisualMath } from '../engine/math/VisualMath';
import { RenderList, RenderOpType } from '../engine/renderers/RenderList';
import { UnitRenderSystem } from '../engine/systems/unit/UnitSystem';
import { UnitFrameStore } from '../engine/renderers/frame/UnitFrame';
import { Agent } from '../engine/core/Agent';
import { HexUtils, type MapConfig } from '../engine/utils';
import { FLOAT_BOB, GROUND_DRAPE, UNIT_FRAME, VFX_GROUND_TYPES, VFX_RENDER } from '../constants';
import { hudBarHeight } from '../data/units/appearance/projection';
import { Team } from '../types';

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'tests', 'coordinate-protocol.baseline.json');
const BASELINE: Record<string, string[]> = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

function listSources(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
    if (fs.statSync(abs).isFile()) return [dir];
    const out: string[] = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) out.push(...listSources(rel));
        else if (/\.tsx?$/.test(entry.name)) out.push(rel);
    }
    return out;
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** 繪製端：畫面、特效、HUD、UI。模擬端（物理、AI、戰鬥）用邏輯格高度是對的，不在此列。 */
const VISUAL_SCOPE = [
    'engine/renderers', 'engine/systems/vfx', 'engine/systems/visuals', 'engine/systems/unit',
    'engine/systems/hud.ts', 'engine/systems/VisualSystem.ts', 'engine/graphics', 'components',
];
/** 規格本身（字串裡會寫到函式名）與 SSOT 定義檔不掃 */
const SSOT_FILES = new Set(['engine/renderers/RenderSpec.ts', 'engine/math/VisualMath.ts', 'constants.ts']);
const ALL_SCOPE = ['engine', 'data', 'components', 'hooks'];

const sources = (dirs: string[]): [string, string][] => [...new Set(dirs.flatMap(listSources))]
    .filter(f => !SSOT_FILES.has(f))
    .map(f => [f, stripComments(read(f))]);
const VISUAL_SOURCES = sources(VISUAL_SCOPE);
const ALL_SOURCES = sources(ALL_SCOPE);

function scan(src: [string, string][], re: RegExp): string[] {
    const hits: string[] = [];
    for (const [file, text] of src) for (const m of text.matchAll(re)) hits.push(`${file}: ${m[0].replace(/\s+/g, ' ')}`);
    return [...new Set(hits)].sort();
}

/** 單位核心的繪製端：實體寶石（投影未成形）懸在棋座上的高度讀 CORE_VISUAL.hoverHeight；投影成形後的位置走 VisualMath.getProjectionCenterY */
const CORE_PAINTER = 'engine/renderers/units/painters/UnitCorePainter.ts';
/** 漂浮位移的呼叫端（RenderSpec §5）。新增呼叫端＝新增一條浮動路徑：先改 RenderSpec，再改這裡。 */
const FLOAT_CALLERS = ['engine/renderers/RenderPipeline.ts', 'engine/renderers/grid/GridRenderStrategy.ts'];
/** 繪製端唯一可以呼叫 getUnitGroundHeight 的檔案（RenderSpec §4）：其餘繪製端讀 UnitFrame，拿不到地形高度函式 */
const UNIT_GROUND_CALLERS = ['engine/renderers/frame/UnitFrame.ts'];

const FAMILIES: Record<string, () => string[]> = {
    /** 繪製端直接用單位的邏輯格查高度（應改 VisualMath.getUnitGroundHeight：含移動過渡、所在格較高者） */
    'height.directAgent': () => scan(VISUAL_SOURCES,
        /getTerrainHeight\(\s*(agent|a|source|target|unit|caster|highlight|owner|u)\.q\s*,\s*\1\.r\s*[,)]/g),
    /** engine/renderers 內呼叫 getUnitGroundHeight 的檔案（只允許 UNIT_GROUND_CALLERS；基準永遠是空的） */
    'height.unitGroundCallers': () => [...new Set(listSources('engine/renderers'))]
        .filter(f => !SSOT_FILES.has(f) && !UNIT_GROUND_CALLERS.includes(f))
        .filter(f => /getUnitGroundHeight\s*\(/.test(stripComments(read(f))))
        .sort(),
    /** 自己重算身體中心或核心高度（應改 getUnitAnchor／getVisualBodyCenterY／projectionCenterAt） */
    'anchor.recompute': () => scan(ALL_SOURCES.filter(([f]) => f !== CORE_PAINTER),
        /UNIT_BODY_OFFSET\s*\+\s*UNIT_HOVER_OFFSET|CORE_VISUAL\.hoverHeight/g),
    /** 漂浮位移在 SSOT 之外重算（FLOAT_BOB 參數、地形種類判斷） */
    'float.outsideSSOT': () => scan(ALL_SOURCES,
        /FLOAT_BOB\b|['"](?:VOID|MAGMA)['"]\s*\|\|\s*\w+\s*===\s*['"](?:VOID|MAGMA)['"]|\w+\s*===\s*['"](?:VOID|MAGMA)['"]\s*\|\|\s*\w+\s*===\s*['"](?:VOID|MAGMA)['"]/g),
    /** 事件發射端手寫 pos 物件字面量（應改 engine/events/EventPos.ts 的 unitEventPos／hexEventPos／pointEventPos；RenderSpec §3） */
    'event.inlinePos': () => scan(ALL_SOURCES.filter(([f]) => f.startsWith('engine/')),
        /events\.push\(\{(?:(?!\}\);)[\s\S])*?\bpos:\s*\{|pushEvent\([^,]+,\s*\{|EventPool\.get\([^,]+,\s*\{/g),
    /** 提交 RenderOp 的檔案必須有方框檔頭並指向 RenderSpec（規則改了要同步更新檔頭） */
    'submitter.header': () => ALL_SOURCES
        .filter(([, text]) => /renderList\.next\(\)/.test(text))
        .map(([f]) => f)
        .filter(f => { const raw = read(f); return !(raw.includes('╔') && raw.includes('RenderSpec')); })
        .sort(),
};

describe('coordinate protocol ratchet', () => {
    it('baseline lists exactly the known families', () => {
        expect(Object.keys(BASELINE).sort()).toEqual(Object.keys(FAMILIES).sort());
    });

    for (const [family, fn] of Object.entries(FAMILIES)) {
        const current = fn();
        const baseline = BASELINE[family] ?? [];
        it(`${family}: no new violations`, () => {
            expect(current.filter(v => !baseline.includes(v)), `${family} not in baseline`).toEqual([]);
        });
        it(`${family}: baseline only shrinks (remove fixed entries)`, () => {
            expect(baseline.filter(v => !current.includes(v)), `${family} baseline entries that no longer occur`).toEqual([]);
        });
    }

    it('floating bob is only called from the documented paths', () => {
        const callers = ALL_SOURCES.filter(([, t]) => /VisualMath\.(floatBobAt|isFloatingBiome)\(/.test(t)).map(([f]) => f).sort();
        expect(callers).toEqual([...FLOAT_CALLERS].sort());
    });
});

describe('RenderSpec matches the implementation', () => {
    const spec = RenderSpec.generateSpec();
    const renderList = read('engine/renderers/RenderList.ts');

    it('layer table lists every SUB_LAYER with its value', () => {
        const block = /const SUB_LAYER = \{([\s\S]*?)\}/.exec(renderList);
        expect(block).not.toBeNull();
        const LABEL: Record<string, string> = { GROUND_VFX: 'VFX (isGround)', AIR_VFX: 'VFX (air)' };
        const entries = [...block![1].matchAll(/^\s*(\w+):\s*(\d+)/gm)].map(m => [m[1], m[2]] as const);
        expect(entries.length).toBeGreaterThan(8);
        const missing = entries.filter(([name, value]) => {
            const label = (LABEL[name] ?? name).replace(/[()]/g, '\\$&');
            return !new RegExp(`^\\| ${label}\\s*\\| ${value}\\s*\\|`, 'm').test(spec);
        }).map(([n, v]) => `${n}=${v}`);
        expect(missing, 'RenderSpec §1 rows out of date').toEqual([]);
    });

    it('tiebreaks and sort constants named in the spec match RenderList', () => {
        const corpse = /const CORPSE_TIEBREAK = ([\d.]+)/.exec(renderList)![1];
        const vfx = /const VFX_TIEBREAK = ([\d.]+)/.exec(renderList)![1];
        expect(spec).toContain(`CORPSE +${corpse}`);
        expect(spec).toContain(`PROJECTILE +${vfx}`);
        for (const k of ['GROUND_SORT_BIAS', 'GROUND_Z_BIAS', 'GROUND_VISUAL_BIAS'] as const) {
            expect(VFX_RENDER[k], k).toBeTypeOf('number');
            expect(spec).toContain(k);
        }
    });

    it('ground drape: spec names the constants, every drape type is a ground type, no decal lift remains', () => {
        for (const k of ['GROUND_DRAPE.MODE', 'GROUND_DRAPE.MIN_HALF_H', 'UNIT_FRAME.HEX_HYSTERESIS_PX']) expect(spec, k).toContain(k);
        expect(GROUND_DRAPE.MIN_HALF_H).toBeTypeOf('number');
        expect(UNIT_FRAME.HEX_HYSTERESIS_PX).toBeTypeOf('number');
        for (const [type, mode] of Object.entries(GROUND_DRAPE.MODE)) {
            expect(VFX_GROUND_TYPES.has(type), type).toBe(true);
            expect(['DIRECT', 'OFFSCREEN']).toContain(mode);
            expect(spec, type).toContain(type);
        }
        // 直立或有高度的地面錨定特效不得鋪設（會被裁切到頂面而斷頭）
        for (const upright of ['PILLAR', 'HEX_BEAM', 'DOMAIN', 'GIANT_HEX', 'BLACK_HOLE']) {
            expect(GROUND_DRAPE.MODE[upright], upright).toBeUndefined();
        }
        expect(renderList).not.toMatch(/DECAL_LIFT|decalView|MIN_HALF_H/);
    });

    it('every SSOT helper the spec names exists on VisualMath', () => {
        const named = ['getUnitGroundHeight', 'getUnitAnchor', 'getCoreAnchor', 'projectionCenterAt', 'getProjectionCenterY', 'resolveTargetPoint', 'floatBobAt', 'isFloatingBiome'];
        for (const fn of named) {
            expect(spec, fn).toContain(fn);
            expect(typeof (VisualMath as unknown as Record<string, unknown>)[fn], fn).toBe('function');
        }
    });
});

describe('floating bob', () => {
    it('is integer pixels within the amplitude, and zero-free only on floating biomes', () => {
        for (let t = 0; t < 5; t += 0.37) {
            for (const [x, y] of [[0, 0], [130, -40], [-260, 95]]) {
                const b = VisualMath.floatBobAt(x, y, t);
                expect(Number.isInteger(b)).toBe(true);
                expect(Math.abs(b)).toBeLessThanOrEqual(FLOAT_BOB.AMPLITUDE);
            }
        }
        expect(FLOAT_BOB.BIOMES.every(b => VisualMath.isFloatingBiome(b))).toBe(true);
        expect(VisualMath.isFloatingBiome('FOREST')).toBe(false);
    });
});

describe('unit render op follows the protocol', () => {
    const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };
    const HEIGHTS: Record<string, number> = { '0,0': 24, '0,1': 72 };
    const heightAt = (q: number, r: number) => HEIGHTS[`${q},${r}`] ?? 0;

    function buildFrames(agents: Agent[], h = heightAt, hasGround?: (q: number, r: number) => boolean) {
        const frames = new UnitFrameStore();
        frames.build(agents, h, MAP, 0, 'IDLE', hasGround);
        return frames;
    }

    function submit(agent: Agent, h = heightAt, type = RenderOpType.UNIT) {
        const list = new RenderList();
        new UnitRenderSystem().submitRenderables(list, buildFrames([agent], h), 0, null);
        return list.ops.slice(0, list.count).find(o => o.type === type)!;
    }

    it('sort Y includes the draw-time physics offset and lifts to the hex under the foot', () => {
        const a = new Agent('P', Team.BLUE, 0, 0, MAP);
        const below = HexUtils.toPx(0, 1, MAP);
        a.physics.y = (below.y - a.py) * 0.6; // 被擊退到前方鄰格內，邏輯格仍是 0,0
        const op = submit(a);
        expect(op.y).toBeCloseTo(a.py + a.physics.y, 6);
        const foot = HexUtils.fromPx(op.tx, op.y, MAP);
        const center = HexUtils.toPx(foot.q, foot.r, MAP).y;
        expect(op.y + op.sortBias).toBeGreaterThanOrEqual(center - 1e-6);
        // 腳下高度取精靈所在的較高格（getUnitGroundHeight），不是邏輯格
        expect(op.ty).toBeCloseTo(op.y - 72, 6);
    });

    it('draw Y uses the render height callback (which carries the floating bob)', () => {
        const a = new Agent('F', Team.BLUE, 0, 0, MAP);
        const flat = submit(a);
        const bobbed = submit(a, (q, r) => heightAt(q, r) - 3);
        expect(bobbed.ty - flat.ty).toBeCloseTo(3, 6);
        expect(bobbed.y).toBe(flat.y); // 排序鍵不含漂浮位移
    });
});

describe('UnitFrame is the single source of unit render coordinates', () => {
    const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };
    const HEIGHTS: Record<string, number> = { '0,0': 24, '0,1': 72 };
    const heightAt = (q: number, r: number) => HEIGHTS[`${q},${r}`] ?? 0;
    const build = (agents: Agent[], hasGround?: (q: number, r: number) => boolean) => {
        const store = new UnitFrameStore();
        store.build(agents, heightAt, MAP, 0, 'IDLE', hasGround);
        return store;
    };

    it('UNIT op coordinates are the frame (op.ty, op.y, op.sortBias)', () => {
        const a = new Agent('P', Team.BLUE, 0, 0, MAP);
        a.physics.y = 9;
        const store = build([a]);
        const list = new RenderList();
        new UnitRenderSystem().submitRenderables(list, store, 0, null);
        const op = list.ops.slice(0, list.count).find(o => o.type === RenderOpType.UNIT)!;
        const f = store.get(a)!;
        expect(op.tx).toBe(f.footX);
        expect(op.y).toBe(f.sortY);
        expect(op.ty).toBe(f.drawY);
        expect(op.sortBias).toBe(f.sortBias);
        expect(op.th).toBe(f.groundH);
    });

    it('HUD anchor and body center hang off the same foot as the body', () => {
        const a = new Agent('P', Team.BLUE, 0, 0, MAP);
        a.physics.z = 30;
        const f = build([a]).get(a)!;
        expect(f.groundH).toBe(24);
        expect(f.hudAnchorY).toBeCloseTo(f.drawY - a.physics.z - hudBarHeight('MALE'), 9);
        expect(f.bodyCenterY).toBeCloseTo(VisualMath.getVisualBodyCenterY(f.drawY, a.physics.z), 9);
    });

    it('drag preview moves body, HUD anchor and status with the cursor hex', () => {
        const a = new Agent('P', Team.BLUE, 0, 0, MAP);
        const rest = build([a]).get(a)!;
        a.dragOverQ = 0;
        a.dragOverR = 1;
        const f = build([a]).get(a)!;
        expect(f.groundH).toBe(72);
        expect(f.hudAnchorY).toBeCloseTo(rest.hudAnchorY - (72 - 24), 9);
        expect(f.bodyCenterY).toBeCloseTo(rest.bodyCenterY - (72 - 24), 9);
        expect(f.drawY).toBeCloseTo(rest.drawY - (72 - 24), 9);
    });

    it('a corpse over a collapsed tile uses the death-ground height, and CORPSE op follows its frame', () => {
        const a = new Agent('C', Team.BLUE, 0, 0, MAP);
        a.hp = 0;
        a.deathTimer = 1;
        const store = build([a], () => false);
        const f = store.get(a)!;
        expect(f.isCorpse).toBe(true);
        expect(f.groundH).toBe(0);
        const list = new RenderList();
        new UnitRenderSystem().submitRenderables(list, store, 0, null);
        const op = list.ops.slice(0, list.count).find(o => o.type === RenderOpType.CORPSE)!;
        expect(op.ty).toBe(f.drawY);
        expect(op.y).toBe(f.sortY);
    });

    describe('sort hex hysteresis', () => {
        const hexAt = (a: Agent, store: UnitFrameStore) => { const h = store.get(a)!.hexUnderFoot; return `${h.q},${h.r}`; };
        const run = (a: Agent, store: UnitFrameStore) => store.build([a], heightAt, MAP, 0, 'IDLE');
        /** 沿著 (0,0)→(0,1) 兩格心連線，腳 Y 從 t=0（0,0 格心）走到 t=1（0,1 格心） */
        const footAt = (a: Agent, t: number) => {
            const c0 = HexUtils.toPx(0, 0, MAP);
            const c1 = HexUtils.toPx(0, 1, MAP);
            a.physics.x = (c0.x + (c1.x - c0.x) * t) - a.px;
            a.physics.y = (c0.y + (c1.y - c0.y) * t) - a.py;
        };

        it('sits on the old hex until the foot is clearly inside the new one', () => {
            const a = new Agent('H', Team.BLUE, 0, 0, MAP);
            const store = new UnitFrameStore();
            footAt(a, 0.2); run(a, store);
            expect(hexAt(a, store)).toBe('0,0');
            // 原始格已換成 (0,1)，但距離差小於滯後 → 排序格不動
            const c0 = HexUtils.toPx(0, 0, MAP), c1 = HexUtils.toPx(0, 1, MAP);
            const total = Math.hypot(c1.x - c0.x, c1.y - c0.y);
            let t = 0.2, switchedAt = -1;
            for (; t <= 1; t += 0.005) {
                footAt(a, t); run(a, store);
                if (hexAt(a, store) === '0,1') { switchedAt = t; break; }
            }
            expect(switchedAt).toBeGreaterThan(0.5);
            // 切換時新格比舊格近至少 HEX_HYSTERESIS_PX
            const foot = { x: a.px + a.physics.x, y: a.py + a.physics.y };
            const dOld = Math.hypot(foot.x - c0.x, foot.y - c0.y), dNew = Math.hypot(foot.x - c1.x, foot.y - c1.y);
            expect(dNew + UNIT_FRAME.HEX_HYSTERESIS_PX).toBeLessThan(dOld);
            expect(total).toBeGreaterThan(UNIT_FRAME.HEX_HYSTERESIS_PX * 2);
            // 往回走：同樣要明顯回到舊格才切回，不會在格界上來回翻
            footAt(a, switchedAt - 0.01); run(a, store);
            expect(hexAt(a, store)).toBe('0,1');
        });

        it('switches immediately when the previous hex is more than one ring away', () => {
            const a = new Agent('T', Team.BLUE, 0, 0, MAP);
            const store = new UnitFrameStore();
            run(a, store);
            expect(hexAt(a, store)).toBe('0,0');
            const far = HexUtils.toPx(0, 3, MAP);
            a.physics.x = far.x - a.px; a.physics.y = far.y - a.py;
            run(a, store);
            expect(hexAt(a, store)).toBe('0,3');
        });
    });

    it('reuses pooled frames across builds', () => {
        const a = new Agent('P', Team.BLUE, 0, 0, MAP);
        const store = build([a]);
        const first = store.get(a);
        store.build([a], heightAt, MAP, 0, 'IDLE');
        expect(store.get(a)).toBe(first);
        expect(store.list.length).toBe(1);
    });
});
