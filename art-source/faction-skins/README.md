# Approved faction skin profiles

These three JSON profiles are offline Blender inputs, not runtime appearance data.
They preserve the approved Lionheart / Ashen five-role male and female designs.
The shared warrior profile resolves source textures from the repository root.

Production preparation:

1. Keep the approved raw/packed trial at `tools/ui-e2e/out/faction-animation-v01/`.
2. Run `node tools/assets/blender/prepare_runtime_atlases.mjs` after any performance
   capture has finished. This reads the approved combined manifest from the retained
   `codex/lionheart-warrior-skins` branch and the local packed atlases.
3. Review output in `tools/ui-e2e/out/faction-skins-runtime/` before copying to public.

The converter preserves logical frame coordinates, reference height and foot anchors;
only delivery pixels are halved. Canvas high-quality resampling matches the runtime
sampling path; lossless WebP preserves the resulting pixels without another lossy pass.

Historical preview/overscan scripts require the earlier trial raw files and preview
references on the retained artwork branch. Their archival screenshots are deliberately
excluded from this integration branch. Do not run those gallery generators into tracked
`docs/art/` when preparing a production integration.
