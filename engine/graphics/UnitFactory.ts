import { HexLayout, Role } from "../../types";
import { ISO_SCALE_Y } from "../../constants";
import { createCanvas } from "./CanvasUtils";
import { ImperialTokenFactory } from "./units/ImperialTokenFactory";
import { CovenantTokenFactory } from "./units/CovenantTokenFactory";
import { FactionSkin, PedestalStyle } from "../../data/units/factionSkin";
import { MATERIAL_CONFIG } from "../../data/vfx/materialConfig";
import { MaterialPainter } from "./materials/MaterialPainter";
import { PedestalOutline, tracePedestalOutline } from "./units/PedestalGeometry";
import { CLASS_GLYPHS, CLASS_GLYPH_STYLE, type GlyphStyleId } from "../../data/units/classGlyphs";

/** 棋座畫布尺寸（UnitShadowPainter 以 -BASE/2 對齊中心） */
export const PEDESTAL_CANVAS_SIZE = 128;
/** 職業字形的設計半幅（drawClassGlyph 座標約 ±14），用來把字形縮放到 skin.classIcon.scale × radius */
const CLASS_GLYPH_HALF_EXTENT = 14;

/**
 * 棋座程序化畫法（貼圖槽缺席時的退路）。
 * 每個步驟各自可被手繪貼圖取代：頂面 ← pedestalTexture、邊框 ← pedestalRim、徽記 ← emblem、職業字形 ← classIcon。
 */
export interface PedestalPainter {
    outline(skin: FactionSkin, layout: HexLayout): PedestalOutline;
    drawSlab(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void;
    drawTop(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void;
    drawRim(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline, layout: HexLayout): void;
    drawEmblem(ctx: CanvasRenderingContext2D, skin: FactionSkin, layout: HexLayout): void;
}

/** 已載入的手繪貼圖（null = 該槽走程序化） */
export interface PedestalTextures {
    pedestalTexture: CanvasImageSource | null;
    pedestalRim: CanvasImageSource | null;
    emblem: CanvasImageSource | null;
    classIcon: CanvasImageSource | null;
}

const PEDESTAL_PAINTERS: Record<PedestalStyle, PedestalPainter> = {
    LIONHEART_HEX: ImperialTokenFactory,
    ASHEN_BROKEN_HEX: CovenantTokenFactory,
};

/**
 * 繪製俯視貼圖（正方形，內切半徑 halfSize 的外接圓），在此套用等距壓扁；
 * 貼圖以 FLAT 六角（頂點朝左右）繪製，POINTY 地圖自動旋轉 30°。
 */
function drawTopDownTexture(
    ctx: CanvasRenderingContext2D,
    tex: CanvasImageSource,
    halfSize: number,
    layout: HexLayout,
    blend: GlobalCompositeOperation,
    alpha: number,
    clip: PedestalOutline | null
): void {
    ctx.save();
    if (clip) {
        tracePedestalOutline(ctx, clip);
        ctx.clip();
    }
    ctx.globalCompositeOperation = blend;
    ctx.globalAlpha = alpha;
    ctx.scale(1, ISO_SCALE_Y);
    if (layout === 'POINTY') ctx.rotate(Math.PI / 6);
    ctx.drawImage(tex, -halfSize, -halfSize, halfSize * 2, halfSize * 2);
    ctx.restore();
}

/**
 * 職業字形刻在棋座頂面（取代舊的懸浮職業圖示看板）：有 classIcon 貼圖就貼（俯視，等距壓扁），否則畫程序化字形。
 * 烘焙期執行，shadowBlur 只在這裡用。
 */
function drawEngravedGlyph(
    ctx: CanvasRenderingContext2D,
    role: Role,
    skin: FactionSkin,
    texture: CanvasImageSource | null,
    layout: HexLayout
): void {
    const half = skin.pedestal.radius * skin.classIcon.scale;
    if (texture) {
        drawTopDownTexture(ctx, texture, half, layout, 'source-over', skin.classIcon.alpha, null);
        return;
    }
    const k = half / CLASS_GLYPH_HALF_EXTENT;
    ctx.save();
    ctx.globalAlpha = skin.classIcon.alpha;
    ctx.scale(1, ISO_SCALE_Y);
    ctx.scale(k, k);
    ctx.strokeStyle = skin.classIcon.color;
    ctx.fillStyle = skin.classIcon.color;
    ctx.shadowColor = skin.classIcon.glow;
    ctx.shadowBlur = 6;
    drawClassGlyph(ctx, role, skin.classIcon.glyph);
    ctx.restore();
}

/** 職業圖示的程序化字形：形狀與風格來自 data/units/classGlyphs.ts，顏色由皮膚決定 */
function drawClassGlyph(ctx: CanvasRenderingContext2D, role: Role, glyph: GlyphStyleId): void {
    const style = CLASS_GLYPH_STYLE[glyph];
    ctx.lineJoin = style.lineJoin;
    ctx.lineCap = style.lineCap;
    for (const shape of CLASS_GLYPHS[glyph][role]) {
        ctx.beginPath();
        if (shape.kind === 'circle') {
            ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
        } else {
            const p = shape.pts;
            ctx.moveTo(p[0], p[1]);
            for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
            if (shape.close) ctx.closePath();
        }
        if (shape.solid) {
            ctx.fill();
            continue;
        }
        if (shape.fillAlpha) {
            const prev = ctx.globalAlpha;
            ctx.globalAlpha = prev * shape.fillAlpha;
            ctx.fill();
            ctx.globalAlpha = prev;
        }
        ctx.lineWidth = (shape.kind === 'poly' && shape.width) || style.lineWidth;
        ctx.stroke();
    }
}

export const UnitFactory = {

    /**
     * 烘焙棋座：程序化分層，每層若有手繪貼圖則以貼圖取代。結果由 SpriteManager 快取（執行期零成本）。
     */
    generateTokenBase(skin: FactionSkin, role: Role, layout: HexLayout, textures: PedestalTextures): HTMLCanvasElement {
        const painter = PEDESTAL_PAINTERS[skin.pedestal.style];
        const { canvas, ctx } = createCanvas(PEDESTAL_CANVAS_SIZE, PEDESTAL_CANVAS_SIZE);
        ctx.translate(PEDESTAL_CANVAS_SIZE / 2, PEDESTAL_CANVAS_SIZE / 2);
        const outline = painter.outline(skin, layout);
        const p = skin.pedestal;

        painter.drawSlab(ctx, skin, outline);

        if (textures.pedestalTexture) {
            drawTopDownTexture(ctx, textures.pedestalTexture, p.radius, layout, p.textureBlend, p.textureAlpha, outline);
        } else {
            painter.drawTop(ctx, skin, outline);
        }

        if (textures.pedestalRim) {
            drawTopDownTexture(ctx, textures.pedestalRim, p.radius, layout, 'source-over', 1, null);
        } else {
            painter.drawRim(ctx, skin, outline, layout);
        }

        if (textures.emblem) {
            drawTopDownTexture(ctx, textures.emblem, p.radius * p.emblemScale, layout, 'source-over', 1, null);
        } else {
            painter.drawEmblem(ctx, skin, layout);
        }

        drawEngravedGlyph(ctx, role, skin, textures.classIcon, layout);

        if (MATERIAL_CONFIG.enabled && MATERIAL_CONFIG.unit?.token?.enabled) {
            MaterialPainter.weatherToken(canvas, p.weatherHighlight);
        }
        return canvas;
    },

    // Special Shared Models (Sheep, IceBlock) remain here as utils
    generateSheep(): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(64, 64);
        const cx = 32, cy = 45;

        ctx.fillStyle = '#e2e8f0';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;

        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI*2);
        ctx.arc(cx-10, cy-5, 10, 0, Math.PI*2);
        ctx.arc(cx+10, cy-5, 10, 0, Math.PI*2);
        ctx.fill();

        return canvas;
    }
};
