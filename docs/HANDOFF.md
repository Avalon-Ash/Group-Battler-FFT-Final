# 交接：還沒做的事（TBD）

> 更新：2026-10-19。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），沒有進行中的分支，也沒有低階代理在跑。push 狀態以 `git status -sb` 為準。
- 視覺路線圖 `docs/VISUAL_ROADMAP.md` §0 已全部完成（VFX V1～V7、障礙物 O1～O4、地形 T0～T5）。下一輪由使用者從 §4 挑。

## 2. 待使用者實機確認
- 詠唱法陣亮度與大小、技能紋章新樣式（太陽改八芒星）、縮圈紅格是否夠醒目、239 Hz 主螢幕下鋸齒是否改善。
- 新障礙物與動態（樹風擺、冰晶星芒、黑曜柱發光）、熔岩液面、草叢與崖邊裝飾、天氣／霧氣／光柱／熱浪。
- 冰／沙地圖的特效亮度、護盾稜柱貼合（含飛行單位）、危害新外觀。
- 擊飛距離與彈跳手感、是否閃爍、屍體 5.5 秒殘留是否太久。
- 熔岩圖流暢度：若卡，開 `?perf` 重現，在 console 貼 `JSON.stringify(window.__PERF_SPIKES__)`。
- 大逃殺縮圈是否乾淨。
- 個別奧義美術細調（U1 只修了結構）。

## 3. 待使用者決定
- 網格線改低對比染色細線（`VISUAL_ROADMAP.md` D2）：T2 已降落差描邊對比，是否還要再改。
- 遠端仍有分支 `20260328`、`experiment/unit-rig-skin-poc`（本地已刪）：要不要刪遠端。
- 縮圈墜落的單位是否需要專屬「墜落」動畫（目前垂直掉入虛空後立即回收）。
- 重新部署的方式（Cloud Run 相關檔案已刪）。

## 4. 待辦池（無順序，使用者要時再開）
1. 地形烘焙實作（設計 `docs/BAKED_RENDERING_DESIGN.md`、原型 `tools/baked-terrain-proto.html`）；先確認熔岩圖現況是否已夠順。
2. 每個地圖主題一首 BGM；紅方勝利曲換成真正的暗黑曲。
3. FEMALE 與其他體型、專用神職模型、加強陣營辨識度（`docs/ASSET_NEEDS.md`）。
4. 手機版 UI 全面巡檢（第一輪見 `docs/MOBILE_UI_AUDIT.md`）。
5. 狀態所有權 P11（渲染系統搬到 `engine/presentation/`，拆掉系統↔渲染雙向 import）、P12（視覺欄位改 `agent.view` 子物件）。可選、機械性，見 `docs/STATE_OWNERSHIP_DESIGN.md` §8。
6. 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），UNIT×VFX 那部分是雙方真的在動，觀察即可。
