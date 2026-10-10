import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Role, Team } from '../types';
import { Agent } from '../engine/core/Agent';
import { selectAgentView, clearSelectorCache } from '../engine/systems/ui/selectors';
import * as fs from 'fs';
import * as path from 'path';

describe('E6: Inspector Command Isolation', () => {
    let engine: GameEngine;
    let agent: Agent;

    beforeEach(() => {
        clearSelectorCache();
        engine = new GameEngine();
        agent = new Agent('agent_e6_1', Team.BLUE, 0, 0, engine.mapConfig);
        agent.role = Role.WARRIOR;
        agent.maxHp = 1000;
        agent.hp = 1000;
        agent.maxMp = 100;
        agent.mp = 50;
        engine.agents = [agent];
    });

    it('updates role and vitals via EDIT_AGENT command and synchronizes with selectAgentView', () => {
        const viewBefore = selectAgentView(engine, agent.id);
        expect(viewBefore).not.toBeNull();
        expect(viewBefore?.role).toBe(Role.WARRIOR);
        expect(viewBefore?.maxHp).toBe(1000);

        engine.bus.emit('UI_COMMAND', {
            type: 'EDIT_AGENT',
            agentId: agent.id,
            role: Role.MAGE,
            maxHp: 800,
            hp: 600,
            maxMp: 250,
        });

        expect(agent.role).toBe(Role.MAGE);
        expect(agent.maxHp).toBe(800);
        expect(agent.hp).toBe(600);
        expect(agent.maxMp).toBe(250);

        const viewAfter = selectAgentView(engine, agent.id);
        expect(viewAfter).not.toBeNull();
        expect(viewAfter?.role).toBe(Role.MAGE);
        expect(viewAfter?.maxHp).toBe(800);
        expect(viewAfter?.hp).toBe(600);
        expect(viewAfter?.maxMp).toBe(250);
    });

    it('triggers AI reconstruction and emits AGENT_RESET on REBUILD_AGENT_AI', () => {
        let resetReceived: string | null = null;
        engine.bus.on('AGENT_RESET', (data) => {
            resetReceived = data.agentId;
        });

        agent.bt = null as unknown as typeof agent.bt;

        engine.bus.emit('UI_COMMAND', {
            type: 'REBUILD_AGENT_AI',
            agentId: agent.id,
        });

        expect(agent.bt).toBeDefined();
        expect(resetReceived).toBe(agent.id);
    });

    it('verifies UnitInspectorHUD and BehaviorTreeTab contain 0 direct agent assignments', () => {
        const hudPath = path.resolve(__dirname, '../components/ui/UnitInspectorHUD.tsx');
        const tabPath = path.resolve(__dirname, '../components/inspector/tabs/BehaviorTreeTab.tsx');

        const hudContent = fs.readFileSync(hudPath, 'utf8');
        const tabContent = fs.readFileSync(tabPath, 'utf8');

        const regex = /agent\.\w+\s*=[^=]/g;

        const hudMatches = hudContent.match(regex) || [];
        const tabMatches = tabContent.match(regex) || [];

        expect(hudMatches, `Found direct agent mutations in UnitInspectorHUD: ${hudMatches.join(', ')}`).toHaveLength(0);
        expect(tabMatches, `Found direct agent mutations in BehaviorTreeTab: ${tabMatches.join(', ')}`).toHaveLength(0);
    });
});
