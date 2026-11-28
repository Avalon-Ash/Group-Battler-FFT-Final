// ╔══════════════════════════════════════════════════════════╗
// ║  PartLightSink — 仿光效零件改成光的登記口（ADR 0031）       ║
// ║  職責：drawPart（進入點）與 LightingPass（延後載入）之間    ║
// ║        唯一的介面。LightingPass 建構時登記自己；沒有登記    ║
// ║        （打光關閉、還在載入、WebGL2 拿不到）時 drawPart 照  ║
// ║        舊貼圖。這個檔不 import LIGHTING：表只進打光 chunk， ║
// ║        核心縮放由 sink 回傳。                              ║
// ║  上游：vfxparts/VFXPartStore.drawPart                       ║
// ║  [ARCH] 不改任何座標：位置是 drawPart 當下變換的裝置像素，  ║
// ║         換回世界座標只在 LightingPass.present（RenderSpec   ║
// ║         §1 尾段）。                                        ║
// ╚══════════════════════════════════════════════════════════╝

/** world＝世界畫布（登記成光）；mask＝遮罩畫布（照世界那一趟的決定）；null＝其他畫布（照舊貼圖） */
export type PartLightRole = 'world' | 'mask';

export interface PartLightSink {
    roleOf(canvas: HTMLCanvasElement): PartLightRole | null;
    /**
     * 世界那一趟：登記一盞光（裝置像素的中心與半徑、是不是貼地零件、0～1 顏色、不透明度×增益）。
     * 回核心縮放（0＝不畫核心）；排不進上限回 −1，呼叫端照舊貼圖。
     */
    addPartLight(devX: number, devY: number, devRadius: number, ground: boolean, color: readonly [number, number, number], strength: number): number;
    /** 遮罩那一趟：同一個 op 在世界那一趟登記成光的零件，照順序一一對應；回核心縮放，沒有對應的回 −1（照舊貼圖） */
    takeMaskLight(): number;
}

let sink: PartLightSink | null = null;

export function setPartLightSink(s: PartLightSink | null): void {
    sink = s;
}

export function getPartLightSink(): PartLightSink | null {
    return sink;
}
