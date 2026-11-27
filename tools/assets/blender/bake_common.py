"""Shared Blender bake setup for sprite-style renders (obstacles, CC bodies): camera, toon material, outline, normalise.

Camera: orthographic, elevation 30deg = engine ISO_SCALE_Y 0.5, key sun from upper left (SUN_EULER_DEG; render_unit.py reads it from here).
World scale: 1 Blender unit = HEX_SIZE (hex circumradius). PX_PER_HEX pixels per unit; the ground origin (cell centre)
lands at pixel ANCHOR. Imported by render_obstacle.py and render_cc_body.py (run inside Blender: blender -b -P ...).
"""
import bpy, math
from mathutils import Vector

PX_PER_HEX = 96          # engine HEX_SIZE 48 -> sprites baked at 2x canvas units
HEX_SIZE_CANVAS = 48.0
RES_X, RES_Y = 256, 448
ANCHOR = (128, 392)      # pixel of the world origin (cell centre on the ground)
ELEVATION_DEG = 30.0
OUTLINE_RGB = (0.07, 0.05, 0.05)
OUTLINE_PX = 2.0

# Bake lighting, single source for render_unit.py / render_obstacle.py / render_cc_body.py / render_status_art.py.
# TOON_RAMP: (position on the diffuse-lit value, multiplier colour); CONSTANT interpolation = 3 flat bands
# (ART_STYLE_BIBLE 11.1). The darkest band leans blue on purpose.
TOON_RAMP = ((0.0, (0.50, 0.50, 0.58)), (0.38, (0.80, 0.80, 0.82)), (0.72, (1.0, 1.0, 1.0)))
SUN_ENERGY = 3.0
SUN_EULER_DEG = (50.0, 10.0, -35.0)   # key light from the upper left (ART_SPEC 1.2)


def build_toon_ramp(nt):
    """Add the shared constant colour ramp to a node tree and return the node."""
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    (pos0, rgb0), *rest = TOON_RAMP
    ramp.color_ramp.elements[0].position = pos0
    ramp.color_ramp.elements[0].color = (*rgb0, 1)
    for pos, rgb in rest:
        ramp.color_ramp.elements.new(pos).color = (*rgb, 1)
    return ramp


# Experimental bake lighting (exp/visual-lighting, docs/plans/visual-experiment.md F1). 'classic' = the shipped look
# and adds no nodes. Every other preset is offline trial data: nothing here is read by the game.
#   ramp   replaces TOON_RAMP (still 3 CONSTANT bands; lit band warm, shadow band cool)
#   ao     (distance in world units, strength 0..1): occlusion multiplies the value that enters the ramp
#   rim    (threshold, softness, rgb, strength): back light from the side opposite the key sun
#   metal  (exponent, threshold, softness, rgb, strength, body) or None: highlight band on grey, bright base
#          colours only (steel); saturated colours (cloth, gold, skin) get none. body < 1 darkens the steel
#          outside the band so the band has room to read (steel is near white in the source palette)
_WARM_COOL_RAMP = ((0.0, (0.44, 0.46, 0.62)), (0.38, (0.80, 0.79, 0.80)), (0.72, (1.05, 1.00, 0.92)))
_RIM = (0.24, 0.05, (0.70, 0.88, 1.0), 0.85)
_AO = (0.45, 1.0)
_METAL = (10.0, 0.42, 0.04, (1.0, 0.98, 0.92), 0.9, 0.74)
LIGHTING_PRESETS = {
    'classic': None,
    'rim-ao': {'ramp': _WARM_COOL_RAMP, 'ao': _AO, 'rim': _RIM, 'metal': None},
    'rim-ao-metal': {'ramp': _WARM_COOL_RAMP, 'ao': _AO, 'rim': _RIM, 'metal': _METAL},
    'contrast': {
        'ramp': ((0.0, (0.34, 0.37, 0.56)), (0.42, (0.74, 0.73, 0.76)), (0.74, (1.08, 1.02, 0.90))),
        'ao': (0.60, 1.0), 'rim': (0.19, 0.05, (0.74, 0.90, 1.0), 1.0),
        'metal': (8.0, 0.40, 0.04, (1.0, 0.98, 0.92), 1.0, 0.62),
    },
}
METAL_MAX_SATURATION = (0.18, 0.32)   # smoothstep range: below = steel, above = coloured
METAL_MIN_VALUE = (0.30, 0.45)        # smoothstep range on HSV value
RIM_LIFT = 0.45                       # how far the rim light sits above the screen horizon (x key-light height)
RIM_GRAZING_POWER = 1.3               # >1 keeps the rim on edges; flat faces turned toward the camera get none
RIM_BEHIND = 0.20                     # how far the rim light sits behind the subject (x view vector)


def _unit(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


def _light_vectors():
    """World-space unit vectors toward the camera, the rim light and the key/view half vector.
    The camera is orthographic and fixed and the model yaws under it, so these are constants in world space."""
    from mathutils import Euler
    el = math.radians(ELEVATION_DEG)
    view = (0.0, -math.cos(el), math.sin(el))
    up = (0.0, math.sin(el), math.cos(el))
    right = (1.0, 0.0, 0.0)
    key = tuple(Euler(tuple(math.radians(d) for d in SUN_EULER_DEG), 'XYZ').to_matrix() @ Vector((0, 0, 1)))
    key_x = sum(key[i] * right[i] for i in range(3))
    key_y = sum(key[i] * up[i] for i in range(3))
    rim = _unit(tuple(-key_x * right[i] + RIM_LIFT * abs(key_y) * up[i] - RIM_BEHIND * view[i] for i in range(3)))
    half = _unit(tuple(key[i] + view[i] for i in range(3)))
    return view, rim, half


def _math(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _smooth(nt, value, lo, hi):
    n = nt.nodes.new('ShaderNodeMapRange')
    n.interpolation_type = 'SMOOTHSTEP'
    n.inputs['From Min'].default_value = lo
    n.inputs['From Max'].default_value = hi
    nt.links.new(value, n.inputs['Value'])
    return n.outputs['Result']


def _n_dot(nt, normal, vec):
    n = nt.nodes.new('ShaderNodeVectorMath')
    n.operation = 'DOT_PRODUCT'
    nt.links.new(normal, n.inputs[0])
    n.inputs[1].default_value = vec
    return _math(nt, 'MAXIMUM', n.outputs['Value'], 0.0)


def _add_light(nt, color, rgb, factor):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = 'ADD'
    nt.links.new(factor, n.inputs['Factor'])
    nt.links.new(color, n.inputs['A'])
    n.inputs['B'].default_value = (*rgb, 1)
    return n.outputs['Result']


def apply_lighting_preset(nt, name, s2r, ramp, mul):
    """Extend a toon graph (diffuse -> s2r -> ramp -> mul x base colour) with the named preset.
    Returns the colour socket to feed the emission; for 'classic' that is mul's result, untouched."""
    preset = LIGHTING_PRESETS[name]
    color = mul.outputs['Result']
    if preset is None:
        return color
    view, rim_dir, half = _light_vectors()
    for el, (pos, rgb) in zip(ramp.color_ramp.elements, preset['ramp']):
        el.position = pos
        el.color = (*rgb, 1)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    # capes and shields are single-sided sheets: flip the normal on back faces so they are lit like front faces
    flip = nt.nodes.new('ShaderNodeVectorMath')
    flip.operation = 'SCALE'
    nt.links.new(geo.outputs['Normal'], flip.inputs[0])
    nt.links.new(_math(nt, 'SUBTRACT', 1.0, _math(nt, 'MULTIPLY', geo.outputs['Backfacing'], 2.0)), flip.inputs['Scale'])
    normal = flip.outputs['Vector']
    # occlusion darkens the value before it is banded, so creases fall into the shadow band
    ao_dist, ao_strength = preset['ao']
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion')
    ao.samples = 32
    ao.inputs['Distance'].default_value = ao_dist
    bw = nt.nodes.new('ShaderNodeRGBToBW')
    nt.links.new(s2r.outputs['Color'], bw.inputs['Color'])
    occl = _math(nt, 'ADD', 1.0 - ao_strength, _math(nt, 'MULTIPLY', ao.outputs['AO'], ao_strength))
    for link in list(ramp.inputs['Fac'].links):
        nt.links.remove(link)
    nt.links.new(_math(nt, 'MULTIPLY', bw.outputs['Val'], occl), ramp.inputs['Fac'])
    # rim: faces turned toward the rim light and away from the camera
    r_th, r_soft, r_rgb, r_strength = preset['rim']
    grazing = _math(nt, 'SUBTRACT', 1.0, _n_dot(nt, normal, view), clamp=True)
    grazing = _math(nt, 'POWER', grazing, RIM_GRAZING_POWER)
    rim = _smooth(nt, _math(nt, 'MULTIPLY', _n_dot(nt, normal, rim_dir), grazing), r_th, r_th + r_soft)
    color = _add_light(nt, color, r_rgb, _math(nt, 'MULTIPLY', rim, r_strength))
    if preset['metal'] is not None:
        m_exp, m_th, m_soft, m_rgb, m_strength, m_body = preset['metal']
        spec = _smooth(nt, _math(nt, 'POWER', _n_dot(nt, normal, half), m_exp), m_th, m_th + m_soft)
        hsv = nt.nodes.new('ShaderNodeSeparateColor')
        hsv.mode = 'HSV'
        base = mul.inputs['B']
        if base.links:
            nt.links.new(base.links[0].from_socket, hsv.inputs['Color'])
        else:
            hsv.inputs['Color'].default_value = tuple(base.default_value)
        grey = _math(nt, 'SUBTRACT', 1.0, _smooth(nt, hsv.outputs['Green'], *METAL_MAX_SATURATION))
        steel = _math(nt, 'MULTIPLY', grey, _smooth(nt, hsv.outputs['Blue'], *METAL_MIN_VALUE))
        dim = nt.nodes.new('ShaderNodeMix')
        dim.data_type = 'RGBA'
        dim.blend_type = 'MULTIPLY'
        nt.links.new(steel, dim.inputs['Factor'])
        nt.links.new(color, dim.inputs['A'])
        dim.inputs['B'].default_value = (m_body, m_body, m_body, 1)
        color = _add_light(nt, dim.outputs['Result'], m_rgb,
                           _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', spec, steel), m_strength))
    return color


def add_key_sun(scene):
    """Add the shared key sun and return the object."""
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = SUN_ENERGY
    scene.collection.objects.link(sun)
    sun.rotation_euler = tuple(math.radians(d) for d in SUN_EULER_DEG)
    return sun


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def toon(mat, base_rgb=None, tint=None, emission=None, emission_strength=0.0):
    """Shared 3-band toon ramp (TOON_RAMP); optional additive emission (crystal glow, obsidian cracks)."""
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
    ramp = build_toon_ramp(nt)
    mul = nt.nodes.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
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


def setup_scene(outline_px=OUTLINE_PX):
    scene = bpy.context.scene
    add_key_sun(scene)
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
