"""Offline Lionheart role trials; preserve source bodies, equipment and rigs.

Role data is separate from the approved warrior. This module is never imported
by the game and never writes a runtime atlas or manifest.
"""
import copy
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from lionheart_skin import (PROFILE, cape_texture, clean_face, hair, inside, material,
                            palette_texture, rigid_mesh)

ROLE_PROFILE = PROFILE.with_name('lionheartRolesSkin.json')


def digest(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':')).encode()).hexdigest()


def original_state(rig):
    meshes = {}
    for obj in bpy.data.objects:
        if obj.type != 'MESH' or obj.name.startswith('LH_'):
            continue
        meshes[obj.name] = digest({
            'vertices': [list(v.co) for v in obj.data.vertices],
            'faces': [list(p.vertices) for p in obj.data.polygons],
            'weights': [[(g.group, g.weight) for g in v.groups] for v in obj.data.vertices],
            'groups': [g.name for g in obj.vertex_groups],
            'matrix': [list(r) for r in obj.matrix_local],
            'parent': obj.parent.name if obj.parent else None,
            'parentBone': obj.parent_bone,
        })
    return {
        'meshes': meshes,
        'bones': digest([(b.name, [list(r) for r in b.matrix_local]) for b in rig.data.bones]),
        'boneCount': len(rig.data.bones),
        'actionRanges': {a.name: list(a.frame_range) for a in bpy.data.actions},
    }


def circlet(cfg, rig, mats):
    """Fit a narrow band to the actual hair surface, rather than cutting through it."""
    vertices, faces = [], []
    for obj in bpy.data.objects:
        if obj.name == 'LH_HairCap' or obj.name.startswith('LH_Fringe_'):
            offset = len(vertices)
            vertices.extend(v.co.copy() for v in obj.data.vertices)
            faces.extend(tuple(i + offset for i in p.vertices) for p in obj.data.polygons)
    surface = BVHTree.FromPolygons(vertices, faces)
    vertices, faces = [], []
    count = cfg['segments']
    for z in (cfg['z'], cfg['z'] + cfg['height']):
        for i in range(count):
            a = math.tau * i / count
            direction = Vector((math.cos(a), math.sin(a), 0))
            start = Vector((cfg['center'][0], cfg['center'][1], z)) + direction * 2
            point, normal, _, _ = surface.ray_cast(start, -direction, 3)
            if point is None:
                raise ValueError('Circlet cannot attach to hair')
            vertices.append(list(point + normal * cfg['clearance']))
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, j + count, i + count))
    return rigid_mesh('LH_Circlet', vertices, faces, rig, [mats[cfg['color']]])


def twin_ponytails(cfg, rig, mats):
    """Tapered faceted hair locks in head bind space; no new bones or dynamics."""
    for side in (-1, 1):
        vertices, faces, indices = [], [], []
        sides = cfg['sides']
        for x, y, z, rx, ry in cfg['rings']:
            for i in range(sides):
                angle = math.tau * i / sides
                vertices.append((side * (x + rx * math.cos(angle)), y + ry * math.sin(angle), z))
        faces.append(tuple(reversed(range(sides))))
        indices.append(0)
        for row in range(len(cfg['rings']) - 1):
            for i in range(sides):
                j = (i + 1) % sides
                faces.append((row * sides + i, row * sides + j,
                              (row + 1) * sides + j, (row + 1) * sides + i))
                indices.append(1 if i in cfg['highlightFacets'] else 0)
        faces.append(tuple((len(cfg['rings']) - 1) * sides + i for i in range(sides)))
        indices.append(0)
        # Rings descend in z; reverse the unmirrored winding to face outwards.
        if side == 1:
            faces = [tuple(reversed(face)) for face in faces]
        rigid_mesh('LH_LongPonytail_' + ('L' if side < 0 else 'R'), vertices, faces,
                   rig, [mats['hair'], mats['hairLight']], indices)


def sigil_cape_texture(profile, output_dir):
    """Bake a configured broken-hex sigil directly; no existing emblem underneath."""
    cfg = profile['cape']
    size = cfg['textureSize']
    colors = {k: tuple(int(v[i:i+2], 16) / 255 for i in (1, 3, 5))
              for k, v in profile['colors'].items()}
    x0, y0, x1, y1 = cfg['logoBox']
    pixels = []
    for py in range(size):
        v = py / (size - 1)
        for px in range(size):
            u = px / (size - 1)
            x, y = (u - x0) / (x1 - x0), (v - y0) / (y1 - y0)
            mark = any(inside(x, y, polygon) for polygon in cfg['sigilPolygons'])
            mark = mark and not any(inside(x, y, polygon) for polygon in cfg['sigilCuts'])
            key = cfg['emblemColor'] if mark else cfg['backgroundColor']
            if min(u, 1-u, v) < cfg['border']:
                key = cfg['borderColor']
            pixels.extend((*colors[key], 1))
    image = bpy.data.images.new('Trial_SigilCape', size, size, alpha=True)
    image.colorspace_settings.name = 'sRGB'
    image.pixels.foreach_set(pixels)
    image.filepath_raw = str(Path(output_dir) / 'ashen-cape.png')
    image.file_format = 'PNG'
    image.save()
    return bpy.data.images.load(image.filepath_raw, check_existing=False)


def apply_role_skin(rig, role, body, toon, output_dir, profile_path=ROLE_PROFILE):
    config = json.loads(Path(profile_path).read_text(encoding='utf-8'))
    cfg = config['roles'][role]
    profile = copy.deepcopy(json.loads(PROFILE.read_text(encoding='utf-8')))
    profile['role'] = role
    profile['colors'].update(config.get('colors', {}))
    for section in ('cape', 'ornament'):
        profile[section].update(config.get(section, {}))
    profile['colors'].update(cfg.get('colors', {}))
    profile['paletteCells'] = cfg['paletteCells']
    if body == 'FEMALE':
        profile['colors'].update(cfg.get('femaleColors', {}))
        profile['hair'].update(cfg.get('femaleHair', {}))
        profile['ornament'].update(cfg.get('femaleOrnament', {}))
        for cell, color in cfg.get('femalePaletteCells', {}).items():
            row, column = map(int, cell.split(','))
            profile['paletteCells'][row][column] = color

    before = original_state(rig)
    for name in cfg['hide']:
        bpy.data.objects[name].hide_render = True
        bpy.data.objects[name].hide_viewport = True
    mats = {key: material(key, color, toon) for key, color in profile['colors'].items()}
    palette = material('RolePalette', profile['colors']['silver'], toon,
                       palette_texture(profile, output_dir, cfg['texture']))
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH' or obj.hide_render or obj.name in (cfg['head'], cfg['cape']):
            continue
        obj.data.materials.clear()
        obj.data.materials.append(palette)
        for poly in obj.data.polygons:
            poly.material_index = 0

    cape = bpy.data.objects[cfg['cape']]
    cape.data.materials.clear()
    cape_image = (sigil_cape_texture(profile, output_dir) if 'sigilPolygons' in profile['cape']
                  else cape_texture(profile, output_dir))
    cape.data.materials.append(material('CapePattern', profile['colors'][profile['cape'].get('backgroundColor', 'blue')],
                                        toon, cape_image))
    xs = [v.co.x for v in cape.data.vertices]
    zs = [v.co.z for v in cape.data.vertices]
    for poly in cape.data.polygons:
        poly.material_index = 0
        for li in poly.loop_indices:
            p = cape.data.vertices[cape.data.loops[li].vertex_index].co
            cape.data.uv_layers.active.data[li].uv = (
                (p.x - min(xs)) / (max(xs) - min(xs)),
                (p.z - min(zs)) / (max(zs) - min(zs)))

    visible_hat = None
    if 'hat' in cfg:
        source_hat = bpy.data.objects[cfg['hat']['source']]
        bpy.context.view_layer.update()
        transform = rig.matrix_world.inverted() @ source_hat.matrix_world
        vertices = [list(transform @ v.co + Vector((0, 0, cfg['hat']['lift']))) for v in source_hat.data.vertices]
        visible_hat = rigid_mesh('LH_MageHat', vertices,
                                 [list(p.vertices) for p in source_hat.data.polygons], rig, [palette])
        uv = visible_hat.data.uv_layers.new(name='OriginalHatUV')
        for loop in visible_hat.data.loops:
            uv.data[loop.index].uv = source_hat.data.uv_layers.active.data[loop.index].uv

    # Same verified KayKit skin surface as the warrior; source head remains hidden.
    clean_face(profile, rig, body, output_dir, cfg['head'])
    scalp_source = json.loads((PROFILE.parents[2] / config['scalpSource']).read_text(encoding='utf-8'))
    scalp = bpy.data.meshes.new('LH_ScalpTemplate')
    scalp.from_pydata(scalp_source['vertices'], [], scalp_source['faces'])
    scalp.uv_layers.new(name='UnusedUV')
    scalp.update()
    if 'hairStyles' in cfg:
        from ashen_hair import apply_ashen_hair
        apply_ashen_hair(profile, rig, mats, scalp, cfg['hairStyles'][body],
                         ornament_surface=[visible_hat] if visible_hat else None)
    else:
        hair(profile, rig, body, mats, scalp=scalp,
             ornament_surface=[visible_hat] if visible_hat else None)
        if body == 'FEMALE' and 'femalePonytails' in cfg:
            bpy.data.objects['LH_LowBun'].hide_render = True
            bpy.data.objects['LH_LowBun'].hide_viewport = True
            twin_ponytails(cfg['femalePonytails'], rig, mats)
        if body == 'MALE' and 'maleSideLocks' in cfg:
            twin_ponytails(cfg['maleSideLocks'], rig, mats)
    bpy.data.meshes.remove(scalp)
    contour = bpy.data.collections['LH_FaceOutline']
    accessories = []
    if 'circlet' in cfg:
        accessories.append(circlet(cfg['circlet'], rig, mats))
    accessories.extend(o for o in bpy.data.objects if o.name.startswith('LH_HairClasp_'))
    for obj in accessories:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        contour.objects.link(obj)

    after = original_state(rig)
    assert before == after, 'Skin modified original body, equipment, rig or action ranges'
    added = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('LH_')]
    for obj in added:
        assert [g.name for g in obj.vertex_groups] == ['head']
        assert all(len(v.groups) == 1 and v.groups[0].weight == 1 for v in obj.data.vertices)
    audit = {
        'status': 'PASS', 'team': config['team'], 'role': role, 'body': body,
        'original': after, 'addedHeadMeshes': [o.name for o in added],
        'hiddenOriginalMeshes': [cfg['head'], *cfg['hide']],
        'note': 'Original geometry/weights/transforms/rest bones preserved; action names/ranges checked, not full keyframe curves.',
    }
    Path(output_dir, 'skin-integrity.json').write_text(json.dumps(audit, indent=2), encoding='utf-8')
    return profile
