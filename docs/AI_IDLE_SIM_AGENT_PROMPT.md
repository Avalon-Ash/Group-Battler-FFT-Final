# 執行指令：AI 發呆與大逃殺勝率量測工具

> 派工：主代理用 agy 派（Gemini 3.8 Flash high）。
> 背景：使用者觀察全近戰時單位常發呆、大逃殺每場都是騎士贏。修改前先要基準數字。本輪只做量測工具，**不改任何引擎或 AI 行為**。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_idle`（分支 `feat/ai-idle-sim`，主代理已建好）。**只准改這個資料夾內的檔案。**

### 0. 開工前（INV）
- 先讀：`AGENTS.md`、`tools/balance/batch-sim.mjs`（照它的寫法：Vite `createServer`＋`ssrLoadModule`、方框檔頭、`arg()`）、`engine/ai/MeleeAttack.ts`、`engine/systems/ui/editorQueries.ts` 的 `querySpawnableHexes` 與 `layoutFactionHexes`。
- **只能跑這些終端機指令，字串照抄，每個單獨一次呼叫，不加 `cd`、不用 `&&` 或 `;`**：
  - `git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`
  - `npm run lint`、`npm test`、`npm run knip`
  - `node tools/balance/ai-idle-sim.mjs --scenario=TEAMS --battles=20 --seed=21`
  - `node tools/balance/ai-idle-sim.mjs --scenario=MELEE --battles=20 --seed=21`
  - `node tools/balance/ai-idle-sim.mjs --scenario=ROYALE --battles=20 --seed=21`
  - `node tools/balance/ai-idle-sim.mjs --scenario=MELEE_ROYALE --battles=20 --seed=21`
- **任何其他終端機指令都會被拒，而且會讓整個執行立刻結束，工作就白費了**：不准用 `npx`、`node -e`、`ls`、`cat`、`grep`、`type`、`dir`、`findstr`，也不准在指令後面加 pipe 或重導向。看檔案、找字串一律用你的讀檔與搜尋工具。需要別的指令就寫進報告。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/**`、`tools/ui-e2e/**`、`tests/**`、`constants/**`、`engine/**`、`components/**`、`hooks/**`、`data/**`、`types.ts`。可以改的只有：新檔 `tools/balance/ai-idle-sim.mjs`、`package.json`（加一行 script）、新檔 `docs/AI_IDLE_SIM_REPORT.md`。
- 不要 commit、不准 push、不准用 git 還原檔案。亂數只用 `/engine/math/rng.ts` 的 `random`（`engine.seedSimulation` 之後），不自己寫 PRNG 或雜湊。同一個驗收失敗兩次就停下寫報告，中途不要詢問。

### 1. 已查證的事實（DOM）
- 開局：`new GameEngine({ mute: true })`、`engine.seedSimulation(SEED * 100000 + b)`、`engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true })`、`engine.play()`、`engine.tick(DT)`；結束事件 `GAME_OVER { winner, winnerId? }`（見 batch-sim）。
- 放單位：`UI_COMMAND` `PLACE_AGENT { team, q, r, role, side? }`；`side` 省略時等於 team。
- 擊殺事件：`engine.bus` 的 `KILL`（`killerId`）。死亡入口 `engine.agentManager.handleDeadState(a, engine, reason, text)`，掉出地圖時 `text === 'RING_OUT'`；工具裡包住這個方法來記錄（batch-sim 也這樣包別的方法）。
- Agent 欄位：`hp`、`outOfBounds`、`banished`、`px`、`py`、`q`、`r`、`role`、`side`、`target`、`path`、`actionState`（`ActionState`：IDLE、WALKING、ATTACKING、EVADING、CASTING、STUNNED、DYING）、`castingSkillIdx`、`skills`（普攻是 `tag === 'BASIC'`）、`movementType`。
- 警告格：`engine.isWarningTile(HexUtils.key(hex))`。有效射程：TargetingSystem 的 `getEffectiveRange(cell, tq, tr, range, spatial)`（`getEffectiveRange` 含高低差折算；先查 engine 上 targeting 實例的名稱）；近戰判定：`isGroundMeleeRange`、`isMeleeAttackCell`（`engine/ai/MeleeAttack.ts`）。

### 2. 工具規格：`tools/balance/ai-idle-sim.mjs`
參數：`--scenario=TEAMS|MELEE|ROYALE|MELEE_ROYALE`（必填）、`--battles=200`、`--seed=1`、`--maxTime=180`、`--dt=0.0333`、`--out=tools/ui-e2e/out/ai-idle-<scenario>.json`。

場景（可出生格一律 `querySpawnableHexes(engine)`）：
| 場景 | 陣容 | 站位 |
| :-- | :-- | :-- |
| `TEAMS` | 雙方各 TANK、WARRIOR、RANGER、MAGE、SUPPORT | 左 `q < -1`、右 `q > 1`，各自洗牌 |
| `MELEE` | 雙方各 5 個 WARRIOR | 同上 |
| `ROYALE` | 10 人，角色依序 TANK、WARRIOR、RANGER、MAGE、SUPPORT 循環兩次，`side = i`、`team = i % 2 === 0 ? BLUE : RED` | 洗牌後 `layoutFactionHexes(hexes, 10, 1)` |
| `MELEE_ROYALE` | 10 個 WARRIOR，其餘同 ROYALE | 同上 |

每個 tick 之後，對每個 `hp > 0 && !outOfBounds && !banished` 的單位分類（累計秒數，依角色彙總），依序判斷、只歸一類：
1. `busy`：`castingSkillIdx !== -1`，或 `actionState` 是 ATTACKING、CASTING、STUNNED、EVADING。
2. `moving`：`px`／`py` 和上一個 tick 的距離 ≥ 0.5。
3. `waitInRange`：有活著的 `target`，且 `HexUtils.dist(a, target) <=` 普攻的有效射程（等攻速，**不算發呆**）。
4. 其餘都算**發呆**，再依序分原因：
   - `noTarget`：`target` 為空或已死。
   - `warningBlock`：自己不在警告格，而目標在警告格。
   - `heightBlock`：水平距離 ≤ 普攻射程，但有效射程不夠（高低差）。
   - `noAttackCell`：地面近戰，目標的 6 個鄰格沒有一格符合 `isMeleeAttackCell` 且可站（有效、無障礙）。
   - `cellsTaken`：地面近戰，有符合的鄰格，但全部被其他活著的單位佔住。
   - `other`：以上皆非。

另外累計：站在警告格的秒數；每個單位最長連續發呆秒數，保留全場最長的 10 段（場次、單位 id、角色、開始秒數、長度、原因）。

輸出（寫 JSON、也印到 stdout 一張表）：
- 場次層：場數、平均時長、平手數、超時數。
- 依角色：出場數、**勝場與勝率**（`winnerId` 對應角色；雙陣營場景用 `winner` 隊伍存活者算，勝率欄位填隊伍勝時該角色的出場佔比即可，或標 N/A）、平均存活秒數、平均擊殺、戰鬥死亡數、`RING_OUT` 死亡數、各分類佔存活時間的百分比、發呆總百分比與各原因百分比、站警告格百分比。

**自我檢查（不符就 `process.exit(1)`）**：① 勝場＋平手＋超時＝場數（ROYALE 類）；② 每個角色的各分類秒數加總＝存活秒數（誤差 ≤ 一個 dt × 總 tick 數的 1%）；③ 各發呆原因加總＝發呆秒數；④ 至少有一個單位被量到。

`package.json` 的 scripts 加：`"balance:idle": "node tools/balance/ai-idle-sim.mjs"`。

### 3. 任務
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| S1 | 寫工具與 script | 四個 20 場指令都退出碼 0；`npm run lint`、`npm test`、`npm run knip` 退出碼 0 |
| REPORT | `docs/AI_IDLE_SIM_REPORT.md`：改了哪些檔、每個指令的退出碼、四個場景 20 場的表、做不到的事。只寫事實與數字，不寫效果形容詞，也不要提修法建議 | — |

### 4. 守則（INV）
- 不改引擎行為；包方法只為了記錄，原方法一定要照呼叫並回傳原值。不准吞錯誤（空的 catch）；不准用 `x || 0` 掩蓋缺欄位（累加用明確初始值）。
- 查不到某個欄位或方法：寫進報告並停下，不要猜。
