import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as constants from '../constants';
import { DesignExporter } from '../engine/presentation/DesignExporter';
import { RenderSpec } from '../engine/renderers/RenderSpec';
import { DESIGN_EXPORT } from '../data/ui/designExport';

const template = readFileSync(new URL('../docs/ARCHITECTURE_WHITEPAPER.md', import.meta.url), 'utf8');

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('WhitepaperDrift', () => {
    // repo 路徑由 DocDrift 檢查 docs 全文，不在這裡重複。
    it('每個佔位符都能從 constants 匯出解析，且 raw 匯入內容與文件一致', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-29T00:00:00Z'));
        const placeholders = [...template.matchAll(/\{\{([^{}]*)\}\}/g)];
        expect(placeholders.length).toBeGreaterThan(0);
        for (const [, path] of placeholders) {
            expect(path).toMatch(/^[A-Za-z_$][\w$]*(?:\.(?:[A-Za-z_$][\w$]*|\d+))*$/);
            let value: unknown = constants;
            for (const key of path.split('.')) {
                expect(value, path).not.toBeNull();
                expect(typeof value, path).toBe('object');
                expect(Object.prototype.hasOwnProperty.call(value, key), path).toBe(true);
                value = (value as Record<string, unknown>)[key];
            }
            expect(value, path).toBeDefined();
            expect(typeof value, path).not.toBe('function');
        }
        expect(DesignExporter.generateSpec()).toBe(DesignExporter.generateSpec(template));
        expect(DesignExporter.generateSpec()).not.toMatch(/\{\{|## 未解析/);
    });

    it('只查 own 點路徑，保留未知與運算式並在檔尾列出一次', () => {
        const unknown = '{{MISSING_WHITEPAPER_CONSTANT}}';
        const expression = '{{ISO_SCALE_Y + 1}}';
        const inherited = '{{GAME_APP_PARAM.toString}}';
        const result = DesignExporter.generateSpec(`${unknown} ${unknown} ${expression} ${inherited}`);
        expect(result).toContain(`${unknown} ${unknown} ${expression} ${inherited}`);
        expect(result).toMatch(/## 未解析/);
        expect(result.split('## 未解析')[1]).toBe(`\n\n- ${unknown}\n- ${expression}\n- ${inherited}\n`);
        expect(DesignExporter.generateSpec('{{ISO_SCALE_Y}}')).toContain(String(constants.ISO_SCALE_Y));
    });

    it('先下載白皮書，再依既有間隔下載座標規格', () => {
        vi.useFakeTimers();
        const architecture = vi.spyOn(DesignExporter, 'downloadArchitectureSpec').mockImplementation(() => {});
        const coordinates = vi.spyOn(RenderSpec, 'downloadSpec').mockImplementation(() => {});
        DesignExporter.downloadAll();
        expect(architecture).toHaveBeenCalledOnce();
        expect(coordinates).not.toHaveBeenCalled();
        vi.advanceTimersByTime(DESIGN_EXPORT.COORDINATE_DELAY_MS);
        expect(coordinates).toHaveBeenCalledOnce();
    });
});
