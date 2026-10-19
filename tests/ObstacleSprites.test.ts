import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OBSTACLE_DB } from '../data/obstacles';
import { SCENE_DB } from '../data/scenes';
import { obstacleVariant, type ObstacleManifest } from '../engine/renderers/grid/ObstacleSpriteStore';

const DIR = path.resolve(__dirname, '../public/assets/obstacles');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf-8')) as ObstacleManifest;

describe('障礙物預渲染圖集（VISUAL_ROADMAP O1／O2）', () => {
    it('每種障礙物與每張地圖用到的障礙物都有 3 個以上變體，圖集檔存在', () => {
        const used = new Set([...Object.keys(OBSTACLE_DB), ...SCENE_DB.map((s) => s.obstacleStyle).filter(Boolean)]);
        for (const id of used) {
            const def = manifest.types[id as string];
            expect(def, id as string).toBeDefined();
            expect(def.variants.length).toBeGreaterThanOrEqual(3);
            expect(fs.existsSync(path.join(DIR, def.file))).toBe(true);
        }
    });

    it('影格在圖集內、錨點落在影格內（腳底在下緣附近）', () => {
        for (const [id, def] of Object.entries(manifest.types)) {
            for (const v of def.variants) {
                expect(v.x + v.w, id).toBeLessThanOrEqual(def.atlas.w);
                expect(v.y + v.h, id).toBeLessThanOrEqual(def.atlas.h);
                expect(v.ax).toBeGreaterThan(0);
                expect(v.ax).toBeLessThan(v.w);
                expect(v.ay).toBeGreaterThan(v.h * 0.6);
                expect(v.ay).toBeLessThanOrEqual(v.h);
            }
        }
    });

    it('變體選擇只看格子座標：穩定、在範圍內、會分散', () => {
        const seen = new Set<number>();
        for (let q = -6; q <= 6; q++) {
            for (let r = -6; r <= 6; r++) {
                const v = obstacleVariant(q, r, 4);
                expect(v).toBe(obstacleVariant(q, r, 4));
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(4);
                seen.add(v);
            }
        }
        expect(seen.size).toBe(4);
        expect(obstacleVariant(3, 5, 1)).toBe(0);
    });
});
