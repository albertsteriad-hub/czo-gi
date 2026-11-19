"""High-profile turret silhouettes and reusable surface texture detail."""
from pathlib import Path
import bpy
import build_bor as b
from build_bor_finish import uv_project, weather_material, preserve_factory_tints
from build_terrain_textures import OUT, SIZE, png, noise_grid, enc
import random
import math

model=Path(__file__).resolve().parent/'models'
rng=random.Random(648)
for name,grain,span in [('board',31,7),('stone',23,29)]:
    variation=noise_grid(span,rng)
    fine=noise_grid(grain,rng)
    color=bytearray()
    normal=bytearray()
    rough=bytearray()
    height=[]
    for y in range(SIZE):
        for x in range(SIZE):
            i=y*SIZE+x
            u=variation[i]
            v=fine[i]
            line=math.sin(x*.68+math.sin(y*.034)*2.2)*.2 if name=='board' else 0
            h=.42*u+.19*v+line
            height.append(h)
            val=enc(223+(u-.5)*33+(v-.5)*34+line*55)
            color.extend((val,enc(val*(.97 if name=='board' else 1)),enc(val*(.92 if name=='board' else .99))))
            r=enc(209+(u-.5)*46+(v-.5)*21)
            rough.extend((r,r,r))
    for y in range(SIZE):
        for x in range(SIZE):
            dx=height[y*SIZE+(x+1)%SIZE]-height[y*SIZE+(x-1)%SIZE]
            dy=height[((y+1)%SIZE)*SIZE+x]-height[((y-1)%SIZE)*SIZE+x]
            n=127.5/math.sqrt(1+dx*dx*6+dy*dy*6)
            normal.extend((enc(127.5-dx*n*2.45),enc(127.5+dy*n*2.45),enc(127.5+n)))
    for key,buffer in [('color',color),('normal',normal),('roughness',rough)]:
        png('ASH_'+name+'_'+key,buffer)

def selection_export(path):
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_vertex_color='ACTIVE',export_animations=False)

def stone_material(mat,profile):
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for key,dest in [('color','Base Color'),('roughness','Roughness'),('normal','Normal')]:
        node=nodes.new('ShaderNodeTexImage')
        image=bpy.data.images.load(str(OUT / ('ASH_'+profile+'_'+key+'.png')),check_existing=True)
        node.image=image
        if key!='color': image.colorspace_settings.name='Non-Color'
        if key=='normal':
            normal=nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value=.61
            links.new(node.outputs['Color'],normal.inputs['Color'])
            links.new(normal.outputs['Normal'],shader.inputs[dest])
        else:
            links.new(node.outputs['Color'],shader.inputs[dest])

def resurface(source,target,paint=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    a,c=model/(source+'.glb'),model/(target+'.glb')
    bpy.ops.import_scene.gltf(filepath=str(a))
    mats=set()
    for ob in bpy.context.selected_objects:
        if ob.type!='MESH':continue
        uv_project(ob)
        for slot in ob.material_slots:
            if slot.material:mats.add(slot.material)
    for mat in mats:
        name=mat.name.lower()
        if paint and ('armor' in name or 'steel' in name or 'exhaust' in name):
            if 'armor' in name and not any(k in name for k in ('steel','painted')):
                mat.name=name+' painted'
            weather_material(mat)
        elif not paint and 'interior' not in name and 'undergrowth' not in name:
            stone_material(mat,'board' if any(x in name for x in ('timber','wood')) else 'stone')
    selection_export(c)
    preserve_factory_tints(a,c)

resurface('ASH_FLEET_HULLS','ASH_FLEET_HULLS_PBR',True)
resurface('AC_FIELDSTEAD','ASH_FIELDSTEAD_PBR')
resurface('ASH_SCENERY_BANK','ASH_SCENERY_BANK_PBR')
resurface('NORTH_TERRAIN_7','NORTH_WILD_GROUND_PBR')

bpy.ops.wm.read_factory_settings(use_empty=True)
b.scene=bpy.context.scene
p=b.material('Olive painted armor',(.162,.169,.092),.42,.72)
q=b.material('Dark painted armor',(.084,.094,.061),.42,.72)
m=b.material('Fasteners and steel fixtures',(.21,.201,.157),.65,.58)
b.steel=b.edge=m
lens=b.material('Vision blocks',(.064,.151,.110),.31,.30)
parts=[]
for index,(w,r,h,n) in enumerate([
    (1.22,-1.25,.84,.31),(1.39,-1.40,1.02,.17),(1.50,-1.26,.75,.25),
    (1.25,-1.55,.93,.37),(1.46,-1.48,1.12,.24)],start=5):
    name='CUST_TURRET_'+str(index)
    b.active=group=b.collection(name)
    b.cylinder('Solid turret bearing',(0,0,.052),.90,.107,m,sides=48)
    b.shell('Heavy armored turret',[(.085,b.octagon(w*.92,r,.88,n)),
        (.27,b.octagon(w,r,.96,n)),(h,b.octagon(w*(.78 if index in (5,7) else .92),r+.17,.58,n*.64))],p,.031)
    b.cylinder('Cupola',(.53,-.28,h+.084),.26,.18,q,sides=25)
    b.box('Hatch plate',(.53,-.28,h+.183),(.40,.35,.11),p)
    for x in (-.39,-.14,.11,.30):
        b.box('Periscope blister',(x,.30,h+.05),(.15,.17,.13),q)
        b.box('Vision lens',(x,.392,h+.06),(.105,.024,.036),lens,.003)
    for side in (-1,1):
        if index in (6,7,9):
            for i in range(4):
                b.crate('Heavy cheek module',(side*(w-.11),-.77+i*.36,.36),(.28,.32,.37),q if i%2 else p)
        if index in (5,8):
            block=b.box('Sloped cheek armor',(side*(w-.11),.32,.40),(.34,.82,.28),q,.034)
            block.rotation_euler.y=side*.38
        for y in (-.87,-.59,-.31,-.03,.25):
            b.bolt((side*(w-.065),y,.243),(side,0,0),.026)
    if index==8:
        for x in (-.63,.66):
            b.bar('Radio whip',(x,-1.04,h),(x*.96,-1.12,h+.76),.016,m)
    if index==9:
        b.box('Rear counterweight',(0,-1.30,.48),(1.82,.50,.56),q,.05)
    ob=b.bake_group(group,name)
    ob.name=name
    parts.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
selection_export(model/'BOR_HEAVY_TURRETS.glb')



