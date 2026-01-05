
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_OS_v9.3_System_Architecture.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL.OS - 系統架構白皮書 (Kernel v9.3)
Generated: ${new Date().toLocaleString()}
Status: PRODUCTION_READY
================================================================================

[1. 視覺投影 SSOT 規範 (Spatial Truth)]
--------------------------------------------------------------------------------
系統強制執行「單一座標真理來源」，所有 2D 渲染必須遵循下列公式：
V_Y = (World_Y * ISO_SCALE_Y) - World_Z + Layer_Bias

* ISO_SCALE_Y: ${ISO_SCALE_Y}
* BLOCK_HEIGHT: ${BLOCK_HEIGHT}
* UNIT_BODY_OFFSET: ${UNIT_BODY_OFFSET}
* HORIZON_BIAS: ${VisualMath.HORIZON_Y_PCT} (Screen Height %)

[2. UI 架構映射 (UI Architecture Map)]
--------------------------------------------------------------------------------
React Overlay Layer (Interactive)
  |
  +-- SystemMenu (Global Control)
  |     +-- ModalManager (Lazy Loaded)
  |           +-- LogTab (Virtual Scroll, Kinetic)
  |           +-- SkillDbTab (Data Editor)
  |           +-- VFXMapTab (Asset Preview)
  |
  +-- HUD Layer (Game Context)
  |     +-- PlaybackHUD (Timeline Control)
  |     +-- UnitInspectorHUD (Draggable Entity Monitor)
  |     +-- DirectorMonitorHUD (Auto-Cam Debugger)
  |     +-- MapEditorToolbar (Creative Mode)
  |
  +-- ShowcaseOverlay (Attract Mode)
        +-- MatrixRain (Canvas Effect)

[3. 特效渲染管線 (VFX Pipeline Map)]
--------------------------------------------------------------------------------
GameEvent (Logic) -> EventVFXMapper (Adapter) -> VFXSystem (State)
                                                      |
[Render Loop] ----------------------------------------+
      |
      v
RenderPipeline
  +-- RenderList (Sort & Cull)
  +-- RenderDispatcher
        |
        +-- TerrainRenderer (Environment)
        +-- HazardPainter (Grid Overlay)
        +-- UnitRenderSystem (Assembly)
        |     +-- UnitBodyPainter
        |     +-- UnitShadowPainter
        |     +-- UnitStatusPainter
        |
        +-- ProjectileDrawer (Ballistics)
        +-- ParticleRenderer (Emitters)
              +-- ProceduralPainter (Vector Geometry)
              +-- BillboardPainter (Sprite/Texture)
              +-- GroundPainter (Decals)

[4. 美術資產依存性 (Asset Dependencies)]
--------------------------------------------------------------------------------
* UnitFactory:
  - Base Token (Procedural Canvas)
  - Role Icons (Vector Paths)
  
* EnvironmentFactory:
  - Obstacles: Tree, Crystal, Pillar, Wall (Generated on-demand)
  
* VFXFactory:
  - Textures: Smoke, Glow, Spark, Cracks (Procedural Canvas)
  - Details: Grass, Terrain Noise
  
* UI Factory:
  - Icons: Skill Icons, Status Hexes

[5. 自動導播邏輯 (Auto Director)]
--------------------------------------------------------------------------------
- 權重評分系統：(奧義 50pt, 受擊 15pt, 移動 5pt, 靜止 0pt)
- 平滑演算法：Exponential Smoothing (Damping: 0.8 ~ 3.0)
- 響應式縮放：根據視窗長寬比動態調整 Zoom Level (Idle/Combat/Ult)

================================================================================
END OF SPECIFICATION - SYSTEM ARCHITECT SIGNED
`;
    }
}
