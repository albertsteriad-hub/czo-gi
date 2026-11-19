"""Export fifteen modular configuration meshes and new valley scenery."""
from pathlib import Path
import math
import random
import bpy
import build_bor as b

out=Path(__file__).resolve().parent/'models'
rng=random.Random(2134)
p=b.material('Olive painted armor',(.166,.162,.096),.43,.73)
tone=b.material('Dark painted armor',(.088,.101,.063),.45,.77)
bare=b.material('Blackened barrel steel',(.075,.082,.078),.76,.54)
rim=b.material('Worn fasteners',(.22,.212,.176),.65,.54)
optic=b.material('Optical glass',(.056,.21,.177),.25,.25)
rock=b.material('Mountain shale',(.101,.112,.095),0,.96)
gravel=b.material('Fractured ridge',(.155,.154,.119),0,.94)
concrete=b.material('Weathered portal concrete',(.25,.24,.20),0,.84)
grass=b.material('Northern road verge',(.133,.185,.070),0,.96)
grass2=b.material('Dry highland grass',(.24,.224,.100),0,.95)

def export(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',
        use_selection=True,export_animations=False,export_vertex_color='ACTIVE')

def new(key):
    b.active=b.collection(key)
    return b.active

def bake(group,key):
    obj=b.bake_group(group,key)
    obj.data.name=key
    return obj

def box(*args,**kwargs):
    return b.box(*args,**kwargs)

turrets=[]
for i,(width,rear,front,height,cut) in enumerate([
    (1.00,-.93,.85,.41,.28),(1.04,-1.04,.86,.76,.15),
    (1.11,-.89,.83,.46,.39),(1.24,-1.07,.89,.51,.22),(.94,-1.03,.84,.63,.20)
]):
    key=f'CUST_TURRET_{i}'
    group=new(key)
    b.cylinder('Central bearing',(0,0,.037),.89,.074,bare,sides=48)
    b.shell('Faceted turret envelope',[(.069,b.octagon(width,rear,front,cut)),
        (.18,b.octagon(width,rear,front,cut)),
        (height,b.octagon(width*(.7 if i in (0,2) else .88),rear+.13,front-(.40 if i in (0,2) else .14),cut*.72))],p)
    b.cylinder('Commander ring',(.23,-.11,height+.04),.22,.082,tone,sides=24)
    box('Low hatch',(.23,-.11,height+.09),(.33,.32,.055),p)
    for x in (-.3,0,.3):
        box('Armored optics',(x,.30,height+.046),(.15,.117,.111),tone)
        box('Periscope glass',(x,.363,height+.055),(.107,.015,.034),optic,.003)
    for side in (-1,1):
        if i in (1,3):
            for j in range(3):
                b.crate('Cheek cassette',(side*(width+.015),-.67+j*.3,.23+height*.24),(.16,.25,.23),tone)
        if i==2:
            box('Low angle applique',(side*.99,.10,.25),(.12,.76,.12),tone).rotation_euler.y=side*.24
        if i==4:
            b.bar('Radio aerial',(side*.58,-.74,height),(side*.64,-.85,height+.60),.012,rim)
        for y in (-.67,-.46,-.25,.0,.25):
            b.bolt((side*(width-.041),y,.212),(side,0,0),.023)
    turrets.append(bake(group,key))
export(turrets,'BOR_TURRET_CATALOG')

barrels=[]
for i,length in enumerate((1.13,1.55,1.93,2.25,2.54)):
    key=f'CUST_BARREL_{i}'
    group=new(key)
    r=(.066,.077,.085,.093,.081)[i]
    b.cylinder('Mantlet',(0,.056,0),.175+i*.011,.174,tone,(0,1,0),sides=24)
    b.cylinder('Barrel jacket',(0,.24,0),r*1.9,.35,bare,(0,1,0))
    b.cylinder('Barrel tube',(0,.37+(length-.37)/2,0),r,length-.37,bare,(0,1,0))
    b.cylinder('Muzzle sleeve',(0,length-.045,0),r*(1.61 if i!=3 else 2.0),.14,rim,(0,1,0))
    b.cylinder('Muzzle bore',(0,length+.026,0),r*.74,.012,bare,(0,1,0))
    if i in (2,3,4):
        for side in (-1,1):
            for step in (0,.067):
                box('Muzzle brake slot',(side*r*1.4,length-.107+step,0),(.047,.042,.075),tone,.005)
    barrels.append(bake(group,key))
export(barrels,'BOR_BARREL_CATALOG')

armors=[]
for i in range(5):
    key=f'CUST_ARMOR_{i}'
    group=new(key)
    for side in (-1,1):
        for j in range(4+i):
            width=.64 if i<3 else .51
            y=(j-(3+i)/2)*(width+.06)
            x=side*(1.736+.027*i)
            if i==2:
                for z in (.96,1.155,1.35):
                    box('Spaced screen rail',(x,y,z),(.078,width+.035,.062),tone,.008)
                box('Screen post',(x,y+.18,1.154),(.088,.046,.42),bare,.009)
            else:
                thickness=(.06,.11,.07,.16,.195)[i]
                plate=box('Replaceable armor plate',(x,y,1.108), (thickness,width,.21+.035*i),p)
                if i==3:
                    plate.rotation_euler.y=side*.34
                for inset in (-.18,.18):
                    b.bolt((x+side*(thickness/2+.01),y+inset,1.15),(side,0,0))
    if i in (3,4):
        for x in (-.69,.69):
            box('Front applique',(x,2.103,1.625),(.89,.33,.105),tone).rotation_euler.x=-.29
    armors.append(bake(group,key))
export(armors,'BOR_ARMOR_CATALOG')

group=new('GRASS_CLUMP')
vertices=[];faces=[]
for i in range(220):
    x=rng.uniform(-3.6,3.6);y=rng.uniform(-3.6,3.6)
    if (x/3.6)**2+(y/3.6)**2>1.12: continue
    h=rng.uniform(.19,.76);r=rng.uniform(.07,.15);a=rng.uniform(0,math.tau)
    vx=r*math.cos(a);vy=r*math.sin(a)
    k=len(vertices)
    vertices.extend([(x-vx,y-vy,0),(x+vx,y+vy,0),
        (x+vx*.40+.06,y+vy*.4,h*.54),(x+.13,y-.09,h),(x-vx*.4+.06,y-vy*.4,h*.54)])
    faces.extend([(k,k+1,k+2,k+4),(k+4,k+2,k+3),(k+4,k+2,k+1,k),(k+3,k+2,k+4)])
b.mesh('Layered verge grass',vertices,faces,grass,0)
export([bake(group,'NORTH_GRASS')],'NORTH_GRASS')

group=new('Valley wall')
def wall(sign):
    verts=[];faces=[]
    xs=(263,274,289,300,318)
    for j in range(81):
        z=-150+j*(2379/80)
        for i,x in enumerate(xs):
            h=(0,10,36,53,11)[i]
            h*=.83+.28*math.sin(z*.028+sign*2)+.20*math.sin(z*.081+sign)
            verts.append((sign*x,-z,h-.12))
    for j in range(80):
        for i in range(4):
            a=j*5+i
            f=(a,a+1,a+6,a+5) if sign<0 else (a,a+5,a+6,a+1)
            faces.append(f)
    b.mesh('Side ridge',verts,faces,rock,0)
wall(-1);wall(1)
for z,sign in [(-150,-1),(2229,1)]:
    verts=[];faces=[]
    for i in range(61):
        x=-300+i*10
        for k in range(4):
            h=(1,18,51,12)[k]*(.72+.34*math.sin(x*.037+sign)+.18*math.cos(x*.081))
            verts.append((x,-(z+sign*(-30+k*18)),h))
    for i in range(60):
        for k in range(3):
            a=i*4+k
            f=(a,a+4,a+5,a+1) if sign<0 else (a,a+1,a+5,a+4)
            faces.append(f)
    b.mesh('End ridge',verts,faces,rock,0)
export([bake(group,'ASH_VALLEY_WALLS')],'ASH_VALLEY_WALLS_PINE')

group=new('Tunnel passage')
# Local Y runs along the road. The inner opening is kept free of solid faces.
span=23
for side in (-1,1):
    box('Retaining wall',(side*5.60,0,1.70),(1.68,span*2,3.41),concrete,.025)
    for y in (-span,span):
        box('Portal upright',(side*5.32,y,2.05),(1.48,1.05,4.13),concrete,.045)
for i in range(12):
    a=math.pi*i/12
    q=math.pi*(i+1)/12
    def pt(t,r,y):return (r*math.cos(t),y,3.08+r*.70*math.sin(t))
    v=[pt(a,4.78,-span),pt(q,4.78,-span),pt(q,4.78,span),pt(a,4.78,span),
       pt(a,5.48,-span),pt(q,5.48,-span),pt(q,5.48,span),pt(a,5.48,span)]
    f=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2)]
    b.mesh('Tunnel vault',v,f,concrete,0)
for side in (-1,1):
    # Graded slopes sit outside the portal opening.
    v=[(side*6.0,-29,0),(side*48,-31,0),(side*53,34,0),(side*6.0,28,0),
       (side*10,-16,9.2),(side*31,-18,16.7),(side*38,15,19.4),(side*11,21,11.4)]
    faces=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    if side<0:faces=[tuple(reversed(f)) for f in faces]
    b.mesh('Rock hill beside portal',v,faces,rock,0)
# Crest spans the roof without filling the tunnel below it.
v=[(-7,-23,6.7),(7,-23,6.7),(8,23,6.6),(-8,23,6.6),(-11,-10,10.7),(10,-9,13.0),(9,12,14.3),(-9,11,13.8)]
f=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
b.mesh('Ridge above tunnel',v,f,gravel,0)
export([bake(group,'ASH_ROAD_TUNNEL')],'ASH_ROAD_TUNNEL')




