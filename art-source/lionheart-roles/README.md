# Lionheart role skin sources

Offline trials for BLUE TANK / RANGER / MAGE / SUPPORT. Runtime assets are unchanged.

- `hair-scalp.json` contains original Barbarian head vertices and only the source polygons whose mean UV u is below 0.125. This excludes raised eyebrow geometry and retains the exact scalp used by the approved warrior hairstyle. No vertex coordinates were sculpted or scaled in this source extraction. The full source GLB SHA256 is embedded in the file.
- The existing `art-source/lionheart-warrior/clean-face.json` is the visible skin surface, not a full scalp; its crown stops below the original hair. Using that face alone for hair would lose the approved crown shape, so the scalp template is stored separately.
- The existing approved `art-source/lionheart-warrior/lion-emblem-v02.png` supplies the single cape emblem. No second symbol is composited over it.
- Both meshes derive from the KayKit Character Pack Adventures 1.0 (CC0), already recorded in the project's asset ledger. Palette gradients come from each role's original embedded texture.

Appearance parameters live in `art-source/faction-skins/lionheartRolesSkin.json`, inheriting the approved warrior profile. The role helper never writes the shared source files.

The original body, equipment meshes and rig remain in the scene. Original heads and selected headgear are hidden; the clean face, hair and ornaments bind to the original head bone. Mage headgear is a duplicate of the original hat vertices and UVs in rig space, lifted by the profile's 0.23 units; the unchanged original hat remains hidden. This is an accessory placement change, not a rig or body change.

See `docs/art/lionheart-roles-v01/REPORT.md` for rendering, evidence and review scope.
