"""
nms.fyi: overhead data-terminal monitor, generated procedurally in Blender.

A bulbous 1980s CRT terminal: pillowy rounded front housing with puffed faces,
a tapered rounded rear hood, a recessed curved screen, chin vents/knobs/status LED,
top vents, and a U-yoke that attaches to the telescoping ceiling arm.

Run (the host has Blender; paths are shared with claudebox):
  blender -b --factory-startup -P tools/blender/monitor.py -- \
      --out public/models/monitor.glb --preview assets-src/previews/monitor

Conventions:
  * Blender is Z-up with the front facing -Y. The glTF export converts to Y-up with the front facing +Z (three.js).
  * Object origin = the arm attachment point at the top of the yoke.
  * Material names are the contract with the site (src/scene/monitor.js remaps them):
      housing, bezel, grille, screen, led, yoke, steel, knob
  * "Screen" has 0..1 UVs (u -> +x, v -> up) for the boot/OS canvas texture.
"""
import bpy
import bmesh
import math
import sys
import os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default

OUT = arg("--out", "public/models/monitor.glb")
PREVIEW = arg("--preview", None)

# ------------------------------------------------------------------ dimensions (meters)
W, H = 0.60, 0.50          # front housing width / height
DF = 0.26                  # front housing depth (y -0.13 .. 0.13)
FRONT_Y = -DF / 2
SCREEN_W, SCREEN_H = 0.44, 0.335
SCREEN_CZ = 0.03           # screen center height (leaves a chin below)
RECESS = 0.05              # bezel recess depth
YOKE_TOP = H / 2 + 0.13    # top of the yoke crossbar
ATTACH_Z = YOKE_TOP + 0.06 # arm attachment point -> becomes the origin

# ------------------------------------------------------------------ scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def material(name, rgb, rough=0.5, metal=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    return m

def srgb(h):
    c = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)

MAT = {
    "housing": material("housing", srgb(0xD9CFB9), 0.45),
    "bezel":   material("bezel",   srgb(0x8F8573), 0.55),
    "grille":  material("grille",  srgb(0x2B2926), 0.8),
    "screen":  material("screen",  srgb(0x0E1411), 0.12, emit=srgb(0x0E2A1C), emit_strength=0.4),
    "led":     material("led",     srgb(0x62F2FF), 0.3, emit=srgb(0x62F2FF), emit_strength=6),
    "yoke":    material("yoke",    srgb(0xE6DFCF), 0.45),
    "steel":   material("steel",   srgb(0xA3A19C), 0.35, 0.7),
    "knob":    material("knob",    srgb(0xB5A891), 0.5),
}

def link(obj):
    scene.collection.objects.link(obj)
    return obj

def mesh_obj(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    obj.data.materials.append(MAT[mat])
    return obj

def box_bm(sx, sy, sz):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    return bm

def apply_all(obj):
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]):
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)

def soften(obj, bevel, segments=6, subdiv=2, cast=0.0):
    """Rounded, pillowy plastic: bevel -> simple subdivision -> spherical cast (puffs flat faces)."""
    b = obj.modifiers.new("bevel", "BEVEL")
    b.width = bevel; b.segments = segments; b.limit_method = "NONE"; b.profile = 0.5
    if subdiv:
        s = obj.modifiers.new("subdiv", "SUBSURF")
        s.subdivision_type = "SIMPLE"; s.levels = subdiv; s.render_levels = subdiv
    if cast:
        c = obj.modifiers.new("cast", "CAST")
        c.cast_type = "SPHERE"; c.factor = cast
    apply_all(obj)

def pillow(obj, support, levels=3, cast=0.0):
    """Clean pillowy shell: two-segment support bevel, then Catmull-Clark subdivision,
    then an optional gentle spherical cast on the now-dense, even mesh.
    (Casting straight onto a many-segment bevel folded the corners: stair-step bands.)"""
    b = obj.modifiers.new("support", "BEVEL")
    b.width = support; b.segments = 2; b.limit_method = "NONE"; b.profile = 0.5
    s = obj.modifiers.new("subdiv", "SUBSURF")
    s.subdivision_type = "CATMULL_CLARK"; s.levels = levels; s.render_levels = levels
    if cast:
        c = obj.modifiers.new("cast", "CAST")
        c.cast_type = "SPHERE"; c.factor = cast
    apply_all(obj)

def smooth(obj, angle=38):
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]):
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
        except Exception:
            bpy.ops.object.shade_smooth()

def rbox(name, size, loc, mat, bevel, segments=4, rot=(0, 0, 0)):
    obj = mesh_obj(name, box_bm(*size), mat)
    obj.location = loc
    obj.rotation_euler = rot
    soften(obj, bevel, segments, subdiv=0)
    smooth(obj)
    return obj

def cylinder(name, r, depth, loc, mat, rot=(0, 0, 0), verts=32):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    obj = mesh_obj(name, bm, mat)
    obj.location = loc
    obj.rotation_euler = rot
    b = obj.modifiers.new("bevel", "BEVEL"); b.width = min(r, depth) * 0.25; b.segments = 3; b.limit_method = "ANGLE"
    apply_all(obj)
    smooth(obj)
    return obj

# ------------------------------------------------------------------ front housing
body = mesh_obj("Body", box_bm(W, DF, H), "housing")
pillow(body, support=0.085, levels=3, cast=0.07)

# Screen recess: boolean-cut a rounded slot into the front; recess walls get the bezel material.
cutter = mesh_obj("Cutter", box_bm(SCREEN_W + 0.035, 0.2, SCREEN_H + 0.035), "bezel")
cutter.location = (0, FRONT_Y - 0.1 + RECESS - 0.02, SCREEN_CZ)  # extra 0.02 covers the puffed face
soften(cutter, bevel=0.04, segments=6, subdiv=0)
bl = body.modifiers.new("recess", "BOOLEAN")
bl.operation = "DIFFERENCE"; bl.object = cutter; bl.solver = "EXACT"
try:
    bl.material_mode = "TRANSFER"
except Exception:
    pass
apply_all(body)
bpy.data.objects.remove(cutter, do_unlink=True)
# Recess face painting is disabled: the BezelPlate gives the dark ring, and painting by
# face position left sliver faces with mismatched color at the recess corners.
PAINT_RECESS = False
if "bezel" not in [m.name for m in body.data.materials]:
    body.data.materials.append(MAT["bezel"])
bezel_idx = [m.name for m in body.data.materials].index("bezel")
half_w, half_h = (SCREEN_W + 0.035) / 2 + 0.002, (SCREEN_H + 0.035) / 2 + 0.002
for p in body.data.polygons:
    c = p.center
    # Front of the housing only: without the y limit this also painted the back panel.
    in_recess = abs(c.x) < half_w and abs(c.z - SCREEN_CZ) < half_h and c.y < FRONT_Y + RECESS + 0.01
    is_wall = p.normal.y > -0.7
    is_floor = c.y >= FRONT_Y + RECESS - 0.02 - 0.003  # the cut floor behind the screen
    if PAINT_RECESS and in_recess and (is_wall or is_floor):
        p.material_index = bezel_idx
smooth(body, 80)  # shells are Catmull-smooth; only the near-90° recess/slot edges stay sharp

# ------------------------------------------------------------------ rear hood (CRT bulge), tapered
# The hood's front must stay INSIDE the body everywhere. The body's flat back face only
# spans |x| < 0.195, |z| < 0.145 (W/2 or H/2 minus the 0.105 bevel), so the hood is
# sized to pass through that flat area and never reach the rounded corners. (An earlier,
# wider hood poked out of the body's top-left/right corners. check_monitor.py guards this.)
bm = box_bm(1, 1, 1)
for v in bm.verts:
    if v.co.y < 0:   # front of hood, buried inside the body
        v.co.x *= 0.38; v.co.z *= 0.27; v.co.y = 0.0
    else:            # back of hood
        v.co.x *= 0.28; v.co.z *= 0.23; v.co.y = 0.42; v.co.z -= 0.02
hood = mesh_obj("Hood", bm, "housing")
pillow(hood, support=0.07, levels=3, cast=0.05)
smooth(hood, 34)

# ------------------------------------------------------------------ surface probes (the faces are puffed, so measure them)
def surface_y(x, z):
    """Front surface of the body at (x, z): ray from the front along +y."""
    ok, loc, *_ = body.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return loc.y if ok else FRONT_Y

def surface_z(x, y):
    """Top surface of the body at (x, y): ray from above along -z."""
    ok, loc, *_ = body.ray_cast(Vector((x, y, 1.0)), Vector((0, 0, -1)))
    return loc.z if ok else H / 2

# ------------------------------------------------------------------ curved screen glass (UV 0..1)
bm = bmesh.new()
bm.loops.layers.uv.new("UVMap")  # create_grid only writes UVs into an existing layer
bmesh.ops.create_grid(bm, x_segments=28, y_segments=22, size=0.5, calc_uvs=True)
for v in bm.verts:
    nx, ny = v.co.x / 0.5, v.co.y / 0.5          # -1..1
    v.co.x *= SCREEN_W; v.co.y *= SCREEN_H
    v.co.z = 0.013 * (1 - nx * nx) * (1 - ny * ny)  # convex CRT face
screen = mesh_obj("Screen", bm, "screen")
screen.rotation_euler = (math.radians(90), 0, 0)  # grid +y -> +z (up), normal +z -> -y (front)
recess_floor_y = surface_y(0, SCREEN_CZ)  # the ray hits the recess floor
screen.location = (0, recess_floor_y - 0.003, SCREEN_CZ)
for p in screen.data.polygons:
    p.use_smooth = True

# Bezel plate: a thin taupe plate on the recess floor, behind the screen, so the ring
# around the glass reads darker than the housing. Its corners are rounded in the XZ plane
# (only the four depth edges are beveled) to match the recess cut.
bm = box_bm(SCREEN_W + 0.035 - 0.014, 0.003, SCREEN_H + 0.035 - 0.014)
depth_edges = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) > 1e-4]
bmesh.ops.bevel(bm, geom=depth_edges, offset=0.046, segments=8, affect="EDGES", profile=0.5)
plate = mesh_obj("BezelPlate", bm, "bezel")
plate.location = (0, recess_floor_y - 0.0016, SCREEN_CZ)

# ------------------------------------------------------------------ chin: vents, knobs, status LED
chin_z = SCREEN_CZ - SCREEN_H / 2 - 0.06
for i in range(7):
    x = -0.20 + i * 0.045
    rbox(f"ChinVent{i}", (0.034, 0.012, 0.008), (x, surface_y(x, chin_z) + 0.003, chin_z), "grille", 0.003, 2)
for i, x in enumerate((0.13, 0.18)):
    cylinder(f"Knob{i}", 0.014, 0.018, (x, surface_y(x, chin_z) - 0.006, chin_z), "knob", rot=(math.radians(90), 0, 0), verts=20)
cylinder("Led", 0.006, 0.01, (0.235, surface_y(0.235, chin_z) - 0.002, chin_z), "led", rot=(math.radians(90), 0, 0), verts=16)

# ------------------------------------------------------------------ top vents
# Real slots cut into the domed top (raised bars on a curved surface stuck up at their
# ends). Each slot gets a dark backing strip at its floor so it reads as a vent.
SLOT_Y0, SLOT_Y1, SLOT_DEPTH = -0.035, 0.045, 0.011
slot_x = [-0.15 + i * 0.05 for i in range(7)]
slot_floor = {}
for i, x in enumerate(slot_x):
    zmin = min(surface_z(x, y) for y in (SLOT_Y0, (SLOT_Y0 + SLOT_Y1) / 2, SLOT_Y1))
    floor = zmin - SLOT_DEPTH
    slot_floor[x] = floor
    c = mesh_obj(f"SlotCutter{i}", box_bm(0.016, SLOT_Y1 - SLOT_Y0, 0.08), "grille")
    c.location = (x, (SLOT_Y0 + SLOT_Y1) / 2, floor + 0.04)
    soften(c, bevel=0.0075, segments=4, subdiv=0)
    mod = body.modifiers.new(f"slot{i}", "BOOLEAN")
    mod.operation = "DIFFERENCE"; mod.object = c; mod.solver = "EXACT"
    apply_all(body)
    bpy.data.objects.remove(c, do_unlink=True)
smooth(body, 80)  # shells are Catmull-smooth; only the near-90° recess/slot edges stay sharp
for i, x in enumerate(slot_x):
    rbox(f"TopVent{i}", (0.02, SLOT_Y1 - SLOT_Y0 + 0.004, 0.008), (x, (SLOT_Y0 + SLOT_Y1) / 2, slot_floor[x] - 0.001), "grille", 0.003, 2)

# ------------------------------------------------------------------ yoke (U-bracket) + arm mount
# One continuous swept piece (user: the old crossbar sitting on two straight arms looked like
# separate blocks): a rounded-rectangle section swept up each arm, around a smooth bend and
# across the top, so the arms flow into the bar on both sides. Round bosses finish the arm ends
# at the hub axis.
hub_x = W / 2 + 0.012
ARM_X = hub_x + 0.034          # arm centerline
YOKE_T, YOKE_D = 0.054, 0.085  # section: in-plane thickness, depth (y)
YOKE_RC = 0.02                 # section corner radius
YOKE_BEND = 0.075              # centerline bend radius at the top corners

def yoke_path():
    """Centerline in the XZ plane with unit tangents: up the left arm, bend, across, bend, down."""
    pts = []
    def add(x, z, tx, tz):
        if pts and abs(pts[-1][0] - x) < 1e-6 and abs(pts[-1][1] - z) < 1e-6:
            return
        pts.append((x, z, tx, tz))
    z_top = YOKE_TOP
    for i in range(9):  # left arm, from the hub axis up
        add(-ARM_X, (z_top - YOKE_BEND) * i / 8, 0, 1)
    cx, cz = -ARM_X + YOKE_BEND, z_top - YOKE_BEND
    for i in range(1, 25):  # bend: 180 deg -> 90 deg around (cx, cz)
        a = math.pi - (math.pi / 2) * i / 24
        add(cx + YOKE_BEND * math.cos(a), cz + YOKE_BEND * math.sin(a), math.sin(a), -math.cos(a))
    for i in range(1, 13):  # crossbar
        x = -ARM_X + YOKE_BEND + (2 * (ARM_X - YOKE_BEND)) * i / 12
        add(x, z_top, 1, 0)
    cx = ARM_X - YOKE_BEND
    for i in range(1, 25):  # bend: 90 deg -> 0 deg
        a = math.pi / 2 - (math.pi / 2) * i / 24
        add(cx + YOKE_BEND * math.cos(a), cz + YOKE_BEND * math.sin(a), math.sin(a), -math.cos(a))
    for i in range(1, 9):  # right arm, down to the hub axis
        add(ARM_X, (z_top - YOKE_BEND) * (1 - i / 8), 0, -1)
    return pts

def rounded_rect(hu, hv, r, seg=6):
    """Profile points (u, v) counter-clockwise."""
    out = []
    for cu, cv, a0 in ((hu - r, hv - r, 0), (-hu + r, hv - r, 90), (-hu + r, -hv + r, 180), (hu - r, -hv + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            out.append((cu + r * math.cos(a), cv + r * math.sin(a)))
    return out

def sweep(name, path, profile, mat):
    bm = bmesh.new()
    rings = []
    for (x, z, tx, tz) in path:
        nx, nz = tz, -tx  # in-plane normal
        rings.append([bm.verts.new((x + nx * u, v, z + nz * u)) for (u, v) in profile])
    n = len(profile)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            f = bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
            f.smooth = True
    for ring, rev in ((rings[0], True), (rings[-1], False)):
        f = bm.faces.new(list(reversed(ring)) if rev else ring)
        f.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, mat)

yoke = sweep("YokeU", yoke_path(), rounded_rect(YOKE_T / 2, YOKE_D / 2, YOKE_RC), "yoke")
smooth(yoke, 50)
for s in (-1, 1):
    side = 'L' if s < 0 else 'R'
    cylinder(f"Hub{side}", 0.055, 0.03, (s * hub_x, 0.0, 0.0), "steel", rot=(0, math.radians(90), 0), verts=48)
    # Round boss at the arm's end, the same depth as the arm, so the arm ends in a smooth half-round.
    # 8 mm wider than the arm: flush faces were coplanar with the arm's sides and flickered dark.
    cylinder(f"YokeBoss{side}", YOKE_D / 2 + 0.002, YOKE_T + 0.008, (s * ARM_X, 0.0, 0.0), "yoke", rot=(0, math.radians(90), 0), verts=48)
cylinder("Mount", 0.075, 0.07, (0, 0.0, YOKE_TOP + 0.035), "steel", verts=48)

# ------------------------------------------------------------------ origin at the attachment point; parent everything
# Hierarchy: Monitor (origin = arm attachment)
#              ├─ yoke parts (fixed)
#              └─ Tilt (empty at the hub axis) ─ housing parts: the site rotates Tilt.x
#                 to angle the screen toward the viewer.
root = link(bpy.data.objects.new("Monitor", None))
tilt = link(bpy.data.objects.new("Tilt", None))
tilt.location = (0, 0, -ATTACH_Z)
tilt.parent = root
HOUSING = ("Body", "Hood", "Screen", "BezelPlate", "ChinVent", "Knob", "Led", "TopVent", "Hub")
for obj in list(scene.objects):
    if obj.type != "MESH":
        continue
    if obj.name.startswith(HOUSING):
        obj.parent = tilt  # coordinates are already relative to the hub axis (z = 0)
    else:
        obj.location.z -= ATTACH_Z
        obj.parent = root

# ------------------------------------------------------------------ export
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(OUT),
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_materials="EXPORT",
    export_draco_mesh_compression_enable=False,
)
tris = 0
for o in scene.objects:
    if o.type == "MESH":
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
print(f"[monitor] exported {OUT}  objects={len([o for o in scene.objects if o.type == 'MESH'])}  tris={tris}")

# ------------------------------------------------------------------ preview renders (Cycles CPU)
if PREVIEW:
    os.makedirs(os.path.dirname(os.path.abspath(PREVIEW)), exist_ok=True)
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 700
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        pass  # Fedora Blender RPM: OCIO config newer than the OCIO library -> only "Standard"
    world = bpy.data.worlds.new("w"); scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.05, 0.055, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.6

    def light(name, kind, loc, energy, size=1.0, rot=(0, 0, 0)):
        ld = bpy.data.lights.new(name, kind); ld.energy = energy
        if kind == "AREA": ld.size = size
        lo = link(bpy.data.objects.new(name, ld)); lo.location = loc; lo.rotation_euler = rot
        return lo
    key = light("key", "AREA", (1.2, -1.6, 1.0), 220, 1.2)
    key.rotation_euler = (Vector((0, 0, -ATTACH_Z * 0.5)) - key.location).to_track_quat("-Z", "Y").to_euler()
    fill = light("fill", "AREA", (-1.6, -0.8, 0.2), 60, 1.5)
    fill.rotation_euler = (Vector((0, 0, -ATTACH_Z * 0.5)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    top = light("top", "AREA", (0, 0.2, 1.4), 90, 1.0)

    cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 50
    cam = link(bpy.data.objects.new("cam", cam_data)); scene.camera = cam
    target = Vector((0, 0.08, -ATTACH_Z + 0.08))
    for tag, loc in (("front34", (0.85, -1.55, 0.05)), ("side", (1.75, 0.1, -0.15)), ("front", (0.0, -1.7, -0.25))):
        cam.location = loc
        cam.rotation_euler = (target - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.abspath(f"{PREVIEW}_{tag}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[monitor] preview {scene.render.filepath}")
