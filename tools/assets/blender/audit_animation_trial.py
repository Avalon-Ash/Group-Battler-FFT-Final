"""Blender-only audit of all saved trial scenes against untouched source GLBs.

Run after rendering, never concurrently with the baking batch. This also covers
the older Lionheart warrior entry point which does not emit its own audit file.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lionheart_roles import digest, original_state

TRIAL = ROOT / 'tools/ui-e2e/out/faction-animation-v01'
SOURCES = {'TANK': 'Knight.glb', 'WARRIOR': 'Barbarian.glb', 'RANGER': 'Rogue_Hooded.glb',
           'MAGE': 'Mage.glb', 'SUPPORT': 'Mage.glb'}


def stored_state():
    result = original_state(bpy.data.objects['Rig'])
    meshes = {}
    for obj in bpy.data.objects:
        if obj.type != 'MESH' or obj.name.startswith('LH_'):
            continue
        # matrix_local of a bone-parented object includes its evaluated bone pose.
        # Compare authored local channels and parent inverse exactly instead.
        meshes[obj.name] = digest({
            'vertices': [list(v.co) for v in obj.data.vertices],
            'faces': [list(p.vertices) for p in obj.data.polygons],
            'weights': [[(g.group, g.weight) for g in v.groups] for v in obj.data.vertices],
            'groups': [g.name for g in obj.vertex_groups],
            'matrixBasis': [list(r) for r in obj.matrix_basis],
            'matrixParentInverse': [list(r) for r in obj.matrix_parent_inverse],
            'parent': obj.parent.name if obj.parent else None,
            'parentType': obj.parent_type, 'parentBone': obj.parent_bone,
        })
    result['meshes'] = meshes
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--characters', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    snapshots, references, hashes = {}, {}, {}
    for filename in sorted(set(SOURCES.values())):
        path = Path(args.characters) / filename
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(path))
        references[filename] = original_state(bpy.data.objects['Rig'])
        snapshots[filename] = stored_state()
        hashes[filename] = hashlib.sha256(path.read_bytes()).hexdigest()
    previous = json.loads((ROOT/'docs/art/faction-animation-v01/validation.json').read_text(encoding='utf-8'))
    approved_hashes = {filename: previous['units'][f'BLUE:{role}:MALE']['rigAudit']['sourceGLBSha256'] for role, filename in SOURCES.items()}
    assert hashes == approved_hashes, 'Source GLBs changed since approved standing previews'
    for team in ['BLUE', 'RED']:
        for role, filename in SOURCES.items():
            for body in ['MALE', 'FEMALE']:
                raw = TRIAL / 'raw' / team.lower() / role.lower() / body.lower()
                bpy.ops.wm.open_mainfile(filepath=str(raw/'skin.blend'))
                current = stored_state()
                if current != snapshots[filename]:
                    difference = {k: {'expected': snapshots[filename][k], 'actual': current[k]}
                                  for k in current if current[k] != snapshots[filename][k]}
                    (TRIAL/'rig-difference.json').write_text(json.dumps(difference, indent=2), encoding='utf-8')
                    raise AssertionError(f'Original mesh/rig changed: {team}/{role}/{body}; see rig-difference.json')
                accessories = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('LH_')]
                for obj in accessories:
                    assert obj.parent == bpy.data.objects['Rig'], obj.name
                    assert [g.name for g in obj.vertex_groups] == ['head'], obj.name
                    assert all(len(v.groups) == 1 and v.groups[0].weight == 1 for v in obj.data.vertices), obj.name
                    assert any(m.type == 'ARMATURE' and m.object == bpy.data.objects['Rig'] for m in obj.modifiers), obj.name
                audit = {'status': 'PASS', 'team': team, 'role': role, 'body': body,
                         'sourceReference': references[filename], 'savedSceneStoredState': current,
                         'sourceGLBSha256': hashes[filename],
                         'addedHeadMeshes': [o.name for o in accessories],
                         'note': 'Saved scene exactly matches source vertices/faces/weights, authored matrix_basis/parent inverse/parent bone, rest bones and action names/ranges. sourceReference uses the earlier audit format for approved-source comparison; posed matrix_local is not a stored transform. Full keyframes not hashed.'}
                (raw/'skin-integrity.json').write_text(json.dumps(audit, indent=2)+'\n', encoding='utf-8')
                print('RIG_PASS', team, role, body, flush=True)


if __name__ == '__main__':
    main()
