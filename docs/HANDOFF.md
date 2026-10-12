# 主代理交接手冊（工具無關：Claude Code／Antigravity 皆可讀）

> 更新：2026-10-12 深夜。新對話的主代理 **先讀本檔 → 再讀 `AGENTS.md` → 開工**，不要重新探索專案。
> 歷史細節（已完成輪次的提示詞／報告／基準）已歸檔到 [`docs/archive/`](archive/)，**平常不用讀**。

## 0. 省點數守則（使用者額度有限，最重要）
- 這幾輪（音訊、效能四、UI 修正…）已花約 7500 點。使用者下個月改用 **Claude Pro** 接手：額度比 Antigravity 緊，**請把主代理工作壓到最小**。
- **分工不變**：長時間、機械性、無人值守的實作交給 IDE 端 Gemini（`/goal docs/<PROMPT>.md`，額度多）；主代理只做 ① 設計／寫提示詞 ② 審查 diff ③ 小修 ④ 驗證 ⑤ 合併。
- **審查要便宜**：先 `git diff main --stat`，只讀**程式碼**變更（`engine/`、`components/`、`constants.ts`），**不要讀整份 `docs/*REPORT*`**（代理報告常誇大，只看「數字表」與「回退指南」）；用 `Select-String` 抓關鍵字而非整檔開；一次 `view_file` 讀一小段。
- **不要重複量測**：效能數字以代理的表為準，只抽查 1 次（`npm run perf:guard`＋`perf:frames` 單場景）。
- 少截圖、少探索、回覆精簡；一次對話只做一輪的審查＋合併，做完就收（context 變長＝每則訊息更貴）。
- 需要時用 `/compact`（Claude Code）；本檔＋`AGENTS.md` 足以在新對話重建全部上下文。

## 1. 專案與紀律
- **專案**：`c:\Git\Group-Battler-FFT-Final`（TACTICAL.OS：Vite + React 19 + TS + HTML5 Canvas 2.5D 六角戰棋）。遠端 `https://github.com/Avalon-Ash/Group-Battler-FFT-Final.git`。
- **治理規則**全在 `AGENTS.md`：`Agent` 純資料（不加方法）、SSOT 在 `types.ts`／`constants.ts`／`data/**`、禁 `as any`、禁魔術數字／硬編碼顏色、tick／渲染迴圈禁 `console.log`、單次改動 ≤3 檔（超過先說明策略）、改完 `npm run lint`／`npm test`／`npm run build`，渲染變更再加 `npm run perf:guard`、禁 Three/Pixi/WebGL、Vite `base:'./'` 素材 URL 用 `import.meta.env.BASE_URL`、子系統只透過 `engine.bus` 溝通、UI 只經 `UICommand` 寫入引擎。
- **鐵律**：**未經使用者明確指示不得合併進 `main`／push**（每次都要問，合併和 push 分開問）。IDE 代理在跑時，不碰它的工作樹、不跑 e2e／perf／Blender 等重工作。
- **使用者**：繁體中文；要簡潔、GitHub markdown、可點的 `file:///` 連結；能自己做的（量測、安裝）就自己做。
- **使用者機器**：RTX 4070、Ryzen 7800X3D、主螢幕 2560×1440 @ 239 Hz（量測用）、副螢幕 59 Hz（AMD 內顯，會污染量測，要避開）、Windows 縮放 100%、Python 3.10、Node 24。
- **PowerShell 陷阱**：終端機中文是亂碼但檔案是 UTF-8（用檢視工具看）；新檔寫 LF；巢狀引號易 ParserError，複雜字串改寫檔；`Select-String -Path` 不能重複參數；字串內 `\r\n` 不會被展開（要用反引號 r n）；寫檔時**不要輸出 `&gt;`／`&lt;` 之類 HTML 實體**。

## 2. Git 狀態
- `main`：已含 UI 合併、效能 1～3 輪、**音訊輪**（`085b6f0`，已 push）＋測試降噪（`4cd8ff9`，**未 push**）。
- **`perf/render-opt-4`（效能四，已審查並修正，待使用者決定合併）**：代理 12 個 commit＋我的審查修正 commit（見 §4）。tag：`perf4-ckpt-P0/-P3/-final`。合併後再問 push。
- 本地 tag 未推（可忽略）。

## 3. 路線圖（使用者已核定的順序）
| # | 輪次 | 提示詞 | 分支 | 狀態 |
| :-- | :-- | :-- | :-- | :-- |
| 1 | 音訊 | （已歸檔） | `feat/audio` | ✅ 已合併 |
| 2 | 效能四：特效管線 | （已歸檔） | `perf/render-opt-4` | ✅ 已審查修正，**待合併** |
| 3 | **美術換新**：地形貼圖＋單位 3D 預渲染精靈＋體型軸＋粒子貼圖 | `docs/ART_AGENT_PROMPT.md`（風格見 `docs/ART_STYLE_BIBLE.md`） | `feat/art-fantasy-hd`（待從 main 開） | 待命，精靈已備好（見 §6） |
| 4 | 地形烘焙實作（高度分帶雙層；原型 −33%） | 待寫（設計見 `docs/BAKED_RENDERING_DESIGN.md`、`tools/baked-terrain-proto.html`） | — | 美術完成後 |
| 5 | 之後選項 | — | — | 見 §7 |

**啟動新一輪**：從更新後的 `main` 開分支 → 把該輪提示詞（與需要的 `docs/*.md`）複製進 repo `docs/` 並 commit → 把 `/goal docs/<PROMPT>.md` 交給使用者貼到 IDE。
**合併流程**：`git diff main --stat`（注意 EOL 假變更、門檻被放寬、baseline 被重錄）→ 抽讀程式碼 diff → `npm run lint`／`npm test`／`npm run build`（＋`npm run e2e:ui`、`npm run perf:guard`）→ **問使用者** → `git merge --no-ff` → 再問才 push。

## 4. 效能四審查結論（2026-10-12）— 已修正項目與殘留
**代理做的（保留）**：`?perf` HUD 改量 rAF 真實幀間隔（附 1% low／max1s）、`perf:frames`／`perf:attribution` 工具、`battle_vfx_storm` 壓力情境；P3 消除熱路徑 `shadowBlur`（法陣／衝擊波／黑洞／禁錮改雙層描邊）、`VolumePainter` 漸層提到迴圈外、危害區不再重複畫粒子層、`VFXPlayer` 零分配上限檢查；P4 `VFX_BUDGET`（粒子軟／硬預算＋依品質階層縮發射；死亡碎屑高壓縮減）。
**我審查後修的**：
1. **品質治理器過度敏感**：代理把 `RENDER_QUALITY.DOWN_MS` 從 19 調成 10（＜100 FPS 就降階）；使用者正常遊玩約 100 FPS，會在一般戰鬥中被降到 DPR 0.75（變糊）。已改 `DOWN_MS: 14`（約 <70 FPS 持續 2 秒才降）、`UP_MS: 9`（回原值）。
2. 刪除確認無引用的死碼：`data/vfx/beam_visuals.ts`、`cast_visuals.ts`、`procedural_visuals.ts`、`data/vfx/procedural/*`（代理報告聲稱「已清理」但實際沒動）。
3. `UnitShatter` 血噴數魔術數字 6／18 → `VFX_BUDGET.SHATTER_BLOOD_*`。
**報告需打折的地方**：
- 「p99 37.6→16.8 ms」的主要功勞是 **P3**（去 shadowBlur／漸層／重複繪製）；P4 的 median 8.4 ms 部分來自治理器降到 Tier 2（DPR 0.75＋發射減半），1% low 反而 47.4→37.9。因此實際體驗要看修正後的門檻（§4.1），別直接信 P4 的 median。
- `perf:fidelity` 的 `battle_frozen` 沒有特效，**驗不到 shadowBlur 換成雙層描邊／危害區去重的外觀差異** → 使用者需肉眼看（§8）。
**殘留熱點（未做，下一次效能輪才做）**：`TextPainter`（SHOUT 漸層、`shadowBlur`、破棄 Glitch 每幀 `Math.random()`）、`UnitCorePainter` 受創 `shadowBlur=traumaBlur`、`ProjectileDrawer` 每幀漸層、`ProceduralPainter` 光束、`FloatingTextDrawer`。見 `docs/PERF_REPORT_4.md` §3 排行榜與 `docs/VFX_INVENTORY.md` §3。

## 5. 專案現況重點
- **音訊**：`engine/audio/AudioEngine.ts`（Web Audio；啟動即預載，檔案載入失敗才用合成後備）、`engine/systems/audio/AudioSystem.ts`（事件→Cue、聲像、BGM 切換）、`data/audio/{cues,music}.ts`、素材 `public/assets/audio/`（56 SFX＋6 BGM；CC0／CC-BY，登記於 `docs/ASSET_LEDGER.md`、`CREDITS.md`）。`?mute` 完全不建立 AudioContext。**展示模式**＝只播 `SHOWCASE_AMBIENT`、SFX 壓到 20%（`AUDIO.SHOWCASE_SFX_GAIN`）、不播戰鬥／勝利曲（UI 以 `UICommand: SET_SHOWCASE_MODE` 通知）。紅藍勝利曲分開（`WINNER_TO_VICTORY_TRACK`）；紅方曲是降調改編，品質待使用者聽。預覽頁 `tools/audio/preview.html`。
- **特效**：登記管線 `data/vfx/VFXRegistry.ts`＋`engine/systems/vfx`；直接繪製管線在 `engine/renderers/*`；總盤點 `docs/VFX_INVENTORY.md`。品質階層 `engine/renderers/RenderQuality.ts`＋`constants.ts` 的 `RENDER_QUALITY`／`VFX_BUDGET`；回退開關 `VFX_BUDGET.enabled=false`。
- **UI**：視窗系統 `components/ui/window/*`、展示頁 `components/ui/showcase/ShowcaseOverlay.tsx`（標題卡已改成**無背板、除按鈕外穿透**；手機上開啟設定視窗時標題卡淡出）。樣式基準 `tools/ui-e2e/style-baseline.json`（改 UI 樣式需 `E2E_UPDATE_STYLE=1 npm run e2e:ui` 並確認只有預期元素變動）。
- **效能量測工具**：`perf:fidelity`（保真）、`perf:guard`、`perf:frames`（2560×1440 的 p99／1% low，**用主螢幕**）、`perf:attribution`。保真鐵律：基準不得任意重錄、門檻不得放寬（美術輪有各任務一次授權）。

## 6. 暫存區 `C:\Git\_asset_staging\`（repo 之外，美術輪用）
- `docs\`：本手冊與提示詞副本（**以 repo `docs/` 為準，此處僅備份**）。
- `art\terrain_grid.jpg`（AI 地形 2×5 材質表）；`art\ref_*`＝使用者風格參考，**只作參考，不得進 repo**。
- `sprites\`：10 張 `<team>_<role>_male.webp`＋`manifest.json`（約 4.2 MB；格式見 ART 提示詞）。`sprites_raw\`：算圖原始幀。
- `assets3d\kaykit_adventurers\`（KayKit CC0）；`tools\blender\blender-4.5.13-windows-x64\blender.exe`（可攜）；`tools\blender_scripts\{render_unit,pack_sprites,sheet}.py`、`tools\render_all.ps1`（約 6 分鐘，BelowNormal，不碰 repo）。
- 風格：相機正交仰角 30°（=`ISO_SCALE_Y 0.5`）、四向原生渲染、卡通三階色階＋描邊；BLUE＝皇家藍、RED＝深紅＋暗護甲。**已知弱點**：正面時披風被擋、兩陣營辨識度偏弱（遊俠兩邊皆綠帽）；等實機看過再決定要不要加強（改 `render_unit.py` 的 `FACTION` 重跑算圖）。
- 音訊素材暫存／轉檔：`audio_tmp\`（imageio-ffmpeg 已 pip 安裝，可轉 ogg）。

## 7. 重要決策與待辦池
- 題材奇幻（FFT-like）、保持六角格、固定等距視角；**AI 逐張生圖做單位已放棄**，改 KayKit 預渲染（先求有再求好）；AI 圖只用於地形材質與日後圖示。
- 體型軸 `Team×Role×BodyType`：MALE 有素材，FEMALE 先 `enabled:false`；體型隨單位雜湊派發（不消耗 `random()`），編輯器可改。
- 授權：CC0 優先、CC-BY 可（致謝）、拒絕 NC／ND／GPL／不明；維護 `docs/ASSET_LEDGER.md`、`CREDITS.md`。
- **待辦池（無順序，使用者要時再開）**：
  1. 效能五：清掉 §4 殘留熱點（TextPainter／UnitCore／Projectile…），以 `perf:frames` 的 p99 驗證。
  2. 每個地圖主題一首 BGM（VOID／FOREST／ICE／MAGMA／DESERT；目前只有 6 曲依模式切換，沒做過主題曲）。紅方勝利曲換成真正的暗黑曲。
  3. FEMALE 與其他體型（Quaternius 等）、專用神職模型、加強陣營辨識度。
  4. 手機版 UI 全面巡檢（展示頁已修穿透；其餘全螢幕層僅 `SystemMenu` 的點外關閉背板是刻意的）。

## 8. 使用者要做的事（提醒他）
- 效能四合併前：主螢幕開 `?perf` 實玩，**肉眼比對**法陣、衝擊波、黑洞、禁錮、危害區（火／毒／冰／重力生成時外觀已改）；全場大招齊發時 FPS 是否維持 100＋，畫面有沒有被降糊（DPR 0.75）。
- 美術輪後：看前後對照圖。音訊：聽紅方勝利曲是否可接受。
- 每輪 IDE 代理跑完要主動告訴主代理。

## 9. 在 Claude Code 使用的注意
- 讀 `AGENTS.md`（已相容）與本檔即可接手；工作流不依賴對話記憶。
- 沒有圖像生成工具時，改用現成素材與指令列（Blender、PIL、ffmpeg 已在本機）。
- IDE 代理與你同時存取同一工作樹時，只讀不寫（除非是使用者同意的文件同步）。
