"""Build long turret variants and removable reinforced armor for BÓR."""
import bpy
from pathlib import Path
from mathutils import Vector

out=Path(__file__).resolve().parent/'models'

def export(name):
    bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',
        use_selection=True,export_animations=False,export_vertex_color='ACTIVE')

for turret in ('P2','T6'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out/('BOR3_'+turret+'.glb')))
    for obj in bpy.context.selected_objects:
        if obj.type!='MESH':
            continue
        inv=obj.matrix_world.inverted()
        for v in obj.data.vertices:
            p=obj.matrix_world @ v.co
            extension=.78*max(0,min(1,(p.y-.91)/1.48))
            if extension:
                p.y+=extension
                v.co=inv @ p
    export('BOR_LONG_'+turret)

bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,c):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*c,1)
    bsdf.inputs['Metallic'].default_value=.47
    bsdf.inputs['Roughness'].default_value=.72
    return m

plate=mat('Scuffed armor olive',(.137,.153,.084))
lip=mat('Dark oxidized steel',(.104,.071,.054))
bolts=mat('Exposed fasteners',(.25,.23,.16))
objects=[]
def block(name,pos,dim,m,bevel=.022):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
    o=bpy.context.object
    for v in o.data.vertices:
        v.co=Vector(tuple(v.co[i]*dim[i] for i in range(3)))
    o.name=name
    o.data.materials.append(m)
    modifier=o.modifiers.new('Rounded forged edges','BEVEL')
    modifier.width=bevel
    modifier.segments=2
    objects.append(o)

for side in (-1,1):
    for i,y in enumerate((-1.51,-.915,-.32,.275,.87,1.465)):
        block('Bolt-on skirt plate',(side*1.784,y,1.14),(.173,.548,.285),plate)
        block('Lower steel lip',(side*1.867,y,1.028),(.066,.512,.064),lip,.009)
        for pos in (-.186,.186):
            bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.026,depth=.028,
                location=(side*1.885,y+pos,1.195),rotation=(0,1.570796,0))
            ob=bpy.context.object
            ob.name='Armor mounting bolt'
            ob.data.materials.append(bolts)
            objects.append(ob)
for x in (-.75,.75):
    block('Glacis applique',(x,2.09,1.668),(1.0,.42,.12),plate)
    objects[-1].rotation_euler.x=-.29
    block('Glacis seam',(x,2.258,1.68),(.96,.07,.065),lip,.008)
    objects[-1].rotation_euler.x=-.29
bpy.ops.object.select_all(action='DESELECT')
for o in objects:
    o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.object.convert(target='MESH')
bpy.ops.object.join()
obj=bpy.context.object
bpy.context.scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
obj.name='BOR reinforced field armor'
export('BOR_FIELD_ARMOR')

