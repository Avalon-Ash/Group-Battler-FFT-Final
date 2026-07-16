// ╔══════════════════════════════════════════════════════════════════╗
// ║  PointerProjector — 指標座標轉換 SSOT                           ║
// ║                                                                  ║
// ║  職責：所有 CSS 滑鼠座標 ↔ Canvas 繪圖座標 ↔ 世界座標           ║
// ║        ↔ Hex 格子 的轉換邏輯，集中於此，不得分散到其他模組。    ║
// ║                                                                  ║
// ║  呼叫方：                                                        ║
// ║    hooks/useGameInput.ts  → cssToHex / hexToWorldSnap           ║
// ║    engine/renderer.ts     → canvasToWorld（thin delegate）      ║
// ║                                                                  ║
// ║  依賴的 SSOT 節點：                                              ║
// ║    engine/systems/grid/GridSpatial.getHexAtWorldPoint()         ║
// ║    engine/math/VisualMath（注意：視覺 Y 偏移不在此處計算，      ║
// ║      視覺投影請使用 VisualMath.getIsoVisualY / applyLayerBias） ║
// ║                                                                  ║
// ║  DPR 處理規則：                                                  ║
// ║    引擎內部座標與 Camera 均運作於 CSS 邏輯像素，                 ║
// ║    此處全面採用 CSS 邏輯尺寸，不再進行 DPR 補正以避免座標系混亂。║
// ║                                                                  ║
// ║  禁止事項：                                                      ║
// ║    × 不得在 useGameInput / renderer 內自行計算 screen→world     ║
// ║    × 不得在此處呼叫 VisualMath.getIsoVisualY（視覺層責任分離）  ║
// ╚══════════════════════════════════════════════════════════════════╝

import { Hex, Point } from "../../types";
import { Camera } from "../systems/CameraSystem";
import { HexUtils, MapConfig } from "../utils";
import { GridSpatial } from "../systems/grid/GridSpatial";
import { GameEngine } from "../game";
import { GridCache } from "../systems/grid/GridCache";

export class PointerProjector {

    /**
     * SSOT: CSS 滑鼠座標 → Canvas 繪圖座標（CSS 邏輯像素）
     * 引擎的 Camera 和 World 運作在 CSS 像素，這裡不再縮放 DPR
     */
    public static cssToCanvas(
        cssX: number,
        cssY: number,
        canvas: HTMLCanvasElement,
        cachedRect?: DOMRect
    ): Point {
        const rect = cachedRect ?? canvas.getBoundingClientRect();
        return {
            x: cssX - rect.left,
            y: cssY - rect.top
        };
    }

    /**
     * SSOT: Canvas 繪圖座標 → 世界座標（camera 反投影）
     * 參數 canvasWidth/Height 必須是 CSS 邏輯尺寸。
     */
    public static canvasToWorld(
        canvasX: number,
        canvasY: number,
        canvasWidth: number,
        canvasHeight: number,
        camera: Camera
    ): Point {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        return {
            x: (canvasX - cx) / camera.zoom + camera.x,
            y: (canvasY - cy) / camera.zoom + camera.y
        };
    }

    /**
     * SSOT: 世界座標 → Canvas 繪圖座標（camera 正向投影）
     * 供障礙物 ghost 繪製、cursor snap 等使用。
     * 參數 canvasWidth/Height 必須是 CSS 邏輯尺寸。
     */
    public static worldToCanvas(
        worldX: number,
        worldY: number,
        canvasWidth: number,
        canvasHeight: number,
        camera: Camera
    ): Point {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        return {
            x: (worldX - camera.x) * camera.zoom + cx,
            y: (worldY - camera.y) * camera.zoom + cy
        };
    }

    /**
     * SSOT: CSS 滑鼠座標 → Hex 格子（一站式）
     * 這是 useGameInput 唯一應該呼叫的方法。
     */
    public static cssToHex(
        cssX: number,
        cssY: number,
        canvas: HTMLCanvasElement,
        camera: Camera,
        engine: GameEngine,
        cache: GridCache,
        cachedRect?: DOMRect
    ): Hex | null {
        const rect = cachedRect ?? canvas.getBoundingClientRect();
        const canvasPt = this.cssToCanvas(cssX, cssY, canvas, rect);
        
        // 傳遞 CSS 邏輯尺寸 (rect.width/height) 給投影，避免混入 DPR 導致的偏移
        const worldPt = this.canvasToWorld(
            canvasPt.x, canvasPt.y,
            rect.width, rect.height,
            camera
        );
        return GridSpatial.getHexAtWorldPoint(worldPt.x, worldPt.y, engine, cache);
    }

    /**
     * SSOT: Hex 格子 → 世界中心座標（含地形高度）
     * 拖動 snap 的唯一入口，同時回傳 terrainHeight。
     */
    public static hexToWorldSnap(
        q: number,
        r: number,
        mapConfig: MapConfig,
        getTerrainHeight: (q: number, r: number) => number
    ): { worldX: number; worldY: number; terrainHeight: number } {
        const p = HexUtils.toPx(q, r, mapConfig);
        return {
            worldX: p.x,
            worldY: p.y,
            terrainHeight: getTerrainHeight(q, r)
        };
    }
}
