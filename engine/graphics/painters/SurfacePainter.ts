import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
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
     * 液面：從循環影格快取取圖（顏色、layout、量化後 intensity 各一組，參數在 TERRAIN_LIQUID）。
     * 每次呼叫只做一次 drawImage；影格索引由 time 對週期取模決定，頭尾無縫銜接。
     */
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number,
        layout: HexLayout = 'FLAT'
    ) {
        if (RenderStats.enabled) RenderStats.beginSubPhase('liquid');
        if (CtxOpCounter.enabled) CtxOpCounter.setScope('liquid');

        const loop = TERRAIN_LIQUID.loop;
        const set = TerrainLoopAtlas.getLiquid(color, layout, intensity);
        ctx.drawImage(set.frames[loopFrameIndex(time, loop.period, loop.frames)], x - set.anchorX, y - set.anchorY);

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
        ctx.drawImage(set.frames[loopFrameIndex(time, c.loop.period, c.loop.frames, phase)], x - set.anchorX, y - set.anchorY);
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

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const texture = VFXFactory.getTexture('SMOKE_PUFF', color);
        const size = HEX_SIZE * 3.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.12;
        const puffs = 4;
        const twoPi = Math.PI * 2;
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.15 + (i * twoPi / puffs);
            const dist = 15 + Math.sin(time * 0.8 + i) * 8;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const pulse = 1.0 + Math.sin(time * 1.2 + i) * 0.15;
            const pSize = size * 0.55 * pulse;
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        ctx.globalAlpha = 0.18;
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawCracks(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        intensity: number
    ) {
        const texture = VFXFactory.generateCracks(color);
        const size = HEX_SIZE * 2.4;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        ctx.rotate((x * 0.001) + (y * 0.001));
        ctx.drawImage(texture, -size/2, -size/2, size, size);
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
