# AGENTS.md — TACTICAL.OS AI Agent Operation Contract
<!-- Compatible with Claude Opus 5.5 / Claude Code / Cursor / AAIF Standard -->

> **System Identity**: TACTICAL.OS (`tactical-battler:-kernel-v9.7`) is a designer-driven 5v5 Hex tactical combat simulation and feel-verification engine built with Vite, React 19, TypeScript, and HTML5 Canvas 2.5D Isometric rendering.
> **Role & Operating Mode**: You are the principal systems engineer pair-programming on this repository. Follow this contract strictly. Do not deviate without explicit user instruction.

---

## 1. Core Architectural Invariants (Non-Negotiable)

1. **Single Source of Truth (SSOT)**:
   - **Type Contract**: `types.ts` is the master contract. VFX particle/decal schemas are in `types/VFXSchema.ts`. Always verify types here before implementing features.
   - **Parameter SSOT**: `constants.ts` governs all physics, combat calculations, colors, and layout constants. Never introduce hardcoded magic numbers.
   - **Unit Appearance SSOT**: `data/units/appearance/` defines faction aesthetics (Imperial vs Covenant). Renderers only consume profiles; they must never define visual configurations or hardcode colors.
   - **Procedural VFX SSOT**: `data/vfx/materialConfig.ts` controls all procedural shader-equivalent parameters (noise, ribbon, beam, grading).
   - **Agent Entity**: `Agent` (`engine/core/Agent.ts`) is a pure data entity (ECS-in-spirit). **NEVER add methods to `Agent`**. All state logic resides in Systems.
   - **Animation Derivation**: Visual and animation states are derived at the end of each tick in `AnimationSystem`.

2. **Facade vs Subsystem Rule**:
   - `engine/renderer.ts`, `engine/game.ts`, `engine/systems/combat/index.ts`, `engine/systems/movement/index.ts` are **Facades** (public API layer).
   - **Always modify the implementation inside subdirectories** (`engine/renderers/`, `engine/systems/combat/`, etc.).
   - Do **NOT** modify Facade files unless you are intentionally modifying public signatures or lifecycle orchestration.
   - Check the `[FACADE]` docblock header before touching any root engine file.

3. **Decoupled Event-Driven Communication**:
   - Subsystems communicate exclusively via `engine.bus` (`EventBus`).
   - Systems must **never directly call another system's methods**.
   - Use `GameEventPool` for event allocations to eliminate Garbage Collection pressure.

4. **Zero Heavy Graphic Dependencies**:
   - Rendering is pure HTML5 Canvas 2.5D Isometric with custom procedural material simulation (`NoiseLib`, `MaterialPainter`).
   - **Do NOT import Three.js, Pixi.js, or WebGL dependencies**.

5. **Mutation Gate**:
   - Combat and status state changes must pass through designated System pipelines.
   - *Deliberate exception*: Map ring-out / void fall (shrink collapse) writes directly to `hp = 0` and `banished` as a terrain outcome.

---

## 2. Reading Priority Checklist (Before Any Task)

| Target Scope | Mandatory Pre-Read Files |
| :--- | :--- |
| **All Tasks (Global)** | `types.ts`, `constants.ts` |
| **Renderers / VFX / Shaders** | `engine/renderers/RenderSpec.ts`, `data/vfx/materialConfig.ts`, `VFX_PARAM` in `constants.ts` |
| **Faction / Unit Appearance** | `data/units/appearance/types.ts`, `data/units/appearance/imperial.ts`, `data/units/appearance/covenant.ts` |
| **AI / Behavior Trees** | `engine/behaviorTree.ts`, `engine/systems/ai/`, `engine/systems/DesignExporter.ts` |
| **Combat / Skills / CC** | `engine/systems/combat/`, `data/skills/`, `skillDatabase.ts` |
| **Movement / Hex Grid** | `engine/systems/movement/`, `engine/systems/grid/`, `engine/math/VisualMath.ts`, `PointerProjector.ts` |

---

## 3. Strict Negative Constraints ("What NOT to do")

- **NO Speculative Refactoring**: Never refactor working subsystems or introduce new abstractions unless explicitly asked.
- **NO `as any`**: Strict type safety must be maintained. Bypassing types with `any` in core engine files is strictly prohibited.
- **NO Hardcoded Magic Numbers or Colors**: All layout dimensions, colors, and tuning coefficients belong in `constants.ts` or corresponding data profiles.
- **NO Dirty Logs**: Never insert `console.log` into `tick()`, render loops, or particle updates. VFX bind logs are restricted to once per session.
- **NO State Storage in Renderers**: Renderers are stateless visual consumers of `Agent` state.
- **NO Large Blast Radii**: If a planned fix requires touching more than 3 files, describe the strategy first before editing.

---

## 4. Verification & Validation Protocol

After making any code changes, **MUST** execute and pass the following checks without errors:

```bash
# 1. Typecheck & Lint (Must pass with 0 errors)
npm run lint

# 2. Production Build Verification (Must build cleanly)
npm run build
```

*Note: For procedural visual changes, preview with `tools/material-preview.html` via `npx vite`.*

---

## 5. Development Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server (`http://localhost:5173`) |
| `npm run lint` | Runs `tsc --noEmit` across the entire project |
| `npm run build` | Builds production bundle into `dist/` |
| `npm run preview` | Previews production build |

---

## 6. Project Directory Map

```text
c:\Git\Group-Battler-FFT-Final
├── components/          # React HUD, MapEditor, Inspector UI & Tabs
├── data/                # Data profiles (units/appearance, scenes, vfx)
├── engine/              # Simulation kernel
│   ├── core/Agent.ts    # Agent entity definition (pure state container)
│   ├── systems/         # Game logic systems (Combat, Movement, Zone, AI, etc.)
│   ├── renderers/       # Canvas 2D render pipeline & painters
│   ├── graphics/        # Procedural materials (NoiseLib, MaterialPainter)
│   ├── math/            # Coordinate transformation & pointer projection
│   ├── events/          # EventBus & GameEventPool
│   ├── game.ts          # GameEngine facade & tick loop
│   └── renderer.ts      # GameRenderer facade
├── tools/               # Procedural material preview harness & specs
├── constants.ts         # Global parameters SSOT
└── types.ts             # Global type system contract
```
