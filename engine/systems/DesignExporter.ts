import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_OS_v9.3_Final_Spec.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL.OS - 核心技術規格文檔 (Kernel v9.3)
Generated: ${new Date().toLocaleString()}
Status: RELEASE_READY
================================================================================

[1. 視覺投影 SSOT 規範]
--------------------------------------------------------------------------------
系統強制執行「單一座標真理來源」，所有 2D 渲染必須遵循下列公式：
V_Y = (World_Y * ISO_SCALE_Y) - World_Z + Layer_Bias

* ISO_SCALE_Y: ${ISO_SCALE_Y}
* BLOCK_HEIGHT: ${BLOCK_HEIGHT}
* UNIT_BODY_OFFSET: ${UNIT_BODY_OFFSET}

[2. 彈道幾何 (Projectile Ballistics)]
--------------------------------------------------------------------------------
為防止渲染偏差，Projectile 對象在 Spawn 時即進行「真理鎖定」：
- startPos{x,y,z}, endPos{x,y,z} 在飛行生命週期內為 Immutable 常數。
- 渲染層僅讀取進度 T (0.0~1.0) 並調用 TrajectoryMath 進行解析解運算。

[3. 特效序列引擎 (VFX Sequence Engine)]
--------------------------------------------------------------------------------
採用非同步序列隊列 (SequenceSystem)：
- 動態解析 VFXAction JSON，支持延遲觸發與連鎖演出。
- 支持類別：PARTICLE, BEAM, SHAKE, GRID_PULSE, HEAVEN_FALL。
- 時間軸與 GameEngine.battleTime 嚴格同步。

[4. 性能優化策略]
--------------------------------------------------------------------------------
- RenderList 物件池：消除每幀生成數千個 RenderOp 的內存開銷。
- 空間雜湊網格：地圖點選與碰撞查詢複雜度為 O(1)。
- 預渲染精靈 (Grass/Terrain)：地表裝飾不參與幾何積分，直接使用緩存位圖。

[5. 運鏡邏輯 (Auto Director)]
--------------------------------------------------------------------------------
- 基於權重評分的鏡頭系統：(奧義 50pt, 受擊 15pt, 移動 5pt)。
- 指數緩動 (Exponential Smoothing) 消除幀率依賴的鏡頭抖動。

================================================================================
END OF SPECIFICATION - SYSTEM ARCHITECT SIGNED
`;
    }
}