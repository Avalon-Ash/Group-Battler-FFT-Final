import type { PartKind, PartSpec } from '../../../engine/renderers/vfxparts/PartSpec';

/**
 * 特效展示庫（VFXMapTab）的零件圖鑑：每種零件一個代表規格，縮圖由 vfxPartStore 實際烘焙（與遊戲內同一份）。
 * 新增零件種類時在這裡補一筆（tests/VFXLibrary.test.ts 檢查每個 PartKind 都有）。
 */
export interface PartGalleryEntry {
    kind: PartKind;
    name: string;
    desc: string;
    spec: PartSpec;
}

export const PART_GALLERY: readonly PartGalleryEntry[] = [
    { kind: 'glow', name: '光暈', desc: '柔邊光球；hard 為硬芯版（光點、火花）。', spec: { kind: 'glow', radius: 32, ramp: 'LION_HOLY' } },
    { kind: 'ring', name: '六角環', desc: '光暈→主色→核心三層；roughness 為灰燼缺口，soft 為逐格鋪開的柔光版。', spec: { kind: 'ring', radius: 32, thickness: 5, ramp: 'LION_ARCANE' } },
    { kind: 'slashArc', name: '斬擊弧', desc: '刀光弧，尾端漸細。', spec: { kind: 'slashArc', radius: 36, arcDeg: 140, thickness: 10, ramp: 'ASH_BLOOD' } },
    { kind: 'rays', name: '放射線', desc: '爆點的星芒放射。', spec: { kind: 'rays', radius: 34, count: 10, ramp: 'LION_HOLY' } },
    { kind: 'bolt', name: '閃電', desc: '分岔電弧，每格影格重新抖動。', spec: { kind: 'bolt', length: 64, branches: 2, ramp: 'LION_LIGHTNING' } },
    { kind: 'flame', name: '火焰', desc: '循環火舌；jagged 為灰燼鋸齒版。', spec: { kind: 'flame', height: 56, ramp: 'ASH_FIRE' } },
    { kind: 'smoke', name: '煙塵', desc: '一般混合的團塊煙（實體物質色）。', spec: { kind: 'smoke', radius: 28, color: 'ASH', roughness: 0.6 } },
    { kind: 'shard', name: '碎片', desc: '水晶／六角／岩石／骨片。', spec: { kind: 'shard', size: 18, shape: 'crystal', ramp: 'LION_ICE' } },
    { kind: 'sigil', name: '紋章', desc: '技能地面紋章（太陽八芒星、獅盾、角顱、倒三角）。', spec: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' } },
    { kind: 'magicCircle', name: '詠唱法陣', desc: '透光圓盤＋雙環＋符文帶（外層）；內層為星形，兩層反向慢轉。', spec: { kind: 'magicCircle', radius: 40, ramp: 'LION_ARCANE', layer: 'outer', style: 'LION', seed: 1 } },
    { kind: 'pillar', name: '光柱', desc: '六角稜柱光柱，左右側面分亮暗。', spec: { kind: 'pillar', width: 18, height: 72, ramp: 'LION_HOLY' } },
    { kind: 'spark', name: '火花', desc: '細長流星狀火花。', spec: { kind: 'spark', length: 24, ramp: 'ASH_FIRE' } },
    { kind: 'droplet', name: '液滴', desc: '血、毒液等液滴。', spec: { kind: 'droplet', size: 14, ramp: 'ASH_BLOOD' } },
    { kind: 'beam', name: '光束段', desc: '光束本體（clean／dashed／zigzag／beads 四種邊）。', spec: { kind: 'beam', width: 16, ramp: 'LION_ARCANE', edge: 'clean' } },
    { kind: 'missile', name: '投射物', desc: '箭、弩矢、法球、飛斧、炸彈、鉤爪。', spec: { kind: 'missile', shape: 'orb', length: 28, ramp: 'ASH_VOID' } },
    { kind: 'prism', name: '稜柱', desc: '護盾稜柱（glass）與實心稜柱；投影烘在 sprite 裡。', spec: { kind: 'prism', radius: 26, height: 40, ramp: 'LION_ARCANE', style: 'glass' } },
    { kind: 'spiral', name: '螺旋吸積帶', desc: '彎曲光帶繞圈收進中心，越往內越細越亮（向心壓縮）；給負 vRotation 往內流。', spec: { kind: 'spiral', radius: 40, arms: 3, turns: 0.75, thickness: 10, ramp: 'LION_VOID' } },
    { kind: 'construct', name: '魔法構造體', desc: '奧義主體（獅翼聖劍等）：有體積的半透明能量體，受光面亮、背光面較透，帶外暈與亮邊。', spec: { kind: 'construct', shape: 'greatsword', size: 64, ramp: 'LION_HOLY' } },
];
