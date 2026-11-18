"""Add tiled micro-surface maps to the accepted BÓR GLBs."""
from pathlib import Path
import json
import math
import random
import struct
import bpy
from build_terrain_textures import SIZE, OUT, enc, noise_grid, png

BASE = Path(__file__).resolve().parent
rng = random.Random(1705)
cloud, chips, grain = [noise_grid(f, rng) for f in (9, 46, 190)]
albedo, roughness, height = bytearray(), bytearray(), []
for a,b,c in zip(cloud,chips,grain):
    pitting = max(0,(b-.70)*3.33)*max(0,(c-.47)*1.88)
    shade = (a-.5)*28+(c-.5)*16
    albedo.extend((enc(230+shade-40*pitting),enc(224+shade-77*pitting),enc(211+shade-103*pitting)))
    rough = enc(163+46*a+39*pitting+(c-.5)*17)
    roughness.extend((rough,rough,rough))
    height.append(.04*a+.035*c-.105*pitting)
normal=bytearray()
for y in range(SIZE):
    for x in range(SIZE):
        dx=(height[y*SIZE+(x+1)%SIZE]-height[y*SIZE+(x-1)%SIZE])*4.4
        dy=(height[((y+1)%SIZE)*SIZE+x]-height[((y-1)%SIZE)*SIZE+x])*4.4
        inv=127.5/math.sqrt(1+dx*dx+dy*dy)
        normal.extend((enc(127.5-dx*inv),enc(127.5+dy*inv),enc(127.5+inv)))
for tag,pixels in [('color',albedo),('roughness',roughness),('normal',normal)]:
    png('BOR_steel_'+tag,pixels)


def uv_project(obj):
    mesh=obj.data
    layer=mesh.uv_layers.active
    if not layer:
        layer=mesh.uv_layers.new(name='Surface UV')
    for polygon in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(polygon.normal[i]))
        a,b=((1,2),(0,2),(0,1))[axis]
        for index in polygon.loop_indices:
            p=mesh.vertices[mesh.loops[index].vertex_index].co
            layer.data[index].uv = (p[a]*1.28,p[b]*1.28)


def image_node(nodes, kind, x, y):
    image=bpy.data.images.load(str(OUT / ('BOR_steel_'+kind+'.png')),check_existing=True)
    if kind!='color':
        image.colorspace_settings.name='Non-Color'
    node=nodes.new('ShaderNodeTexImage')
    node.image=image
    node.location=(x,y)
    return node


def weather_material(mat):
    if not any(name in mat.name.lower() for name in ('steel','painted','oxidized')):
        return
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    tint=tuple(bsdf.inputs['Base Color'].default_value)
    color=image_node(nodes,'color',-700,280)
    mix=nodes.new('ShaderNodeMixRGB')
    mix.blend_type='MULTIPLY'
    mix.inputs[0].default_value=1
    mix.inputs[1].default_value=tint
    mix.location=(-330,280)
    links.new(color.outputs['Color'],mix.inputs[2])
    links.new(mix.outputs[0],bsdf.inputs['Base Color'])
    rough=image_node(nodes,'roughness',-700,-20)
    links.new(rough.outputs['Color'],bsdf.inputs['Roughness'])
    normal=image_node(nodes,'normal',-700,-325)
    normal_map=nodes.new('ShaderNodeNormalMap')
    normal_map.inputs['Strength'].default_value=.60
    normal_map.location=(-330,-325)
    links.new(normal.outputs['Color'],normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'],bsdf.inputs['Normal'])


def read_glb(path):
    data=path.read_bytes()
    length=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+length]),data[20+length:]


def preserve_factory_tints(source,target):
    original,_=read_glb(source)
    finished,binary=read_glb(target)
    tints={m['name']:m['pbrMetallicRoughness'].get('baseColorFactor',[1,1,1,1])
           for m in original['materials']}
    for mat in finished['materials']:
        pbr=mat['pbrMetallicRoughness']
        if 'baseColorTexture' in pbr:
            pbr['baseColorFactor']=tints[mat['name']]
    raw=json.dumps(finished,separators=(',',':')).encode('utf8')
    raw+=b' '*(-len(raw)%4)
    target.write_bytes(struct.pack('<4sIIII',b'glTF',2,20+len(raw)+len(binary),len(raw),0x4e4f534a)+raw+binary)

for name in ('kadlub','oslony','P2','T6'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(BASE/'models'/('BOR2_'+name+'.glb')))
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            uv_project(obj)
            for slot in obj.material_slots:
                weather_material(slot.material)
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(BASE/'models'/('BOR3_'+name+'.glb')),
        export_format='GLB',use_selection=True,export_animations=False,export_vertex_color='ACTIVE')
    preserve_factory_tints(BASE/'models'/('BOR2_'+name+'.glb'),BASE/'models'/('BOR3_'+name+'.glb'))


