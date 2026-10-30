"""Shared Blender bake setup for sprite-style renders (obstacles, CC bodies): camera, toon material, outline, normalise.

Camera: orthographic, elevation 30deg = engine ISO_SCALE_Y 0.5, sun from upper left (same as render_unit.py).
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
