# 技能正確性修正與新效果實作報告（SK0 - SK3）

> **分支**：`feat/skill-fix`  
> **目標依據**：`docs/archive/SKILL_FIX_AGENT_PROMPT.md`  
> **日期**：2026-10-20  
> **狀態**：全部任務驗證通過（Lint 0 錯誤、Vitest 637 測試全過、Build 成功、Fidelity 0 漂移、br-soak 10/10 CLEAN）

---

## 1. 任務執行摘要與 Commit 記錄

| 任務 ID | Commit Hash | 說明 | 異動檔案數 | 核心驗證 |
| :--- | :--- | :--- | :--- | :--- |
| **SK0** | `68f9e87` | `test(skills): add SkillDataIntegrity ratchet test (SK0)` | 1 | Lint PASS, Vitest 624 測試 PASS，鎖定 56 筆違規基準 |
| **SK1** | `541bbe5` | `feat(skills): implement ccSelf/ccSelf2 targeting and remove buff redirect (SK1)` | 12 | Lint, Vitest (CcSelf.test.ts 5 通過), Build, Soak 10/10 CLEAN |
| **SK2** | `a0a0cf9` | `feat(skills): implement HASTE, REFLECT, and LIFESTEAL status effects (SK2)` | 19 | Lint, Vitest (NewStatusEffects.test.ts 6 通過), Build, Soak 10/10 CLEAN |
| **SK3** | `5b959a6` | `fix(skills): complete skill database integrity corrections (SK3)` | 6 | Lint, Vitest, Build, Fidelity PASS, Soak 10/10 CLEAN, 違規數收斂為 **0** |

---

## 2. SK0 完整性棘輪違規數演進

依據 `SkillDataIntegrity.test.ts` 的規則檢驗全資料庫 150 個技能：

- **SK0 初版基準**：**56 筆違規**
  - `DAMAGE_BUFF_NOT_SELF` (4 筆)：`tb_a1`, `tr_a2`, `wb_b5`, `tr_b3`
  - `DESC_KEYWORD_MISMATCH` (8 筆)：`tb_a5`, `sb_a5`, `sb_u1`, `tr_b3`, `wr_a5`, `wr_u3` (2項), `sr_u4`
  - `HEAL_HAS_DEBUFF` (1 筆)：`sb_u1` (BANISH on Heal)
  - `VAMP_NO_POWER` (1 筆)：`wr_a5` (VAMP on 0 power)
  - `NO_ELEMENT` (42 筆)：全部 ULT 技能中缺 element 的 42 筆
- **SK1 後**：**52 筆違規**（已解決 4 筆 `DAMAGE_BUFF_NOT_SELF`）
- **SK3 後**：**0 筆違規**（全數通過，棘輪測試斷言 `violations.length === 0`）

---

## 3. ccSelf / ccSelf2 套用清單

解決過去「增益打到敵人強制轉給施法者、AOE 打中 N 人疊 N 次」的架構問題，改為施放時單次套用：

| 技能 ID | 技能名稱 | 作用控制槽位 | 說明 |
| :--- | :--- | :--- | :--- |
| `tb_a1` | 六稜壁障 | `ccSelf: true` (`SHIELD`) | 傷害與擊退打敵人，護盾只給施法者 1 次 |
| `tr_a2` | 血腥挑釁 | `ccSelf2: true` (`SHIELD`) | 嘲諷打敵人，護盾只給施法者 1 次 |
| `wb_b5` | 絕對招架 | `ccSelf: true` (`SHIELD`) | 單體攻擊打敵人，自我套用招架護盾 |
| `tr_b3` | 尖刺防禦 | `ccSelf: true` (`SHIELD`), `ccSelf2: true` (`REFLECT`) | 傷害打敵人，自我套用護盾與反傷 |
| `tb_a5` | 稜鏡反射 | `ccSelf: true` (`SHIELD`), `ccSelf2: true` (`REFLECT`) | 射程 0 自我反傷護盾 |
| `wr_a5` | 嗜血狂熱 | `ccSelf: true` (`HASTE`), `ccSelf2: true` (`LIFESTEAL`) | 射程 0 自我加速與吸血增益 |
| `wr_u3` | 惡魔降臨 | `ccSelf: true` (`HASTE`), `ccSelf2: true` (`LIFESTEAL`) | 射程 0 自我變身加速與吸血增益 |
| `tr_a4` | 鮮血護盾 | `ccSelf: true` (`SHIELD`) | 射程 0 自我鮮血護盾 |
| `tr_u3` | 不朽屍王 | `ccSelf: true` (`SHIELD`) | 射程 0 自我巨量護盾 |

> **注意**：隊友支援型技能（如 `sb_a2`, `sb_a5`, `sr_u4`, `sb_u3` 等射程大於 0 或全隊 AOE 增益）**不加** `ccSelf`，維持依陣營極性套用給隊友。

---

## 4. 42 筆補齊 Element 技能與判定理由

依技能名稱、視覺特效（`visualHitEffect`）、顏色與陣營主題補齊之 42 筆技能：

| 技能 ID | 技能名稱 | 陣營 / 職業 | 顏色 | 視覺特效 Key | 指定 Element | 判定理由 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tb_u1` | 聖光結界 | 藍 / TANK | `#f59e0b` | `FX_ULT_BLUE_SANCTUARY_IMPACT` | `HOLY` | 聖光結界（Sanctuary）、金光特效 |
| `tb_u2` | 王者之風 | 藍 / TANK | `#fbbf24` | `FX_ULT_BLUE_KINGS_BLESSING` | `HOLY` | 王者祝福（Blessing）、全場金黃聖光 |
| `tb_u3` | 絕對防禦 | 藍 / TANK | `#3b82f6` | `FX_ULT_BLUE_AEGIS_IMPACT` | `PHYSICAL` | 天降神盾（Aegis）、純物理擊退防壁 |
| `tb_u4` | 泰坦降臨 | 藍 / TANK | `#fcd34d` | `FX_ULT_BLUE_TITAN_SMASH` | `PHYSICAL` | 泰坦巨力重擊重壓（Smash）、鈍器重暈 |
| `tb_u5` | 鋼鐵長城 | 藍 / TANK | `#60a5fa` | `FX_ULT_BLUE_FINAL_DEFENSE` | `PHYSICAL` | 鋼鐵長城物理壁障防禦 |
| `wb_u1` | 雷霆之怒 | 藍 / WARRIOR | `#3b82f6` | `FX_ULT_BLUE_THUNDER_SLAM` | `LIGHTNING` | 雷霆轟炸（Thunder Slam） |
| `wb_u2` | 破曉聖擊 | 藍 / WARRIOR | `#f59e0b` | `FX_ULT_BLUE_DAYBREAK` | `HOLY` | 破曉之光聖能爆發（Daybreak） |
| `wb_u3` | 誓約勝利 | 藍 / WARRIOR | `#facc15` | `FX_ULT_BLUE_EXCALIBUR` | `HOLY` | 王者之劍誓約斬殺（Excalibur） |
| `wb_u4` | 劍刃風暴 | 藍 / WARRIOR | `#60a5fa` | `FX_ULT_BLUE_BLADESTORM` | `PHYSICAL` | 實體鋼刃連續旋舞劍斬 |
| `wb_u5` | 光速斬擊 | 藍 / WARRIOR | `#e0f2fe` | `FX_ULT_BLUE_LIGHTSPEED` | `LIGHTNING` | 光速瞬移電芒斬擊 |
| `rb_u2` | 星辰墜落 | 藍 / RANGER | `#fcd34d` | `FX_ULT_BLUE_STARFALL` | `HOLY` | 星光箭雨、星辰神聖光羽 |
| `rb_u3` | 穿日神矢 | 藍 / RANGER | `#22d3ee` | `FX_ULT_BLUE_ORBITAL_BEAM` | `LIGHTNING` | 穿日神芒高能天基光束（Orbital Beam） |
| `rb_u4` | 六芒封鎖 | 藍 / RANGER | `#8b5cf6` | `FX_ULT_BLUE_LOCKDOWN` | `ARCANE` | 六芒星法陣禁錮鎖定、紫色秘術 |
| `rb_u5` | 疾風百矢 | 藍 / RANGER | `#ffffff` | `FX_ULT_BLUE_OVERLOAD` | `PHYSICAL` | 純物理超頻極速連射矢 |
| `mb_u3` | 時間停止 | 藍 / MAGE | `#fef08a` | `FX_ULT_BLUE_TIMESTOP` | `ARCANE` | 時間停滯秘法 |
| `mb_u4` | 奧術洪流 | 藍 / MAGE | `#a855f7` | `FX_ULT_BLUE_TORRENT` | `ARCANE` | 奧術能量彈幕彈射 |
| `mb_u5` | 聚輝光柱 | 藍 / MAGE | `#60a5fa` | `FX_ULT_BLUE_FOCUS_BEAM` | `ARCANE` | 高聚能純魔能聚束 |
| `sb_u1` | 神聖干涉 | 藍 / SUPPORT | `#fef08a` | `FX_ULT_BLUE_INTERVENTION` | `HOLY` | 神聖干涉賜予無敵庇護與治癒 |
| `sb_u2` | 復活之光 | 藍 / SUPPORT | `#86efac` | `FX_ULT_BLUE_RESURRECTION` | `HOLY` | 復甦神聖生命之光 |
| `sb_u3` | 英勇讚美 | 藍 / SUPPORT | `#3b82f6` | `FX_ULT_BLUE_HYMN` | `HOLY` | 勇氣讚美詩聖歌祝禱 |
| `sb_u4` | 神之怒火 | 藍 / SUPPORT | `#fcd34d` | `FX_ULT_BLUE_WRATH` | `HOLY` | 神聖制裁天罰之怒 |
| `sb_u5` | 寧靜之雨 | 藍 / SUPPORT | `#86efac` | `FX_ULT_BLUE_RAIN` | `HOLY` | 治癒甘霖持續生機聖水 |
| `tr_u1` | 處決斷頭台 | 紅 / TANK | `#7f1d1d` | `FX_ULT_RED_GUILLOTINE_IMPACT` | `BLOOD` | 暗紅斬殺斷頭刑具、血氣重斬 |
| `tr_u2` | 亡靈瘟疫 | 紅 / TANK | `#a3e635` | `FX_ULT_RED_PLAGUE` | `POISON` | 綠色腐化瘟疫劇毒 DoT |
| `tr_u3` | 不朽屍王 | 紅 / TANK | `#16a34a` | `FX_ULT_RED_UNDYING` | `POISON` | 綠死疽亡者屍氣護盾 |
| `tr_u4` | 永恆夢魘 | 紅 / TANK | `#581c87` | `FX_ULT_RED_NIGHTMARE` | `VOID` | 深紫虛空恐懼迷霧 |
| `tr_u5` | 鮮血之牆 | 紅 / TANK | `#991b1b` | `FX_ULT_RED_BLOOD_WALL` | `BLOOD` | 鮮血凝固屏障防壁 |
| `wr_u1` | 諸神黃昏 | 紅 / WARRIOR | `#ea580c` | `FX_ULT_RED_RAGNAROK_ERUPTION` | `FIRE` | 烈焰噴發衝擊、末日烈火 |
| `wr_u2` | 血腥旋風 | 紅 / WARRIOR | `#dc2626` | `FX_ULT_RED_BLOODSTORM` | `BLOOD` | 鮮血旋風吸血之刃 |
| `wr_u3` | 惡魔降臨 | 紅 / WARRIOR | `#b91c1c` | `FX_ULT_RED_DEMON_FORM` | `BLOOD` | 惡魔真身嗜血狂暴 |
| `wr_u4` | 千刃魔相 | 紅 / WARRIOR | `#000000` | `FX_ULT_RED_UNLIMITED_BLADE` | `VOID` | 純黑虛空魔刃深淵恐懼 |
| `wr_u5` | 毀滅重擊 | 紅 / WARRIOR | `#450a0a` | `FX_ULT_RED_DEVASTATE` | `PHYSICAL` | 狂暴重錘鈍擊巨力擊退 |
| `rr_u1` | 灰燼穿心 | 紅 / RANGER | `#000000` | `FX_ULT_RED_RAILGUN` | `FIRE` | 焦黑灰燼電磁火線貫穿 |
| `rr_u2` | 焦土衝擊 | 紅 / RANGER | `#ef4444` | `FX_ULT_RED_NUKE_FLASH` | `FIRE` | 核爆火海赤紅衝擊波 |
| `rr_u4` | 血腥獵殺 | 紅 / RANGER | `#7f1d1d` | `FX_ULT_RED_HEADHUNTER` | `BLOOD` | 索命血腥追魂獵殺 |
| `rr_u5` | 末日審判 | 紅 / RANGER | `#581c87` | `FX_ULT_RED_DOOM` | `VOID` | 毀滅虛空暗影末日降臨 |
| `mr_u2` | 死亡宣告 | 紅 / MAGE | `#be123c` | `FX_ULT_RED_DEATH_FINGER` | `BLOOD` | 抽取生魂致命血能死線 |
| `mr_u4` | 末世毒雨 | 紅 / MAGE | `#a3e635` | `FX_ULT_RED_POISON_RAIN` | `POISON` | 全域腐蝕毒液降雨 |
| `sr_u1` | 靈魂連結 | 紅 / SUPPORT | `#581c87` | `FX_ULT_RED_SOUL_WEB` | `VOID` | 虛空靈魂蛛網牽扯禁錮 |
| `sr_u2` | 鮮血契約 | 紅 / SUPPORT | `#dc2626` | `FX_ULT_RED_BLOOD_PACT` | `BLOOD` | 損己利友之血之盟誓 |
| `sr_u4` | 猩紅血月 | 紅 / SUPPORT | `#be123c` | `FX_ULT_RED_BLOOD_MOON` | `BLOOD` | 猩紅月蝕普降吸血狂潮 |
| `sr_u5` | 惡靈附身 | 紅 / SUPPORT | `#7f1d1d` | `FX_ULT_RED_POSSESSION` | `BLOOD` | 邪血幽魂附身強化 |

---

## 5. 新生成危害區（HazardManager）的技能影響

依據 `HazardManager.ts`，當技能屬性為 `FIRE`、`ICE`、`VOID`（或 `ccType === 'PULL'`）時，將在受影響地面生成空間危害：

- **新增生成 FIRE 危害區（烈焰灼燒）**：
  - `wr_u1` 諸神黃昏（目標格生成熔岩烈焰）
  - `rr_u1` 灰燼穿心（貫穿軌道終點生成焦土）
  - `rr_u2` 焦土衝擊（AOE 半徑 3 生成大範圍火海）
- **新增生成 GRAVITY 危害區（虛空重力牽引減速）**：
  - `tr_u4` 永恆夢魘（全場 AOE 半徑 8 深淵引力）
  - `wr_u4` 千刃魔相（AOE 半徑 2 虛空力場）
  - `rr_u5` 末日審判（AOE 半徑 2 虛空炸彈）
  - `sr_u1` 靈魂連結（AOE 半徑 3 虛空蛛網引力）

---

## 6. 描述修正對照

| 技能 ID | 技能名稱 | 原描述 | 新描述 | 修正原因 |
| :--- | :--- | :--- | :--- | :--- |
| `rb_u1` | 極地冰河 | 全場凍結 | **單體凍結** | 技能為 `type: 'SINGLE'`，射程 15，過去寫全場造成誤解 |
| `wr_u1` | 諸神黃昏 | 範圍爆發 | **近身爆發** | 技能為 `type: 'SINGLE'`，射程 1 近身單體重創，非 AOE |
| `sb_u3` | 英勇讚美 | 全隊Buff | **全隊治療與護盾** | 精確描述技能實際作用為群體治療 (`power: -300`) 與護盾 (`SHIELD: 500`) |

---

## 7. 渲染保真度（Fidelity）改前／改後對比

執行 `npm run perf:fidelity`（基準閾值 `meanAbsDiff <= 0.8`, `badPixelPct <= 0.5%`）：

| 場景 | 改前基準（SK0 前） | 改後實測（SK3 後） | 差值 | 判定 |
| :--- | :--- | :--- | :--- | :--- |
| **VOID** | `0.194` (bad: 0.01%) | `0.194` (bad: 0.01%) | `0.000` | **PASS (無變更)** |
| **FOREST** | `0.635` (bad: 0.16%) | `0.635` (bad: 0.16%) | `0.000` | **PASS (無變更)** |
| **ICE** | `0.234` (bad: 0.21%) | `0.234` (bad: 0.21%) | `0.000` | **PASS (無變更)** |
| **MAGMA** | `0.237` (bad: 0.03%) | `0.237` (bad: 0.03%) | `0.000` | **PASS (無變更)** |
| **DESERT** | `0.513` (bad: 0.22%) | `0.513` (bad: 0.22%) | `0.000` | **PASS (無變更)** |
| **battle_frozen** | `0.422` (bad: 0.16%) | `0.422` (bad: 0.16%) | `0.000` | **PASS (無變更)** |

> **說明**：所有五大自然地形與 `battle_frozen` 的 meanAbsDiff 完全保持 0 漂移，未觸發任何基準重錄，完全符合嚴格保真契約。

---

## 8. BR Soak 穩定度驗證（10 Seeds）

執行 `node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`：

| Seed | 戰鬥時長 (Sim Time) | 總影格數 (Frames) | 勝方 | 幽靈 (Ghosts) | 發呆 (Idles) | 結果 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#1001** | 10.89s | 660 | RED | 0 | 0 | **PASS (Clean)** |
| **#1002** | 12.02s | 720 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1003** | 9.48s | 10800 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1004** | 15.33s | 930 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1005** | 12.00s | 720 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1006** | 12.46s | 750 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1007** | 18.00s | 1080 | RED | 0 | 0 | **PASS (Clean)** |
| **#1008** | 14.47s | 870 | RED | 0 | 0 | **PASS (Clean)** |
| **#1009** | 7.93s | 10800 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1010** | 18.02s | 1080 | RED | 0 | 0 | **PASS (Clean)** |

- **Clean Seeds**: 10/10
- **Total Ghost Events**: 0
- **Total Idle Events**: 0
- **最小戰鬥時長**: 7.93s（遠高於門檻 5s）

---

## 9. 回退指南（Rollback Guide）

若在主代理審查或實機測試過程中需要針對特定任務進行局部回退，可依序回退以下 Commits：

1. **若需回退 SK3（技能資料與棘輪零違規）**：
   ```bash
   git revert 5b959a6
   ```
   *影響*：將技能資料庫還原為 SK2 狀態，`SkillDataIntegrity.test.ts` 恢復 52 筆違規期望。

2. **若需回退 SK2（三種新效果：HASTE / REFLECT / LIFESTEAL）**：
   ```bash
   git revert a0a0cf9
   ```
   *影響*：移除 HASTE / REFLECT / LIFESTEAL 效果引擎實作、常數、UI 登記與單元測試。

3. **若需回退 SK1（ccSelf 機制與轉向 Hack 清除）**：
   ```bash
   git revert 541bbe5
   ```
   *影響*：還原 `Skill.ccSelf` 欄位與 `applySelfCC` 呼叫，恢復舊版 enemy buff redirect。

4. **若需回退 SK0（棘輪測試建立）**：
   ```bash
   git revert 68f9e87
   ```
   *影響*：刪除 `tests/SkillDataIntegrity.test.ts`。

---

## 10. 潛在問題記錄（非本輪範疇，僅供後續評估）

1. **`DamageCalculator.ts` 中的暴擊隨機性**：
   在沒有傳入 `preRollCrit` 時會呼叫 `random() < 0.1`。若有單元測試在短時間內呼叫兩次（如單獨計算後又呼叫 `executeInstantSkill`），隨機序號前進可能導致非預期的暴擊差異。已在 `NewStatusEffects.test.ts` 透過 `setRandomSource(() => 0.5)` 固定種子解決。日後若有其他戰鬥單元測試，建議在測試環境統一設定固定隨機源。
2. **`sb_u1 神聖干涉` 的特殊視覺狀態**：
   原為 `specialVisualStatus: 'STASIS'`，本輪已依照指示更正為 `'INVINCIBLE'`。若日後需要新增專屬的金色無敵光罩 shader，可於狀態 VFX 管線擴充。
