// 特效零件總表（V1）：每列一種零件，獅心／灰燼各一組參數；動畫零件列出全部影格。
// 開啟：npm run dev 後到 /tools/vfx/parts-preview.html（?gray=1 看灰階、?tier=0..3 看品質階層）
import { createVFXPartStore, drawPart } from '../../engine/renderers/vfxparts/VFXPartStore';
import type { PartSpec } from '../../engine/renderers/vfxparts/PartSpec';

const params = new URLSearchParams(location.search);
if (params.has('gray')) document.body.classList.add('gray');
const tier = Number(params.get('tier') ?? 0);
const store = createVFXPartStore(undefined, () => tier);

type Row = { label: string; specs: Array<{ name: string; spec: PartSpec; rot?: number }> };
const rows: Row[] = [
    { label: 'glow', specs: [
        { name: 'LION_HOLY', spec: { kind: 'glow', radius: 40, ramp: 'LION_HOLY' } },
        { name: 'LION_ARCANE hard', spec: { kind: 'glow', radius: 40, ramp: 'LION_ARCANE', hard: true } },
        { name: 'ASH_FIRE', spec: { kind: 'glow', radius: 40, ramp: 'ASH_FIRE' } },
        { name: 'ASH_VOID', spec: { kind: 'glow', radius: 40, ramp: 'ASH_VOID' } },
    ] },
    { label: 'ring', specs: [
        { name: 'LION_HOLY clean', spec: { kind: 'ring', radius: 40, thickness: 8, ramp: 'LION_HOLY' } },
        { name: 'LION_ICE', spec: { kind: 'ring', radius: 40, thickness: 6, ramp: 'LION_ICE' } },
        { name: 'ASH_FIRE rough .5', spec: { kind: 'ring', radius: 40, thickness: 8, ramp: 'ASH_FIRE', roughness: 0.5, seed: 1 } },
        { name: 'ASH_PHYSICAL rough 1', spec: { kind: 'ring', radius: 40, thickness: 12, ramp: 'ASH_PHYSICAL', roughness: 1, seed: 2 } },
    ] },
    { label: 'slashArc', specs: [
        { name: 'LION_PHYSICAL 120', spec: { kind: 'slashArc', radius: 44, arcDeg: 120, thickness: 12, ramp: 'LION_PHYSICAL' }, rot: -0.5 },
        { name: 'LION_HOLY 180', spec: { kind: 'slashArc', radius: 44, arcDeg: 180, thickness: 12, ramp: 'LION_HOLY' } },
        { name: 'ASH_BLOOD 150', spec: { kind: 'slashArc', radius: 44, arcDeg: 150, thickness: 16, ramp: 'ASH_BLOOD' }, rot: 0.4 },
        { name: 'ASH_FIRE 90', spec: { kind: 'slashArc', radius: 44, arcDeg: 90, thickness: 16, ramp: 'ASH_FIRE' } },
    ] },
    { label: 'rays', specs: [
        { name: 'LION_HOLY 12 sun', spec: { kind: 'rays', radius: 46, count: 12, ramp: 'LION_HOLY', lengthJitter: 0.5 } },
        { name: 'LION_LIGHTNING 8', spec: { kind: 'rays', radius: 46, count: 8, ramp: 'LION_LIGHTNING' } },
        { name: 'ASH_FIRE 9 jitter', spec: { kind: 'rays', radius: 46, count: 9, ramp: 'ASH_FIRE', lengthJitter: 1, seed: 3 } },
        { name: 'ASH_VOID 7 jitter', spec: { kind: 'rays', radius: 46, count: 7, ramp: 'ASH_VOID', lengthJitter: 1, seed: 1 } },
    ] },
    { label: 'sigil', specs: [
        { name: 'sun LION_HOLY', spec: { kind: 'sigil', radius: 46, emblem: 'sun', ramp: 'LION_HOLY' } },
        { name: 'lionShield LION_ARCANE', spec: { kind: 'sigil', radius: 46, emblem: 'lionShield', ramp: 'LION_ARCANE' } },
        { name: 'hornSkull ASH_FIRE', spec: { kind: 'sigil', radius: 46, emblem: 'hornSkull', ramp: 'ASH_FIRE' } },
        { name: 'invTriangle ASH_VOID', spec: { kind: 'sigil', radius: 46, emblem: 'invTriangle', ramp: 'ASH_VOID' } },
    ] },
    { label: 'pillar / spark / droplet', specs: [
        { name: 'pillar LION_HOLY', spec: { kind: 'pillar', width: 32, height: 96, ramp: 'LION_HOLY' } },
        { name: 'pillar ASH_VOID', spec: { kind: 'pillar', width: 32, height: 96, ramp: 'ASH_VOID' } },
        { name: 'spark LION_LIGHTNING', spec: { kind: 'spark', length: 48, ramp: 'LION_LIGHTNING' }, rot: -0.6 },
        { name: 'droplet ASH_BLOOD', spec: { kind: 'droplet', size: 16, ramp: 'ASH_BLOOD' } },
    ] },
    { label: 'smoke / shard', specs: [
        { name: 'smoke ASH', spec: { kind: 'smoke', radius: 32, color: 'ASH', roughness: 1, seed: 1 } },
        { name: 'smoke DUST', spec: { kind: 'smoke', radius: 32, color: 'DUST', roughness: 0.5, seed: 2 } },
        { name: 'shard crystal LION_ICE', spec: { kind: 'shard', size: 16, shape: 'crystal', ramp: 'LION_ICE' } },
        { name: 'shard rock + bone ASH_PHYSICAL', spec: { kind: 'shard', size: 16, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 1 } },
    ] },
    { label: 'hex shard', specs: [
        { name: 'hex LION_HOLY', spec: { kind: 'shard', size: 12, shape: 'hex', ramp: 'LION_HOLY' } },
        { name: 'hex LION_ARCANE', spec: { kind: 'shard', size: 12, shape: 'hex', ramp: 'LION_ARCANE' } },
        { name: 'hex ASH_FIRE', spec: { kind: 'shard', size: 12, shape: 'hex', ramp: 'ASH_FIRE' } },
        { name: 'hex ASH_VOID', spec: { kind: 'shard', size: 12, shape: 'hex', ramp: 'ASH_VOID' } },
    ] },
    { label: 'ult construct / spiral', specs: [
        { name: 'greatsword LION_HOLY', spec: { kind: 'construct', shape: 'greatsword', size: 96, ramp: 'LION_HOLY' } },
        { name: 'singularity ASH_VOID', spec: { kind: 'construct', shape: 'singularity', size: 96, ramp: 'ASH_VOID' } },
        { name: 'spiral LION_VOID 3 arms', spec: { kind: 'spiral', radius: 64, arms: 3, turns: 0.75, thickness: 12, ramp: 'LION_VOID' } },
        { name: 'spiral LION_VOID 4 arms', spec: { kind: 'spiral', radius: 48, arms: 4, turns: 1, thickness: 8, ramp: 'LION_VOID' } },
    ] },
    { label: 'ult construct (red)', specs: [
        { name: 'warhead ASH_FIRE', spec: { kind: 'construct', shape: 'warhead', size: 80, ramp: 'ASH_FIRE' } },
        { name: 'eclipse ASH_BLOOD', spec: { kind: 'construct', shape: 'eclipse', size: 96, ramp: 'ASH_BLOOD' } },
        { name: 'bladeWheel LION_PHYSICAL', spec: { kind: 'construct', shape: 'bladeWheel', size: 112, ramp: 'LION_PHYSICAL' } },
    ] },
    { label: 'ult construct (tank)', specs: [
        { name: 'towerShield LION_HOLY', spec: { kind: 'construct', shape: 'towerShield', size: 112, ramp: 'LION_HOLY' } },
        { name: 'crown LION_HOLY', spec: { kind: 'construct', shape: 'crown', size: 96, ramp: 'LION_HOLY' } },
        { name: 'fist LION_HOLY', spec: { kind: 'construct', shape: 'fist', size: 112, ramp: 'LION_HOLY' } },
        { name: 'guillotine ASH_BLOOD', spec: { kind: 'construct', shape: 'guillotine', size: 96, ramp: 'ASH_BLOOD' } },
    ] },
    { label: 'ult construct (red tank)', specs: [
        { name: 'ribSpike ASH_BLOOD', spec: { kind: 'construct', shape: 'ribSpike', size: 96, ramp: 'ASH_BLOOD' } },
        { name: 'ribSpike ASH_PHYSICAL', spec: { kind: 'construct', shape: 'ribSpike', size: 64, ramp: 'ASH_PHYSICAL' } },
        { name: 'eye ASH_VOID', spec: { kind: 'construct', shape: 'eye', size: 96, ramp: 'ASH_VOID' } },
        { name: 'arrow LION_LIGHTNING', spec: { kind: 'construct', shape: 'arrow', size: 120, ramp: 'LION_LIGHTNING' } },
    ] },
    { label: 'ult construct (red warrior)', specs: [
        { name: 'demonWings ASH_BLOOD', spec: { kind: 'construct', shape: 'demonWings', size: 160, ramp: 'ASH_BLOOD' } },
    ] },
];
const anim: Array<{ name: string; spec: PartSpec }> = [
    { name: 'flame ASH_FIRE jagged', spec: { kind: 'flame', height: 64, ramp: 'ASH_FIRE', jagged: true } },
    { name: 'flame LION_HOLY', spec: { kind: 'flame', height: 64, ramp: 'LION_HOLY' } },
    { name: 'bolt LION_LIGHTNING', spec: { kind: 'bolt', length: 96, branches: 3, ramp: 'LION_LIGHTNING', seed: 1 } },
];

const CELL_W = 220, CELL_H = 150, LABEL_W = 150, ANIM_W = 110;
const canvas = document.getElementById('sheet') as HTMLCanvasElement;
canvas.width = LABEL_W + Math.max(4 * CELL_W, 8 * ANIM_W);
canvas.height = 30 + (rows.length + anim.length) * CELL_H;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);

const label = (t: string, x: number, y: number) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(t, x, y);
};
label(`VFX parts sheet - tier ${tier}`, 8, 16);
rows.forEach((row, ri) => {
    const y0 = 30 + ri * CELL_H;
    label(row.label, 8, y0 + CELL_H / 2);
    row.specs.forEach((s, ci) => {
        const cx = LABEL_W + ci * CELL_W + CELL_W / 2;
        const cy = y0 + CELL_H / 2 + (s.spec.kind === 'pillar' ? 50 : 0);
        drawPart(ctx, store.get(s.spec), s.name.includes('bone') ? cx - 25 : cx, cy, { rotation: s.rot });
        if (s.name.includes('bone')) drawPart(ctx, store.get({ kind: 'shard', size: 16, shape: 'bone', ramp: 'ASH_PHYSICAL' }), cx + 30, cy, { rotation: 0.5 });
        label(s.name, LABEL_W + ci * CELL_W + 6, y0 + CELL_H - 6);
    });
});
anim.forEach((a, ai) => {
    const y0 = 30 + (rows.length + ai) * CELL_H;
    const sprite = store.get(a.spec);
    label(`${a.name} (${sprite.frames.length}f)`, 8, y0 + CELL_H / 2);
    for (let f = 0; f < sprite.frames.length; f++) {
        drawPart(ctx, sprite, LABEL_W + f * ANIM_W + ANIM_W / 2, y0 + CELL_H - 20, { frame: f });
    }
});
(window as unknown as { __PARTS_READY__: unknown }).__PARTS_READY__ = { ...store.stats(), size: store.size() };
