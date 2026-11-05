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

```text
2026-11-06
batch=5-status-art
implementation_files_changed=0
existing_tests_modified=0
assets_changed=0
baseline_writes=0
threshold_changes=0
commit=0 push=0 merge=0
STOP=existing-test-requires-old-sheep-collar-mask
tests/CcBodyPainters.test.ts:41
tests/CcBodyPainters.test.ts:60
expect(manifest.types.SHEEP!.maskFile).toBeTruthy();
tests/CcBodyPainters.test.ts:64
tests/CcBodyPainters.test.ts:79
expect(s.made).toHaveLength(5);
public/assets/cc_bodies/manifest.json:47
"maskFile": "sheep_mask.webp"
C:/Git/_wt_status_art/tools/assets/blender/render_status_art.py:68
C:/Git/_wt_status_art/tools/assets/blender/render_status_art.py:92
approved_sheep_directions=4
approved_sheep_frames_per_direction=4
approved_sheep_collar_mask_files=0
empty_mask_workaround=0
retained_unused_old_sheep_workaround=0
command=git -c safe.directory=C:/Git/_wt_status_visuals diff --stat
EXIT=0
stdout_bytes=0
command=npm run lint
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npx vitest run --exclude "**/AgentRunner.test.ts"
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npm run build
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npm run knip
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npm run balance:fingerprint -- --battles=60
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=node tools/ui-e2e/runtime-smoke.mjs
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npm run verify:coords
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npm run perf:mem -- 120 mute
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=npm run perf:guard
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
command=node tools/ui-e2e/perf-ab.mjs --assert
EXIT=NOT_RUN STOP=tests/CcBodyPainters.test.ts:60
origin_main_memory_comparisons=0
ingame_visual_checks=0
ingame_screenshots=0
prototype_board_images_inspected=2
implemented_STUN=0
implemented_POLYMORPH=0
implemented_ROOT=0
implemented_BURN=0
implemented_POISON=0
```
```text
2026-11-06 resume=1
PLAN_FILES
1 data/vfx/statusArt.ts
2 engine/renderers/status/StatusArtStore.ts
3 engine/renderers/status/painters/StatusArtPainter.ts
4 engine/renderers/status/PoisonMaterialStore.ts
5 engine/renderers/status/painters/StatusPartPainter.ts
6 engine/renderers/units/painters/UnitBodyPainter.ts
7 engine/renderers/units/painters/PolymorphPainter.ts
8 engine/renderers/units/CcBodyStore.ts
9 engine/renderers/units/factions/SpriteUnitRenderer.ts
10 data/units/appearance/ccBody.ts
11 engine/renderers/RenderPipeline.ts
12 engine/renderers/RenderSpec.ts
13 public/assets/cc_bodies/manifest.json
14 public/assets/cc_bodies/sheep-short.png
15 public/assets/cc_bodies/status-effects.png
16 tools/assets/blender/render_status_art.py
17 tools/assets/blender/pack_status_art.mjs
18 tests/CcBodyPainters.test.ts
19 tests/StatusArt.test.ts
20 tools/ui-e2e/out/status_art/*
simulation_changes=0
retained_status_table_changes=0
HUD_changes=0
baseline_changes=0
```
```text
PLAN_FILES_ADD data/units/appearance/selectSpriteFrame.ts data/units/appearance/sprite.ts engine/renderers/units/SpriteAtlasStore.ts docs/ASSET_LEDGER.md
```


```text
2026-11-06 batch=5-status-art resume=1
implementation_status=STOPPED_AFTER_2_SUPPLEMENTAL_CACHE_PROBE_FAILURES
source_files=15 tests=2 tooling=2 asset_files_added=2 asset_manifests=1 asset_files_deleted=2 documents=2
simulation_changes=0 existing_non_sheep_tests_modified=0 dependencies_added=0 baseline_writes=0 thresholds_changed=0 commit=0 push=0 merge=0
data/vfx/statusArt.ts:7
engine/renderers/status/StatusArtStore.ts:8
engine/renderers/status/PoisonMaterialStore.ts:18
engine/renderers/status/painters/StatusArtPainter.ts:29
engine/renderers/status/painters/StatusPartPainter.ts:107
engine/renderers/units/painters/UnitBodyPainter.ts:109
engine/renderers/units/painters/PolymorphPainter.ts:25
engine/renderers/units/CcBodyStore.ts:74
engine/renderers/units/factions/SpriteUnitRenderer.ts:221
engine/renderers/units/SpriteAtlasStore.ts:93
engine/renderers/RenderPipeline.ts:119
engine/renderers/RenderSpec.ts:276
data/units/appearance/ccBody.ts:29
data/units/appearance/selectSpriteFrame.ts:53
data/units/appearance/sprite.ts:86
public/assets/cc_bodies/manifest.json:7
tools/assets/blender/render_status_art.py:4
tools/assets/blender/pack_status_art.mjs:1
tests/CcBodyPainters.test.ts:40
tests/StatusArt.test.ts:10
docs/ASSET_LEDGER.md:176
public/assets/cc_bodies/sheep-short.png
public/assets/cc_bodies/status-effects.png
DELETED public/assets/cc_bodies/sheep.webp
DELETED public/assets/cc_bodies/sheep_mask.webp
command=git -c safe.directory=C:/Git/_wt_status_visuals grep -n -E "sheep.webp|sheep_mask.webp|composeTinted" -- engine data public tests tools docs/ASSET_LEDGER.md
EXIT=1 stdout_bytes=0
command=npm run lint
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-final-lint.log
command=npx vitest run --exclude "**/AgentRunner.test.ts"
EXIT=1 log=tools/ui-e2e/out/status_art/logs/status-art-final-static.log
command=npm run build
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-final-build.log
command=npm run knip
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-final-knip.log
command=npm run balance:fingerprint -- --battles=60
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-fingerprint.log
command=node tools/ui-e2e/runtime-smoke.mjs
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-runtime.log
command=npm run verify:coords
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-coords.log
command=npm run perf:mem -- 120 mute
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-mem-current.log
command=node tools/ui-e2e/out/status_art/memory-origin-main.mjs 120 mute
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-mem-main.log
command=npm run perf:guard
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-guard.log
command=node tools/assets/blender/pack_status_art.mjs C:/Git/_wt_status_art/docs/status_art
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-pack.log
command=node tools/ui-e2e/out/status_art/gallery.mjs
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-gallery-final.log
command=node tools/ui-e2e/out/status_art/combat.mjs
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-combat-css.log
command=node tools/ui-e2e/out/status_art/unchanged-ab.mjs
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-unchanged.log
command=node tools/ui-e2e/out/status_art/terrain-scene-ab.mjs
EXIT=0 log=tools/ui-e2e/out/status_art/logs/status-art-terrain-ab.log
command=node tools/ui-e2e/out/status_art/cache.mjs
EXIT=1 log=tools/ui-e2e/out/status_art/logs/status-art-cache.log
command=node tools/ui-e2e/out/status_art/cache.mjs
EXIT=1 log=tools/ui-e2e/out/status_art/logs/status-art-cache-stepped.log
Test Files 1 failed | 141 passed (142)
Tests 1 failed | 1443 passed (1444)
tests/DocDrift.test.ts:99 known_missing_path_references=26
initial_suite_added_failure=1 initial_suite_fixed_failure=1 data/vfx/statusArt.ts:2
TEAMS: 60/60 identical
ROYALE: 60/60 identical
SQUADS: 60/60 identical
[smoke] agents=10 running=true battleTime 0.52 -> 4.60 s
PASS: runtime smoke (0 page errors, engine advancing, canvas changing)
[PERF_ASSERT] ALL performance guardrails PASSED.
perf_guard_fidelity VOID=0.000 FOREST=0.651 ICE=0.253 MAGMA=0.249 DESERT=0.534 battle_frozen=0.005
terrain_same_environment_AB VOID=0 FOREST=0 ICE=0 MAGMA=0 DESERT=0
retained_status_same_environment_AB tiers=0,3 classes_teams_bodies=20 single_statuses=15 combinations=4 changedPixels=0 sumAbsDiff=0
HUD_same_environment_AB tiers=0,3 changedPixels=0 sumAbsDiff=0
VOID: units=3 frames=90 bobbing=true constantGap=true -> PASS
MAGMA: units=3 frames=90 bobbing=true constantGap=true -> PASS
coordinate_sink_violations=0 over_void_samples=2 oscillation_events=126 static_oscillation_events=4
coordinate_assert_flag=0 coordinate_runtime_warning_baseline_comparisons=0
memory_origin_main_seconds=120 generations=5 page_errors=0 canvas_median_MiB=396 canvas_peak_MiB=555 canvas_last_MiB=503 heap_median_MiB=50 heap_peak_MiB=118
memory_current_seconds=120 generations=4 page_errors=0 canvas_median_MiB=465 canvas_peak_MiB=570 canvas_last_MiB=413 heap_median_MiB=53 heap_peak_MiB=73
memory_canvas_median_delta_MiB=69 memory_canvas_peak_delta_MiB=15 memory_roster_matched=0
poison_pool_bytes=3145728 poison_scratch_bytes=49152 poison_page_capacity=10 pose_slots_reserved=60 pose_slots_capacity=64
accepted_effect_atlas_bytes=1572864 sheep_color_atlas_bytes=1048576 sheep_silhouette_bytes=1048576
art_resource_logical_bytes=6864896 old_asset_memory_credit_bytes=0
gallery_cases=1600 hue_cases=1200 hues=135,42,285,175,325,15
accepted_effect_atlas_sumAbsDiff=0 approved_short_sheep_atlas_sumAbsDiff=0 nonempty_sheep_frames=16
unit_draw_audit clip=0 Path2D=0 gradient=0 filter=0 shadowBlur=0 newCanvas=0 drawImage=200
combat_viewports=1280x900,393x852 DPR=1,3 samples_per_viewport=16 screenshots_per_viewport=8 agents=20 statuses_seen=5
combat_seed=4488 injected_via_production_CCManager=1 organically_rolled_initial_statuses=0 START_button_clicks_custom_probes=0
combat_production_skills STUN=wb_b4 POLYMORPH=mr_a3 ROOT=tb_a3 BURN=rr_b4 POISON=rr_b3
combat_moving_active_units_peak=1 slope_samples_peak=2 mixed_status_units_peak=4 occluded_units_peak=12 page_errors=0
combat_observed_height_transitions BURN=0->96 STUN+ROOT+POISON=24->0 POISON=0->24 POLYMORPH=48->72
pause_battleTime_before=2.1499999999999972 pause_battleTime_after=2.1499999999999972 pause_body_pixels_equal=1
prototype_geometry_fit data/vfx/statusArt.ts:21
prototype_runtime_motion_and_sort engine/renderers/units/painters/UnitBodyPainter.ts:109 engine/renderers/RenderSpec.ts:276
prototype_material_miss_draw_original engine/renderers/status/PoisonMaterialStore.ts:52
supplemental_cache_attempt_1 EXIT=1 page.evaluate: Error: Protected page changed
supplemental_cache_attempt_2 EXIT=1 page.waitForFunction: Timeout 30000ms exceeded.
supplemental_cache_attempt_2_manual_raf=1 supplemental_cache_attempt_2_wait_polling=raf
supplemental_cache_attempts=2 supplemental_cache_active_page_protection_completed=0 supplemental_cache_eviction_completed=0 supplemental_cache_probe_retries_remaining=0
standalone_perf_ab_command_executions=0 perf_ab_executions_inside_perf_guard=1 perf_fidelity_failures=0
tools/ui-e2e/out/status_art/ingame-board.png
tools/ui-e2e/out/status_art/mobile-gallery.png
tools/ui-e2e/out/status_art/combat-desktop-00.png
tools/ui-e2e/out/status_art/combat-desktop-07.png
tools/ui-e2e/out/status_art/combat-mobile-00.png
tools/ui-e2e/out/status_art/combat-mobile-07.png
tools/ui-e2e/out/status_art/gallery-evidence.json
tools/ui-e2e/out/status_art/combat-evidence.json
tools/ui-e2e/out/status_art/ab/report.json
tools/ui-e2e/out/status_art/terrain-ab/report.json
tools/ui-e2e/out/status_art/coord_guard.json
tools/ui-e2e/out/status_art/perf_ab.json
```

```text
command=git -c safe.directory=C:/Git/_wt_status_visuals diff --check
EXIT=0
```

```text
2026-11-06 batch=poison-inspector PLAN_FILES
engine/renderers/status/PoisonMaterialStore.ts
data/vfx/statusArt.ts
engine/renderers/status/StatusArtStore.ts
engine/renderers/status/painters/StatusArtPainter.ts
engine/renderers/units/painters/UnitBodyPainter.ts
engine/renderers/RenderSpec.ts
engine/renderers/hud/StatusStripPainter.ts
components/ui/inspector/UnitEffectsPanel.tsx
components/ui/inspector/UnitInspectorBody.tsx
hooks/adapters/statusIcon.ts
data/ui/labels/status.ts
types/ui/status.ts
engine/systems/ui/views/status.ts
data/ui/tokens.ts
styles/tokens.css
components/ui/primitives/Tooltip.tsx
components/ui/windows/ToolWindow.tsx
index.css
tests/PoisonMaterialStore.test.ts
tests/StatusViewModel.test.ts
```

```text
2026-11-06 batch=poison-inspector
status=STOPPED_PANEL_PROBE_FAILURES_2
source_files_changed=18 report_files_changed=1 new_test_cases=7
existing_tests_modified=0 baseline_writes=0 threshold_changes=0 dependency_changes=0
commit=0 push=0 merge=0
engine/renderers/status/PoisonMaterialStore.ts:17
data/vfx/statusArt.ts:7
engine/renderers/status/painters/StatusArtPainter.ts:29
engine/renderers/units/painters/UnitBodyPainter.ts:37
engine/renderers/RenderSpec.ts:16
engine/renderers/hud/StatusStripPainter.ts:63
components/ui/inspector/UnitEffectsPanel.tsx:11
components/ui/inspector/UnitInspectorBody.tsx:2
hooks/adapters/statusIcon.ts:8
data/ui/labels/status.ts:1
types/ui/status.ts:4
engine/systems/ui/views/status.ts:24
data/ui/tokens.ts:8
styles/tokens.css:110
components/ui/primitives/Tooltip.tsx:7
index.css:734
tests/PoisonMaterialStore.test.ts:43
tests/StatusViewModel.test.ts:19
command=npm run lint
EXIT=0 log=terminal; npm.cmd run lint
command=npx vitest run --exclude "**/AgentRunner.test.ts"
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-ui-suite.log
command=npm run build
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-build.log
command=npm run knip
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-knip.log
command=npm run audit:ui -- all
EXIT=0 log=terminal; npm.cmd run audit:ui -- all
command=npm run e2e:ui
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-e2e.log
command=npm run balance:fingerprint -- --battles=60
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-fingerprint.log
command=node tools/ui-e2e/runtime-smoke.mjs
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-smoke.log
command=npm run perf:guard
EXIT=NOT_RUN log=STOP_PANEL_PROBE_FAILURES_2
command=npm run verify:coords
EXIT=NOT_RUN log=STOP_PANEL_PROBE_FAILURES_2
command=npm run gen:tokens
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-ui-tokens.log
command=node tools/ui-e2e/out/status_ui/generate-tokens.mjs
EXIT=0 log=stdout=PASS Generated tokens; Vite SSR
command=npx vitest run tests/PoisonMaterialStore.test.ts tests/StatusViewModel.test.ts tests/StatusProjection.test.ts tests/StatusArt.test.ts
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-target-final.log
command=node tools/ui-e2e/out/status_ui/panel.mjs
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-ui-panel.log
command=node tools/ui-e2e/out/status_ui/panel.mjs
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-panel-final.log
command=node tools/ui-e2e/out/status_ui/panel.mjs
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-ui-panel-board.log
command=node tools/ui-e2e/out/status_ui/poison-frames.mjs before
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-before-v3.log
command=node tools/ui-e2e/out/status_ui/poison-frames.mjs after-channel
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-ui-after-channel.log
target: Test Files 4 passed (4); Tests 37 passed (37)
suite: Test Files 2 failed | 142 passed (144); Tests 2 failed | 1449 passed (1451)
tests/DocDrift.test.ts:99 known_missing_references=21
tests/MagicNumberBudget.test.ts:75 PoisonMaterialStore current=2 baseline=0
engine/renderers/status/PoisonMaterialStore.ts:19 unused_stamp_moved_to_data=2 final_suite_reruns=0
TEAMS: 60/60 identical
ROYALE: 60/60 identical
SQUADS: 60/60 identical
[smoke] agents=10 running=true battleTime 0.50 -> 4.55 s
PASS: runtime smoke (0 page errors, engine advancing, canvas changing)
PASS style-snapshot: 0 diffs against baseline
ALL PASSED
ui_audit_files=44 violations=0
poison_before_frames=60 first_onset_original_frames=1 post_onset_original_frames=3
poison_after_channel_frames=60 first_onset_original_frames=16 post_onset_original_frames=0
poison_sequences=idle_SE,walk_SW,attack_NE,walk_NW,idle_SE
poison_measured_appearances=1 poison_real_combat_checks=0
poison_pool_bytes_before=3145728 after=3145728 scratch_bytes=49152
poison_capacity_before=10 action_direction_pages poison_capacity_after=2 full_appearance_pages
poison_page_width=768 poison_page_height=512 blocks_per_task=2
poison_eyeballed_before=1 after=1 original_color_after_activation=0
cache_real_store_cases=4 mocked_subjects=0 platform_standins=Canvas,MessageChannel
ROOT_source_cell=20 split_y=100 back_rows=100 front_rows=28 overlapping_source_rows=0
ROOT_prototype_image_comparisons=0 ROOT_final_eyeball_checks=0
panel_verified_viewports=1440x900,393x852,320x852,852x393
panel_input_counts=0,1,18 canonical_row_counts=0,1,17
panel_STASIS_BANISH_merged_rows=1
panel_verified_min_button_width=44 min_button_height=44
panel_verified_horizontal_overflows=0 page_errors=0 text_scale=200%
panel_verified_source_selection_simulation_differences=0
panel_verified_source_cases=ACTIVE,DEAD,LEFT
panel_verified_target_cases=ACTIVE,BANISHED,DEAD
panel_verified_pause_ms=350
panel_rate_fixture_before=1.1s after=0.6s actual_double_speed_simulation_checks=0
panel_countdown_intervals_added=0 shared_projection_Hz=10
panel_expiration_detail_ms=300
panel_row_height_after_css_fix_desktop=48 mobile=56 final_browser_verifications=0
panel_scroll_container=STATUS_TAB HP_MP_fixed=1 AI_coordinate_sections_share_scroll=1
panel_control_bars_added=0
panel_unknown_DOT_and_BLEED_icon=existing_POISON new_icons=0
tools/ui-e2e/out/agent-logs/status-ui-panel.log:9 Error: Dead source
tools/ui-e2e/out/agent-logs/status-ui-panel-board.log:9 locator.click: Timeout 10000ms exceeded
tools/ui-e2e/out/agent-logs/status-ui-panel-board.log:19 map-toolbar intercepts pointer events
panel_probe_failures=2 panel_probe_passes_between_failures=1
tools/ui-e2e/out/status_ui/panel-board.png verified_version=pre_final_row_height_fix battlefield_background=0
tools/ui-e2e/out/status_ui/panel-desktop.png
tools/ui-e2e/out/status_ui/panel-mobile.png
tools/ui-e2e/out/status_ui/panel-evidence.json
tools/ui-e2e/out/status_ui/poison-before.png
tools/ui-e2e/out/status_ui/poison-after-channel.png
tools/ui-e2e/out/status_ui/poison-before.json
tools/ui-e2e/out/status_ui/poison-after-channel.json
NOT_COMPLETED=perf_guard,ROOT_prototype_comparison,real_combat_poison_validation,actual_double_speed_panel_validation,final_row_height_browser_validation,final_panel_board_with_battlefield,final_suite_after_magic_number_fix
token_generator_missing_local_vite_node=1 npm_install_commands=0 generation_via_existing_Vite_SSR=1
```

```text
2026-11-06 resume=2 PLAN_FILES
data/vfx/statusArt.ts
engine/renderers/status/PoisonMaterialStore.ts
engine/renderers/RenderSpec.ts
hooks/adapters/statusIcon.ts
engine/renderers/hud/StatusStripPainter.ts
components/ui/inspector/UnitEffectsPanel.tsx
components/ui/inspector/UnitInspectorBody.tsx
engine/systems/ui/views/status.ts
types/ui/status.ts
data/ui/tokens.ts
styles/tokens.css
index.css
package.json
tools/gen-ui-tokens.mjs
tests/StatusResume.test.ts
tools/ui-e2e/out/status_ui/*
```

```text
2026-11-06 resume=2 status=STOPPED_AFTER_2_CONSECUTIVE_REAL_PANEL_PROBE_FAILURES
source_files_total=20 report_files=1 existing_tests_modified=0 baselines_modified=0 thresholds_modified=0 dependencies_added=0
commit=0 push=0 merge=0
components/ui/inspector/UnitInspectorBody.tsx:40
components/ui/inspector/UnitEffectsPanel.tsx:11
components/ui/primitives/Tooltip.tsx:7
data/ui/tokens.ts:8
data/ui/labels/status.ts:1
data/vfx/statusArt.ts:7
engine/renderers/RenderSpec.ts:16
engine/renderers/status/PoisonMaterialStore.ts:20
engine/renderers/status/painters/StatusArtPainter.ts:29
engine/renderers/units/painters/UnitBodyPainter.ts:37
engine/systems/ui/views/status.ts:24
hooks/adapters/statusIcon.ts:12
index.css:734
package.json:26
styles/tokens.css:1
types/ui/status.ts:4
tests/PoisonMaterialStore.test.ts:43
tests/StatusResume.test.ts:40
tests/StatusViewModel.test.ts:19
tools/run-ui-token-generator.mjs:12
command=npm run gen:tokens
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-tokens.log
command=npx vitest run tests/StatusResume.test.ts tests/PoisonMaterialStore.test.ts tests/StatusViewModel.test.ts tests/StatusArt.test.ts
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-resume-target.log
command=npx vitest run tests/StatusResume.test.ts tests/PoisonMaterialStore.test.ts tests/StatusViewModel.test.ts tests/StatusArt.test.ts
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-target-2.log
command=node tools/ui-e2e/out/status_ui/battle-eight.mjs before
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-battle-before.log
command=node tools/ui-e2e/out/status_ui/battle-eight.mjs after
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-battle-after.log
command=node tools/ui-e2e/out/status_ui/root-compare.mjs
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-root.log
command=node tools/ui-e2e/out/status_ui/root-compare.mjs
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-root-final.log
command=npm run lint
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-lint.log
command=npx vitest run --exclude "**/AgentRunner.test.ts"
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-resume-suite.log
command=npm run build
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-build.log
command=npm run knip
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-knip.log
command=npm run audit:ui -- all
EXIT=0 log=tools/ui-e2e/out/agent-logs/status-resume-audit.log
command=node tools/ui-e2e/out/status_ui/panel-real.mjs
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-resume-panel-real.log
command=node tools/ui-e2e/out/status_ui/panel-real.mjs
EXIT=1 log=tools/ui-e2e/out/agent-logs/status-resume-panel-real-2.log
command=npm run perf:guard
EXIT=NOT_RUN resume=2 STOP_REAL_PANEL_PROBE_FAILURES_2
command=npm run e2e:ui
EXIT=NOT_RUN resume=2 STOP_REAL_PANEL_PROBE_FAILURES_2
command=npm run balance:fingerprint -- --battles=60
EXIT=NOT_RUN resume=2 STOP_REAL_PANEL_PROBE_FAILURES_2
command=node tools/ui-e2e/runtime-smoke.mjs
EXIT=NOT_RUN resume=2 STOP_REAL_PANEL_PROBE_FAILURES_2
command=npm run verify:coords
EXIT=NOT_RUN resume=2 STOP_REAL_PANEL_PROBE_FAILURES_2
command=git -c safe.directory=C:/Git/_wt_status_visuals diff --check
EXIT=0
battle_before agents=20 simultaneous_poison_appearances=8 simulation_frames=420 showcase=1
battle_before actions=281 directions=3 movement_samples=441 page_errors=0
battle_before pool_bytes=3145728 scratch_bytes=49152 total_bytes=3194880
before BLUE:TANK:MALE@135 draw_calls=421 first_hit_frame=9 cold_and_later_misses=100 post_onset_original_frames=91
before BLUE:WARRIOR:FEMALE draw_calls=421 first_hit_frame=2 cold_and_later_misses=72 post_onset_original_frames=70
before BLUE:RANGER:MALE draw_calls=421 first_hit_frame=12 cold_and_later_misses=116 post_onset_original_frames=104
before BLUE:MAGE:FEMALE draw_calls=421 first_hit_frame=10 cold_and_later_misses=103 post_onset_original_frames=93
before BLUE:SUPPORT:MALE@325 draw_calls=421 first_hit_frame=2 cold_and_later_misses=152 post_onset_original_frames=150
before BLUE:TANK:FEMALE draw_calls=421 first_hit_frame=4 cold_and_later_misses=78 post_onset_original_frames=74
before BLUE:WARRIOR:MALE draw_calls=421 first_hit_frame=2 cold_and_later_misses=165 post_onset_original_frames=163
before BLUE:RANGER:FEMALE draw_calls=421 first_hit_frame=7 cold_and_later_misses=111 post_onset_original_frames=104
battle_before total_post_onset_original_unit_frames=849 closeup_draws_included=8
battle_after agents=20 simultaneous_poison_appearances=8 simulation_frames=420 showcase=1
battle_after actions=281 directions=3 movement_samples=441 page_errors=0
battle_after pool_bytes=8388608 scratch_bytes=49152 total_bytes=8437760
after BLUE:TANK:MALE@135 draw_calls=421 first_hit_frame=12 cold_and_later_misses=12 post_onset_original_frames=0
after BLUE:WARRIOR:FEMALE draw_calls=421 first_hit_frame=0 cold_and_later_misses=0 post_onset_original_frames=0
after BLUE:RANGER:MALE draw_calls=421 first_hit_frame=12 cold_and_later_misses=12 post_onset_original_frames=0
after BLUE:MAGE:FEMALE draw_calls=421 first_hit_frame=13 cold_and_later_misses=13 post_onset_original_frames=0
after BLUE:SUPPORT:MALE@325 draw_calls=421 first_hit_frame=12 cold_and_later_misses=12 post_onset_original_frames=0
after BLUE:TANK:FEMALE draw_calls=421 first_hit_frame=12 cold_and_later_misses=12 post_onset_original_frames=0
after BLUE:WARRIOR:MALE draw_calls=421 first_hit_frame=12 cold_and_later_misses=12 post_onset_original_frames=0
after BLUE:RANGER:FEMALE draw_calls=421 first_hit_frame=12 cold_and_later_misses=12 post_onset_original_frames=0
battle_after total_post_onset_original_unit_frames=0 closeup_draws_included=8
battle_before_after_loadout_ids_equal=1 PRNG_seed=4488 production_poison_skill=rr_b3
battle_after_pages=8 page_dimensions=512x512 pool_limit_bytes=9437184 measured_total_bytes=8437760
poison_legacy_preview_layout_bytes=3145728 production_legacy_layout_allocations=0
poison_first_onset_frames_min=0 max=13 post_onset_original_frames=0
ROOT_approved_cell_channel_difference=0 partition_reconstruction_channel_difference=0
ROOT_back_bands=0..89,100..105 ROOT_front_bands=90..99,106..127 source_row_overlap=0
ROOT_compared_classes=5 directions=4 versions=2 human_image_inspections=2
ROOT_original_asset_writes=0 new_art_assets=0
panel_debug_context_line=0 relation_label_values=ALLY,ENEMY,null relation_label_location=unit_name
panel_icon_glyph_sources=existing_VFXPartStore corrected_anchor_sign=1 rotation_about_center=1 new_glyphs=0
panel_icon_real_Canvas_cases=DOT,POISON,BURN,ROOT,REGEN,SHIELD nonempty_glyph_cases=6
strip_source_changes_vs_HEAD=0 strip_pixel_difference_before_after_panel_icon_bake=0
panel_time_inset_token_px=8
target_suite: Test Files 4 passed (4); Tests 14 passed (14)
full_suite: Test Files 3 failed | 142 passed (145); Tests 3 failed | 1450 passed (1453)
tests/DocDrift.test.ts:99 known_missing_references=21
tests/ToolsReferenced.test.ts:36 orphan=tools/gen-ui-tokens.ts
tests/UITokens.test.ts:77 timeout_ms=5000
tools/run-ui-token-generator.mjs:1 extensionless_import_collision_fixed=1 package_entry_argument_added=1 subsequent_full_suite_runs=0
final_ROOT_depth_band_change_after_lint_build=1 final_lint_build_reruns=0
tools/ui-e2e/out/agent-logs/status-resume-target.log:21 ReferenceError: __vite_ssr_dynamic_import__ is not defined
tests/StatusResume.test.ts:1 browser_module_script_preload=1 subsequent_target_suite_EXIT=0
tools/ui-e2e/out/agent-logs/status-resume-panel-real.log:9 Error: No real status before selection
engine/systems/combat/CCManager.ts:46 if (isDebuff && sameSide(source, target)) return;
tools/ui-e2e/out/agent-logs/status-resume-panel-real-2.log:9 locator.waitFor: Timeout 12000ms exceeded
tools/ui-e2e/out/status_ui/panel-real.mjs:35 canvas_selection_did_not_open_unit_effects=1 root_cause_confirmed=0
real_panel_probe_consecutive_failures=2 real_panel_probe_further_attempts=0
final_real_panel_board_generated=0 actual_double_speed_panel_verified=0
tools/ui-e2e/out/status_ui/panel-board.png retained_prior_black_background_version=1 approved_delivery_screenshot=0
tools/ui-e2e/out/status_ui/root-comparison.png
tools/ui-e2e/out/status_ui/root-evidence.json
tools/ui-e2e/out/status_ui/battle-eight-before-30.png
tools/ui-e2e/out/status_ui/battle-eight-before-180.png
tools/ui-e2e/out/status_ui/battle-eight-before-419.png
tools/ui-e2e/out/status_ui/battle-eight-after-30.png
tools/ui-e2e/out/status_ui/battle-eight-after-180.png
tools/ui-e2e/out/status_ui/battle-eight-after-419.png
tools/ui-e2e/out/status_ui/battle-eight-before-closeup.png
tools/ui-e2e/out/status_ui/battle-eight-after-closeup.png closeup_mage_clipped=1 full_battle_image_mage_present=1
tools/ui-e2e/out/status_ui/battle-eight-before.json
tools/ui-e2e/out/status_ui/battle-eight-after.json
NOT_COMPLETED=final_full_suite,final_lint_build,perf_guard,e2e_ui_current_resume,fingerprint_current_resume,runtime_smoke_current_resume,verify_coords,real_panel_selection_root_cause,actual_double_speed_panel,final_desktop_mobile_panel_board
```

```text
2026-11-06 resume=3 PLAN_FILES
hooks/useSelection.ts
hooks/useGameApp.ts
components/ui/inspector/UnitEffectsPanel.tsx
tests/StatusSelection.test.ts
tools/ui-e2e/out/status_ui/panel-real.mjs
accepted_poison_ROOT_source_edits=0
```

```text
resume=3 PLAN_FILES_ADD
components/ui/window/ToolWindow.tsx
components/ui/inspector/UnitInspectorBody.tsx
data/ui/tokens.ts
styles/tokens.css
index.css
```

```text
2026-11-06 resume=3 FINAL
source_files_total=24 report_files=1 existing_tests_modified=0 baselines_modified=0 thresholds_modified=0 dependencies_added=0
commit=0 push=0 merge=0 new_control_bars=0
components/ui/inspector/UnitInspectorBody.tsx:40
components/ui/inspector/UnitEffectsPanel.tsx:11
components/ui/primitives/Tooltip.tsx:7
components/ui/window/ToolWindow.tsx:11
data/ui/tokens.ts:8
data/ui/labels/status.ts:1
data/vfx/statusArt.ts:7
engine/renderers/RenderSpec.ts:16
engine/renderers/status/PoisonMaterialStore.ts:20
engine/renderers/status/painters/StatusArtPainter.ts:29
engine/renderers/units/painters/UnitBodyPainter.ts:37
engine/systems/ui/views/status.ts:24
hooks/adapters/statusIcon.ts:12
hooks/useSelection.ts:7
hooks/useGameApp.ts:27
index.css:734
package.json:26
styles/tokens.css:1
types/ui/status.ts:4
tests/PoisonMaterialStore.test.ts:43
tests/StatusResume.test.ts:40
tests/StatusSelection.test.ts:4
tests/StatusViewModel.test.ts:19
tools/run-ui-token-generator.mjs:12
command=npm run lint
EXIT=0 seconds=29 log=tools/ui-e2e/out/agent-logs/status-final-lint-2.log
command=npx vitest run --exclude "**/AgentRunner.test.ts"
EXIT=1 seconds=16 log=tools/ui-e2e/out/agent-logs/status-final-suite-3.log
command=npm run build
EXIT=0 seconds=11 log=tools/ui-e2e/out/agent-logs/status-final-build-2.log
command=npm run knip
EXIT=0 seconds=3 log=tools/ui-e2e/out/agent-logs/status-final-knip-2.log
command=npm run audit:ui -- all
EXIT=0 seconds=1 log=tools/ui-e2e/out/agent-logs/status-final-audit-2.log
command=npm run e2e:ui
EXIT=0 seconds=205 log=tools/ui-e2e/out/agent-logs/status-final-e2e-2.log
command=npm run balance:fingerprint -- --battles=60
EXIT=0 seconds=19 log=tools/ui-e2e/out/agent-logs/status-final-fingerprint.log
command=node tools/ui-e2e/runtime-smoke.mjs
EXIT=0 seconds=19 log=tools/ui-e2e/out/agent-logs/status-final-smoke.log
command=npm run perf:guard
EXIT=0 seconds=114 log=tools/ui-e2e/out/agent-logs/status-final-perf.log
command=npm run perf:mem -- 120 mute
EXIT=0 seconds=129 log=tools/ui-e2e/out/agent-logs/status-final-memory.log
command=npm run verify:coords
EXIT=0 seconds=59 log=tools/ui-e2e/out/agent-logs/status-final-coords.log
command=node tools/ui-e2e/out/status_ui/panel-real.mjs
EXIT=0 seconds=55 log=tools/ui-e2e/out/agent-logs/status-final-panel-3.log
command=node tools/ui-e2e/out/status_ui/panel-real.mjs --source-jump
EXIT=0 seconds=15 log=tools/ui-e2e/out/agent-logs/status-final-source-jump.log
command=npm run gen:tokens
EXIT=0 output=PASS Generated tokens
command=git -c safe.directory=C:/Git/_wt_status_visuals diff --check
EXIT=0
full_suite: Test Files 1 failed | 145 passed (146); Tests 1 failed | 1454 passed (1455)
tests/DocDrift.test.ts:99 known_failure=1 missing_reference_entries=22 historical_report_entries=2
style_snapshot_diffs=0 console_page_errors=0 audit_ui_violations=0 audit_ui_files=44
fingerprint_TEAMS=60/60 fingerprint_ROYALE=60/60 fingerprint_SQUADS=60/60 differing_battles=0
runtime_smoke_agents=10 running=1 battle_time_seconds=0.73..4.77 page_errors=0
perf_fidelity_VOID=0.153,0.00 FOREST=0.627,0.17 ICE=0.188,0.22 MAGMA=0.108,0.04 DESERT=0.502,0.23 battle_frozen=0.173,0.00
perf_fidelity_mean_limit=0.8 bad_pixel_pct_limit=0.5 baseline_writes=0
perf_AB_scenes=5 baseline_ms=16.67 no_grain_ratio=1.00 violations=0
memory_seconds=120 games=4 errors=0 canvas_MiB_median=459 peak=560 peak_t=78 last=504 canvas_count_median=1550 max=1786
memory_heap_MiB_median=47 max=71 zoom_min=0.45 zoom_max=1.16 poison_canvases=2 poison_MiB_rounded=8
memory_t_canvas_heap=2:326/39,14:360/40,26:322/40,38:432/47,50:444/68,62:492/38,74:499/43,87:493/55,99:493/56,111:478/53
coords_sink_samples=61792 grounded_samples=52060 sink_violations=0 float_VOID_passes=90 float_MAGMA_passes=90 diagnostic_flicker_groups=22
engine/renderers/status/PoisonMaterialStore.ts:1 resume3_edits=0 SHA256=8213f8de0eb293e2518e86e3b673ec99d1c34fa6538c286aaf11cc6b81c8c22a
data/vfx/statusArt.ts:1 resume3_edits=0 SHA256=10be40d24b9877970879b26b7bdd218d9f7858a3c17b97650d07e31d79b17784
engine/renderers/status/painters/StatusArtPainter.ts:1 resume3_edits=0 SHA256=4d44731dd095cf47138c7bac58bac1102727ef43effd10cd5fcc6a7363999d4d
engine/renderers/units/painters/UnitBodyPainter.ts:1 resume3_edits=0 SHA256=21a75c8b6169da2af26fa6f5d89ae7d2b75ecc75d5874e3e67e2cf26aa72073b
battle_before agents=20 simultaneous_poison_appearances=8 simulation_frames=420 showcase=1
battle_before actions=281 directions=3 movement_samples=441 page_errors=0
battle_before pool_bytes=3145728 scratch_bytes=49152 total_bytes=3194880
before BLUE:TANK:MALE@135 draw_calls=421 onset_frame=9 post_onset_original_frames=91
before BLUE:WARRIOR:FEMALE draw_calls=421 onset_frame=2 post_onset_original_frames=70
before BLUE:RANGER:MALE draw_calls=421 onset_frame=12 post_onset_original_frames=104
before BLUE:MAGE:FEMALE draw_calls=421 onset_frame=10 post_onset_original_frames=93
before BLUE:SUPPORT:MALE@325 draw_calls=421 onset_frame=2 post_onset_original_frames=150
before BLUE:TANK:FEMALE draw_calls=421 onset_frame=4 post_onset_original_frames=74
before BLUE:WARRIOR:MALE draw_calls=421 onset_frame=2 post_onset_original_frames=163
before BLUE:RANGER:FEMALE draw_calls=421 onset_frame=7 post_onset_original_frames=104
battle_before post_onset_original_unit_frames_sum=849 closeup_draws_included=8
battle_after agents=20 simultaneous_poison_appearances=8 simulation_frames=420 showcase=1
battle_after actions=281 directions=3 movement_samples=441 page_errors=0
battle_after pool_bytes=8388608 scratch_bytes=49152 total_bytes=8437760
after BLUE:TANK:MALE@135 draw_calls=421 onset_frame=12 post_onset_original_frames=0
after BLUE:WARRIOR:FEMALE draw_calls=421 onset_frame=0 post_onset_original_frames=0
after BLUE:RANGER:MALE draw_calls=421 onset_frame=12 post_onset_original_frames=0
after BLUE:MAGE:FEMALE draw_calls=421 onset_frame=13 post_onset_original_frames=0
after BLUE:SUPPORT:MALE@325 draw_calls=421 onset_frame=12 post_onset_original_frames=0
after BLUE:TANK:FEMALE draw_calls=421 onset_frame=12 post_onset_original_frames=0
after BLUE:WARRIOR:MALE draw_calls=421 onset_frame=12 post_onset_original_frames=0
after BLUE:RANGER:FEMALE draw_calls=421 onset_frame=12 post_onset_original_frames=0
battle_after post_onset_original_unit_frames_sum=0 closeup_draws_included=8
poison_pool_limit_bytes=9437184 measured_total_bytes=8437760 capacity_appearances=8 onset_frames_min=0 max=13
ROOT_approved_cell_channel_difference=0 partition_reconstruction_channel_difference=0 classes=5 directions=4 versions=2 source_row_overlap=0 resume3_edits=0
panel_context_debug_line=0 relation_labels=ALLY,ENEMY,null relation_label_location=unit_name
panel_icon_sources=existing_VFXPartStore corrected_center=1 new_icons=0 DOT_BLEED_fallback=POISON strip_pixel_difference=0
selection_diagnosis_original_selection_ids=[] inspector_open=0 menu_inspector_open=1 effects_panels=0
selection_diagnosis_valid_canvas_pick_selected=1 auto_open_inspector=1 menu_close_open=1
selection_diagnosis_moving_visual_foot_hex_differs_from_logical_hex=1 input_system_edits=0
source_jump_checked_fields=watch,effects,target,hp,mp,shield,q,r,px,py changed_fields=0 before_target=RED-0008 after_target=RED-0008 selected_source=RED-0006 page_errors=0
panel=desktop viewport=1440x900 actual_time_scale=2 battle_elapsed=1.0999999999999999 status_decrement=1.1000000000000547 overflow_200pct=0 errors=0
panel=desktop raw_slots=0 projected_rows=0 min_button_width=44 min_button_height=44 row_height=null overflow_count=0 page_overflow=0
panel=desktop raw_slots=1 projected_rows=1 min_button_width=44 min_button_height=44 row_height=48 overflow_count=0 page_overflow=0
panel=desktop raw_slots=18 projected_rows=17 min_button_width=44 min_button_height=44 row_height=48 overflow_count=0 page_overflow=0
panel=desktop board={"rows":[{"top":402,"bottom":450,"visible":true},{"top":480,"bottom":528,"visible":true},{"top":558,"bottom":606,"visible":true}],"bars":[{"id":"playback-hud","rect":{"x":563.7890625,"y":794,"width":312.421875,"height":46},"overlap":0},{"id":"map-toolbar","rect":{"x":601,"y":40,"width":238,"height":46},"overlap":0}],"timeInset":9,"window":{"x":24,"y":80,"width":340,"height":568}}
panel=mobile viewport=393x852 actual_time_scale=2 battle_elapsed=1.0999999999999994 status_decrement=1.1000000000000547 overflow_200pct=0 errors=0
panel=mobile raw_slots=0 projected_rows=0 min_button_width=44 min_button_height=44 row_height=null overflow_count=0 page_overflow=0
panel=mobile raw_slots=1 projected_rows=1 min_button_width=44 min_button_height=44 row_height=56 overflow_count=0 page_overflow=0
panel=mobile raw_slots=18 projected_rows=17 min_button_width=44 min_button_height=44 row_height=56 overflow_count=0 page_overflow=0
panel=mobile board={"rows":[{"top":460,"bottom":516,"visible":true},{"top":546,"bottom":602,"visible":true},{"top":632,"bottom":688,"visible":true}],"bars":[{"id":"playback-hud","rect":{"x":18.2890625,"y":730,"width":356.421875,"height":62},"overlap":0},{"id":"map-toolbar","rect":{"x":64.5,"y":68,"width":264,"height":62},"overlap":0}],"timeInset":9,"window":{"x":0,"y":148,"width":393,"height":568}}
panel=narrow viewport=320x852 actual_time_scale=2 battle_elapsed=1.1666666666666665 status_decrement=1.1666666666667247 overflow_200pct=0 errors=0
panel=narrow raw_slots=0 projected_rows=0 min_button_width=44 min_button_height=44 row_height=null overflow_count=0 page_overflow=0
panel=narrow raw_slots=1 projected_rows=1 min_button_width=44 min_button_height=44 row_height=56 overflow_count=0 page_overflow=0
panel=narrow raw_slots=18 projected_rows=17 min_button_width=44 min_button_height=44 row_height=56 overflow_count=0 page_overflow=0
panel=landscape viewport=852x393 actual_time_scale=2 battle_elapsed=1.1333333333333326 status_decrement=1.1333333333333897 overflow_200pct=0 errors=0
panel=landscape raw_slots=0 projected_rows=0 min_button_width=44 min_button_height=44 row_height=null overflow_count=0 page_overflow=0
panel=landscape raw_slots=1 projected_rows=1 min_button_width=44 min_button_height=44 row_height=56 overflow_count=0 page_overflow=0
panel=landscape raw_slots=18 projected_rows=17 min_button_width=44 min_button_height=44 row_height=56 overflow_count=0 page_overflow=0
panel_cases_0_1_18=4x3 source_dead=1 source_missing=1 banished=1 actual_death=1 sub_tenth_input_seconds=0.01 sub_tenth_display_seconds=0.1 pause_sample_ms=350 expiry_focus_restore=1
panel_UI_projection_Hz=10 countdown_interval_added=0 screenshot_manual_mode=1 screenshot_real_engine_agents=1 screenshot_fixture_components=0 human_board_inspections=1
deviation_raw_effect_slots=18 canonical_rows=17 STASIS_BANISH_merged=1
deviation_shared_status_AI_scroller=1 new_window=0 new_control_bar=0
deviation_inspector_narrow_bottom_reservation_px=136 generic_sheet_bottom_px=96 reason_toolbar_overlap_before_px2=9266.97 after_px2=0
deviation_screenshot_window_height_px=568 default_height_px=520 reason_all_three_groups_visible=1 map_toolbar_overlap_after_px2=0
retry_e2e_first_EXIT=1 cold_page_goto_timeout_ms=8000 retry_EXIT=0
retry_panel_first_EXIT=1 playback_overlap_px2=9266.97 second_EXIT=1 map_overlap_px2=3696 third_EXIT=0
retry_selection_diagnosis_first_EXIT=1 post_diagnosis_empty_board_composition=1 second_EXIT=0
NOT_COMPLETED=DocDrift_known_failure
OUT_OF_SCOPE=existing_moving_unit_visual_foot_grid_picking_edge
required_commands_not_run=0
tools/ui-e2e/out/status_ui/panel-board.png
tools/ui-e2e/out/status_ui/panel-desktop.png
tools/ui-e2e/out/status_ui/panel-mobile.png
tools/ui-e2e/out/status_ui/panel-evidence.json
tools/ui-e2e/out/status_ui/source-jump-evidence.json
tools/ui-e2e/out/status_ui/root-comparison.png
tools/ui-e2e/out/status_ui/root-evidence.json
tools/ui-e2e/out/status_ui/battle-eight-before.json
tools/ui-e2e/out/status_ui/battle-eight-after.json
tools/ui-e2e/out/status_ui/battle-eight-after-419.png
```
