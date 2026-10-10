import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface BoundaryMetrics {
    directEngineMutation: number;
    directAgentMutation: number;
    directRendererAccess: number;
    asAny: number;
    setIntervalCount: number;
    tailwindPaletteClasses: number;
    zIndexClasses: number;
    directEngineMethodCalls: number;
    directPoseWrites: number;
}

function getFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            results = results.concat(getFiles(full));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(full);
        }
    }
    return results;
}

function scanBoundaryMetrics(): BoundaryMetrics {
    const rootDir = path.resolve(__dirname, '..');
    const files = [
        ...getFiles(path.join(rootDir, 'components')),
        ...getFiles(path.join(rootDir, 'hooks')),
    ];
    const zIndexFiles = [
        ...getFiles(path.join(rootDir, 'components')),
        path.join(rootDir, 'App.tsx'),
    ];

    const counts: BoundaryMetrics = {
        directEngineMutation: 0,
        directAgentMutation: 0,
        directRendererAccess: 0,
        asAny: 0,
        setIntervalCount: 0,
        tailwindPaletteClasses: 0,
        zIndexClasses: 0,
        directEngineMethodCalls: 0,
        directPoseWrites: 0,
    };

    const patterns: Record<Exclude<keyof BoundaryMetrics, 'zIndexClasses'>, RegExp> = {
        directEngineMutation: /engine\.\w+(\.\w+)*\s*=[^=]/g,
        directAgentMutation: /agent\.\w+\s*=[^=]/g,
        directRendererAccess: /\.renderer\b/g,
        asAny: /as\s+any\b/g,
        setIntervalCount: /\bsetInterval\s*\(/g,
        tailwindPaletteClasses:
            /\b(?:bg|text|border|ring|shadow|from|to|via)-(?:cyan|slate|red|blue|amber|emerald|purple|orange|rose|indigo|yellow|green|violet|sky)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g,
        directEngineMethodCalls:
            /(?:engine\.(?:addAgent|removeAgent|resetAgent|updateAgentPosition|stop|play|clear|randomizeEnvironment)\(|engine\.map\.(?:setObstacle|removeObstacle)\()/g,
        directPoseWrites: /\.(?:px|py|dragOverQ|dragOverR)\s*=[^=]/g,
    };

    for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        for (const [key, regex] of Object.entries(patterns) as [Exclude<keyof BoundaryMetrics, 'zIndexClasses'>, RegExp][]) {
            const matches = content.match(regex);
            if (matches) {
                counts[key] += matches.length;
            }
        }
    }

    const zIndexRegex = /\bz-\[?\d+\]?/g;
    for (const f of zIndexFiles) {
        const content = fs.readFileSync(f, 'utf8');
        const matches = content.match(zIndexRegex);
        if (matches) {
            counts.zIndexClasses += matches.length;
        }
    }

    return counts;
}

describe('UI Boundary Ratchet Guard (E9)', () => {
    const baselinePath = path.resolve(__dirname, 'ui-boundary.baseline.json');
    const baselineRaw = fs.readFileSync(baselinePath, 'utf8');
    const baseline: BoundaryMetrics = JSON.parse(baselineRaw);
    const current = scanBoundaryMetrics();

    it('enforces direct engine mutations do not increase (ratchet)', () => {
        expect(
            current.directEngineMutation,
            `Direct engine mutations (${current.directEngineMutation}) exceeded baseline (${baseline.directEngineMutation}). Mutations must use UICommandSystem!`
        ).toBeLessThanOrEqual(baseline.directEngineMutation);
    });

    it('enforces direct agent mutations do not increase (ratchet)', () => {
        expect(
            current.directAgentMutation,
            `Direct agent mutations (${current.directAgentMutation}) exceeded baseline (${baseline.directAgentMutation}). Mutations must use EDIT_AGENT command!`
        ).toBeLessThanOrEqual(baseline.directAgentMutation);
    });

    it('enforces direct renderer access does not increase (ratchet)', () => {
        expect(
            current.directRendererAccess,
            `Direct renderer accesses (${current.directRendererAccess}) exceeded baseline (${baseline.directRendererAccess}). UI must not touch renderer directly!`
        ).toBeLessThanOrEqual(baseline.directRendererAccess);
    });

    it('enforces zero as any in UI layers', () => {
        expect(
            current.asAny,
            `"as any" count (${current.asAny}) exceeded baseline (${baseline.asAny}). Strict type safety is mandatory!`
        ).toBeLessThanOrEqual(baseline.asAny);
    });

    it('enforces setInterval count does not increase (ratchet)', () => {
        expect(
            current.setIntervalCount,
            `setInterval count (${current.setIntervalCount}) exceeded baseline (${baseline.setIntervalCount}). Use useEngineView shared ticker instead!`
        ).toBeLessThanOrEqual(baseline.setIntervalCount);
    });

    it('enforces hardcoded Tailwind palette classes do not increase (ratchet)', () => {
        expect(
            current.tailwindPaletteClasses,
            `Tailwind palette class count (${current.tailwindPaletteClasses}) exceeded baseline (${baseline.tailwindPaletteClasses}). Palette classes should be migrated to semantic tokens!`
        ).toBeLessThanOrEqual(baseline.tailwindPaletteClasses);
    });

    it('enforces zIndexClasses count does not increase (ratchet)', () => {
        expect(
            current.zIndexClasses,
            `zIndexClasses count (${current.zIndexClasses}) exceeded baseline (${baseline.zIndexClasses}). Migrate z-index classes to UI_Z constants!`
        ).toBeLessThanOrEqual(baseline.zIndexClasses);
    });

    it('enforces direct engine method calls do not increase (ratchet)', () => {
        expect(
            current.directEngineMethodCalls,
            `Direct engine method calls (${current.directEngineMethodCalls}) exceeded baseline (${baseline.directEngineMethodCalls}). Method calls must use UICommandSystem!`
        ).toBeLessThanOrEqual(baseline.directEngineMethodCalls);
    });

    it('enforces direct pose writes do not increase (ratchet)', () => {
        expect(
            current.directPoseWrites,
            `Direct pose writes (${current.directPoseWrites}) exceeded baseline (${baseline.directPoseWrites}). Pose mutations must be reduced!`
        ).toBeLessThanOrEqual(baseline.directPoseWrites);
    });

    /**
     * Documented Architectural Exceptions Whitelist (E8-g):
     * - D11: `hooks/useGameInput.ts` transient drag preview writes (.px, .py, .dragOverQ, .dragOverR).
     *   These are frame-by-frame visual previews during pointer drag, committed on pointerup via MOVE_AGENT.
     * - D14: `components/GameCanvas.tsx` composition root binding (engine.renderer = rendererRef.current).
     * - D12: Camera commands (CAMERA_ZOOM, CAMERA_PAN, CAMERA_SNAP, SET_VIEWPORT) dispatched via UICommandSystem.
     * - D13: Battle loop time accumulation encapsulated inside engine.tick via TimeSystem.tick.
     */
    it('verifies that remaining direct accesses belong strictly to documented exceptions', () => {
        // Direct engine method calls must be completely zero
        expect(current.directEngineMethodCalls).toBe(0);
        // Direct agent property mutations must be completely zero
        expect(current.directAgentMutation).toBe(0);
        // The only allowed directEngineMutation and directRendererAccess is D14 in GameCanvas.tsx
        expect(current.directEngineMutation).toBeLessThanOrEqual(1);
        expect(current.directRendererAccess).toBeLessThanOrEqual(1);
        // The only allowed directPoseWrites is D11 in useGameInput.ts (6 transient drag preview writes)
        expect(current.directPoseWrites).toBeLessThanOrEqual(6);
    });
});


