// ╔══════════════════════════════════════════════════════════╗
// ║  partLayer — 共用的「零件層」資料格式                       ║
// ║  職責：一層＝一種預烘焙零件＋怎麼排、怎麼動（份數、繞行、   ║
// ║        上升、自轉、律動、抖動）。狀態（status_parts）與危害   ║
// ║        （hazard_visuals）都用這個格式。                      ║
// ║  [ARCH] 錨點由使用者決定（狀態＝單位的腳下／投影中心／頭頂、 ║
// ║  危害＝格子頂面中心），這裡只有相對偏移（px，canvas 單位）。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { PartSpec } from '../../../engine/renderers/vfxparts/PartSpec';
import type { VFXRampId } from './vfxPalette';

export interface PartLayer {
    /** 零件參數（色階為預設；紅隊可用 rampRed 覆寫） */
    spec: PartSpec;
    rampRed?: VFXRampId;
    /** 貼地（等距壓扁、轉到地圖六角方向）；其餘為看板 */
    flat?: boolean;
    /** 均分排列的份數（預設 1）。沒有繞行半徑也沒有上升時，各份改為均分旋轉角（例：三道漩渦臂） */
    count?: number;
    /** 水平半徑（px）；繞行時垂直方向再乘 ISO_SCALE_Y */
    orbitRadius?: number;
    /** 繞行角速度（rad/s，負為反向）；0／未填＝靜態排列 */
    orbitSpeed?: number;
    /** 相對錨點往上的偏移（px） */
    lift?: number;
    /** 零件自轉（rad/s）；貼地時在地面平面內轉 */
    spin?: number;
    /** 固定旋轉（rad，看板用） */
    rotation?: number;
    scale?: number;
    alpha?: number;
    pulse?: { amp: number; hz: number };
    bob?: { amp: number; hz: number };
    /** 循環上升並淡入淡出（高度 px、週期 s）；份數在週期內均分相位 */
    rise?: { height: number; period: number };
    /** 隨機感抖動幅度（px，確定性 sin，不用亂數） */
    shake?: number;
    /** 覆寫零件預設混合模式。頭頂標記用 source-over：加法混合在亮地形上會洗成白色，失去顏色辨識 */
    blend?: GlobalCompositeOperation;
    /** 裝飾層：品質階層 ≥ DECOR_CUT_TIER 時略過，只保留主剪影 */
    decor?: boolean;
}
