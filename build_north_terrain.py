"""Generate the northern terrain, river ribbons and repeatable fir GLBs."""
from pathlib import Path
import json
import math
import random
import subprocess

import bpy

BASE=Path(__file__).resolve().parent
MODEL=BASE/'models'
rng=random.Random(275)

js=r"""
const w=require('./ash-world.js');
const rows=[];
for(let r=0;r<4;r++){
 const v=[];
 for(let j=0;j<=61;j++)for(let i=0;i<=150;i++){
  const x=-300+i*4,z=765+r*183+j*3;
  v.push([x,z,w.northTerrain(x,z)]);
 }
 rows.push(v);
}
const rivers=w.north.periods.map((_,index)=>Array.from({length:151},(_,i)=>{
 const x=-300+i*4;
 return [x,w.riverLine(x,index)];
}));
console.log(JSON.stringify({rows,rivers,water:w.north.water}));
"""
data=json.loads(subprocess.check_output(['node','-e',js],cwd=BASE,text=True))
bpy.ops.wm.read_factory_settings(use_empty=True)

def make_material(name,c,roughness):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*c,1)
    bsdf.inputs['Roughness'].default_value=roughness
    return m

def mesh_object(name,vertices,faces,m,colors=None,smooth=False):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.materials.append(m)
    if colors:
        attr=mesh.color_attributes.new(name='Albedo',type='FLOAT_COLOR',domain='POINT')
        mesh.color_attributes.active_color=attr
        for i,c in enumerate(colors):
            attr.data[i].color=(*c,1)
    if smooth:
        for p in mesh.polygons:
            p.use_smooth=True
    return obj

def export(obj,name):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(MODEL/(name+'.glb')), export_format='GLB',
        use_selection=True,export_animations=False,export_vertex_color='ACTIVE')

surface=make_material('Northern grass, scree and shore',(.83,.83,.83),.95)
for row,samples in enumerate(data['rows']):
    coords=[(x,-z,h) for x,z,h in samples]
    faces=[]
    for j in range(61):
        for i in range(150):
            a=j*151+i
            faces.extend([(a,a+152,a+1),(a,a+151,a+152)])
    colors=[]
    for x,z,h in samples:
        a=.54+.16*math.sin(x*.064+z*.034)+.11*math.sin(z*.208-x*.123)
        b=max(0,min(1,(h-4.1)/7))
        if h<-.37 and z>816: base=(.113,.104,.080)
        else: base=(.106+.18*b,.143+.09*b,.055+.11*b)
        colors.append(tuple(c*a for c in base))
    ob=mesh_object('Northern relief '+str(row+1),coords,faces,surface,colors,True)
    export(ob,'NORTH_TERRAIN_'+str(row+1))

water=make_material('Cold river water',(.033,.102,.122),.25)
verts,faces,colors=[],[],[]
for river in data['rivers']:
    start=len(verts)
    for x,z in river:
        for d in (-12,0,12):
            verts.append((x,-z+d,data['water']))
            f=.72+.12*math.sin(x*.083)+.10*math.sin(z*.157+d*.29)
            colors.append((f*.77,f*.93,f))
    for i in range(150):
        for j in range(2):
            a=start+3*i+j
            faces.append((a,a+3,a+4,a+1))
export(mesh_object('River ribbons',verts,faces,water,colors),'NORTH_RIVERS')

fir=make_material('Fir bark and needles',(.65,.65,.65),.96)
verts,faces,colors=[],[],[]
for z,rad in [(0,.18),(2,.13),(4,.08),(6.2,.028)]:
    for i in range(8):
        angle=math.tau*i/8
        verts.append((math.cos(angle)*rad,math.sin(angle)*rad,z))
        colors.append((.117,.076,.043))
for r in range(3):
    for i in range(8):
        a=r*8+i
        b=r*8+(i+1)%8
        faces.append((a,b,b+8,a+8))
for tier in range(7):
    h=1.48+tier*.62
    radius=1.84-tier*.225
    count=18
    start=len(verts)
    for i in range(count):
        angle=math.tau*i/count+tier*.46
        r=radius*rng.uniform(.78,1.17)*(1 if i%2 else .63)
        verts.append((math.cos(angle)*r,math.sin(angle)*r,h+rng.uniform(-.30,.11)))
        shade=rng.uniform(.7,1.13)
        colors.append((.078*shade,.145*shade,.079*shade))
    verts.append((.03,0,h+1.67))
    colors.append((.116,.174,.085))
    for i in range(count):
        faces.append((start+i,start+(i+1)%count,start+count))
export(mesh_object('Northern fir',verts,faces,fir,colors),'NORTH_FIR')

