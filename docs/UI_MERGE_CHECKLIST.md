# UI 視窗化與邊界重構合併前審查清單 (UI_MERGE_CHECKLIST)

> **警示**：本分支（`feat/ui-window`）合併至 `main` 將直接觸發 GitHub Actions 發佈至 GitHub Pages 線上環境。  
> **請在執行任何合併或推送前，嚴格依據本清單進行目視確認與驗證。**

---

## 1. 分支與 Commit 摘要

- **當前分支**：`feat/ui-window`
- **目標分支**：`main`
- **主要里程碑本地 Tags**：
  - `ui-ckpt-U6`：完成 Inspector 視窗化（`UnitInspectorBody`、刪除舊 HUD）
  - `ui-ckpt-S1`：完成 Computed-Style 視覺回歸護欄與基準線比對
  - `ui-ckpt-U11`：完成語意 Token SSOT（`tokens.ts`、`gen-ui-tokens`、`tokens.css`、Tailwind 映射）
  - `ui-ckpt-U12`：完成 ≤900px 響應式 Bottom Sheet、觸控命中區（≥44px）、減少動態與觸控捲動權限
  - `ui-ckpt-E8`：完成編輯器與遊戲迴圈之 UICommand 閘門化（E8-0 ~ E8-g 全部子階段）

---

## 2. 已核准的預期外觀與行為差異清單 (Expected Behavioral Diffs)

在審查或實機確認時，若觀察到以下變化，此為**架構計畫明確授權之預期改良**，非迴歸錯誤：

1. **Inspector 呈現形式與互動 (U6 / D5-D10)**：
   - 舊版：固定於螢幕左下角之 HUD 藥丸，寬度寫死，自帶拖曳與計時輪詢。
   - 新版：點擊單位時以標準浮動視窗（`inspector`）開啟於左上方，可自由拖曳、SE/W 邊角縮放寬高、具備收合為標題列把手；點選另一個單位時保留原視窗位置與大小（D5）；點擊畫布空白處取消選取並自動關閉視窗。
2. **Inspector 數值欄位編輯 (R8)**：
   - 舊版：生命值/能量值輸入框受控即時綁定，無法倒退清空、輸入不完整時頻繁回彈。
   - 新版：本地草稿字串緩衝，按下 Enter 或 blur 失去焦點時方驗證並派發 `EDIT_AGENT` 命令；Esc 鍵或非法數值（負數/非數字）自動還原原值。
3. **Showcase 時間倍率上限 (R3)**：
   - 舊版：倍率滑桿上限寫死為 3.0。
   - 新版：收斂至 `UI_SETTINGS.TIME_SCALE`，上限提升為 5.0。
4. **相機剛度預設顯示值 (R1a / F10)**：
   - 舊版：未就緒或重設時顯示 `3.5`（常數散落錯誤值）。
   - 新版：嚴格綁定引擎初始值 `0.25`（follow）與 `0.2`（zoom）。
5. **窄螢幕 (≤900px) 底部抽屜模式 (U12a)**：
   - 舊版：在手機尺寸下各視窗互相重疊遮蔽，把手可能超出螢幕邊界無法關閉。
   - 新版：視窗自動轉換為 100% 寬度的 Bottom Sheet 抽屜，貼齊螢幕底邊，高度上限 72vh，禁用拖曳把手與雙擊最大化；一次僅顯示最上層啟用之視窗。
6. **觸控點擊區域放大 (U12b)**：
   - 在觸控螢幕（coarse pointer）環境下，視窗標題列按鈕（關閉、收合）與縮放把手之命中點外擴至 ≥44px。

---

## 3. 需使用者手動目視 / 實機確認項

在執行合併前，建議開發者在本機啟動 `npm run dev` 並確認以下 4 項：

- [ ] **A. 桌面版視覺一致性**：開啟 Logs、SkillDB、VFXMap、Monitor 視窗，確認半透明毛玻璃質感、文字字階、陰影與 Token 化前完全逐像素一致。
- [ ] **B. 單位檢視器操作**：在手動模式下點擊任一藍/紅方單位，確認彈出 Inspector 視窗；修改生命值並按 Enter，確認單位血條更新；點選另一單位確認視窗不位移；點選空白處確認視窗關閉。
- [ ] **C. 編輯器塗刷與鏡頭**：使用工具列切換為新增單位、放置障礙物；使用滑鼠滾輪縮放；右鍵/中鍵或平移工具拖曳平移地圖，確認手感維持 100+ FPS 之順暢度。
- [ ] **D. 手機模式模擬**：開啟瀏覽器開發者工具切換為行動裝置（例如 iPhone 12/14，390×844），從選單開啟視窗，確認視窗貼底以抽屜呈現，且內容長列表可正常滑動。

---

## 4. 回退指南 (Rollback Guide)

各階段皆有獨立 commit 與本地 checkpoint tag。若在某功能發現疑慮，可依據以下方式安全回退：

```bash
# 查看所有 checkpoint tags
git tag -l "ui-ckpt-*"

# 回退整個 E8 階段（回到 E8 動工前狀態）
git revert ui-ckpt-E8..HEAD

# 回退單一子階段範例（例如回退相機命令 E8-e2）
git revert ui-ckpt-E8e..ui-ckpt-E8e2

# 回退 U12 響應式與觸控階段
git revert ui-ckpt-U11..ui-ckpt-U12
```

---

## 5. 合併發佈指令範例（僅供參考，請勿自動執行）

> **注意**：確認所有手動項均無異議後，方可由工程負責人執行合併：

```bash
# 1. 切換至 main 分支並確保最新
git checkout main
git pull origin main

# 2. 合併 feat/ui-window 分支
git merge --no-ff feat/ui-window -m "merge: feat(ui-window) complete UI floating windows, tokens, responsive sheet, and UICommand architecture"

# 3. 執行全量最終驗證
npm run lint
npm test
npm run build
npm run e2e:ui

# 4. 推送至遠端發佈（觸發 GitHub Pages 部署）
git push origin main
```
