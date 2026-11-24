import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { factorySkills } from '../engine/core/MatchSnapshot';
import { SKILL_GLYPH } from '../data/ui/skillGlyphs';

/**
 * 技能圖示（data/ui/skillGlyphs.ts，WORKLOG §2 DE）：每招都有圖、圖在 lucide 裡、同一職業不重複，
 * 而且 public/assets/ui/skill_glyphs.json（npm run gen:skill-glyphs 產生）和表與 lucide 原始資料一致。
 */
const ROOT = path.resolve(__dirname, '..');
const LUCIDE_DIR = path.join(ROOT, 'node_modules/lucide-react/dist/esm/icons');
const GLYPH_JSON = path.join(ROOT, 'public/assets/ui/skill_glyphs.json');

describe('SKILL_GLYPH', () => {
    const skills = factorySkills();

    it('maps every factory skill, and nothing else', () => {
        const ids = skills.map((s) => s.id).sort();
        expect(Object.keys(SKILL_GLYPH).sort()).toEqual(ids);
    });

    it('only names glyphs that exist in the installed lucide, by their own name (not an alias file)', () => {
        const bad = [...new Set(Object.values(SKILL_GLYPH))].filter((g) => {
            const file = path.join(LUCIDE_DIR, `${g}.mjs`);
            // 別名檔（angry.mjs → face-angry.mjs）只轉發 default，沒有 __iconData
            return !fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes('__iconData');
        });
        expect(bad).toEqual([]);
    });

    it('never repeats a glyph inside one role (both teams together)', () => {
        const clashes: string[] = [];
        for (const a of skills) for (const b of skills) {
            if (a.id >= b.id || a.role !== b.role) continue;
            if (SKILL_GLYPH[a.id] === SKILL_GLYPH[b.id]) clashes.push(`${a.role} ${SKILL_GLYPH[a.id]}: ${a.id}${a.name} / ${b.id}${b.name}`);
        }
        expect(clashes).toEqual([]);
    });

    it('public/assets/ui/skill_glyphs.json holds exactly the mapped glyphs, as lucide draws them', async () => {
        expect(fs.existsSync(GLYPH_JSON), 'run npm run gen:skill-glyphs').toBe(true);
        const json: Record<string, unknown> = JSON.parse(fs.readFileSync(GLYPH_JSON, 'utf8'));
        const used = [...new Set(Object.values(SKILL_GLYPH))].sort();
        expect(Object.keys(json).sort()).toEqual(used);
        for (const g of used) {
            const mod = await import(path.join(LUCIDE_DIR, `${g}.mjs`));
            const node = (mod.__iconData.node as [string, Record<string, string>][]).map(([tag, attrs]) => {
                const { key: _key, ...rest } = attrs;
                return [tag, rest];
            });
            expect(json[g], g).toEqual(node);
        }
    });
});
