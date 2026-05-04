import { Hex, Point } from "../../types";
import { Camera } from "../systems/CameraSystem";
import { HexUtils, MapConfig } from "../utils";
import { GridSpatial } from "../systems/grid/GridSpatial";
import { GameEngine } from "../game";
import { GridCache } from "../systems/grid/GridCache";

export class PointerProjector {

    /**
     * SSOT: CSS 滑鼠座標 → Canvas 繪圖座標（補正 DPR）
     * 所有座標轉換的第一步，必須先過這裡。
     */
    public static cssToCanvas(
        cssX: number,
        cssY: number,
        canvas: HTMLCanvasElement
    ): Point {
        const rect = canvas.getBoundingClientRect();
        // canvas.width 是繪圖解析度（含 DPR）
        // rect.width 是 CSS 顯示尺寸
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (cssX - rect.left) * scaleX,
            y: (cssY - rect.top) * scaleY
        };
    }

    /**
     * SSOT: Canvas 繪圖座標 → 世界座標（camera 反投影）
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
        cache: GridCache
    ): Hex | null {
        const canvasPt = this.cssToCanvas(cssX, cssY, canvas);
        const worldPt = this.canvasToWorld(
            canvasPt.x, canvasPt.y,
            canvas.width, canvas.height,
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
