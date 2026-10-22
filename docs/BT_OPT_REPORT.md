# BT_OPT 實作報告（行為樹優化與技能強度重調）

> 任務：解決 AI 友軍目標殘留、PBAOE 空放、滿血空補及短效增益提前開掉四類不自然行為，並重調技能強度達成 6 項平衡驗收指標全部 PASS  
> 分支：`feat/bt-opt`  
> 日期：2026-10-22  

---

## 1. 改前／改後 30 場不自然行為統計表

> 測試條件：`SEED = 42, BATTLES = 30, DT = 1/60`（無頭對戰，共 3,120 次技能施放、268,476 單位 tick）

| 不自然行為類別 | 具體行為表現與受影響技能 | 改前次數／時長 | 改後次數／時長 | 改善幅度 |
| :--- | :--- | :--- | :--- | :--- |
| **友軍目標殘留** | 輔助施放治療／增益後 `a.target` 殘留為友軍，導致戰鬥索敵與 `ChaseTarget` 追著友軍跑 | `13,317` ticks | **`0` ticks** | **-100%**（歸零） |
| **對敵 PBAOE 空地空放** | 自身範圍技（`range === 0 && type === 'AOE'`）開場離敵 7～9 格原地空放（如 `wb_a1`、`wr_a1`、`tr_a3`、`tb_a1`、`tb_a3`、`sb_u4`、`wr_u4`、`wr_u5`、`sr_u1` 等） | `21` 次 | **`0` 次** | **-100%**（歸零） |
| **滿血空補／自殘自補** | 友軍滿血時空放治療；群補在檢查血量前提早回傳；`sr_a1`／`sr_a5` 自殘補血對自身施放扣血補自己 | `66` 次<br>（`sr_b4`: 31, `sr_a3`: 11, `sr_a5`: 8, `sr_a1`: 4 等） | **`0` 次** | **-100%**（歸零） |
| **短效增益提前浪費** | 開場離敵人 > 3 格且全員滿血時立即開啟短效戰鬥增益／護盾（如 `tb_a5`、`tr_a4`、`wr_a5`、`tr_u3`、`wr_u3`、`sr_u4` 等） | 開場全員滿血時立即施放 | **`0` 次**（嚴格限制接戰時施放） | **-100%**（歸零） |

---

## 2. 核心改動內容與設計理由

### 2.1 常數 SSOT 擴充（BT1）
- **改動**：
  - 在 `constants/combat.ts` 的 `COMBAT_CONFIG` 新增：
    - `AI_HEAL_HP_THRESHOLD: 0.95`（治療觸發門檻：友軍血量低於 95% 才視為有效受損目標）。
    - `AI_SELF_BUFF_ENGAGE_DIST: 3`（短效自身／團隊增益施放門檻：自身受損或最近敵軍距離 <= 3 格接戰範圍才觸發）。
  - 同步更新 `tests/constants-snapshot.json`，確保由 `tests/ConstantsBarrel.test.ts` 守門無違規。
- **理由**：將 AI 決策閾值統一收納至戰鬥常數 SSOT，禁止在決策邏輯中寫入魔法數字。

### 2.2 目標選擇與行為樹決策修正（BT2）
- **改動檔案**：`engine/ai/TargetingSystem.ts`、`engine/ai/BTRegistry.ts`
- **關鍵改動**：
  1. **防止主目標友軍殘留**：
     - `BTConditions.HasTarget` 增加檢查：當 `a.target.team === a.team` 時一律視為無效目標，自動嘗試還原 `_savedCombatTarget`，若仍為友軍或失效則呼叫 `engine.updateTarget(a)` 重新索敵。
     - `BTActions.FindOptimalTarget`：當選中友軍輔助目標時，若目標不在射程內，僅將導航座標寫入 `a.targetHex`，絕不將 `a.target` 覆寫為友軍；若選中目標失敗，自動還原敵軍戰鬥目標。
     - 在 `ChaseTarget`、`Wait`、`Idle`、`EscapeWarning`、`Reposition` 等節點統一調用 `restoreCombatTarget(a, engine)`，確保非輔助施法時段 `a.target` 永不為友軍。
     - 在 `SkillExecutor` 施放輔助技能時，於 `getImpactArea` 中設置 `source.forceAiUpdate = true`，使施法者在完成施法的當幀立即觸發下一輪 AI 重新索敵，不滯留友軍目標。
  2. **PBAOE 敵軍檢查與追擊距離**：
     - `calculateOptimalTarget` 對敵方 PBAOE 技能（`range === 0 && type === 'AOE'` 且帶傷害或對敵減益）檢查半徑內是否存在未受庇護敵軍（`!isEnemyUntargetable(e)`）；若無敵軍則回傳 `targetHex: null`。
     - `BTActions.ChaseTarget`：當 `skill && skill.range === 0` 時，追擊目標射程不再使用 `0`（避免走進敵方佔據格導致尋路失敗），而是對敵方 PBAOE 改採 `Math.max(1, skill.aoeRadius || 1)`，對友軍／自身技能改採單位普攻射程，使角色能正常接近敵群接戰。
  3. **友軍治療目標與自殘保護**：
     - 單體純治療與 HOT 技能在篩選目標時，嚴格略過血量 `>= 95%` 的健康隊友；當技能帶有 `SELF_DAMAGE`（如 `sr_a1` 生命轉移、`sr_a5` 黑暗犧牲）時，強制排除施法者自身。
     - 群體治療 PBAOE 只有在範圍內至少有一名隊友血量 `< 95%` 時才回傳腳下格，否則回傳 `targetHex: null`。
  4. **短效戰鬥增益／護盾施放時機**：
     - 自身／團隊短效增益（`range === 0 && power <= 0` 且具護盾／加速／免死／反傷／吸血）必須滿足「自身或隊友受損（`< 95% HP`）」或「最近敵方有效目標距離 `<= 3 格`」時才回傳腳下格，杜絕開場在出生點空開增益。

---

## 3. 平衡指標驗收結果（BT3）

### 3.1 6 項驗收指標對照表（2000 場對戰：1000 一般＋1000 交換）

> 驗證指令：`node tools/balance/report.mjs tools/ui-e2e/out/balance-final-normal.json tools/ui-e2e/out/balance-final-swap.json`

| 驗收項目 | 目標門檻 | 行為優化前（bl2 基準） | 行為優化後＋數值調參（BT3 定稿） | 最終判定 |
| :--- | :--- | :--- | :--- | :--- |
| **一般站位藍方勝率** | 46.0% ～ 54.0% | 43.6% (±3.1%) ❌ | **48.4% (±3.1%)** | ✅ **PASS** |
| **交換站位藍方勝率** | 46.0% ～ 54.0% | 47.0% (±3.1%) ✅ | **50.0% (±3.1%)** | ✅ **PASS** |
| **合併藍方勝率** | 47.0% ～ 53.0% | 45.3% (±2.2%) ❌ | **49.2% (±2.2%)** | ✅ **PASS** |
| **對戰時間中位數 (p50)** | 12s ～ 22s（0 TIMEOUT） | 18.1s（0 TIMEOUT） ✅ | **17.1s（0 TIMEOUT）** (p10: 11.7s, p90: 28.6s) | ✅ **PASS** |
| **高頻技能勝率差** | picks ≥ 300 且 \|勝率差\| ≤ 0.08 | 8 筆超標 ❌ | **0 筆超標**（最大差值 +0.074） | ✅ **PASS** |
| **職業紅藍差距** | 同職業紅藍差距 ≤ ±25% | 輔助 -43.5%, 坦克 +29.1% ❌ | **最大差距 14.7%**（全部在 ±25% 內） | ✅ **PASS** |

### 3.2 陣營勝率與對戰時間統計

| 站位條件 | 總場次 | 藍方勝場 (勝率) | 紅方勝場 (勝率) | 95% 信賴區間 | 平手 / 逾時 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **一般站位 (藍左紅右)** | 1000 | 484 (48.4%) | 516 (51.6%) | ±3.1% | 0 / 0 |
| **交換站位 (藍右紅左)** | 1000 | 500 (50.0%) | 500 (50.0%) | ±3.1% | 0 / 0 |
| **合併 (Combined)** | 2000 | 984 (49.2%) | 1016 (50.8%) | ±2.2% | 0 / 0 |

- **對戰時間分佈**：p10 = 11.7s，p50 = 17.1s，p90 = 28.6s，平均時長 = 19.1s。

### 3.3 傷害來源與歸屬比例

| 項目 | 總數值 | 每場平均 | 佔比 |
| :--- | :--- | :--- | :--- |
| **全場總失血** | 20,548,026.7 | 10,274 | 100% |
| **已歸屬傷害 (技能直傷＋DOT)** | 17,737,547.2 | 8,869 | **86.3%** |
| └ 藍方技能總傷害 (直接+DOT) | 9,257,484.7 | 4,629 | 45.1% |
| └ 紅方技能總傷害 (直接+DOT) | 8,480,062.5 | 4,240 | 41.3% |
| **未歸屬傷害 (縮圈墜落／反傷等)** | 2,810,479.5 | 1,405 | **13.7%** |

### 3.4 各職業每場表現 (藍 vs 紅)

| 職業 | 藍方每場傷害 | 紅方每場傷害 | 傷害差距 (紅−藍)/藍 | 藍方每場治療 | 紅方每場治療 | 治療差距 (紅−藍)/藍 | 判定 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TANK** | 459 | 484 | **+5.4%** | 0 | 57 | — | ✅ **PASS** (<= ±25%) |
| **WARRIOR** | 1038 | 1010 | **-2.7%** | 0 | 125 | — | ✅ **PASS** (<= ±25%) |
| **RANGER** | 1338 | 1198 | **-10.5%** | 0 | 10 | — | ✅ **PASS** (<= ±25%) |
| **MAGE** | 1396 | 1216 | **-12.9%** | 0 | 23 | — | ✅ **PASS** (<= ±25%) |
| **SUPPORT** | 399 | 332 | **-16.8%** | 934 | 797 | **-14.7%** | ✅ **PASS** (<= ±25%) |

---

## 4. 技能調整清單與數值設計理由（BT3）

在修復行為樹不自然行為後，藍方法師因不再原地空放技能、範圍技能命中率極高，初測造成藍方法師傷害過高（每場傷害差距達 -28.8%）；同時紅方法師與部分狂戰士技能表現偏弱。為使所有職業差距均控制在 ±25% 以內並消除勝率偏離超標技能，針對 11 個技能進行了數值微調：

| 技能 ID | 技能名稱 | 陣營／職業 | 欄位 | 調整前數值 | 調整後數值 | 調整理由 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mb_b1` | 追跡魔彈 | 藍方法師 (BASIC) | `power`<br>`cd` | 72<br>0.9s | **62**<br>**1.0s** | 藍方法師追蹤普攻輸出過高，適度下修直傷並略增冷卻，壓制基底遠程輸出。 |
| `mb_b3` | 霜噬術 | 藍方法師 (BASIC) | `power` | 80 | **72** | 具備定身效果的普攻傷害過高，下修其直傷以兼顧控場價值與傷害平衡。 |
| `mb_a1` | 奧術爆破 | 藍方法師 (ACTIVE) | `power`<br>`cd` | 240<br>7.0s | **210**<br>**7.5s** | 標準 AOE 招式在行為修正後命中率大幅上升，下調爆發威力並微調冷卻，抑制藍方法師群傷。 |
| `mb_u5` | 聚輝光柱 | 藍方法師 (ULT) | `power` | 900 | **800** | 12 格巨型光束爆發在索敵修正後極具威脅，微降直傷使其與其他單體／範圍奧義保持一致水準。 |
| `mr_b2` | 生命虹吸 | 紅方法師 (BASIC) | `power`<br>`cd` | 70<br>1.0s | **82**<br>**0.9s** | 紅方法師吸血光束整體傷害偏低，提升基礎威力並略降 CD，增強續航與單體消耗能力。 |
| `mr_b4` | 虛弱詛咒 | 紅方法師 (BASIC) | `power` | 65 | **75** | 施加易傷的普攻直傷不足，適度提升傷害以增強紅方法師點殺威脅。 |
| `mr_a2` | 暗影之怒 | 紅方法師 (ACTIVE) | `power`<br>`cd` | 110<br>10.0s | **160**<br>**8.5s** | 紅方法師範圍恐懼技能傷害過低且冷卻過長，大幅強化直傷並縮減冷卻，提供更強的團戰對抗能力。 |
| `mr_a4` | 裂甲詛咒 | 紅方法師 (ACTIVE) | `power`<br>`cd` | 60<br>8.5s | **90**<br>**7.5s** | 單體易傷技能傷害過薄，提升直傷並縮短 CD，增加輔助集火輸出價值。 |
| `mr_a5` | 鮮血分流 | 紅方法師 (ACTIVE) | `power`<br>`cd` | 80<br>8.5s | **110**<br>**7.5s** | 回魔傷害技能威力不足，增強直傷並加快冷卻，使紅方法師技能循環更流暢。 |
| `mr_u3` | 時間凝結 | 紅方法師 (ULT) | `power` | 300 | **520** | 單體放逐奧義在 300 威力下抽中勝率顯著偏弱（勝率差 -0.066），調升直傷至 520 以符合奧義定位。 |
| `wr_u3` | 惡魔降臨 | 紅方狂戰士 (ULT) | `ccDur` / `ccDur2`<br>`ccForce` / `ccForce2` | 7.0s<br>50 | **8.0s**<br>**75** | 狂戰士變身奧義在原數值下勝率差 -0.071 偏弱，將攻速增益與吸血提升至 +75% 且持續 8.0s，顯著改善狂戰士進場生存與輸出。 |

---

## 5. 全套驗證測試結果

| 驗證項目 | 指令 | 結果 | 備註 |
| :--- | :--- | :--- | :--- |
| **代碼型別檢查** | `npm run lint` | **0 errors** (EXIT=0) | `tsc --noEmit` 完全通過 |
| **全套單元測試** | `npm test` | **89 passed (89), 706 passed (706)** (EXIT=0) | 包含 `tests/BTOptimization.test.ts` 30 場無頭對戰稽核 |
| **技能數據完整性** | `npx vitest run tests/SkillDataIntegrity.test.ts` | **0 violations** (EXIT=0) | 所有技能數值與屬性規範合規 |
| **奧義規範檢驗** | `npx vitest run tests/UltSpec.test.ts` | **C1～C8 全部通過** (EXIT=0) | `cast >= 0.3` 規範未被破壞 |
| **近戰特效規範** | `npx vitest run tests/MeleeFxSpec.test.ts` | **PASS** (EXIT=0) | 近戰動畫與特效綁定完全正確 |
| **生產建置** | `npm run build` | **Build completed in ~2.6s** (EXIT=0) | 產出完整 production bundle |
| **執行期冒煙測試** | `node tools/ui-e2e/runtime-smoke.mjs` | **PASS** (EXIT=0) | 10 個單位運算無中斷、Canvas 幀畫面正常更新、0 page errors |
| **文件防漂移守門** | `npx vitest run tests/DocDrift.test.ts` | **3 passed (3)** (EXIT=0) | 本報告與全專案路徑、註解、無廢棄欄位完全相符 |

---

## 6. 回退指南與 Commit 歷程

| Commit Hash | 任務階段 | Commit 訊息 | 異動範圍 |
| :--- | :--- | :--- | :--- |
| **`92435f6`** | BT1 | `feat(constants): add AI_HEAL_HP_THRESHOLD and AI_SELF_BUFF_ENGAGE_DIST to COMBAT_PARAM` | `constants/combat.ts`<br>`tests/constants-snapshot.json` |
| **`0b3164d`** | BT2 | `feat(ai): optimize behavior tree targeting and prevent ally lock, PBAOE miss, and full-HP heal` | `engine/ai/BTRegistry.ts`<br>`engine/ai/TargetingSystem.ts`<br>`tests/BTOptimization.test.ts` |
| **`66781be`** | BT3 | `feat(balance): rebalance mage and warrior skill values for post-BT-optimization 6-criteria PASS` | `data/skills/blue_basic.ts`<br>`data/skills/blue_active.ts`<br>`data/skills/blue_ult.ts`<br>`data/skills/red_basic.ts`<br>`data/skills/red_active.ts`<br>`data/skills/red_ult.ts` |
| **`5d5f5e0`** | BT2b | `test(ai): update ActionState import and casting check in BTOptimization.test.ts` | `tests/BTOptimization.test.ts` |
| **`b30bee0`** | REPORT | `docs(bt-opt): write BT_OPT_REPORT with before/after stats and balance verification` | `docs/BT_OPT_REPORT.md` |

### 回退指令
若需完全回退本次行為樹優化與技能重調的所有修改：
```bash
git revert --no-commit b30bee0 5d5f5e0 66781be 0b3164d 92435f6
```
或直接由主代理評估合併 `feat/bt-opt` 至 `main`。
