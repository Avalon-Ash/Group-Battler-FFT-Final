"""Production sprite renderer: KayKit character -> 4 native directions x animations, toon shaded, PNG frames.

Usage: blender -b -P render_unit.py -- <characters_dir> <out_root> <TEAM> <ROLE> [res]
  TEAM = BLUE | RED ; ROLE = TANK | WARRIOR | RANGER | MAGE | SUPPORT
Optional trial: --skin lionheart-warrior|lionheart-roles|ashen-roles --body MALE|FEMALE --idle-only --save-blend --padding 96
Use Blender --python-exit-code 1 so script exceptions produce a failure status.
Camera: orthographic, elevation 30deg (engine ISO_SCALE_Y = 0.5 = sin 30deg).
Directions are native renders (no mirror): SE/SW/NE/NW = model yaw +45/-45/+135/-135 deg.
Without padding, feet project to (RES/2, RES*(0.5+SHIFT_Y)); padding adds equally to both axes.
render-meta.json records the expanded anchor for explicit use by pack_sprites.py.
"""
import bpy, sys, math, os, argparse, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
CHAR_DIR, OUT_ROOT, TEAM, ROLE = argv[0], argv[1], argv[2], argv[3]
# Blender resolves relative render paths differently after saving a .blend.
OUT_ROOT = os.path.abspath(OUT_ROOT)
RES = int(argv[4]) if len(argv) > 4 and not argv[4].startswith('--') else 256
option_start = 5 if len(argv) > 4 and not argv[4].startswith('--') else 4
parser = argparse.ArgumentParser()
parser.add_argument('--skin', choices=['lionheart-warrior', 'lionheart-roles', 'ashen-roles'])
parser.add_argument('--body', choices=['MALE','FEMALE'], default='MALE')
parser.add_argument('--idle-only', action='store_true')
parser.add_argument('--save-blend', action='store_true')
parser.add_argument('--padding', type=int, default=0, help='Extra pixels per edge; preserves pixels/world and outline size')
args = parser.parse_args(argv[option_start:])
if args.padding < 0 or RES <= 0:
    parser.error('Resolution must be positive and padding nonnegative')
CANVAS = RES + 2 * args.padding
if args.skin == 'lionheart-warrior' and (TEAM != 'BLUE' or ROLE != 'WARRIOR'):
    raise ValueError('lionheart-warrior skin requires BLUE WARRIOR')
if args.skin == 'lionheart-roles' and (TEAM != 'BLUE' or ROLE not in ('TANK', 'RANGER', 'MAGE', 'SUPPORT')):
    raise ValueError('lionheart-roles skin requires BLUE TANK/RANGER/MAGE/SUPPORT')
if args.skin == 'ashen-roles' and (TEAM != 'RED' or ROLE not in ('TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT')):
    raise ValueError('ashen-roles skin requires RED TANK/WARRIOR/RANGER/MAGE/SUPPORT')
os.makedirs(OUT_ROOT, exist_ok=True)

ELEVATION_DEG = 30.0
ORTHO_SCALE = 3.6
SHIFT_Y = 0.22
OUTLINE_RGB = (0.07, 0.04, 0.03)
OUTLINE_PX = 2.0
DIRS = {'SE': 45.0, 'SW': -45.0, 'NE': 135.0, 'NW': -135.0}

# frames sampled evenly over the clip; loop=True excludes the end frame (seamless loops)
ANIM_FRAMES = {'idle': (6, True), 'walk': (6, True), 'attack': (6, False),
               'cast': (6, False), 'hit': (3, False), 'death': (6, False)}

FACTION = {
    'BLUE': {'cloth': (0.06, 0.16, 0.46), 'armor': (0.92, 0.96, 1.08), 'robe_support': (1.55, 1.50, 1.35)},
    'RED':  {'cloth': (0.42, 0.04, 0.03), 'armor': (0.62, 0.54, 0.52), 'robe_support': (0.75, 0.60, 0.55)},
}

ROLE_CFG = {
    'TANK': {
        'glb': 'Knight.glb',
        'show': ['Knight_ArmLeft', 'Knight_ArmRight', 'Knight_Body', 'Knight_Cape', 'Knight_Head',
                 'Knight_Helmet', 'Knight_LegLeft', 'Knight_LegRight', '1H_Sword', 'Badge_Shield'],
        'cloth': ['Knight_Cape'], 'support_robe': [],
        'anims': {'idle': 'Idle', 'walk': 'Walking_A', 'attack': '1H_Melee_Attack_Slice_Diagonal',
                  'hit': 'Hit_A', 'death': 'Death_A'},
    },
    'WARRIOR': {
        'glb': 'Barbarian.glb',
        'show': ['Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_Body', 'Barbarian_Cape', 'Barbarian_Hat',
                 'Barbarian_Head', 'Barbarian_LegLeft', 'Barbarian_LegRight', '2H_Axe'],
        'cloth': ['Barbarian_Cape'], 'support_robe': [],
        'anims': {'idle': '2H_Melee_Idle', 'walk': 'Walking_A', 'attack': '2H_Melee_Attack_Slice',
                  'hit': 'Hit_A', 'death': 'Death_B'},
    },
    'RANGER': {
        'glb': 'Rogue_Hooded.glb',
        'show': ['Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_Body', 'Rogue_Cape', 'Rogue_Head_Hooded',
                 'Rogue_LegLeft', 'Rogue_LegRight', '2H_Crossbow'],
        'cloth': ['Rogue_Cape'], 'support_robe': [],
        'anims': {'idle': 'Idle', 'walk': 'Walking_A', 'attack': '2H_Ranged_Shoot',
                  'hit': 'Hit_A', 'death': 'Death_A'},
    },
    'MAGE': {
        'glb': 'Mage.glb',
        'show': ['Mage_ArmLeft', 'Mage_ArmRight', 'Mage_Body', 'Mage_Cape', 'Mage_Hat', 'Mage_Head',
                 'Mage_LegLeft', 'Mage_LegRight', '2H_Staff'],
        'cloth': ['Mage_Cape', 'Mage_Hat'], 'support_robe': [],
        'anims': {'idle': 'Idle', 'walk': 'Walking_A', 'attack': 'Spellcast_Shoot', 'cast': 'Spellcasting',
                  'hit': 'Hit_A', 'death': 'Death_A'},
    },
    'SUPPORT': {
        'glb': 'Mage.glb',
        'show': ['Mage_ArmLeft', 'Mage_ArmRight', 'Mage_Body', 'Mage_Cape', 'Mage_Head',
                 'Mage_LegLeft', 'Mage_LegRight', '1H_Wand', 'Spellbook'],
        'cloth': ['Mage_Cape'], 'support_robe': ['Mage_Body', 'Mage_ArmLeft', 'Mage_ArmRight'],
        'anims': {'idle': 'Idle', 'walk': 'Walking_A', 'attack': '1H_Ranged_Shoot', 'cast': 'Spellcast_Raise',
                  'hit': 'Hit_A', 'death': 'Death_A'},
    },
}

cfg = ROLE_CFG[ROLE]
pal = FACTION[TEAM]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(CHAR_DIR, cfg['glb']))
scene = bpy.context.scene
rig = bpy.data.objects['Rig']

show = set(cfg['show'])
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name not in show:
        o.hide_render = True
        o.hide_viewport = True


def toon_material(mat, override_rgb=None, tint_rgb=None):
    mat.use_nodes = True
    nt = mat.node_tree
    base_src = None
    base_rgb = (0.8, 0.8, 0.8, 1)
    for n in nt.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            inp = n.inputs['Base Color']
            if inp.links:
                base_src = inp.links[0].from_socket
            base_rgb = tuple(inp.default_value)
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
    e1 = ramp.color_ramp.elements.new(0.38)
    e1.color = (0.80, 0.80, 0.82, 1)
    e2 = ramp.color_ramp.elements.new(0.72)
    e2.color = (1.0, 1.0, 1.0, 1)
    nt.links.new(diff.outputs['BSDF'], s2r.inputs['Shader'])
    nt.links.new(s2r.outputs['Color'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mul.inputs['A'])
    if override_rgb is not None:
        mul.inputs['B'].default_value = (*override_rgb, 1)
        nt.links.new(mul.outputs['Result'], emit.inputs['Color'])
    else:
        if base_src is not None:
            if tint_rgb is not None:
                tint = nt.nodes.new('ShaderNodeMix')
                tint.data_type = 'RGBA'
                tint.blend_type = 'MULTIPLY'
                tint.inputs['Factor'].default_value = 1.0
                tint.inputs['B'].default_value = (*tint_rgb, 1)
                nt.links.new(base_src, tint.inputs['A'])
                nt.links.new(tint.outputs['Result'], mul.inputs['B'])
            else:
                nt.links.new(base_src, mul.inputs['B'])
        else:
            mul.inputs['B'].default_value = base_rgb
        nt.links.new(mul.outputs['Result'], emit.inputs['Color'])
    nt.links.new(emit.outputs['Emission'], out.inputs['Surface'])


# per-mesh material copies (taken from the untouched originals, then converted)
for o in bpy.data.objects:
    if o.type != 'MESH' or o.hide_render or args.skin:
        continue
    for slot in o.material_slots:
        if not slot.material:
            continue
        slot.material = slot.material.copy()
        if o.name in cfg['cloth']:
            toon_material(slot.material, override_rgb=pal['cloth'])
        elif o.name in cfg['support_robe']:
            toon_material(slot.material, tint_rgb=pal['robe_support'])
        elif o.name.endswith(('Sword', 'Axe', 'Staff', 'Crossbow', 'Wand', 'Spellbook', 'Shield')):
            toon_material(slot.material)
        else:
            toon_material(slot.material, tint_rgb=pal['armor'])

if args.skin:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    if args.skin == 'lionheart-warrior':
        from lionheart_skin import apply_skin
        apply_skin(rig, args.body, toon_material, OUT_ROOT)
    else:
        from lionheart_roles import ROLE_PROFILE, apply_role_skin
        profile_path = ROLE_PROFILE.with_name('ashenRolesSkin.json') if args.skin == 'ashen-roles' else ROLE_PROFILE
        apply_role_skin(rig, ROLE, args.body, toon_material, OUT_ROOT, profile_path=profile_path)

sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
sun.data.energy = 3.0
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))

cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
cam.data.type = 'ORTHO'
cam.data.ortho_scale = ORTHO_SCALE * CANVAS / RES
cam.data.shift_y = SHIFT_Y * RES / CANVAS
scene.collection.objects.link(cam)
el = math.radians(ELEVATION_DEG)
dist = 12.0
cam.location = (0, -dist * math.cos(el), dist * math.sin(el))
cam.rotation_euler = (math.radians(90.0 - ELEVATION_DEG), 0, 0)
scene.camera = cam

engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = CANVAS
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.render.use_freestyle = True
vl = scene.view_layers[0]
vl.use_freestyle = True
if args.skin:
    for old_set in list(vl.freestyle_settings.linesets):
        vl.freestyle_settings.linesets.remove(old_set)
ls = vl.freestyle_settings.linesets.new('outline')
ls.linestyle = bpy.data.linestyles.new('outline_style')
ls.select_silhouette = True
ls.select_border = True
ls.select_crease = True
ls.linestyle.color = OUTLINE_RGB
ls.linestyle.thickness = OUTLINE_PX * RES / 256.0
scene.render.line_thickness_mode = 'ABSOLUTE'
if args.skin:
    face_collection = bpy.data.collections['LH_FaceOutline']
    ls.select_by_collection = True
    ls.collection = face_collection
    ls.collection_negation = 'EXCLUSIVE'
    face_lines = vl.freestyle_settings.linesets.new('face_contour')
    face_lines.linestyle = ls.linestyle
    face_lines.select_by_collection = True
    face_lines.collection = face_collection
    face_lines.collection_negation = 'INCLUSIVE'
    face_lines.select_silhouette = True
    face_lines.select_border = False
    face_lines.select_crease = False

# Measure projection with Blender itself, against the original viewport.
def projection_probes(size):
    return [[p.x * size, (1 - p.y) * size] for p in
            (world_to_camera_view(scene, cam, Vector(point)) for point in
             ((0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)))]
bpy.context.view_layer.update()
expanded_probes = projection_probes(CANVAS)
cam.data.ortho_scale = ORTHO_SCALE
cam.data.shift_y = SHIFT_Y
scene.render.resolution_x = scene.render.resolution_y = RES
base_probes = projection_probes(RES)
cam.data.ortho_scale = ORTHO_SCALE * CANVAS / RES
cam.data.shift_y = SHIFT_Y * RES / CANVAS
scene.render.resolution_x = scene.render.resolution_y = CANVAS
metadata = {
    'version': 1, 'cellPx': CANVAS, 'baseCellPx': RES, 'paddingPx': args.padding,
    'anchor': {'x': RES / 2 + args.padding, 'y': round(RES * (0.5 + SHIFT_Y) + args.padding, 2)},
    'baseAnchor': {'x': RES / 2, 'y': round(RES * (0.5 + SHIFT_Y), 2)},
    'pxPerWorldUnit': round(RES / ORTHO_SCALE, 3), 'elevationDeg': ELEVATION_DEG,
    'outlinePx': OUTLINE_PX * RES / 256, 'directions': list(DIRS),
    'baseProjectionProbes': base_probes, 'expandedProjectionProbes': expanded_probes,
}
with open(os.path.join(OUT_ROOT, 'render-meta.json'), 'w', encoding='utf-8') as handle:
    json.dump(metadata, handle, indent=2)

out_dir = os.path.join(OUT_ROOT, f'{TEAM}_{ROLE}')
os.makedirs(out_dir, exist_ok=True)
rig.animation_data_create()
if args.save_blend:
    rig.animation_data.action = bpy.data.actions[cfg['anims']['idle']]
    rig.rotation_mode = 'XYZ'
    rig.rotation_euler[2] = math.radians(DIRS['SE'])
    scene.frame_set(int(round(rig.animation_data.action.frame_range[0])))
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(os.path.join(OUT_ROOT, 'skin.blend')))
for anim, action_name in cfg['anims'].items():
    if args.idle_only and anim != 'idle':
        continue
    count, loop = ANIM_FRAMES[anim]
    act = bpy.data.actions[action_name]
    rig.animation_data.action = act
    f0, f1 = act.frame_range
    span = f1 - f0
    for dname, yaw in DIRS.items():
        rig.rotation_mode = 'XYZ'
        rig.rotation_euler[2] = math.radians(yaw)
        for n in range(1 if args.idle_only else count):
            t = n / count if loop else (n / (count - 1) if count > 1 else 0.0)
            scene.frame_set(int(round(f0 + span * t)))
            scene.render.filepath = os.path.join(out_dir, f'{anim}_{dname}_{n:02d}.png')
            bpy.ops.render.render(write_still=True)
print('UNIT_DONE', TEAM, ROLE)
