"""Lighting/camera helpers for the optional isolated Blender preview."""
import bpy, mathutils
def setup_render(res=(800,1000), engine='BLENDER_EEVEE'):
    sc = bpy.context.scene
    try: sc.render.engine = engine
    except Exception: sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.16,0.14,0.13,1); bg.inputs[1].default_value = 0.6
    sc.view_settings.view_transform = 'AgX'
    def light(name, loc, energy, size=2, color=(1,1,1)):
        l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
        o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (mathutils.Vector((0,0,1.2)) - mathutils.Vector(loc)).to_track_quat('-Z','Y').to_euler()
    light('Key', (2.2,-3.0,3.2), 900, 2.5, (1,.95,.88))
    light('Fill', (-3,-2,1.8), 300, 3, (.8,.86,1))
    light('Rim', (0,3.2,2.8), 600, 2, (1,.9,.8))
    ground = bpy.data.meshes.new('G'); import bmesh; bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, radius=6, segments=48); bm.to_mesh(ground)
    g = bpy.data.objects.new('Ground', ground); sc.collection.objects.link(g)
    gm = bpy.data.materials.new('GroundM'); gm.use_nodes=True; next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.33,.28,.25,1); g.data.materials.append(gm)

def camera(loc, target, lens=50):
    sc = bpy.context.scene
    c = bpy.data.cameras.new('Cam'); c.lens = lens
    o = bpy.data.objects.new('Cam', c); sc.collection.objects.link(o); sc.camera = o
    o.location = loc
    o.rotation_euler = (mathutils.Vector(target)-mathutils.Vector(loc)).to_track_quat('-Z','Y').to_euler()
    return o

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
