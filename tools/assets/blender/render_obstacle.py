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

argv = sys.argv[sys.argv.index('--') + 1:]
ASSETS, OUT = argv[0], argv[1]
ONLY = set(argv[2:])

PX_PER_HEX = 96          # engine HEX_SIZE 48 -> sprites baked at 2x canvas units
HEX_SIZE_CANVAS = 48.0
RES_X, RES_Y = 256, 448
ANCHOR = (128, 392)      # pixel of the world origin (cell centre on the ground)
ELEVATION_DEG = 30.0
OUTLINE_RGB = (0.07, 0.05, 0.05)
OUTLINE_PX = 2.0

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
    'WALL': {'fit': 0.78, 'tint': (0.78, 0.82, 1.05), 'variants': [
        {'file': f'{DUNGEON}/pillar.gltf.glb', 'height': 96, 'xy': 1.5},
        {'file': f'{DUNGEON}/column.gltf.glb', 'height': 92},
        {'file': f'{KENNEY}/statue_column.glb', 'height': 96, 'xy': 1.4, 'override': (0.33, 0.35, 0.47)},
        {'file': f'{KENNEY}/statue_obelisk.glb', 'height': 108, 'xy': 1.2, 'override': (0.33, 0.35, 0.47)},
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
    'OBSIDIAN_PILLAR': {'fit': 0.76, 'variants': [
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
OBSIDIAN_GLOW = (1.0, 0.36, 0.08)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def toon(mat, base_rgb=None, tint=None, emission=None, emission_strength=0.0):
    """Same 3-band toon ramp as render_unit.py; optional additive emission (crystal glow, obsidian cracks)."""
    mat.use_nodes = True
    nt = mat.node_tree
    src = None
    rgb = (0.8, 0.8, 0.8, 1)
    for n in nt.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            inp = n.inputs['Base Color']
            if inp.links:
                src = inp.links[0].from_socket
            rgb = tuple(inp.default_value)
    for n in list(nt.nodes):
        if n.type != 'TEX_IMAGE':
            nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    emit = nt.nodes.new('ShaderNodeEmission')
    diff = nt.nodes.new('ShaderNodeBsdfDiffuse')
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    mul = nt.nodes.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.50, 0.50, 0.58, 1)
    ramp.color_ramp.elements.new(0.38).color = (0.80, 0.80, 0.82, 1)
    ramp.color_ramp.elements.new(0.72).color = (1.0, 1.0, 1.0, 1)
    nt.links.new(diff.outputs['BSDF'], s2r.inputs['Shader'])
    nt.links.new(s2r.outputs['Color'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mul.inputs['A'])
    if base_rgb is not None:
        mul.inputs['B'].default_value = (*base_rgb, 1)
    elif src is not None:
        if tint is not None:
            t = nt.nodes.new('ShaderNodeMix')
            t.data_type = 'RGBA'
            t.blend_type = 'MULTIPLY'
            t.inputs['Factor'].default_value = 1.0
            t.inputs['B'].default_value = (*tint, 1)
            nt.links.new(src, t.inputs['A'])
            nt.links.new(t.outputs['Result'], mul.inputs['B'])
        else:
            nt.links.new(src, mul.inputs['B'])
    else:
        c = rgb[:3] if tint is None else tuple(rgb[i] * tint[i] for i in range(3))
        mul.inputs['B'].default_value = (*c, 1)
    color = mul.outputs['Result']
    if emission is not None and emission_strength > 0:
        add = nt.nodes.new('ShaderNodeMix')
        add.data_type = 'RGBA'
        add.blend_type = 'ADD'
        add.inputs['Factor'].default_value = emission_strength
        nt.links.new(color, add.inputs['A'])
        add.inputs['B'].default_value = (*emission, 1)
        color = add.outputs['Result']
    nt.links.new(color, emit.inputs['Color'])
    nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])


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
    else:
        # basalt column group: 5..7 upright hex columns of stepped heights, flat-ish tops
        cols = [(0, 0)] + [(math.cos(i / 6 * math.tau) * 0.36, math.sin(i / 6 * math.tau) * 0.36) for i in range(6)]
        rnd.shuffle(cols)
        for i, (x, y) in enumerate(cols[:rnd.randint(5, 7)]):
            h = (2.4 if i == 0 else rnd.uniform(1.0, 2.1))
            hex_prism(bm, x, y, 0.21, h, rnd.uniform(0.02, 0.12), rnd.uniform(-0.04, 0.04), rnd.uniform(-0.04, 0.04), 0)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = False
    return [obj], kind


def setup_scene(outline_px=OUTLINE_PX):
    scene = bpy.context.scene
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = 3.0
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = max(RES_X, RES_Y) / PX_PER_HEX
    scene.collection.objects.link(cam)
    el = math.radians(ELEVATION_DEG)
    look = Vector((0, math.cos(el), -math.sin(el)))
    up = Vector((0, math.sin(el), math.cos(el)))
    right = Vector((1, 0, 0))
    # put the world origin at pixel ANCHOR: camera centre sits that far from the origin in screen space
    dx = (RES_X / 2 - ANCHOR[0]) / PX_PER_HEX
    dy = (ANCHOR[1] - RES_Y / 2) / PX_PER_HEX
    cam.location = -look * 20 + up * dy + right * dx
    cam.rotation_euler = (math.radians(90.0 - ELEVATION_DEG), 0, 0)
    scene.camera = cam
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = RES_X, RES_Y
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.render.use_freestyle = True
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    for old in list(vl.freestyle_settings.linesets):
        vl.freestyle_settings.linesets.remove(old)
    ls = vl.freestyle_settings.linesets.new('outline')
    ls.linestyle = bpy.data.linestyles.new('outline_style')
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = True
    ls.linestyle.color = OUTLINE_RGB
    ls.linestyle.thickness = outline_px * PX_PER_HEX / 96.0
    scene.render.line_thickness_mode = 'ABSOLUTE'
    return up


def normalise(objs, fit, height_canvas, up, xy=1.0):
    """Centre the footprint on the origin, base at z = 0, scale to the footprint radius and projected height."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    minz = min(p.z for p in pts)
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2
    cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
    root = bpy.data.objects.new('root', None)
    bpy.context.scene.collection.objects.link(root)
    tops = set()
    for o in objs:
        while o.parent is not None:
            o = o.parent
        tops.add(o)
    for o in tops:
        o.parent = root
    root.location = (-cx, -cy, -minz)
    bpy.context.view_layer.update()
    verts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    radius = max(math.hypot(v.x, v.y) for v in verts)
    zmax = max(v.z for v in verts)
    # projected screen height above the ground origin, in hex units (vertical extent seen by the camera)
    proj = max(v.dot(up) for v in verts)
    s_fit = fit / radius
    s_h = (height_canvas / HEX_SIZE_CANVAS) / proj
    s = min(s_fit, s_h)
    holder = bpy.data.objects.new('holder', None)
    bpy.context.scene.collection.objects.link(holder)
    root.parent = holder
    holder.scale = (s * xy, s * xy, s)
    bpy.context.view_layer.update()
    return {'scale': s, 'fitLimited': s_fit < s_h, 'radius': radius * s * xy, 'heightHex': zmax * s}


def render_variant(type_id, cfg, idx, v):
    reset()
    up = setup_scene(cfg.get('outline', OUTLINE_PX))
    if 'prisms' in v:
        objs, kind = build_prisms(v['prisms'], v['seed'])
        mat = bpy.data.materials.new(kind)
        if kind in ('ice', 'ice_shards'):
            toon(mat, base_rgb=ICE_RGB, emission=ICE_GLOW, emission_strength=0.18)
        else:
            toon(mat, base_rgb=OBSIDIAN_RGB)
        for o in objs:
            o.data.materials.append(mat)
        if kind == 'obsidian':
            # glowing crack band near the base of each column (magma light)
            glow = bpy.data.materials.new('obsidian_glow')
            toon(glow, base_rgb=OBSIDIAN_GLOW, emission=OBSIDIAN_GLOW, emission_strength=0.6)
            for o in objs:
                o.data.materials.append(glow)
                for p in o.data.polygons:
                    zs = [o.data.vertices[i].co.z for i in p.vertices]
                    if p.normal.z > 0.5 and max(zs) > 0.5:
                        p.material_index = 1
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
