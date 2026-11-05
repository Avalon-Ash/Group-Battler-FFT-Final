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
