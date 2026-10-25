# COORD-R1：先修遮擋驗證工具，再修排序距離尺度

用法：`/goal docs/PROJECT_CLEANUP_COORD_R1_AGENT_PROMPT.md`。這是已核准局部設計的實作，不再做一輪泛用根因猜測或全庫「掃描即完成」。

## 0. INV

- 沿用 feat/project-cleanup；產品基底 f08bb75，允許其後主代理的本輪設計文件提交。記錄HEAD與tracked status；保留所有既有untracked文件，不覆寫其他代理改動，不merge/push/rebase。
- 先讀 AGENTS.md、types.ts、constants/geometry.ts、constants/units.ts、RenderSpec、COORD_R1_DESIGN與EVIDENCE。讀每個修改檔的完整責任與方框檔頭。
- 精確可修改範圍：tools/ui-e2e/lib/depth-oracle.mjs；新tools/ui-e2e/coord-oracle-sprite-check.mjs；engine/renderers/frame/UnitFrame.ts；constants/units.ts（本輪僅註解）；engine/renderers/RenderSpec.ts；tests/CoordinateProtocol.test.ts；tools/ui-e2e/cleanup-coord01-check.mjs；新docs/PROJECT_CLEANUP_COORD_R1_REPORT.md；AUDIT01_FINDINGS及HANDOFF的本輪狀態。
- 禁止修改其他產品行為：VisualMath、deathMotion、HexMath/fromPx、物理／戰鬥／AI／技能、facade／tick順序；禁止修改baseline、guard門檻、治理文件與代理設定。不能為了讓總違規歸零擴大修復。
- 兩工作包各一commit；每包先在報告列精確改動與驗證。保持UTF-8及原換行，不as any、不新增依賴。source numbers/colors仍由constants/data供應。
- 長命令runner --detach／--wait直到DONE；同一步失敗兩次記未完成後繼續獨立事項，不留運行命令就結束。整批交付一次，不逐檔問主代理。

## 1. A：修好oracle的障礙物取樣（先做）

已查證 SpriteManager.getObstacleSprite(type,layout,q,r,battleTime) 回傳 ObstacleSprite。參照 RenderDispatcher 的 OBSTACLE 分支，不得把回傳物當Canvas。

1. obstacleBox 改為接收實際op與layout，使用op.ttype/tq/tr及engine.battleTime選相同變體／影格。
2. 在工具專用canvas，以sprite.width/height為目標尺寸；sw有值時讀sx/sy/sw/sh裁切image，否則繪製image全圖。再讀alpha取得mask與包圍盒。canvas整數尺寸用ceil，drawImage仍用真正尺寸，不任意縮放成固定ENV_SPRITE尺寸。
3. 世界位置使用sprite.anchorX/Y，取代ENV_SPRITE固定錨點。快取識別必須包含實際image身分、裁切區、目標尺寸與錨點；不能只依type/layout，也不能每幀以battleTime當key導致無限增長。可以WeakMap(image)→Map(frame/size/anchor key)。
4. 本oracle量測障礙物本體遮擋；additive overlay不當實體遮擋輪廓，明寫此工具能力邊界。不得忽略障礙物以避開錯誤，也不得用空mask／整張矩形fallback取代有效alpha證據。
5. 新增工具驗證：程序化回退、已載入圖集、至少兩個q/r變體與兩個動態影格、非預設錨點；受控合成alpha圖可驗精確crop/縮放/錨點。使用真實API或可還原的測試替身，錯誤／空取樣非零退出。負向控制故意提供錯誤裁切或錨點，必須被攔。若需讀only工具診斷API可加在__DO__，不得新增產品API。
6. 工具恢復後，先在產品未改時重新跑下列座標before，另存完整JSON及log。舊oracle崩潰沒有可比較的PASS基準。

## 2. B：唯一產品修正（A驗證完成才做）

HexUtils.fromPx 在未壓扁平面判格，而 UnitFrameStore.resolveSortHex 目前用壓扁平面距離。修法固定：從constants匯入ISO_SCALE_Y；dNew、dOld皆改用 Math.hypot(footX-center.x, (footY-center.y)/ISO_SCALE_Y)。不改fromPx與座標／繪製數值。

- HEX_HYSTERESIS_PX保留3，文字單位改為未壓扁平面距離（X單位不變）。STILL_PX仍是現有投影腳點累積位移，SORT_DEADBAND_PX仍是投影Y死區；不要一起改。
- 保留原release/released、anchor移動重置、跨一環立即切換及記憶清除流程。不要新增屍體永久鎖定或截斷衰減。
- UnitFrame檔頭、constants註解與RenderSpec同步說明尺度。現有hysteresis測試的距離判定需依新核准單位更新；不能移除測試或放寬其他門檻。

## 3. 回歸與真實事件驗證

tests/CoordinateProtocol.test.ts新增可重現反例：透過真實Agent與UnitFrameStore.build，FLAT與POINTY都測，map offset非零。

- 格A=(2,1)、B=(1,2)，先把toPx的Y除ISO_SCALE_Y取得未壓扁格心差向量(dx,dy)。中點沿切線(dy,-dx)移動0.25倍向量長，取法線兩側0.005單位點，確定fromPx分別為A/B。
- 先在A格心建立記憶，移到A側邊界點並保持至少HEX_RELEASE_FRAMES幀；微移到B側觸發一次釋放，再返回A側。原版應跳回A，新版應保持B。不要直接塞私有記憶來製造PASS。
- 真正回到A格心仍應回A；瞬移至(5,5)立即切換。補慢速累積移動能離開靜止錨點、清除移出agents的記憶與原有deadband測試保留。

更新cleanup-coord01-check：加入明確before/after模式（預設before維持原重現要求），分開輸出，禁止覆蓋舊證據。spy距離式依模式匹配產品：before用原投影尺度，after用新尺度，繼續比對同幀真實UnitFrame與實際out。

- before保留舊static A-B-A的重現；after必須證明相同seed/幀的corpse與hazard仍有有效樣本、幀時間前進、原static pair不再A-B-A，且代表場景staticEvents為0。不能把沒找到物件／沒跑戰鬥當修好。
- moved對照依實際結果記錄，不要求消除所有真實移動翻轉；驗證有移動、有有效render op與一致的派發排序。
- sink=1與void=1是此輪未處理的既有診斷，須原樣揭露。缺失樣本負向控制仍應EXIT=1。

## 4. 驗收命令與門檻

每工作包完成後：lint120、test300、build180。A工具專題probe180。B另做runtime-smoke180、perf:guard900，以及下列同設定before/after（runner900）：

```text
node tools/ui-e2e/coord-guard.mjs --sink --flicker --order --seeds=2 --seedStart=1 --seconds=10 --orderSeconds=10 --biomes=FOREST,VOID,MAGMA --orderBiomes=FOREST,VOID,MAGMA
```

不要加no-crafted；保留兩layout的crafted幾何驗證。將每次out/coord_guard.json立即複製到本輪專用before/after路徑，不能讓覆寫抹掉證據。此命令未加assert，EXIT=0只代表完成；必須讀JSON比較各場景、各group的static/oscillation/stable wrong order，不能只看總數掩蓋新增錯序。

主代理隔離實驗六景static合計14→0、oscillation68→43；這是參考證據，正式整合仍要重測。要求目標static回歸消失、sink/void不新增、沒有新穩定遮擋回歸。新order pair或crafted退步須逐例看原始資料／圖片；無法解釋則B未完成，不擴大改別的系統。

所有基準禁止重錄。若fidelity只有本輪排序預期差異，保留old/new/diff、標FAIL待主審，可單跑perf-ab --assert；無法解釋的差異必須報未完成。最後DocDrift與git diff --check通過。

## 5. 一次交付

COORD_R1_REPORT列A/B commits、每檔原因、before/after數字、真實圖片／JSON、負向控制、所有命令退出碼及未完成ID。更新HANDOFF／FINDINGS但不把全庫清冊改成完成。完整工作包完成才回報；本輪不做奧義或平衡。
