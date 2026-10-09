import { MaterialPainter } from '../engine/graphics/materials/MaterialPainter';
import { MATERIAL_CONFIG } from '../data/vfx/materialConfig';
import { GroundPainter } from '../engine/systems/vfx/renderers/painters/GroundPainter';
import type { Particle } from '../engine/systems/vfx/state';
import { TerrainRenderer } from '../engine/renderers/grid/TerrainRenderer';
import { EnvironmentFactory } from '../engine/graphics/EnvironmentFactory';
import { TERRAIN_THEMES } from '../constants';
import { ImperialTokenFactory } from '../engine/graphics/units/ImperialTokenFactory';
import { CovenantTokenFactory } from '../engine/graphics/units/CovenantTokenFactory';
import { ImperialRenderer } from '../engine/renderers/units/factions/ImperialRenderer';
import { CovenantRenderer } from '../engine/renderers/units/factions/CovenantRenderer';
import { Role, Team } from '../types';
import { Agent } from '../engine/core/Agent';

const c = document.getElementById('c') as HTMLCanvasElement;
const ctx = c.getContext('2d')!;
const label = (t: string, x: number, y: number) => {
    ctx.save(); ctx.resetTransform(); ctx.fillStyle = '#94a3b8'; ctx.font = '13px system-ui';
    ctx.fillText(t, x, y); ctx.restore();
};
const mkP = (over: Partial<Particle>): Particle => ({
    active: true, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rotation: 0, vRotation: 0,
    life: 1, maxLife: 1, color: '#7dd3fc', size: 60, type: 'GRID_FIELD', ...over,
} as Particle);

function cell(cx: number, cy: number, name: string, draw: () => void) {
    ctx.save(); ctx.translate(cx, cy); draw(); ctx.restore();
    label(name, cx - 60, cy + 90);
}

// 預先生成靜態 Token A-B（避免 60fps 迴圈內重複分配 Canvas）
MATERIAL_CONFIG.enabled = true;
const impTokenNew = ImperialTokenFactory.generateBase(Role.WARRIOR);
const covTokenNew = CovenantTokenFactory.generateBase(Role.WARRIOR);
MATERIAL_CONFIG.enabled = false;
const impTokenLegacy = ImperialTokenFactory.generateBase(Role.WARRIOR);
const covTokenLegacy = CovenantTokenFactory.generateBase(Role.WARRIOR);
MATERIAL_CONFIG.enabled = true;

// 預先生成展示 Agent 實體
const mapCfg = { hexRadius: 48, layout: 'FLAT' as const, w: 10, h: 10, offsetX: 0, offsetY: 0 };
const impWarrior = new Agent('imp-w', Team.BLUE, 0, 0, mapCfg);
impWarrior.role = Role.WARRIOR;
const impTank = new Agent('imp-t', Team.BLUE, 0, 0, mapCfg);
impTank.role = Role.TANK;
const covWarrior = new Agent('cov-w', Team.RED, 0, 0, mapCfg);
covWarrior.role = Role.WARRIOR;
const covMage = new Agent('cov-m', Team.RED, 0, 0, mapCfg);
covMage.role = Role.MAGE;

function render(now: number) {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, c.width, c.height);

    // ---- Row 1: 冰火地面 A-B ----
    MATERIAL_CONFIG.enabled = true;
    cell(110, 90, 'ICE (new)', () => GroundPainter.drawIceField(ctx, mkP({ visualStyle: 'ICE' }), 0.2, 'FLAT'));
    cell(300, 90, 'SCORCH (new)', () => GroundPainter.drawFireField(ctx, mkP({ visualStyle: 'FIRE', color: '#ea580c' }), 0.2, 'FLAT'));
    MATERIAL_CONFIG.enabled = false;
    cell(490, 90, 'ICE (legacy)', () => GroundPainter.drawIceField(ctx, mkP({ visualStyle: 'ICE' }), 0.2, 'FLAT'));
    cell(680, 90, 'SCORCH (legacy)', () => GroundPainter.drawFireField(ctx, mkP({ visualStyle: 'FIRE', color: '#ea580c' }), 0.2, 'FLAT'));
    MATERIAL_CONFIG.enabled = true;

    // ---- Row 2: 射束與閃電 ----
    cell(140, 250, 'RIBBON lightning', () => MaterialPainter.drawRibbon(ctx, 260, 40, '#a5b4fc', 99, 1));
    cell(140, 400, 'LAYERED beam', () => MaterialPainter.drawLayeredBeam(ctx, 300, 14, '#f0abfc', now));
    cell(620, 250, 'RIBBON thin', () => MaterialPainter.drawRibbon(ctx, 300, -30, '#7dd3fc', 4242, 0.6));
    cell(620, 400, 'LAYERED beam narrow', () => MaterialPainter.drawLayeredBeam(ctx, 300, 6, '#fde047', now + 0.3));

    // ---- Row 3 & 4: 地形頂面 / 側面材質 A-B ----
    const themes: Array<[string, string]> = [['FOREST', 'FOREST'], ['ICE', 'ICE'], ['DESERT', 'DESERT'], ['MAGMA', 'MAGMA']];
    themes.forEach(([key, type], i) => {
        const theme = TERRAIN_THEMES[key] || TERRAIN_THEMES['VOID'];
        const x = 110 + i * 190;
        MATERIAL_CONFIG.enabled = true;
        cell(x, 580, `${key} (new)`, () => TerrainRenderer.drawBlock(ctx, 0, 0, 46, 24, theme, type, now, 'FLAT', 1, i * 3 + 1, i + 2));
        MATERIAL_CONFIG.enabled = false;
        cell(x, 720, `${key} (legacy)`, () => TerrainRenderer.drawBlock(ctx, 0, 0, 46, 24, theme, type, now, 'FLAT', 1, 0, 0));
        MATERIAL_CONFIG.enabled = true;
    });

    // ---- Row 5 & 6: 障礙物 sprite A-B ----
    const obstacles = ['TREE', 'ICE_CRYSTAL', 'OBSIDIAN_PILLAR', 'SANDSTONE'];
    obstacles.forEach((key, i) => {
        const x = 110 + i * 190;
        MATERIAL_CONFIG.enabled = true;
        const withGrain = EnvironmentFactory.generateObstacle(key, 'FLAT');
        MATERIAL_CONFIG.enabled = false;
        const plain = EnvironmentFactory.generateObstacle(key, 'FLAT');
        MATERIAL_CONFIG.enabled = true;
        cell(x, 960, `${key} (new)`, () => ctx.drawImage(withGrain, -70, -110, 140, 190));
        cell(x, 1150, `${key} (legacy)`, () => ctx.drawImage(plain, -70, -110, 140, 190));
    });

    // ---- Row 7: POISON / VOID 地面危機 A-B ----
    MATERIAL_CONFIG.enabled = true;
    cell(110, 1340, 'POISON (new)', () => GroundPainter.drawPoisonField(ctx, mkP({ visualStyle: 'POISON', color: '#10b981' }), 0.2, 'FLAT'));
    cell(300, 1340, 'VOID (new)', () => GroundPainter.drawVoidField(ctx, mkP({ visualStyle: 'VOID', color: '#a855f7' }), 0.2, 'FLAT'));
    MATERIAL_CONFIG.enabled = false;
    cell(490, 1340, 'POISON (legacy)', () => GroundPainter.drawPoisonField(ctx, mkP({ visualStyle: 'POISON', color: '#10b981' }), 0.2, 'FLAT'));
    cell(680, 1340, 'VOID (legacy)', () => GroundPainter.drawVoidField(ctx, mkP({ visualStyle: 'VOID', color: '#a855f7' }), 0.2, 'FLAT'));
    MATERIAL_CONFIG.enabled = true;

    // ---- Row 8: 單位 Token 風化與立體高光 A-B ----
    cell(110, 1520, 'IMP Token (new)', () => ctx.drawImage(impTokenNew, -50, -50, 100, 100));
    cell(300, 1520, 'COV Token (new)', () => ctx.drawImage(covTokenNew, -50, -50, 100, 100));
    cell(490, 1520, 'IMP Token (legacy)', () => ctx.drawImage(impTokenLegacy, -50, -50, 100, 100));
    cell(680, 1520, 'COV Token (legacy)', () => ctx.drawImage(covTokenLegacy, -50, -50, 100, 100));

    // ---- Row 9 & 10: 角色本體甲胄微顆粒與反射光 A-B ----
    MATERIAL_CONFIG.enabled = true;
    cell(110, 1720, 'IMP Warrior (new)', () => ImperialRenderer.draw(ctx, impWarrior, now, false));
    cell(300, 1720, 'IMP Tank (new)', () => ImperialRenderer.draw(ctx, impTank, now, false));
    cell(490, 1720, 'COV Warrior (new)', () => CovenantRenderer.draw(ctx, covWarrior, now, false));
    cell(680, 1720, 'COV Mage (new)', () => CovenantRenderer.draw(ctx, covMage, now, false));

    MATERIAL_CONFIG.enabled = false;
    cell(110, 1900, 'IMP Warrior (legacy)', () => ImperialRenderer.draw(ctx, impWarrior, now, false));
    cell(300, 1900, 'IMP Tank (legacy)', () => ImperialRenderer.draw(ctx, impTank, now, false));
    cell(490, 1900, 'COV Warrior (legacy)', () => CovenantRenderer.draw(ctx, covWarrior, now, false));
    cell(680, 1900, 'COV Mage (legacy)', () => CovenantRenderer.draw(ctx, covMage, now, false));
    MATERIAL_CONFIG.enabled = true;
}

render(0);
let t = 0;
setInterval(() => { t += 0.05; render(t); }, 60);
