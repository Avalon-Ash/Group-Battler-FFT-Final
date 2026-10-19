import { ISO_SCALE_Y } from "../../../constants";
import { VFXFactory } from "../VFXFactory";
import { HexLayout } from "../../../types";
import { RenderStats } from "../../renderers/RenderStats";
import { CtxOpCounter } from "../../renderers/CtxOpCounter";
import { TerrainLoopAtlas, loopFrameIndex } from "../../renderers/grid/TerrainLoopAtlas";
import { GRASS_DETAIL, ICE_SHEEN, SAND_RIPPLES, TERRAIN_LIQUID } from "../../../data/vfx/terrainAmbience";

const TWO_PI = Math.PI * 2;

export const SurfacePainter = {
    resetLiquidStats() {
        TerrainLoopAtlas.resetLiquid();
    },

    getLiquidStats() {
        return TerrainLoopAtlas.getLiquidStats();
    },

    /**
     * 液面：從循環影格快取取圖（顏色、layout、量化後 intensity、硬殼變體各一組，參數在 TERRAIN_LIQUID）。
     * 每次呼叫只做一次 drawImage；影格索引由 time 對週期取模決定，頭尾無縫銜接。
     * variant／phase 由呼叫端依格子雜湊給（鄰格硬殼位置與脈動不同步）。
     */
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number,
        layout: HexLayout = 'FLAT',
        variant: number = 0,
        phase: number = 0
    ) {
        if (RenderStats.enabled) RenderStats.beginSubPhase('liquid');
        if (CtxOpCounter.enabled) CtxOpCounter.setScope('liquid');

        const loop = TERRAIN_LIQUID.loop;
        const set = TerrainLoopAtlas.getLiquid(color, layout, intensity, variant);
        const frame = set.frames[loopFrameIndex(time, loop.period, loop.frames, phase)];
        ctx.drawImage(frame, x - set.anchorX, y - set.anchorY, set.width ?? frame.width, set.height ?? frame.height);

        if (RenderStats.enabled) RenderStats.endSubPhase('liquid');
    },

    /**
     * 草叢風擺：3 叢草已預先合成同一張圖（每個 variant 一組），風擺為循環影格。
     * 每次呼叫只做一次 drawImage；x 決定相位偏移，讓風吹過草地形成波浪。
     */
    drawGrass(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        variant: number = 0
    ) {
        const c = GRASS_DETAIL;
        const set = TerrainLoopAtlas.getGrass(color, variant);
        const phase = (x * c.windXPhase) / TWO_PI;
        const frame = set.frames[loopFrameIndex(time, c.loop.period, c.loop.frames, phase)];
        ctx.drawImage(frame, x - set.anchorX, y - set.anchorY, set.width ?? frame.width, set.height ?? frame.height);
    },

    /**
     * 冰面反光：預渲染的已裁成六角形的反光循環影格，執行期不 clip、不建立漸層。
     */
    drawIceSheen(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        time: number,
        layout: HexLayout = 'FLAT'
    ) {
        const loop = ICE_SHEEN.loop;
        const set = TerrainLoopAtlas.getIce(layout, size);
        ctx.drawImage(set.frames[loopFrameIndex(time, loop.period, loop.frames)], x - set.anchorX, y - set.anchorY);
    },

    /**
     * 沙紋（靜態）：由 TerrainRenderer.bakeBlock 烘進地形 sprite，座標 (x, y) 為頂面中心。
     * 變化由地形 variant 決定（不再依螢幕座標）。
     */
    drawSandRipples(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string,
        variant: number = 0
    ) {
        const c = SAND_RIPPLES;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.strokeStyle = color;
        ctx.lineWidth = c.lineWidth;
        ctx.globalAlpha = c.alpha;
        const offset = c.offsetAmplitude * c.variantPhases[variant % c.variantPhases.length];
        for (let i = c.rowFrom; i <= c.rowTo; i++) {
            const ly = i * c.rowSpacing + offset;
            ctx.beginPath();
            for (let lx = c.xFrom; lx <= c.xTo; lx += c.xStep) {
                const wave = Math.sin(lx * c.waveFrequency + offset) * c.waveAmplitude;
                if (lx === c.xFrom) ctx.moveTo(lx, ly + wave);
                else ctx.lineTo(lx, ly + wave);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    /**
     * 地形紋路貼圖（靜態）：由 TerrainRenderer.bakeBlock 烘進地形 sprite，座標 (x, y) 為頂面中心。
     */
    drawDetailTexture(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        type: string,
        color: string,
        variant: number
    ) {
        const texture = VFXFactory.getTerrainDetail(type, color, variant);
        const size = texture.width;
        ctx.drawImage(texture, x - size/2, y - size/2);
    }
};
