// ╔══════════════════════════════════════════════════════════╗
// ║  status_parts — 狀態／控制效果的六角零件版視覺表（SSOT）   ║
// ║  職責：每個 STATUS_VISUALS 鍵用哪些零件、掛在哪個錨點、怎麼動 ║
// ║  [ARCH] 錨點定義見 engine/renderers/RenderSpec.ts §4：       ║
// ║  GROUND＝腳下（UnitFrame.floorY − physics.z）、              ║
// ║  BODY＝投影中心、HEAD＝頭頂 + HEAD_MARGIN。座標一律讀       ║
// ║  UnitFrame，這裡只有相對偏移（px，canvas 單位）。            ║
// ║  可讀性規則：強控（strong）各有獨立剪影，同一單位的頭頂     ║
// ║  標記只畫優先序最高的一個；弱效果（DoT／回復／易傷）低調。   ║
// ╚══════════════════════════════════════════════════════════╝

import type { PartLayer } from './parts/partLayer';

export type StatusAnchor = 'GROUND' | 'BODY' | 'HEAD';

/** 狀態零件層＝共用零件層（data/vfx/parts/partLayer.ts）＋掛在單位的哪個錨點 */
export interface StatusPartLayer extends PartLayer {
    anchor: StatusAnchor;
}

export interface StatusPartSet {
    /** 數字越大越優先：同一單位的頭頂標記由優先序最高者獨占，同時畫的狀態組數也以此截斷 */
    priority: number;
    /** 強控（要在遊戲縮放下一眼認出）或弱效果 */
    strong: boolean;
    layers: readonly StatusPartLayer[];
    /** 沒有自己的零件層時，說明由誰負責（護盾幾何貼合、一次性事件、文字） */
    handledBy?: string;
    /** 沿用另一個狀態的層（該狀態本身成立時不重複畫） */
    alias?: StatusPartKey;
    note?: string;
}

export const STATUS_PART_KEYS = [
    'STUN', 'SILENCE', 'BANISH', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'SHIELD', 'POISON', 'BURN', 'IMMUNE',
    'KNOCKBACK', 'PULL', 'REGEN', 'POLYMORPH', 'FROZEN', 'STASIS', 'VULNERABLE', 'HASTE', 'REFLECT', 'LIFESTEAL',
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
    // ── 強控：各有獨立剪影 ───────────────────────────────────────────────
    /** 暈眩：頭上繞行的三顆金色六角星（經典「轉圈圈」） */
    STUN: {
        priority: 90, strong: true,
        layers: [
            { spec: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_HOLY' }, anchor: 'HEAD', count: 3, orbitRadius: 16, orbitSpeed: 4.5, lift: -6, alpha: 1, blend: 'source-over' },
            { spec: { kind: 'glow', radius: 16, ramp: 'LION_HOLY' }, anchor: 'HEAD', lift: 0, alpha: 0.4, pulse: { amp: 0.15, hz: 2 }, decor: true },
        ],
    },
    /** 沉默：頭上一枚灰石六角環，被一道紅斜線劃掉（禁止符號） */
    SILENCE: {
        priority: 70, strong: true,
        layers: [
            { spec: { kind: 'ring', radius: 12, thickness: 3, ramp: 'STATUS_SLATE' }, anchor: 'HEAD', lift: 0, alpha: 0.95, blend: 'source-over' },
            { spec: { kind: 'shard', size: 12, shape: 'bone', ramp: 'ASH_BLOOD' }, anchor: 'HEAD', lift: 0, rotation: Math.PI / 4, alpha: 0.95, blend: 'source-over' },
        ],
    },
    /** 放逐：整個單位被紫色稜柱包住，晶片繞行，腳下深淵六角環（最高優先序） */
    BANISH: {
        priority: 100, strong: true,
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'ASH_VOID' }, anchor: 'GROUND', flat: true, spin: 0.8, alpha: 0.9, pulse: { amp: 0.06, hz: 1.2 } },
            { spec: { kind: 'pillar', width: 32, height: 72, ramp: 'ASH_VOID' }, anchor: 'GROUND', alpha: 0.5, pulse: { amp: 0.04, hz: 1.5 } },
            { spec: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'ASH_VOID' }, anchor: 'BODY', count: 4, orbitRadius: 22, orbitSpeed: 1.6, alpha: 0.9 },
        ],
    },
    /** 禁錮：腳下琥珀色六角環＋一圈向上的棘刺（根鬚） */
    ROOT: {
        priority: 60, strong: true,
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'LION_HOLY' }, anchor: 'GROUND', flat: true, alpha: 0.85, pulse: { amp: 0.08, hz: 1.6 } },
            { spec: { kind: 'shard', size: 12, shape: 'crystal', ramp: 'ASH_PHYSICAL' }, anchor: 'GROUND', count: 5, orbitRadius: 20, lift: 10, alpha: 0.95 },
        ],
    },
    /** 恐懼：頭上顫抖的紫色骷髏徽記，腳下快速收縮的深紫環 */
    FEAR: {
        priority: 75, strong: true,
        layers: [
            { spec: { kind: 'sigil', radius: 12, emblem: 'hornSkull', ramp: 'ASH_VOID' }, anchor: 'HEAD', lift: 0, shake: 1.6, alpha: 0.95, blend: 'source-over' },
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'ASH_VOID' }, anchor: 'GROUND', flat: true, alpha: 0.7, pulse: { amp: 0.14, hz: 4 }, decor: true },
        ],
    },
    /** 嘲諷：頭上上下彈跳的紅色倒三角（「看這裡」），背後紅色放射光 */
    TAUNT: {
        priority: 65, strong: true,
        layers: [
            { spec: { kind: 'sigil', radius: 12, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, anchor: 'HEAD', lift: 0, bob: { amp: 3, hz: 2 }, alpha: 0.95, blend: 'source-over' },
            { spec: { kind: 'rays', radius: 24, count: 8, ramp: 'ASH_BLOOD' }, anchor: 'HEAD', lift: 0, spin: 0.7, alpha: 0.55, decor: true },
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'ASH_BLOOD' }, anchor: 'GROUND', flat: true, alpha: 0.6, pulse: { amp: 0.1, hz: 2 }, decor: true },
        ],
    },
    /** 致盲：頭上兩團灰黑煙雲繞頭（蒙住視線） */
    BLIND: {
        priority: 55, strong: true,
        layers: [
            { spec: { kind: 'smoke', radius: 12, color: 'CHAR', roughness: 1, seed: 1 }, anchor: 'HEAD', count: 2, orbitRadius: 9, orbitSpeed: 2.4, lift: -2, alpha: 1 },
            { spec: { kind: 'spark', length: 8, ramp: 'STATUS_SLATE' }, anchor: 'HEAD', count: 3, orbitRadius: 14, orbitSpeed: -3, lift: 2, alpha: 0.6, decor: true },
        ],
    },
    /** 變羊：模型換成羊（PolymorphPainter 烘焙的毛球羊，站在腳底）；這裡補腳下粉紫日輪與上升的粉色光點 */
    POLYMORPH: {
        priority: 85, strong: true,
        layers: [
            { spec: { kind: 'sigil', radius: 24, emblem: 'sun', ramp: 'STATUS_PINK' }, anchor: 'GROUND', flat: true, spin: 0.5, alpha: 0.8 },
            { spec: { kind: 'glow', radius: 4, ramp: 'STATUS_PINK', hard: true }, anchor: 'BODY', count: 4, orbitRadius: 14, lift: -20, rise: { height: 44, period: 1.6 }, alpha: 0.95 },
        ],
    },
    /** 凍結：單位被封進六角冰塊（FrozenPainter 烘焙的半透明稜柱）；這裡補腳下冰環與繞身的冰晶 */
    FROZEN: {
        priority: 88, strong: true,
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'LION_ICE' }, anchor: 'GROUND', flat: true, alpha: 0.9 },
            { spec: { kind: 'shard', size: 12, shape: 'crystal', ramp: 'LION_ICE' }, anchor: 'BODY', count: 3, orbitRadius: 20, lift: 4, alpha: 0.95 },
            { spec: { kind: 'glow', radius: 32, ramp: 'LION_ICE' }, anchor: 'BODY', alpha: 0.3, decor: true },
        ],
    },
    /** 凝滯：金藍稜柱把單位封住，上下各一圈緩轉的六角環（時間停止） */
    STASIS: {
        priority: 95, strong: true,
        layers: [
            { spec: { kind: 'pillar', width: 32, height: 72, ramp: 'LION_LIGHTNING' }, anchor: 'GROUND', alpha: 0.22 },
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'LION_LIGHTNING' }, anchor: 'GROUND', flat: true, spin: 0.3, alpha: 0.9 },
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'LION_LIGHTNING' }, anchor: 'GROUND', flat: true, spin: -0.3, lift: 62, alpha: 0.7, decor: true },
        ],
    },
    /** 無敵：金白放射光＋腳下日輪＋頭頂光環 */
    INVINCIBLE: {
        priority: 92, strong: true,
        layers: [
            { spec: { kind: 'sigil', radius: 24, emblem: 'sun', ramp: 'LION_HOLY' }, anchor: 'GROUND', flat: true, spin: 0.4, alpha: 0.7 },
            { spec: { kind: 'rays', radius: 32, count: 12, ramp: 'LION_HOLY' }, anchor: 'BODY', spin: 0.6, alpha: 0.5, decor: true },
            { spec: { kind: 'ring', radius: 12, thickness: 3, ramp: 'LION_HOLY' }, anchor: 'HEAD', lift: -2, bob: { amp: 2, hz: 1.5 }, alpha: 0.95 },
        ],
    },

    // ── 弱效果：低調，不搶強控的剪影 ────────────────────────────────────
    POISON: {
        priority: 25, strong: false,
        layers: [
            { spec: { kind: 'droplet', size: 4, ramp: 'ASH_POISON' }, anchor: 'BODY', count: 3, orbitRadius: 12, lift: -18, rise: { height: 40, period: 1.6 }, alpha: 0.85 },
            { spec: { kind: 'smoke', radius: 12, color: 'MIASMA', roughness: 1, seed: 2 }, anchor: 'GROUND', flat: true, alpha: 0.35, decor: true },
        ],
    },
    BURN: {
        priority: 30, strong: false,
        layers: [
            { spec: { kind: 'flame', height: 16, ramp: 'ASH_FIRE' }, anchor: 'BODY', count: 2, orbitRadius: 10, orbitSpeed: 1, lift: -12, alpha: 0.85 },
        ],
    },
    REGEN: {
        priority: 15, strong: false,
        layers: [
            { spec: { kind: 'glow', radius: 4, ramp: 'STATUS_GREEN', hard: true }, anchor: 'BODY', count: 3, orbitRadius: 12, lift: -20, rise: { height: 50, period: 1.8 }, alpha: 0.9 },
            { spec: { kind: 'ring', radius: 16, thickness: 3, ramp: 'STATUS_GREEN' }, anchor: 'GROUND', flat: true, alpha: 0.3, decor: true },
        ],
    },
    VULNERABLE: {
        priority: 20, strong: false,
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'ASH_BLOOD' }, anchor: 'GROUND', flat: true, alpha: 0.3, pulse: { amp: 0.1, hz: 1.2 } },
            { spec: { kind: 'droplet', size: 4, ramp: 'ASH_BLOOD' }, anchor: 'HEAD', lift: 0, bob: { amp: 2, hz: 1.4 }, alpha: 0.7 },
        ],
    },
    HASTE: {
        priority: 18, strong: false,
        layers: [
            { spec: { kind: 'ring', radius: 16, thickness: 2, ramp: 'LION_ARCANE' }, anchor: 'GROUND', flat: true, spin: 1.2, alpha: 0.4 },
        ],
    },
    REFLECT: {
        priority: 22, strong: false,
        layers: [
            { spec: { kind: 'shard', size: 6, shape: 'crystal', ramp: 'LION_HOLY' }, anchor: 'BODY', count: 3, orbitRadius: 14, orbitSpeed: 2, alpha: 0.8 },
        ],
    },
    LIFESTEAL: {
        priority: 24, strong: false,
        layers: [
            { spec: { kind: 'droplet', size: 4, ramp: 'ASH_BLOOD' }, anchor: 'BODY', count: 3, orbitRadius: 10, lift: -16, rise: { height: 36, period: 1.5 }, alpha: 0.8 },
        ],
    },

    // ── 施法／AI 狀態（極低調的地面提示） ─────────────────────────────────
    CAST_ULT: {
        priority: 10, strong: false,
        layers: [
            { spec: { kind: 'ring', radius: 28, thickness: 4, ramp: 'LION_HOLY' }, anchor: 'GROUND', flat: true, spin: 0.6, alpha: 0.6, pulse: { amp: 0.1, hz: 3 } },
            { spec: { kind: 'glow', radius: 4, ramp: 'LION_HOLY', hard: true }, anchor: 'BODY', count: 3, orbitRadius: 14, lift: -20, rise: { height: 56, period: 1.2 }, alpha: 0.9, decor: true },
        ],
    },
    CAST_ACTIVE: {
        priority: 9, strong: false,
        layers: [
            { spec: { kind: 'ring', radius: 24, thickness: 3, ramp: 'LION_ARCANE' }, anchor: 'GROUND', flat: true, spin: 0.8, alpha: 0.5 },
        ],
    },
    CC_INTERRUPT: {
        priority: 89, strong: false, layers: [], alias: 'STUN',
        note: '被打斷但暈眩計時器已歸零的瞬間沿用暈眩標記；暈眩成立時由 STUN 本身繪製。',
    },
    EVADING: {
        priority: 5, strong: false,
        layers: [
            { spec: { kind: 'smoke', radius: 8, color: 'DUST', roughness: 1, seed: 3 }, anchor: 'GROUND', flat: true, count: 2, orbitRadius: 8, alpha: 0.4 },
        ],
    },

    // ── 沒有常駐零件層的條目 ─────────────────────────────────────────────
    SHIELD: { priority: 50, strong: false, layers: [], handledBy: 'ShieldPainter（prism 零件，computeShieldGeometry 貼合頭頂高度）' },
    IMMUNE: { priority: 0, strong: false, layers: [], handledBy: '一次性事件：CC_APPLIED 浮動文字（CCManager），沒有常駐狀態' },
    KNOCKBACK: { priority: 0, strong: false, layers: [], handledBy: '一次性事件：ForcedMove 位移＋撞擊特效，沒有常駐狀態' },
    PULL: { priority: 0, strong: false, layers: [], handledBy: '一次性事件：ForcedMove 位移，沒有常駐狀態' },
    DEFAULT: { priority: 0, strong: false, layers: [], handledBy: '查表失敗時的退路（顏色／文字）' },
};

/** 有零件層（或別名）的鍵，依優先序由高到低（StatusPartPainter 的繪製順序與截斷順序）。 */
export const STATUS_PART_ORDER: readonly StatusPartKey[] = STATUS_PART_KEYS
    .filter((k) => STATUS_PARTS[k].layers.length > 0 || STATUS_PARTS[k].alias)
    .slice()
    .sort((a, b) => STATUS_PARTS[b].priority - STATUS_PARTS[a].priority);
