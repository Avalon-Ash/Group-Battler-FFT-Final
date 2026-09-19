# TACTICAL.OS Unit Lab

獨立角色組裝 POC。基底：`48b2968`；分支：`experiment/unit-rig-skin-poc`。
不接入現有遊戲、不刪除舊 renderer、不改動戰鬥參數。

## 啟動

專案根目錄執行 `npm install`、`npm run dev`。
開啟終端機顯示的 Local 網址，再加 `/unit-lab/`（預設 http://localhost:3000/unit-lab/）。
亦可直接將 `public/unit-lab` 透過任意 HTTP 靜態伺服器提供。
不要雙擊 index.html；ES modules 與 fetch 需要 HTTP。

## 架構與來源

- `public/unit-lab/model.mjs`：男女骨架、階層掛點、姿態 clip、方向層序、SKIN ID、draw-command resolver。沒有 Role、Team、Agent 依賴。
- `public/unit-lab/assets/character-atlas.png`：已提交的原創像素圖集，32 個 64×64 透明分件 cell。cell 尺寸包含空白，不代表人物實際高度。
- `public/unit-lab/assets/atlas.json`：裁切矩形、pivot 和來源說明。
- `public/unit-lab/app.mjs`：以 PNG drawImage 組装，整數位置、整數顯示倍率、不連續旋轉分件。
- `tools/unit-lab/build_assets.py`：離線像素美術原始檔。由程式座標手工定義像素區塊，再以 Pillow rasterize，沒有使用影像生成模型，也沒有擷取／描摹 FFT 貼圖。這是 AI 編寫的原創像素小樣，不是已驗收的專業角色資產。

重建圖片才需要 Python + Pillow：`python tools/unit-lab/build_assets.py`。
一般使用不需要 Python，因為 PNG 和 manifest 已提交。
修改 PNG 時不要直接重跑 compiler 覆蓋手繪修訂；應先更新來源或建立專用圖像來源流程。

## 骨架／SKIN 契約

`root` 在足底，`pelvis → chest → head` 為軀幹鏈。
手臂屬於 chest、腿屬於 pelvis、weapon 透過 hand socket 定位。
男女共用 joint 名稱，比例與偏移不同；衣裝各有 male/female 適配貼圖。
髮型獨立選取，沒有將長短髮綁定性別。
待機、行走、揮劍、受擊共 14 個姿態。手臂／劍有 rest、raised、strike 替換圖。
SKIN 切換不改 rig 或 clip；裝卸武器不改身體；方向層序獨立於職業。
目前只提供前側／後側兩個視角，並非完整四／八方向。

## 遷移前盤點

| 舊路徑 | 現況 | 處理策略 |
|---|---|---|
| `data/units/appearance/types.ts` | RoleAppearance 同時定義身體尺寸、顏色、武器與 Token 外觀 | 不直接刪；未來分出 rig/skin/equipment/token 相容層 |
| `factions/ImperialRenderer.ts` / `CovenantRenderer.ts` | 各自處理動作曲線、位移、外觀與職業分支 | 小樣通過後才逐步替換，不複製進 POC |
| `painters/UnitBodyPainter.ts` | 父層與 faction 層均有呼吸／受擊變形 | 遷移時定義各層唯一責任；不能單靠名稱判廢碼 |
| `painters/UnitDeathPainter.ts` | 仍讀 UNIT_APPEARANCE，死亡碎片仍有用途 | 未驗證新的死亡資產前保留 |
| `graphics/units/*TokenFactory.ts` | 仍依職業／陣營 profile 產生 Token | 單位本體替換不等於 Token 可刪 |
| `UnitBodyPainter` 的 `UnitCorePainter` import | 本檔沒有直接使用，但 faction renderer 有使用 | 可列為後續局部清理候選，不能整個刪 UnitCorePainter |

本表是已讀取檔案的初步依賴盤點，不是整庫死碼分析報告。

## QA inventory

自動契約測試：`node tools/unit-lab/test.mjs`。
覆盖 224 組 rig × skin × view × hair × pose；檢查全部資產存在、socket 跟隨、
裝卸物件、整數座標、男女骨架差異、層序差異、clip 邊界。

瀏覽器驗證項目：

- 初始載入顯示原創角色，不顯示錯誤；桌面和 375px 畫面無水平溢出。
- 男女骨架往返、兩套衣裝往返、兩個髮型往返、前後視角往返。
- 武器、披風、掛點、分件展開、逐層顯隱開關往返。
- 四種動作、速度、暫停／播放、下一幀、時間軸指定幀、倍率。
- 匯出配置 JSON 與當前 UI 一致。
- 重設恢復全部初始設定，包括被隱藏的分件。
- 非預期情境：暫停後切換 frame 數不同的動作；隱藏物件後切換衣裝／方向。
- 錯誤情境：PNG 404 時顯示錯誤且控制項停用。
- 舊遊戲 TypeScript 檢查與正式 build 仍通過。

## 不宣稱完成的事項

### 本次驗證結果

- 224 組模型契約測試通過；`npm run lint` 與 `npm run build` 通過。
- Playwright 桌面與 375 × 812 手機視窗操作通過，無水平溢出。
- 男女／衣裝／髮型／前後視角、裝備與逐層顯隱、四種動作、
  播放／暫停／步進／選幀、速度、倍率、分件展開與重設均已操作。
- 配置 JSON 下載內容核對通過；切換衣裝／方向後隱藏狀態保留。
- 模擬 PNG 404：顯示可讀錯誤，全部操作項停用；正常頁面無未捕捉例外。
- 修正頭頸接點、揮劍手臂多邊形及原尺寸對照區的劍尖裁切。
- 正式建置仍有既有主遊戲 bundle 超過 500 kB 提醒；本次未處理主遊戲切包。

### 邊界

目前是技術／美術候選小樣，不是 FFT 品質認證或正式資產。
沒有戰鬥整合、完整腳步翻轉、四方向、完整武器庫、死亡／布娃娃、技能動畫、
專案編輯器、角色配置匯入、GPU／行動裝置效能基準。
裝備的美術遮擋需後續依更多武器與姿態驗收，兩種衣裝不代表任意裝備都能免修圖。
分件展開模式關閉骨架線顯示，因為展開位置不再等於真實骨架位置。
同意美術方向後才考慮 PR；不得因 build 成功自動合併。
