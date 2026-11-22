import bpy, sys, json, re, os
import numpy as np
from mathutils import Matrix
src, outdir = sys.argv[-2], sys.argv[-1]
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=src)
scene = bpy.context.scene
SYS = {'1':'skeleton','2':'insertions','3':'joints','4':'muscles','5':'vessels','6':'lymph','7':'nervous','8':'viscera','9':'regions'}
def main_col(o):
    for c in o.users_collection:
        m = re.match(r'^(\d): ', c.name)
        if m: return m.group(1)
    return None
# make everything visible/evaluable
def unhide(lc):
    lc.exclude = False; lc.hide_viewport = False
    for c in lc.children: unhide(c)
unhide(bpy.context.view_layer.layer_collection)
for c in bpy.data.collections: c.hide_viewport = False
for o in bpy.data.objects:
    o.hide_viewport = False
    try: o.hide_set(False)
    except Exception: pass
# cap subsurf levels
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'SUBSURF': m.levels = min(m.levels, 2 if main_col(o) in ('2','3') else 1)
# low-poly bones: one level of subdivision for a smooth silhouette
for o in bpy.data.objects:
    if o.type == 'MESH' and main_col(o) == '1' and not o.modifiers and 40 < len(o.data.polygons) < 5000 and not re.search(r'\.[ijg]$', o.name):
        m = o.modifiers.new('smooth', 'SUBSURF'); m.levels = 1; m.render_levels = 1
# curves without bevel get a small one
for o in bpy.data.objects:
    if o.type == 'CURVE' and main_col(o):
        cu = o.data
        cu.resolution_u = min(cu.resolution_u, 6); cu.bevel_resolution = min(cu.bevel_resolution, 2)
        if cu.bevel_depth == 0 and cu.extrude == 0 and cu.bevel_object is None:
            cu.bevel_depth = 0.0015
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()

def split(name):
    m = re.search(r'\.([a-z0-9]+)$', name)
    return (name[:m.start()], m.group(1)) if m else (name, '')
def group_chain(o):
    ch = []; p = o.parent
    while p:
        ch.append(p.name); p = p.parent
    return ch
simple = {}
def simple_mat(name):
    if name not in simple:
        simple[name] = bpy.data.materials.new('X_' + name)
    return simple[name]

items = []      # exported mesh records
landmarks = []
groups = {}
baked = {}      # name -> (obj, verts ndarray)
def bake(o):
    oe = o.evaluated_get(dg)
    try: me = bpy.data.meshes.new_from_object(oe, preserve_all_data_layers=False, depsgraph=dg)
    except Exception as e:
        return None
    if me is None or len(me.polygons) == 0:
        if me: bpy.data.meshes.remove(me)
        return None
    me.transform(o.matrix_world)
    if o.matrix_world.determinant() < 0: me.flip_normals()
    return me
def verts(me):
    a = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get('co', a); return a.reshape(-1,3)

objs = [o for o in bpy.data.objects if main_col(o)]
by_name = {o.name: o for o in objs}
# hierarchy groups (.g fonts)
for o in objs:
    b, s = split(o.name)
    if s == 'g' and o.type == 'FONT':
        groups[b] = dict(parent=split(o.parent.name)[0] if o.parent else None, sys=SYS[main_col(o)])
cand = []
for o in objs:
    if o.type not in ('MESH','CURVE'): continue
    b, s = split(o.name); k = main_col(o)
    if s in ('j','i','g','t','s'): continue
    if k == '2':
        m = re.match(r'^([oe])(\d?)([lr]?)$', s)
        if not m: print('SKIP insertion suffix', o.name); continue
    elif s not in ('', 'l', 'r'):
        # dotted names without side suffix
        b, s = o.name, ''
    cand.append((o, b, s, k))
print('candidates', len(cand))
meshes = {}
for o, b, s, k in cand:
    me = bake(o)
    if me is None: continue
    meshes[o.name] = me
print('baked', len(meshes))
# mirror detection: keep left, mark right as mirror when identical
def partner(o, b, s, k):
    if k == '2':
        if s.endswith('r'): return b + '.' + s[:-1] + 'l'
        return None
    return b + '.l' if s == 'r' else None
nmir = 0
counter = {}
export_objs = {v: [] for v in SYS.values()}
for o, b, s, k in sorted(cand, key=lambda t: t[0].name):
    me = meshes.get(o.name)
    if me is None: continue
    v = verts(me)
    side = s[-1] if (s and s[-1] in 'lr') else ''
    rec = dict(name=b, side=side, sys=SYS[k], parent=split(o.parent.name)[0] if o.parent else None,
               chain=[split(n)[0] for n in group_chain(o)],
               mats=[m.name if m else 'None' for m in o.data.materials],
               bmin=[round(float(x),5) for x in v.min(0)], bmax=[round(float(x),5) for x in v.max(0)],
               c=[round(float(x),5) for x in v.mean(0)], otype=o.type)
    if k == '2':
        m = re.match(r'^([oe])(\d?)([lr]?)$', s); rec['kind'] = m.group(1); rec['idx'] = int(m.group(2) or 0)
    pn = partner(o, b, s, k)
    if pn and pn in meshes:
        pv = verts(meshes[pn])
        if pv.shape == v.shape:
            mv = pv * np.array([-1,1,1], dtype=np.float32)
            if np.abs(mv - v).max() < 2e-4 or (np.abs(np.sort(mv,0) - np.sort(v,0)).max() < 2e-4):
                rec['mirrorOf'] = pn; nmir += 1
    items.append((o.name, rec))
ids = {}
for i, (n, rec) in enumerate(items):
    rec['id'] = SYS_ID = rec['sys'][0] + format(i, 'x'); ids[n] = rec['id']
for n, rec in items:
    if 'mirrorOf' in rec:
        rec['mirrorOf'] = ids[rec['mirrorOf']]; continue
    me = meshes[n]
    names = [m.name if m else 'None' for m in me.materials] or ['None']
    me.materials.clear()
    for nm in names: me.materials.append(simple_mat(nm))
    ob = bpy.data.objects.new(rec['id'], me); me.name = rec['id']
    export_objs[rec['sys']].append(ob)
print('mirrored', nmir, 'of', len(items))
# landmarks
for o in objs:
    b, s = split(o.name)
    if s in ('t','s') and o.type == 'FONT':
        line = by_name.get(b + ('.j' if s == 't' else '.i'))
        if line is None or line.type != 'MESH': continue
        le = line.evaluated_get(dg); pts = [line.matrix_world @ v.co for v in le.data.vertices]
        if len(pts) < 2: continue
        tp = o.matrix_world.translation
        far = max(pts, key=lambda p: (p - tp).length)
        p = o.parent; chain = []
        while p and split(p.name)[1] in ('t','s','g'):
            chain.append(split(p.name)[0]); p = p.parent
        if p is None or p.name not in ids: continue
        landmarks.append(dict(name=b, sys=SYS[main_col(o)], on=ids[p.name], via=chain, p=[round(x,5) for x in far], t=[round(x,5) for x in tp]))
print('landmarks', len(landmarks))
texts = {}
for t in bpy.data.texts:
    try: texts[t.name] = t.as_string()
    except Exception: pass
json.dump(dict(items=[r for _, r in items], groups=groups, landmarks=landmarks), open(os.path.join(outdir,'manifest.raw.json'),'w'))
json.dump(texts, open(os.path.join(outdir,'texts.en.json'),'w'))
# export per system
exp = bpy.data.scenes.new('EXP'); bpy.context.window.scene = exp
for sysn, obs in export_objs.items():
    if not obs: continue
    col = bpy.data.collections.new('C_'+sysn); exp.collection.children.link(col)
    for ob in obs: col.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs: ob.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, sysn + '.glb'), export_format='GLB', use_selection=True,
        export_apply=False, export_yup=True, export_texcoords=False, export_normals=True, export_materials='EXPORT',
        export_animations=False, export_skins=False, export_morph=False, export_cameras=False, export_lights=False, export_extras=False)
    tris = sum(len(ob.data.loop_triangles) or sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in obs)
    print('EXPORTED', sysn, len(obs), 'objs', tris, 'tris')
    exp.collection.children.unlink(col)
