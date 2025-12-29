
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, UNIT_VISUAL_HEIGHT, COMBAT_PARAM, ISO_SCALE_Y, UNIT_SCALE, UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from "../../constants";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_Design_Spec_v9.1_RC.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL BATTLE SYSTEM - TECHNICAL DESIGN SPECIFICATION
Version: 9.1 (Release Candidate - Hybrid ECS)
Generated: ${new Date().toLocaleString()}
Architecture: Hybrid Component System / SSOT Physics
================================================================================

[1. 系統架構圖 (System Dependency Graph)]
--------------------------------------------------------------------------------
本系統採用單向數據流 (Unidirectional Data Flow) 以確保狀態一致性。

[INPUT] -> [GAME STATE] -> [SYSTEMS] -> [RENDER LIST] -> [CANVAS]

A. 核心數據層 (Core Data):
   - Agent (Container): 包含 PhysicsComponent, StatsComponent, SkillComponent
   - MapSystem: 空間雜湊 (Spatial Hash) 與地形數據
   
B. 系統層 (Systems - Pure Logic):
   1. AI System: 決策樹 (Behavior Tree) -> 產生 Intent
   2. Motion System: 路徑計算 (A*) -> 更新 Agent.pos (Logical)
   3. Physics System: 力學積分 (Verlet/Euler) -> 更新 Agent.physics (Physical)
   4. Combat System: 狀態機 -> 產生 GameEvents

C. 表現層 (Presentation - Pure Visual):
   1. RenderPipeline: 收集數據 -> 生成 RenderOp (無副作用)
   2. VFX System: 解析 GameEvents -> 播放 Particle Sequences
   3. UI Layer (React): 訂閱 Agent 狀態 (Reactive)

[2. 渲染架構 (Rendering Pipeline)]
--------------------------------------------------------------------------------
* 視覺解耦:
  - 邏輯層 (SkillDatabase) 僅定義數值。
  - 表現層 (SkillSequences) 定義視覺演出 (JSON Actions)。
  - 渲染循環僅進行數據查表與座標投影，不執行遊戲邏輯。

* 座標真理 (Coordinate SSOT):
  - 邏輯座標 (Logical): Hex (q, r) - 用於判定命中、射程。
  - 物理座標 (Physical): Px (x, y, z) - 用於繪圖、碰撞。
  - 視覺錨點: VisualMath.getUnitAnchor() 統一計算 3D 空間點。

[3. 美術與特效規範 (Art & VFX)]
--------------------------------------------------------------------------------
* 投影比例 (ISO_SCALE_Y): ${ISO_SCALE_Y} (標準 2:1 SRPG 比例)
* 單位偏移 (Body Offset): ${UNIT_BODY_OFFSET}px (懸浮修正)
* 陣營色系:
  - IMPERIAL (藍): #3b82f6 (Primary), #fbbf24 (Highlight)
  - COVENANT (紅): #ef4444 (Primary), #7f1d1d (Dark)

[4. 效能優化策略 (Optimization)]
--------------------------------------------------------------------------------
* RenderList Pooling: 每一幀重用 RenderOp 物件，由 GC 壓力降至零。
* Spatial Hashing: 地圖查詢由 O(N) 降至 O(1)。
* Texture Caching: VFXFactory 緩存所有生成的程序化紋理。

================================================================================
END OF SPECIFICATION
`;
    }
}
