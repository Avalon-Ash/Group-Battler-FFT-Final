# 0031 打光開啟時仿光效零件改成光

狀態：採用
日期：2026-11-28

## 背景

0029 接手自 0001 的一條是「特效一律走預烘焙零件」。打光通道常開（0030）之後，用得最多的仿光效零件（柔邊、加法的 `glow`）仍是一張蓋在畫面上的漸層貼圖：照不到地面與旁邊的單位，打光時還要再畫一次進特效遮罩。
`npm run perf:lit-cost` 量到桌機上多 64 盞點光 +0.16 ms、多 64 張光暈貼圖 +0.72 ms（`docs/plans/lighting-cost.md` §5.1，WORKLOG §2 DT）。使用者 11-28 要的方向是「仿光效特效全面改光效通道」「現代化」。
使用者 2026-11-28 另定：「新製程需求和舊 ADR 衝突時主代理直接決定，舊的不應該成阻礙項」。本份依此直接採用，修訂 0029「特效一律走預烘焙零件」在打光開啟時的做法；0029 其他各條與打光關閉時的做法不變，所以不標取代。

## 決定

- 只在打光開啟時改變做法：柔邊、加法的 `glow` 零件不再貼原尺寸的光暈圖，改登記成一盞不帶投影的點光（照到地面與單位），另畫一個縮小的發光核心（`LIGHTING.PART_LIGHT.CORE_SCALE`，0＝只有光）。打光關閉、WebGL2 拿不到、context 遺失期間照舊貼圖，保真基準不動。
- 「哪些零件是仿光效」只定義在 `engine/renderers/vfxparts/PartSpec.ts` 的 `partLight`；「這個零件這一幀是貼圖還是光」只在 `drawPart`（`engine/renderers/vfxparts/VFXPartStore.ts`）決定，依它畫在哪張畫布：世界畫布登記成光、遮罩畫布照同一個 op 世界那一趟登記的盞數一一對應、其他畫布（鋪設平面、主畫布）照舊。各 painter 不判斷打光狀態，特效資料（`data/vfx/**`）不改。
- 光的數量另有上限（`LIGHTING.PART_LIGHT.MAX`），和單位的光分開算，單位的光不會被擠掉；排不進去的零件照舊貼圖。光的顏色取零件色階的 main，不另定一張表；範圍與強度由零件畫出來的半徑與不透明度換算，數值在 `constants/lighting.ts`。
- 登記口在 `engine/renderers/lighting/PartLightSink.ts`（進入點，不讀 `LIGHTING`）；`LightingPass` 仍延後載入。

## 放棄的做法

- 每個光暈一盞帶投影的點光：P4 在桌機上分不出帶不帶投影，但投影是每像素 16 次取樣，推論手機上較貴；先用不帶投影。
- 只靠特效餘光（`LIGHTING.GLOW_LIGHT`）：延遲一幀、沒有位置與衰減，取代不了光暈。
- 逐招改特效資料：改成依零件種類全域生效，不需要動資料。

## 後果

- 空中一團亮的光暈變成照到東西的光；可讀性靠泛光、受光與縮小核心，外觀由原工作階段看對照板定調（`tools/ui-e2e/out/c2-boards/`，不進版控）。
- 鋪設平面（法陣）裡的 `glow` 零件畫在離屏平面上，仍是貼圖；狀態層、光環等畫在世界畫布上的柔邊 glow 一併改成光。
- 光的高度是假設值（空中 `HEIGHT_AIR`、貼地 `HEIGHT_GROUND`），不讀零件的實際高度。
- 桌機量測場景（凍結戰鬥每幀 3～9 盞零件光）：打光的額外成本 3.07～3.21 ms（第二批 3.06～3.29），光暈改成光的開關差在雜訊內；光暈多的奧義沒有單獨量時間。
- 打光開啟時的畫面沒有保真基準（同 0029）。手機上每盞光的成本還沒量（C6）。
- 上限附近同一個零件可能這一幀是光、下一幀是貼圖；`perf:lit-cost`、`perf:vfx-strip` 會報撞上限的幀數。

## 證據

- `docs/plans/lighting-cost.md` §5.1、§9
- `docs/WORKLOG.md` §2 DT、DU
- `engine/renderers/vfxparts/PartSpec.ts`
- `engine/renderers/vfxparts/VFXPartStore.ts`
- `engine/renderers/lighting/PartLightSink.ts`
- `engine/renderers/lighting/LightingPass.ts`
- `constants/lighting.ts`
- `tests/PartLight.test.ts`
- commit `ebbd545c`（機制）、`96d9a9c6`（對照板工具、初值）
- `docs/plans/lighting-cost.md` §4.3
- `docs/adr/0029-webgl-lighting-pass-over-canvas2d.md`
