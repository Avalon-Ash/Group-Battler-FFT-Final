// ╔══════════════════════════════════════════════════════════╗
// ║ StatusArtStore — 載入核可的共享附件圖集，不含人物或 HUD    ║
// ║ [ARCH] 準備一次；繪製只讀 image，無逐單位資源。           ║
// ╚══════════════════════════════════════════════════════════╝
import { STATUS_ART } from '../../../data/vfx/statusArt';
import { resolveAssetUrl } from '../units/SpriteAtlasStore';

class StatusArtStore {
    image: HTMLImageElement | null = null;
    readonly readyPromise: Promise<void>;
    constructor() {
        this.readyPromise = typeof Image === 'undefined' ? Promise.resolve() : new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => { this.image = image; resolve(); };
            image.onerror = () => { reject(new Error(`Failed to load status artwork: ${STATUS_ART.path}`)); };
            image.src = resolveAssetUrl(STATUS_ART.path);
        });
    }
}
export const statusArtStore = new StatusArtStore();
