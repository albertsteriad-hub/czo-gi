"""Construct three textured conifers and textured woodland relief."""
from pathlib import Path
import math
import random
import bpy
import build_bor as b
from build_terrain_textures import OUT,SIZE,enc,png,noise_grid
from build_bor_finish import uv_project,preserve_factory_tints

MODELS=Path(__file__).resolve().parent/'models'
rng=random.Random(11788)
broad=noise_grid(9,rng)
medium=noise_grid(42,rng)
fine=noise_grid(155,rng)
color,rough,normal=bytearray(),bytearray(),bytearray()
height=[]
for i,(a,l,m) in enumerate(zip(broad,medium,fine)):
    x,y=i%SIZE,i//SIZE
    cluster=math.sin(x*.71+y*.96+5*l)*math.sin(y*.32-x*.46+3*a)
    h=.27*a+.25*l+.15*m+.13*cluster
    height.append(h)
    value=enc(205+28*a+48*(l-.5)+27*cluster)
    color.extend((enc(value*.96),value,enc(value*.88)))
    friction=enc(216+24*(m-.5)+16*(l-.5))
    rough.extend((friction,friction,friction))
for y in range(SIZE):
    for x in range(SIZE):
        dx=height[y*SIZE+(x+1)%SIZE]-height[y*SIZE+(x-1)%SIZE]
        dy=height[((y+1)%SIZE)*SIZE+x]-height[((y-1)%SIZE)*SIZE+x]
        n=127.5/math.sqrt(1+6*dx*dx+6*dy*dy)
        normal.extend((enc(127.5-2.45*dx*n),enc(127.5+2.45*dy*n),enc(127.5+n)))
for key,arr in [('color',color),('normal',normal),('roughness',rough)]:
    png('ASH_needles_'+key,arr)

def export(path):
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
                export_vertex_color='ACTIVE',export_animations=False)

def pbr(material,prefix,strength):
    nodes=material.node_tree.nodes
    links=material.node_tree.links
    sh=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    rgb=sh.inputs['Base Color'].default_value[:]
    for key in ('color','roughness','normal'):
        node=nodes.new('ShaderNodeTexImage')
        im=bpy.data.images.load(str(OUT/(prefix+'_'+key+'.png')),check_existing=True)
        if key!='color': im.colorspace_settings.name='Non-Color'
        node.image=im
        if key=='normal':
            norm=nodes.new('ShaderNodeNormalMap')
            norm.inputs['Strength'].default_value=strength
            links.new(node.outputs['Color'],norm.inputs['Color'])
            links.new(norm.outputs['Normal'],sh.inputs['Normal'])
        elif key=='roughness':
            links.new(node.outputs['Color'],sh.inputs['Roughness'])
        else:
            mix=nodes.new('ShaderNodeMixRGB')
            mix.blend_type='MULTIPLY'
            mix.inputs[0].default_value=1
            mix.inputs[1].default_value=rgb
            links.new(node.outputs['Color'],mix.inputs[2])
            links.new(mix.outputs[0],sh.inputs['Base Color'])

bark=b.material('Split conifer bark',(.115,.079,.048),0,.93)
species=[
    ('TREE_SPRUCE',6.9,2.24,.20,8,(.087,.149,.082)),
    ('TREE_PINE',8.2,2.56,.43,6,(.082,.139,.066)),
    ('TREE_LARCH',7.6,2.30,.32,7,(.182,.216,.082))
]
cones=[]
tints={}
for k,(name,height,radius,start,tier,color) in enumerate(species):
    group=b.active=b.collection(name)
    foliage=b.material('Needles '+name,color,0,.84)
    tints[bark.name]=list(bark.diffuse_color)
    tints[foliage.name]=list(foliage.diffuse_color)
    trunk=[]
    for j in range(8):
        z=height*j/7
        trunk.append((.26*math.sin(j*.33+k),.17*math.sin(j*.5+k),z))
    for i in range(len(trunk)-1):
        b.bar('Layered taper trunk',trunk[i],trunk[i+1],.22*(1-i/8),bark,9)
    for j in range(tier):
        t=j/(tier-1)
        h=height*(start+(1-start)*t*.88)
        r=radius*(1-t*.83)
        n=7 if k==0 else 8
        for branch in range(n):
            a=math.tau*branch/n+.73*j
            length=r*rng.uniform(.73,1.15)
            dx,dy=math.cos(a),math.sin(a)
            tail=(dx*length,dy*length,h-.38+(k==1)*.23)
            b.bar('Knotty bough',(0,0,h),tail,.069*(1-t*.60),bark,6)
            for segment in range(3):
                tseg=.35+.28*segment
                x,y,z=tail[0]*tseg,tail[1]*tseg,h+(tail[2]-h)*tseg
                wide=r*(.20+.18*(1-tseg))
                vertices=[]
                for v in range(9):
                    angle=math.tau*v/9+a*.5
                    rr=wide*rng.uniform(.65,1.19)
                    vertices.append((x+rr*math.cos(angle),y+rr*math.sin(angle),z+rng.uniform(-.1,.12)))
                vertices.extend([(x+dx*.15,y+dy*.15,z+r*(.24 if k==0 else .18)),(x,y,z-.12)])
                faces=[f for v in range(9) for f in ((v,(v+1)%9,9),((v+1)%9,v,10))]
                b.mesh('Individual needle sprays',vertices,faces,foliage,0)
    for j in range(3):
        center=trunk[-1]
        z=height*(.88+j*.043)
        rr=radius*(.18-j*.035)
        points=[(center[0]+rr*math.cos(i*math.tau/10),center[1]+rr*math.sin(i*math.tau/10),z)
                for i in range(10)]
        points.append((center[0],center[1],z+height*.09))
        b.mesh('Terminal crown',points,[(i,(i+1)%10,10) for i in range(10)],foliage,0)
    ob=b.bake_group(group,name)
    ob.name=name
    uv_project(ob)
    cones.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in cones:ob.select_set(True)
bpy.context.view_layer.objects.active=cones[0]
raw=MODELS/'ASH_WOODLAND_TINTS.glb'
export(raw)
pbr(bark,'ASH_board',.74)
for name,_,_,_,_,_ in species:
    pbr(bpy.data.materials.get('Needles '+name),'ASH_needles',.47)
final=MODELS/'ASH_WOODLAND_TREES.glb'
export(final)
preserve_factory_tints(raw,final)
raw.unlink()

for source,key in [('NORTH_PINE_JOIN','NORTH_PINE_JOIN_PBR'),('NORTH_TERRAIN_8','NORTH_PINE_GROUND_PBR')]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    original=MODELS/(source+'.glb')
    bpy.ops.import_scene.gltf(filepath=str(original))
    for ob in bpy.context.selected_objects:
        if ob.type=='MESH':
            uv_project(ob)
            for mat in ob.data.materials:
                pbr(mat,'ASH_needles',.25)
    target=MODELS/(key+'.glb')
    export(target)
    preserve_factory_tints(original,target)


