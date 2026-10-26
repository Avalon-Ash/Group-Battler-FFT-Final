# SKIN-INT 整合審查報告

狀態：S0–S3 實作已提交，S4 已取證但驗收未通過。記憶體穩態增加 162.475 MB（上限 +30 MB），完整測試 840 通過／2 失敗。依停下條件停止擴大實作，交主代理審查，不可直接合併。

工作區：`C:/Users/xino_/.codex/worktrees/lionheart-warrior-skins/Group-Battler-FFT-Final`。本文所有 tools/ui-e2e/out 證據位於此工作區，不在主代理的 main checkout。

## 分支與閘門

- 分支 `feat/faction-skins`；基底 `581297669161265c06d08177ee09228b047660d6`，包含 R2 合併 `53f2901`。
- S1 前及本報告撰寫前均比較基底與 main；main `68bd326` 只新增／修改三份 Markdown 文件，閘門通過。未 rebase、merge 或 push。
- 使用者授權自行調整 S0 工具檔拆分，採一個完整離線工具提交；S3 維持五個執行期程式檔。

## 提交與回退

| 任務 | 提交 | 內容 |
| --- | --- | --- |
| S0 | dbc13e8 | 離線工具、art-source 設定、文字證據、半尺寸產物工具；不匯入 docs/art 圖片 |
| S1 | eef6c53 | atlasScale 相容舊格式，邏輯座標不變；839 tests 通過 |
| S2 | 90d33b3 | 20 張正式 WebP、448/padding96 manifest、referenceHeightPx 158.3 |
| S3 | fcdb494 | 當前陣容載入、並行上限 2、離場釋放與殘影快取清除、男女 50/50 |
| S4 | f788a29 | 截圖等待當前圖集、測試資料同步、完整取證；驗收未通過 |

需要整批回退時由主代理按 S4→S3→S2→S1→S0 反序 revert；不要只回退 S1 而保留半尺寸素材。保留美術來源分支 codex/lionheart-warrior-skins，不合併其完整歷史。

## 素材與接入契約

- 正式圖集：`public/assets/units/`，20 張 WebP + manifest。
- 離線設定：`art-source/faction-skins/`；共用紋理與頭部來源：`art-source/lionheart-warrior/`、`art-source/lionheart-roles/`。
- 轉換：`node tools/assets/blender/prepare_runtime_atlases.mjs`，讀保留美術分支的 combined manifest 與本機 packed 試作，輸出至 `tools/ui-e2e/out/faction-skins-runtime/`。
- 用 Canvas high-quality 縮半後無損 WebP 編碼，20 張共 15,829,850 bytes；無第二次有損壓縮。壓縮檔比原試作更大，但解碼像素減至四分之一。
- atlasScale=0.5；manifest 的 frame x/y/w/h/ox/oy、atlas.w/h 保留原始邏輯尺度。角色 targetHeight=59、referenceHeight=158.3、男女 heightScale=1、anchorYOffset=0。
- 未修改 RenderSpec、模擬系統或座標協議；所有載入 URL 繼續走 BASE_URL。
- __UNIT_ASSETS_READY__ 表示當前陣容全數載入；失敗時為 false，仍用既有替代繪製。舊 synthetic-rAF 保真工具補等待資源，避免把替代角色當正式圖取證。
- 舊試作 preview/overscan 工具需要美術分支的歷史參考產物；這些二進位資料未帶進本分支。

## 已確認驗證

- 改前 lint/test/build：exit 0，94 檔／836 tests。
- S0 lint/test/build、Python compileall、Blender CLI help、20 張半尺寸尺寸檢查：通過。第一次文件測試抓到未帶入的預覽圖連結，已改為歷史資料說明；Blender help 改用其必要位置參數後通過。
- S1 lint/test/build：exit 0，95 檔／839 tests；缺省、1、0.5 格式的 mip 尺寸、原始取格矩形與不重採樣路徑皆有測試。
- S3 lint/build、57 項載入／外觀／座標 focused tests 通過。涵蓋並行上限、換隊後零尺寸畫布、過期解碼丟棄、重新入場載入、失敗不逐幀重試。
- 300 場 seed=1：BLUE159 / RED140 / DRAW1 / TIMEOUT0；前後 JSON 除執行耗時外完全一致，包含逐場結果。見 `tools/ui-e2e/out/skin_sim_comparison.json`。
- runtime smoke：0 page errors，battleTime 0.50→4.55 秒、畫布有變動。
- verify:coords：exit 0；CoordinateProtocol 的 37 tests 通過。
- 效能護欄：獨立 `node tools/ui-e2e/perf-ab.mjs --assert` exit 0，五場景全部通過。perf:guard 在預期的 battle_frozen 保真差異處 exit 1，因此分開補跑效能段。
- 保真 meanAbsDiff：VOID .216、FOREST .651、ICE .253、MAGMA .249、DESERT .530，五地形通過。battle_frozen .308、badPixelPct .69%（門檻 .5%），預期失敗；未重錄或放寬。未對齊 RGB mean .4619。差異圖檢視集中在角色與其附屬標記。

## 待主代理決策的外觀契約

1. CoreProjection.test.ts：兩陣營法師（男女同高 70.9267px），圖集實際頭高對固定 59px 投影頭高的差達 11.9267px，超過既有單職業 8px；本輪不改投影中心／HUD 座標或容許值。
2. SpriteUnitRenderer.test.ts：48 個死亡影格超過護盾寬 76px，全部是修好裁切後保留的死亡姿勢；最大 BLUE:WARRIOR:MALE / death / SW / 5，85.3506px。完整清單 `tools/ui-e2e/out/skin_width_exceedances.json`。不縮人物、不重新裁切、不放寬測試。
3. 改前後頭高變化 >6px：RED:SUPPORT:MALE +7.0815px。請判斷外觀規格是否接受。

以下是 SpriteUnitRenderer.getHeadHeight 同公式的腳底至頭頂高度；原本女性停用，因此改前女性列取其 MALE fallback。固定投影／HUD 頭高仍為59px；不是為新髮型另加偏移。

| key | 改前 px | 改後 px | 差 px |
| --- | ---: | ---: | ---: |
| BLUE:TANK:MALE | 59.373 | 53.782 | -5.591 |
| BLUE:TANK:FEMALE | 59.373 | 53.782 | -5.591 |
| BLUE:WARRIOR:MALE | 59.000 | 54.155 | -4.845 |
| BLUE:WARRIOR:FEMALE | 59.000 | 54.155 | -4.845 |
| BLUE:RANGER:MALE | 54.527 | 53.782 | -0.745 |
| BLUE:RANGER:FEMALE | 54.527 | 53.782 | -0.745 |
| BLUE:MAGE:MALE | 66.081 | 70.927 | +4.845 |
| BLUE:MAGE:FEMALE | 66.081 | 70.927 | +4.845 |
| BLUE:SUPPORT:MALE | 52.664 | 53.782 | +1.118 |
| BLUE:SUPPORT:FEMALE | 52.664 | 53.782 | +1.118 |
| RED:TANK:MALE | 59.373 | 57.509 | -1.864 |
| RED:TANK:FEMALE | 59.373 | 53.782 | -5.591 |
| RED:WARRIOR:MALE | 59.000 | 59.373 | +0.373 |
| RED:WARRIOR:FEMALE | 59.000 | 62.727 | +3.727 |
| RED:RANGER:MALE | 54.527 | 53.782 | -0.745 |
| RED:RANGER:FEMALE | 54.527 | 53.782 | -0.745 |
| RED:MAGE:MALE | 66.081 | 70.927 | +4.845 |
| RED:MAGE:FEMALE | 66.081 | 70.927 | +4.845 |
| RED:SUPPORT:MALE | 52.664 | 59.745 | +7.081 |
| RED:SUPPORT:FEMALE | 52.664 | 54.527 | +1.864 |

## 記憶體

改前／改後都使用 `node tools/ui-e2e/perf-lifecycle-soak.mjs --device=iphone --out=<before/after basename>`；其餘參數相同（11分鐘／展示5分鐘／採樣10秒）。渲染程序 private MB 每三次樣本取得，穩態採最後三分之一的有效程序記憶體樣本平均。這是桌機 RTX4070 模擬 iPhone 版面，不能替代 iPhone 實機系統回收驗證。

| 指標 | 改前 | 改後 |
| --- | ---: | ---: |
| 渲染程序穩態 MB | 2047.125 | 2209.600 |
| 渲染程序觀測峰值 MB | 2062.1 | 2229.3 |
| 前90秒觀測峰值 MB | 1897.1 | 1966.6 |
| 存活畫布穩態平均 | 1932.435 | 1908.391 |
| 存活畫布峰值 | 2276 | 2381 |
| page / HTTP errors | 0 / 0 | 0 / 0 |

**記憶體驗收 FAIL**：穩態 +162.475 MB，高於允許 +30 MB。兩次 soak 工具本身 exit 0 只代表執行無錯，不代表記憶體門檻通過。統計採 wallS >= 440 的樣本；程序峰值取全部有效程序樣本。原始資料 skin_soak_before.json、skin_soak_after.json 與彙整 skin_memory_comparison.json 均在 tools/ui-e2e/out。

殘影染色快取峰值 96→34、結束 96→0；既有 token 快取峰值 20→28。這些是觀察線索，不足以將整體程序增加歸因到某個快取。已停止擴大優化，未增加其他快取或放寬門檻。

注意：原 soak 首次程序記憶體資料約30秒，未涵蓋0–30秒的瞬時冷啟動峰值；不能將長跑峰值宣稱為完整冷啟動峰值。

## 給 OPUS：優先追查換隊後的資源釋放

使用者要求保留目前核可的貼圖細節，不再降低解析度、增加有損壓縮、裁掉配件／死亡姿勢或縮小角色來換記憶體。先固定同一組 A→B→A 陣容，對照換隊前、換隊後與載入完成後的資源：目前／待載／已離場 atlas key、原始圖片及解碼資源、彩色 mip／剪影畫布、殘影染色畫布、token／其他衍生快取；逐項記錄數量、尺寸、估計像素位元組、持有者及釋放時機，檢查 Map、Promise、回呼與其他參照是否仍持有離場資源，並確認過期載入不會重新放回快取。重複同一循環檢查保留量是否持續累積，再修正有證據的持有者與生命週期。現有程式已會釋放離場圖集並清除對應殘影，但不代表所有衍生資源都已釋放；男女素材庫增加也不能直接證明場上常駐資源必須翻倍。將應用仍持有的資源與瀏覽器解碼／配置器保留供重用的記憶體分開判讀，不能只以程序 RAM 未立即下降判定洩漏。最後用相同條件重測長跑與啟動階段峰值；目前 +162.475 MB 的原因尚未定位，token 快取 20→28 僅是線索。

## 截圖與證據

- `tools/ui-e2e/out/skin_mixed_battle.png`：UI_COMMAND 固定男女混合的戰鬥 fixture。
- `tools/ui-e2e/out/skin_showcase.png`：自然生成的男女展示。
- `tools/ui-e2e/out/skin_screenshots.json`：陣容、實際保留 key、ready、頁面錯誤；兩張皆10個當前key、0錯誤。
- `tools/ui-e2e/out/skin_battle_frozen_old.png`
- `tools/ui-e2e/out/skin_battle_frozen_new.png`
- `tools/ui-e2e/out/skin_battle_frozen_diff.png`
- 檢視兩張實跑截圖未見明顯新裁切／浮空；單張截圖不能排除完整動畫穿插，沿用已核可試烘焙證據，未重新烘焙。

## 最終測試狀態

lint/build exit 0。完整 npm test 最終為 840 pass / 2 fail（上述頭高、死亡護盾範圍）。收尾同步 BodyTypeEditor 的舊「女性停用」fixture；constants-snapshot 只新增 maxConcurrentLoads=2 契約欄位，沒有改既有值或放寬門檻。影像保真基準與受保護的 *.baseline.json 均未改動。最終 fixture 同步後重跑全套測試，仍僅保留上述兩項失敗。

S4 未完成驗收的原因：記憶體門檻失敗、兩個外觀契約測試失敗、完整冷啟動峰值未被原 harness 覆蓋；battle_frozen 為預期差異，需主代理先審查取證再決定是否重錄。禁止把本報告視為全面通過或實機 iPhone 保證。

## 檢查紀錄

| 指令 | exit | log |
| --- | ---: | --- |
| `npm run lint` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-base-lint.log` |
| `npm test` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-base-test.log` |
| `npm run build` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-base-build.log` |
| `node tools/balance/batch-sim.mjs --battles=300 --seed=1 --out=tools/ui-e2e/out/skin_sim_before.json` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-base-sim.log` |
| `node tools/ui-e2e/perf-lifecycle-soak.mjs --device=iphone --out=skin_soak_before.json` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-base-soak.log` |
| `node tools/assets/blender/prepare_runtime_atlases.mjs` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-prepare.log` |
| `npm run lint` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s0-lint.log` |
| `npm test` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s0-test-retry.log` |
| `npm run build` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s0-build.log` |
| `C:/Git/_asset_staging/tools/blender/blender-4.5.13-windows-x64/blender.exe -b --python-exit-code 1 --python tools/assets/blender/render_unit.py -- unused unused BLUE WARRIOR --help` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-blender-help-retry.log` |
| `npm run lint` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s1-lint.log` |
| `npm test` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s1-test.log` |
| `npm run build` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s1-build.log` |
| `node tools/ui-e2e/runtime-smoke.mjs --shot` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s2-smoke.log` |
| `npm run verify:coords` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s2-coords.log` |
| `npm test` | 1 | `tools/ui-e2e/out/agent-logs/skin-int-s2-test.log` |
| `npm run lint` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s3-lint.log` |
| `npm run build` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s3-build.log` |
| `npx vitest run tests/SpriteAtlasLoading.test.ts tests/SpriteAtlas.test.ts tests/CoordinateProtocol.test.ts` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s3-focused.log` |
| `node tools/balance/batch-sim.mjs --battles=300 --seed=1 --out=tools/ui-e2e/out/skin_sim.json` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s3-sim.log` |
| `node tools/ui-e2e/runtime-smoke.mjs --shot` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s3-smoke.log` |
| `npm run perf:guard` | 1 | `tools/ui-e2e/out/agent-logs/skin-int-s4-guard-ready.log` |
| `node tools/ui-e2e/perf-ab.mjs --assert` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-s4-perf.log` |
| `node tools/ui-e2e/out/_scratch_skin_shots.mjs` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-shots.log` |
| `node tools/ui-e2e/perf-lifecycle-soak.mjs --device=iphone --out=skin_soak_after.json` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-after-soak.log` |
| `npm run lint` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-final-lint.log` |
| `npm test` | 1 | `tools/ui-e2e/out/agent-logs/skin-int-final-test.log` |
| `npm run build` | 0 | `tools/ui-e2e/out/agent-logs/skin-int-final-build.log` |
| `npm test` | 1 | `tools/ui-e2e/out/agent-logs/skin-int-final-test-fixtures.log` |
