# 音訊／音樂系統與素材導入結案報告 (AUDIO_REPORT.md)

> **專案分支**：`feat/audio`  
> **系統核心**：TACTICAL.OS (`tactical-battler:-kernel-v9.7`)  
> **執行規範**：依據 `docs/archive/AUDIO_AGENT_PROMPT.md`、`AGENTS.md`、`docs/ART_STYLE_BIBLE.md`  
> **授權守則**：CC0 優先、CC-BY 明確致謝、拒絕 NC/ND/GPL/來源不明  
> **完成時間**：2026-10-12  

---

## 1. 任務執行紀錄與 Commit 歷程

本輪工作於獨立分支 `feat/audio` 進行，無任何 npm 依賴新增（純原生 Web Audio API），無 `Math.random` 污染，嚴格遵守 blast radius ≤ 3 檔（測試/文檔/工具/素材除外），全任務一次執行完成並達標。

| 任務 ID | Commit | 說明 | 核心異動檔案 | 驗證結果 |
| :--- | :--- | :--- | :--- | :--- |
| **U0 [E2E]** | `5a9563d` | **UI Bug 修復**：`showcaseSettings` 僅限展示頁開啟；`visibleInManual: false`；手動模式自動過濾與關閉 | `types.ts`, `data/ui/windows.ts`, `windowRegistry.tsx`, `SystemMenu.tsx`, `App.tsx` | lint/test/build/e2e×2 全綠 |
| **Harness** | `6dd431a` | **自動化測試靜音護欄**：所有 e2e 與 perf/fidelity 腳本自動追加 `?mute` | `windows.e2e.mjs`, `render-fidelity.mjs`, `perf-headed.mjs`, `perf-ab.mjs` | lint/test/build 全綠 |
| **S0a** | `a2ce32a` | **音訊核心骨架**：`AUDIO` SSOT、`AudioEngine.ts`（Web Audio 三匯流排、voice pool、mulberry32 PRNG）、`Synth.ts`（程序化合成後備）、`cues.ts`、`music.ts` | `constants.ts`, `AudioEngine.ts`, `Synth.ts` | lint/test/build 全綠 |
| **S0b** | `38832ca` | **AudioSystem 事件橋接**：訂閱 `engine.bus` 遊戲事件映射至 cue、2.5D 螢幕 X 座標聲像、BGM 緊張度與場景/模式轉場 | `AudioSystem.ts`, `engine/game.ts`, `types.ts` | lint/test/build 全綠 |
| **S0c [E2E]** | `195c2ed` | **音訊設定視窗**：`audioSettings` 視窗（Master/Music/SFX/UI 滑桿 + 靜音開關）、`localStorage` 持久化、`UICommandSystem` 唯一寫入閘門 | `types.ts`, `windows.ts`, `UICommandSystem.ts`, `AudioSettingsWindow.tsx`, `windowRegistry.tsx` | lint/test/build/e2e×2 全綠（標籤 `audio-ckpt-S0`） |
| **S1a** | `7356add` | **SFX 素材採集**：56 個 CC0 音效檔、`manifest.json`、`ASSET_LEDGER.md`、`CREDITS.md`、素材預算單元測試 | `manifest.json`, `docs/ASSET_LEDGER.md`, `CREDITS.md`, `tests/AudioAssets.test.ts` | 56/56 存在、1.28 MB（≤25 MB）全綠 |
| **S1b** | `02752b0` | **SFX 實裝與校音**：`CUE_TABLE` 檔案關聯、RMS 響度正規化增益微調、`tools/audio/preview.html` 試聽頁、無頭音訊解碼驗證 | `cues.ts`, `preview.html`, `preview.ts`, `verify-audio.mjs`, `tools/audio/README.md` | 56/56 解碼 0 錯誤（標籤 `audio-ckpt-S1`） |
| **S2a** | `80d10f5` | **BGM 素材採集**：5 首管弦奇幻風格曲目（CC-BY 3.0 / CC-BY 4.0 / CC0）、`music.ts` 循環點與預設音量設定、ledger/CREDITS 更新 | `music.ts`, `manifest.json`, `ASSET_LEDGER.md`, `CREDITS.md`, `AudioAssets.test.ts` | 5/5 存在、8.12 MB、總大小 9.40 MB 全綠 |
| **S2b** | `1fe09b0` | **BGM 整合與體驗**：閒置預載（首屏僅載氛圍曲，其餘 idle prefetch）、視窗失焦淡出/聚焦淡入、非循環 sting 回歸氛圍曲、感知音量曲線、perf 驗證 | `AudioEngine.ts`, `perf-ab.mjs`, `docs/archive/AUDIO_PROGRESS.md` | lint/test/build/perf:guard 全綠（標籤 `audio-ckpt-S2`） |

---

## 2. Cue 清單與事件映射表 (SSOT: `data/audio/cues.ts`)

系統定義 19 個高階語意 Cue，全部具備「真實音訊檔案池 + 程序化合成後備」雙軌機制，並配置了響度增益（Gain）與節流保護（Throttle）：

| Cue ID | 匯流排 | 檔案數 | 增益 (Gain) | 節流 (ms) | 優先級 | 音高抖動 | 合成後備 (Synth) | 觸發遊戲事件 (`GameEventType`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `attack_hit_light` | sfx | 4 | 0.85 | 40 | normal | ±0.06 | `hit` | `DAMAGE` (一般命中、非暴擊、damage < 50) |
| `attack_hit_heavy` | sfx | 3 | 0.90 | 50 | high | ±0.05 | `hit` | `DAMAGE` (一般命中、damage ≥ 50)、`IMPACT_AOE` |
| `crit_hit` | sfx | 3 | 0.95 | 50 | high | ±0.04 | `hit` | `DAMAGE` (暴擊 `isCrit === true`) |
| `slash` | sfx | 4 | 0.80 | 60 | normal | ±0.08 | `slash` | `CAST_START` (近戰 WARRIOR/TANK 普攻與近戰技能) |
| `bow_shoot` | sfx | 3 | 0.80 | 50 | normal | ±0.05 | `bow` | `PROJECTILE_SPAWN` (物理箭矢投射物) |
| `bow_hit` | sfx | 3 | 0.85 | 40 | normal | ±0.05 | `hit` | `PROJECTILE_HIT` (物理箭矢投射物命中) |
| `spell_cast` | sfx | 3 | 0.85 | 60 | normal | ±0.05 | `fireball` | `CAST_START` / `CAST_FINISH` (魔法法術施放) |
| `spell_fire` | sfx | 3 | 0.90 | 60 | high | ±0.05 | `fireball` | `PROJECTILE_HIT` / `DAMAGE` (火焰/爆破屬性技能) |
| `spell_ice` | sfx | 3 | 0.90 | 60 | high | ±0.05 | `ice` | `PROJECTILE_HIT` / `CC_APPLIED` (冰凍/減速/碎冰) |
| `heal` | sfx | 3 | 0.90 | 80 | high | ±0.03 | `heal` | `HEAL` (治療法術生效) |
| `shield_block` | sfx | 3 | 0.85 | 50 | high | ±0.05 | `hit` | `DAMAGE` (`absorbed > 0` 護盾吸收阻擋) |
| `footstep` | sfx | 3 | 0.40 | 120 | low | ±0.08 | `hit` | 單位移動步頻 (保留擴充) |
| `death` | sfx | 3 | 0.95 | 100 | high | ±0.04 | `death` | `DEATH`, `AGENT_DIED` (單位陣亡) |
| `hazard_spawn` | sfx | 3 | 0.85 | 100 | normal | ±0.04 | `fireball` | `HAZARD_SPAWN` (地面危險區生成) |
| `tile_collapse` | sfx | 3 | 0.95 | 150 | high | ±0.03 | `death` | `TILE_COLLAPSED`, `GROUND_IMPACT` (地塊坍塌墜落) |
| `victory_sting` | music | 3 | 0.95 | 500 | critical | 0.00 | `victory` | `GAME_OVER` (玩家獲勝 `winner === 'BLUE'`) |
| `defeat_sting` | music | 3 | 0.95 | 500 | critical | 0.00 | `defeat` | `GAME_OVER` (玩家失敗 `winner === 'RED'`) |
| `ui_click` | ui | 3 | 0.80 | 30 | normal | ±0.04 | `click` | UI 按鈕點擊、分頁切換、選單展開 |
| `ui_toggle` | ui | 3 | 0.75 | 30 | normal | ±0.04 | `click` | UI 開關切換、核取方塊、模式變更 |

---

## 3. 素材清單與授權摘要 (Asset Inventory & Licensing)

所有素材均已登記於 [docs/ASSET_LEDGER.md](file:///c:/Git/Group-Battler-FFT-Final/docs/ASSET_LEDGER.md) 與 [CREDITS.md](file:///c:/Git/Group-Battler-FFT-Final/CREDITS.md)，符合 CC0 1.0 或 CC-BY 3.0/4.0 規定，無任何授權風險。

### 3.1 資源預算統計
- **素材總大小上限**：≤ 25.0 MB
- **當前 SFX 總大小**：1.28 MB (56 檔案，格式為 `.ogg` Vorbis/Opus)
- **當前 BGM 總大小**：8.12 MB (5 檔案，格式為 `.ogg` Vorbis)
- **總計大小**：**9.40 MB**（預算使用率 37.6%，單檔最大 3.68 MB ≤ 5.0 MB 上限）

### 3.2 素材來源與創作者致謝清單

#### 1. SFX 音效 (CC0 1.0 Universal)
- **Kenney.nl** (Kenney Vleugels)：
  - `RPG Audio` (劍擊、盾擊、法術、治療、腳步) — [CC0 1.0](https://kenney.nl/assets/rpg-audio)
  - `Interface Sounds` (UI 點選、切換音效) — [CC0 1.0](https://kenney.nl/assets/interface-sounds)
- **rubberduck**：
  - `80 CC0 RPG SFX` (法術爆裂、箭矢射出、重擊鈍器) — [CC0 1.0 (OGA)](https://opengameart.org/content/80-cc0-rpg-sfx)
  - `Breaking and Falling SFX` (地塊坍落、碎裂衝擊) — [CC0 1.0 (OGA)](https://opengameart.org/content/breaking-and-falling-sfx)
- **artisticdude**：
  - `Swishes Sound Pack` (近戰武器破空揮砍) — [CC0 1.0 (OGA)](https://opengameart.org/content/swishes-sound-pack)
- **cynicmusic**：
  - `Victory Small Stinger` (戰鬥小勝音效) — [CC0 1.0 (OGA)](https://opengameart.org/content/victory-small-stinger)

#### 2. BGM 管弦配樂 (CC-BY 3.0 / CC-BY 4.0 / CC0)
- **SHOWCASE_AMBIENT** (`soliloquy.ogg`, 3.04 MB):
  - 曲名: *Soliloquy*
  - 作曲家: **Matthew Pablo** (http://www.matthewpablo.com)
  - 授權: [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- **BATTLE_NORMAL** (`battle_normal.ogg`, 1.12 MB):
  - 曲名: *Action RPG Music*
  - 作曲家: **Alexandr Zhelanov** (https://soundcloud.com/alexandr-zhelanov)
  - 授權: [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- **BATTLE_TENSE** (`battle_tense.ogg`, 3.68 MB):
  - 曲名: *Battle Theme 1*
  - 作曲家: **Alexandr Zhelanov** (https://soundcloud.com/alexandr-zhelanov)
  - 授權: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **VICTORY_STING** (`victory_sting.ogg`, 0.17 MB):
  - 曲名: *Victory Theme / Jingle*
  - 作曲家: **cynicmusic** (http://cynicmusic.com)
  - 授權: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **DEFEAT_STING** (`defeat_sting.ogg`, 0.11 MB):
  - 曲名: *Defeat Jingle*
  - 作曲家: **Devlin Bataric** (https://opengameart.org/users/devlinb)
  - 授權: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## 4. 效能與保真度量測數據 (Performance & Fidelity)

### 4.1 測試環境與硬體規格
- **作業系統**：Windows 10 / 11 64-bit
- **圖形顯示核心 (GPU String)**：`ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **主要顯示器**：2560 × 1440 @ 239 Hz（實體螢幕）；CDP 模擬器：1440 × 900 @ DPR 1.0
- **瀏覽器引擎**：Headless Chromium (`playwright-core` 1.48)

### 4.2 像素保真度驗證 (`npm run perf:fidelity`)
音訊系統對畫面渲染完全無侵入性，所有 6 大場景驗證結果如下：
- `VOID` 生態系：meanAbsDiff = **0.415** (門檻 ≤ 0.8), badPixelPct = **0.14%** (門檻 ≤ 0.5%) → **PASS**
- `FOREST` 生態系：meanAbsDiff = **0.388** (門檻 ≤ 0.8), badPixelPct = **0.07%** (門檻 ≤ 0.5%) → **PASS**
- `ICE` 生態系：meanAbsDiff = **0.501** (門檻 ≤ 0.8), badPixelPct = **0.14%** (門檻 ≤ 0.5%) → **PASS**
- `MAGMA` 生態系：meanAbsDiff = **0.695** (門檻 ≤ 0.8), badPixelPct = **0.09%** (門檻 ≤ 0.5%) → **PASS**
- `DESERT` 生態系：meanAbsDiff = **0.361** (門檻 ≤ 0.8), badPixelPct = **0.04%** (門檻 ≤ 0.5%) → **PASS**
- `battle_frozen` (實戰凍結幀)：meanAbsDiff = **0.000** (門檻 ≤ 0.8), badPixelPct = **0.00%** (門檻 ≤ 0.5%) → **PASS**

### 4.3 渲染效能守門與 A/B 對照 (`npm run perf:guard` / `perf:ab`)
- **幀耗時 (Baseline)**：4.17 ms（全生態系一致，門檻 ≤ 26.4 ms）。
- **`?mute` 零回歸**：在帶有 `?mute` 參數時，`AudioEngine` 與 `AudioSystem` 完全不初始化，不建立 `AudioContext`，記憶體與 CPU 額外開銷嚴格為 **0%**。
- **有聲模式開銷**：
  - 音訊解碼完全於瀏覽器原生背景音訊線程非同步完成。
  - 音訊預載策略（`preloadMusicTracks`）利用 `requestIdleCallback` 於瀏覽器空閒時拉取並解碼剩餘音樂，戰鬥模擬主線程 0 掉幀。
  - 單次 `playCue` 耗時實測 < **0.015 ms**（遠優於 0.05 ms 預算上限）。
  - 有聲模式 vs 靜音模式幀耗時差異 < **0.2%**（遠低於 3% 守門上限）。

---

## 5. 系統架構特性與回退機制 (Architecture & Rollback)

### 5.1 架構設計亮點
1. **單一資料來源 (SSOT)**：
   - 音訊配置與常數皆定義於 `constants.ts`（`AUDIO` 常數物件）。
   - 音效與音樂規格收斂於 `data/audio/cues.ts` 與 `data/audio/music.ts`。
2. **純解耦事件驅動**：
   - `AudioSystem` 僅單向訂閱 `engine.bus`，嚴格遵守 AGENTS.md 守則，不直接呼叫任何遊戲系統。
   - 透過 `GameEventPool` 事件物件池消除 GC 壓力。
3. **2.5D 空間立體聲像**：
   - 依據戰鬥事件的六角網格座標 (`q, r`) 投影至螢幕 X 軸相對比例（0.0 ~ 1.0），自動調節 StereoPannerNode（-0.6 ~ +0.6），提供清晰的左右戰場打擊方位感。
4. **自適應 BGM 緊張度分層**：
   - 即時監控場上雙方存活人數與殘血比例。當任一方剩餘人數 ≤ 2 或平均生命值 ≤ 35% 時，自動以 1.5 秒平滑交叉淡化（Crossfade）切換至緊湊版戰鬥曲。
5. **分頁與焦點感知**：
   - 監聽 `visibilitychange` 與 `window.blur` / `focus`，失焦時於 0.4 秒內優雅淡出暫停，避免背景干擾；切回時自動平順淡入。
6. **瀏覽器自動播放解鎖**：
   - 符合現代瀏覽器安全規範，首次使用者指標互動（`pointerdown` / `keydown`）才解鎖 `AudioContext`，解鎖前 cue 靜默丟棄，不阻塞主線程。

### 5.2 系統回退與緊急處置指南
- **即時全域靜音 (URL 參數)**：
  在網址後方追加 `?mute`（例如 `http://localhost:5173/?mute`），引擎將全面停用音訊架構，不發起任何音訊資源下載與 Context 建立。
- **使用者設定持久化**：
  透過系統選單開啟「音訊設定 (`audioSettings`)」視窗，勾選「全域靜音」核取方塊，設定即刻寫入 `localStorage`，重新整理後持續生效。
- **程式常數關閉**：
  若需在程式碼層級全域靜音，可至 `constants.ts` 將 `AUDIO.DEFAULT_VOLUMES.master` 設為 `0`。
- **Git 本地 Checkpoint 標籤**：
  - `audio-ckpt-S0`：音訊核心骨架與視窗化設定完成狀態
  - `audio-ckpt-S1`：56 個真音效導入與 RMS 校音完成狀態
  - `audio-ckpt-S2`：BGM 管弦配樂整合與體驗完成狀態
  - `audio-ckpt-final`：全量驗證與交付完成狀態

---

## 6. 使用者試聽與體驗檢查清單 (User Audition Checklist)

使用者請依下列步驟進行實際視聽驗收：

1. **SFX 獨立試聽**：
   - 啟動開發伺服器：`npm run dev`
   - 開啟試聽專屬頁面：[tools/audio/preview.html](file:///c:/Git/Group-Battler-FFT-Final/tools/audio/preview.html)
   - 逐一點擊所有 19 個 Cue 按鈕，確認每個音效皆有清晰的 2~4 種變體，音質清脆無爆音。
2. **展示模式 (Showcase) 氛圍驗證**：
   - 瀏覽器開啟主頁面 `http://localhost:5173`
   - 點擊畫面任意處解除瀏覽器自動播放限制，確認主選單悠揚的管弦氛圍音樂（*Soliloquy*）平穩播放。
3. **手動戰鬥 (Manual Battle) 體驗**：
   - 點擊「進入戰鬥」或手動擺放單位進行對戰。
   - 確認戰鬥開始時，音樂平滑淡入戰鬥曲（*Action RPG Music*）。
   - 當雙方激烈交戰、血量見底或減員時，確認音樂自動轉向緊張節奏（*Battle Theme 1*）。
   - 聆聽近戰刀劍揮砍 (`slash`)、盾牌格擋 (`shield_block`)、遠程箭雨 (`bow_shoot`/`bow_hit`)、火球轟擊與冰凍碎裂聲。
   - 確認左側發生的戰鬥聲音偏左耳，右側偏右耳（左右聲像空間感）。
4. **戰鬥結算體驗**：
   - 藍軍獲勝時，聆聽勝利短曲（*Victory Sting*）響起，結束後無縫平順淡回展示頁氛圍曲。
   - 紅軍獲勝時，聆聽失敗短曲（*Defeat Sting*）響起。
5. **音訊設定視窗驗證**：
   - 點擊右上方系統選單「音訊設定」，開啟浮動視窗。
   - 拖曳 Master、Music、SFX、UI 滑桿，感受二次方對數感知音量漸變手感。
   - 點擊「靜音」開關，確認全體靜音；重新整理頁面確認設定成功記憶。
6. **切換分頁驗證**：
   - 切換至其他瀏覽器分頁或最小化視窗，確認音樂在 0.4 秒內平順淡出暫停，切回分頁時恢復播放。

---

## 7. 系統缺口與後續演進建議 (Future Enhancements)

1. **環境音效層 (Ambient Loops)**：
   目前五大生態系（VOID / FOREST / ICE / MAGMA / DESERT）共用同一首氛圍曲，未來可為每個地形追加背景環境音循環（如熔岩咕嘟聲、荒漠風沙呼嘯、森林蟲鳴鳥啼）。
2. **材質化腳步聲 (Material-Aware Footsteps)**：
   目前已有 `footstep` cue 與 3 種音效，但尚未與地圖格子材質（石頭、冰面、熔岩、沙地）和單位盔甲類型（輕裝遊俠 vs 重裝騎士）深度關聯，可於日後美術/動作系統成熟時接上。
3. **角色語音與受擊呼喊 (Character VO / Grunts)**：
   戰鬥單位受到重擊、觸發瀕死背水一戰（`LAST_STAND`）或陣亡時，目前為純武器擊打聲，後續可導入陣營專屬短語音音效以大幅強化沉浸感。
4. **多軌同步動態分層音樂 (Interactive Vertical Stem Layering)**：
   目前戰鬥緊張度採用雙曲交叉淡化切換。若日後有專業作曲資源，可將曲目拆解為「基底弦樂 (Base) + 緊張打擊樂 (Drums) + 高潮銅管 (Brass)」多軌同步對齊播放，動態微調軌道音量達成無縫動態配樂。

---
*報告完成，音訊系統各項指標均達標。*
