"""平遥古城 · 写实比例汉服主角构建脚本（Blender 5.2，可重复执行）。

    blender -b --factory-startup -P 3D/scripts/build_pingyao_human_hero.py -- [--preview]

底模与动作：Quaternius Universal Base Characters（Superhero 体型）与 Universal Animation
Library，均为 CC0，同一套 65 骨人形骨架，动作无需重定向。下载包放在 `.cache/quaternius/`
（ubc/、ual/ 解压目录），脚本只读取不修改。

服饰全部在本脚本中程序化生成并蒙皮：
  Robe_Upper   交领上身（由身体网格膨胀、平滑得到，权重直接继承身体）
  sl_*         窄袖 / 公服袖 / 广袖三档袖型（沿手臂骨链放样，按骨段分配权重）
  ol_long      及踝袍摆；ol_short 短打下摆（腰胯 + 双腿混合权重，行走时不撕裂）
  Collar_*     交领右衽领缘 + 中衣白领
  Belt / Sash  腰带与垂绦；Trousers 长裤；Shoes 布靴
  hw_*         七种头饰；acc_* 七种佩饰（沿用街景页既有换装命名规则）
贴图保存在 3D/textures/hanfu/（imagegen 网关生成的可平铺中性色织物，运行时按服饰着色）。
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
Q = os.path.join(ROOT, '.cache', 'quaternius')
BASE = os.path.join(Q, 'ubc', 'Universal Base Characters[Standard]', 'Base Characters', 'Godot - UE')
HAIR = os.path.join(Q, 'ubc', 'Universal Base Characters[Standard]', 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)')
UAL = os.path.join(Q, 'ual', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')
TEX = os.path.join(ROOT, '3D', 'textures', 'hanfu')
BUILD = os.path.join(ROOT, '.cache', 'hanfu-build')
OUT = os.path.join(ROOT, 'public', 'static', 'models', 'pingyao-hanfu-human.glb')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = '--preview' in ARGS

def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))) if b != a else float(x >= a)
    return t * t * (3 - 2 * t)

def lerp(a, b, t): return a + (b - a) * t

# ---------------------------------------------------------------- import helpers
def import_new(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]

def drop(objs):
    for o in objs:
        if o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)

def attach_hair(arm, name):
    objs = import_new(os.path.join(HAIR, name + '.gltf'))
    mesh = [o for o in objs if o.type == 'MESH' and not o.name.startswith('Icosphere')][0]
    rest = [o for o in objs if o is not mesh]
    mw = mesh.matrix_world.copy(); mesh.parent = arm; mesh.matrix_world = mw
    for m in mesh.modifiers:
        if m.type == 'ARMATURE': m.object = arm
    drop(rest)
    return mesh

# ---------------------------------------------------------------- materials
IMAGES = {}
def image(path, max_size=None):
    if path in IMAGES: return IMAGES[path]
    img = bpy.data.images.load(path)
    if max_size and max(img.size) > max_size:
        s = max_size / max(img.size); img.scale(int(img.size[0] * s), int(img.size[1] * s))
    IMAGES[path] = img
    return img

def material(name, color=(1, 1, 1), rough=0.8, metal=0.0, tex=None, normal=None, rough_tex=None, double=False, sheen=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if tex is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex
        if color != (1, 1, 1):
            mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            nt.links.new(t.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (*color, 1)
            nt.links.new(mix.outputs[2], p.inputs['Base Color'])
        else:
            nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    else:
        p.inputs['Base Color'].default_value = (*color, 1)
    if normal is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normal; t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    if rough_tex is not None:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = rough_tex; t.image.colorspace_settings.name = 'Non-Color'
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(t.outputs['Color'], sep.inputs['Color']); nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
    # sheen 会让 three.js 升级为 MeshPhysicalMaterial，移动端开销大；织物光泽交给贴图与粗糙度。
    m.use_backface_culling = not double
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)

# ---------------------------------------------------------------- mesh helpers
def new_obj(name, bm, mats, arm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.parent = arm
    mod = o.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
    for poly in me.polygons: poly.use_smooth = True
    return o

def set_weights(obj, fn):
    """fn(co) -> {bone: weight}; replaces all weights."""
    obj.vertex_groups.clear()
    groups = {}
    for v in obj.data.vertices:
        w = fn(v.co)
        tot = sum(w.values()) or 1
        for b, val in w.items():
            if val <= 1e-4: continue
            if b not in groups: groups[b] = obj.vertex_groups.new(name=b)
            groups[b].add([v.index], val / tot, 'REPLACE')

def transfer_weights(src, dst, only=None):
    """Nearest-surface interpolated weights from the body (before its hidden parts are removed)."""
    dst.vertex_groups.clear()
    for g in src.vertex_groups: dst.vertex_groups.new(name=g.name)
    mod = dst.modifiers.new('DT', 'DATA_TRANSFER'); mod.object = src
    mod.use_vert_data = True; mod.data_types_verts = {'VGROUP_WEIGHTS'}
    mod.vert_mapping = 'POLYINTERP_NEAREST'; mod.layers_vgroup_select_src = 'ALL'; mod.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = dst
    for o in bpy.context.selected_objects: o.select_set(False)
    dst.select_set(True)
    bpy.ops.object.modifier_move_to_index(modifier='DT', index=0)
    bpy.ops.object.modifier_apply(modifier='DT')

def cleanup_weights(obj, limit=4):
    bpy.context.view_layer.objects.active = obj
    for o in bpy.context.selected_objects: o.select_set(False)
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.01)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=limit)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

def bvh_of(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.transform(obj.matrix_world)
    tree = BVHTree.FromBMesh(bm); bm.free(); return tree

def duplicate_region(src, name, keep, mats):
    """Copy of the body faces whose every vertex passes keep(co); keeps weights + normals."""
    me = src.data.copy(); me.name = name
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.parent = src.parent; o.matrix_world = src.matrix_world.copy()
    # 顶点权重存在网格里，但组名挂在对象上；不复制组名，权重会失去骨骼对应。
    for g in src.vertex_groups: o.vertex_groups.new(name=g.name)
    for m in src.modifiers:
        if m.type == 'ARMATURE':
            mod = o.modifiers.new('Armature', 'ARMATURE'); mod.object = m.object
    bm = bmesh.new(); bm.from_mesh(me)
    bad = [f for f in bm.faces if not any(keep(v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=bad, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(me); bm.free()
    me.materials.clear()
    for m in mats: me.materials.append(m)
    for p in me.polygons: p.material_index = 0; p.use_smooth = True
    return o

def inflate(obj, offset_fn, smooth_iters=0, body_tree=None, min_gap=0.0, pin_boundary=True):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * offset_fn(v.co)
    if smooth_iters:
        movable = [v for v in bm.verts if not (pin_boundary and v.is_boundary)]
        for _ in range(smooth_iters):
            # 拉普拉斯保体积平滑在裆部这类非流形拓扑上会发散，改用普通平滑 + 事后的防穿插外推。
            bmesh.ops.smooth_vert(bm, verts=movable, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    if body_tree and min_gap:
        bm.normal_update()
        for _ in range(3):
            for v in bm.verts:
                hit, n, i, d = body_tree.find_nearest(v.co)
                if hit is None: continue
                need = min_gap * offset_fn(v.co) / max(1e-5, offset_fn(v.co))
                out = v.co - hit
                if out.dot(n) < need:
                    v.co = hit + n * need
            if smooth_iters: bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.3, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(obj.data); bm.free()

def cylinder_uv(obj, center=(0, 0.02), su=1.6, sv=1.6, name='UVMap', mat_index=None):
    """Tiling cylindrical UVs (u = arc length / su) with the seam fixed per face."""
    me = obj.data
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
    if not me.uv_layers: me.uv_layers.new(name=name)
    uv = me.uv_layers[0]
    for poly in me.polygons:
        if mat_index is not None and poly.material_index not in mat_index: continue
        us = []
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            a = math.atan2(co.x - center[0], -(co.y - center[1]))
            us.append(a)
        ref = us[0]
        for k, li in enumerate(poly.loop_indices):
            a = us[k]
            while a - ref > math.pi: a -= 2 * math.pi
            while ref - a > math.pi: a += 2 * math.pi
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (a * 0.2 / su * 2, co.z / sv)

# ---------------------------------------------------------------- generators
def ring_loft(rings, closed=True, cap=False):
    """rings: list of lists of Vector (same count).  Returns bm and a list of vert rows."""
    bm = bmesh.new(); rows = []
    for ring in rings: rows.append([bm.verts.new(p) for p in ring])
    n = len(rings[0])
    for r in range(len(rows) - 1):
        for i in range(n if closed else n - 1):
            j = (i + 1) % n
            bm.faces.new((rows[r][i], rows[r][j], rows[r + 1][j], rows[r + 1][i]))
    bm.normal_update()
    return bm, rows

def strip_on_surface(tree, pts, width, lift, samples=48, width_fn=None, twist=None):
    """Band hugging a surface along a Catmull-Rom path; returns bm + per-vertex (s, side)."""
    def cr(p0, p1, p2, p3, t):
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
    P = [Vector(p) for p in pts]; P = [P[0]] + P + [P[-1]]
    path = []
    for seg in range(1, len(P) - 2):
        for k in range(samples // (len(P) - 3)):
            path.append(cr(P[seg - 1], P[seg], P[seg + 1], P[seg + 2], k / (samples // (len(P) - 3))))
    path.append(P[-2])
    proj = []
    for p in path:
        hit, n, i, d = tree.find_nearest(p)
        proj.append((hit + n * lift, n))
    # Face normals of the source triangulation jump at every triangle. Filter
    # the ribbon frame and centreline before constructing its two edges, so a
    # smooth neckline does not become a folded, zigzag strip after projection.
    for _ in range(5):
        prev = proj
        proj = [prev[0]] + [
            ((prev[k - 1][0] + prev[k][0] * 2 + prev[k + 1][0]) * .25,
             (prev[k - 1][1] + prev[k][1] * 2 + prev[k + 1][1]).normalized())
            for k in range(1, len(prev) - 1)
        ] + [prev[-1]]
    bm = bmesh.new(); left = []; right = []; meta = []
    length = [0.0]
    for k in range(1, len(proj)): length.append(length[-1] + (proj[k][0] - proj[k - 1][0]).length)
    for k, (p, n) in enumerate(proj):
        a = proj[max(0, k - 1)][0]; b = proj[min(len(proj) - 1, k + 1)][0]
        tan = (b - a).normalized(); side = n.cross(tan).normalized()
        w = width * (width_fn(length[k] / length[-1]) if width_fn else 1)
        left.append(bm.verts.new(p + side * w * 0.5)); right.append(bm.verts.new(p - side * w * 0.5))
        meta.append(length[k])
    for k in range(len(left) - 1):
        bm.faces.new((left[k], right[k], right[k + 1], left[k + 1]))
    uv = bm.loops.layers.uv.new('UVMap')
    L = {v: (meta[k], 1.0) for k, v in enumerate(left)}; L.update({v: (meta[k], 0.0) for k, v in enumerate(right)})
    for f in bm.faces:
        for loop in f.loops:
            s, t = L[loop.vert]; loop[uv].uv = (s / (width * 3.0), t)
    bm.normal_update()
    return bm

def solidify(obj, thickness):
    mod = obj.modifiers.new('Solid', 'SOLIDIFY'); mod.thickness = thickness; mod.offset = 1.0
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_move_to_index(modifier='Solid', index=0)
    bpy.ops.object.modifier_apply(modifier='Solid')

def primitive(kind, **kw):
    bm = bmesh.new()
    if kind == 'uvsphere': bmesh.ops.create_uvsphere(bm, u_segments=kw.get('u', 20), v_segments=kw.get('v', 12), radius=kw.get('r', 1))
    elif kind == 'cone': bmesh.ops.create_cone(bm, cap_ends=kw.get('cap', True), segments=kw.get('seg', 24), radius1=kw['r1'], radius2=kw['r2'], depth=kw['d'])
    elif kind == 'cube': bmesh.ops.create_cube(bm, size=1)
    elif kind == 'torus':
        R, r, su, sv = kw['R'], kw['r'], kw.get('su', 28), kw.get('sv', 8)
        rows = []
        for i in range(su):
            a = 2 * math.pi * i / su; row = []
            for j in range(sv):
                b = 2 * math.pi * j / sv
                row.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
            rows.append(row)
        for i in range(su):
            for j in range(sv):
                bm.faces.new((rows[i][j], rows[(i + 1) % su][j], rows[(i + 1) % su][(j + 1) % sv], rows[i][(j + 1) % sv]))
    if 'scale' in kw: bmesh.ops.scale(bm, vec=kw['scale'], verts=bm.verts)
    if 'rot' in kw: bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(kw['rot'][0], 3, kw['rot'][1]), verts=bm.verts)
    if 'loc' in kw: bmesh.ops.translate(bm, vec=kw['loc'], verts=bm.verts)
    return bm

def merge_bms(parts):
    """parts: list of (bm, material_index) → single bm with material indices."""
    out = bmesh.new()
    for bm, mi in parts:
        me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.material_index = mi
        out.from_mesh(me); bpy.data.meshes.remove(me)
    return out

def rigid(obj, bone):
    set_weights(obj, lambda co: {bone: 1.0})


def refine_scholar_face(body, brows):
    """Sculpt the rest mesh; retain UV landmarks, eye rims and animation rig.

    Coordinates are Blender Z-up, facing -Y. Broad, local falloffs avoid hard
    boundaries and keep the original eyeballs fitted to their sockets.
    """
    for v in body.data.vertices:
        x, y, z = v.co
        if z < 1.48 or abs(x) > .12: continue
        front = smoothstep(.02, -.055, y)
        jaw = math.exp(-((z - 1.617) / .040) ** 2)
        v.co.x *= 1 - .105 * jaw
        neck = math.exp(-((z - 1.55) / .044) ** 2)
        v.co.x *= 1 - .075 * neck
        brow = math.exp(-((z - 1.727) / .012) ** 2) * front
        v.co.y += .004 * brow
        nose = math.exp(-(x / .020) ** 2 - ((z - 1.666) / .027) ** 2) * front
        v.co.y += .006 * nose
        v.co.x *= 1 - .07 * nose
        v.co.z += .003 * math.exp(-((z - 1.589) / .022) ** 2) * front
    for v in brows.data.vertices:
        x, y, z = v.co
        v.co.z = 1.716 + (z - 1.716) * .52 - .006 * smoothstep(.024, .062, abs(x))
        v.co.y += .002
    body.data.update(); brows.data.update()


# ================================================================ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = import_new(os.path.join(BASE, 'Superhero_Male_FullBody.gltf'))
    # 上游 glTF 的两个 normal URI 拼成了 *_png.png；用同包 Textures 正式文件修复。
    for img in bpy.data.images:
        if img.source == 'FILE' and not os.path.isfile(bpy.path.abspath(img.filepath)):
            name = os.path.basename(img.filepath).replace('_png.png', '.png')
            replacement = os.path.join(BASE, '..', 'Textures', name)
            if os.path.isfile(replacement):
                img.filepath = replacement
                img.reload()
    arm = [o for o in objs if o.type == 'ARMATURE'][0]
    drop([o for o in objs if o.name.startswith('Icosphere')])
    arm.name = 'PingyaoHero'; arm.data.name = 'PingyaoHeroRig'
    body = bpy.data.objects['SuperHero_Male']; body.name = 'Body'
    eyes = bpy.data.objects['Eyes']; eyes.name = 'EyeBalls'
    brows = bpy.data.objects['Eyebrows']; brows.name = 'Brows'
    refine_scholar_face(body, brows)
    B = {b.name: (arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in arm.data.bones}
    head_top = max(v.co.z for v in body.data.vertices)

    # ---------------- textures & materials
    skin_tex = image(os.path.join(BASE, 'T_Superhero_Male_Dark.png').replace('Dark', 'Dark'), 2048)
    skin_light = os.path.join(BASE, '..', 'Textures', 'T_Superhero_Male_Ligh.png')
    if os.path.exists(skin_light): skin_tex = image(skin_light, 2048)
    skin_tex = image(os.path.join(TEX, 'pingyao-skin-v01.png'), 2048)
    skin_n = image(os.path.join(BASE, 'T_Superhero_Male_Normal.png'), 1024)
    skin_r = image(os.path.join(BASE, 'T_Superhero_Male_Roughness.png'), 256)
    silk = image(os.path.join(TEX, 'silk-damask-v01.png'), 1024)
    trim = image(os.path.join(TEX, 'trim-band-v01.png'), 1024)
    linen = image(os.path.join(TEX, 'linen-v01.png'), 512)
    hair_n = image(os.path.join(HAIR, 'T_Hair_1_Normal.png'), 256)

    M = {}
    M['Skin'] = material('Skin', tex=skin_tex, normal=skin_n, rough_tex=skin_r, rough=0.55)
    # 冷暖微调：把欧美卡通肤色往暖黄收一点，贴近东方肤色。
    p = next(n for n in M['Skin'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    mix = M['Skin'].node_tree.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    t = [n for n in M['Skin'].node_tree.nodes if n.type == 'TEX_IMAGE' and n.image == skin_tex][0]
    M['Skin'].node_tree.links.new(t.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (*srgb('#fff1dc'), 1)
    M['Skin'].node_tree.links.new(mix.outputs[2], p.inputs['Base Color'])
    M['Hair'] = material('Hair', color=srgb('#15110e'), rough=0.78, normal=hair_n)
    M['Cloth'] = material('Cloth', color=srgb('#7b9394'), tex=silk, rough=0.8, double=True, sheen=0.35)
    M['Robe'] = material('Robe', color=srgb('#657f83'), tex=silk, rough=0.8, double=True, sheen=0.35)
    M['Trim'] = material('Trim', color=srgb('#c6d0c7'), tex=linen, rough=0.68, double=True, sheen=0.2)
    M['Lining'] = material('Lining', color=srgb('#efe7d6'), tex=linen, rough=0.85, double=True)
    M['Inner'] = material('Inner', color=srgb('#f3eee2'), tex=linen, rough=0.86, double=True)
    M['Pants'] = material('Pants', color=srgb('#2f2a26'), tex=linen, rough=0.9)
    M['Belt'] = material('Belt', color=srgb('#293739'), tex=trim, rough=0.6, double=True)
    M['Shoe'] = material('Shoe', color=srgb('#1e1b19'), tex=linen, rough=0.85)
    M['ShoeSole'] = material('ShoeSole', color=srgb('#63574a'), rough=0.9)
    M['Hat'] = material('Hat', color=srgb('#221f1c'), tex=linen, rough=0.8, double=True)
    M['Gold'] = material('Gold', color=srgb('#caa24a'), rough=0.32, metal=0.9)
    M['Jade'] = material('Jade', color=srgb('#7fb09a'), rough=0.18)
    M['Leather'] = material('Leather', color=srgb('#5a3522'), rough=0.62)
    M['Paper'] = material('Paper', color=srgb('#e8dcc0'), rough=0.9)
    M['Wood'] = material('Wood', color=srgb('#4a2c1c'), rough=0.55)
    M['Tassel'] = material('Tassel', color=srgb('#c41e3a'), rough=0.8, double=True)

    body.data.materials.clear(); body.data.materials.append(M['Skin'])
    brows.data.materials.clear(); brows.data.materials.append(M['Hair'])
    body_tree = bvh_of(body)

    # ---------------- hair
    scalp = attach_hair(arm, 'Hair_Buzzed'); scalp.name = 'Hair_Scalp'
    scalp.data.materials.clear(); scalp.data.materials.append(M['Hair'])
    # 发际线往前压一点并加厚，形成束发后的顺滑发面（古人不剃发，整头长发上梳成髻）。
    bm = bmesh.new(); bm.from_mesh(scalp.data); bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.004
    bm.to_mesh(scalp.data); bm.free()
    beard = attach_hair(arm, 'Hair_Beard'); beard.name = 'fh_goatee'
    beard.data.materials.clear(); beard.data.materials.append(M['Hair'])
    bm = bmesh.new(); bm.from_mesh(beard.data)
    # 只留八字须与下颌短须：删除两腮络腮胡。
    bad = [v for v in bm.verts if abs(v.co.x) > 0.038 or (abs(v.co.x) > 0.024 and v.co.z > 1.645)]
    bmesh.ops.delete(bm, geom=bad, context='VERTS')
    for v in bm.verts:  # 收窄、拉长成山羊须
        if v.co.z < 1.63: v.co.z -= (1.63 - v.co.z) * 0.6; v.co.x *= 0.75
    # 贴脸压薄，胡须不再像一块黏土
    bm.normal_update()
    cy = min(v.co.y for v in bm.verts)
    for v in bm.verts:
        if v.co.z > 1.62: v.co.y = lerp(v.co.y, -0.085, 0.0) ; v.co.z = lerp(v.co.z, 1.648, 0.25) if v.co.z > 1.648 else v.co.z
    bmesh.ops.scale(bm, vec=(0.92, 0.8, 1.0), verts=[v for v in bm.verts if v.co.z > 1.62], space=Matrix.Translation((0, -0.07, 1.65)).inverted())
    bm.to_mesh(beard.data); bm.free()

    # ---------------- torso shell（交领上衣）
    neck_z = 1.505
    def torso_keep(co):
        if co.z < 1.028: return False   # 下缘藏在腰带下（腰带 1.016–1.074）
        if abs(co.x) > 0.29: return False
        if abs(co.x) < 0.105: return co.z < neck_z + max(0.0, co.y) * 0.25
        return co.z < 1.62
    upper = duplicate_region(body, 'Robe_Upper', torso_keep, [M['Cloth']])
    def torso_off(co):
        return 0.012 + 0.014 * smoothstep(1.34, 1.05, co.z) + 0.004 * smoothstep(0.17, 0.25, abs(co.x))
    inflate(upper, torso_off, smooth_iters=14, body_tree=body_tree, min_gap=0.009)
    cylinder_uv(upper, su=0.9, sv=0.9)
    # 平滑裁切边界，并用中衣遮住领口到颈部的接缝。中衣保留身体权重，抬手时一同变形。
    bm = bmesh.new(); bm.from_mesh(upper.data)
    boundary = [v for v in bm.verts if v.is_boundary and v.co.z > 1.4]
    for _ in range(4):
        bmesh.ops.smooth_vert(bm, verts=boundary, factor=0.4, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    # The outer torso edge sits beneath the sleeve. Taper its offset away so
    # the clipped boundary cannot project through the sleeve as a shoulder flap.
    for v in bm.verts:
        tuck = smoothstep(.20, .26, abs(v.co.x))
        if tuck:
            hit, normal, _, _ = body_tree.find_nearest(v.co)
            v.co = v.co.lerp(hit + normal * .002, tuck)
    bm.to_mesh(upper.data); bm.free()
    # A cutout of the body inherits its irregular polygon boundary. Build a
    # continuous fitted inner collar with an even rim instead.
    inner_rings = []
    for row in range(5):
        ring = []
        for i in range(64):
            a = 2 * math.pi * i / 64
            z = 1.532 - .012 * math.cos(a) - row * .012
            center = Vector((0, .02, z))
            direction = Vector((math.sin(a), -math.cos(a), 0))
            hit, normal, _, _ = body_tree.ray_cast(center + direction * .18, -direction, .18)
            point = hit + normal * .007 if hit is not None else center + direction * .075
            point.z = z
            ring.append(point)
        for _ in range(3):
            ring = [(ring[(i-1)%64] + ring[i]*2 + ring[(i+1)%64])*.25 for i in range(64)]
        inner_rings.append(ring)
    inner_bm, _ = ring_loft(inner_rings)
    bmesh.ops.recalc_face_normals(inner_bm, faces=list(inner_bm.faces))
    inner_torso = new_obj('Inner_Torso', inner_bm, [M['Inner']], arm)
    transfer_weights(body, inner_torso)
    cylinder_uv(inner_torso, su=0.5, sv=0.5)
    solidify(inner_torso, .0015)
    upper_tree = bvh_of(upper)

    # ---------------- sleeves（三档）
    def arm_chain(side):
        sh = B['upperarm_' + side][0]; el = B['lowerarm_' + side][0]; wr = B['hand_' + side][0]
        s = 1 if side == 'l' else -1
        start = Vector((s * 0.165, sh.y - 0.005, sh.z + 0.012))
        return start, el, wr, s
    def arm_radius(x_abs):
        # 只统计手臂轴线附近的顶点，肩部不能把胸背也算进袖子半径
        ds = sorted(math.hypot(v.co.y - 0.07, v.co.z - 1.456) for v in body.data.vertices
                    if abs(v.co.x - max(x_abs, 0.24)) < 0.01 and v.co.z > 1.3)
        ds = [d for d in ds if d < 0.12]
        return ds[int(len(ds) * 0.92)] if ds else 0.06
    # 袖型：肩部贴身，向腕部喇叭状展开成敞口大袖（参照概念四视图）。
    # 截面前后（T 姿态 Y）扁、内外（T 姿态 ±Z，垂臂后即内外侧）宽，正面看袖身垂阔，侧面看平整。
    sleeve_specs = {
        'narrow': dict(wz=0.0, wy=0.0, extend=-0.012),
        'formal': dict(wz=0.125, wy=0.07, extend=0.035),
        'wide': dict(wz=0.19, wy=0.085, extend=0.065),
    }
    for kind, spec in sleeve_specs.items():
        parts = []
        for side in ('l', 'r'):
            start, el, wr, s = arm_chain(side)
            end = wr + Vector((s * spec['extend'], 0, 0))
            L1 = (el - start).length; L2 = (end - el).length
            rings = []; segs = 24; nr = 20
            for k in range(nr + 1):
                t = k / nr; d = t * (L1 + L2)
                c = start.lerp(el, d / L1) if d <= L1 else el.lerp(end, (d - L1) / L2)
                # 连续锥形轮廓；从人体横截面反推半径会把三角肌的凸起放大成肩包。
                base_r = lerp(0.107, 0.058, t)
                if kind == 'narrow':
                    ry = rz_up = rz_dn = lerp(base_r, 0.054, smoothstep(0.6, 1.0, t))
                else:
                    f = smoothstep(0.18, 1.0, t) ** 1.35
                    ry = lerp(base_r, max(base_r, spec['wy']), f)
                    rz = lerp(base_r, max(base_r, spec['wz']), f)
                    rz_up = lerp(base_r, rz, 0.85); rz_dn = rz
                ring = []
                for i in range(segs):
                    a = 2 * math.pi * i / segs
                    dy, dz = math.cos(a), math.sin(a)
                    zr = rz_up if dz > 0 else rz_dn
                    point = Vector((c.x, c.y + dy * ry, c.z + dz * zr))
                    # Bury the sleeve root under the torso with the same body
                    # surface and skin weights; the old cylindrical root stood
                    # proud of the shoulder, exposing an open seam at idle.
                    tuck = 1 - smoothstep(.17, .31, abs(c.x))
                    if tuck > 0:
                        hit, normal, _, _ = body_tree.find_nearest(point)
                        point = point.lerp(hit + normal * .005, tuck)
                    ring.append(point)
                rings.append(ring)
            bm, rows = ring_loft(rings)
            # 袖口翻边（衬里）
            cen = Vector((rows[-1][0].co.x, sum(p.co.y for p in rows[-1]) / segs, sum(p.co.z for p in rows[-1]) / segs))
            lip = [bm.verts.new(v.co.lerp(cen, 0.1) - Vector((s * 0.04, 0, 0))) for v in rows[-1]]
            for i in range(segs):
                j = (i + 1) % segs
                bm.faces.new((rows[-1][i], lip[i], lip[j], rows[-1][j]))
            if side == 'r': bmesh.ops.reverse_faces(bm, faces=bm.faces)
            uvl = bm.loops.layers.uv.new('UVMap')
            for f in bm.faces:
                for loop in f.loops:
                    co = loop.vert.co
                    a = math.atan2(co.z - 1.456, co.y - 0.07)
                    loop[uvl].uv = (abs(co.x) / 0.45, a / math.pi * 0.35)
                f.material_index = 1 if all(abs(v.co.x) > abs(end.x) - 0.05 for v in f.verts) else 0
            for f in bm.faces:
                vs = [loop[uvl].uv.y for loop in f.loops]
                if max(vs) - min(vs) > 0.35:
                    for loop in f.loops:
                        if loop[uvl].uv.y < 0: loop[uvl].uv.y += 0.7
            parts.append(bm)
        out = bmesh.new()
        for bm in parts:
            me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
        obj = new_obj('sl_' + kind, out, [M['Cloth'], M['Trim']], arm)
        def sleeve_w(co, kind=kind):
            side = 'l' if co.x > 0 else 'r'
            start, el, wr, s = arm_chain(side)
            x = abs(co.x)
            w_low = smoothstep(abs(el.x) - 0.07, abs(el.x) + 0.06, x)
            # 垂袋底部部分跟随上臂，肘弯时袖袋不随前臂硬折
            w_sh = 1 - smoothstep(abs(start.x), abs(start.x) + 0.07, x)
            return {'upperarm_' + side: (1 - w_low) * (1 - w_sh * 0.55), 'lowerarm_' + side: w_low,
                    'clavicle_' + side: w_sh * 0.35, 'spine_03': w_sh * 0.2}
        set_weights(obj, sleeve_w)
        # 肩袖与衣身使用同一身体表面的插值权重，避免手臂下垂时肩缝分离。
        transfer_weights(body, obj)
    # 中衣窄袖（广袖内可见）
    inner_sleeve = duplicate_region(body, 'Inner_Sleeve', lambda co: B['hand_l'][0].x - 0.05 < abs(co.x) < B['hand_l'][0].x - 0.012 and co.z > 1.3, [M['Cloth']])
    inflate(inner_sleeve, lambda co: 0.009, smooth_iters=3)
    cylinder_uv(inner_sleeve, su=0.5, sv=0.5)

    # ---------------- lower garment: long robe + short jacket hem
    def skirt(name, z_top, z_hem, flare, folds, amp):
        segs = 64; rings = []; zs = []
        n = 22
        for k in range(n + 1):
            t = k / n; z = lerp(z_top, z_hem, t); zs.append(z)
            # 腰→胯→摆 的轮廓
            hip = smoothstep(z_top, 0.9, z)
            rx = lerp(0.182, 0.212, hip) + flare[0] * smoothstep(0.9, z_hem, z) ** 0.8
            ry = lerp(0.128, 0.148, hip) + flare[1] * smoothstep(0.9, z_hem, z) ** 0.8
            cy = lerp(0.01, 0.03, hip)
            ring = []
            for i in range(segs):
                a = 2 * math.pi * i / segs
                fold = 1 + amp * smoothstep(0.92, z_hem, z) * (0.6 * math.sin(folds * a) + 0.4 * math.sin(folds * 2 * a + 1.3))
                x = math.sin(a) * rx * fold; y = cy - math.cos(a) * ry * fold
                ring.append(Vector((x, y, z)))
            rings.append(ring)
        bm, rows = ring_loft(rings)
        # 下摆加一圈内折边增加厚度感
        lip = [bm.verts.new(v.co + Vector((0, 0, 0.012)) - (v.co - Vector((0, 0.03, v.co.z))).normalized() * 0.012) for v in rows[-1]]
        for i in range(segs):
            j = (i + 1) % segs; bm.faces.new((rows[-1][i], rows[-1][j], lip[j], lip[i]))
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
        uvl = bm.loops.layers.uv.new('UVMap')
        hem_band = 0.075
        for f in bm.faces:
            trim_face = all(v.co.z < z_hem + hem_band for v in f.verts)
            f.material_index = 1 if trim_face else 0
            for loop in f.loops:
                co = loop.vert.co; a = math.atan2(co.x, -(co.y - 0.02))
                if trim_face: loop[uvl].uv = (a * 0.9, (co.z - z_hem) / hem_band * 0.33 + 0.33)
                else: loop[uvl].uv = (a * 0.36, co.z / 0.9)
        for f in bm.faces:
            us = [loop[uvl].uv.x for loop in f.loops]
            if max(us) - min(us) > 1.0:
                for loop in f.loops:
                    if loop[uvl].uv.x < 0: loop[uvl].uv.x += (0.9 if f.material_index else 0.36) * 2 * math.pi
        obj = new_obj(name, bm, [M['Robe'], M['Trim']], arm)
        def skirt_w(co):
            depth = smoothstep(0.95, 0.62, co.z)
            lat = smoothstep(-0.035, 0.035, co.x)
            a = 0.98 * depth
            # 小腿段分一部分权重给 calf：后腿屈膝抬脚跟时袍摆随之后摆，不被脚跟顶穿
            c = 0.8 * smoothstep(0.55, 0.12, co.z)
            w = {'pelvis': 1 - a, 'thigh_l': a * lat * (1 - c), 'thigh_r': a * (1 - lat) * (1 - c),
                 'calf_l': a * lat * c, 'calf_r': a * (1 - lat) * c}
            # 腰口贴合脊柱
            top = smoothstep(1.0, 1.06, co.z)
            w['spine_01'] = top * 0.6; w['pelvis'] *= (1 - top * 0.6)
            return w
        set_weights(obj, skirt_w)
        return obj
    long_robe = skirt('ol_long', 1.075, 0.14, (0.1, 0.09), 9, 0.06)
    short_robe = skirt('ol_short', 1.075, 0.66, (0.05, 0.05), 7, 0.05)

    # ---------------- trousers / leg wraps / shoes
    trousers = duplicate_region(body, 'Trousers', lambda co: 0.1 < co.z < 0.69 and abs(co.x) < 0.3, [M['Pants']])
    inflate(trousers, lambda co: 0.012 + 0.006 * smoothstep(0.35, 0.7, co.z), smooth_iters=6, body_tree=body_tree, min_gap=0.009)
    cylinder_uv(trousers, center=(0, 0.04), su=0.5, sv=0.5)
    shoes = duplicate_region(body, 'Shoes', lambda co: co.z < 0.19, [M['Shoe'], M['ShoeSole']])
    inflate(shoes, lambda co: 0.008 + 0.006 * smoothstep(0.1, 0.0, co.z), smooth_iters=8, body_tree=body_tree, min_gap=0.006)
    bm = bmesh.new(); bm.from_mesh(shoes.data)
    for v in bm.verts:
        if v.co.z < 0.018: v.co.z = max(0.0, v.co.z - 0.006)
        if v.co.y < -0.16 and v.co.z < 0.07: v.co.z += (-0.16 - v.co.y) * 0.25  # 微翘靴头
    for f in bm.faces: f.material_index = 1 if all(v.co.z < 0.02 for v in f.verts) else 0
    bm.to_mesh(shoes.data); bm.free()
    cylinder_uv(shoes, center=(0.0, 0.0), su=0.3, sv=0.3)
    # 布靴以踝骨刚性蒙皮，鞋底保持平整，也为运行时双腿 IK 提供可靠触地点。
    set_weights(shoes, lambda co: {'foot_l' if co.x > 0 else 'foot_r': 1.0})

    # ---------------- collar（交领右衽：左襟压右襟，外领自左颈斜落至右腋下）
    outer_path = [(0.07, 0.03, 1.52), (0.085, -0.04, 1.49), (0.05, -0.11, 1.40), (-0.03, -0.13, 1.30), (-0.11, -0.12, 1.19), (-0.165, -0.07, 1.10)]
    inner_path = [(-0.07, 0.03, 1.52), (-0.08, -0.05, 1.47), (-0.04, -0.115, 1.39), (0.0, -0.13, 1.35)]
    back_path = [(0.07, 0.03, 1.52), (0.05, 0.085, 1.535), (0.0, 0.1, 1.54), (-0.05, 0.085, 1.535), (-0.07, 0.03, 1.52)]
    parts = []
    collar_path = list(reversed(outer_path)) + back_path[1:] + inner_path[1:]
    parts.append((strip_on_surface(upper_tree, collar_path, .042, .006, samples=192), 0))
    white = [(0.058, 0.02, 1.535), (0.07, -0.035, 1.51), (0.042, -0.095, 1.43), (0.012, -0.12, 1.38)]
    white2 = [(-0.058, 0.02, 1.535), (-0.068, -0.04, 1.50), (-0.035, -0.1, 1.42)]
    white3 = [(0.058, 0.02, 1.535), (0.0, 0.085, 1.555), (-0.058, 0.02, 1.535)]
    lining_path = list(reversed(white)) + white3[1:] + white2[1:]
    parts.append((strip_on_surface(upper_tree, lining_path, .03, .004, samples=120), 1))
    collar = new_obj('Collar', merge_bms(parts), [M['Trim'], M['Inner']], arm)
    bpy.context.view_layer.objects.active = collar
    sub = collar.modifiers.new('Soft collar edge', 'SUBSURF'); sub.levels = 1
    bpy.ops.object.modifier_move_to_index(modifier=sub.name, index=0)
    bpy.ops.object.modifier_apply(modifier=sub.name)
    solidify(collar, 0.002)
    transfer_weights(upper, collar)

    # ---------------- belt + sash
    belt_z = 1.045
    parts = []
    for dz, w in ((0.0, 0.058),):
        ring = []; segs = 56
        for i in range(segs + 1):
            a = 2 * math.pi * i / segs
            d = Vector((math.sin(a), -math.cos(a), 0))
            o = Vector((0, 0.02, belt_z))
            hit = long_robe_tree = None
            loc, n, idx, dist = upper_tree.ray_cast(o + d * 0.5, -d)
            if loc is None: loc = o + d * 0.2
            ring.append(loc + d * 0.008)
        bm = bmesh.new(); top = [bm.verts.new(p + Vector((0, 0, w / 2))) for p in ring]; bot = [bm.verts.new(p - Vector((0, 0, w / 2))) for p in ring]
        uvl = bm.loops.layers.uv.new('UVMap')
        for i in range(segs):
            f = bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
            for loop, uv in zip(f.loops, ((i / 8, 0.28), ((i + 1) / 8, 0.28), ((i + 1) / 8, 0.72), (i / 8, 0.72))): loop[uvl].uv = uv
        parts.append((bm, 0))
    # 带扣玉板
    parts.append((primitive('cube', scale=(0.07, 0.012, 0.05), loc=(0, -0.145, belt_z)), 1))
    parts.append((primitive('cube', scale=(0.05, 0.008, 0.032), loc=(0, -0.153, belt_z)), 2))
    belt = new_obj('Belt', merge_bms(parts), [M['Belt'], M['Gold'], M['Jade']], arm)
    solidify_obj = None
    rigid(belt, 'pelvis')
    # 腰前垂绦（两条），随袍摆权重摆动
    robe_tree = bvh_of(long_robe)
    tails = []
    for x0 in (-0.035, 0.03):
        path = [(x0, -0.16, belt_z - 0.02), (x0 * 1.1, -0.19, 0.8), (x0 * 1.25, -0.215, 0.58)]
        tails.append((strip_on_surface(robe_tree, path, 0.036, 0.01, samples=24, width_fn=lambda s: 1 - 0.25 * s), 0))
    sash = new_obj('Sash_tails', merge_bms(tails), [M['Belt']], arm)
    solidify(sash, 0.003)
    transfer_weights(long_robe, sash)

    # ---------------- headwear（hw_*，全部绑定 Head 骨）
    hz = head_top
    def hat(name, parts_mats):
        bm = merge_bms([(b, i) for b, i in parts_mats[0]])
        o = new_obj(name, bm, parts_mats[1], arm); rigid(o, 'Head'); return o
    bun = lambda: primitive('uvsphere', r=0.042, u=18, v=10, scale=(1, 1, 0.82), loc=(0, 0.015, hz + 0.018))
    pin = lambda: primitive('cone', r1=0.0035, r2=0.002, d=0.15, seg=8, rot=(math.pi / 2, 'Y'), loc=(0, 0.015, hz + 0.022))
    hat('hw_hair-bun', ([(bun(), 0), (pin(), 1), (primitive('cone', r1=0.03, r2=0.026, d=0.028, seg=18, loc=(0, 0.015, hz + 0.028)), 1)], [M['Hair'], M['Gold']]))
    # 六合帽（瓜皮小帽）
    cap = primitive('uvsphere', r=0.098, u=24, v=12, scale=(0.98, 1.08, 0.62), loc=(0, 0.0, hz - 0.035))
    bmesh.ops.delete(cap, geom=[v for v in cap.verts if v.co.z < hz - 0.045], context='VERTS')
    hat('hw_skullcap', ([(cap, 0), (primitive('uvsphere', r=0.012, u=10, v=6, loc=(0, 0.0, hz + 0.028)), 1),
                         (primitive('torus', R=0.093, r=0.006, su=32, sv=6, scale=(0.99, 1.08, 1), loc=(0, 0.0, hz - 0.043)), 0)], [M['Hat'], M['Tassel']]))
    # 四方平定巾（书生方巾）
    sq = primitive('cone', r1=0.104, r2=0.118, d=0.11, seg=4, rot=(math.pi / 4, 'Z'), loc=(0, 0.004, hz + 0.01), scale=(1.0, 1.0, 1.0))
    hat('hw_scholar-scarf', ([(sq, 0), (primitive('cube', scale=(0.03, 0.004, 0.16), loc=(0.03, 0.105, hz - 0.1), rot=(0.12, 'Y')), 0),
                              (primitive('cube', scale=(0.03, 0.004, 0.16), loc=(-0.03, 0.105, hz - 0.1), rot=(-0.12, 'Y')), 0)], [M['Hat']]))
    # 镖师抹额 + 发髻
    band = primitive('torus', R=0.093, r=0.013, su=32, sv=6, scale=(1, 1.1, 1.6), loc=(0, 0.0, hz - 0.075))
    hat('hw_guard-cap', ([(band, 0), (bun(), 1), (primitive('cube', scale=(0.035, 0.006, 0.12), loc=(0.02, 0.112, hz - 0.14), rot=(0.2, 'Y')), 0),
                          (primitive('cube', scale=(0.035, 0.006, 0.1), loc=(-0.02, 0.112, hz - 0.13), rot=(-0.25, 'Y')), 0)], [M['Tassel'], M['Hair']]))
    # 员外帽（东坡巾式高筒）
    tall = primitive('cone', r1=0.1, r2=0.092, d=0.15, seg=24, loc=(0, 0.004, hz + 0.02), scale=(1, 1.08, 1))
    brim = primitive('torus', R=0.1, r=0.01, su=32, sv=6, scale=(1, 1.08, 1), loc=(0, 0.004, hz - 0.05))
    hat('hw_merchant-cap', ([(tall, 0), (brim, 1), (primitive('cube', scale=(0.16, 0.006, 0.09), loc=(0, 0.1, hz - 0.01)), 0)], [M['Hat'], M['Gold']]))
    # 灯节金冠
    crown = primitive('cone', r1=0.05, r2=0.035, d=0.045, seg=20, loc=(0, 0.015, hz + 0.03), scale=(0.9, 1.2, 1))
    hat('hw_festival-cap', ([(bun(), 0), (crown, 1), (pin(), 1), (primitive('uvsphere', r=0.01, u=8, v=6, loc=(0.075, 0.015, hz + 0.022)), 2),
                             (primitive('uvsphere', r=0.01, u=8, v=6, loc=(-0.075, 0.015, hz + 0.022)), 2)], [M['Hair'], M['Gold'], M['Tassel']]))
    # 晋商传人：忠静冠（高冠 + 金梁）
    tall2 = primitive('cube', scale=(0.17, 0.2, 0.17), loc=(0, 0.01, hz + 0.02))
    hat('hw_merchant-crown', ([(tall2, 0), (primitive('cube', scale=(0.012, 0.21, 0.02), loc=(0.0, 0.01, hz + 0.108)), 1),
                               (primitive('cube', scale=(0.012, 0.21, 0.02), loc=(0.045, 0.01, hz + 0.1)), 1),
                               (primitive('cube', scale=(0.012, 0.21, 0.02), loc=(-0.045, 0.01, hz + 0.1)), 1),
                               (primitive('torus', R=0.102, r=0.009, su=32, sv=6, scale=(1, 1.1, 1), loc=(0, 0.01, hz - 0.06)), 1)], [M['Hat'], M['Gold']]))

    # ---------------- accessories（acc_*，挂在腰带 / 背后，刚性绑 pelvis）
    def acc(name, parts, mats, bone='pelvis'):
        o = new_obj(name, merge_bms(parts), mats, arm); rigid(o, bone); return o
    acc('acc_satchel', [(primitive('cube', scale=(0.17, 0.06, 0.15), loc=(0.2, 0.0, 0.93), rot=(0.12, 'Y')), 0),
                        (primitive('cube', scale=(0.17, 0.064, 0.05), loc=(0.2, 0.0, 0.985), rot=(0.12, 'Y')), 1)], [M['Leather'], M['Belt']])
    acc('acc_scroll', [(primitive('cone', r1=0.028, r2=0.028, d=0.42, seg=14, rot=(1.05, 'Y'), loc=(0.02, 0.17, 1.2)), 0),
                       (primitive('cone', r1=0.032, r2=0.032, d=0.02, seg=14, rot=(1.05, 'Y'), loc=(0.2, 0.17, 1.3)), 1),
                       (primitive('cone', r1=0.032, r2=0.032, d=0.02, seg=14, rot=(1.05, 'Y'), loc=(-0.16, 0.17, 1.1)), 1)], [M['Paper'], M['Wood']], bone='spine_02')
    acc('acc_ledger', [(primitive('cube', scale=(0.1, 0.03, 0.14), loc=(0.2, -0.03, 0.9), rot=(0.1, 'Y')), 0),
                       (primitive('cube', scale=(0.104, 0.034, 0.02), loc=(0.2, -0.03, 0.9), rot=(0.1, 'Y')), 1)], [M['Paper'], M['Tassel']])
    acc('acc_scabbard', [(primitive('cube', scale=(0.032, 0.022, 0.72), loc=(0.2, 0.06, 0.72), rot=(0.42, 'X')), 0),
                         (primitive('cube', scale=(0.036, 0.026, 0.05), loc=(0.2, 0.2, 1.05), rot=(0.42, 'X')), 1),
                         (primitive('cone', r1=0.014, r2=0.012, d=0.2, seg=10, rot=(0.42, 'X'), loc=(0.2, 0.255, 1.16)), 2)], [M['Wood'], M['Gold'], M['Leather']])
    jade = primitive('torus', R=0.03, r=0.011, su=24, sv=8, rot=(math.pi / 2, 'X'), loc=(0.14, -0.14, 0.86))
    acc('acc_jade', [(jade, 0), (primitive('cone', r1=0.003, r2=0.003, d=0.14, seg=6, loc=(0.14, -0.14, 0.96)), 1),
                     (primitive('cone', r1=0.004, r2=0.02, d=0.12, seg=12, loc=(0.14, -0.14, 0.77)), 2)], [M['Jade'], M['Tassel'], M['Tassel']])
    acc('acc_seal', [(primitive('cube', scale=(0.04, 0.04, 0.05), loc=(0.14, -0.14, 0.9)), 0),
                     (primitive('uvsphere', r=0.016, u=10, v=6, loc=(0.14, -0.14, 0.94)), 0),
                     (primitive('cone', r1=0.004, r2=0.018, d=0.11, seg=12, loc=(0.14, -0.14, 0.82)), 1)], [M['Jade'], M['Tassel']])
    acc('acc_tassel', [(primitive('uvsphere', r=0.02, u=12, v=8, loc=(0.14, -0.14, 0.93)), 0),
                       (primitive('cone', r1=0.005, r2=0.03, d=0.2, seg=14, loc=(0.14, -0.14, 0.8)), 1)], [M['Gold'], M['Tassel']])

    # ---------------- remove hidden body parts（衣下身体删除，省面数并杜绝穿模）
    wrist_x = B['hand_l'][0].x - 0.012
    def body_keep(co):
        if abs(co.x) > wrist_x: return True           # 双手
        if co.z > neck_z - 0.04 and abs(co.x) < 0.1: return True   # 颈与头
        if co.z > 1.56: return True
        return False
    for o in (upper, inner_sleeve, trousers, shoes):
        pass
    bm = bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(body_keep(v.co) for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(body.data); bm.free()

    # One subdivision only on the visible face/neck/hands; the rig and clothing
    # stay at their existing budget. This removes the angular silhouette close up.
    bpy.context.view_layer.objects.active = body
    sub = body.modifiers.new('Portrait surface', 'SUBSURF'); sub.levels = 1
    bpy.ops.object.modifier_move_to_index(modifier=sub.name, index=0)
    bpy.ops.object.modifier_apply(modifier=sub.name)
    for face in body.data.polygons: face.use_smooth = True

    for o in [c for c in arm.children if c.type == 'MESH']:
        if not o.data.uv_layers: cylinder_uv(o)
        cleanup_weights(o)
    return arm, M


# ================================================================ animation
KEEP = {  # UAL 名称 → 游戏内名称（街景页按 idle/walk/run/interact/cheer 正则取用）
    'Idle_Loop': 'Idle', 'Walk_Formal_Loop': 'Walking_A', 'Walk_Loop': 'Walking_B', 'Jog_Fwd_Loop': 'Running_A',
    'Interact': 'Interact', 'Idle_Talking_Loop': 'Talk', 'Dance_Loop': 'Cheer', 'Sitting_Idle_Loop': 'Sit_Idle',
    'PickUp_Table': 'PickUp',
}
FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')

def load_actions(arm):
    objs = import_new(UAL)
    drop(objs)
    acts = {}
    for a in list(bpy.data.actions):
        base = a.name.split('|')[-1]
        if base in KEEP and KEEP[base] not in acts:
            a.name = KEEP[base]; a.use_fake_user = True; acts[a.name] = a
        else:
            bpy.data.actions.remove(a)
    return acts

def relax_hands(action, amount):
    """UAL 的待机/行走是握拳，古装人物改为半松手势：手指旋转向静息姿态回收。"""
    curves = {}
    for fc in iter_fcurves(action):
        if 'rotation_quaternion' not in fc.data_path: continue
        bone = fc.data_path.split('"')[1]
        if not bone.startswith(FINGERS): continue
        curves.setdefault(bone, {})[fc.array_index] = fc
    for bone, chans in curves.items():
        if len(chans) < 4: continue
        amt = amount * (0.6 if bone.startswith('thumb') else 1.0)
        n = len(chans[0].keyframe_points)
        for k in range(n):
            try: q = Quaternion([chans[i].keyframe_points[k].co[1] for i in range(4)])
            except IndexError: break
            r = Quaternion((1, 0, 0, 0)).slerp(q, 1 - amt)
            for i in range(4):
                kp = chans[i].keyframe_points[k]; kp.co[1] = r[i]; kp.handle_left[1] = r[i]; kp.handle_right[1] = r[i]
        for c in chans.values(): c.update()

def iter_fcurves(action):
    if hasattr(action, 'layers') and action.layers:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    yield from bag.fcurves
    else:
        yield from action.fcurves

def assign(arm, act, frame=None):
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    if hasattr(ad, 'action_slot') and act.slots: ad.action_slot = act.slots[0]
    if frame is not None: bpy.context.scene.frame_set(int(frame))


# ================================================================ preview / export
def preview(arm, M):
    import preview_hanfu as pv
    pv.setup_render((720, 1000))
    for act_name, frame, tag in (('Idle', 12, 'idle'), ('Walking_A', 8, 'walk')):
        assign(arm, bpy.data.actions[act_name], frame)
        for cam, name in (((1.5, -3.4, 1.35), 'front'), ((3.6, 0.2, 1.2), 'side'), ((-1.2, 3.4, 1.4), 'back')):
            pv.camera(cam, (0, 0, 0.95), 50)
            pv.render(os.path.join(BUILD, f'hero_{tag}_{name}.png'))
    assign(arm, bpy.data.actions['Idle'], 12)
    pv.camera((0.35, -1.25, 1.62), (0, 0, 1.52), 70)
    pv.render(os.path.join(BUILD, 'hero_face.png'))

def variants_for_preview(arm):
    for o in arm.children:
        if o.name.startswith('hw_'): o.hide_render = o.name != 'hw_hair-bun'
        if o.name.startswith('acc_'): o.hide_render = o.name != 'acc_jade'
        if o.name.startswith('sl_'): o.hide_render = o.name != 'sl_formal'
        if o.name.startswith('ol_'): o.hide_render = o.name != 'ol_long'
        if o.name in ('fh_goatee', 'Trousers'): o.hide_render = True

def export(arm):
    for o in bpy.context.selected_objects: o.select_set(False)
    arm.select_set(True)
    for o in arm.children: o.hide_render = False; o.hide_set(False); o.select_set(True)
    assign(arm, bpy.data.actions['Idle'], 0)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
                              export_frame_step=1, export_optimize_animation_size=True, export_image_format='JPEG',
                              export_jpeg_quality=86, export_skins=True, export_morph=False, export_yup=True,
                              export_def_bones=False, export_texcoords=True, export_normals=True, export_tangents=False,
                              export_materials='EXPORT', export_extras=False, export_lights=False, export_cameras=False)
    print('EXPORTED', OUT, os.path.getsize(OUT))


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    os.makedirs(BUILD, exist_ok=True)
    arm, M = build()
    acts = load_actions(arm)
    for name, act in acts.items():
        relax_hands(act, 0.55 if name in ('Idle', 'Walking_A', 'Walking_B', 'Running_A', 'Talk') else 0.25)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in arm.children if o.type == 'MESH')
    print('MESHES', [(o.name, len(o.data.polygons)) for o in arm.children if o.type == 'MESH'])
    print('TRIS', tris, 'ACTIONS', sorted(acts))
    if PREVIEW:
        variants_for_preview(arm)
        preview(arm, M)
    export(arm)
    variants_for_preview(arm)
    for obj in arm.children: obj.hide_set(obj.hide_render)
    assign(arm, acts['Idle'], 12)
    bpy.ops.file.pack_all()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, '3D', 'pingyao-hanfu-human.blend'))
