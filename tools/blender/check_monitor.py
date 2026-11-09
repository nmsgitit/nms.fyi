"""
Interpenetration check for the monitor model: reports parts whose vertices poke OUT
through the front housing shell ("Body") where they should be hidden inside it, and
renders close-ups of the top corners.

  blender -b --factory-startup -P tools/blender/check_monitor.py -- \
      --glb public/models/monitor.glb --preview assets-src/previews/check
"""
import bpy, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
arg = lambda n, d=None: argv[argv.index(n) + 1] if n in argv else d
GLB = os.path.abspath(arg("--glb", "public/models/monitor.glb"))
PREVIEW = arg("--preview")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
dg = bpy.context.evaluated_depsgraph_get()
objs = {o.name: o for o in bpy.context.scene.objects if o.type == "MESH"}
body = next(o for n, o in objs.items() if n.startswith("Body"))
inv = body.matrix_world.inverted()

# Body bounds in its local space: only test vertices that fall within its depth range.
bb = [Vector(c) for c in body.bound_box]
ymin, ymax = min(v.y for v in bb), max(v.y for v in bb)

report = []
for name, o in sorted(objs.items()):
    if o is body or name.startswith(("Yoke", "Mount")):
        continue
    out = []
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        lp = inv @ w
        # The hood is meant to stick out behind the body. Only its part within the body's
        # depth (minus a margin for the back face) must stay hidden.
        if name.startswith("Hood") and lp.y > ymax - 0.012:
            continue
        ok, p, n, _ = body.closest_point_on_mesh(lp)
        if not ok:
            continue
        d = (lp - p).dot(n)  # > 0: outside the shell
        if d > 0.0008 and (lp - p).length < 0.08:
            out.append((d, w.copy()))
    if out:
        out.sort(key=lambda t: -t[0])
        worst = out[0]
        report.append((name, len(out), len(o.data.vertices), worst[0], worst[1]))

print("[check] body local y range %.3f..%.3f" % (ymin, ymax))
for name, n, tot, d, w in report:
    print(f"[check] {name:14s} {n:5d}/{tot:<5d} verts outside shell, worst {d*1000:.1f} mm at world ({w.x:+.3f}, {w.y:+.3f}, {w.z:+.3f})")
if not report:
    print("[check] no protrusions")

if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 32; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 800, 600
    world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.2
    for name, loc in (("key", (1.0, -1.2, 0.6)), ("top", (0.0, 0.0, 1.2))):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = 120; ld.size = 1.0
        lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector((0, 0, -0.45)) - lo.location).to_track_quat("-Z", "Y").to_euler()
    cd = bpy.data.cameras.new("cam"); cd.lens = 70
    cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam
    # glTF import is Z-up again with the front facing -Y; the origin is the arm attachment.
    for tag, loc, tgt in (("topfront", (0.0, -0.9, 0.35), (0, -0.05, -0.2)),
                          ("cornerL", (-0.55, -0.55, 0.15), (-0.22, 0.0, -0.2)),
                          ("rear34", (0.8, 0.9, 0.2), (0, 0.1, -0.4))):
        cam.location = loc
        cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.abspath(f"{PREVIEW}_{tag}.png")
        bpy.ops.render.render(write_still=True)
        print("[check] preview", sc.render.filepath)
