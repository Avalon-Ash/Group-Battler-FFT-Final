
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, UNIT_VISUAL_HEIGHT } from "../../constants";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_Design_Spec_v${new Date().toISOString().split('T')[0]}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL BATTLE SYSTEM - DESIGN SPECIFICATION
Generated: ${new Date().toLocaleString()}
Engine Version: 4.0.3 (Tactical.OS)
================================================================================

[1. 全域物理與環境設定 (Physics & Environment)]
--------------------------------------------------------------------------------
系統採用 2.5D 等距視角 (Isometric)，但在邏輯上運行於 3D 座標系 (x, y, z)。

* 重力常數 (Gravity): ${1800} units/s²
  - 影響所有空中單位、被擊飛單位以及物理碎片。
  - 地面單位預設緊貼地形高度 (z = 地形高度)。

* 地形規則 (Terrain):
  - 網格系統: 六角網格 (Hexagonal Grid)。
  - 高度層級: 最大 ${MAX_TERRAIN_TIER} 層。
  - 單層高度: ${BLOCK_HEIGHT} px。
  - 單位高度標準: ${UNIT_VISUAL_HEIGHT} px。

* 阻擋規則 (Obstacles):
  - 視線阻擋 (Line of Sight): 是 (牆壁、樹木、柱子)。
  - 移動阻擋 (Movement): 是 (所有障礙物)。
  - 飛行阻擋 (Fly Logic): 部分障礙物 (如高聳的黑曜石柱) 可阻擋飛行單位。

[2. 移動與導航邏輯 (Movement & Navigation)]
--------------------------------------------------------------------------------
* 地面單位 (Ground Units):
  - 移動方式: 沿網格中心點路徑移動。
  - 地形限制: 只能跨越高度差 <= 跳躍力 (Jump Stat) 的相鄰網格。
  - 預設跳躍力: 1~2 層 (依職階而定)。
  - 物理表現: 移動時會有微幅的 "呼吸" 浮動與傾斜。

* 飛行單位 (Flying Units):
  - 移動方式: 直線飛行，或沿網格中心點 (視尋路演算法而定)。
  - 地形限制: 無視地形高度差與地面障礙物 (除非障礙物標記為 BlocksFlying)。
  - 懸浮高度: 55px (受重力與懸浮力動態平衡)。
  - 墜落機制: 若受到 [暈眩/冰凍/變形] 狀態，引擎會切斷懸浮力，導致單位墜落地面。

* 堆疊處理 (Stacking):
  - 規則: 同一網格在靜止狀態下不可重疊。
  - 解析: 若多單位因位移重疊，系統會將其向周圍空網格推擠 (Force: 5)。

[3. 尋敵與戰鬥判定 (Targeting & Combat)]
--------------------------------------------------------------------------------
* 索敵權重 (Targeting Priority):
  1. 優先尋找 [射程內] 的敵方單位。
  2. 若多個目標在射程內，選擇 [距離最近] 者。
  3. 特殊邏輯: [沉默] 類技能會優先鎖定 [正在詠唱] 或 [擁有奧義] 的目標。

* 高地優勢 (High Ground Mechanics):
  - 公式: EffectiveRange = BaseRange + max(0, floor(HeightDiff / BlockHeight))
  - 描述: 攻擊方每高於目標 1 層地形 (${BLOCK_HEIGHT}px)，射程 +1 格。
  - 低地懲罰: 無 (避免遊戲體驗過於挫折)。

* AOE 判定 (Area of Effect):
  - 判定方式: 圓形/六角形半徑檢測。
  - 友軍傷害 (Friendly Fire): 無 (技能只篩選敵對陣營)。
  - 命中判定: 以目標所在的網格中心點計算距離。

[4. 狀態效果定義 (Status Effects Rules)]
--------------------------------------------------------------------------------
以下定義各類狀態標籤 (Tag) 在引擎中的具體行為：

[HARD CC - 硬控場]
* STUN (暈眩):
  - 行為: 禁止移動 (isMoving=false)、禁止施法、中斷當前詠唱。
  - 視覺: 頭頂出現旋轉星星光環。
  - 物理: 飛行單位失去升力。

* BANISH (放逐):
  - 行為: 無敵狀態、無法被選取為目標、禁止動作、中斷詠唱。
  - 視覺: 單位變透明或被籠子/特效包覆。
  - 變體 POLYMORPH (變形): 視為放逐，但強制替換模型為 [綿羊]，並在地面亂跑。
  - 變體 STASIS (凝滯): 視為放逐，但凍結動畫幀並變成金色。

[SOFT CC - 軟控場]
* SILENCE (沉默):
  - 行為: 禁止施放 [ACTIVE] 與 [ULT] 技能。允許 [BASIC] 普攻與移動。
  - 視覺: 頭頂出現符文封印。

* KNOCKBACK / PULL (擊退/牽引):
  - 行為: 強制施加物理速度向量 (Velocity)。
  - 規則: 無視地形高度 (可被推下懸崖或推上高地)。
  - 抵抗: 單位的 [Weight] 屬性可抵銷推力距離。

[DOT / HOT - 持續效果]
* DOT (Damage over Time):
  - 行為: 每 tick 扣除 HP，可能觸發受擊閃爍但不打斷動作。
* HOT (Heal over Time):
  - 行為: 每 tick 回復 HP。

[5. AI 行為樹結構 (Standard Behavior Tree)]
--------------------------------------------------------------------------------
所有單位預設使用以下決策邏輯 (由上而下優先權):

ROOT (Selector)
 ├── [死亡檢查] Sequence
 │    ├── 條件: HP <= 0
 │    └── 動作: 進入死亡狀態 (停止思考)
 │
 ├── [被控檢查] Sequence
 │    ├── 條件: 被暈眩 OR 被放逐
 │    └── 動作: 等待 (Wait)
 │
 └── [戰鬥循環] Sequence
      ├── [索敵] Condition: 掃描視野內最近敵人
      │
      └── [技能決策] Selector (依序嘗試)
           ├── [奧義] Sequence (Slot 0)
           │    ├── 條件: CD就緒 & MP足夠 & 射程內 & 未沉默
           │    └── 動作: 
           │         ├── 計算最佳施法點 (AOE最大化/單體斬殺)
           │         ├── 移動至施法點 (若需)
           │         └── 執行詠唱
           │
           ├── [主動技] Sequence (Slot 1)
           │    └── (邏輯同上)
           │
           ├── [普攻] Sequence (Slot 2)
           │    └── (邏輯同上)
           │
           └── [預設移動] Action
                └── 動作: 往最近敵人的座標移動 (Pathfinding)

================================================================================
END OF SPECIFICATION
`;
    }
}
