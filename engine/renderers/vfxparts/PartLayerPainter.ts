// ╔══════════════════════════════════════════════════════════╗
// ║  PartLayerPainter — 共用零件層（data/vfx/parts/partLayer）  ║
// ║  職責：把一層解析成 PartSprite（resolvePartLayer，呼叫端快取）║
// ║        並在錨點畫出份數／繞行／上升／自轉／律動／抖動        ║
// ║        （drawPartLayer，每幀只做 drawImage 與變換，零配置）  ║
// ║  [ARCH] 錨點由呼叫端給（螢幕座標，已含漂浮與高度）；這裡只   ║
// ║  加相對偏移。flat 層在地面平面旋轉到版面方向（align）再壓扁 ║
// ║  ISO_SCALE_Y；prism（立體零件）的版面在解析時注入、不旋轉。  ║
// ╚══════════════════════════════════════════════════════════╝

import type { HexLayout } from "../../../types";
import { ISO_SCALE_Y } from "../../../constants";
import { VFX_PARTS } from "../../../data/vfx/parts/partConfig";
import type { PartLayer } from "../../../data/vfx/parts/partLayer";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { vfxPartStore, drawPart, partFrameAt, type PartSprite, type DrawPartOptions } from "./VFXPartStore";
import type { PartSpec } from "./PartSpec";

const TAU = Math.PI * 2;

export interface ResolvedPartLayer<L extends PartLayer = PartLayer> {
    layer: L;
    sprite: PartSprite;
    /** 份數（至少 1） */
    count: number;
}

/** 每幀暫存（重用，不配置） */
const OPTS: DrawPartOptions = { frame: 0, scale: 1, scaleY: 1, rotation: 0, alpha: 1 };

/** 貼地零件在這個版面要轉多少（FLAT 為 0） */
export function layoutAlign(layout: HexLayout): number {
    return HexGeometry.alignRotation(layout, VFX_PARTS.HEX.ANGLE_OFFSET_RAD);
}

/** 解析一層：紅隊色階覆寫、立體零件注入版面、貼地零件依版面烘焙圖騰方向。呼叫端負責快取結果。 */
export function resolvePartLayer<L extends PartLayer>(layer: L, team: number, layout: HexLayout): ResolvedPartLayer<L> {
    let spec: PartSpec = layer.spec;
    if (team === 1 && layer.rampRed && 'ramp' in spec) spec = { ...spec, ramp: layer.rampRed } as PartSpec;
    if (spec.kind === 'prism') spec = { ...spec, layout };
    return { layer, sprite: vfxPartStore.get(spec, layer.flat ? layoutAlign(layout) : 0), count: Math.max(1, layer.count ?? 1) };
}

/** 在錨點 (x, y) 畫一層。alphaMul 給整組淡入淡出用（危害快結束時）。 */
export function drawPartLayer(ctx: CanvasRenderingContext2D, r: ResolvedPartLayer, x: number, y: number, t: number, align: number, alphaMul: number = 1): void {
    const L = r.layer;
    const C = VFX_PARTS.LAYER;
    const orbitR = L.orbitRadius ?? 0;
    const orbitSpd = L.orbitSpeed ?? 0;
    let scale = L.scale ?? 1;
    if (L.pulse) scale *= 1 + L.pulse.amp * Math.sin(t * TAU * L.pulse.hz);
    let lift = L.lift ?? 0;
    if (L.bob) lift += L.bob.amp * Math.sin(t * TAU * L.bob.hz);
    let rotation = L.rotation ?? 0;
    if (L.spin) rotation += t * L.spin;
    if (L.flat) rotation += align;
    const shakeX = L.shake ? Math.sin(t * TAU * C.SHAKE_HZ) * L.shake : 0;
    const shakeY = L.shake ? Math.cos(t * TAU * C.SHAKE_HZ * C.SHAKE_Y_HZ_MUL) * L.shake * C.SHAKE_Y_AMP : 0;
    const frame = partFrameAt(r.sprite, t);
    const baseAlpha = (L.alpha ?? 1) * alphaMul;
    // 沒有繞行也沒有上升：各份均分旋轉角（漩渦臂），否則疊在同一點毫無意義
    const fan = !L.rise && orbitR <= 0;
    const n = r.count;
    for (let i = 0; i < n; i++) {
        const phase = i / n;
        let ox = 0;
        let oy = 0;
        let alpha = baseAlpha;
        if (L.rise) {
            const p = (t / L.rise.period + phase) % 1;
            oy = -p * L.rise.height;
            alpha *= Math.sin(p * Math.PI);
            ox = Math.cos(phase * TAU * C.GOLDEN_ANGLE) * orbitR;
        } else if (orbitR > 0) {
            const a = phase * TAU + t * orbitSpd;
            ox = Math.cos(a) * orbitR;
            oy = Math.sin(a) * orbitR * ISO_SCALE_Y;
        }
        OPTS.frame = frame;
        OPTS.scale = scale;
        OPTS.scaleY = L.flat ? ISO_SCALE_Y : 1;
        OPTS.rotation = fan ? rotation + phase * TAU : rotation;
        OPTS.alpha = alpha;
        OPTS.blend = L.blend;
        drawPart(ctx, r.sprite, x + ox + shakeX, y - lift + oy + shakeY, OPTS);
    }
}
