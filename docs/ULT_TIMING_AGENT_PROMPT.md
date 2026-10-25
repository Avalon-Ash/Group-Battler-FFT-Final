# ULT-T01：奧義有效詠唱下限

用法：`/goal docs/ULT_TIMING_AGENT_PROMPT.md`。在清理收尾及已確認阻斷問題獲主審處置後執行；本文件不授權順手修改 COORD01。

## INV

沿用 feat/project-cleanup，記錄起始 SHA 與乾淨 tracked 狀態；其他代理停止修改此 checkout。讀 AGENTS.md、types.ts、constants/combat.ts、ULT_REDESIGN_PLAN、技能資料、data/ui/skillEditor.ts、UICommandSystem、CombatSystem、CastingEngine、VisualSystem、SequenceSystem。舊 R1/BESPOKE/VOLUME 不作執行指令。

允許域：constants/combat.ts、data/skills/blue_ult.ts/red_ult.ts、data/ui/skillEditor.ts、engine/systems/ui/UICommandSystem.ts、engine/systems/combat/CombatSystem.ts/CastingEngine.ts；必要的技能更新純函式放相同 domain，先列路徑與呼叫鏈。表現層只改有效 cast 讀取／取消時序，不改視覺配方。測試新增 ULT 時序回歸及必要既有測試調整；不得弱化斷言。更動超過三檔先寫 ULT_TIMING_REPORT 的精確清單。

保護基準／閾值、facade／tick order、AGENTS/CLAUDE、代理設定與 hooks、架構決策文件。新增常數快照只加本常數，不改無關基準。禁止 push/merge/rebase、新增依賴、as any。保持 CRLF／UTF-8。不跑平衡。

## DOM：具體設計

1. constants/combat.ts 建立唯一具名 1.5 秒下限；以同一純規則計算 ULT 的有效 cast，非 ULT 不變。當前兩份 ult 資料共 50 招，開工重新統計低於下限者（先前 43 招）；只把不足者改為 1.5，rb_u3 現有 2.0 保留。
2. 編輯／替換入口以完整候選 skill 檢查 tag 與 cast：合法有限值若 ULT cast 不足，正規化到下限；將 ACTIVE 改為 ULT 同樣正規化。NaN／非法輸入依既有規則拒絕、不污染資料。UI 回讀正規化後的 SSOT 值。不要只改倒數 timer。
3. 施法入口先取得正規化技能，再設定 timer、讀條所用值與 CAST_START payload；不能有 VFX 使用 .3 秒、timer 使用 1.5 秒的雙重值。保留一個欄位唯一寫入者。施法途中對該技能的編輯／替換本輪採拒絕，避免正在執行的施法讀到新的 cast 或序列；經 UICommandSystem 實作並回歸測試。開工列出所有編輯入口，若無法保持一致，先記阻斷點而非到 renderer 修資料。
4. 不改傷害／治療／護盾／CC／CD／耗魔／AI／目標政策。取消與死亡沿既有 CAST_BREAK／SequenceSystem.cancel 管線，確認預約動作與已生成蓄力體均合理消退。新增中斷原因必須有現有狀態規則依據，不自行加免控。
5. 實際命中以模擬時間判斷，容許 tick 離散誤差但不得早於有效 cast。移動目標維持 F02 契約、AOE 地面鎖定維持。

## 驗收

全50預設下限／rb_u3 2秒、非ULT不變；UI改cast／切tag／替換；施法途中編輯拒絕；不同dt實際CAST_START到結算；取消／死亡／重置不出幽靈爆發。真實 engine 事件測試，不能只測常數。

runner detach/wait：lint120、test300、build180、runtime-smoke180、e2e:ui600、perf:guard900；命令未完不結束，同一步兩次失敗記未完成繼續獨立工作。若 battle_frozen 因預期時序變動失敗，保存 old/new/diff 與因果，記 FAIL 待重錄審查，不得改基準；可單跑 perf-ab --assert。無法解釋的差異阻止交付為完成。

交付 ULT_TIMING_REPORT：base/head、50招cast表、唯一寫入者／有效時間流、變更清單、命令與退出碼、真實事件時間、未完成項；同一包自驗完整後一次回報。此報告作 Claude 視覺整合的入口依據。
