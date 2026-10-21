# 近戰攻擊與受擊特效（MF）執行報告

> 任務目標：依 `docs/ART_SPEC.md` §4～§6 盤點並補全近戰普攻揮擊動作與主動技專屬受擊特效，解決「近戰普攻空序列／直線雷射、主動技沿用普攻受擊包」之問題。
> 分支：`feat/melee-fx`
> 規格門檻：`tests/MeleeFxSpec.test.ts`（M1～M4 棘輪測試，最終達成 0 違規）。
> 審查修正：commit `3dbd265`（MF-FIX）修掉 MF4 造成的主動技主特效消失，詳見 §0。本報告的數字都是 MF-FIX 之後重跑的結果。

---

## 0. 審查發現與修正（MF-FIX，`3dbd265`）

**MF4 的錯誤**：MF4 依提示詞 §1 的前提「序列 PARTICLE 會和扣血時的 `HIT_FX` 疊兩次」，在 `SkillSequences.ts` 加了全域去重（序列粒子＝`visualHitEffect` 就不放），並把 7 招目標主動技的 `impactFx` 拿掉、只改 `visualHitEffect`。但 `engine/systems/combat/SkillExecutor.ts:234-235` 的規則是：

```ts
const ownHit = skill.tag === 'BASIC' || (skill.tag === 'ACTIVE' && (skill.projectileSpeed ?? 0) > 0);
const hitFX = (ownHit && skill.visualHitEffect) || FACTION_VISUALS[source.team].defaultHitEffect;
```

**無投射物的主動技，`HIT_FX` 只播陣營預設小打擊，不播 `visualHitEffect`**；主特效只由序列播。所以 MF4 之後：

| 影響 | 技能 |
| :-- | :-- |
| 7 招新的專屬命中特效**從來沒有播出**（序列已拿掉，`HIT_FX` 又不播） | `tb_a5`, `wb_a5`, `tr_a4`, `wr_a1`, `wr_a2`, `wr_a4`, `sr_a3` |
| 本輪不該動的主動技**主特效整個消失**（24 招） | `tb_a1`, `tb_a2`, `tb_a3`, `wb_a1`, `wb_a3`, `wb_a4`, `mb_a2`, `mb_a3`, `sb_a1`～`sb_a5`, `tr_a3`, `tr_a5`, `wr_a3`, `wr_a5`, `mr_a2`, `mr_a5`, `sr_a2`, `sr_a4`, `sr_a5` |

`battle_frozen` 在 MF4 後 FAIL（0.50%）就是這個原因；修正後回到 0.32%（MF0 是 0.33%），**不需要重錄**。

**修正內容**：
1. `data/vfx/SkillSequences.ts`：主動技區段逐字還原成 `main`（只加一行註解說明上面的規則）。
2. `data/vfx/active_visuals.ts`：7 招目標主動技的 `impactFx` 指向各自的新特效（序列播一次）；`visualHitEffect` 也指向同一特效（M3、Inspector 一致）。實機每招：序列播專屬特效 ×1＋`HIT_FX` 播陣營預設小打擊 ×1，沒有同一特效疊兩次。
3. `tests/MeleeFxSpec.test.ts`：
   - M3 另外要求專屬特效「實機會播」（無投射物 → 序列必須有它）。
   - M4 改成和 `HIT_FX` **實際播放的特效**比（照 `SkillExecutor` 的 `ownHit` 規則）：有投射物 → `visualHitEffect`（＝提示詞原文）；無投射物 → 陣營預設命中包。提示詞原文的 M4 前提在無投射物主動技上不成立。
   - `UPDATE_BASELINE=1` 不能再把新違規寫進基準（原本會先寫檔再比對，等於可以放寬）。
   - 新增回歸測試：每一招有 `impactFx` 的無投射物主動技，序列都要播它（在 MF4 的 HEAD 上會抓到 19 招以上）。
4. `data/vfx/registry/melee_parts.ts`：`sr_a3`（範圍治療＋HOT，技能色 `#84cc16`）的圖騰與上升液滴改用 `ASH_POISON`，原本全血紅的液滴看起來像受傷。

修正後與 `main` 相比，序列有變動的技能只剩上表 25 招＋`wb_b2`（射程 2 的長槍普攻，和 `tr_b5` 同屬 `MELEE_PIERCE` 原型，一起多了尖端閃光；不在提示詞表上，保留並在此揭露）。

---

## 1. 規格驗收成果（MeleeFxSpec 改前／改後對照）

測試檔案：[`tests/MeleeFxSpec.test.ts`](file:///c:/Git/Group-Battler-FFT-Final/tests/MeleeFxSpec.test.ts)
棘輪基準：[`tests/melee-fx.baseline.json`](file:///c:/Git/Group-Battler-FFT-Final/tests/melee-fx.baseline.json)

| 規格代號 | 規格定義 | MF1 改前違規清單（32 項次） | 最終改後違規清單 | 達成狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **M1** | 近戰普攻序列至少有 1 個揮擊（`PARTICLE` 或 `BEAM`），且不含 `SHAKE`／`GRID_PULSE` | `tb_b1`, `tb_b2`, `tb_b3`, `tb_b4`, `wb_b4`, `tr_b3`, `tr_b4`, `wr_b4`（共 8 招空序列） | **0** | **PASS** |
| **M2** | 普攻揮擊＋命中包，各發射器最晚結束 ≤ 0.35 s，粒子上限總和 ≤ 14 | `tb_b4`, `wb_b5`, `tr_b1`, `tr_b2`, `tr_b3`, `tr_b4`, `tr_b5`, `wr_b1`, `wr_b3`, `wr_b4`, `wr_b5`（共 11 招） | **0** | **PASS** |
| **M3** | 近戰主動技 `visualHitEffect` 不得沿用普攻命中包；發射器 2～6 個、最晚結束 ≤ 0.8 s、粒子數 ≤ 36；且實機會播（MF-FIX 加） | `tb_a5`, `wb_a5`, `tr_a4`, `wr_a1`, `wr_a2`, `wr_a4`, `sr_a3`（共 7 招） | **0** | **PASS** |
| **M4** | 序列 `PARTICLE` 不得與扣血時 `HIT_FX` 實際播放的特效同 id（MF-FIX 依 `SkillExecutor` 修正定義） | MF1 依原文定義記錄：`tb_a5`, `wb_a5`, `tr_a4`, `wr_a1`, `wr_a2`, `wr_a4`（6 招） | **0** | **PASS** |

---

## 2. 渲染保真度（Fidelity 6 場景改前／改後）

門檻：`meanAbsDiff <= 0.8`，`badPixelPct <= 0.5%`。MF-FIX 後重跑 `npm run perf:guard`（log：`tools/ui-e2e/out/agent-logs/rv_guard.log`），全部 PASS，效能護欄全部 PASS（各場景 4.17 ms）。

| 場景 ID | MF0 基準數值 | MF4 後（修正前） | MF-FIX 後最終 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **VOID** | mean=0.216, bad=0.03% | 相同 | mean=0.216, bad=0.03% | PASS（一致） |
| **FOREST** | mean=0.651, bad=0.17% | 相同 | mean=0.651, bad=0.17% | PASS（一致） |
| **ICE** | mean=0.253, bad=0.22% | 相同 | mean=0.253, bad=0.22% | PASS（一致） |
| **MAGMA** | mean=0.249, bad=0.04% | 相同 | mean=0.249, bad=0.04% | PASS（一致） |
| **DESERT** | mean=0.530, bad=0.23% | 相同 | mean=0.530, bad=0.23% | PASS（一致） |
| **battle_frozen** | mean=0.308, bad=0.33% | mean=0.418, bad=0.50% **FAIL** | mean=0.305, bad=0.32% | PASS，不需重錄 |

---

## 3. 手感對照圖（Feel Sheet Artifacts）

`node tools/vfx/ult-sheet.mjs --feel --ids=<25 招> --times=0.02,0.1,0.25 --name=<名稱>`：
- **改前**：[`tools/ui-e2e/out/ult/melee_before.png`](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/ult/melee_before.png)
- **改後**：[`tools/ui-e2e/out/ult/melee_after.png`](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/ult/melee_after.png)（MF-FIX 後重拍；MF4 版的改後圖裡 7 招主動技沒有專屬特效）

---

## 4. 新增與調整特效構成一覽

全部定義於 [`data/vfx/registry/melee_parts.ts`](file:///c:/Git/Group-Battler-FFT-Final/data/vfx/registry/melee_parts.ts)，在 [`data/vfx/VFXRegistry.ts`](file:///c:/Git/Group-Battler-FFT-Final/data/vfx/VFXRegistry.ts) 登記。下表數字由登記資料直接算出（發射器數／最晚結束＝max(delay)+max(lifetime)／粒子數上限）。

### A. 普攻揮擊（MF2 藍、MF3 紅；全部延遲 0、≤ 0.2 s）

| 特效 | 使用技能 | 發射器 | 最晚結束 | 粒子 | 構成 |
| :-- | :-- | :-: | :-: | :-: | :-- |
| `FX_SWING_BLUE_SLASH` | 藍 SLASH（非聖光） | 1 | 0.16 s | 1 | `slashArc` R36 120° 厚 8 `LION_PHYSICAL` |
| `FX_SWING_BLUE_SLASH_HOLY` | `wb_b5` | 1 | 0.16 s | 1 | `slashArc` R36 125° 厚 8 `LION_HOLY` |
| `FX_SWING_BLUE_CLEAVE` | `tb_b5` | 1 | 0.18 s | 1 | `slashArc` R44 150° 厚 12 `LION_PHYSICAL` |
| `FX_SWING_BLUE_CLEAVE_ARCANE` | `wb_b3` | 1 | 0.18 s | 1 | `slashArc` R44 150° 厚 12 `LION_ARCANE` |
| `FX_SWING_BLUE_CROSS_1`／`_2` | `wb_b1` | 1＋1 | 0.15 s（第二道延遲 0.08 s） | 1＋1 | `slashArc` R34 110° 厚 7 `LION_LIGHTNING`，反向旋轉 |
| `FX_SWING_BLUE_SMASH` | `tb_b1`, `wb_b4` | 2 | 0.20 s | 2 | `rays` R32 ×6＋地面環 `LION_PHYSICAL` |
| `FX_SWING_BLUE_SMASH_LIGHTNING` | `tb_b2`, `tb_b3` | 2 | 0.20 s | 2 | `bolt` 48＋地面環 `LION_LIGHTNING` |
| `FX_SWING_BLUE_SMASH_HOLY` | `tb_b4` | 2 | 0.20 s | 2 | `rays` R30 ×6＋地面環 `LION_HOLY` |
| `FX_SWING_BLUE_PIERCE_TIP` | （藍 PIERCE：`wb_b2`） | 1 | 0.14 s | 1 | `glow` R20 `LION_PHYSICAL` |
| `FX_SWING_RED_SLASH` | `tr_b2`, `wr_b1` | 1 | 0.16 s | 1 | `slashArc` R38 125° 厚 9 `ASH_BLOOD` |
| `FX_SWING_RED_CLEAVE` | `tr_b1`, `wr_b3` | 1 | 0.18 s | 1 | `slashArc` R46 155° 厚 13 `ASH_PHYSICAL` |
| `FX_SWING_RED_CROSS_1`／`_2` | `wr_b5` | 1＋1 | 0.15 s（第二道延遲 0.08 s） | 1＋1 | `slashArc` R36 115° 厚 8 `ASH_BLOOD`，反向旋轉 |
| `FX_SWING_RED_SMASH` | `tr_b3`, `tr_b4`, `wr_b4` | 2 | 0.20 s | 2 | 崩裂 `rays` R32 ×6（lengthJitter）＋粗糙地面環 `ASH_PHYSICAL` |
| `FX_SWING_RED_PIERCE_TIP` | `tr_b5` | 1 | 0.14 s | 1 | `glow` R22 `ASH_BLOOD` |

### B. 7 招近戰主動技專屬命中（MF4，序列經 `impactFx` 播放）

| 特效 | 技能 | 發射器 | 最晚結束 | 粒子 | 構成 |
| :-- | :-- | :-: | :-: | :-: | :-- |
| `FX_ACTIVE_BLUE_PRISM_REFLECT` | `tb_a5` | 4 | 0.60 s | 9 | 閃光 R48＋地面環＋`rays` R48 ×6＋電光噴濺，全 `LION_LIGHTNING` |
| `FX_ACTIVE_BLUE_JUDGMENT_SLASH` | `wb_a5` | 5 | 0.47 s | 10 | `slashArc` R56 厚 14 `LION_PHYSICAL`＋閃光＋衝擊環＋`rays` R50 ×8 `LION_HOLY`＋聖光噴濺 |
| `FX_ACTIVE_RED_BLOOD_BARRIER` | `tr_a4` | 4 | 0.70 s | 9 | `sigil` invTriangle R52＋閃光＋粗糙環＋上拋血滴，全 `ASH_BLOOD` |
| `FX_ACTIVE_RED_WHIRLWIND` | `wr_a1` | 5 | 0.55 s | 9 | `slashArc` R58 180° `ASH_FIRE`＋反向 `slashArc` R52 `ASH_PHYSICAL`＋閃光＋粗糙環＋碎石 |
| `FX_ACTIVE_RED_HAMSTRING_STRIKE` | `wr_a2` | 5 | 0.49 s | 12 | `slashArc` R48 `ASH_PHYSICAL`＋血色閃光＋粗糙環＋碎骨＋血滴 |
| `FX_ACTIVE_RED_EXECUTE_SLASH` | `wr_a4` | 5 | 0.56 s | 12 | `slashArc` R60 厚 15 `ASH_BLOOD`＋`sigil` hornSkull `ASH_FIRE`＋閃光＋血環＋血滴 |
| `FX_ACTIVE_RED_BLOOD_TOTEM` | `sr_a3` | 4 | 0.80 s | 11 | `sigil` invTriangle R56 `ASH_POISON`＋血色閃光＋血色環＋上升液滴 `ASH_POISON` |

### C. 命中包時長微調（`data/vfx/registry/basic_parts.ts`，只縮短尾巴、未變大）

- `FX_HIT_BLUE_HOLY`：餘暉 lifetime `[0.3, 0.4]` → `[0.2, 0.28]`。
- `FX_HIT_RED_PHYSICAL`：碎石 lifetime → `[0.22, 0.32]`、煙塵 → `[0.22, 0.30]`。
- `FX_HIT_RED_HEAVY`：碎石 `[0.32, 0.45]` → `[0.24, 0.32]`、灰燼 → `[0.22, 0.30]`。
- `FX_HIT_RED_BLOOD`：血滴 `[0.3, 0.42]` → `[0.22, 0.32]`。

---

## 5. 未完成項目與注意事項

1. **提示詞 §1 的前提有誤**（主動技 `HIT_FX` 會播 `visualHitEffect`）：只對有投射物的主動技成立。M4 已依實際引擎規則改寫（§0）；建議主代理之後的提示詞以 `SkillExecutor.ts:234` 為準。
2. **無投射物主動技的 `visualHitEffect` 在實機不會被 `HIT_FX` 播放**：本輪 7 招讓它與 `impactFx` 指向同一特效保持一致；其餘主動技的此欄位是否該清理，不在本輪範圍。
3. `wb_b2`（射程 2）因共用 `MELEE_PIERCE` 原型而多了尖端閃光，不在提示詞表上（§0 已揭露）。
4. 主觀美術驗收（揮擊感、放招與普攻是否分得出來）仍需使用者實機確認。

---

## 6. 各 Commit 回退指南（Rollback Guide）

依反向順序：

| Commit | 內容 | 回退 |
| :-- | :-- | :-- |
| `3dbd265` | MF-FIX：還原主動技序列、7 招改走 `impactFx`、測試修正、`sr_a3` 配色 | `git revert 3dbd265`（單獨回退會讓 24 招主動技再次失去主特效，不建議） |
| `6b1273a` | REPORT | `git revert 6b1273a` |
| `0e7150d` | MF4：7 招主動技專屬命中特效＋`visualHitEffect` | 須連同 `3dbd265` 一起回退：`git revert 3dbd265 0e7150d` |
| `85ffd5d` | MF3：紅方普攻揮擊＋命中包縮短 | `git revert 85ffd5d` |
| `6f2b699` | MF2：藍方普攻揮擊、`melee_parts.ts` 登記 | `git revert 6f2b699` |
| `68822b8` | MF1：`MeleeFxSpec` 與基準 | `git revert 68822b8` |
| `2fb31cd` | MF0：`ult-sheet --name` 與 hitAt 預設 0 | `git revert 2fb31cd` |
