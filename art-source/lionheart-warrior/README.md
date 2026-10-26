# Lionheart warrior offline sources

These are review-stage skin sources, not live game atlases. See ../../docs/art/lionheart-warrior-v01/TRIAL_REPORT.md for commands, validation and the completed fixed-padding death-clipping repair.

- clean-face.json: unchanged skin-surface coordinates extracted from the existing KayKit Adventurers 1.0 Knight_Head, with its original nose, brows, eyes and hair omitted. Source hash and extraction rule are embedded. The JSON is the geometry source; bind it to the original Barbarian head bone. Original body and source GLB remain untouched.
- lion-emblem-v02.png: built-in imagegen extraction/reconstruction of the approved male-v01.png lower-right heraldic swatch, created 2026-10-26. Prompt asked for one frontal gold lion with curved mane, angular eyes/muzzle and chin, transparent background, no sun, rays, border, text or second symbol. Kept as generated. The native cape shader generation uses its alpha mask and profile colors; alpha cutoff removes faint edge artifacts.
- cape-v02.png, palette-v02.png, face-male.png, face-female.png: actual Blender-generated texture outputs, copied here for inspection. Deterministically recreated by lionheart_skin.py from the profile and original embedded palette. These snapshots are not separate sources of truth.

Design parameters live in art-source/faction-skins/lionheartWarriorSkin.json. The source GLB package is the project's existing CC0 KayKit pack. New geometry is limited to the visible face surface, rigid hair/bun and a conforming transparent hair-clasp decal. No new skeleton, clip, cloth solver or runtime dependency.
