"""Obstacle sprite renderer (VISUAL_ROADMAP O1): CC0 models / scripted hex prisms -> toon-shaded PNG per variant.

Usage: blender -b -P render_obstacle.py -- <assets3d_dir> <out_dir> [TYPE ...]
  TYPE = TREE | WALL | SANDSTONE | ICE_CRYSTAL | OBSIDIAN_PILLAR (default: all)
Camera: same as render_unit.py (orthographic, elevation 30deg = engine ISO_SCALE_Y 0.5, sun from upper left).
World scale: 1 Blender unit = HEX_SIZE (hex circumradius). PX_PER_HEX pixels per unit, so the hex footprint
is PX_PER_HEX px wide-radius on screen; the ground origin (cell centre) lands at pixel ANCHOR.
Heights are given in engine canvas units of vertical screen height (BLOCK_HEIGHT = 24); the model is scaled so
its projected height matches, which keeps the old ENV_SPRITE heights.
Output: <out_dir>/<TYPE>_<n>.png (+ meta.json); pack_obstacles.py trims and packs them into WebP atlases.
"""
import bpy, bmesh, sys, math, os, json, random
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bake_common import (PX_PER_HEX, HEX_SIZE_CANVAS, RES_X, RES_Y, ANCHOR, ELEVATION_DEG, OUTLINE_RGB, OUTLINE_PX,
                         reset, toon, setup_scene, normalise)

argv = sys.argv[sys.argv.index('--') + 1:]
ASSETS, OUT = argv[0], argv[1]
ONLY = set(argv[2:])


FOREST = os.path.join(ASSETS, 'kaykit_forest_nature/extracted/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf')
DUNGEON = os.path.join(ASSETS, 'kaykit_dungeon_remastered/repo/addons/kaykit_dungeon_remastered/Assets/gltf')
KENNEY = os.path.join(ASSETS, 'kenney_nature_kit/extracted/Models/GLTF format')

# fit: max footprint radius (hex units); height: projected screen height in canvas units; tint multiplies the
# model colour (None = keep), override replaces it.
TYPES = {
    'TREE': {'fit': 1.05, 'variants': [
        {'file': f'{FOREST}/Tree_1_A_Color1.gltf', 'height': 132},
        {'file': f'{FOREST}/Tree_2_A_Color1.gltf', 'height': 120},
        {'file': f'{FOREST}/Tree_3_A_Color1.gltf', 'height': 140},
        {'file': f'{FOREST}/Tree_4_A_Color1.gltf', 'height': 112},
    ]},
    # 虛空石碑（2026-10-19 取代地牢石柱／方尖碑組：磚石造型與漂浮的宇宙島不搭）：符文基座＋懸浮晶碑＋環繞碎晶
    'WALL': {'fit': 0.80, 'variants': [
        {'prisms': 'void_monolith', 'seed': s, 'height': h} for s, h in ((31, 104), (32, 96), (33, 112), (34, 100))
    ]},
    'SANDSTONE': {'fit': 0.86, 'override': (0.86, 0.60, 0.36), 'variants': [
        {'file': f'{KENNEY}/rock_tallA.glb', 'height': 72},
        {'file': f'{KENNEY}/rock_tallB.glb', 'height': 64},
        {'file': f'{KENNEY}/rock_tallC.glb', 'height': 78},
        {'file': f'{KENNEY}/rock_tallD.glb', 'height': 68},
    ]},
    'ICE_CRYSTAL': {'fit': 0.80, 'variants': [
        {'prisms': 'ice', 'seed': s, 'height': h} for s, h in ((1, 72), (2, 64), (3, 80), (4, 60))
    ]},
    # 黑曜柱（2026-10-19 重新設計：3～4 根粗柱、斜切斷頂，側面岩漿裂縫＋底部熔岩光帶；舊版只有頂面橘色、發光看不出來）
    'OBSIDIAN_PILLAR': {'fit': 0.78, 'variants': [
        {'prisms': 'obsidian', 'seed': s, 'height': h} for s, h in ((11, 108), (12, 96), (13, 116), (14, 100))
    ]},
    # 不阻擋的地表裝飾（VISUAL_ROADMAP T2）：小尺寸、細描邊；TerrainLoopAtlas／bakeBlock 依格子雜湊擺放
    'DECOR_GRASS': {'fit': 0.30, 'outline': 1.0, 'tint': (0.54, 0.78, 0.48), 'variants': [
        {'file': f'{FOREST}/Grass_1_A_Color1.gltf', 'height': 16},
        {'file': f'{FOREST}/Grass_1_C_Color1.gltf', 'height': 16},
        {'file': f'{FOREST}/Grass_1_B_Color1.gltf', 'height': 18},
        {'file': f'{FOREST}/Grass_1_D_Color1.gltf', 'height': 17},
        {'file': f'{FOREST}/Bush_1_A_Color1.gltf', 'height': 20},
        {'file': f'{FOREST}/Bush_2_A_Color1.gltf', 'height': 18},
    ]},
    'DECOR_PEBBLE': {'fit': 0.22, 'outline': 1.0, 'override': (0.55, 0.36, 0.20), 'variants': [
        {'file': f'{KENNEY}/rock_smallA.glb', 'height': 10},
        {'file': f'{KENNEY}/rock_smallFlatA.glb', 'height': 7},
        {'file': f'{KENNEY}/rock_smallC.glb', 'height': 11},
        {'file': f'{KENNEY}/stone_smallB.glb', 'height': 9},
    ]},
    'DECOR_ICE': {'fit': 0.24, 'outline': 1.0, 'variants': [
        {'prisms': 'ice_shards', 'seed': s, 'height': h} for s, h in ((21, 16), (22, 13), (23, 18), (24, 12))
    ]},
    'DECOR_RUBBLE': {'fit': 0.26, 'outline': 1.0, 'override': (0.022, 0.026, 0.05), 'variants': [
        {'file': f'{KENNEY}/rock_smallB.glb', 'height': 10},
        {'file': f'{KENNEY}/rock_smallG.glb', 'height': 9},
        {'file': f'{KENNEY}/stone_smallFlatA.glb', 'height': 7},
        {'file': f'{KENNEY}/rock_smallTopA.glb', 'height': 11},
    ]},
}

ICE_RGB = (0.62, 0.86, 1.0)
ICE_GLOW = (0.55, 0.85, 1.0)
OBSIDIAN_RGB = (0.035, 0.028, 0.045)  # linear; Standard view transform lifts it to ~#2a2430
OBSIDIAN_GLOW = (1.0, 0.36, 0.08)     # sRGB ~ (255,161,79): engine OBSTACLE_SPRITE.GLOW_KEYS.EMBER picks it up
VOID_RGB = (0.055, 0.04, 0.095)
VOID_GLOW = (0.5, 0.28, 1.0)          # sRGB ~ (188,145,255): GLOW_KEYS.VIOLET


def import_model(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def hex_prism(bm, x, y, r, h, tip, tilt_x, tilt_y, yaw):
    """Hexagonal crystal: 6-sided prism with a pointed tip, tilted, base at z = 0."""
    geom = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=r, depth=h)
    verts = geom['verts']
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, h / 2))
    top = [v for v in verts if v.co.z > h * 0.99]
    centre = bm.verts.new((0, 0, h + tip))
    # replace the top cap by a pyramid
    faces = [f for f in bm.faces if all(v in top for v in f.verts)]
    ring = sorted(top, key=lambda v: math.atan2(v.co.y, v.co.x))
    bmesh.ops.delete(bm, geom=faces, context='FACES_ONLY')
    for i in range(len(ring)):
        bm.faces.new((ring[i], ring[(i + 1) % len(ring)], centre))
    allv = verts + [centre]
    from mathutils import Matrix
    m = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(tilt_x, 4, 'X') @ Matrix.Rotation(tilt_y, 4, 'Y')
    bmesh.ops.transform(bm, matrix=m, verts=allv)


def basalt_column(bm, x, y, r, h, slant, slant_dir, tilt_x, tilt_y, z0=0.0, tip=0.0, squash=1.0):
    """Hex column, base at z0. slant tilts the flat top cap (broken basalt); tip > 0 turns the top into a point instead."""
    geom = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=r, depth=h)
    verts = geom['verts']
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, h / 2))
    top = [v for v in verts if v.co.z > h * 0.99]
    allv = list(verts)
    if tip > 0:
        centre = bm.verts.new((0, 0, h + tip))
        faces = [f for f in bm.faces if all(v in top for v in f.verts)]
        ring = sorted(top, key=lambda v: math.atan2(v.co.y, v.co.x))
        bmesh.ops.delete(bm, geom=faces, context='FACES_ONLY')
        for i in range(len(ring)):
            bm.faces.new((ring[i], ring[(i + 1) % len(ring)], centre))
        allv.append(centre)
    else:
        dx, dy = math.cos(slant_dir), math.sin(slant_dir)
        for v in top:
            v.co.z += (v.co.x * dx + v.co.y * dy) / max(r, 1e-6) * slant
    for v in allv:
        v.co.x *= squash
    from mathutils import Matrix
    m = Matrix.Translation((x, y, z0)) @ Matrix.Rotation(tilt_x, 4, 'X') @ Matrix.Rotation(tilt_y, 4, 'Y')
    bmesh.ops.transform(bm, matrix=m, verts=allv)


def glow_mask_material(mat, base_rgb, glow_rgb, kind):
    """toon() body, then mix in glow_rgb where a procedural mask (object space) is 1: lava cracks / void veins."""
    toon(mat, base_rgb=base_rgb)
    nt = mat.node_tree
    emit = next(n for n in nt.nodes if n.type == 'EMISSION')
    link = emit.inputs['Color'].links[0]
    color = link.from_socket
    nt.links.remove(link)

    def node(t, **kw):
        n = nt.nodes.new(t)
        for k, v in kw.items():
            setattr(n, k, v)
        return n

    def map_range(src, a, b, c, d):
        m = node('ShaderNodeMapRange', clamp=True)
        nt.links.new(src, m.inputs['Value'])
        m.inputs['From Min'].default_value, m.inputs['From Max'].default_value = a, b
        m.inputs['To Min'].default_value, m.inputs['To Max'].default_value = c, d
        return m.outputs['Result']

    def math_op(op, x, y):
        m = node('ShaderNodeMath', operation=op)
        nt.links.new(x, m.inputs[0])
        nt.links.new(y, m.inputs[1])
        return m.outputs['Value']

    tc = node('ShaderNodeTexCoord')
    sep = node('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    vor = node('ShaderNodeTexVoronoi', voronoi_dimensions='3D', feature='DISTANCE_TO_EDGE')
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    noise = node('ShaderNodeTexNoise')
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    if kind == 'obsidian':
        vor.inputs['Scale'].default_value = 3.0
        noise.inputs['Scale'].default_value = 1.6
        crack = map_range(vor.outputs['Distance'], 0.0, 0.045, 1.0, 0.0)
        patch = map_range(noise.outputs['Fac'], 0.45, 0.55, 0.0, 1.0)
        fall = map_range(sep.outputs['Z'], 0.25, 1.1, 1.0, 0.0)   # cracks only in the lower part; upper column stays clean
        veins = math_op('MULTIPLY', math_op('MULTIPLY', crack, patch), fall)
        band = map_range(sep.outputs['Z'], 0.0, 0.2, 1.0, 0.0)
        mask = math_op('MAXIMUM', veins, band)
    else:
        vor.inputs['Scale'].default_value = 4.5
        noise.inputs['Scale'].default_value = 2.2
        crack = map_range(vor.outputs['Distance'], 0.0, 0.03, 1.0, 0.0)
        patch = map_range(noise.outputs['Fac'], 0.52, 0.6, 0.0, 1.0)
        above = map_range(sep.outputs['Z'], 0.1, 0.14, 0.0, 1.0)   # veins only on the floating crystals
        veins = math_op('MULTIPLY', math_op('MULTIPLY', crack, patch), above)
        comb = node('ShaderNodeCombineXYZ')
        nt.links.new(sep.outputs['X'], comb.inputs['X'])
        nt.links.new(sep.outputs['Y'], comb.inputs['Y'])
        ln = node('ShaderNodeVectorMath', operation='LENGTH')
        nt.links.new(comb.outputs['Vector'], ln.inputs[0])
        d = ln.outputs['Value']
        ring = math_op('MULTIPLY', map_range(d, 0.28, 0.31, 0.0, 1.0), map_range(d, 0.35, 0.38, 1.0, 0.0))
        on_plinth_top = math_op('MULTIPLY', map_range(sep.outputs['Z'], 0.05, 0.07, 0.0, 1.0), map_range(sep.outputs['Z'], 0.09, 0.11, 1.0, 0.0))
        mask = math_op('MAXIMUM', veins, math_op('MULTIPLY', ring, on_plinth_top))
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MIX'
    nt.links.new(mask, mix.inputs['Factor'])
    nt.links.new(color, mix.inputs['A'])
    mix.inputs['B'].default_value = (*glow_rgb, 1)
    nt.links.new(mix.outputs['Result'], emit.inputs['Color'])


def build_prisms(kind, seed):
    rnd = random.Random(seed)
    mesh = bpy.data.meshes.new(f'{kind}_{seed}')
    bm = bmesh.new()
    if kind == 'ice':
        # one tall core + 4..6 leaning shards
        hex_prism(bm, 0, 0, 0.26, 1.6 + rnd.random() * 0.4, 0.42, rnd.uniform(-0.08, 0.08), rnd.uniform(-0.08, 0.08), rnd.random())
        for i in range(rnd.randint(4, 6)):
            a = i / 5 * math.tau + rnd.uniform(-0.4, 0.4)
            d = rnd.uniform(0.28, 0.5)
            hex_prism(bm, math.cos(a) * d, math.sin(a) * d, rnd.uniform(0.11, 0.19), rnd.uniform(0.55, 1.15), rnd.uniform(0.2, 0.32),
                      math.sin(a) * rnd.uniform(0.25, 0.55) * -1, math.cos(a) * rnd.uniform(0.25, 0.55), rnd.random())
    elif kind == 'ice_shards':
        # 2..4 small leaning shards (non-blocking ground decor)
        for i in range(rnd.randint(2, 4)):
            a = i / 3 * math.tau + rnd.uniform(-0.5, 0.5)
            d = 0 if i == 0 else rnd.uniform(0.25, 0.45)
            hex_prism(bm, math.cos(a) * d, math.sin(a) * d, rnd.uniform(0.12, 0.2), rnd.uniform(0.5, 1.0), rnd.uniform(0.18, 0.3),
                      math.sin(a) * rnd.uniform(0.2, 0.6) * -1, math.cos(a) * rnd.uniform(0.2, 0.6), rnd.random())
    elif kind == 'void_monolith':
        # rune plinth on the ground + one floating crystal slab + 2..3 orbiting shards
        basalt_column(bm, 0, 0, 0.5, 0.08, 0, 0, 0, 0)
        gap = rnd.uniform(0.36, 0.44)
        hgt = rnd.uniform(1.25, 1.55)
        basalt_column(bm, 0, 0, rnd.uniform(0.2, 0.24), hgt, 0, 0, rnd.uniform(-0.06, 0.06), rnd.uniform(-0.06, 0.06),
                      z0=0.08 + gap, tip=rnd.uniform(0.3, 0.42), squash=0.78)
        for i in range(rnd.randint(2, 3)):
            a = i / 3 * math.tau + rnd.uniform(-0.5, 0.5)
            d = rnd.uniform(0.36, 0.44)
            basalt_column(bm, math.cos(a) * d, math.sin(a) * d, rnd.uniform(0.05, 0.08), rnd.uniform(0.16, 0.26), 0, 0,
                          rnd.uniform(-0.7, 0.7), rnd.uniform(-0.7, 0.7), z0=0.08 + gap + rnd.uniform(0.2, hgt * 0.8), tip=0.08)
    else:
        # obsidian: 3..4 thick basalt columns, slanted broken tops, slight outward lean
        n = rnd.randint(3, 4)
        basalt_column(bm, 0, 0, 0.3, 2.3, rnd.uniform(0.12, 0.22), rnd.random() * math.tau, rnd.uniform(-0.03, 0.03), rnd.uniform(-0.03, 0.03))
        for i in range(n - 1):
            a = i / (n - 1) * math.tau + rnd.uniform(-0.4, 0.4)
            d = rnd.uniform(0.36, 0.44)
            lean = rnd.uniform(0.05, 0.12)
            basalt_column(bm, math.cos(a) * d, math.sin(a) * d, rnd.uniform(0.2, 0.27), rnd.uniform(0.9, 1.7),
                          rnd.uniform(0.1, 0.25), rnd.random() * math.tau, -math.sin(a) * lean, math.cos(a) * lean)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = False
    return [obj], kind


def render_variant(type_id, cfg, idx, v):
    reset()
    up = setup_scene(cfg.get('outline', OUTLINE_PX))
    if 'prisms' in v:
        objs, kind = build_prisms(v['prisms'], v['seed'])
        mat = bpy.data.materials.new(kind)
        if kind in ('ice', 'ice_shards'):
            toon(mat, base_rgb=ICE_RGB, emission=ICE_GLOW, emission_strength=0.18)
        elif kind == 'void_monolith':
            glow_mask_material(mat, VOID_RGB, VOID_GLOW, 'void')
        else:
            glow_mask_material(mat, OBSIDIAN_RGB, OBSIDIAN_GLOW, 'obsidian')
        for o in objs:
            o.data.materials.append(mat)
    else:
        objs = import_model(v['file'])
        for o in objs:
            for slot in o.material_slots:
                if slot.material:
                    slot.material = slot.material.copy()
                    toon(slot.material, base_rgb=v.get('override', cfg.get('override')), tint=None if 'override' in v else cfg.get('tint'))
    info = normalise(objs, cfg['fit'], v['height'], up, v.get('xy', 1.0))
    path = os.path.join(OUT, f'{type_id}_{idx}.png')
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return {'file': os.path.basename(path), **info, 'source': os.path.basename(v.get('file', f"prisms:{v.get('prisms')}:{v.get('seed')}"))}


os.makedirs(OUT, exist_ok=True)
meta = {'pxPerHex': PX_PER_HEX, 'anchor': list(ANCHOR), 'res': [RES_X, RES_Y], 'elevationDeg': ELEVATION_DEG, 'types': {}}
meta_path = os.path.join(OUT, 'meta.json')
if os.path.exists(meta_path):
    with open(meta_path) as f:
        meta['types'] = json.load(f).get('types', {})
for type_id, cfg in TYPES.items():
    if ONLY and type_id not in ONLY:
        continue
    meta['types'][type_id] = [render_variant(type_id, cfg, i, v) for i, v in enumerate(cfg['variants'])]
with open(meta_path, 'w') as f:
    json.dump(meta, f, indent=1)
print('OBSTACLES_DONE', json.dumps({k: [round(x['scale'], 3) for x in vs] for k, vs in meta['types'].items()}))
