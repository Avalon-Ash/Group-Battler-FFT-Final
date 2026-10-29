// ╔══════════════════════════════════════════════════════════╗
// ║  status_parts — 狀態／控制效果的六角零件版視覺表（SSOT）   ║
// ║  職責：每個 STATUS_VISUALS 鍵用哪些零件、掛在哪個錨點、怎麼動，║
// ║        以及狀態圖示列（HUD）用的小圖示零件與分類            ║
// ║  [ARCH] 錨點定義見 engine/renderers/RenderSpec.ts §4：       ║
// ║  GROUND＝腳下（UnitFrame.floorY − physics.z）、              ║
// ║  BODY＝投影中心、HEAD＝頭頂 + HEAD_MARGIN。座標一律讀       ║
// ║  UnitFrame，這裡只有相對偏移（px，canvas 單位）。            ║
// ║  疊加規則（StatusPartPainter 實作）：頭頂標記（HEAD 層）與   ║
// ║  腳下圈（flat 的 GROUND 層）每個單位各只畫優先序最高的那一個  ║
// ║  狀態；其餘狀態只留身上（BODY／立體 GROUND）的小零件；全部    ║
// ║  狀態另由圖示列列出。配色依控制種類（MMO／FFT 慣例），用       ║
// ║  vfxPalette 的 STATUS_* 色帶，不借陣營色帶（LION_／ASH_）。   ║
// ╚══════════════════════════════════════════════════════════╝

import type { PartLayer } from './parts/partLayer';
import type { PartSpec } from '../../engine/renderers/vfxparts/PartSpec';

export type StatusAnchor = 'GROUND' | 'BODY' | 'HEAD';

/** 狀態零件層＝共用零件層（data/vfx/parts/partLayer.ts）＋掛在單位的哪個錨點 */
export interface StatusPartLayer extends PartLayer {
    anchor: StatusAnchor;
}

/** 圖示列的小圖示：一到兩個零件疊在圓底上（rotation 弧度、scale 相對零件原尺寸的倍率） */
interface StatusIconPart {
    spec: PartSpec;
    rotation?: number;
    scale?: number;
}

/**
 * 狀態分類：HARD_CC＝硬控（吃遞減、要一眼認出）、DEBUFF＝其他減益（致盲、緩速、易傷、燃燒、中毒）、BUFF＝增益、
 * STATE＝施法／AI 提示（不進圖示列）、EVENT＝一次性事件或退路（沒有常駐狀態）。
 */
type StatusCategory = 'HARD_CC' | 'DEBUFF' | 'BUFF' | 'STATE' | 'EVENT';

export interface StatusPartSet {
    /** 數字越大越優先：同一單位的頭頂標記與腳下圈由優先序最高者獨占，同時畫的狀態組數也以此截斷 */
    priority: number;
    category: StatusCategory;
    /** 圖示列的圖示（有 icon 的狀態都會列在圖示列：減益在左、增益在右） */
    icon?: readonly StatusIconPart[];
    layers: readonly StatusPartLayer[];
    /** 沒有自己的零件層時，說明由誰負責（護盾幾何貼合、一次性事件、文字） */
    handledBy?: string;
    /** 沿用另一個狀態的層（該狀態本身成立時不重複畫） */
    alias?: StatusPartKey;
    note?: string;
}

export const STATUS_PART_KEYS = [
    'STUN', 'SILENCE', 'BANISH', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'SHIELD', 'POISON', 'BURN', 'IMMUNE',
    'KNOCKBACK', 'PULL', 'REGEN', 'POLYMORPH', 'FROZEN', 'STASIS', 'VULNERABLE', 'HASTE', 'REFLECT', 'LIFESTEAL', 'SLOW',
    'CAST_ULT', 'CAST_ACTIVE', 'CC_INTERRUPT', 'EVADING', 'INVINCIBLE', 'DEFAULT',
] as const;
export type StatusPartKey = typeof STATUS_PART_KEYS[number];

/** 繪製參數（不是零件外形）。 */
export const STATUS_PART_RENDER = {
    /** 頭頂標記中心離頭頂的間距（px）。血條在頭頂之上 HUD_ANCHOR.barHeadMargin，標記要擠在頭與血條之間（暈眩星繞頭，FFT 式），所以間距很小 */
    HEAD_MARGIN: 4,
    /** 腳下層相對腳底繪製 Y 的偏移（px，正為往下） */
    GROUND_BIAS: 0,
    /** 貼地零件的半徑上限（px）：狀態在總覽層（單位之後）繪製，不做鋪設，所以必須待在腳下那格內 */
    GROUND_MAX_RADIUS: 32,
    /** 同一單位同時繪製的狀態組數上限，依品質階層 [0..3] */
    MAX_SETS_BY_TIER: [3, 3, 2, 1] as const,
    /** 品質階層 ≥ 此值時略過 decor 層 */
    DECOR_CUT_TIER: 2,
} as const;

export const STATUS_PARTS: Record<StatusPartKey, StatusPartSet> = {
    // ── 硬控：各有獨立剪影與色相（MMO／FFT 慣例）──────────────────────────
    /** 暈眩（金黃）：頭上繞行的三顆六角星（經典「轉圈圈」） */
    STUN: {
        priority: 90, category: 'HARD_CC',
        icon: [{ spec: { kind: 'ring', radius: 8, thickness: 2, ramp: 'STATUS_GOLD' } }, { spec: { kind: 'shard', size: 6, shape: 'hex', ramp: 'STATUS_GOLD' }, scale: 0.8 }],
        layers: [
            { spec: { kind: 'shard', size: 8, shape: 'hex', ramp: 'STATUS_GOLD' }, anchor: 'HEAD', count: 3, orbitRadius: 16, orbitSpeed: 4.5, lift: -6, alpha: 1, blend: 'source-over' },
            { spec: { kind: 'glow', radius: 16, ramp: 'STATUS_GOLD' }, anchor: 'HEAD', lift: 0, alpha: 0.4, pulse: { amp: 0.15, hz: 2 }, decor: true },
        ],
    },
    /** 沉默（藍紫）：頭上一枚六角環，被一道斜線劃掉（禁止符號） */
    SILENCE: {
        priority: 70, category: 'HARD_CC',
        icon: [{ spec: { kind: 'ring', radius: 8, thickness: 2, ramp: 'STATUS_VIOLET' } }, { spec: { kind: 'shard', size: 8, shape: 'bone', ramp: 'STATUS_VIOLET' }, rotation: Math.PI / 4 }],
        layers: [
            { spec: { kind: 'ring', radius: 12, thickness: 3, ramp: 'STATUS_VIOLET' }, anchor: 'HEAD', lift: 0, alpha: 0.95, blend: 'source-over' },
            { spec: { kind: 'shard', size: 12, shape: 'bone', ramp: 'STATUS_VIOLET' }, anchor: 'HEAD', lift: 0, rotation: Math.PI / 4, alpha: 0.95, blend: 'source-over' },
        ],
    },
    /** 放逐（蒼白青灰）：半透明幽光柱把單位罩住，幽光碎片繞行（最高優先序） */
    BANISH: {
        priority: 100, category: 'HARD_CC',
        icon: [{ spec: { kind: 'pillar', width: 8, height: 12, ramp: 'STATUS_GHOST' } }],
        layers: [
            { spec: { kind: 'pillar', width: 32, height: 72, ramp: 'STATUS_GHOST' }, anchor: 'GROUND', alpha: 0.55, blend: 'source-over', pulse: { amp: 0.04, hz: 1.5 } },
            { spec: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'STATUS_GHOST' }, anchor: 'BODY', count: 4, orbitRadius: 22, orbitSpeed: 1.6, alpha: 0.9 },
            { spec: { kind: 'glow', radius: 24, ramp: 'STATUS_GHOST' }, anchor: 'GROUND', alpha: 0.4, blend: 'source-over', decor: true },
        ],
    },
    /** 禁錮（綠棕）：腳下粗糙的藤蔓環＋一圈向上的棘刺纏住腳 */
    ROOT: {
        priority: 60, category: 'HARD_CC',
        icon: [{ spec: { kind: 'ring', radius: 8, thickness: 2, ramp: 'STATUS_VINE', roughness: 0.6 } }, { spec: { kind: 'shard', size: 6, shape: 'crystal', ramp: 'STATUS_VINE' }, scale: 0.9 }],
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'STATUS_VINE', roughness: 0.6, seed: 1 }, anchor: 'GROUND', flat: true, alpha: 0.9, pulse: { amp: 0.06, hz: 1.6 } },
            { spec: { kind: 'shard', size: 12, shape: 'crystal', ramp: 'STATUS_VINE' }, anchor: 'GROUND', count: 5, orbitRadius: 20, lift: 10, alpha: 0.95 },
        ],
    },
    /** 恐懼（暗紫黑）：頭上顫抖的骷髏徽記 */
    FEAR: {
        priority: 75, category: 'HARD_CC',
        icon: [{ spec: { kind: 'sigil', radius: 6, emblem: 'hornSkull', ramp: 'STATUS_DREAD' } }],
        layers: [
            { spec: { kind: 'glow', radius: 16, ramp: 'STATUS_VIOLET' }, anchor: 'HEAD', lift: 0, alpha: 0.35, decor: true },
            { spec: { kind: 'sigil', radius: 12, emblem: 'hornSkull', ramp: 'STATUS_DREAD' }, anchor: 'HEAD', lift: 0, shake: 1.6, alpha: 0.95, blend: 'source-over' },
        ],
    },
    /** 嘲諷（紅）：頭上上下彈跳的倒三角（「看這裡」），背後紅色放射光 */
    TAUNT: {
        priority: 65, category: 'HARD_CC',
        icon: [{ spec: { kind: 'sigil', radius: 6, emblem: 'invTriangle', ramp: 'STATUS_RED' } }],
        layers: [
            { spec: { kind: 'sigil', radius: 12, emblem: 'invTriangle', ramp: 'STATUS_RED' }, anchor: 'HEAD', lift: 0, bob: { amp: 3, hz: 2 }, alpha: 0.95, blend: 'source-over' },
            { spec: { kind: 'rays', radius: 24, count: 8, ramp: 'STATUS_RED' }, anchor: 'HEAD', lift: 0, spin: 0.7, alpha: 0.55, decor: true },
        ],
    },
    /** 變羊（粉）：模型換成羊（PolymorphPainter：Blender 烘焙的羊，站在腳底）；這裡補身上上升的粉色光點 */
    POLYMORPH: {
        priority: 85, category: 'HARD_CC',
        icon: [{ spec: { kind: 'ring', radius: 8, thickness: 2, ramp: 'STATUS_PINK' } }, { spec: { kind: 'glow', radius: 6, ramp: 'STATUS_PINK', hard: true } }],
        layers: [
            { spec: { kind: 'glow', radius: 4, ramp: 'STATUS_PINK', hard: true }, anchor: 'BODY', count: 4, orbitRadius: 14, lift: -20, rise: { height: 44, period: 1.6 }, alpha: 0.95 },
        ],
    },
    /** 凍結（冰青）：單位被封進六角冰柱牢籠（FrozenPainter：Blender 烘焙的半透明冰籠）；這裡補腳下冰環 */
    FROZEN: {
        priority: 88, category: 'HARD_CC',
        icon: [{ spec: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'STATUS_ICE' } }],
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'STATUS_ICE' }, anchor: 'GROUND', flat: true, alpha: 0.9 },
            { spec: { kind: 'glow', radius: 32, ramp: 'STATUS_ICE' }, anchor: 'BODY', alpha: 0.3, decor: true },
        ],
    },
    /** 凝滯（琥珀金）：琥珀色稜柱把單位封住，上下各一圈緩轉的六角環（時間凍結的框） */
    STASIS: {
        priority: 95, category: 'HARD_CC',
        icon: [{ spec: { kind: 'ring', radius: 8, thickness: 2, ramp: 'STATUS_AMBER' } }, { spec: { kind: 'ring', radius: 4, thickness: 2, ramp: 'STATUS_AMBER' } }],
        layers: [
            { spec: { kind: 'pillar', width: 32, height: 72, ramp: 'STATUS_AMBER' }, anchor: 'GROUND', alpha: 0.22 },
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'STATUS_AMBER' }, anchor: 'GROUND', flat: true, spin: 0.3, alpha: 0.9 },
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'STATUS_AMBER' }, anchor: 'GROUND', flat: true, spin: -0.3, lift: 62, alpha: 0.7, decor: true },
        ],
    },

    // ── 弱減益：低調，不搶硬控的剪影 ───────────────────────────────────
    /** 致盲（灰）：頭上兩團灰煙雲繞頭（蒙住視線） */
    BLIND: {
        priority: 55, category: 'DEBUFF',
        icon: [{ spec: { kind: 'smoke', radius: 8, color: 'DUST', roughness: 1, seed: 1 }, scale: 1.2 }],
        layers: [
            { spec: { kind: 'smoke', radius: 12, color: 'DUST', roughness: 1, seed: 1 }, anchor: 'HEAD', count: 2, orbitRadius: 9, orbitSpeed: 2.4, lift: -2, alpha: 1 },
            { spec: { kind: 'spark', length: 8, ramp: 'STATUS_SLATE' }, anchor: 'HEAD', count: 3, orbitRadius: 14, orbitSpeed: -3, lift: 2, alpha: 0.6, decor: true },
        ],
    },
    /** 緩速（霜藍）：貼著腳踝的兩枚下壓箭頭（不用圈：腳下圈留給硬控） */
    SLOW: {
        priority: 20, category: 'DEBUFF',
        icon: [{ spec: { kind: 'shard', size: 8, shape: 'chevron', ramp: 'STATUS_FROST' } }],
        layers: [
            { spec: { kind: 'shard', size: 12, shape: 'chevron', ramp: 'STATUS_FROST' }, anchor: 'BODY', count: 2, orbitRadius: 14, lift: -22, bob: { amp: 2, hz: 1.2 }, alpha: 0.9 },
        ],
    },
    /** 易傷（橘紅）：身上的裂紋（兩道小閃電狀的裂縫） */
    VULNERABLE: {
        priority: 22, category: 'DEBUFF',
        icon: [{ spec: { kind: 'bolt', length: 12, branches: 1, ramp: 'STATUS_CRACK', seed: 2 } }],
        layers: [
            { spec: { kind: 'bolt', length: 12, branches: 1, ramp: 'STATUS_CRACK', seed: 2 }, anchor: 'BODY', count: 2, orbitRadius: 8, lift: 6, alpha: 0.85 },
        ],
    },
    /** 燃燒（橘）：身上的火舌 */
    BURN: {
        priority: 30, category: 'DEBUFF',
        icon: [{ spec: { kind: 'flame', height: 12, ramp: 'STATUS_BURN' } }],
        layers: [
            { spec: { kind: 'flame', height: 16, ramp: 'STATUS_BURN' }, anchor: 'BODY', count: 2, orbitRadius: 10, orbitSpeed: 1, lift: -12, alpha: 0.85 },
        ],
    },
    /** 中毒（綠）：身上上升的毒滴，腳下一團瘴氣（裝飾） */
    POISON: {
        priority: 25, category: 'DEBUFF',
        icon: [{ spec: { kind: 'droplet', size: 6, ramp: 'STATUS_POISON' }, scale: 1.2 }],
        layers: [
            { spec: { kind: 'droplet', size: 4, ramp: 'STATUS_POISON' }, anchor: 'BODY', count: 3, orbitRadius: 12, lift: -18, rise: { height: 40, period: 1.6 }, alpha: 0.85 },
            { spec: { kind: 'smoke', radius: 12, color: 'MIASMA', roughness: 1, seed: 2 }, anchor: 'GROUND', flat: true, alpha: 0.35, decor: true },
        ],
    },

    // ── 增益 ───────────────────────────────────────────────────────────
    /** 再生（草綠）：身上上升的綠色光點 */
    REGEN: {
        priority: 15, category: 'BUFF',
        icon: [{ spec: { kind: 'ring', radius: 8, thickness: 2, ramp: 'STATUS_GREEN' } }, { spec: { kind: 'glow', radius: 6, ramp: 'STATUS_GREEN', hard: true } }],
        layers: [
            { spec: { kind: 'glow', radius: 4, ramp: 'STATUS_GREEN', hard: true }, anchor: 'BODY', count: 3, orbitRadius: 12, lift: -20, rise: { height: 50, period: 1.8 }, alpha: 0.9 },
        ],
    },
    /** 加速（青白）：身上快速上升的速度線 */
    HASTE: {
        priority: 18, category: 'BUFF',
        icon: [{ spec: { kind: 'spark', length: 12, ramp: 'STATUS_WIND' }, rotation: -Math.PI / 4 }],
        layers: [
            { spec: { kind: 'spark', length: 12, ramp: 'STATUS_WIND' }, anchor: 'BODY', count: 3, orbitRadius: 12, rotation: -Math.PI / 2, lift: -14, rise: { height: 36, period: 0.7 }, alpha: 0.9 },
        ],
    },
    /** 反傷（銀白）：環繞身體的六角鏡片 */
    REFLECT: {
        priority: 24, category: 'BUFF',
        icon: [{ spec: { kind: 'shard', size: 8, shape: 'hex', ramp: 'STATUS_SILVER' } }],
        layers: [
            { spec: { kind: 'shard', size: 6, shape: 'hex', ramp: 'STATUS_SILVER' }, anchor: 'BODY', count: 3, orbitRadius: 16, orbitSpeed: 2, alpha: 0.85 },
        ],
    },
    /** 吸血（深紅）：身上上升的血滴 */
    LIFESTEAL: {
        priority: 26, category: 'BUFF',
        icon: [{ spec: { kind: 'droplet', size: 6, ramp: 'STATUS_CRIMSON' }, scale: 1.2 }],
        layers: [
            { spec: { kind: 'droplet', size: 4, ramp: 'STATUS_CRIMSON' }, anchor: 'BODY', count: 3, orbitRadius: 10, lift: -16, rise: { height: 36, period: 1.5 }, alpha: 0.85 },
        ],
    },
    /** 無敵（金白）：腳下日輪＋身上金白放射光 */
    INVINCIBLE: {
        priority: 58, category: 'BUFF',
        icon: [{ spec: { kind: 'rays', radius: 8, count: 8, ramp: 'STATUS_RADIANT' } }, { spec: { kind: 'glow', radius: 6, ramp: 'STATUS_RADIANT', hard: true } }],
        layers: [
            { spec: { kind: 'sigil', radius: 24, emblem: 'sun', ramp: 'STATUS_RADIANT' }, anchor: 'GROUND', flat: true, spin: 0.4, alpha: 0.7 },
            { spec: { kind: 'rays', radius: 32, count: 12, ramp: 'STATUS_RADIANT' }, anchor: 'BODY', spin: 0.6, alpha: 0.5, decor: true },
        ],
    },
    /** 護盾（藍）：ShieldPainter 的稜柱（computeShieldGeometry 貼合頭頂高度） */
    SHIELD: {
        priority: 50, category: 'BUFF', layers: [],
        icon: [{ spec: { kind: 'sigil', radius: 6, emblem: 'lionShield', ramp: 'STATUS_SKY' } }],
        handledBy: 'ShieldPainter（prism 零件，computeShieldGeometry 貼合頭頂高度）',
    },

    // ── 施法／AI 狀態（極低調的地面提示） ─────────────────────────────────
    CAST_ULT: {
        priority: 10, category: 'STATE',
        layers: [
            { spec: { kind: 'ring', radius: 28, thickness: 4, ramp: 'STATUS_RADIANT' }, anchor: 'GROUND', flat: true, spin: 0.6, alpha: 0.6, pulse: { amp: 0.1, hz: 3 } },
            { spec: { kind: 'glow', radius: 4, ramp: 'STATUS_RADIANT', hard: true }, anchor: 'BODY', count: 3, orbitRadius: 14, lift: -20, rise: { height: 56, period: 1.2 }, alpha: 0.9, decor: true },
        ],
    },
    CAST_ACTIVE: {
        priority: 9, category: 'STATE',
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'STATUS_SKY' }, anchor: 'GROUND', flat: true, spin: 0.8, alpha: 0.5 },
        ],
    },
    CC_INTERRUPT: {
        priority: 89, category: 'STATE', layers: [], alias: 'STUN',
        note: '被打斷但暈眩計時器已歸零的瞬間沿用暈眩標記；暈眩成立時由 STUN 本身繪製。',
    },
    EVADING: {
        priority: 5, category: 'STATE',
        layers: [
            { spec: { kind: 'smoke', radius: 8, color: 'DUST', roughness: 1, seed: 3 }, anchor: 'GROUND', flat: true, count: 2, orbitRadius: 8, alpha: 0.4 },
        ],
    },

    // ── 沒有常駐零件層的條目 ─────────────────────────────────────────────
    IMMUNE: { priority: 0, category: 'EVENT', layers: [], handledBy: '一次性事件：CC_APPLIED 浮動文字（CCManager），沒有常駐狀態' },
    KNOCKBACK: { priority: 0, category: 'EVENT', layers: [], handledBy: '一次性事件：ForcedMove 位移＋撞擊特效，沒有常駐狀態' },
    PULL: { priority: 0, category: 'EVENT', layers: [], handledBy: '一次性事件：ForcedMove 位移，沒有常駐狀態' },
    DEFAULT: { priority: 0, category: 'EVENT', layers: [], handledBy: '查表失敗時的退路（顏色／文字）' },
};

/** 有零件層（或別名）的鍵，依優先序由高到低（StatusPartPainter 的繪製順序與截斷順序）。 */
export const STATUS_PART_ORDER: readonly StatusPartKey[] = STATUS_PART_KEYS
    .filter((k) => STATUS_PARTS[k].layers.length > 0 || STATUS_PARTS[k].alias)
    .slice()
    .sort((a, b) => STATUS_PARTS[b].priority - STATUS_PARTS[a].priority);

/**
 * 狀態圖示列的順序（HUD StatusStripPainter）：有 icon 的狀態，減益（硬控＋其他減益）在左、增益在右，
 * 各自依優先序由高到低（品質階層截斷時先保留優先序高者）。
 */
const byPriority = (a: StatusPartKey, b: StatusPartKey) => STATUS_PARTS[b].priority - STATUS_PARTS[a].priority;
const withIcon = STATUS_PART_KEYS.filter((k) => STATUS_PARTS[k].icon);
export const STATUS_STRIP_ORDER = {
    debuffs: withIcon.filter((k) => STATUS_PARTS[k].category === 'HARD_CC' || STATUS_PARTS[k].category === 'DEBUFF').sort(byPriority) as readonly StatusPartKey[],
    buffs: withIcon.filter((k) => STATUS_PARTS[k].category === 'BUFF').sort(byPriority) as readonly StatusPartKey[],
} as const;
