import { MaterialPainter } from '../engine/graphics/materials/MaterialPainter';
import { MATERIAL_CONFIG } from '../data/vfx/materialConfig';
import { GroundPainter } from '../engine/systems/vfx/renderers/painters/GroundPainter';
import type { Particle } from '../engine/systems/vfx/state';

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

function render(now: number) {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, c.width, c.height);

    MATERIAL_CONFIG.enabled = true;
    cell(110, 90, 'ICE (new)', () => GroundPainter.drawIceField(ctx, mkP({ visualStyle: 'ICE' }), 0.2, 'FLAT'));
    cell(300, 90, 'SCORCH (new)', () => GroundPainter.drawFireField(ctx, mkP({ visualStyle: 'FIRE', color: '#ea580c' }), 0.2, 'FLAT'));
    MATERIAL_CONFIG.enabled = false;
    cell(490, 90, 'ICE (legacy)', () => GroundPainter.drawIceField(ctx, mkP({ visualStyle: 'ICE' }), 0.2, 'FLAT'));
    cell(680, 90, 'SCORCH (legacy)', () => GroundPainter.drawFireField(ctx, mkP({ visualStyle: 'FIRE', color: '#ea580c' }), 0.2, 'FLAT'));
    MATERIAL_CONFIG.enabled = true;

    cell(140, 250, 'RIBBON lightning', () => MaterialPainter.drawRibbon(ctx, 260, 40, '#a5b4fc', 99, 1));
    cell(140, 400, 'LAYERED beam', () => MaterialPainter.drawLayeredBeam(ctx, 300, 14, '#f0abfc', now));
    cell(620, 250, 'RIBBON thin', () => MaterialPainter.drawRibbon(ctx, 300, -30, '#7dd3fc', 4242, 0.6));
    cell(620, 400, 'LAYERED beam narrow', () => MaterialPainter.drawLayeredBeam(ctx, 300, 6, '#fde047', now + 0.3));
}
render(0);
let t = 0;
setInterval(() => { t += 0.05; render(t); }, 60);
