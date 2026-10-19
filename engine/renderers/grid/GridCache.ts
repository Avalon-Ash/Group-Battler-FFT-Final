
import { GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { TERRAIN_SKIN } from "../../../constants";
import { HexLayout } from "../../../types";
import { HexMath } from "../../math/HexMath";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { tileHash01 } from "../../graphics/materials/NoiseLib";

export interface CachedTile {
    q: number;
    r: number;
    px: number;
    py: number;
    h: number;
    key: string;
    /**
     * 6-bit 鄰格高度遮罩（bit i 對應 HexGeometry.getVertices 的邊 i：頂點 i → i+1）。
     * 前側邊（螢幕法線 y >= 0）：1 = 鄰格較低或不存在（崖邊）。
     * 背側邊（螢幕法線 y < 0）：1 = 鄰格較高（接觸陰影）。
     */
    edgeMask: number;
    /**
     * 島嶼底座深度級數（見 computeFoundationLevel）：0 = 前側沒有外露邊，維持舊基座；
     * 1..TERRAIN_SKIN.foundation.levels = 外露格，由 TerrainRenderer 依地形輪廓換算成底端深度。
     */
    baseLevel: number;
}

export interface EdgeTable {
    /** edgeToDir[i] = HexMath.directions 的索引：邊 i 外側相鄰的鄰格方向 */
    edgeToDir: readonly number[];
    /** edgeIsFront[i] = 邊 i 的外法線在畫面上 y >= 0（看得到側面的前側邊） */
    edgeIsFront: readonly boolean[];
}

const EDGE_COUNT = 6;
const edgeTables = new Map<HexLayout, EdgeTable>();

/**
 * 由 HexMath.neighbors（鄰格方向）與 HexUtils.toPx（等距投影後的鄰格中心位置）推導「邊 ↔ 鄰格方向」對照，
 * 取鄰格中心的相對方向，找最接近的邊中點（夾角餘弦最大）。每種 layout 只算一次。
 */
export function getEdgeTable(layout: HexLayout): EdgeTable {
    const cached = edgeTables.get(layout);
    if (cached) return cached;

    const cfg = { w: 1, h: 1, offsetX: 0, offsetY: 0, layout };
    const verts = HexGeometry.getVertices(1, true, layout);
    const origin = HexUtils.toPx(0, 0, cfg);
    const nbs = HexMath.neighbors({ q: 0, r: 0 });

    const edgeToDir: number[] = new Array(EDGE_COUNT).fill(-1);
    const edgeIsFront: boolean[] = new Array(EDGE_COUNT).fill(false);
    for (let d = 0; d < nbs.length; d++) {
        const p = HexUtils.toPx(nbs[d].q, nbs[d].r, cfg);
        const dx = p.x - origin.x, dy = p.y - origin.y;
        const dl = Math.hypot(dx, dy);
        let best = -1, bestCos = -Infinity;
        for (let i = 0; i < EDGE_COUNT; i++) {
            const a = verts[i], b = verts[(i + 1) % EDGE_COUNT];
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const cos = (dx * mx + dy * my) / (dl * Math.hypot(mx, my));
            if (cos > bestCos) { bestCos = cos; best = i; }
        }
        if (edgeToDir[best] !== -1) throw new Error(`GridCache.getEdgeTable: edge ${best} claimed twice (layout ${layout})`);
        edgeToDir[best] = d;
        edgeIsFront[best] = dy >= 0;
    }
    if (edgeToDir.some(v => v === -1)) throw new Error(`GridCache.getEdgeTable: incomplete mapping (layout ${layout})`);

    const table: EdgeTable = { edgeToDir, edgeIsFront };
    edgeTables.set(layout, table);
    return table;
}

/**
 * 計算單格的 6-bit 鄰格高度遮罩（純函式；heightAt 對不存在的格回傳 undefined）。
 */
export function computeEdgeMask(
    q: number,
    r: number,
    h: number,
    layout: HexLayout,
    heightAt: (q: number, r: number) => number | undefined,
    minStep: number = TERRAIN_SKIN.edge.minStep
): number {
    const table = getEdgeTable(layout);
    let mask = 0;
    for (let i = 0; i < EDGE_COUNT; i++) {
        const dir = HexMath.directions[table.edgeToDir[i]];
        const nh = heightAt(q + dir.q, r + dir.r);
        if (table.edgeIsFront[i]) {
            if (nh === undefined || h - nh >= minStep) mask |= 1 << i;
        } else if (nh !== undefined && nh - h >= minStep) {
            mask |= 1 << i;
        }
    }
    return mask;
}

/**
 * 計算單格的島嶼底座深度級數（純函式；exists 對不存在的格回傳 false）。
 * 只有「前側有邊外露（該方向鄰格不存在）」的格看得到底緣，其餘格的底部必被前方格蓋住，維持 0。
 * 外露格：鐘形輪廓（島中央深、左右兩端淺）混入每格固定雜訊，量化成 1..levels。
 * islandCenterX／islandHalfWidth 為所有格中心 px 的中點與半寬（不含 halfWidthMargin）。
 */
export function computeFoundationLevel(
    q: number,
    r: number,
    px: number,
    layout: HexLayout,
    exists: (q: number, r: number) => boolean,
    islandCenterX: number,
    islandHalfWidth: number,
    cfg = TERRAIN_SKIN.foundation
): number {
    const table = getEdgeTable(layout);
    let exposed = false;
    for (let i = 0; i < EDGE_COUNT; i++) {
        if (!table.edgeIsFront[i]) continue;
        const dir = HexMath.directions[table.edgeToDir[i]];
        if (!exists(q + dir.q, r + dir.r)) { exposed = true; break; }
    }
    if (!exposed) return 0;

    const t = Math.min(1, Math.abs(px - islandCenterX) / (islandHalfWidth + cfg.halfWidthMargin));
    const bell = Math.pow(1 - t * t, cfg.bellPower);
    const v = bell * (1 - cfg.jitter) + tileHash01(q, r, cfg.noiseSeed) * cfg.jitter;
    return 1 + Math.round(v * (cfg.levels - 1));
}

export class GridCache {
    public tileMap: Map<string, CachedTile> = new Map();
    public tileList: CachedTile[] = []; 
    private lastMapVersion: number = -1;

    public reset() {
        this.tileMap.clear();
        this.tileList = [];
        this.lastMapVersion = -1;
    }

    public ensure(engine: GameEngine) {
        if (this.lastMapVersion !== engine.mapVersion || this.tileList.length === 0) {
            this.rebuild(engine);
        }
    }

    private rebuild(engine: GameEngine) {
        this.tileList = [];
        this.tileMap.clear();
        this.lastMapVersion = engine.mapVersion;
        
        engine.mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            // Use standard HexUtils which delegates to HexMath for precision
            const pos = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            
            const tile: CachedTile = { q, r, px: pos.x, py: pos.y, h, key: k, edgeMask: 0, baseLevel: 0 };
            
            this.tileList.push(tile);
            this.tileMap.set(k, tile);
        });

        // 鄰格高度遮罩：只在重建時算一次（需等所有格都登錄後才查得到鄰格）
        const layout = engine.mapConfig.layout;
        const heightAt = (nq: number, nr: number): number | undefined => this.tileMap.get(`${nq},${nr}`)?.h;
        for (const tile of this.tileList) {
            tile.edgeMask = computeEdgeMask(tile.q, tile.r, tile.h, layout, heightAt);
        }

        // 島嶼底座：外露格的底端深度級數（同樣只在重建時算一次）
        let minPx = Infinity, maxPx = -Infinity;
        for (const tile of this.tileList) {
            if (tile.px < minPx) minPx = tile.px;
            if (tile.px > maxPx) maxPx = tile.px;
        }
        const islandCenterX = (minPx + maxPx) / 2;
        const islandHalfWidth = (maxPx - minPx) / 2;
        const exists = (nq: number, nr: number): boolean => this.tileMap.has(`${nq},${nr}`);
        for (const tile of this.tileList) {
            tile.baseLevel = computeFoundationLevel(tile.q, tile.r, tile.px, layout, exists, islandCenterX, islandHalfWidth);
        }

        // Painter's Algorithm: Sort by visual depth (Screen Y)
        // This ensures back tiles are drawn before front tiles.
        this.tileList.sort((a, b) => a.py - b.py);
    }
}
