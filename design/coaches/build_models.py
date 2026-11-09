"""Build the editable geometry, glTF models, and rendered portraits for Notrude."""

from pathlib import Path
import math

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[2] / "public" / "coaches"

COACHES = {
    "river": {
        "name": "River", "jacket": "#39746C", "trim": "#A4C1A0", "pants": "#324945",
        "skin": "#E8B999", "hair": "#4E342D", "shoe": "#EFE1BF", "detail": "beanie",
    },
    "jax": {
        "name": "Jax", "jacket": "#EEA638", "trim": "#FFF2D1", "pants": "#4A3743",
        "skin": "#90563C", "hair": "#302328", "shoe": "#F8D8B0", "detail": "headband",
    },
    "sol": {
        "name": "Sol", "jacket": "#B95437", "trim": "#E8AC7F", "pants": "#4F403D",
        "skin": "#BD815F", "hair": "#342624", "shoe": "#F3D5AC", "detail": "bun",
    },
    "nova": {
        "name": "Nova", "jacket": "#7777D5", "trim": "#B9BDF7", "pants": "#373A61",
        "skin": "#F0BDAB", "hair": "#45354F", "shoe": "#E5E1FF", "detail": "visor",
    },
}


def linear_srgb(channel):
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def material(name, hex_color, roughness=0.67):
    color = tuple(linear_srgb(int(hex_color[i:i + 2], 16) / 255) for i in (1, 3, 5))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat


def oval(name, location, scale, mat, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def limb(name, start, end, width, mat):
    start, end = Vector(start), Vector(end)
    direction = end - start
    obj = oval(name, (start + end) / 2, (width, width, direction.length / 2 + width * 0.65), mat)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def stroke(name, points, mat, width=0.022):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = width
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coords in zip(spline.bezier_points, points):
        point.co = coords
        point.handle_left_type = point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)


def build(coach):
    jacket, trim, pants, skin, hair, shoe = (
        material(key, coach[key]) for key in ("jacket", "trim", "pants", "skin", "hair", "shoe")
    )
    ink = material("Eyes and expression", "#291E29", 0.36)
    sparkle = material("Eye glint", "#FFF9EF", 0.35)
    cheek = material("Cheek tint", "#C97362")
    kind = coach["detail"]

    for side in (-1, 1):
        x = side * 0.25
        limb("Trouser leg", (x * 0.83, 0, 1.36), (x * 1.17, 0.015, 0.36), 0.20, pants)
        oval("Sneaker upper", (x * 1.20, -0.155, 0.265), (0.245, 0.39, 0.195), shoe)
        oval("Sneaker outsole", (x * 1.20, -0.16, 0.14), (0.254, 0.40, 0.10), trim)
        stroke("Sneaker seam", [(x * 1.20 - .09, -.36, .39), (x * 1.20, -.40, .40), (x * 1.20 + .09, -.36, .39)], trim, .017)
    oval("Training jacket", (0, 0, 1.50), (0.57, 0.35, 0.63), jacket)
    oval("Collar", (0, -0.01, 2.01), (0.34, 0.30, 0.155), trim)
    if kind == "headband":
        stroke("Track jacket chevron", [(-.40, -.27, 1.84), (0, -.36, 1.57), (.40, -.27, 1.84)], trim, .045)
    else:
        stroke("Jacket zip", [(0, -.27, 1.98), (0, -.351, 1.66), (0, -.33, 1.28)], trim, .022)
    oval("Trail patch", (-.25, -.322, 1.73), (.075, .026, .075), shoe, 12, 8)

    # Each coach has a different resting gesture, readable from the front.
    hand_positions = {
        "beanie": ((-.71, -.08, 1.23), (.70, -.14, 1.28)),
        "headband": ((-.74, -.15, 1.29), (.95, -.04, 2.04)),
        "bun": ((-.39, -.44, 1.52), (.43, -.47, 1.57)),
        "visor": ((-.85, -.16, 1.48), (.85, -.17, 1.49)),
    }
    for side, hand in zip((-1, 1), hand_positions[kind]):
        elbow = (side * .73, .015, 1.60 if kind == "headband" else 1.46)
        limb("Upper sleeve", (side * .43, 0, 1.83), elbow, .162, jacket)
        limb("Forearm sleeve", elbow, hand, .14, jacket)
        oval("Sleeve cuff", hand, (.153, .139, .132), trim)
        oval("Hand", (hand[0], hand[1] - .072, hand[2] + (.10 if hand[2] > 1.8 else -.09)),
             (.132, .135, .155), skin)

    oval("Hair silhouette", (0, .15, 2.65), (.735, .60, .73), hair)
    for side in (-1, 1):
        oval("Ear", (side * .665, -.02, 2.57), (.14, .17, .19), skin)
    oval("Face", (0, -.155, 2.59), (.66, .555, .655), skin, 24, 16)
    for side in (-1, 1):
        x = side * .228
        oval("Eye", (x, -.678, 2.64), (.066, .026, .086), ink)
        oval("Eye glint", (x - .017, -.703, 2.667), (.018, .009, .018), sparkle, 10, 6)
        oval("Cheek", (side * .396, -.583, 2.476), (.075, .023, .043), cheek, 12, 8)
        stroke("Brow", [(x - .072, -.649, 2.79), (x, -.66, 2.822),
                        (x + .071, -.648, 2.804)], hair, .020)
    oval("Nose", (0, -.706, 2.532), (.072, .068, .060), skin)
    stroke("Smile", [(-.102, -.666, 2.397), (.01, -.689, 2.36), (.116, -.663, 2.407)], ink, .021)

    if kind == "beanie":
        oval("Trail beanie", (0, .035, 3.10), (.726, .614, .43), jacket, 24, 14)
        oval("Folded beanie cuff", (0, -.047, 2.999), (.753, .602, .138), trim, 24, 12)
        oval("Beanie patch", (.24, -.617, 3.001), (.091, .025, .069), shoe)
        oval("Yarn pom", (0, .06, 3.51), (.145, .145, .134), trim)
    elif kind == "headband":
        for index in range(8):
            angle = math.pi * index / 7
            oval("Curl", (.53 * math.cos(angle), -.05 + .10 * math.sin(angle),
                         3.08 + .25 * math.sin(angle)), (.225, .44, .242), hair)
        oval("Athletic headband", (0, -.015, 2.963), (.725, .607, .108), trim, 24, 12)
    elif kind == "bun":
        oval("Top knot", (.23, .23, 3.42), (.30, .28, .27), hair)
        stroke("Top knot tie", [(-.03, .105, 3.33), (.14, -.018, 3.31), (.38, .025, 3.34)], trim, .045)
        sweep = oval("Side sweep", (-.21, -.356, 3.055), (.49, .33, .212), hair, 20, 12)
        sweep.rotation_euler.y = math.radians(-18)
        for side in (-1, 1):
            oval("Earring", (side * .706, -.109, 2.463), (.05, .042, .06), trim)
    else:
        oval("Swept hair", (-.11, -.105, 3.13), (.67, .55, .27), hair)
        oval("Visor band", (0, -.018, 2.973), (.738, .607, .112), jacket, 24, 12)
        oval("Visor brim", (.086, -.55, 2.969), (.68, .365, .079), trim, 24, 12)
        oval("Visor badge", (0, -.875, 2.979), (.077, .035, .035), shoe)
        for side in (-1, 1):
            oval("Headphone cup", (side * .704, .09, 2.65), (.156, .214, .236), jacket)
            oval("Headphone cap", (side * .818, .09, 2.65), (.068, .16, .177), trim)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def light(name, location, energy, size):
    bpy.ops.object.light_add(type="AREA", location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = energy
    obj.data.shape = "DISK"
    obj.data.size = size
    point_at(obj, (0, 0, 2))


def portrait(path):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 56
    scene.cycles.use_denoising = False
    scene.world.color = (0.24, 0.24, 0.24)
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = 256
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 88
    scene.render.filepath = str(path)
    scene.view_settings.view_transform = "AgX"
    light("Softbox key", (-3, -4, 6), 430, 4)
    light("Softbox fill", (4, -3, 3), 180, 4)
    light("Rim", (1, 2, 5), 330, 3)
    bpy.ops.object.camera_add(location=(1.1, -7, 3.65))
    camera = bpy.context.object
    point_at(camera, (0, 0, 2.75))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.08
    scene.camera = camera
    bpy.ops.render.render(write_still=True)


OUT.mkdir(exist_ok=True, parents=True)
for slug, coach in COACHES.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(coach)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / f"{slug}.glb"), export_format="GLB",
        export_cameras=False, export_lights=False, export_texcoords=False,
        export_yup=True,
    )
    if bpy.context.scene.world is None:
        bpy.context.scene.world = bpy.data.worlds.new("Studio")
    portrait(OUT / f"{slug}.webp")
