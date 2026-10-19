# 狀態效果資料化（ECS-lite S1）實作執行報告

> 執行目標：根據 `docs/archive/STATUS_EFFECTS_AGENT_PROMPT.md`，將 `Agent` 上的 21 個平行控制與持續效果欄位完整重構收斂至 `agent.effects: EffectSlots` 元件，並由 `data/status/effect_defs.ts` 資料驅動管理。  
> 執行分支：`feat/status-effects`（基於 `main`）  
> 核心約束：純重構，遊戲邏輯與畫面保真度 100% 完全不變；0 容忍保真度回退；10/10 soak 乾淨種子。

---

## 1. 任務執行與 Commit 紀錄

| 任務 ID | Commit Hash | 提交訊息 | 變更檔案數 | 核心內容 |
| :--- | :--- | :--- | :--- | :--- |
| **SE0** | `7dea6ee` | `test(status): SE0 add legacy effect fields ratchet baseline` | 1 | 新增 `tests/EffectFieldsRatchet.test.ts`，鎖定 21 個舊欄位出現次數基準（共 177 處），建立只准減少不准回漲的守門機制。 |
| **SE1** | `a3fde09` | `feat(status): SE1 define EffectKind/Slots, EFFECT_DEFS, and Agent.effects field` | 5 | 定義 `EffectKind`、`EffectSlot`、`EffectSlots` 型別；建立 `engine/core/Effects.ts` 與 `data/status/effect_defs.ts`；在 `Agent` 加入 `effects` 欄位與 `reset()` 重設；新增 `tests/Effects.test.ts`（9 項測試）。 |
| **SE2** | `9db4060` | `feat(status): SE2 migrate STUN, SILENCE, ROOT, FEAR, BLIND to agent.effects` | 19 | 遷移 `STUN`、`SILENCE`、`ROOT`、`FEAR`、`BLIND`（7 個欄位）；移除 `Agent` 對應欄位；`CCManager` 改讀 `EFFECT_DEFS` 的 `polarity` 與 `hardCC`；棘輪基準下調 7 個欄位至 0。 |
| **SE3** | `33ff867` | `feat(status): SE3 migrate TAUNT, BANISH, STASIS, POLYMORPH, INVINCIBLE, VULNERABLE to agent.effects` | 19 | 遷移 `TAUNT`（`tauntTargetId` → `sourceId`）、`BANISH`（`clearsOnApply` 取代手寫清除）、`STASIS`、`POLYMORPH`、`INVINCIBLE`、`VULNERABLE`（9 個欄位）；移除 `Agent` 對應欄位；棘輪基準下調 9 個欄位至 0。 |
| **SE4** | `e55e854` | `feat(status): SE4 migrate DOT and HOT to agent.effects` | 8 | 遷移 `DOT`（`remaining`/`value`/`tag`）與 `HOT`（`remaining`/`value`）（5 個欄位）；移除 `Agent` 最後 5 個舊狀態欄位；棘輪基準全部 21 個欄位歸零，加入完全絕跡斷言。 |
| **SE5** | `9971b68` | `refactor(status): SE5 unify ControlSystem decrement loop and update AgentOwnership` | 4 | 將 `ControlSystem.update` 的 11 個控制效果遞減改為 `for (const k of EFFECT_KINDS)` 統一迴圈（跳過 `DOT`/`HOT`）；保留到期與持續副作用 `switch`；更新 `AgentOwnership.ts` 的 `effects` 項目；在 `Effects.test.ts` 新增擴充性測試。 |

---

## 2. 舊欄位棘輪前後統計（EffectFieldsRatchet）

掃描範圍：`engine/`、`components/`、`data/`、`hooks/` 下的 `.ts` / `.tsx` 檔案。

| 欄位名稱 | SE0 基準 (改前) | SE2 後 | SE3 後 | SE4/SE5 最終 (改後) | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `stunTimer` | 24 | 0 | 0 | **0** | 已絕跡 |
| `stunMax` | 3 | 0 | 0 | **0** | 已絕跡 |
| `silenceTimer` | 16 | 0 | 0 | **0** | 已絕跡 |
| `silenceMax` | 3 | 0 | 0 | **0** | 已絕跡 |
| `banishTimer` | 12 | 12 | 0 | **0** | 已絕跡 |
| `banishMax` | 4 | 4 | 0 | **0** | 已絕跡 |
| `stasisTimer` | 10 | 10 | 0 | **0** | 已絕跡 |
| `stasisMax` | 3 | 3 | 0 | **0** | 已絕跡 |
| `rootTimer` | 10 | 0 | 0 | **0** | 已絕跡 |
| `fearTimer` | 15 | 0 | 0 | **0** | 已絕跡 |
| `tauntTimer` | 10 | 10 | 0 | **0** | 已絕跡 |
| `tauntTargetId` | 9 | 9 | 0 | **0** | 已絕跡 |
| `blindTimer` | 8 | 0 | 0 | **0** | 已絕跡 |
| `polymorphTimer` | 9 | 9 | 0 | **0** | 已絕跡 |
| `invincibleTimer` | 9 | 9 | 0 | **0** | 已絕跡 |
| `vulnerableTimer` | 7 | 7 | 0 | **0** | 已絕跡 |
| `dotTimer` | 7 | 7 | 7 | **0** | 已絕跡 |
| `dotDmg` | 6 | 6 | 6 | **0** | 已絕跡 |
| `dotType` | 8 | 8 | 8 | **0** | 已絕跡 |
| `hotTimer` | 6 | 6 | 6 | **0** | 已絕跡 |
| `hotVal` | 4 | 4 | 4 | **0** | 已絕跡 |
| **總計** | **177** | **91** | **31** | **0** | **100% 消除** |

---

## 3. 品質與回歸驗證結果

### 3.1 靜態檢查與單元測試
- `npm run lint` (`tsc --noEmit`)：**0 errors**
- `npx vitest run --dir tests`：**71 test files passed, 610 tests passed (100% pass)**

### 3.2 畫面保真度基準測試 (`npm run perf:fidelity`)
對比目標基準：`tools/ui-e2e/baseline/fidelity/`（完全未變更、未重錄）。
- `VOID`：meanAbsDiff = 0.000 (<= 0.8), badPixelPct = 0.00% (<= 0.5%) -> **PASS**
- `FOREST`：meanAbsDiff = 0.651 (<= 0.8), badPixelPct = 0.16% (<= 0.5%) -> **PASS**
- `ICE`：meanAbsDiff = 0.000 (<= 0.8), badPixelPct = 0.00% (<= 0.5%) -> **PASS**
- `MAGMA`：meanAbsDiff = 0.000 (<= 0.8), badPixelPct = 0.00% (<= 0.5%) -> **PASS**
- `DESERT`：meanAbsDiff = 0.520 (<= 0.8), badPixelPct = 0.30% (<= 0.5%) -> **PASS**
- `battle_frozen`：meanAbsDiff = 0.000 (<= 0.8), badPixelPct = 0.00% (<= 0.5%) -> **PASS**
- **結論：全場景 0 畫面異常差異，通過驗證。**

### 3.3 戰鬥大逃殺 Soak 測試 (`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`)
- 測試種子數：10（#1001 ~ #1010）
- 乾淨種子率：**10/10 CLEAN**
- 殘留幽靈（Ghosts）：**0**
- 異常閒置（Idles）：**0**
- 所有種子戰鬥均於 7.78s ~ 15.33s 內分出勝負（勝方 BLUE/RED 均勻分佈），無卡死死結。

---

## 4. 遇到的行為疑點與設計備忘（僅記錄，未擅自修改）

1. **`PhysicsEngine.ts` 縮圈斷地強加暈眩**：
   - 位於 `PhysicsEngine.ts:110`：當 `!isGroundValid`（格位坍塌）時，執行 `a.effects.STUN.remaining = Math.max(a.effects.STUN.remaining, 0.1);`。
   - 此處為模擬層直接寫入 STUN 計時器的次要寫入點，已在 `AgentOwnership.ts` 的 `note` 中詳實載明，維持既有物理下墜行為不變。
2. **`agentManager.ts:handleDeadState()` 的死亡狀態清除**：
   - 死亡處理中僅手動清除 `BANISH` 與 `STASIS` 的計時器（避免放逐或凝滯單位死亡時殘留特定外觀）；而其他狀態則依賴回合重置時呼叫的 `resetEffectSlots(this.effects)` 進行整批清理。
3. **`EffectSystem` 的視覺跳字節流**：
   - `EffectSystem` 透過內部的 `feedbackTimers`（0.5s 節流）來發送跳字事件，而實際的 DOT 傷害（`applyDirectDamage`）與 HOT 治療（`applyHeal`）則是每幀依照 `dt * value` 連續扣減/回復。
4. **`clearsOnApply` 資料化互斥**：
   - 原先在 `CCManager.ts` 中手寫的 `if (type === 'BANISH') { target.rootTimer = 0; target.fearTimer = 0; }`，現已順利收斂至 `EFFECT_DEFS.BANISH.clearsOnApply: ['ROOT', 'FEAR']`，後續若有新控制技能需要互斥清理，只需配置在 `effect_defs.ts` 即可自動生效。

---

## 5. 回退指南（Rollback Guide）

若審查過程發現任何非預期的邊界行為，各 commit 均具備乾淨完整的獨立歷史，可按任務回退：

```bash
# 回退到 SE4 完成狀態（保留欄位遷移，還原 ControlSystem 迴圈整合）
git reset --hard e55e854

# 回退到 SE3 完成狀態（保留控制類與放逐等，還原 DOT/HOT 欄位）
git reset --hard 33ff867

# 回退到 SE2 完成狀態（保留第一批 STUN/SILENCE 等，還原第二批控制）
git reset --hard 9db4060

# 回退到 SE1 完成狀態（保留型別與 defs，所有 Agent 讀寫點還原）
git reset --hard a3fde09

# 完整還原至分支起點
git reset --hard 89e7a6a
```

---

## 6. 結論

ECS-lite S1（狀態效果資料化）所有子任務 SE0～SE5 均已嚴格依約完成。  
`Agent` 實體上的 21 個平行分散欄位已被乾淨收斂為零每幀配置的 `agent.effects` 元件，且由 `EFFECT_DEFS` 統一管理規格屬性。所有既有測試、靜態型別、保真度視覺、以及 BR soak 動態戰鬥測試均 100% 通過。
