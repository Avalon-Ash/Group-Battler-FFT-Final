# WebGL post-processing prototype (hybrid Canvas 2D + WebGL)

`tools/webgl-post-proto.html` is a standalone page (no engine changes). Open it through the dev server
(`npm run dev`, then `/tools/webgl-post-proto.html`) so the default screenshot loads; or pick any PNG with the file input.
It has threshold + dual-kawase or 2-pass gaussian bloom, lift/gamma/gain/saturation/exposure, vignette and up to 8 editable
additive point lights (drag on the image to move the selected one; the `iso squash` slider flattens the falloff to match `ISO_SCALE_Y`).

## How a hybrid would plug in
- Keep the game on a Canvas 2D context exactly as it is. After `renderer.draw()` finishes, upload that canvas with
  `texImage2D` / `texSubImage2D(canvas)` (once per frame), run the passes, and show the WebGL canvas instead of the 2D one
  (stack the 2D canvas hidden or `display:none`; UI/HUD stay in DOM above).
- Skill glow lights would come from the VFX registry: each active skill pushes `{x, y, radius, color, intensity}` into a small
  per-frame array (screen space, after camera transform); the post shader turns that into ground relight. Max 8 lights fits one uniform array.
- Screenshots/e2e: `canvas.toDataURL()` on the 2D canvas still returns the un-post-processed frame (fidelity baselines unaffected);
  the post canvas would need `preserveDrawingBuffer` or a readback if post-processed captures are wanted.

## Measured on this machine (2026-10-16, headed Edge, ANGLE D3D11, RTX 4070, 2560x1440, bloom at half res)
Bench = 120 frames, each stage ended by a 1-pixel `readPixels` (forces the GPU to finish; `gl.finish()` is a no-op here).
Display was a 60 Hz window, so rAF delta is not informative (16.67 ms avg).

| case | upload (ms, mean / p95) | passes (ms, mean / p95) |
| :-- | :-- | :-- |
| static 2D canvas, passthrough copy only | 0.24 / 0.3 | 0.18 / 0.3 |
| static 2D canvas, kawase 4 levels + 3 lights | 0.20 / 0.3 | 0.35 / 0.5 |
| static 2D canvas, 2-pass gaussian + 3 lights | 0.20 / 0.3 | 0.31 / 0.4 |
| static 2D canvas, lights only (bloom off) | 0.22 / 0.3 | 0.24 / 0.3 |
| source redrawn every frame (2D flush included in upload), kawase + 3 lights | 0.45 / 0.5 | 0.32 / 0.4 |

`EXT_disjoint_timer_query_webgl2` reported about 0.13 ms GPU time for the passes on the RTX 4070. The same page opened on the
AMD Radeon iGPU (default GPU for a headless/unflagged launch) reported 2.5-3.0 ms for the passes; that was the timer query only,
not the synced bench. Total on the RTX 4070 stayed under about 0.8 ms/frame in every case I measured.

## Risks / not measured
- The test canvas is a screenshot drawn into a 2D canvas, not the real game frame. In the real game the 2D canvas is also busy
  (with `quality` governor, `shadowBlur` etc.), so the readback/copy may stall differently; I did not measure inside the game.
- The upload is fast here because Chromium copies an accelerated canvas GPU-to-GPU. If the 2D canvas falls back to software
  (`willReadFrequently`, GPU blocklist, remote desktop) the upload becomes a CPU copy of ~14.7 MB per frame; not measured.
- Machines with only an iGPU (the secondary AMD display path here) were not benchmarked with the synced bench; numbers above
  are RTX 4070 only. The existing quality governor would need a post-processing tier.
- Context loss, DPR scaling, and keeping pointer coordinates correct when two canvases are stacked are untested.
- Bloom on RGBA8 clamps highlights (no HDR); an HDR path needs `EXT_color_buffer_float` and was not tried.
