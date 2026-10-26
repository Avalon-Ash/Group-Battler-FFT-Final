# 獅心與灰燼完整動畫試烘焙

2026-10-26；分支 `codex/lionheart-warrior-skins`；外觀起點 `1f42c87`。

## 編輯前計畫

使用者核准兩陣營五職業男女外觀，授權完整動畫試烘焙及頭髮／配件穿插、死亡裁切檢查，角色大小與腳底定位不變，正式圖集不動。

- 新增 `tools/assets/blender/run_animation_trial.py`：串行呼叫既有 renderer 與 packer，20 套輸出至 `tools/ui-e2e/out/faction-animation-v01/`；保留各套 `skin.blend`、透明原生畫格與隔離試圖集。
- 新增 `tools/assets/blender/preview_animation_trial.py`：驗證畫格、完整 alpha 邊界、投影／錨點、打包偏移與 alpha、原模型 audit、站姿回歸和正式素材 hash；產生本目錄可逐格播放的動畫頁與接觸表。
- 新增 `tools/assets/blender/animation_trial_gallery.html` 作為離線 Canvas 2D 預覽模板，內嵌試 manifest，支援本機檔案開啟，不接入遊戲。
- 舊戰士入口沒有輸出角色完整性 sidecar；新增 `audit_animation_trial.py`，在渲染結束後讀取 20 份 `skin.blend` 與四份來源 GLB，以同一格式核對原網格／權重／骨架及新增 head 綁定，補齊證據，不重寫來源 renderer。
- 只在實際畫格發現問題時，修正對應 skin 配件參數／離線生成器並重烘受影響套件；記錄前後差異。不改原模型、骨架、動畫 clips 或 runtime。
- 全部使用 256 邏輯尺寸、每側 96px 固定擴邊、448×448 raw、256/3.6 px/world、2px 描邊、raw anchor=(224,280.32)、原 anchor=(128,184.32)、referenceHeightPx=158.3；不逐角色／逐幀 fit。
- 保持原抽幀：idle/walk/attack/cast/death 每向 6 格，hit 每向 3 格；只有法師與輔助有 cast。先前戰士「8 格死亡裁切」指跨方向合計 8 個受影響畫格，並非每向 8 格。死亡播放 8 fps。
- Blender 串行；不與 perf 量測重疊。新離線工具完成後跑 lint／test／build。正式 atlas、manifest、female 啟用、baseline 不改，不 push 或合併 main。

## 結果

20 套、2,352 格已完成：每陣營 TANK／WARRIOR／RANGER 男女各 108 格，MAGE／SUPPORT 男女各 132 格。完整指既有 runtime 對應的 idle／walk／attack／hit／death，以及法師、輔助的 cast；不是全部 76 個 KayKit 原始 clips。

本輪沒有修改已核准的髮型、材質、配件、原動畫或 renderer，亦沒有改任何遊戲來源檔。全套取樣畫格目視未發現明顯新增穿插、破面或死亡裁切，因此保留 `1f42c87` 外觀。

## 檢閱位置

- [四向完整動畫頁](index.html)：陣營／職業／動作篩選、播放／暫停、上一格／下一格、原生 1:1 像素、固定腳底錨點。每卡四向 SE／SW／NE／NW，不鏡像。非循環動作末格停留一秒後重播；無獨立 cast 的職業直接標示缺少此 clip。
- [獅心死亡](blue-death.gif)、[灰燼死亡](red-death.gif)、[獅心攻擊](blue-attack.gif)、[灰燼攻擊](red-attack.gif)：SE 方向，上男下女，統一 0.5 倍縮圖；GIF 僅作便捷預覽。
- `atlases/` 與 `manifest.json`：20 套隔離試圖集，可供離線頁檢閱；合併 manifest 固定 `referenceHeightPx=158.3`，沒有採用 packer 按新頭高算出的參考高度。原 `idleHeightPx` 僅保留作量測。
- [自動驗證](validation.json)、[目視檢查紀錄](visual-review.json)、[預覽頁驗證](gallery-validation.json)。
- 完整透明原始 PNG、內嵌材質 `skin.blend`、`render-meta.json`、`skin-integrity.json`：`tools/ui-e2e/out/faction-animation-v01/raw/<blue|red>/<role>/<male|female>/`，本機忽略產物。
- 108 張四向全幀接觸表：`tools/ui-e2e/out/faction-animation-v01/qa/<blue|red>/<role>/<male|female>/<clip>.png`。獨立打包輸出在同一 trial 根目錄的 `packed/`。

## 驗證結果

- 2,352/2,352 格非空，完整 alpha 邊界最少 **26px** 留白；死亡共 480 格全數通過。原透明畫格尺寸保持 448×448，沒有逐格 fit 或移動。
- 20 套固定世界像素比、描邊與原／擴邊錨點；四個世界投影探針扣除 padding 後最大誤差 **0.00000763px**。
- 80 張四向 idle 首格與已核准站姿的 RGBA 完全相同；代表這輪沒有暗中更換外觀或站姿倍率。
- 全幀 clip 集合、格數、fps／loop、atlas 範圍、裁片 w/h、相對腳底 ox/oy 皆一致；packed alpha 與 raw 裁片逐像素相同。WebP RGB 沿用既有有損壓縮，不宣稱 RGB 與 raw 完全相同。
- 20 份保存場景精確比對四份原 GLB：原網格頂點／面、權重、vertex groups、儲存的 matrix_basis／parent inverse／parent type／parent bone、41 根骨頭 rest matrix、76 組 action 名稱／範圍一致；全部新增配件維持原 Rig parent、單一 head 權重 1 與 Armature modifier。來源 GLB SHA256 與已核准站姿紀錄相同。
- `public/assets/units` 正式 11 檔 hash 與 `1f42c87` 全部相同。沒有改正式 manifest、female 啟用、runtime、baseline，也沒有 push 或合併 main。
- 最終 lint PASS；94 檔／824 項測試 PASS；build PASS（既有大型 chunk 提示）。Logs：`tools/ui-e2e/out/agent-logs/faction-anim-final-{lint,test,build}.log`。
- 本機檔案預覽頁實跑 PASS：20 張 atlas 載入、陣營／職業篩選、前後逐格、1:1 像素切換、缺少 cast 的提示，沒有 JavaScript 錯誤；[頁面截圖](archived death gallery)。Log：`faction-anim-gallery-checked.log`。初版測試的 canvas 像素匯出被瀏覽器本機檔案來源限制擋住，改用瀏覽器截圖核對逐格回返結果，未降低頁面的來源安全限制。
- 本輪只有離線工具與試作產物，未改 runtime renderer／materials／VFX，沒有跑 perf:guard 或遊戲 runtime-smoke；這些試圖尚未接入遊戲，沒有宣稱完成遊戲記憶體測量。

## 目視範圍與限制

主代理與獨立 reviewer 實際檢查 108 張接觸表，涵蓋全部 2,352 個輸出取樣畫格；接觸表為固定 0.5 倍，另以原生畫格放大檢查灰燼女法師 `death SE 03`、`death NE 03`、`attack NE 02` 的粗辮、手杖與肩部。

- 獅心：短髮／低髮髻／頭環維持貼合；女法師雙長馬尾在四向施法與倒地中輪廓連續，帽飾未漂移。
- 灰燼：女騎士長偏分、女戰士高馬尾、遊俠長側髮、女法師粗辮、輔助長層次皆保持完整。靠肩與手臂的取樣畫格未見明顯穿破；死亡末格的髮尾與配件皆在透明留白內。
- 武器或書本偶爾從前方遮臉，法師帽在背向遮住部分頭髮，保留原動作與透視遮擋。頭髮依然只跟隨 head 骨，沒有動態飄髮或碰撞模擬。

「未見明顯新增穿插」是輸出畫格的視覺結論，不是幾何零交疊證明；未檢查原始 clip 取樣之間的每個時間點，也未 hash 全部動畫 keyframes／原始 modifiers／constraints。正式接入仍需 OPUS 的載入與記憶體驗證。

## 驗證工具修正紀錄

初次 BLUE 驗證停在舊戰士入口缺少 `skin-integrity.json`；新增保存場景稽核補齊。初版保存場景稽核與診斷重試未完成（`faction-anim-rig.log`、`faction-anim-rig-diagnostic.log`），原因是 bone-parent 物件的 `matrix_local` 包含已評估姿勢。診斷證明差異只在這個衍生矩陣，`matrix_basis`／`matrix_parent_inverse` 相同。改成精確比對儲存的局部變換與父子關係後，20 套全數 PASS（`faction-anim-rig-stored.log`），未加入容差或放行例外；舊格式 `sourceReference` 另用來核對已核准來源。

整批畫格驗證 log：`faction-anim-verify.log`。烘焙 log：`faction-anim-blue.log`（516 秒）、`faction-anim-red.log`（626 秒）；各套 Blender 詳細 log 在 trial 的 `logs/`。

## 重現

在工作區根目錄設定 `$trialBlender` 為 Blender 4.5.13 執行檔、`$trialChars` 為 KayKit Characters/gltf 目錄，依序執行並等每個任務 DONE 才啟動下一個 Blender：

```powershell
node tools/agent/run.mjs --detach trial-blue 900 -- python -B tools/assets/blender/run_animation_trial.py --blender $trialBlender --characters $trialChars --team BLUE
node tools/agent/run.mjs --wait trial-blue
node tools/agent/run.mjs --detach trial-red 900 -- python -B tools/assets/blender/run_animation_trial.py --blender $trialBlender --characters $trialChars --team RED
node tools/agent/run.mjs --wait trial-red
node tools/agent/run.mjs --detach trial-rig 180 -- $trialBlender -b -t 4 --python-exit-code 1 --python tools/assets/blender/audit_animation_trial.py -- --characters $trialChars
node tools/agent/run.mjs --wait trial-rig
node tools/agent/run.mjs --detach trial-preview 180 -- python -B tools/assets/blender/preview_animation_trial.py
node tools/agent/run.mjs --wait trial-preview
```

`RUNNING` 時持續 `--wait`，直到 DONE。可用 batch 的 `--roles` 限定重烘職業；所有輸出都限定在本輪獨立 trial，沒有正式輸出入口。
