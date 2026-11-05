"""Status-art prototype only. Outputs stay under docs/status_art/proto.
Run: blender -b -t 4 -P tools/assets/blender/render_status_art.py -- <out_dir>
Uses the production camera, lighting and toon ramp. No public asset mutation.
Pack approved output with tools/assets/blender/pack_status_art.mjs.
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bake

OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
os.makedirs(OUT, exist_ok=True)
bake.PX_PER_HEX = 192
bake.RES_X, bake.RES_Y = 384, 512
bake.ANCHOR = (192, 410)

def mat(name, color, alpha=1):
    rgb = [int(color[i:i+2], 16)/255 for i in (1,3,5)]
    rgb = [((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in rgb]
    m = bpy.data.materials.new(name)
    bake.toon(m, base_rgb=rgb)
    if alpha < 1:
        n = m.node_tree.nodes
        links = m.node_tree.links
        out = next(x for x in n if x.type == 'OUTPUT_MATERIAL')
        shader = out.inputs['Surface'].links[0].from_socket
        links.remove(out.inputs['Surface'].links[0])
        transparent = n.new('ShaderNodeBsdfTransparent')
        mix = n.new('ShaderNodeMixShader')
        mix.inputs[0].default_value = alpha
        links.new(transparent.outputs[0], mix.inputs[1])
        links.new(shader, mix.inputs[2])
        links.new(mix.outputs[0], out.inputs['Surface'])
        m.surface_render_method = 'BLENDED'
    return m

def mesh(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob

def ellipsoid(name, pos, radii, material, sub=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    for v in bm.verts:
        v.co = Vector((pos[0]+v.co.x*radii[0], pos[1]+v.co.y*radii[1], pos[2]+v.co.z*radii[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob

def limb(name, a, b, radius, material, vertices=5):
    a,b=Vector(a),Vector(b)
    delta=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius*.85, depth=delta.length, location=(a+b)/2)
    ob=bpy.context.object
    ob.name=name
    ob.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    ob.data.materials.append(material)
    return ob

def sheep(pose):
    wool=mat('warm cream fleece','#fff1d5')
    dark=mat('warm face','#76645b')
    hoof=mat('hooves','#433b39')
    ear=mat('ear inset','#e7adad')
    eye=mat('eyes','#fffdf1')
    # One connected faceted body, no separate spherical wool clusters.
    ellipsoid('single fleece', (0,.05,.70),(.35,.46,.36),wool,2)
    ellipsoid('neck', (0,-.35,.83),(.19,.22,.25),wool,1)
    nod=[0,.025,0,-.02][pose]
    ellipsoid('head', (0,-.53,.79+nod),(.16,.22,.21),dark,1)
    ellipsoid('muzzle', (0,-.67,.73+nod),(.135,.12,.105),dark,1)
    ellipsoid('brow fleece', (0,-.48,.96+nod),(.165,.15,.09),wool,1)
    for s in [-1,1]:
        ellipsoid('ear', (s*.23,-.45,.92+nod),(.15,.07,.07),wool,1)
        ellipsoid('ear inset',(s*.25,-.49,.925+nod),(.085,.018,.033),ear,1)
        ellipsoid('eye',(s*.128,-.635,.86+nod),(.043,.030,.047),eye,2)
        ellipsoid('pupil',(s*.134,-.661,.864+nod),(.023,.014,.029),hoof,2)
        ellipsoid('catchlight',(s*.13,-.676,.877+nod),(.009,.007,.011),eye,1)
    for i,(x,y) in enumerate([(-.22,-.23),(.22,-.23),(-.22,.30),(.22,.30)]):
        step=math.sin(pose*math.pi/2+i*math.pi)*.055
        limb('leg',(x,y+step,.11),(x,y,.50),.065,dark)
        limb('hoof',(x,y+step,.025),(x,y+step,.13),.073,hoof)
    ellipsoid('short tail',(0,.49,.77),(.10,.14,.12),wool,1)
    if '--short-legs' in sys.argv:
        # Keep the four sole centres fixed; scale each limb axis, not its thickness.
        for ob in bpy.context.scene.objects:
            if ob.type != 'MESH': continue
            if ob.name.startswith(('leg', 'hoof')):
                ob.scale.z *= .30
                ob.location.z = .025 + (ob.location.z - .025) * .30
                # The hoof is vertical; for the sloping leg keep its lower-end Y.
                if ob.name.startswith('leg'):
                    axis = ob.rotation_euler.to_matrix() @ Vector((0,0,1))
                    # Original endpoints are z=.11 and .50; preserve the original
                    # sole Y (bottom endpoint) while shortening the horizontal step.
                    ob.location.y -= axis.y * (.50-.11) / axis.z * .35
            else:
                for vertex in ob.data.vertices: vertex.co.z -= (.50 - .025) * .70

def ice(pose):
    # Revision 2: ankle/lower-leg ice only. Upper body is a cached ice material.
    body=mat('clear blue ice','#83cbe8',.68)
    body.use_backface_culling=True
    edge=mat('frost edge','#d8f6ff',.80)
    ring=[(-.40,-.33),(.21,-.44),(.49,-.20),(.43,.27),(.13,.42),(-.37,.32),(-.49,.02)]
    verts=[]
    for z,scale in [(0, .87),(.08,1),(.24, .70),(.38,.42)]:
        for i,(x,y) in enumerate(ring):
            verts.append((x*scale,y*scale,z+(0 if z==0 else [.02,-.025,.04,-.01,.03,-.03,.01][i])))
    faces=[]
    n=len(ring)
    for layer in range(3):
        for i in range(n):
            faces.append((layer*n+i,layer*n+(i+1)%n,(layer+1)*n+(i+1)%n,(layer+1)*n+i))
    faces.extend([tuple(reversed(range(n))),tuple(range(3*n,4*n))])
    ob=mesh('solid ice',verts,faces,body)
    ob.data.materials.append(edge)
    for p in ob.data.polygons:
        if p.index>=2*n: p.material_index=1
    # Fractures lie on the front surface, not a floating emblem.
    # No freestanding fracture rods: their outlines read as twigs at native scale.
    for x,y,z in [(-.31,-.21,.05),(.28,-.22,.06),(.37,.15,.04)]:
        ellipsoid('frozen base',(x,y,z),(.15,.15,.075),edge,1)

manifest={'pxPerHex':192,'anchor':[192,410],'resolution':[384,512],'elevationDeg':30,'frames':[]}
if '--short-legs' in sys.argv:
    manifest['revision']={'limbAxisRatio':.30,'bodyDrop':(.50-.025)*.70,
                          'soleCenterZ':.025,'sameCameraAndMaterials':True}
if '--ice-only' in sys.argv and os.path.exists(os.path.join(OUT,'bake-manifest.json')):
    with open(os.path.join(OUT,'bake-manifest.json')) as f:
        manifest['frames']=[x for x in json.load(f)['frames'] if x['kind']!='ice']
for name,build in [('sheep',sheep),('ice',ice)]:
    if '--ice-only' in sys.argv and name!='ice': continue
    if '--sheep-only' in sys.argv and name!='sheep': continue
    for direction,yaw in [('SE',45),('SW',-45),('NE',135),('NW',-135)]:
        for pose in range(4 if name=='sheep' else 1):
            bake.reset()
            bake.setup_scene(outline_px=1.25)
            build(pose)
            measurements=[]
            if name=='sheep' and '--short-legs' in sys.argv:
                bpy.context.view_layer.update()
                for ob in bpy.context.scene.objects:
                    if ob.type!='MESH' or not ob.name.startswith(('leg','hoof')): continue
                    lo=min(v.co.z for v in ob.data.vertices)
                    hi=max(v.co.z for v in ob.data.vertices)
                    a=ob.matrix_world @ Vector((0,0,lo))
                    b=ob.matrix_world @ Vector((0,0,hi))
                    ratio=(b-a).length/(hi-lo)
                    assert abs(ratio-.3)<1e-5, (ob.name,ratio)
                    if ob.name.startswith('hoof'): assert abs(a.z-.025)<1e-5
                    measurements.append({'name':ob.name,'axisRatio':ratio,
                                         'bottomCenter':list(a),'topCenter':list(b)})
            for o in bpy.context.scene.objects:
                if o.type=='MESH':
                    o.rotation_euler.rotate_axis('Z',math.radians(yaw))
                    # Primitive cones have local coordinates; rotate their centres too.
                    x,y=o.location.x,o.location.y
                    a=math.radians(yaw)
                    o.location.x=x*math.cos(a)-y*math.sin(a)
                    o.location.y=x*math.sin(a)+y*math.cos(a)
            scene=bpy.context.scene
            scene.render.threads_mode='FIXED'
            scene.render.threads=4
            # Outline only silhouette/border. Crease edges would triangulate the fleece visually.
            scene.view_layers[0].freestyle_settings.linesets[0].select_crease=False
            file=f'{name}_{direction}_{pose:02}.png'
            scene.render.filepath=os.path.join(OUT,file)
            bpy.ops.render.render(write_still=True)
            manifest['frames'].append({'kind':name,'direction':direction,'frame':pose,'file':file,'limbs':measurements})
            with open(os.path.join(OUT,'bake-manifest.json'),'w') as f: json.dump(manifest,f,indent=2)
            print('SAVED_STATUS_ART',file,flush=True)
print('STATUS_ART_BAKE_DONE',flush=True)
