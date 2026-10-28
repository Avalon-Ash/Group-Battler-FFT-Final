# AGENTS.md — TACTICAL.OS 實作代理合約
> **System**: TACTICAL.OS is a designer-driven 5v5 hex tactical combat simulation built with Vite, React 19, TypeScript, and HTML5 Canvas 2.5D isometric rendering.
> **Your role**: You are an implementation agent. You carry out the task prompt you were given (usually `docs/<NAME>_AGENT_PROMPT.md`). A main agent reviews your diff before anything reaches `main`. Follow this contract strictly. If your task prompt conflicts with this contract, stop and report the conflict instead of choosing.

---

## 1. Core Architectural Invariants (Non-Negotiable)

1. **Single Source of Truth (SSOT)**:
   - **Types**: `types.ts` is the master contract. VFX particle/decal schemas are in `types/VFXSchema.ts`. Check types here before implementing.
   - **Parameters**: `constants/*.ts` holds all physics, combat, color, and layout constants, one file per domain (`geometry`, `combat`, `palette`, `units`, `hud`, `terrain`, `vfx`, `ui`, `render`, `audio`). `constants.ts` only re-exports them: keep importing from `constants`, but add new constants to the matching domain file. Never hardcode numbers or colors in engine/renderer code.
   - **Unit appearance**: `data/units/appearance/` (`sprite.ts`, `bodyTypes.ts`, `selectSpriteFrame.ts`) defines sprite atlas mappings, body types, and frame selection consumed by `SpriteUnitRenderer`. Renderers only consume these profiles; they never define visual config or colors.
   - **Procedural VFX**: `data/vfx/materialConfig.ts` controls procedural material parameters (noise, ribbon, beam, grading).
   - **Agent entity**: `Agent` (`engine/core/Agent.ts`) is pure data. **Never add methods to `Agent`.** All logic lives in Systems.
   - **One writer per field**: each state field is written by exactly one system. Before writing a field, `git grep` for other writers. (A timer once had two writers — one adding, one subtracting — so it stayed at 0 and death animations never played.)
   - **Animation derivation**: visual/animation states are derived at the end of each tick in `AnimationSystem` (`engine/presentation/`).
   - **Status effects**: all control / over-time effects live in `agent.effects` (fixed slots, `engine/core/Effects.ts`); their rules (polarity, hard CC, cleanses) are data in `data/status/effect_defs.ts`. Add an effect by adding a kind + def, not new `xxxTimer` fields (`tests/EffectFieldsRatchet.test.ts`).
   - **Visual fields**: `agent.view` (`visualStatus`, `hitFlashTimer`, `visualOffset`) is written only by presentation code and `engine/core/ViewCommands.ts` (`triggerHitFlash`, `triggerHitShake`); simulation code calls those commands.

2. **Facade and barrel files**:
   - **Facades** (public API / lifecycle orchestration): `engine/renderer.ts`, `engine/game.ts`, `engine/systems/grid.ts`, `engine/systems/map.ts`. Do not modify them unless the task explicitly changes a public signature or the tick order.
   - **Barrels** (`// [BARREL]` header, e.g. `engine/systems/combat.ts`, `movement.ts`, `engine/presentation/unit.ts`, `vfx.ts`, and `constants.ts`): re-exports only. Put code in the matching subdirectory (`engine/systems/combat/`, `constants/<domain>.ts`, etc.), never in the barrel.

2b. **Simulation / presentation boundary**:
   - Simulation = `engine/systems/**`, `engine/ai/**`, `engine/physics/**`, `engine/core/**`, `engine/events/**`, `engine/math/**`, `engine/types/**`. Presentation = `engine/presentation/**` (VFX, event visuals, unit submission, HUD, animation derivation, camera/director), `engine/renderers/**`, `engine/graphics/**`, `engine/renderer.ts`. `engine/game.ts` is the composition root.
   - **Simulation must never import presentation** (not even `import type`); `tests/LayerBoundary.test.ts` holds this at 0. Presentation may read simulation state but never write it.

3. **Event-driven communication**:
   - Subsystems communicate only through `engine.bus` (`EventBus`). Systems never call another system's methods directly.
   - Allocate events through `GameEventPool` (`engine/events/GameEventPool.ts`) to avoid GC pressure.

4. **No heavy graphics dependencies**:
   - Rendering is pure HTML5 Canvas 2D with procedural materials (`engine/graphics/materials/NoiseLib.ts`, `MaterialPainter.ts`).
   - **Do not import Three.js, Pixi.js, or any WebGL library.**

5. **Mutation gate**:
   - Combat and status changes go through their System pipelines.
   - *Deliberate exception*: ring-out / void fall (zone shrink) writes `hp = 0` and `banished` directly as a terrain outcome.
   - UI writes to the engine only through `UICommandSystem` (`engine/systems/ui/UICommandSystem.ts`, via `UI_COMMAND` events).
   - *Deliberate UI exceptions*: drag-preview transient coordinates (`px/py/dragOverQ/dragOverR`); the state change itself still goes through a command (e.g. `MOVE_AGENT`). The composition-root binding `engine.renderer = ...` stays in `GameCanvas`.

---

## 2. Pre-Read Checklist

| Task scope | Read first |
| :--- | :--- |
| **Every task** | `types.ts`, the relevant `constants/*.ts` file, your task prompt |
| **Renderers / VFX** | `engine/renderers/RenderSpec.ts`, `data/vfx/materialConfig.ts`, `VFX_PARAM` in `constants/vfx.ts` |
| **Unit appearance** | `engine/renderers/RenderSpec.ts`, `data/units/factionSkin.ts`, `data/units/appearance/sprite.ts`, `bodyTypes.ts`, `selectSpriteFrame.ts`, `engine/renderers/units/factions/SpriteUnitRenderer.ts` |
| **Anything that positions, lifts or sorts a visual** (terrain, units, pedestals, cores, VFX, projectiles, HUD over units) | `engine/renderers/RenderSpec.ts` (layer order, sortBias, coordinate protocol), `engine/math/VisualMath.ts`, and the box header of every file you edit |
| **AI / behavior trees** | `engine/behaviorTree.ts`, `engine/systems/ai.ts`, `engine/ai/`, `data/ai_profiles` |
| **Combat / skills / CC** | `engine/systems/combat/`, `data/skills/`, `skillDatabase.ts` |
| **Movement / hex grid** | `engine/systems/movement/`, `engine/systems/grid/`, `engine/math/VisualMath.ts`, `engine/math/PointerProjector.ts` |

---

## 3. What NOT to Do

- **No speculative refactoring.** Do not restructure working code or add abstractions the task did not ask for.
- **No `as any`.**
- **No hardcoded numbers or colors.** They belong in `constants/*.ts` or a `data/**` profile.
- **No `console.log`** in `tick()`, render loops, or particle updates.
- **No state in renderers.** Renderers read `Agent` state; they do not store their own.
- **No symptom hiding.** Fix the cause. Example of what is forbidden: "if a unit is idle, make it walk randomly."
- **No deleting "old" code by assumption.** Before deleting a file or export, `git grep` and show it has zero references. New pipelines often still depend on parts of old files.
- **No duplicate utilities.** Randomness comes from `engine/math/rng.ts` (seeded, splittable). Never write a local PRNG, LCG or integer hash; if a shared helper is missing, add it next to `rng.ts` and reuse it.
- **No committed one-off scripts.** Probes, screenshot and repro scripts go in `tools/ui-e2e/out/` (gitignored). A file you commit under `tools/` must be referenced by a `package.json` script, a test, a skill, or another committed tool.
- **No new dead code.** `npm run knip` must not report anything new compared with `main`.
- **No large blast radius.** If a step touches more than 3 files and your task prompt does not already list them, write the plan in your report/commit message before editing.

---

## 4. Rules Learned the Hard Way

- **React StrictMode**: component cleanup runs and the component remounts. Never immediately `destroy()` an object that the remount will reuse; defer it.
- **Depth sorting**: the sort key must include any offset applied at draw time, or the sprite flickers behind tiles.
- **Coordinate protocol is a contract, not a comment.** Heights, anchors, emission points and sort keys come from the SSOT helpers named in `RenderSpec.ts` (unit ground height `VisualMath.getUnitGroundHeight`, emission origin `VisualMath.getCoreAnchor`, target/body anchor `VisualMath.getUnitAnchor`) — never recompute them locally (e.g. `getTerrainHeight(agent.q, agent.r)` in a painter). If your change alters any rule (a new offset, a new sortBias, a new layer), update `RenderSpec.ts` **and** the box header (`// ╔═ … 職責／上游／[ARCH] … ╚═`) of each touched file in the same commit. `tests/CoordinateProtocol.test.ts` enforces this with a shrink-only baseline; never add entries to it.
- **Asset URLs**: build them with `import.meta.env.BASE_URL`, never a hardcoded `/assets/...` path.
- **"All green" is not "works"**: lint/test/build can pass while the screen is frozen. If you change rendering or engine lifecycle and your prompt includes a runtime check (Playwright script), run it.

---

## 5. Git and Test Discipline

- Commit only on the branch named in your task prompt. **Never merge into `main`, never `git push`, never rebase or force anything.**
- **Never re-record test baselines** (`perf:fidelity:record`, `E2E_UPDATE_STYLE=1`, any `*baseline*` file) **and never loosen a threshold**, unless your task prompt explicitly says so for that baseline. When you are allowed to, first save an old/new/diff image, confirm only the expected elements changed, and list in the commit message what changed and which baselines stayed at 0 diff.
- Keep each file's existing line endings (most source files are CRLF) and encoding (UTF-8).
- If a check fails and the cause is outside your task, stop and report it. Do not "fix" unrelated code to make it pass.

---

## 6. Verification (after every code change)

```bash
npm run lint        # tsc --noEmit, must be 0 errors
npm test            # unit tests, must pass
npm run build       # production build, must succeed
npm run knip        # no new findings vs main (unused files/exports/deps)
npm run perf:guard  # only if you changed renderers / materials / VFX
```

For VFX part changes, preview with `node tools/vfx/fx-shot.mjs` (single-effect screenshot) or the in-game VFX Library window.

---

## 7. Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Vite dev server at `http://localhost:3000` |
| `npm run lint` | `tsc --noEmit` |
| `npm test` | Unit tests (`tests/`) |
| `npm run build` | Production bundle into `dist/` |
| `npm run e2e:ui` | Headless UI tests (`tools/ui-e2e/`) |
| `npm run perf:guard` | Render fidelity + performance regression check |

### Long commands: detach, then wait in short chunks (`tools/agent/run.mjs`)

Your IDE turns any tool call that runs longer than a few seconds into a background task, ends your turn, and waits for a "task finished" notification. That notification often never arrives, so you sit idle until the user writes to you: agents have idled 70 minutes, 2 hours, and 6.5 hours (2026-10-21, after a 10-second smoke test) on commands that had already finished. The fix is to **never let a tool call run long, and never end your turn while your own command is still running.**

- **Any command that can take more than ~5 s** (test, build, fidelity, guard, e2e, smoke, soak, batch sims, fx/ult sheets) is started detached and then polled:
  ```bash
  node tools/agent/run.mjs --detach <name> <timeoutSec> -- <command...>   # returns immediately
  node tools/agent/run.mjs --wait <name>                                   # returns within ~5 s
  # e.g. node tools/agent/run.mjs --detach guard 900 -- npm run perf:guard
  ```
  `--wait` prints one first line: `STATE=RUNNING` → **call `--wait <name>` again right away, in the same turn**; `STATE=DONE EXIT=<code>` → read the tail it prints (full log in `tools/ui-e2e/out/agent-logs/<name>.log`) and continue; `STATE=TIMEOUT` → rerun once; `STATE=LOST` → the background process never started or died: run that command once in the foreground instead (`node tools/agent/run.mjs <name> <timeoutSec> -- <command...>`). On Windows `--detach` launches through WMI so the IDE terminal's job object cannot kill it (2026-10-21: a plain detached spawn was killed instantly and the agent polled `--wait` 30 times).
- Short commands (lint, a single small test file) may run directly; if one ever comes back as "running in the background", switch to `--wait` for it instead of waiting.
- **Never end your turn while a command you started is running. Never send a message like "waiting for it to complete" or "I will report when it finishes"** — that hands the turn back and nothing wakes you up. Keep calling `--wait` until it says DONE, then move on.
- **Timeouts** (upper bounds, not estimates): lint 120, test 300, build 180, `perf:fidelity` 600, `perf:guard` 900, `e2e:ui` 600, `runtime-smoke` 180, `br-soak` 900, `balance:sim` 1000 battles 1200, screenshot/sheet tools 900. On timeout the wrapper kills only that command's own process tree (exit 124).
- **The same step fails or times out twice** → write it in your report as "not completed: <name> (log path)" and move on to the next task. One stuck command must not stall the whole round.
- `node tools/agent/run.mjs --check <name>` prints the state and the next step if you are unsure. Never start a second copy of a command that is still running (`--detach` refuses).

---

## 8. Directory Map

```text
├── components/          # React HUD, MapEditor, Inspector UI
├── data/                # Data profiles (units/appearance, skills, scenes, vfx, audio)
├── engine/
│   ├── core/Agent.ts    # Agent entity (pure data)
│   ├── systems/         # Simulation systems (combat, movement, status, zone, ai, ui, audio...)
│   ├── presentation/    # VFX, event visuals, unit submission, HUD, animation, camera/director
│   ├── ai/              # Behavior tree registry, targeting, pathfinding
│   ├── renderers/       # Canvas 2D render pipeline and painters
│   ├── graphics/        # Procedural materials (materials/NoiseLib, MaterialPainter), factories
│   ├── math/            # Coordinate transforms, pointer projection
│   ├── events/          # EventBus, GameEventPool
│   ├── audio/           # AudioEngine
│   ├── game.ts          # GameEngine facade and tick loop
│   └── renderer.ts      # Renderer facade
├── public/assets/       # Sprites, terrain textures, particles, audio
├── tests/               # Unit tests
├── tools/               # Preview harnesses, e2e and perf scripts
├── docs/                # Task prompts, reports, handoff
├── constants.ts         # Re-exports constants/*.ts (import from here)
├── constants/           # Parameter SSOT, one file per domain
└── types.ts             # Type contract
```
