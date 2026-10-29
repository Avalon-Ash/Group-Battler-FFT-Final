"""CC body renderer (status visual normalisation): scripted low-poly models -> toon-shaded PNG, 4 native directions.

Usage: blender -b -P render_cc_body.py -- <out_dir> [TYPE ...]
  TYPE = SHEEP | ICE_BLOCK (default: both)
Camera, light, outline, toon ramp: shared with render_obstacle.py / render_unit.py through bake_common.py
(orthographic, elevation 30deg = engine ISO_SCALE_Y 0.5, sun from upper left, 2 px dark outline).
Directions are native renders, same convention as render_unit.py: model yaw SE +45 / SW -45 / NE +135 / NW -135 deg.
The models face -Y at yaw 0 (like the KayKit rigs), are built around the foot centre (origin) and stand on z = 0, so
the world origin (= pixel ANCHOR) is the cell centre on the ground and every direction shares one pivot and one scale.
Output: <out_dir>/<type>_<DIR>.png (+ sheep_collar_<DIR>.png: white where the collar is visible, runtime tints it per
faction) and meta.json. pack_cc_body.py trims and packs them into WebP atlases.
"""
import bpy, bmesh, sys, math, os, json, random
from mathutils import Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common
from bake_common import ELEVATION_DEG, reset, toon, setup_scene

# CC bodies are small and shown at close zoom: bake at 2x the obstacle density (outline thickness scales with it).
bake_common.PX_PER_HEX = PX_PER_HEX = 192
bake_common.RES_X, bake_common.RES_Y = RES_X, RES_Y = 384, 512
bake_common.ANCHOR = ANCHOR = (192, 410)

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
ONLY = set(argv[1:])
DIRS = {'SE': 45.0, 'SW': -45.0, 'NE': 135.0, 'NW': -135.0}


def lin(hex_rgb):
    """sRGB hex string -> linear tuple (toon() takes linear values; the Standard view transform lifts them back)."""
    c = [int(hex_rgb[i:i + 2], 16) / 255.0 for i in (1, 3, 5)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


# ---------------------------------------------------------------- mesh helpers (hex units, z up, model faces -Y)
def blob(bm, c, r, subdiv=1, seed=0, jitter=0.0):
    """Faceted ellipsoid: icosphere scaled by r=(rx, ry, rz) around c, optional radial jitter for a lumpy wool look."""
    rnd = random.Random(seed)
    geom = bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    for v in geom['verts']:
        k = 1.0 + (rnd.uniform(-jitter, jitter) if jitter else 0.0)
        v.co.x = c[0] + v.co.x * r[0] * k
        v.co.y = c[1] + v.co.y * r[1] * k
        v.co.z = c[2] + v.co.z * r[2] * k


def prism(bm, c, r_bottom, r_top, h, segments=8, rot=None):
    """Capped cone/cylinder from c (bottom centre) upwards by h; rot = Matrix applied around c."""
    geom = bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r_bottom, radius2=r_top, depth=h)
    verts = geom['verts']
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, h / 2))
    if rot is not None:
        bmesh.ops.transform(bm, matrix=rot, verts=verts)
    bmesh.ops.translate(bm, verts=verts, vec=c)


def quad(bm, a, b, c, d):
    bm.faces.new([bm.verts.new(p) for p in (a, b, c, d)])


def make_object(name, bm, mat):
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = False
    obj.data.materials.append(mat)
    return obj


def toon_mat(name, srgb):
    mat = bpy.data.materials.new(name)
    toon(mat, base_rgb=lin(srgb))
    return mat


def translucent_mat(name, srgb, alpha, glow=None, glow_strength=0.0):
    """toon() body mixed with a transparent shader: alpha = opacity of the faces."""
    mat = bpy.data.materials.new(name)
    toon(mat, base_rgb=lin(srgb), emission=lin(glow) if glow else None, emission_strength=glow_strength)
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    link = out.inputs['Surface'].links[0]
    shader = link.from_socket
    nt.links.remove(link)
    clear = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = alpha
    nt.links.new(clear.outputs['BSDF'], mix.inputs[1])
    nt.links.new(shader, mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    else:
        mat.blend_method = 'BLEND'
    if hasattr(mat, 'use_backface_culling'):
        mat.use_backface_culling = False
    return mat


# ---------------------------------------------------------------- SHEEP
SHEEP_SKIN = '#3a3350'
SHEEP_SKIN_LIGHT = '#6a5f8c'
SHEEP_HOOF = '#171425'
SHEEP_WOOL = '#f4f6fb'
SHEEP_EAR_INNER = '#f9a8d4'
SHEEP_COLLAR = '#ffffff'

# fluffy wool lumps: (x, y, z, radius); the body ellipsoid underneath fills the gaps. Smooth shaded -> clean toon bands.
WOOL_LUMPS = [
    (0.22, -0.12, 0.56, 0.21), (-0.22, -0.12, 0.56, 0.21),
    (0.23, 0.18, 0.54, 0.21), (-0.23, 0.18, 0.54, 0.21),
    (0.0, -0.06, 0.80, 0.23), (0.0, 0.22, 0.78, 0.22),
    (0.0, 0.46, 0.56, 0.17),
    (0.0, -0.30, 0.64, 0.17),
]
LEG_XY = [(0.16, -0.22), (-0.16, -0.22), (0.16, 0.28), (-0.16, 0.28)]


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def build_sheep():
    mats = {
        'wool': toon_mat('wool', SHEEP_WOOL),
        'skin': toon_mat('skin', SHEEP_SKIN),
        'skin_light': toon_mat('skin_light', SHEEP_SKIN_LIGHT),
        'hoof': toon_mat('hoof', SHEEP_HOOF),
        'ear': toon_mat('ear', SHEEP_EAR_INNER),
        'eye': toon_mat('eye', '#ffffff'),
        'pupil': toon_mat('pupil', '#14101f'),
        'collar': toon_mat('collar', SHEEP_COLLAR),
    }
    parts = {k: bmesh.new() for k in mats}
    blob(parts['wool'], (0.0, 0.08, 0.56), (0.32, 0.46, 0.30), subdiv=2)
    for i, (x, y, z, r) in enumerate(WOOL_LUMPS):
        blob(parts['wool'], (x, y, z), (r, r, r), subdiv=2, seed=100 + i, jitter=0.05)
    blob(parts['wool'], (0.0, -0.58, 0.80), (0.12, 0.10, 0.09), subdiv=2, seed=7, jitter=0.05)  # forehead tuft
    for x, y in LEG_XY:
        prism(parts['skin'], (x, y, 0.07), 0.07, 0.085, 0.30, segments=6)
        prism(parts['hoof'], (x, y, 0.0), 0.08, 0.074, 0.10, segments=6)
    blob(parts['skin'], (0.0, -0.60, 0.60), (0.16, 0.20, 0.18), subdiv=2)
    blob(parts['skin_light'], (0.0, -0.77, 0.55), (0.09, 0.085, 0.075), subdiv=1)
    for sx in (1, -1):
        blob(parts['skin'], (sx * 0.21, -0.54, 0.63), (0.12, 0.05, 0.07), subdiv=1)
        blob(parts['ear'], (sx * 0.21, -0.575, 0.63), (0.08, 0.025, 0.045), subdiv=1)
        blob(parts['eye'], (sx * 0.10, -0.72, 0.67), (0.04, 0.04, 0.04), subdiv=1)
        blob(parts['pupil'], (sx * 0.108, -0.752, 0.672), (0.022, 0.022, 0.022), subdiv=1)
    blob(parts['pupil'], (0.0, -0.85, 0.57), (0.03, 0.024, 0.024), subdiv=1)
    # collar: wide band around the neck (axis along y), sitting in front of the chest, behind the head
    rot = Matrix.Rotation(math.radians(90 + 6), 4, 'X')
    prism(parts['collar'], (0.0, -0.44, 0.58), 0.26, 0.26, 0.10, segments=14, rot=rot)
    objs = [make_object(k, parts[k], mats[k]) for k in mats]
    smooth(objs[0])
    for o in objs:
        if o.name in ('skin', 'skin_light', 'collar'):
            smooth(o)
    return objs, 'collar'


# ---------------------------------------------------------------- ICE BLOCK
ICE_R = 0.50          # corner radius of the cage (hex units)
ICE_H = 1.25          # cage height
ICE_POST = '#9bd8f5'
ICE_PANEL = '#b8e8ff'
ICE_SHARD = '#d6f3ff'
ICE_GLOW = '#8fe3ff'


def build_ice():
    posts = bmesh.new()
    panels = bmesh.new()
    caps = bmesh.new()
    shards = bmesh.new()
    corners = [(ICE_R * math.cos(math.pi / 3 * i), ICE_R * math.sin(math.pi / 3 * i)) for i in range(6)]
    for i, (x, y) in enumerate(corners):
        prism(posts, (x, y, 0.0), 0.075, 0.075, ICE_H, segments=6)
        # crown spike over each post
        prism(shards, (x, y, ICE_H), 0.075, 0.0, 0.16, segments=6)
        # foot block at the base of each post
        prism(posts, (x, y, 0.0), 0.11, 0.09, 0.10, segments=6)
        nx, ny = corners[(i + 1) % 6]
        quad(panels, (x, y, 0.10), (nx, ny, 0.10), (nx, ny, ICE_H), (x, y, ICE_H))
    # base slab and top plate (hexagonal discs)
    prism(caps, (0.0, 0.0, 0.0), ICE_R, ICE_R, 0.08, segments=6)
    prism(caps, (0.0, 0.0, ICE_H - 0.02), ICE_R * 0.97, ICE_R * 0.97, 0.06, segments=6)
    # frozen crystals jutting up inside the cage (they sit behind/beside the unit)
    for i, (a, d, h) in enumerate(((20, 0.30, 0.42), (95, 0.33, 0.30), (170, 0.28, 0.46), (245, 0.32, 0.34), (310, 0.30, 0.40))):
        ang = math.radians(a)
        tilt = Matrix.Rotation(0.22, 4, 'X') @ Matrix.Rotation(0.2 * math.sin(i), 4, 'Y')
        prism(shards, (math.cos(ang) * d, math.sin(ang) * d, 0.06), 0.07, 0.0, h, segments=6, rot=tilt)
    return [
        make_object('posts', posts, translucent_mat('ice_post', ICE_POST, 0.85, ICE_GLOW, 0.18)),
        make_object('panels', panels, translucent_mat('ice_panel', ICE_PANEL, 0.3, ICE_GLOW, 0.22)),
        make_object('caps', caps, translucent_mat('ice_cap', ICE_PANEL, 0.45, ICE_GLOW, 0.2)),
        make_object('shards', shards, translucent_mat('ice_shard', ICE_SHARD, 0.7, ICE_GLOW, 0.25)),
    ], None


TYPES = {'SHEEP': build_sheep, 'ICE_BLOCK': build_ice}


def render_direction(type_id, dname, yaw):
    reset()
    setup_scene()
    objs, mask_name = TYPES[type_id]()
    for o in objs:
        o.rotation_euler[2] = math.radians(yaw)
    bpy.context.view_layer.update()
    scene = bpy.context.scene
    path = os.path.join(OUT, f'{type_id.lower()}_{dname}.png')
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    info = {'dir': dname, 'file': os.path.basename(path)}
    if mask_name:
        # faction mask: everything except the collar becomes a holdout (still occludes it), collar = flat white emission
        mpath = os.path.join(OUT, f'{type_id.lower()}_{mask_name}_{dname}.png')
        for o in objs:
            if o.name == mask_name:
                mat = bpy.data.materials.new('mask')
                mat.use_nodes = True
                nt = mat.node_tree
                for n in list(nt.nodes):
                    nt.nodes.remove(n)
                emit = nt.nodes.new('ShaderNodeEmission')
                emit.inputs['Color'].default_value = (1, 1, 1, 1)
                out = nt.nodes.new('ShaderNodeOutputMaterial')
                nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])
                o.data.materials.clear()
                o.data.materials.append(mat)
            else:
                o.is_holdout = True
        scene.render.use_freestyle = False
        scene.view_layers[0].use_freestyle = False
        scene.render.filepath = mpath
        bpy.ops.render.render(write_still=True)
        info['maskFile'] = os.path.basename(mpath)
    zmax = max(v.co.z for o in objs for v in o.data.vertices)
    info['heightHex'] = round(zmax, 3)
    return info


os.makedirs(OUT, exist_ok=True)
meta = {'pxPerHex': PX_PER_HEX, 'anchor': list(ANCHOR), 'res': [RES_X, RES_Y], 'elevationDeg': ELEVATION_DEG, 'types': {}}
meta_path = os.path.join(OUT, 'meta.json')
if os.path.exists(meta_path):
    with open(meta_path) as f:
        meta['types'] = json.load(f).get('types', {})
for type_id in TYPES:
    if ONLY and type_id not in ONLY:
        continue
    meta['types'][type_id] = [render_direction(type_id, d, yaw) for d, yaw in DIRS.items()]
with open(meta_path, 'w') as f:
    json.dump(meta, f, indent=1)
print('CC_BODY_DONE', json.dumps({k: [x['heightHex'] for x in v] for k, v in meta['types'].items()}))
