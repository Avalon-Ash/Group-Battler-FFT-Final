"""Offline Lionheart skin application. Geometry remains KayKit; new hair is head-weighted.
Upstream: lionheartWarriorSkin.json; output: Blender materials, cape UV, rigid accessories.
No runtime import. All design values are in the profile, not engine/renderers.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

PROFILE = Path(__file__).resolve().parents[3] / 'art-source/faction-skins/lionheartWarriorSkin.json'

def linear(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in values)

def inside(x, y, polygon):
    hit = False
    prev = polygon[-1]
    for curr in polygon:
        ax, ay = prev
        bx, by = curr
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            hit = not hit
        prev = curr
    return hit

def cape_texture(profile, output_dir):
    cfg = profile['cape']
    size = cfg['textureSize']
    image = bpy.data.images.new('Lionheart_Cape', size, size, alpha=True)
    image.colorspace_settings.name = 'sRGB'
    colors = {k: tuple(int(v[i:i+2],16)/255 for i in (1,3,5)) for k,v in profile['colors'].items()}
    emblem=bpy.data.images.load(str(PROFILE.parents[2]/cfg['emblem']),check_existing=False)
    ew,eh=emblem.size;mask=list(emblem.pixels)
    x0,y0,x1,y1=cfg['logoBox'];pixels=[]
    # Composite one approved lion alpha mask over blue. No original cape image is mixed in.
    for py in range(size):
        v=py/(size-1)
        for px in range(size):
            u=px/(size-1);alpha=0
            if x0<=u<=x1 and y0<=v<=y1:
                ex=min(ew-1,int((u-x0)/(x1-x0)*ew));ey=min(eh-1,int((v-y0)/(y1-y0)*eh))
                alpha=max(0,(mask[(ey*ew+ex)*4+3]-cfg['alphaCutoff'])/(1-cfg['alphaCutoff']))
            if min(u,1-u,v)<cfg['border']:alpha=1
            pixels.extend((*(colors['blue'][i]*(1-alpha)+colors['gold'][i]*alpha for i in range(3)),1))
    image.pixels.foreach_set(pixels)
    image.filepath_raw = str(Path(output_dir)/'lionheart-cape.png')
    image.file_format = 'PNG'
    image.save()
    # Reload saved image so the texture has conventional file-backed sRGB conversion.
    return bpy.data.images.load(image.filepath_raw, check_existing=False)

def palette_texture(profile, output_dir, source_name='barbarian_texture'):
    source=bpy.data.images[source_name]
    width,height=source.size;original=list(source.pixels)
    luminance=[0.2126*original[i]+0.7152*original[i+1]+0.0722*original[i+2] for i in range(0,len(original),4)]
    maxima={}
    for py in range(height):
        row=min(3,py*4//height)
        for px in range(width):
            key=(row,min(7,px*8//width))
            maxima[key]=max(maxima.get(key,0),luminance[py*width+px])
    colors={k:tuple(int(v[i:i+2],16)/255 for i in (1,3,5)) for k,v in profile['colors'].items()}
    pixels=[]
    for py in range(height):
        row=min(3,py*4//height)
        for px in range(width):
            col=min(7,px*8//width)
            ratio=luminance[py*width+px]/max(maxima[(row,col)],1e-6)
            value=profile['paletteGradientFloor']+(1-profile['paletteGradientFloor'])*ratio
            pixels.extend((*(c*value for c in colors[profile['paletteCells'][row][col]]),1))
    im=bpy.data.images.new('LH_Palette',width,height,alpha=True)
    im.colorspace_settings.name='sRGB';im.pixels.foreach_set(pixels)
    im.filepath_raw=str(Path(output_dir)/'lionheart-palette.png');im.file_format='PNG';im.save()
    return bpy.data.images.load(im.filepath_raw,check_existing=False)

def material(name, color, toon, image=None):
    m = bpy.data.materials.new('LH_'+name)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear(color),1)
    if image:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image=image
        tex.interpolation='Linear'
        m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    toon(m)
    return m

def rigid_mesh(name, vertices, faces, rig, mats, indices=None):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent=rig
    group=obj.vertex_groups.new(name='head')
    group.add(list(range(len(vertices))),1.0,'REPLACE')
    mod=obj.modifiers.new('OriginalHeadBone','ARMATURE')
    mod.object=rig
    for mat in mats: mesh.materials.append(mat)
    if indices:
        for p,index in zip(mesh.polygons,indices): p.material_index=index
    return obj

def hair(profile, rig, body, mats, scalp=None, ornament_surface=None):
    cfg=profile['hair']
    cx,cy,cz=cfg['center']
    ry=cfg['radius'][1]
    # Follow KayKit's rounded-box scalp exactly; an ellipsoid cuts into its corners.
    source=scalp if scalp is not None else bpy.data.objects['Barbarian_Head'].data
    vertices=[list(Vector((cx,cy,cz))+(vert.co-Vector((cx,cy,cz)))*cfg['surfaceOffset']) for vert in source.vertices]
    faces=[];indices=[]
    for poly in source.polygons:
        # Do not copy the source's raised eyebrows into the hair cap.
        mean_u=sum(source.uv_layers.active.data[i].uv.x for i in poly.loop_indices)/len(poly.loop_indices)
        if scalp is None and mean_u>=profile['head']['browUV'][0]:continue
        p=poly.center
        front=max(0,min(1,(-p.y/ry+1)/2))
        edge=cfg['backEdge']+(cfg['frontEdge']-cfg['backEdge'])*front
        if p.z>=edge:
            faces.append(tuple(poly.vertices))
            indices.append(1 if poly.center.x<cfg['highlightMaxX'] and poly.normal.z>cfg['highlightMinNormalZ'] else 0)
    rigid_mesh('LH_HairCap',vertices,faces,rig,[mats['hair'],mats['hairLight']],
               indices)
    for n,points in enumerate(cfg['locks']):
        center=sum((Vector(p) for p in points),Vector())/len(points)
        center.y-=cfg['lockBulge']
        rigid_mesh('LH_Fringe_'+str(n),points+[list(center)],
                   [(i,(i+1)%len(points),len(points)) for i in range(len(points))],
                   rig,[mats['hair'],mats['hairLight'],mats['hairDark']],[0,2,0,1])
    if body=='FEMALE':
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=cfg['bunSubdivisions'],radius=1)
        o=bpy.context.object
        # Bake all coordinates in the original rig bind space before adding skinning.
        for vert in o.data.vertices:
            vert.co=Vector(cfg['bunCenter'])+Vector(tuple(vert.co[i]*cfg['bunScale'][i] for i in range(3)))
        o.name='LH_LowBun'
        o.parent=rig
        g=o.vertex_groups.new(name='head');g.add(list(range(len(o.data.vertices))),1,'REPLACE')
        mod=o.modifiers.new('OriginalHeadBone','ARMATURE');mod.object=rig
        o.data.materials.append(mats['hair'])
        o.data.materials.append(mats['hairLight'])
        for p in o.data.polygons:p.material_index=1 if p.index%11==0 else 0
        ornament(profile,rig,mats,surface_objects=ornament_surface)

def ornament(profile, rig, mats, surface_objects=None):
    cfg=profile['ornament']
    center=Vector(cfg['center']);u=Vector(cfg['u'])*cfg['sizeScale'];v=Vector(cfg['v'])*cfg['sizeScale'];normal=Vector(cfg['normal']).normalized()
    vertices=[];faces=[]
    for obj in (surface_objects if surface_objects is not None else bpy.data.objects):
        if surface_objects is not None or obj.name=='LH_HairCap' or obj.name.startswith('LH_Fringe_'):
            offset=len(vertices);vertices.extend(vert.co.copy() for vert in obj.data.vertices)
            faces.extend(tuple(i+offset for i in poly.vertices) for poly in obj.data.polygons)
    surface=BVHTree.FromPolygons(vertices,faces)
    shapes=[cfg['diamond']]+cfg['leaves'];points=[p for shape in shapes for p in shape]
    xmin=min(p[0] for p in points);xmax=max(p[0] for p in points)
    ymin=min(p[1] for p in points);ymax=max(p[1] for p in points)
    diamond=cfg['diamond'];mx=sum(p[0] for p in diamond)/len(diamond);my=sum(p[1] for p in diamond)/len(diamond)
    inset=[(mx+(x-mx)*cfg['inset'],my+(y-my)*cfg['inset']) for x,y in diamond]
    size=cfg['textureSize'];pixels=[]
    for py in range(size):
        y=ymin+py/(size-1)*(ymax-ymin)
        for px in range(size):
            x=xmin+px/(size-1)*(xmax-xmin)
            alpha=1 if any(inside(x,y,p) for p in shapes) else 0
            color=profile['colors'][cfg.get('gemColor','blue') if inside(x,y,inset) else cfg.get('metalColor','gold')]
            pixels.extend((*(int(color[i:i+2],16)/255 for i in (1,3,5)),alpha))
    image=bpy.data.images.new('LH_ClaspTexture',size,size,alpha=True)
    image.colorspace_settings.name='sRGB';image.pixels.foreach_set(pixels);image.pack()
    mat=bpy.data.materials.new('LH_ClaspDecal');mat.use_nodes=True
    nt=mat.node_tree;nt.nodes.clear()
    out=nt.nodes.new('ShaderNodeOutputMaterial');emit=nt.nodes.new('ShaderNodeEmission')
    transparent=nt.nodes.new('ShaderNodeBsdfTransparent');mix=nt.nodes.new('ShaderNodeMixShader');tex=nt.nodes.new('ShaderNodeTexImage');tex.image=image
    nt.links.new(tex.outputs['Color'],emit.inputs['Color']);nt.links.new(tex.outputs['Alpha'],mix.inputs[0])
    nt.links.new(transparent.outputs[0],mix.inputs[1]);nt.links.new(emit.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],out.inputs['Surface'])
    # A dense conforming decal avoids long triangles cutting through curved locks.
    steps=cfg['grid'];vertices=[];uvs=[];faces=[]
    for row in range(steps+1):
        for col in range(steps+1):
            x=xmin+col/steps*(xmax-xmin);y=ymin+row/steps*(ymax-ymin)
            point=center+u*x+v*y
            hit,face_normal,_,_=surface.ray_cast(point+normal,-normal,2)
            if hit is None:hit,face_normal,_,_=surface.find_nearest(point)
            if hit is None:raise ValueError('Clasp cannot attach to hair')
            vertices.append(list(hit+face_normal*cfg['clearance']));uvs.append((col/steps,row/steps))
    for row in range(steps):
        for col in range(steps):
            a=row*(steps+1)+col;b=a+1;c=a+steps+1;d=c+1
            faces.extend([(a,b,d),(a,d,c)])
    obj=rigid_mesh('LH_HairClasp_Decal',vertices,faces,rig,[mat]);uv=obj.data.uv_layers.new(name='ClaspUV')
    for loop in obj.data.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]

def clean_face(profile, rig, body, output_dir, head_name='Barbarian_Head'):
    cfg=profile['face']
    source=json.loads((PROFILE.parents[2]/cfg['source']).read_text(encoding='utf-8'))
    # Hide, do not alter, the original head. Its beard is part of the lower face shell.
    bpy.data.objects[head_name].hide_render=True
    bpy.data.objects[head_name].hide_viewport=True
    size=cfg['textureSize'];pixels=[]
    colors={k:tuple(int(v[i:i+2],16)/255 for i in (1,3,5)) for k,v in profile['colors'].items()}
    brow=cfg['maleBrow' if body=='MALE' else 'femaleBrow']
    for py in range(size):
        z=cfg['zRange'][0]+py/(size-1)*(cfg['zRange'][1]-cfg['zRange'][0])
        for px in range(size):
            x=cfg['xRange'][0]+px/(size-1)*(cfg['xRange'][1]-cfg['xRange'][0])
            ax=abs(x)
            eye=((ax-cfg['eyeX'])/cfg['eyeWidth'])**2+((z-cfg['eyeZ'])/cfg['eyeHeight'])**2<=1
            lid=body=='FEMALE' and inside(ax,z,cfg['femaleLid'])
            key='dark' if eye or lid else 'hairDark' if inside(ax,z,brow) else 'lip' if inside(x,z,cfg['mouth']) else 'skin'
            pixels.extend((*colors[key],1))
    im=bpy.data.images.new('LH_Face_'+body,size,size,alpha=True)
    im.colorspace_settings.name='sRGB';im.pixels.foreach_set(pixels)
    im.filepath_raw=str(Path(output_dir)/('lionheart-face-'+body.lower()+'.png'));im.file_format='PNG';im.save()
    image=bpy.data.images.load(im.filepath_raw,check_existing=False)
    mats=[]
    for name,texture in [('FaceTexture',True),('CleanSkin',False)]:
        mat=bpy.data.materials.new('LH_'+name);mat.use_nodes=True
        nt=mat.node_tree;nt.nodes.clear()
        out=nt.nodes.new('ShaderNodeOutputMaterial');emit=nt.nodes.new('ShaderNodeEmission')
        emit.inputs['Color'].default_value=(*linear(profile['colors']['skin']),1)
        if texture:
            tex=nt.nodes.new('ShaderNodeTexImage');tex.image=image
            nt.links.new(tex.outputs['Color'],emit.inputs['Color'])
        nt.links.new(emit.outputs['Emission'],out.inputs['Surface']);mats.append(mat)
    obj=rigid_mesh('LH_CleanFace',source['vertices'],source['faces'],rig,mats)
    mesh=obj.data;uv=mesh.uv_layers.new(name='FaceUV')
    for poly in mesh.polygons:
        poly.material_index=0 if poly.center.y<cfg['frontY'] and poly.normal.y<cfg['frontNormalY'] else 1
        for li in poly.loop_indices:
            pt=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=((pt.x-cfg['xRange'][0])/(cfg['xRange'][1]-cfg['xRange'][0]),(pt.z-cfg['zRange'][0])/(cfg['zRange'][1]-cfg['zRange'][0]))
    # Face gets only an outer contour: source mouth creases must not become a grin.
    collection=bpy.data.collections.new('LH_FaceOutline');bpy.context.scene.collection.children.link(collection)
    for old in list(obj.users_collection):old.objects.unlink(obj)
    collection.objects.link(obj)
    # Thin clasp faces must not receive the 2px equipment border: it erases the gold.
    for accessory in list(bpy.data.objects):
        if accessory.name.startswith('LH_HairClasp_') or accessory.name=='LH_BlueEnamel':
            for old in list(accessory.users_collection):old.objects.unlink(accessory)
            collection.objects.link(accessory)

def apply_skin(rig, body, toon, output_dir):
    if body not in ('MALE','FEMALE'):raise ValueError('Unknown body')
    profile=json.loads(PROFILE.read_text(encoding='utf-8'))
    mats={key:material(key,color,toon) for key,color in profile['colors'].items()}
    names=list(mats)
    for obj in list(bpy.data.objects):
        if obj.type!='MESH' or obj.hide_render:continue
        if obj.name=='Barbarian_Hat':
            obj.hide_render=True
            continue
        uv=obj.data.uv_layers.active
        colors=[]
        for poly in obj.data.polygons:
            coords=[uv.data[i].uv for i in poly.loop_indices]
            u=sum(p.x for p in coords)/len(coords)
            v=sum(p.y for p in coords)/len(coords)
            key=profile['paletteCells'][min(3,int(v*4))][min(7,int(u*8))]
            if obj.name=='Barbarian_Head':
                h=profile['head']
                center=poly.center
                key='skin'
                if h['eyeUV'][0]<u<h['eyeUV'][1]:key='dark'
                elif h['browUV'][0]<u<h['browUV'][1] and h['browMinZ']<center.z<h['browMaxZ'] and center.y<h['frontY']:key='hairDark'
            colors.append(names.index(key))
        obj.data.materials.clear()
        for m in mats.values():obj.data.materials.append(m)
        for poly,index in zip(obj.data.polygons,colors):poly.material_index=index
    palette=material('GradientPalette',profile['colors']['silver'],toon,palette_texture(profile,output_dir))
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and not obj.hide_render and obj.name not in ('Barbarian_Head','Barbarian_Cape'):
            obj.data.materials.clear();obj.data.materials.append(palette)
            for poly in obj.data.polygons:poly.material_index=0
    cape=bpy.data.objects['Barbarian_Cape']
    image=cape_texture(profile,output_dir)
    cape.data.materials.clear()
    cape.data.materials.append(material('CapePattern',profile['colors']['blue'],toon,image))
    xs=[v.co.x for v in cape.data.vertices];zs=[v.co.z for v in cape.data.vertices]
    for poly in cape.data.polygons:
        poly.material_index=0
        for li in poly.loop_indices:
            p=cape.data.vertices[cape.data.loops[li].vertex_index].co
            cape.data.uv_layers.active.data[li].uv=((p.x-min(xs))/(max(xs)-min(xs)),(p.z-min(zs))/(max(zs)-min(zs)))
    hair(profile,rig,body,mats)
    clean_face(profile,rig,body,output_dir)
    return profile
