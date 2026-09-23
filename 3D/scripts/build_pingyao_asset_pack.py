import bpy
import json
import math
import os
from mathutils import Vector


ROOT = r"C:\Users\32768\Desktop\project\平遥游戏"
WORK = os.path.join(ROOT, "3D")
SOURCE = os.path.join(ROOT, "src", "平遥古城沉浸式游戏", "static", "models", "pingyao-hanfu-courtyard.glb")
BROCADE = os.path.join(WORK, "textures", "pingyao-brocade-512.png")
OUTPUT = os.path.join(WORK, "exports")
PREVIEWS = os.path.join(WORK, "previews")
PROJECT = os.path.join(WORK, "pingyao-hero-atelier.blend")

for folder in (OUTPUT, PREVIEWS):
    os.makedirs(folder, exist_ok=True)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    for data_blocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.materials,
        bpy.data.actions,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for data_block in list(data_blocks):
            if data_block.users == 0:
                data_blocks.remove(data_block)


def rgba(hex_value):
    value = hex_value.lstrip("#")
    srgb = tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    linear = tuple(channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in srgb)
    return linear + (1.0,)


def principled(material):
    material.use_nodes = True
    return next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")


def make_material(name, color, roughness=0.65, metallic=0.0, emission=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    shader = principled(material)
    shader.inputs["Base Color"].default_value = rgba(color)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        shader.inputs["Emission Color"].default_value = rgba(emission[0])
        shader.inputs["Emission Strength"].default_value = emission[1]
    material.diffuse_color = rgba(color)
    return material


def add_brocade_material():
    material = bpy.data.materials.get("Pingyao_Brocade") or bpy.data.materials.new("Pingyao_Brocade")
    shader = principled(material)
    shader.inputs["Roughness"].default_value = 0.58
    shader.inputs["Metallic"].default_value = 0.04
    shader.inputs["Sheen Weight"].default_value = 0.16
    nodes = material.node_tree.nodes
    for node in list(nodes):
        if node.type == "TEX_IMAGE":
            nodes.remove(node)
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(BROCADE, check_existing=True)
    texture.interpolation = "Linear"
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    return material


def set_imported_materials(brocade):
    palette = {
        "Cloth": ("#5D1118", 0.66, 0.0),
        "Robe": ("#25282A", 0.72, 0.0),
        "Skin": ("#D79B78", 0.48, 0.0),
        "Hair": ("#171719", 0.54, 0.0),
        "Hair_detail": ("#292529", 0.58, 0.0),
        "Hat": ("#202126", 0.72, 0.0),
        "Leather": ("#40271F", 0.68, 0.0),
        "Metal": ("#AA7D32", 0.30, 0.76),
        "Jade": ("#4C8873", 0.28, 0.08),
        "Shoes": ("#1A1D1E", 0.78, 0.0),
        "Soles": ("#B49F7B", 0.82, 0.0),
        "Eye_white": ("#E9E3D8", 0.40, 0.0),
        "Eye_iris": ("#405C50", 0.30, 0.0),
        "Eye_pupil": ("#090B0D", 0.24, 0.0),
        "Face_lip": ("#914E4A", 0.58, 0.0),
        "Face_ear": ("#C88470", 0.60, 0.0),
        "Face_shadow": ("#6B4237", 0.90, 0.0),
        "Paper": ("#D8CBB0", 0.88, 0.0),
    }
    for name, (color, roughness, metal) in palette.items():
        material = next((item for item in bpy.data.materials if item.name.split(".")[0] == name), None)
        if material:
            shader = principled(material)
            shader.inputs["Base Color"].default_value = rgba(color)
            shader.inputs["Roughness"].default_value = roughness
            shader.inputs["Metallic"].default_value = metal
            if name == "Skin":
                shader.inputs["Subsurface Weight"].default_value = 0.055
                shader.inputs["Subsurface Scale"].default_value = 0.035
            if name in ("Cloth", "Robe", "Hat"):
                shader.inputs["Sheen Weight"].default_value = 0.12
            material.diffuse_color = rgba(color)
    trim = next((item for item in bpy.data.materials if item.name.split(".")[0] == "Trim"), None)
    if trim:
        for obj in bpy.data.objects:
            if obj.type == "MESH":
                for index, material in enumerate(obj.data.materials):
                    if material == trim:
                        obj.data.materials[index] = brocade


def mesh_object(name, vertices, faces, material, collection):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    if material:
        obj.data.materials.append(material)
    return obj


def box(name, center, size, material, collection, rotation=(0.0, 0.0, 0.0)):
    x, y, z = (value / 2 for value in size)
    vertices = [
        (-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
        (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z),
    ]
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (4, 0, 3, 7)]
    obj = mesh_object(name, vertices, faces, material, collection)
    obj.location = center
    obj.rotation_euler = rotation
    return obj


def cylinder_between(name, start, end, radius, material, collection, sides=10, end_radius=None):
    start, end = Vector(start), Vector(end)
    direction = end - start
    length = direction.length
    end_radius = radius if end_radius is None else end_radius
    vertices = []
    for z, ring_radius in ((-length / 2, radius), (length / 2, end_radius)):
        for i in range(sides):
            angle = math.tau * i / sides
            vertices.append((math.cos(angle) * ring_radius, math.sin(angle) * ring_radius, z))
    faces = []
    for i in range(sides):
        j = (i + 1) % sides
        faces.append((i, j, sides + j, sides + i))
    faces.extend([tuple(range(sides - 1, -1, -1)), tuple(range(sides, sides * 2))])
    obj = mesh_object(name, vertices, faces, material, collection)
    obj.location = (start + end) / 2
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def configure_outfit_names_and_visibility():
    families = ("hw_", "acc_")
    grouped = {}
    for obj in bpy.data.objects:
        if obj.type != "MESH" or not obj.name.startswith(families):
            continue
        family = obj.name.split(".")[0]
        grouped.setdefault(family, []).append(obj)
    for family, objects in grouped.items():
        for index, obj in enumerate(sorted(objects, key=lambda item: item.name)):
            obj.name = f"{family}_{index}"
            visible = family == "hw_merchant-crown" or family in ("acc_ledger", "acc_jade", "acc_tassel")
            obj.hide_viewport = not visible
            obj.hide_render = not visible


def build_props(collection, materials):
    wood, paper, gold, stone, ember = (materials[key] for key in ("wood", "paper", "gold", "stone", "ember"))

    lantern = bpy.data.objects.new("Prop_Lantern_Root", None)
    collection.objects.link(lantern)
    for z, width in ((0.08, 0.58), (0.82, 0.58)):
        part = box(f"Lantern_Frame_{z}", (0, 0, z), (width, 0.50, 0.08), wood, collection)
        part.parent = lantern
    for x in (-0.255, 0.255):
        for y in (-0.215, 0.215):
            post = cylinder_between("Lantern_Post", (x, y, 0.10), (x, y, 0.80), 0.025, wood, collection, 8)
            post.parent = lantern
    for y in (-0.221, 0.221):
        panel = box("Lantern_Paper", (0, y, 0.45), (0.46, 0.018, 0.62), paper, collection)
        panel.parent = lantern
    core = box("Lantern_Warm_Core", (0, 0, 0.45), (0.30, 0.28, 0.50), ember, collection)
    core.parent = lantern
    tassel = cylinder_between("Lantern_Tassel", (0, 0, 0.04), (0, 0, -0.38), 0.035, gold, collection, 9, 0.012)
    tassel.parent = lantern
    lantern.location = (-1.4, 0.0, 0.38)

    sign = bpy.data.objects.new("Prop_Piaohao_Sign_Root", None)
    collection.objects.link(sign)
    for x in (-0.55, 0.55):
        pole = cylinder_between("Sign_Post", (x, 0, 0), (x, 0, 1.65), 0.055, wood, collection, 10)
        pole.parent = sign
    board = box("Sign_Board", (0, 0, 1.18), (1.35, 0.16, 0.62), wood, collection)
    board.parent = sign
    inset = box("Sign_Inset", (0, -0.092, 1.18), (1.15, 0.026, 0.43), materials["red"], collection)
    inset.parent = sign
    for x in (-0.62, 0.62):
        finial = cylinder_between("Sign_Finial", (x, 0, 1.57), (x, 0, 1.78), 0.085, gold, collection, 8, 0.025)
        finial.parent = sign
    sign.location = (1.25, 0.3, 0)

    burner = bpy.data.objects.new("Prop_Incense_Burner_Root", None)
    collection.objects.link(burner)
    bowl = cylinder_between("Burner_Bowl", (0, 0, 0.25), (0, 0, 0.62), 0.35, stone, collection, 12, 0.28)
    bowl.parent = burner
    rim = cylinder_between("Burner_Rim", (0, 0, 0.61), (0, 0, 0.70), 0.40, gold, collection, 12, 0.38)
    rim.parent = burner
    for x in (-0.20, 0.20):
        foot = cylinder_between("Burner_Foot", (x, 0, 0), (x, 0, 0.27), 0.07, stone, collection, 8, 0.05)
        foot.parent = burner
    for x in (-0.12, 0, 0.12):
        stick = cylinder_between("Incense_Stick", (x, 0, 0.66), (x, 0, 1.22 + 0.06 * (x == 0)), 0.009, materials["red"], collection, 6)
        stick.parent = burner
    burner.location = (0.0, 1.1, 0)


def make_preview_scene(hero_collection, prop_collection, materials):
    preview = bpy.data.collections.new("PREVIEW_ONLY")
    bpy.context.scene.collection.children.link(preview)
    ground = cylinder_between("Preview_Platform", (0, 0, -0.14), (0, 0, 0), 3.2, materials["ground"], preview, 64)
    ground["preview_only"] = True
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    preview.objects.link(camera)
    camera.location = (3.15, -5.3, 2.25)
    camera.data.lens = 72
    camera.data.sensor_width = 36
    camera.rotation_euler = (Vector((0, 0, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    for name, location, energy, size, color in (
        ("Key", (3, -4, 4), 620, 3.0, (1.0, 0.72, 0.55)),
        ("Fill", (-3, -2, 2.6), 360, 3.5, (0.52, 0.68, 1.0)),
        ("Rim", (1.5, 2.5, 3.7), 520, 2.5, (1.0, 0.28, 0.12)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        preview.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0, 0, 1.0)) - light.location).to_track_quat("-Z", "Y").to_euler()
    world = bpy.context.scene.world
    world.use_nodes = True
    background = next(node for node in world.node_tree.nodes if node.type == "BACKGROUND")
    background.inputs["Color"].default_value = (0.012, 0.008, 0.006, 1.0)
    background.inputs["Strength"].default_value = 0.22


def render_previews(rig, hero_collection, prop_collection):
    scene = bpy.context.scene
    scene.render.resolution_x = 800
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.film_transparent = False
    for obj in prop_collection.all_objects:
        obj.hide_render = True
    rig.animation_data.action = bpy.data.actions.get("Idle")
    scene.frame_set(8)
    scene.render.filepath = os.path.join(PREVIEWS, "hero-final.png")
    bpy.ops.render.render(write_still=True)
    rig.animation_data.action = bpy.data.actions.get("Interact")
    scene.frame_set(28)
    scene.render.filepath = os.path.join(PREVIEWS, "hero-interact.png")
    bpy.ops.render.render(write_still=True)
    for obj in hero_collection.all_objects:
        obj.hide_render = True
    for obj in prop_collection.all_objects:
        obj.hide_render = False
    camera = bpy.data.objects["PreviewCamera"]
    camera.location = (4.4, -7.6, 3.2)
    camera.data.lens = 62
    camera.rotation_euler = (Vector((0, 0.25, 0.78)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 720
    scene.render.filepath = os.path.join(PREVIEWS, "street-props.png")
    bpy.ops.render.render(write_still=True)
    for obj in hero_collection.all_objects:
        obj.hide_render = False


def export_selected(filepath, objects, animations):
    visibility = {obj: (obj.hide_viewport, obj.hide_render) for obj in objects}
    for obj in objects:
        obj.hide_viewport = False
        obj.hide_render = False
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_skins=animations,
        export_animations=animations,
        export_animation_mode="ACTIONS",
        export_anim_single_armature=True,
        export_force_sampling=False,
        export_optimize_animation_size=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    for obj, (hide_viewport, hide_render) in visibility.items():
        obj.hide_viewport = hide_viewport
        obj.hide_render = hide_render


clear_scene()
bpy.ops.import_scene.gltf(
    filepath=SOURCE,
    import_pack_images=True,
    merge_vertices=False,
    import_shading="NORMALS",
    import_scene_as_collection=True,
)
if bpy.data.objects.get("Icosphere"):
    bpy.data.objects.remove(bpy.data.objects["Icosphere"], do_unlink=True)

hero_collection = bpy.data.collections.new("HERO_EXPORT")
bpy.context.scene.collection.children.link(hero_collection)
rig = bpy.data.objects["Rig"]
for obj in list(bpy.data.objects):
    if obj == rig or obj.parent == rig:
        for old_collection in list(obj.users_collection):
            old_collection.objects.unlink(obj)
        hero_collection.objects.link(obj)
rig["pingyaoDetailed"] = True
rig["detailed"] = True
rig["assetVersion"] = 4
rig["assetRole"] = "merchant-scholar"
bpy.context.scene["detailed"] = True
bpy.context.scene["pingyaoDetailed"] = True
if "blendermcp_server_running" in bpy.context.scene:
    del bpy.context.scene["blendermcp_server_running"]

brocade = add_brocade_material()
set_imported_materials(brocade)
materials = {
    "brocade": brocade,
    "hair": make_material("Hero_Hair", "#171719", 0.52),
    "gold": make_material("Aged_Gold", "#B3873C", 0.30, 0.72),
    "wood": make_material("Lacquered_Wood", "#3B1E18", 0.58),
    "paper": make_material("Lantern_Paper", "#F1C88A", 0.72, 0, ("#EF8D38", 0.35)),
    "stone": make_material("Pingyao_Stone", "#69625C", 0.86),
    "ember": make_material("Lantern_Ember", "#F2A44B", 0.34, 0, ("#F06A1B", 3.0)),
    "red": make_material("Cinnabar_Lacquer", "#7A2028", 0.48),
    "ground": make_material("Preview_Ground", "#211817", 0.93),
}
rig.animation_data.action = bpy.data.actions.get("Idle")
bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
configure_outfit_names_and_visibility()

prop_collection = bpy.data.collections.new("PROPS_EXPORT")
bpy.context.scene.collection.children.link(prop_collection)
build_props(prop_collection, materials)
make_preview_scene(hero_collection, prop_collection, materials)

hero_objects = list(hero_collection.all_objects)
prop_objects = list(prop_collection.all_objects)
export_selected(os.path.join(OUTPUT, "pingyao-merchant-hero.glb"), hero_objects, True)
export_selected(os.path.join(OUTPUT, "pingyao-street-props.glb"), prop_objects, False)
render_previews(rig, hero_collection, prop_collection)
bpy.ops.wm.save_as_mainfile(filepath=PROJECT, check_existing=False)

mesh_objects = [obj for obj in hero_objects if obj.type == "MESH"]
triangles = sum(len(obj.data.loop_triangles) for obj in mesh_objects)
manifest = {
    "hero": {
        "file": "exports/pingyao-merchant-hero.glb",
        "heightMeters": 1.894,
        "meshObjects": len(mesh_objects),
        "triangles": triangles,
        "animations": [action.name for action in bpy.data.actions if action.name in {"Idle", "Walking_A", "Running_A", "Interact", "Cheer"}],
        "materials": sorted({slot.material.name for obj in mesh_objects for slot in obj.material_slots if slot.material}),
    },
    "props": {
        "file": "exports/pingyao-street-props.glb",
        "roots": ["Prop_Lantern_Root", "Prop_Piaohao_Sign_Root", "Prop_Incense_Burner_Root"],
        "meshObjects": len([obj for obj in prop_objects if obj.type == "MESH"]),
    },
    "source": "Existing project-compatible animation rig and original geometry, refined in Blender MCP",
    "texture": "textures/pingyao-brocade-512.png",
}
with open(os.path.join(WORK, "asset-manifest.json"), "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)
print(json.dumps(manifest, ensure_ascii=False))
