// 字串鍵交叉引用守門測試（docs/REFERENCE_AUDIT.md）。
// 特效、投射物、狀態、AI 節點等都以字串鍵查表，查不到時多半靜默退回或不播放，型別系統抓不到。
// 每個家族：「目前違規」必須與 reference-integrity.baseline.json 完全相同——
// 新增違規直接失敗；基準內已修好的項目也失敗（強迫同步刪除基準），所以基準只會縮小。
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import { PROJECTILE_VISUALS } from '../data/vfx/projectile_visuals';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';
import { ACTIVE_VISUALS } from '../data/vfx/active_visuals';
import { BASIC_VISUALS } from '../data/vfx/basic_visuals';
import { ULT_VISUALS } from '../data/vfx/ult_visuals';
import { STATUS_VISUALS } from '../data/vfx/status_visuals';
import { STATUS_PARTS } from '../data/vfx/status_parts';
import { HAZARD_VISUALS } from '../data/vfx/hazard_visuals';
import { PART_GALLERY } from '../data/vfx/parts/partGallery';
import { BEAM_STYLES } from '../data/vfx/beam_styles';
import { FACTION_VISUALS } from '../data/vfx/faction_visuals';
import { AOE_BREAK, aoeBreakFxId, castBreakFxId } from '../data/vfx/registry/cast_break';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { STANDARD_AI_PROFILE, BTDef } from '../data/ai_profiles';
import { BTConditions, BTActions } from '../engine/ai/BTRegistry';
import { SCENE_DB } from '../data/scenes';
import { OBSTACLE_DB } from '../data/obstacles';
import { DOT_COLORS, OBSTACLE_STYLES, TERRAIN_THEMES, TERRAIN_SKIN } from '../constants';
import { lookupSpriteAppearance } from '../data/units/appearance/sprite';
import { BODY_TYPE_PROFILE } from '../data/units/appearance/bodyTypes';
import type { SpecialVisualStatus } from '../engine/core/Agent';
import { Role, Team, SpatialHazard, BodyTypeId } from '../types';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['engine', 'data', 'components', 'hooks'];
const BASELINE_PATH = path.join(ROOT, 'tests', 'reference-integrity.baseline.json');
const BASELINE: Record<string, string[]> = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

const TEAMS = [Team.BLUE, Team.RED] as const;
const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT] as const;
const TAGS = ['BASIC', 'ACTIVE', 'ULT'] as const;
const REGISTRY = new Set(Object.keys(VFX_REGISTRY));

function listSources(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
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

const SOURCES: [string, string][] = SCAN_DIRS.flatMap(listSources)
    .map(f => [f, stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'))]);

function scan(re: RegExp): { file: string; key: string }[] {
    const hits: { file: string; key: string }[] = [];
    for (const [file, src] of SOURCES) for (const m of src.matchAll(re)) hits.push({ file, key: m[1] });
    return hits;
}

const uniqSorted = (xs: string[]) => [...new Set(xs)].sort();

/** 每個家族的「目前違規」；鍵名同 baseline JSON。 */
const FAMILIES: Record<string, () => string[]> = {
    // ── VFX ────────────────────────────────────────────────────────────────
    /** 原始碼中任何 'FX_*' 字串常值都要在登記表（含三元式、常數、事件 text）。組合用的前綴另由下面的測試展開檢查。 */
    'vfx.literal': () => {
        const PREFIXES = new Set(['FX_HAZARD_FIELD_', 'FX_AOE_BREAK_RED', 'FX_AOE_BREAK_BLUE']);
        return uniqSorted(scan(/['"`](FX_[A-Z0-9_]+)['"`]/g)
            .filter(h => !REGISTRY.has(h.key) && !PREFIXES.has(h.key))
            .map(h => `${h.file}: ${h.key}`));
    },
    /** SKILL_SEQUENCES 的 PARTICLE 動作（VFXPlayer.play 查不到就靜默略過）。光束樣式在 beamStyle、投射物在技能的 visualProjectileEffect（ART_VFX_PLAN §5）。 */
    'vfx.sequenceParticle': () => uniqSorted(Object.entries(SKILL_SEQUENCES).flatMap(([id, seq]) =>
        seq.actions.filter(a => a.type === 'PARTICLE' && !REGISTRY.has(a.id ?? 'FX_HIT_GENERIC')).map(a => `${id}: ${a.id}`))),
    /** BEAM 動作的 style 必須是 BEAM_STYLES 的鍵（光束寬度與畫法的唯一來源）。 */
    'vfx.beamStyle': () => uniqSorted(Object.entries(SKILL_SEQUENCES).flatMap(([id, seq]) =>
        seq.actions.filter(a => a.type === 'BEAM' && !(a.style && a.style in BEAM_STYLES)).map(a => `${id}: ${a.style}`))),
    /** 陣營預設特效（技能沒有指定特效時 SkillSequences 的退路）＝ FACTION_VISUALS.defaultHitEffect。 */
    'vfx.sequenceFallback': () => TEAMS.map(t => FACTION_VISUALS[t].defaultHitEffect).filter(id => !REGISTRY.has(id)).sort(),
    /** 特效展示庫的零件圖鑑（PART_GALLERY）必須涵蓋登記特效用到的每一種零件。 */
    'vfx.libraryGallery': () => uniqSorted(Object.values(VFX_REGISTRY).flatMap(a => a.emitters.map(e => e.part?.kind))
        .filter((k): k is NonNullable<typeof k> => !!k && !PART_GALLERY.some(g => g.kind === k))),

    // ── 投射物 ─────────────────────────────────────────────────────────────
    /** projectileSpeed > 0 的技能會生成投射物；ProjectileSystem 以 visualProjectileEffect || visual || 'BOLT' 查 PROJECTILE_VISUALS，查不到退回 DEFAULT_PROJECTILE。 */
    'projectile.skillKey': () => uniqSorted(DEFAULT_SKILL_DB
        .filter(s => (s.projectileSpeed ?? 0) > 0)
        .map(s => [s.id, s.visualProjectileEffect || s.visual || 'BOLT'] as const)
        .filter(([, key]) => !PROJECTILE_VISUALS[key])
        .map(([id, key]) => `${id}: ${key}`)),
    /** 投射物外觀（零件版）：本體有長度、有拖尾就要有寬度、煙拖尾要指定煙色（外形與色階由型別保證）。 */
    'projectile.look': () => uniqSorted(Object.entries(PROJECTILE_VISUALS)
        .filter(([, d]) => !(d.look.size > 0) || (d.look.trail !== 'none' && !(d.look.trailWidth > 0)) || (d.look.trail === 'smoke' && !d.look.smoke))
        .map(([k]) => k)),
    /** 沒有任何技能能查到的投射物定義（死資料）。 */
    'projectile.orphan': () => Object.keys(PROJECTILE_VISUALS).filter(k => !reachableProjectileKeys().has(k)).sort(),

    // ── 狀態 ───────────────────────────────────────────────────────────────
    /** 每個 STATUS_VISUALS 鍵都要有 STATUS_PARTS（零件版狀態表）條目，反之亦然；別名必須指向存在的鍵。 */
    'status.parts': () => uniqSorted([
        ...Object.keys(STATUS_VISUALS).filter(k => !(k in STATUS_PARTS)).map(k => `visual-without-parts: ${k}`),
        ...Object.keys(STATUS_PARTS).filter(k => !(k in STATUS_VISUALS)).map(k => `parts-without-visual: ${k}`),
        ...Object.entries(STATUS_PARTS).filter(([, v]) => v.alias && !(v.alias in STATUS_PARTS)).map(([k, v]) => `bad-alias: ${k} -> ${v.alias}`),
    ]),
    /** 每個非 NONE 的 SpecialVisualStatus 都該有 STATUS_VISUALS 條目（GridOverlays 以它查表）。 */
    'status.specialVisual': () => (Object.keys(SPECIAL_VISUALS) as SpecialVisualStatus[])
        .filter(k => !STATUS_VISUALS[k]).sort(),
};

/** 以型別強制窮舉：新增 SpecialVisualStatus 值時這裡會編譯失敗。 */
const SPECIAL_VISUALS: Record<Exclude<SpecialVisualStatus, 'NONE'>, true> = {
    FROZEN: true, POLYMORPH: true, STASIS: true, DANGER: true, INVINCIBLE: true,
};
const HAZARD_TYPES: Record<SpatialHazard['type'], true> = {
    POISON: true, FIRE: true, ICE: true, GRAVITY: true, GENERIC: true,
};

let reachable: Set<string> | null = null;
function reachableProjectileKeys(): Set<string> {
    if (!reachable) {
        reachable = new Set(DEFAULT_SKILL_DB.filter(s => (s.projectileSpeed ?? 0) > 0)
            .map(s => s.visualProjectileEffect || s.visual || 'BOLT'));
    }
    return reachable;
}

describe('reference integrity ratchet (string keys)', () => {
    it('baseline lists exactly the known families', () => {
        expect(Object.keys(BASELINE).sort()).toEqual(Object.keys(FAMILIES).sort());
    });

    for (const [family, collect] of Object.entries(FAMILIES)) {
        const current = collect();
        const baseline = BASELINE[family] ?? [];
        it(`${family}: no new broken references`, () => {
            expect(current.filter(v => !baseline.includes(v)), `${family} not in baseline`).toEqual([]);
        });
        it(`${family}: baseline only shrinks (remove fixed entries)`, () => {
            expect(baseline.filter(v => !current.includes(v)), `${family} baseline entries that no longer occur`).toEqual([]);
        });
    }
});

describe('VFX composed ids', () => {
    it('cast-break and AOE-break ids resolve for both teams and every band', () => {
        const missing: string[] = [];
        for (const team of [...TEAMS, undefined]) {
            if (!REGISTRY.has(castBreakFxId(team))) missing.push(castBreakFxId(team));
            for (let b = 0; b < AOE_BREAK.BANDS; b++) if (!REGISTRY.has(aoeBreakFxId(team, b))) missing.push(aoeBreakFxId(team, b));
        }
        expect(missing).toEqual([]);
    });

    it('every hazard type has a field effect and a registered spawn effect', () => {
        const missing: string[] = [];
        for (const type of Object.keys(HAZARD_TYPES)) {
            if (!REGISTRY.has(`FX_HAZARD_FIELD_${type}`)) missing.push(`FX_HAZARD_FIELD_${type}`);
            const spawn = HAZARD_VISUALS[type]?.spawnVfx;
            if (spawn && !REGISTRY.has(spawn)) missing.push(`${type}: ${spawn}`);
        }
        expect(missing).toEqual([]);
    });

    it('every registry entry id matches its key', () => {
        expect(Object.entries(VFX_REGISTRY).filter(([k, v]) => v.id !== k).map(([k]) => k)).toEqual([]);
    });

    it('per-skill visual tables point at registered effects', () => {
        const bad = [
            ...Object.entries(ACTIVE_VISUALS).filter(([, v]) => v.impactFx && !REGISTRY.has(v.impactFx)).map(([k, v]) => `${k} impactFx: ${v.impactFx}`),
            ...Object.entries(ULT_VISUALS).filter(([, v]) => v.vfxOverride && !REGISTRY.has(v.vfxOverride)).map(([k, v]) => `${k} vfxOverride: ${v.vfxOverride}`),
        ];
        expect(bad).toEqual([]);
    });

    it('ult windupFx is registered', () => {
        expect(Object.entries(ULT_VISUALS).filter(([, v]) => v.windupFx && !REGISTRY.has(v.windupFx)).map(([k]) => k)).toEqual([]);
    });
});

describe('skills', () => {
    const ids = DEFAULT_SKILL_DB.map(s => s.id);
    const idSet = new Set(ids);

    it('skill ids are unique', () => {
        expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    });

    it('skill id encodes role, team and tag (SkillSequences derives faction and slot from it)', () => {
        const ROLE_LETTER: Record<string, Role> = { t: Role.TANK, w: Role.WARRIOR, r: Role.RANGER, m: Role.MAGE, s: Role.SUPPORT };
        const TAG_LETTER: Record<string, string> = { b: 'BASIC', a: 'ACTIVE', u: 'ULT' };
        const bad = DEFAULT_SKILL_DB.filter(s => {
            const m = /^([twrms])([br])_([bau])[1-5]$/.exec(s.id);
            return !m || s.role !== ROLE_LETTER[m[1]] || s.tag !== TAG_LETTER[m[3]] || s.team !== (m[2] === 'b' ? Team.BLUE : Team.RED);
        }).map(s => s.id);
        expect(bad).toEqual([]);
    });

    it('auto-assignment (AgentManager.addAgent: role + team + tag) finds a skill for every slot of every unit type', () => {
        const empty: string[] = [];
        for (const team of TEAMS) for (const role of ROLES) for (const tag of TAGS) {
            const n = DEFAULT_SKILL_DB.filter(s => s.role === role && (s.team === undefined || s.team === team) && s.tag === tag).length;
            if (n === 0) empty.push(`${Team[team]} ${role} ${tag}`);
        }
        expect(empty).toEqual([]);
    });

    it('per-skill visual configs and sequences reference existing skills and cover every skill', () => {
        const tables: Record<string, Record<string, unknown>> = { BASIC: BASIC_VISUALS, ACTIVE: ACTIVE_VISUALS, ULT: ULT_VISUALS };
        const orphans = Object.entries(tables).flatMap(([tag, t]) => Object.keys(t)
            .filter(k => !DEFAULT_SKILL_DB.some(s => s.id === k && s.tag === tag)).map(k => `${tag}: ${k}`));
        const uncovered = DEFAULT_SKILL_DB.filter(s => !tables[s.tag][s.id] || !SKILL_SEQUENCES[s.id]).map(s => s.id);
        const seqOrphans = Object.keys(SKILL_SEQUENCES).filter(k => !idSet.has(k));
        expect({ orphans, uncovered, seqOrphans }).toEqual({ orphans: [], uncovered: [], seqOrphans: [] });
    });

    it('skill visual effect fields point at registered assets (same rule as VFXValidator at startup)', () => {
        const bad: string[] = [];
        for (const s of DEFAULT_SKILL_DB) {
            for (const [field, id] of [['hit', s.visualHitEffect]] as const) {
                if (id && !REGISTRY.has(id)) bad.push(`${s.id} ${field}: ${id}`);
            }
            if (s.visualProjectileEffect && !PROJECTILE_VISUALS[s.visualProjectileEffect]) bad.push(`${s.id} proj: ${s.visualProjectileEffect}`);
        }
        expect(bad).toEqual([]);
    });
});

describe('status keys', () => {
    it('literal STATUS_VISUALS lookups and checkVFX keys exist', () => {
        const hits = [
            ...scan(/STATUS_VISUALS\.([A-Z_]+)/g),
            ...scan(/STATUS_VISUALS\[\s*['"]([A-Z_]+)['"]\s*\]/g),
            ...scan(/checkVFX\(\s*['"]([A-Z_]+)['"]/g),
        ];
        expect(uniqSorted(hits.filter(h => !STATUS_VISUALS[h.key]).map(h => `${h.file}: ${h.key}`))).toEqual([]);
    });

    it('every STATUS_VISUALS entry id matches its key', () => {
        expect(Object.entries(STATUS_VISUALS).filter(([k, v]) => v.id !== k).map(([k]) => k)).toEqual([]);
    });

    it('every dotType written has a DOT_COLORS entry', () => {
        const written = uniqSorted(scan(/(?:dotType|\btag)\s*=\s*['"]([A-Z_]+)['"]/g).map(h => h.key));
        expect(written.length).toBeGreaterThan(0);
        expect(written.filter(k => !DOT_COLORS[k])).toEqual([]);
    });
});

describe('AI behavior tree keys', () => {
    function walk(def: BTDef, out: BTDef[] = []): BTDef[] {
        out.push(def);
        for (const c of def.children ?? []) walk(c, out);
        return out;
    }
    const nodes = walk(STANDARD_AI_PROFILE);

    it('every CONDITION/ACTION node key is registered', () => {
        const bad = nodes.filter(n =>
            (n.type === 'CONDITION' && !(n.key && BTConditions[n.key])) ||
            (n.type === 'ACTION' && !(n.key && BTActions[n.key]))).map(n => `${n.type} ${n.name}: ${n.key}`);
        expect(bad).toEqual([]);
    });

    it('composite nodes have children', () => {
        expect(nodes.filter(n => (n.type === 'SELECTOR' || n.type === 'SEQUENCE') && !(n.children?.length)).map(n => n.name)).toEqual([]);
    });

    it('literal BTConditions["..."] calls inside the registry resolve', () => {
        const hits = scan(/BTConditions\[\s*['"]([A-Za-z]+)['"]\s*\]/g).filter(h => !BTConditions[h.key]);
        expect(hits.map(h => `${h.file}: ${h.key}`)).toEqual([]);
    });
});

describe('scene, terrain and obstacle keys', () => {
    it('every scene resolves its terrain theme, terrain skin and obstacle style', () => {
        const bad: string[] = [];
        for (const s of SCENE_DB) {
            if (!TERRAIN_THEMES[s.textureType]) bad.push(`${s.id} theme ${s.textureType}`);
            if (!TERRAIN_SKIN.themes[s.textureType]) bad.push(`${s.id} skin ${s.textureType}`);
            if (!OBSTACLE_DB[s.obstacleStyle]) bad.push(`${s.id} obstacle ${s.obstacleStyle}`);
            if (!OBSTACLE_STYLES[s.obstacleStyle]) bad.push(`${s.id} obstacleStyle ${s.obstacleStyle}`);
        }
        expect(bad).toEqual([]);
    });

    it('OBSTACLE_DB and OBSTACLE_STYLES share the same keys', () => {
        expect(Object.keys(OBSTACLE_STYLES).sort()).toEqual(Object.keys(OBSTACLE_DB).sort());
    });

    it('literal OBSTACLE_STYLES / OBSTACLE_DB / TERRAIN_THEMES lookups exist', () => {
        const tables: Record<string, Record<string, unknown>> = { OBSTACLE_STYLES, OBSTACLE_DB, TERRAIN_THEMES };
        const bad: string[] = [];
        for (const [name, table] of Object.entries(tables)) {
            for (const h of scan(new RegExp(String.raw`${name}\[[^\]]*?['"]([A-Z_]+)['"]`, 'g'))) {
                if (!table[h.key]) bad.push(`${h.file}: ${name}.${h.key}`);
            }
        }
        expect(bad).toEqual([]);
    });
});

describe('unit sprite manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/units/manifest.json'), 'utf8')) as {
        directions: string[];
        units: Record<string, { file: string; anims: Record<string, { frames: Record<string, unknown[]> }> }>;
    };
    const REQUIRED_ANIMS = ['idle', 'walk', 'attack', 'hit', 'death'];

    it('every team x role x body type resolves to a manifest unit with its atlas file and required anims', () => {
        const bad: string[] = [];
        for (const team of TEAMS) for (const role of ROLES) for (const body of Object.keys(BODY_TYPE_PROFILE) as BodyTypeId[]) {
            const ap = lookupSpriteAppearance(team, role, body);
            const label = `${Team[team]}:${role}:${body}`;
            if (!ap) { bad.push(`${label} unresolved`); continue; }
            const unit = manifest.units[ap.manifestKey];
            if (!unit) { bad.push(`${label} -> ${ap.manifestKey} missing`); continue; }
            if (!fs.existsSync(path.join(ROOT, 'public/assets/units', unit.file))) bad.push(`${ap.manifestKey} file ${unit.file}`);
            for (const anim of REQUIRED_ANIMS) {
                for (const dir of manifest.directions) {
                    if (!unit.anims[anim]?.frames[dir]?.length) bad.push(`${ap.manifestKey} ${anim}/${dir}`);
                }
            }
        }
        expect(bad).toEqual([]);
    });
});
