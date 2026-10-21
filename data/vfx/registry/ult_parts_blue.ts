import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";

// ==========================================
// 奧義特效（零件版）— 獅心（BLUE）
// 依 ult_parts.ts 的兩個樣板：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻，總長 ≤ 2 s。
// 獅心：金白、乾淨、對稱；日輪／獅盾紋章；環與碎片為正六角。
// HEAVEN_FALL 類（SkillSequences 先畫落體，命中時才播本特效）：落體本身就是起手，
// 所以這類的爆發在 delay 0，紋章改為命中後烙下的餘韻。
// ==========================================

export const ULT_PART_VFX_BLUE: Record<string, VFXAsset> = {
    // tb_u3 絕對防禦（天降神盾，HEAVEN_FALL，範圍 4）：起手神盾法陣預告 → 落地神盾衝擊＋光柱＋六角護盾碎片 → 光點上飄
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            // 起手：獅盾紋章（陣營紋章），在落點預告
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.1, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 起手：天降神盾光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 80, height: 224, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.1, size: 80, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeOut: 0.6 } }),
            // 命中：落地主爆發（delay 0.3 與自由落體落地時刻對齊）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
            // 六角護盾碎片向外彈開
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_HOLY' }, count: [8, 10], lifetime: [0.6, 0.8], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [180, 360], vz: [250, 450], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.6, 0.85], delay: [0.4, 0.55], size: 8,
                shape: 'CIRCLE', shapeRadius: 90, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u4 泰坦降臨（巨型重擊，單體）：日輪法陣快閃 → 金色重擊閃光＋放射＋衝擊環＋碎石 → 塵土
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.2, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.0, scaleTo: 1.0, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 80, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.0, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'rock', ramp: 'LION_PHYSICAL', seed: 2 }, count: [8, 12], lifetime: [0.7, 0.9], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [250, 450], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'DUST', seed: 3 }, count: [3, 5], lifetime: [0.7, 0.9], delay: [0.35, 0.45], size: 32,
                shape: 'CIRCLE', shapeRadius: 36, speed: [20, 40], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.5, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.6 } }),
        ],
    },

    // wb_u1 雷霆之怒（跳躍轟炸，HEAVEN_FALL，範圍 3）：起手日輪印記 → 落地金雷劈下＋爆閃＋衝擊環 → 電光殘點
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'sun', ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 1.1, delay: 0, size: 96, vRotation: 0.8,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'bolt', length: 224, branches: 3, ramp: 'LION_LIGHTNING', seed: 4 }, count: 1, lifetime: 0.35, delay: 0.1, size: 112, groundAnchored: true,
                partAnim: { fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_LIGHTNING', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 0.5, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'bolt', length: 160, branches: 2, ramp: 'LION_LIGHTNING', seed: 7 }, count: [3, 4], lifetime: [0.2, 0.3], delay: [0.32, 0.42], size: 80, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 70, partAnim: { fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'LION_LIGHTNING', hard: true }, count: [10, 14], lifetime: [0.5, 0.75], delay: [0.35, 0.5], size: 6,
                shape: 'BURST_DIR', speed: [150, 350], vz: [80, 200], drag: 0.06, partAnim: { fadeOut: 0.6 } }),
        ],
    },

    // wb_u2 破曉聖擊（自身範圍 4）：日輪法陣浮現 → 旭日爆發（閃光＋十二道光芒＋雙重衝擊環） → 光點上飄
    'FX_ULT_BLUE_DAYBREAK': {
        id: 'FX_ULT_BLUE_DAYBREAK',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.5, delay: 0, size: 112, vRotation: 0.4,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 112, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.55, delay: 0.3, size: 112,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 128, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.6, rotation: 0.2 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.32, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.45, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [0.9, 1.2], delay: [0.45, 0.7], size: 8,
                shape: 'CIRCLE', shapeRadius: 110, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // sb_u4 神之怒火（自身範圍 4 轟炸）：日輪法陣 → 三道天罰光柱依序落下＋閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_WRATH': {
        id: 'FX_ULT_BLUE_WRATH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 112, vRotation: -0.4,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 224, ramp: 'LION_HOLY' }, count: 3, lifetime: 0.55, delay: [0.15, 0.25], size: 48, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 80, partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeIn: 0.05, fadeOut: 0.6 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 範圍 4 擴張環（128 * 1.8 * 1.4 = 322.6px，落於 232.8～432.3px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 14], lifetime: [0.8, 1.1], delay: [0.35, 0.55], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u1 聖光結界（自身範圍 3 暈眩，SANCTUARY）：獅盾法陣 → 六根光柱沿六角環升起＋中央閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.7, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 六根光柱：RING 均勻分布＝六角結界的六個頂點
            part({ particleType: 'PART', part: { kind: 'pillar', width: 40, height: 192, ramp: 'LION_HOLY' }, count: 6, lifetime: 1.0, delay: 0.25, size: 40, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.7, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.5, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u1 極地冰河（HEAVEN_FALL，單體）：日輪霜印 → 冰霜主爆發＋衝擊環＋碎冰飛散 → 冰塵餘韻
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            // 起手：日輪霜印（單體尺寸 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_ICE' }, count: 1, lifetime: 1.15, delay: 0, size: 36, vRotation: 0.2,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_ICE', hard: true }, count: 1, lifetime: 0.35, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中衝擊環（單體擴張環，半徑 32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_ICE' }, count: 1, lifetime: 0.45, delay: 0.3, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.1, fadeOut: 0.6 } }),
            // 碎冰飛散
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'crystal', ramp: 'LION_ICE' }, count: [6, 8], lifetime: [0.5, 0.7], delay: 0.3, size: 6,
                shape: 'BURST_DIR', speed: [120, 260], vz: [150, 320], gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            // 餘韻冰塵
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_ICE', hard: true }, count: [6, 8], lifetime: [0.6, 0.8], delay: [0.35, 0.5], size: 4,
                shape: 'CIRCLE', shapeRadius: 30, speed: [5, 15], vz: [20, 50], drag: 0.02, partAnim: { fadeIn: 0.1, fadeOut: 0.5 } }),
        ],
    },

    // rb_u3 軌道轟炸／穿日神矢（HEAVEN_FALL，單體）：日輪自天貫下 → 細長聖光柱＋核心閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            // 起手：日輪光印（單體尺寸 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.05, delay: 0, size: 36, vRotation: 0.5,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            // 命中：細長聖光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 320, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 48, groundAnchored: true,
                partAnim: { scaleFrom: 1.3, scaleTo: 0.6, fadeOut: 0.6 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中衝擊環（單體擴張環，半徑 32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: 0.3, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.1, fadeOut: 0.6 } }),
            // 餘韻光點
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_HOLY', hard: true }, count: [6, 8], lifetime: [0.5, 0.7], delay: [0.35, 0.45], size: 4,
                shape: 'CIRCLE', shapeRadius: 30, speed: [10, 25], vz: [40, 80], drag: 0.02, partAnim: { fadeOut: 0.5 } }),
        ],
    },

    // mb_u1 事件視界／奧術漩渦（範圍 3 牽引）：向心碎晶開始被吸 → 命中時黑洞張開：旋轉的六角吸積盤＋旋臂＋黑色核心球，
    // 持續吸入碎晶 → 結尾坍縮閃光。2026-10-21 使用者：舊版（6927b68 之前的 BLACK_HOLE 程序繪製）是最喜歡的之一，依舊版構圖做回。
    // 時長：DOMAIN 序列在 hitAt − 0.3 開始，發射器須在 delay＋lifetime ≤ 2.0 內結束（C4）。
    'FX_ULT_BLUE_BLACKHOLE': {
        id: 'FX_ULT_BLUE_BLACKHOLE',
        emitters: [
            // 向心碎晶：命中前就開始被吸（C3 起手），整段持續往中心掉
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_VOID' }, count: [16, 20], lifetime: [0.45, 0.6], delay: [0.05, 1.3], size: 8,
                shape: 'CIRCLE', shapeRadius: 150, speed: [-320, -240], vRotation: [-6, 6], partAnim: { fadeIn: 0.25, fadeOut: 0.25 } }),
            // 主體：紫黑六角吸積盤快速旋轉（ASH_VOID 一般混合的實色，舊版的紫黑色調；主爆發，delay 0.3 對齊 hitAt；96 * 1.0 * 1.4 = 134.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 96, thickness: 48, ramp: 'ASH_VOID' }, count: 1, lifetime: 1.6, delay: 0.3, size: 96, vRotation: 3,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.0, fadeIn: 0.1, fadeOut: 0.2 } }),
            // 旋臂：反向慢轉的放射線（110 * 1.0 * 1.4 = 154px）
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 110, count: 6, ramp: 'ASH_VOID', lengthJitter: 0.3, seed: 4 }, count: 1, lifetime: 1.5, delay: 0.35, size: 110, vRotation: -2,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.0, fadeIn: 0.15, fadeOut: 0.25, alpha: 0.8 } }),
            // 事件視界外緣光暈（畫在核心後面，形成黑球的紫色描邊）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 84, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.9, delay: 0.3, size: 84,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.0, fadeIn: 0.1, fadeOut: 0.5, alpha: 0.7 } }),
            // 黑色核心球（一般混合的實體黑；暗色在加法混合下會消失，所以用 smoke；兩層疊到不透明）
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 52, color: 'CHAR', roughness: 0 }, count: 2, lifetime: 1.55, delay: 0.3, size: 52,
                partAnim: { scaleFrom: 0.2, scaleTo: 1.0, fadeIn: 0.1, fadeOut: 0.15 } }),
            // 結尾坍縮：擴張衝擊環（C7 傷害要有擴張貼地環；88 * 1.3 * 1.4 = 160px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 88, thickness: 10, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.3, delay: 1.65, size: 88,
                partAnim: { scaleFrom: 0.2, scaleTo: 1.3, fadeOut: 0.6 } }),
        ],
    },

    // mb_u2 絕對零度（DOMAIN，範圍 4）：日輪霜印 → 冰晶核心閃光＋冰霜衝擊環＋碎晶飛散 → 冰霧
    'FX_ULT_BLUE_ABSOLUTE_ZERO': {
        id: 'FX_ULT_BLUE_ABSOLUTE_ZERO',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_ICE' }, count: 1, lifetime: 1.5, delay: 0, size: 64, vRotation: 0.2,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_ICE', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 範圍 4 擴張環：128 * 1.8 * 1.4 = 322.6px，落於 232.8～432.3px
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_ICE' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'LION_ICE' }, count: [6, 8], lifetime: [0.5, 0.7], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [150, 300], vz: [180, 360], gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'STEEL', seed: 4 }, count: 3, lifetime: 0.8, delay: 0.35, size: 32,
                shape: 'CIRCLE', shapeRadius: 60, speed: [15, 30], vz: [10, 25], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.4 } }),
        ],
    },

    // sb_u2 復活之光（自身範圍 6 治療，HEAVEN_FALL）：日輪法陣 → 重生光柱落下＋核心閃光＋柔和光環 → 大量光點上升
    'FX_ULT_BLUE_RESURRECTION': {
        id: 'FX_ULT_BLUE_RESURRECTION',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.05, delay: 0, size: 64, vRotation: 0.3,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 80, height: 288, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 80, groundAnchored: true,
                partAnim: { scaleFrom: 1.1, scaleTo: 0.9, fadeIn: 0.05, fadeOut: 0.5 } }),
            // 命中主爆發（glow radius 140 大於環，非擴張環；delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 140, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 140,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 範圍 6 柔和環（128 * 1.8 * 1.4 = 322.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [0.6, 0.8], delay: [0.35, 0.45], size: 8,
                shape: 'CIRCLE', shapeRadius: 140, speed: [5, 20], vz: [60, 120], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u2 王者之風（全場嘲諷與護盾）：獅盾法陣 → 王者光環（三道擴散環）＋上射光芒 → 光點
    'FX_ULT_BLUE_KINGS_BLESSING': {
        id: 'FX_ULT_BLUE_KINGS_BLESSING',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.5, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 96, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.3, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_HOLY' }, count: 3, lifetime: 0.8, delay: [0.3, 0.7], size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [0.9, 1.2], delay: [0.4, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 120, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u5 鋼鐵長城（全隊護盾）：獅盾法陣 → 六角護盾碎片環形升起＋護盾環 → 碎片閃爍淡出
    'FX_ULT_BLUE_FINAL_DEFENSE': {
        id: 'FX_ULT_BLUE_FINAL_DEFENSE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.7, delay: 0, size: 112, vRotation: -0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 城牆：六面六角盾片沿六角環立起
            part({ particleType: 'PART', part: { kind: 'shard', size: 32, shape: 'hex', ramp: 'LION_ARCANE' }, count: 6, lifetime: 1.1, delay: [0.25, 0.4], size: 32, groundAnchored: true,
                shape: 'RING', shapeRadius: 90, vz: [20, 40], partAnim: { scaleFrom: 0.3, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.5, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_ARCANE' }, count: 2, lifetime: 0.8, delay: [0.3, 0.55], size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_ARCANE', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.5, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u4 絕對封鎖（範圍 4 禁錮）：日輪法陣 → 六根細光柱沿六角環落下成牢籠＋擴張環 → 牢籠淡出
    'FX_ULT_BLUE_LOCKDOWN': {
        id: 'FX_ULT_BLUE_LOCKDOWN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.6, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 24, height: 224, ramp: 'LION_ARCANE' }, count: 6, lifetime: 1.0, delay: 0.25, size: 24, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.05, fadeOut: 0.35 } }),
            // 命中衝擊環：擴張環（範圍 4：128 * 1.8 * 1.4 = 322.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.7, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
        ],
    },

    // mb_u3 時間停止（全場靜止）：巨大日輪時鐘法陣緩轉 → 白光一閃＋擴散環（時間凍結）→ 光點懸停上升
    'FX_ULT_BLUE_TIMESTOP': {
        id: 'FX_ULT_BLUE_TIMESTOP',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.8, delay: 0, size: 128, vRotation: 1.2,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.3 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.5, delay: 0.1, size: 64, vRotation: -2.0,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 命中主爆發（glow radius 140 大於環，非擴張環；delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 140, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 140,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 範圍 10 環（128 * 1.8 * 1.4 = 322.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.8, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            // 懸停光點（vz > 0 滿足 power <= 0 規則）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.35, 0.45], size: 8,
                shape: 'CIRCLE', shapeRadius: 130, vz: [10, 30], partAnim: { fadeIn: 0.1, fadeOut: 0.4 } }),
        ],
    },

    // sb_u1 神聖干涉（單體無敵）：小型獅盾法陣 → 窄光柱＋六角護盾碎片環繞＋閃光 → 光點
    'FX_ULT_BLUE_INTERVENTION': {
        id: 'FX_ULT_BLUE_INTERVENTION',
        emitters: [
            // 起手：小型獅盾法陣（單體尺寸 <= 72px，36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.5, delay: 0, size: 36, vRotation: 0.5,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 36, height: 224, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0.25, size: 36, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.05, fadeOut: 0.6 } }),
            // 命中主爆發（glow radius 64 大於環，非擴張環）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.25, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 16, shape: 'hex', ramp: 'LION_HOLY' }, count: 6, lifetime: 1.0, delay: 0.3, size: 16,
                shape: 'RING', shapeRadius: 30, vz: [30, 50], vRotation: [-2, 2], partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 單體非擴張環（32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.27, size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.6 } }),
        ],
    },
};
