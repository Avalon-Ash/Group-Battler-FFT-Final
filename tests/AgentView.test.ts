// ╔══════════════════════════════════════════════════════════╗
// ║  AgentView — 視覺欄位分組守門測試（PL4）                  ║
// ║  職責：確保視覺狀態收束在 agent.view，且模擬層不可直寫     ║
// ║  規則：docs/archive/PRESENTATION_LAYER_AGENT_PROMPT.md §PL4       ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Agent } from '../engine/core/Agent';
import { Team, Role } from '../types';
import { DEFAULT_HEX_LAYOUT } from '../constants';

const ROOT = path.resolve(__dirname, '..');

const SIM_PATHS = [
    'engine/systems',
    'engine/ai',
    'engine/physics',
    'engine/core',
    'engine/events',
    'engine/math',
    'engine/types',
    'engine/behaviorTree.ts',
    'engine/utils.ts',
];

const EXCLUDE_PREFIXES = [
    'engine/systems/audio',
];

function listTsFiles(relPath: string): string[] {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) return [];
    if (fs.statSync(abs).isFile()) {
        return relPath.endsWith('.ts') ? [relPath.replace(/\\/g, '/')] : [];
    }
    const out: string[] = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const childRel = `${relPath}/${entry.name}`.replace(/\\/g, '/');
        if (entry.isDirectory()) {
            if (!EXCLUDE_PREFIXES.some(e => childRel === e || childRel.startsWith(e + '/'))) {
                out.push(...listTsFiles(childRel));
            }
        } else if (entry.name.endsWith('.ts')) {
            out.push(childRel);
        }
    }
    return out;
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('AgentView contract (PL4)', () => {
    it('agent.reset() resets all view fields to defaults', () => {
        const mapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };
        const agent = new Agent('test', Team.BLUE, 0, 0, mapConfig);
        // Mutate view fields
        agent.view.visualStatus = 'FROZEN';
        agent.view.hitFlashTimer = 0.15;
        agent.view.visualOffset = { x: 3.5, y: -2.1 };

        agent.reset(mapConfig);

        expect(agent.view.visualStatus).toBe('NONE');
        expect(agent.view.hitFlashTimer).toBe(0);
        expect(agent.view.visualOffset).toEqual({ x: 0, y: 0 });
    });

    it('view fields (visualStatus, hitFlashTimer, visualOffset) in simulation ONLY appear in ViewCommands.ts', () => {
        const simFiles = SIM_PATHS.flatMap(listTsFiles);
        const VIEW_FIELD_RE = /\b(visualStatus|hitFlashTimer|visualOffset)\b/g;

        const filesWithViewFields: string[] = [];

        for (const file of simFiles) {
            const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
            const code = stripComments(raw);
            VIEW_FIELD_RE.lastIndex = 0;
            if (VIEW_FIELD_RE.test(code)) {
                filesWithViewFields.push(file);
            }
        }

        expect(filesWithViewFields).toEqual(['engine/core/ViewCommands.ts']);
    });
});
