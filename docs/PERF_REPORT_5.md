# 效能五：每幀渲染熱點清除（2026-10-16）

分支 `claude/round5-0335c3`，5 個 commit（`6a4ee05`..`833dff7`）。未合併、未 push。

## 量測（`npm run perf:frames`，2560×1440，RTX 4070，各 20 秒 × 3 輪）

| 情境 | Median 前→後 (ms) | p99 前→後 (ms) | >16.7ms 幀數 前→後 |
| :-- | :-: | :-: | :-: |
| battle_calm | 8.3 → 8.3 | 12.6 → **16.6** | 36 → 59 |
| battle_vfx_storm | 8.3 → 8.3 | 16.6 → **12.6** | 65 → 33 |
| showcase | 4.2 → 4.2 | 12.6 → 12.6 | 20 → 29 |

解讀：rAF 幀時間被 vsync 量化（4.2 ms 的倍數），p99 跳一格就是 ±4 ms。特效風暴（本輪目標）變好，平靜對戰與展示變差。**結論不確定，在雜訊範圍內**，需要 A/B 重跑數次，或用 `perf:attribution` 量 CPU 時間才能下定論。

## 檢查
- `npm run lint`、`npm test`（37 個檔案／344 項測試）、`npm run build`：全綠。
- `npm run perf:guard`：通過。保真 6/6 PASS，基準未重錄、門檻未放寬。battle_frozen 的 meanAbsDiff 為 0.214；尚未在 `main` 上量對照值。

## 各熱點改了什麼
1. **`RenderList` `RenderOp.clear()`**：`pTrail = []` 改為 `pTrail.length = 0`，`ProjectileRenderer` 同樣改法。只有 `ProjectileDrawer` 在同一幀內以區域變數讀取，沒有其他地方持有參照。
2. **基礎設施**：新增 `engine/renderers/UnitGradientCache.ts`，以色彩為鍵快取單位座標漸層，繪製時用 CTM 對映到實際端點，像素結果與原寫法等價。新增 `engine/renderers/hud/GlowTextCache.ts`，以 文字／字型／色／blur／量化裝置縮放 為鍵預烘焙 shadowBlur 光暈。參數放在 `constants.ts` 的 `RENDER_HOTSPOT_CACHE`、`SHOUT_GLOW`。
3. **`ProjectileDrawer`**：帝國尾跡的線性漸層改用 translate＋rotate＋等比 scale（lineWidth÷長度）；頭部光暈的徑向漸層改用 scale(flareR)。聖約尾跡逐段 stroke 未改（不同寬度／alpha 無法合併而不改畫面）。
4. **光束**：`MaterialPainter.drawLayeredBeam` 每管每幀的漸層改為快取單位漸層＋scale(1,w)；`[-1,1]`／`setLineDash([])` 改為共用陣列。`ProceduralPainter` 死光虛線改用共用陣列。黑洞的徑向漸層與 `shadowBlur` **未改**。
5. **`TextPainter`**（只動詠唱、ULT、SUCCESS；BREAK／Glitch 與頂端 `isShattered` 亂流**未動**）：詠唱條漸層改用快取；文字光暈（10／20）與掃描線光暈（15）改用預烘焙 sprite。SUCCESS 的光暈依壽命以 3 為級距量化。字型字串依字級快取（傷害數字與 KILL_STREAK 也適用）。
   - 已知差異：SUCCESS 的橫向擴散線原本被同一個 shadowBlur 帶出光暈，現在沒有光暈；縮放（ULT 脈動、彈出）時光暈會跟著縮放約 ±5～20%。
6. **`UnitCorePainter` 受創 `shadowBlur`**：檔案已不存在，`SpriteUnitRenderer` 也沒有 shadowBlur，無需處理。**`FloatingTextDrawer`**：不存在，浮動文字在 `TextPainter`，處理方式見第 5 點的字型快取。

## 未完成
- 量測結論不確定（見上），需要重跑或做 attribution。
- 其他 shadowBlur 還在：`UnitFlightPainter`、`UnitIndicatorPainter`、`UnitAmbientPainter`、`UnitShadowPainter`、`ProceduralPainter` 黑洞。
- 合併風險：`feat/art-vfx` 也改了 `TextPainter.ts`（BREAK 分支）、`RenderList.ts`、`constants.ts`，合併時可能有相鄰行衝突。

## 回退
各熱點是獨立的 commit，可個別 `git revert <sha>`：`833dff7` 文字、`3788a2c` 光束、`c171fcc` 投射物、`6a4ee05` pTrail。`4fd79f7`（快取工具＋常數）要在其他 commit 都回退後才能回退。
