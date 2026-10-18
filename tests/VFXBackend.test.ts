import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import {
    PARTICLE_TRAITS, particleBackend, VFX_GROUND_TYPES, PHYSICAL_PARTICLE_TYPES,
    FIXED_ORIENTATION_PARTICLE_TYPES, SELF_DRAWN_PARTICLE_TYPES, PART_PARTICLE_TYPES,
} from '../constants';

// 特效繪製後端的守門（docs/VFX_PIPELINE_MAP.md §5-5）。
// 1. 粒子型別特性表只剩零件、光束、天氣與除錯點；推導出的集合鎖在下面。
// 2. 只減不增：登記表裡還在用舊後端（非零件）的資產、引擎裡直接指定舊粒子型別的字面值，只能從下面的名單刪，不能新增。
//    遷移掉一個就把它從名單刪掉；要新增舊後端資產，先說服主代理（理由寫在 commit）。

const sorted = (s: ReadonlySet<string>) => [...s].sort();

describe('particle traits table', () => {
    it('only the part types, beams, weather and the debug dot exist (V5a)', () => {
        // 舊的 PROC／GROUND／看板型別已全部移除（docs/VFX_PIPELINE_MAP.md §4.12）；新增型別要先在特性表登記
        expect(Object.keys(PARTICLE_TRAITS).sort()).toEqual(['ATMOSPHERE', 'BEAM', 'GENERIC_DEBUG', 'PART', 'PART_DEBRIS', 'PART_GROUND']);
        expect(sorted(VFX_GROUND_TYPES)).toEqual(['PART_GROUND']);
        expect(sorted(PHYSICAL_PARTICLE_TYPES)).toEqual(['PART_DEBRIS']);
        expect(sorted(FIXED_ORIENTATION_PARTICLE_TYPES)).toEqual(['PART', 'PART_DEBRIS', 'PART_GROUND']);
        expect(sorted(SELF_DRAWN_PARTICLE_TYPES)).toEqual(['BEAM', 'PART', 'PART_DEBRIS', 'PART_GROUND']);
        expect(sorted(PART_PARTICLE_TYPES)).toEqual(['PART', 'PART_DEBRIS', 'PART_GROUND']);
        const byBackend = (b: string) => Object.keys(PARTICLE_TRAITS).filter((k) => particleBackend(k) === b).sort();
        expect(byBackend('BILL')).toEqual(['ATMOSPHERE', 'BEAM', 'GENERIC_DEBUG']);
    });
});

/** 還在用舊後端的登記資產（只減不增） */
const LEGACY_ASSETS_ALLOWED: string[] = [];

/** 引擎內直接指定（不經登記表）的非零件粒子型別（只減不增）。ATMOSPHERE＝天氣（地形 T4 零件化）；BEAM 一律掛光束零件；GENERIC_DEBUG 是粒子池重置的預設值 */
const LEGACY_DIRECT_TYPES_ALLOWED = ['ATMOSPHERE', 'BEAM', 'GENERIC_DEBUG'];

function collectSources(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectSources(full, out);
        else if (/\.ts$/.test(entry.name)) out.push(full);
    }
    return out;
}

describe('VFX backend ratchet (shrink-only)', () => {
    it('registry assets on legacy backends only shrink', () => {
        const legacy = Object.entries(VFX_REGISTRY)
            .filter(([, a]) => a.emitters.some((e) => particleBackend(e.particleType) !== 'PART'))
            .map(([k]) => k);
        const added = legacy.filter((k) => !LEGACY_ASSETS_ALLOWED.includes(k));
        expect(added, '新增了舊後端（非零件）的登記資產').toEqual([]);
        const stale = LEGACY_ASSETS_ALLOWED.filter((k) => !legacy.includes(k));
        expect(stale, '已遷移或刪除的資產請從 LEGACY_ASSETS_ALLOWED 移除').toEqual([]);
    });

    it('direct legacy particle types in engine only shrink', () => {
        const root = path.resolve(__dirname, '..');
        const found = new Set<string>();
        for (const file of collectSources(path.join(root, 'engine'))) {
            const src = fs.readFileSync(file, 'utf-8');
            // 粒子物件的 .type 指派（排除 RenderOp／事件）；三元式的兩個分支都算
            for (const m of src.matchAll(/\b(?!op\b|ev\b|event\b)\w+(?:\(\))?\.type\s*=(?!=)\s*([^;\n]+)/g)) {
                for (const lit of m[1].matchAll(/'([A-Z_]+)'/g)) {
                    if (lit[1] in PARTICLE_TRAITS && particleBackend(lit[1]) !== 'PART') found.add(lit[1]);
                }
            }
        }
        const added = [...found].filter((t) => !LEGACY_DIRECT_TYPES_ALLOWED.includes(t));
        expect(added, '引擎新增了直接生成的舊粒子型別').toEqual([]);
        const stale = LEGACY_DIRECT_TYPES_ALLOWED.filter((t) => !found.has(t));
        expect(stale, '已不再使用的型別請從 LEGACY_DIRECT_TYPES_ALLOWED 移除').toEqual([]);
    });
});
