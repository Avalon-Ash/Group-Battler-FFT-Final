"""Profile-driven Ashen hair silhouettes, rigidly weighted to the original head.

Curved faceted locks and a three-strand plait replace the Lionheart haircut.
Only new accessory geometry is authored; source body/head/rig data is untouched.
"""
import math
import bpy
from mathutils import Vector

from lionheart_skin import ornament, rigid_mesh


def frame(tangent):
    tangent = tangent.normalized()
    u = Vector((1, 0, 0)) - tangent * tangent.x
    if u.length < 0.01:
        u = Vector((0, 1, 0)) - tangent * tangent.y
    u.normalize()
    return u, tangent.cross(u).normalized()


def lock(name, points, rig, mats, sides=8):
    # Smooth the authored guide curve; sparse straight segments look like armor fins.
    guides = points
    points = []
    for segment in range(len(guides) - 1):
        p0 = Vector(guides[max(0, segment - 1)][:3])
        p1 = Vector(guides[segment][:3])
        p2 = Vector(guides[segment + 1][:3])
        p3 = Vector(guides[min(len(guides) - 1, segment + 2)][:3])
        for step in range(4):
            t = step / 4
            center = 0.5 * ((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t*t*t)
            radii = [guides[segment][i]*(1-t) + guides[segment+1][i]*t for i in (3, 4)]
            points.append([*center, *radii])
    points.append(guides[-1])
    centers = [Vector(p[:3]) for p in points]
    vertices, faces, indices = [], [], []
    for n, center in enumerate(centers):
        tangent = centers[min(n + 1, len(centers) - 1)] - centers[max(n - 1, 0)]
        u, v = frame(tangent)
        rx, ry = points[n][3:5]
        for i in range(sides):
            a = math.tau * i / sides
            vertices.append(list(center + u * (rx * math.cos(a)) + v * (ry * math.sin(a))))
    faces.append(tuple(reversed(range(sides))))
    indices.append(0)
    for n in range(len(centers) - 1):
        for i in range(sides):
            j = (i + 1) % sides
            faces.append((n * sides + i, n * sides + j,
                          (n + 1) * sides + j, (n + 1) * sides + i))
            indices.append(1 if len(mats) > 1 and i in (3, 4) else 0)
    faces.append(tuple((len(centers) - 1) * sides + i for i in range(sides)))
    indices.append(0)
    obj = rigid_mesh(name, vertices, faces, rig, mats, indices)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def braid(cfg, rig, mats):
    path = [Vector(p) for p in cfg['path']]
    objects = []
    # Three phase-shifted figure-eight paths weave in front/behind one another.
    # Unlike three helices, this yields visible alternating plait lobes.
    for strand in range(3):
        points = []
        for n in range(cfg['steps'] + 1):
            t = n / cfg['steps']
            segment = min(len(path) - 2, int(t * (len(path) - 1)))
            f = t * (len(path) - 1) - segment
            center = path[segment].lerp(path[segment + 1], f)
            u, v = frame(path[segment + 1] - path[segment])
            angle = math.tau * (t * cfg['turns'] + strand / 3)
            taper = 1 - cfg['taper'] * t
            point = center + u * (cfg['width'] * taper * math.sin(angle))
            point += v * (cfg['depth'] * taper * math.sin(2 * angle))
            radius = cfg['strandRadius'] * taper
            points.append([*point, radius, radius])
        objects.append(lock('LH_AS_Braid_' + str(strand), points, rig,
                            [mats['hair'], mats['hairLight']], cfg['sides']))
    return objects


def apply_ashen_hair(profile, rig, mats, scalp, style, ornament_surface=None):
    center = Vector(profile['hair']['center'])
    vertices = [list(center + (v.co - center) * style['surfaceOffset']) for v in scalp.vertices]
    faces, indices = [], []
    for poly in scalp.polygons:
        p = poly.center
        front = max(0, min(1, (-p.y / profile['hair']['radius'][1] + 1) / 2))
        edge = style['backEdge'] + (style['frontEdge'] - style['backEdge']) * front
        if p.z >= edge:
            faces.append(tuple(poly.vertices))
            shaved = style.get('shavedSide', 0) * p.x > style.get('shaveAtX', 1)
            indices.append(2 if shaved else 1 if p.x < -0.12 and poly.normal.z > 0.5 else 0)
    cap = rigid_mesh('LH_HairCap', vertices, faces, rig,
                     [mats['hair'], mats['hairLight'], mats['hairDark']], indices)
    objects = [cap]
    for n, points in enumerate(style['locks']):
        objects.append(lock('LH_AS_Lock_' + str(n), points, rig,
                            [mats['hair'], mats['hairLight']], style['sides']))
    if 'braid' in style:
        objects.extend(braid(style['braid'], rig, mats))
    for n, tie in enumerate(style.get('ties', [])):
        objects.append(lock('LH_AS_Tie_' + str(n), tie['points'], rig,
                            [mats[tie['color']]], style['sides']))
    if style.get('ornament', False):
        ornament(profile, rig, mats, surface_objects=ornament_surface or objects)
    # Use silhouette-only lines like the face; crease outlines make hair look metallic.
    contour = bpy.data.collections['LH_FaceOutline']
    for obj in objects:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        contour.objects.link(obj)
