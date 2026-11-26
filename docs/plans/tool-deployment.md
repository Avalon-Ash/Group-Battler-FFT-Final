# 開案書：工具佈陣流程收斂

> 撰寫：Fable 5.2（API 點數，single，medium，$1.36；2026-11-24）。派工單附 9 個檔（Deployment.ts、5 支工具、sim-fingerprint.mjs、adr/README、AGENTS.md）。主代理 Opus 存檔，未改內文；主代理初查的答案標在文末。

狀態：提議，等使用者同意才動工。同意前新工具一律呼叫既有的，不再多寫一份。
依據：使用者 2026-11-20 指示；`AGENTS.md` §1.6（一個概念只定義一處；既有耦合先提案）。

最需要使用者決定的三件事：

1. **不可能全程「行為不變」。** 五支工具現在的排法和 `Deployment.ts` 不一樣，收斂後多數工具的輸出一定會變，指紋基準要重錄一次（P5）。
2. **指紋那一包排最後。** P1～P4 不碰 `simFingerprint.ts` 與引擎，每包都必須維持 180/180，用來證明引擎沒被動到。
3. **`Deployment.ts` 建議不改。** 它掛著「契約 R2」，簽名可能受保護；工具的差異用參數包在工具側的入口。

## 1. 現況對照

第一列是遊戲本體，當作對照基準。「看不出」＝附件看不出。

| 工具 | 地圖選法 | 出生格 | 陣營／side／look | 技能抽法 | 亂數消耗順序 | 開戰指令 |
|---|---|---|---|---|---|---|
| **`Deployment.ts`**（基準） | `rollShowcaseMap(rand)` 依序抽寬、高、佈局；誰送 `RANDOMIZE_MAP`、怎麼帶參數看不出。 | `deployRoster`：`querySpawnableHexes`；2 陣營用 `TEAMS_SPLIT_GAP_Q` 左右分，3 個以上用 `layoutFactionHexes` 輪流放（人在外圈、陣營在內圈）；格子不夠就少放、不報錯。 | `planRoster`：team＝side 奇偶，職業用 `factionRoleIndex`，`bodyType`、`look` 明傳；2 陣營不傳 side。 | 本檔不抽；看不出。 | rand 由呼叫端傳入；2 陣營先洗左再洗右，3 個以上洗一次全部；體型、外觀用雜湊，不耗序列。 | 本檔沒有；看不出。 |
| `simFingerprint.ts`（`buildBattle`） | `RANDOMIZE_MAP randomizeScene:true`，不帶寬高；先送 `SET_BATTLE_SETUP`。 | `querySpawnableHexes` 洗一次後一律 `layoutFactionHexes`（TEAMS 兩陣營也是，沒有左右分）；陣營在外圈、人在內圈；缺格就丟錯。 | team＝`f%2`，side 一律傳 `f`，職業 `ROLES[(f+u)%5]`；不傳 `bodyType`、`look`（體型由 `matchSalt` 在 addAgent 決定）。 | 工具不指定；看不出。 | `seedSimulation` 後，用全域 `random()` 洗一次全部。 | 不在本檔；`sim-fingerprint.mjs` 的 `runBattle` 呼叫 `engine.play()`。 |
| `ai-idle-sim.mjs` | `RANDOMIZE_MAP randomizeScene:true`；ROYALE 類在換圖**之後**才送 `SET_BATTLE_SETUP`，TEAMS／MELEE 不送。 | TEAMS／MELEE：`querySpawnableHexes`，以寫死的 `q<-1`／`q>1` 分左右，藍紅交錯放；ROYALE 類：洗一次＋`layoutFactionHexes(…,10,1)`；缺格丟錯。 | TEAMS／MELEE 不傳 side；ROYALE 類 team＝`i%2`、side＝`i`；職業 `rolesList[i]`、`royaleRoles[i]` 或全同職業；不傳 `bodyType`、`look`。 | 預設不指定；`--loadout≠role` 時在放完人後用 `pickFrom`（全域 `random()`）送 `SET_AGENT_SKILL`。 | 全域 `random()`：先洗左再洗右（或洗一次全部），之後才是 loadout 的抽取。 | `engine.play()`。 |
| `batch-sim.mjs` | `RANDOMIZE_MAP randomizeScene:true`；不送 `SET_BATTLE_SETUP`。 | **自己算**可出生格（`engine.map.mapKeys` 濾障礙＋`HexUtils.dist < radius`），不用 `querySpawnableHexes`；`q<-1`／`q>1` 分左右，藍紅交錯放；`--swapSides` 對調左右；不檢查夠不夠 5 格。 | 不傳 side、`bodyType`、`look`；職業 `roles[i]`。 | 檔頭寫「照 addAgent 隨機抽」；機制看不出。 | 洗牌用**本地 LCG**（`s = SEED*7919 + b*104729`），刻意不耗引擎亂數。 | `engine.play()`。 |
| `mobility-probe.mjs` | 同 batch-sim。 | 同 batch-sim（同一段自算格子＋LCG），沒有 `--swapSides`。 | 同 batch-sim。 | 工具不指定；看不出。 | 同 batch-sim 的本地 LCG。 | `engine.play()`。 |
| `record-bench.mjs` | `RANDOMIZE_MAP` 指定 `w`、`h`、`sceneId`、`randomizeScene:false`；先送 `SET_BATTLE_SETUP`。 | 同 `buildBattle`：洗一次＋一律 `layoutFactionHexes`（預設 2 陣營也沒有左右分）；缺格丟錯。 | 同 `buildBattle`：side 一律傳、`(f+u)%5`、不傳 `bodyType`、`look`。 | 工具不指定；看不出。 | 全域 `random()` 洗一次全部。 | `START_GAME`（帶 `seed`），不是 `play()`。 |

三個觀察：

- `batch-sim` 和 `mobility-probe` 的佈陣段是逐字相同的兩份。它們的本地 LCG 也違反 `AGENTS.md` §3「不寫本地 PRNG／LCG」。
- `buildBattle` 和 `record-bench` 也是同一段的兩份。
- 指紋的 TEAMS 情境用的是「兩陣營走 `layoutFactionHexes`」，而 `deployRoster` 對兩陣營是左右對分。也就是指紋目前鎖住的 TEAMS 排法，和 `Deployment.ts` 寫的不同。

## 2. 收斂設計

### 2.1 共用入口放哪

新增 `tools/sim/headlessBattle.ts`。理由：

- 它要 `new GameEngine`，不能放 `engine/`（同 `simFingerprint.ts` 檔頭的理由）。
- `tools/replay/` 也要用，所以不放 `tools/balance/` 底下。

它只做「建引擎 → 設種子 → 設陣營 → 換圖 → `planRoster` → `deployRoster` → 檢查人數」。出生格怎麼挑、陣營怎麼配、放置順序，全部讀 `Deployment.ts`，自己不寫任何一條。

### 2.2 簽名（草稿）

```ts
export interface HeadlessBattleSpec {
  seed: number;                       // 各工具自己的種子公式照舊，算好傳進來
  setup: BattleSetup;                 // { factions, unitsPerFaction }
  map?: { sceneId: string; w: number; h: number }; // 省略＝RANDOMIZE_MAP randomizeScene:true
  roleOf?: (side: number, index: number) => Role;  // 省略＝planRoster 的排法
  mirrorSides?: boolean;              // 只允許 factions===2，否則丟錯
  matchSalt?: number;                 // 有傳就在放人前設給 agentManager
  round?: number;                     // 傳給 planRoster，預設 0
}
export function buildHeadlessBattle(spec: HeadlessBattleSpec):
  { engine: GameEngine; roster: readonly RosterSlot[]; placed: ReadonlyMap<RosterSlot, string> };
```

短虛擬碼：

```
e = new GameEngine({audio:false}); 設 matchSalt; e.seedSimulation(seed)
emit SET_BATTLE_SETUP(setup)
emit RANDOMIZE_MAP(map ? 指定場景與寬高 : randomizeScene:true)
roster = planRoster(setup, round, TOOL_LOOK_SALT)
roleOf      → 只換 role（同 planPlayRoster 的做法，體型外觀沿用）
mirrorSides → 兩陣營的 team／look 對調
placed = deployRoster(e, roster, setup, random)   // rng.ts 的全域序列
placed.size !== roster.length → 丟錯
```

最後一行保留工具現有的「缺格就失敗」；`deployRoster` 自己是少放不報錯。

不開戰。開戰留在各工具（理由見 §7）。

### 2.3 合理差異怎麼變成參數

| 差異 | 表達方式 |
|---|---|
| 情境（5v5、十人大逃殺、4×3） | `setup`。大逃殺每人一個陣營就是 `{factions:10, unitsPerFaction:1}`，走 `deployRoster` 的三陣營以上分支，不需要特例。 |
| 固定場景與尺寸（record-bench） | `map`。 |
| 全戰士／全坦克（ai-idle 的 MELEE、MELEE_ROYALE、TANK_ROYALE） | `roleOf: () => Role.WARRIOR`。 |
| 「各職業一人」 | 預設不傳 `roleOf`，讀 `planRoster`。若 `factionRoleIndex` 的結果和工具現行公式不同，見待查證 2。 |
| `--swapSides` | `mirrorSides: true`。 |
| 種子公式、場數、`--loadout`、`--hpScale`、量測掛鉤 | 留在工具，不屬於佈陣。loadout 仍在放完人之後抽，順序不變。 |

**不保留成參數、直接收掉的差異：**

- 自算可出生格
- 本地 LCG
- 寫死的 `q<-1`
- 兩陣營走 `layoutFactionHexes`
- 藍紅交錯放
- 換圖後才設陣營

`mirrorSides` 有一個已知代價。`deployRoster` 固定先放左邊那一組，對調後變成紅方先放。現在的 `batch-sim` 不論是否對調都先放藍方。放置先後會不會影響戰鬥，附件看不出（待查證 5）。

- 若不影響：照上面做，`Deployment.ts` 一行不改。
- 若會影響：`--swapSides` 就混進了第二個變因。這時停下來問使用者，要不要改成給 `deployRoster` 加一個選填參數（不傳時遊戲行為不變）。這會動到契約 R2 的檔案，需另外同意。

### 2.4 各工具怎麼改

- **`batch-sim.mjs`、`mobility-probe.mjs`**：刪掉 `radius`／`valid`／`left`／`right`／LCG／放人迴圈，換成一次呼叫，`setup` 為 `{2,5}`。`batch-sim` 多傳 `mirrorSides: SWAP`。
- **`ai-idle-sim.mjs`**：五個情境的分支換成一張「情境 → `{setup, roleOf}`」的表，再呼叫一次。本檔的 `shuffle`、`spawnable`、`layoutFactionHexes` 匯入一併移除。
- **`record-bench.mjs`**：換成一次呼叫（帶 `map`）。`START_GAME` 與之後不動。
- **`simFingerprint.ts`**：`buildBattle(scenario, seed, matchSalt?)` 的**簽名不變**，因為受保護的 `tests/contracts/simState.ts` 在呼叫它。內部改成轉呼叫入口，`SIM_SCENARIOS` 仍是情境表唯一一份。

## 3. 行為不變的證明

### 3.1 哪些輸出會變

| 工具 | 會不會變 | 原因（都來自 §1 的差異） |
|---|---|---|
| 指紋 TEAMS | 一定變 | 出生格從 `layoutFactionHexes` 改為左右對分；洗牌從一次變兩次。 |
| 指紋 SQUADS | 預期變 | 放置順序從陣營外圈改為人外圈，`engine.agents` 的順序跟著變；指紋含 `a.id` 與單位順序。 |
| 指紋 ROYALE | 可能不變 | 每陣營一人時洗牌與放置順序相同；是否相同取決於待查證 2、3。 |
| batch-sim、mobility-probe | 一定變 | 格子池換成 `querySpawnableHexes`；洗牌改耗引擎序列，之後所有抽取都位移；多送一個 `SET_BATTLE_SETUP`。 |
| ai-idle TEAMS／MELEE | 預期變 | 放置從交錯改為先左後右；多送 `SET_BATTLE_SETUP`；分隔值改讀 `TEAMS_SPLIT_GAP_Q`。 |
| ai-idle ROYALE 類 | 可能不變 | 洗牌與放置順序相同；差在設陣營的先後、職業公式、多傳的 `bodyType`／`look`。 |
| record-bench | 重跑的結果會變 | 預設 2 陣營改走左右對分。**已提交的回放檔不會因為改工具而變**，本案不重錄它。 |

所以這一案的「行為不變」只對**引擎與遊戲本體**成立：`engine/`、`data/`、`constants/` 零修改。工具的輸出屬於「預期中的改變」，要用下面的方法和回歸分開。

### 3.2 怎麼分辨「預期中的改變」和「回歸」

**(a) 引擎沒被動到。** P1～P4 不碰 `simFingerprint.ts` 與引擎。

- 每包驗收都跑 `npm run balance:fingerprint`，必須 180/180。
- `git diff --stat main -- engine data constants types.ts` 必須是空的。
- 任何一包讓指紋掉下來就是回歸，停。

**(b) 先寫預測，再看結果（P5）。** P0 查證完後，主代理把三個情境「預期全變／預期全同」寫進 commit 訊息草稿，然後才改 `buildBattle`。

- 改完先**不帶 `--record`** 跑一次，記下每個情境的 `identical` 數。
- 和預測不符（例如預測 ROYALE 60/60 卻不是）就停，不重錄。

**(c) 統計型工具用「舊版跨種子範圍」當尺。** 佈陣改了等於重新抽樣，不該逐位元比。

- P0 先用舊版各跑 3 個種子，存下摘要。
- 新版同種子的摘要落在舊版三個種子的最小～最大之間，視為預期中的改變。
- 落在外面就停下來問，不調門檻、不挑種子。
- 比對欄位：
  - `batch-sim`：`blueWinRate`（連同 `ci95`）、`avgTime`、`damageAttribution.attributedPct`、`wins.TIMEOUT`。
  - `mobility-probe`：全部門檻列。既有門檻必須照樣 PASS。
  - `ai-idle`：自我檢查①～④通過；各職業 `idlePct`、`winRate`、`timeouts`。

**(d) 可能不變的項目逐位元比。** ai-idle ROYALE 類的 JSON 扣掉 `wallSeconds` 後和舊版相同，就記為「不變」；不同就歸入 (c)。

### 3.3 取證與重錄

**P0 舊版取證**（主代理）。輸出放 `tools/ui-e2e/out/td/`，已被 gitignore。

```
npm run balance:fingerprint
node tools/balance/batch-sim.mjs --battles=200 --seed=1 --out=tools/ui-e2e/out/td/old-batch-s1.json
  （seed 2、3 各一次；seed 1 再加一次 --swapSides）
node tools/balance/mobility-probe.mjs --battles=200 --seed=31 --report
  （seed 32、33 各一次；stdout 存檔）
node tools/balance/ai-idle-sim.mjs --scenario=TEAMS --battles=200 --seed=1 --out=tools/ui-e2e/out/td/old-idle-TEAMS-s1.json
  （五個情境 × seed 1、2、3）
node tools/replay/record-bench.mjs --out=tools/ui-e2e/out/td/old-bench.json
```

**P5 指紋重錄**（只有主代理執行 `--record`，工具檔頭已有這條規定）：

1. 在父 commit 跑 `npm run balance:fingerprint`，存下 180/180 的輸出。
2. 改 `buildBattle`。`git diff --stat` 只能出現 `tools/balance/simFingerprint.ts`。
3. 不帶 `--record` 跑一次，對照 3.2(b) 的預測。
4. 每個情境各取一場存新舊 dump：`node tools/balance/sim-fingerprint.mjs --dump=TEAMS:0`。舊的在步驟 1 先存。確認第一個取樣點就不同（差在站位），而不是打到一半才分岔。
5. `node tools/balance/sim-fingerprint.mjs --record`，再跑 `npm run balance:fingerprint` 必須 180/180，證明新排法是確定性的。
6. `npm test` 必須綠，且 `tests/contracts/` 的受保護檔案零修改。
7. commit 訊息寫明：
   - 原因：工具佈陣改讀 `Deployment.ts`，不是玩法改動。
   - 三個情境各變了幾場。
   - `engine/`、`data/`、`constants/` 零修改。

**保真基準、效能基準、`public/replays/` 的回放檔：本案都不重錄。**

## 4. 拆包表

**通則（每張派工單原樣帶上）：**

1. 只結束自己啟動的行程：啟動時記下 PID，不用名稱或萬用條件結束行程。
2. 不為了過檢查改造形或改驗收。
3. 不新增耦合：同一個判斷不在多處重複。

另外：

- 不放寬任何門檻。
- 不重錄任何基準。只有 P5 的指紋基準例外，且由主代理執行。
- 不改 `tests/contracts/` 受保護檔。
- 不 push、不合併到 `main`。
- 每包一個 commit。
- IDE 內執行的代理，長指令走 `tools/agent/run.mjs --detach`／`--wait`；`agy -p` 啟動的代理直接逐條執行派工單上的指令。

每包共同驗收（下表簡稱「共同」）：`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`npm run balance:fingerprint`。P1～P4 的指紋必須 180/180。

| 包 | 範圍（檔案） | 相依 | 專屬驗收 | 執行者 | 停下來問的時機 |
|---|---|---|---|---|---|
| **P0** 查證與舊版取證 | 不改程式；產出 `tools/ui-e2e/out/td/` 與查證結果（補進本開案書） | 無 | §3.3 的 P0 指令全部跑完 | 主代理 Opus | 待查證任一條的答案推翻 §2 的設計（例如 `bodyType` 會影響模擬）。 |
| **P1** 共用入口 | 新增 `tools/sim/headlessBattle.ts`、`tests/HeadlessBattle.test.ts` | P0 | 共同。測試涵蓋：2 陣營左右分、10×1、`roleOf`、`mirrorSides`、缺格丟錯、同種子兩次建出相同站位 | 主代理 Opus（簽名在這包定案） | 需要改 `Deployment.ts` 才寫得出來。 |
| **P2** batch-sim＋mobility-probe | `tools/balance/batch-sim.mjs`、`tools/balance/mobility-probe.mjs` | P1 | 共同；P0 的 batch 指令（檔名改 `new-…`）；`npm run balance:mobility`（門檻版，不加 `--report`）退出碼 0 | agy Gemini 4 Neon（機械替換，派工單列明每條指令）；比對由主代理做 | mobility 任一門檻 FAIL；batch 摘要落在舊版跨種子範圍外；待查證 5 的結果是「放置先後有影響」。 |
| **P3** ai-idle-sim | `tools/balance/ai-idle-sim.mjs` | P1 | 共同；P0 的 ai-idle 指令（五情境 × 三種子，檔名改 `new-…`），自我檢查全過 | Sonnet 子代理 | 自我檢查失敗；`Loadout not applied`；`idlePct` 或 `timeouts` 超出舊版範圍。 |
| **P4** record-bench | `tools/replay/record-bench.mjs` | P1 | 共同；`node tools/replay/record-bench.mjs --out=tools/ui-e2e/out/td/new-bench.json` 退出碼 0；`git status public/replays` 無變動 | Sonnet 子代理 | 13×11 放不下 10 人一邊（入口丟錯）；需要動回放檔才能過。 |
| **P5** 指紋改接＋重錄 | `tools/balance/simFingerprint.ts`、`tools/balance/fingerprint.baseline.json` | P1；P2～P4 完成後才做 | §3.3 的 P5 七步 | 主代理 Opus（不外派） | 結果和預測不符；契約驗收變紅；需要改 `buildBattle` 的簽名。 |
| **P6** ADR 與文件 | `docs/adr/NNNN-…md`、`docs/DECISIONS.md`、五支工具與 `simFingerprint.ts` 的檔頭說明 | P5（或使用者決定不做 P5 時接 P4） | 共同（含 `tests/AdrIndex.test.ts`、`tests/DocDrift.test.ts`）；`git grep -n "104729" tools`、`git grep -n "layoutFactionHexes" tools` 都沒有結果 | 主代理 Opus | 無。 |

P2、P3、P4 互不相依，可以平行。

P5 可以單獨否決。不做的話，`simFingerprint.ts` 會在 ADR 裡登記為唯一例外，理由寫「改了要重錄指紋」。建議要做：否則指紋的 TEAMS 鎖的仍是 `deployRoster` 不會產生的排法，而且 `buildBattle` 仍是第二份佈陣。

## 5. 回退

| 包 | 回退方式 | 回退後驗證 |
|---|---|---|
| P0 | 沒有程式改動；刪掉 `tools/ui-e2e/out/td/` 即可。 | 無 |
| P1 | `git revert <P1>`。只有新增檔；要先退掉 P2～P5。 | 共同驗收 |
| P2／P3／P4 | 各自 `git revert <sha>`，互不影響。工具輸出在 gitignore 目錄，沒有殘留。 | 共同驗收；該工具用 P0 的指令重跑，摘要與 `old-…` 相同 |
| P5 | `git revert <P5>`。程式和基準檔在同一個 commit，一起回到舊版。**不要**用 `--record` 回退。 | `npm run balance:fingerprint` 回到舊基準的 180/180 |
| P6 | `git revert <P6>`。若 ADR 已是「採用」而之後要推翻，照 `docs/adr/README.md` 另開一份取代，不改原檔。 | `npm test` |

回退順序是反向：P6 → P5 → P2～P4 → P1。

## 6. 要不要 ADR

**要。** 這個決定會限制之後每一支無畫面工具的寫法，也牽涉驗證流程（指紋基準在什麼條件下可以重錄），符合 `docs/adr/README.md` 的第 1 條。編號取 `docs/adr/` 現有最大號加一（待查證 10）。動工前的狀態是 `提議`，P6 改為 `採用`。

**標題：** `# NNNN 無畫面工具的佈陣一律經由 Deployment.ts`

**「決定」一節草稿：**

```markdown
## 決定

- 「取出生格、排陣營與職業、決定放置順序、送 PLACE_AGENT」只定義在
  engine/systems/match/Deployment.ts（planRoster、deployRoster）。
- 無畫面工具要一場佈陣完成的戰鬥，只能呼叫 tools/sim/headlessBattle.ts 的
  buildHeadlessBattle；該檔只組合 Deployment.ts 的函式，不自己挑格子、不自己洗牌、
  不自己決定 team 與 side。
- 工具之間的差異只能是 buildHeadlessBattle 的參數：setup、map、roleOf、mirrorSides、
  matchSalt、round。需要新的差異時加參數，不在工具裡另寫佈陣。
- 佈陣的亂數只用 engine/math/rng.ts 的序列；工具不得自帶亂數產生器。
- tools/ 底下除 headlessBattle.ts 外，不得直接送 PLACE_AGENT，也不得呼叫
  querySpawnableHexes、layoutFactionHexes。
- 指紋基準只在「佈陣定義改變」或「故意改玩法」時由主代理重錄；重錄的 commit 要寫明
  原因、各情境變動場數，以及 engine/、data/、constants/ 是否有修改。
```

「放棄的做法」預計寫三條：

- 各工具保留自己的佈陣、只加註解。
- 把入口放進 `engine/`。
- 給 `deployRoster` 加工具專用參數。

「證據」列本開案書與 P1～P5 的 commit SHA。

倒數第二條能不能做成自動檢查（例如一支掃 `tools/` 的測試），放在 P6 評估。做不到就只靠審查，並在 ADR「後果」裡照實寫。

## 7. 風險與不做的事

**風險**

1. **mobility-probe 的門檻可能在新排法下不過。** 門檻不動。真的 FAIL 就停下來，由使用者判斷是舊排法遮住了問題，還是門檻本來就是照舊排法量出來的。
2. **歷史數字不能再直接比。** `WORKLOG` 或設計文件裡引用過的 batch-sim／ai-idle 數字，收斂後同種子也對不上。P6 要在文件註明分界的 commit。
3. **`bodyType`、`look` 從不傳變成明傳。** `planRoster` 用 `SHOWCASE-…` 雜湊決定體型，`matchSalt` 不再決定體型。若體型會影響模擬（碰撞、射程），所有工具的結果都會多一個變因（待查證 3）。
4. **多送 `SET_BATTLE_SETUP`、順序固定在換圖之前。** 對地圖生成有沒有影響，看不出（待查證 4）。
5. **`mirrorSides` 的放置先後**：見 §2.3。
6. **`deployRoster` 少放不報錯。** 入口用 `placed.size` 補上檢查。若遊戲本體也該報錯，那是另一案。
7. **`tests/contracts/simState.ts` 受保護。** P5 只能靠不改 `buildBattle` 簽名來相容。若契約驗收的斷言依賴舊排法，P5 就做不了，要停下來問。

**不做的事**

- 不改 `Deployment.ts`、`MatchFlowSystem`、`editorQueries`，也不改任何 `engine/`、`data/`、`constants/` 檔案。
- 不統一開戰指令。四支用 `engine.play()`、`record-bench` 用 `START_GAME`，兩者差異看不出（待查證 6），所以入口只做到「佈陣完成、尚未開戰」，和 `buildBattle` 現在的邊界一致。查清楚後另案處理。
- 不讓工具改用 `rollShowcaseMap`。遊戲怎麼把它的結果送成 `RANDOMIZE_MAP`，看不出（待查證 7）；這一案只把工具現有的換圖指令收到入口一處。
- 不重錄 `public/replays/` 的回放檔，不重錄保真與效能基準。
- 不動各工具的量測掛鉤、統計、門檻、種子公式、`--loadout`、`--hpScale`。`--hpScale` 直接寫 `maxHp` 是既有做法，不在本案範圍。
- 不順手整理 ai-idle-sim 的其他重複（例如 `isBusy` 與 `busyOf`）。

## 待主代理查證

1. `package.json` 裡 `balance:fingerprint`、`balance:mobility`、`balance:sim` 的實際指令與參數，以及 `ai-idle-sim`、`record-bench` 有沒有對應的 script。
2. `factionRoleIndex(side, i, unitsPerFaction, 5)` 的結果是否等於工具現行的 `(f+u)%5` 與 `rolesList[i]`。
3. `PLACE_AGENT` 帶 `bodyType`、`look` 時，是否影響模擬（數值、碰撞、亂數消耗），或只影響表現層。
4. `SET_BATTLE_SETUP` 是否影響 `RANDOMIZE_MAP` 的結果（尺寸、場景、障礙），以及引擎預設的 `BattleSetup` 是什麼。
5. 單位的 `id` 與 `engine.agents` 的順序是否由放置先後決定，放置先後是否影響戰鬥結果。
6. `engine.play()` 與 `START_GAME`（帶 `seed`）的差別：是否重設種子、是否為回放錄製所必需。
7. `MatchFlowSystem` 如何使用 `rollShowcaseMap` 的結果送 `RANDOMIZE_MAP`，傳給 `deployRoster` 的 rand 是哪一條序列，以及它和 `engine/math/rng.ts` 的 `random` 是否同一條。
8. `GAME_APP_PARAM.TEAMS_SPLIT_GAP_Q` 的值是否為 1。
9. `querySpawnableHexes` 的判定，和 batch-sim 自算的「非障礙且 `dist < floor(max(w,h)/2)+1`」是否等價。
10. `docs/adr/` 目前的最大編號。
11. 契約 R2 是否鎖住 `Deployment.ts` 的簽名；`tests/contracts/` 的驗收是否依賴 `buildBattle` 現行的站位或放置順序。
12. addAgent 抽技能的機制，是否消耗 `rng.ts` 的全域序列、在什麼時點消耗。
13. batch-sim、ai-idle、mobility 的輸出有沒有被其他測試、文件或基準檔引用為固定數字。
14. `public/replays/bench-magma-20.json` 被哪些 script 讀取，是否有流程會自動重跑 `record-bench`。

**主代理初查（2026-11-24）**：8. `constants/ui.ts` 的 `TEAMS_SPLIT_GAP_Q` 是 1。10. 目前最大編號 0025，新 ADR 取 0026。§1 說的「本地 LCG 違反 AGENTS.md」屬實（AGENTS.md：Never write a local PRNG, LCG or integer hash）。

**主代理 P0 查證（2026-11-24，explorer 子代理讀碼，主代理整理；行號為當時）**

> **P0 開放項目（§2.3 的放置先後）**：第 5、12 條證實放置順序會改變每個單位抽到的職業與技能（`addAgent` 每次放置都依序從全域 `random()` 抽，主代理讀過 `agentManager.ts` 的 `addAgent`）。這代表同一個種子的單場結果會變——§3.1 本來就預期。至於 `mirrorSides` 讓紅方先放，會不會讓 `--swapSides` 的藍方勝率出現**系統性**偏差，現有證據不足（藍紅抽的是同一條序列；陣列順序、tick 迭代順序的影響未查）。先量再說：同一組種子、足夠場數，比較改前改後 `--swapSides` 的藍方勝率是否落在雜訊內；有系統性偏差才回到 §2.3，問使用者要不要動 `Deployment.ts`。

1. `balance:fingerprint`＝`node tools/balance/sim-fingerprint.mjs`、`balance:sim`＝`batch-sim.mjs`、`balance:mobility`＝`mobility-probe.mjs`、`balance:idle`＝`ai-idle-sim.mjs`（`--scenario` 必填）；`record-bench` 沒有 npm script。
2. `factionRoleIndex`（`editorQueries.ts:160-163`）和工具公式**不同**：TEAMS 陣營 1 不同（`u` 對 `(1+u)%5`），SQUADS 不同；ROYALE 相同。ai-idle 的 `rolesList[i]` 與 TEAMS 相同；`royaleRoles` 未核對。→ 指紋 TEAMS、SQUADS 會變（預期），ROYALE 可能不變。
3. `bodyType`、`look` 只影響呈現與存檔，combat／movement／ai 沒有讀；體型由雜湊決定，不耗亂數。→ §7 風險 3 解除。
4. `SET_BATTLE_SETUP` 不影響 `RANDOMIZE_MAP`（地圖生成不讀 battleSetup）；預設 2 陣營×5 人。→ §7 風險 4 解除。
5. 單位 id 與 `engine.agents` 順序由放置順序決定；放置順序**會**影響結果（見上方方框）。tick 迭代順序本身的影響未定。
6. `play()` 不重設種子、不寫 matchStart；`START_GAME` 會建開戰快照、設 matchSalt、`seedSimulation`，回放匯出需要 matchStart，所以 record-bench 必須用 `START_GAME`。→ §7「不統一開戰指令」維持。
7. MatchFlowSystem 用自己的 `createRandomStream`（mulberry32，狀態獨立）傳給 `rollShowcaseMap` 與 `deployRoster`，不是全域 `random()`；全域序列只給地圖生成。→ 工具入口傳全域 `random()` 給 `deployRoster`，和遊戲本體的序列不同是預期的（工具不跑 MatchFlow）。
9. 不等價：`querySpawnableHexes` 多一步 `dropSpawnPockets`，會刪掉被障礙圍住的小區塊。→ batch-sim／mobility-probe 改接後格子池會變（§3.1 已列「一定變」）。
11. `tests/contracts/` 沒有引用 `Deployment.ts`；`simState.ts:13` 轉出 `buildBattle`，契約依賴它的簽名與「同種子兩次相同」，沒找到座標字面值斷言（未逐檔讀完）。
12. 有：`addAgent` 抽技能（職業未指定時也抽職業）用全域 `random()`，在每次 `PLACE_AGENT` 時抽。
13. 沒有測試引用這些工具的輸出數字；`fingerprint.baseline.json` 只被 `sim-fingerprint.mjs` 讀；固定數字只出現在文件（WORKLOG 等）。
14. `public/replays/bench-magma-20.json` 由 `perf-frames.mjs`（`?replay=`）與 `ReplayIO.ts` 讀取；沒有流程自動重跑 record-bench。

未核對：`queryMapKeys`、`queryHasObstacle` 內文、tick 迭代順序、ai-idle 的 `royaleRoles`、`startsNewMatch` 內文。

**P0 舊版取證（2026-11-26，08f81481，工作樹 `_wt_tool-deploy`）**：使用者同意動工、含 P5。輸出在 `tools/ui-e2e/out/td/`（不進版控）。

- `npm run balance:fingerprint`：180/180；三個情境的第 0 場 dump 另存 `old-dump-<情境>-0.txt`；`npx knip` 輸出另存 `old-knip.txt`。
- `batch-sim` 200 場：seed 1／2／3 藍方勝率 0.485／0.560／0.520（ci95 0.069），seed 1 `--swapSides` 0.490；`avgTime` 19.5／19.5／19.3；`attributedPct` 88.8／89.6／89.0；TIMEOUT 0。
- `mobility-probe --report` seed 31、32、33、`ai-idle-sim` 五情境 × seed 1、2、3（15 次都退出碼 0）、`record-bench`（MAGMA 20 人，807 tick）都存檔。
- **P0 開放項目的量法**（判準在跑新版前寫定，`criterion.md`）：`batch-sim` 每個種子 3000 場、seed 1、2、3，swap 與不 swap 各一臂。舊版藍方勝率：不 swap 0.514／0.529／0.518，swap 0.513／0.494／0.509（各 ci95 0.018）。量 A＝swap 勝率 new − old；量 B＝(new swap − new 不 swap) − (old swap − old 不 swap)；以 9000 場合計為準，超過 1.96σ 就停在 P5 之前。
- ADR 編號：`docs/adr/` 現在最大是 0026，新 ADR 取 **0027**（上面寫的 0026 已過時）。
- P5 預測在改 `buildBattle` 前寫定（`p5-prediction.md`）：TEAMS 0/60、SQUADS 0/60、ROYALE 60/60 相同。
