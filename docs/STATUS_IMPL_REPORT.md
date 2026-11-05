# STATUS IMPLEMENTATION REPORT

2026-11-06

```text
branch=feat/status-visuals
HEAD=a5fa7c99
comparison_base=origin/main@45a7224f
prior_checkpoint=537d731f
tracked_source_files_changed_this_run=5
new_test_files_delivered=2
new_regression_cases=7
on_off_cases=3
existing_tests_modified=0
dependencies_added=0
simulation_writes_added=0
RNG_calls_added=0
facade_changes=0
coordinate_rule_changes=0
baseline_writes=0
threshold_changes=0
commit=0 push=0 merge=0
```

## Completed

| Item | File:line |
|---|---|
| P1 display descriptors | `data/status/status_display.ts:20` |
| P1 live-slot normalization | `engine/core/StatusQueries.ts:9` |
| P1 immutable UI snapshot | `engine/systems/ui/views/status.ts:21` |
| P1 row contract | `types/ui/status.ts:8` |
| P1 availability | `engine/systems/ui/views/l3.ts:44` |
| P1 field visibility compatibility | `engine/renderers/status/StatusActivity.ts:34` |
| P1 strip visibility consumer | `engine/renderers/hud/StatusStripPainter.ts:20` |
| P1 part visibility consumer | `engine/renderers/status/painters/StatusPartPainter.ts:27` |
| P2 event metadata | `types.ts:343` |
| P2 event-pool hydrate | `engine/events/GameEventPool.ts:60` |
| P2 event-pool release | `engine/events/GameEventPool.ts:88` |
| P2 fixed-slot lifecycle | `engine/core/ViewCommands.ts:12` |
| P2 scalar receipt writer | `engine/presentation/StatusPresentationSystem.ts:28` |
| P2 observation-only routing | `engine/presentation/VisualSystem.ts:81` |
| P2 STASIS refresh classification | `engine/systems/combat/CCManager.ts:362` |
| P2 cleanse provider | `engine/systems/combat/SkillActions.ts:182` |
| P2 periodic provider | `engine/systems/status/EffectSystem.ts:51` |
| P2 hazard provider | `engine/systems/HazardSystem.ts:146` |
| P1 fixtures / time / stable identity / availability | `tests/StatusProjection.test.ts:23` |
| P2 ignored CC / split SLOW / DOT variants / HOT / shield / DR / cleanse / pool | `tests/StatusProvenance.test.ts:27` |
| P1/P2 field compatibility / same-value overwrite / STASIS refresh / lifecycle / VisualSystem | `tests/StatusP1P2Regression.test.ts:39` |
| P2 sourceId / DR / RNG on-off comparison | `tests/StatusObservationDeterminism.test.ts:77` |

## Commands

| Command | EXIT | Log |
|---|---:|---|
| `npm run lint` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-lint.log` |
| `npx vitest run --exclude "**/AgentRunner.test.ts"` | 1 | `tools/ui-e2e/out/agent-logs/status-p12-suite.log` |
| `npm run build` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-build.log` |
| `npm run knip` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-knip.log` |
| `npm run balance:fingerprint -- --battles=60` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-fingerprint.log` |
| `node tools/ui-e2e/runtime-smoke.mjs` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-runtime.log` |
| `npx vitest run tests/StatusProjection.test.ts tests/StatusProvenance.test.ts tests/StatusP1P2Regression.test.ts tests/StatusObservationDeterminism.test.ts tests/StatusParts.test.ts tests/AgentView.test.ts tests/AgentOwnership.test.ts tests/LayerBoundary.test.ts tests/EffectFieldsRatchet.test.ts tests/VisualStatusOwnership.test.ts` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-target.log` |
| `npm run perf:guard` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-perf.log` |
| `node tools/ui-e2e/out/status-p12-ab.mjs` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-ab.log` |
| `node tools/ui-e2e/out/status-p12-ab.mjs` | 0 | `tools/ui-e2e/out/agent-logs/status-p12-ab-final.log` |
| `git -c safe.directory=C:/Git/_wt_status_visuals diff --check` | 0 | stdout=0 |

```text
targeted: Test Files 10 passed (10); Tests 79 passed (79)
suite: Test Files 1 failed | 140 passed (141); Tests 1 failed | 1438 passed (1439)
suite failure: tests/DocDrift.test.ts:99; 27 missing path references
TEAMS: 60/60 identical
ROYALE: 60/60 identical
SQUADS: 60/60 identical
on/off seeds=1234,21000000,21200000
ticks_per_seed=1200
compared_ticks=3600
differences=0
compared=all EffectSlot fields (remaining,max,value,tag,sourceId), drStacks, drTimers, PRNG state and draw count, HP/MP/shield/position/target/CD/cast/availability
observer_off_recorded=false; observer_on_recorded=true
[smoke] agents=10 running=true battleTime 0.52 -> 4.57 s
PASS: runtime smoke (0 page errors, engine advancing, canvas changing)
[PERF_ASSERT] ALL performance guardrails PASSED.
```

## A/B

`node tools/ui-e2e/out/status-p12-ab.mjs`；`tools/ui-e2e/out/status-p12-ab/report.json`。

| Scene | changedPixels | sumAbsDiff |
|---|---:|---:|
| VOID | 0 | 0 |
| FOREST | 0 | 0 |
| ICE | 0 | 0 |
| MAGMA | 0 | 0 |
| DESERT | 0 | 0 |
| battle_frozen | 0 | 0 |
| current-status-gallery-tier0 | 0 | 0 |
| current-status-gallery-tier3 | 0 | 0 |
| U_banished | 66306 | 5233163 |

```text
gallery_single_statuses=20
gallery_mixed_cases=3
gallery_tiers=0,3
pageerrors=0
source_switch=Vite load hook; before=origin/main source; after=workspace source; working source overwrite=0
asset_ready_timeout_ignored=0; probe_PRNG=engine/math/hash.ts exports
```

| perf:guard scene | meanAbsDiff | badPixelPct |
|---|---:|---:|
| VOID | 0.000 | 0.00 |
| FOREST | 0.651 | 0.17 |
| ICE | 0.253 | 0.22 |
| MAGMA | 0.249 | 0.04 |
| DESERT | 0.534 | 0.23 |
| battle_frozen | 0.005 | 0.00 |

## Scope decisions / exceptions

| File:line | Rule / reason |
|---|---|
| `engine/renderers/status/StatusActivity.ts:34` | Final scope requires existing field visuals. Field consumers retain previous visual-status conditions; complete slot projection remains available to UI. Added consumers: two painter imports; draw geometry/cap/order unchanged. |
| `engine/systems/ui/views/l3.ts:45` | P1 explicitly removes banished from isDead. Retained checkpoint correction; U_banished=66306 changed pixels versus origin/main. This is the existing exception to the batch's no-screen-change requirement. |
| `engine/systems/combat/CCManager.ts:359` | Additional STASIS/cleanse observations use STATUS_OBSERVATION; CC_APPLIED would also trigger CC_STUN in AudioSystem. Existing legacy CC event count retained. |
| `engine/presentation/StatusPresentationSystem.ts:29` | Structured CAST_BREAK supplies interruption. REFLECT/LIFESTEAL providers were not added outside the P2 file scope; no text parsing or inferred origin. |
| `engine/core/StatusQueries.ts:21` | Receipt element supplies BLEED only in data projection. Without receipt, BURN tag is recognized; other DOT remains generic. Field DOT tag and visuals unchanged. |

## Not completed

| Item | Evidence / reason |
|---|---|
| Full suite EXIT=0 | DocDrift: 27 references in STATUS_ART_DIRECTION, STATUS_FINAL_SCOPE, STATUS_VISUAL_DESIGN. Protected documents reference other worktree assets or future packages. No document edits, test edits, placeholder files, or retry. |
| AgentRunner | User-specified exclusion; sandbox-outside check count=0. |
| Later packages / Inspector effect components | Implemented=0; this batch=P1/P2. |
| verify:coords | Executions=0; position/height/sort/emission changes=0. |
| Commit / merge / push | Executions=0; sandbox .git read-only. |
