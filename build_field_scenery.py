"""Generate the contract's original farm buildings and forest edge."""
import math
import random
from pathlib import Path

import bpy
import build_bor as geo

out = Path(__file__).resolve().parent / 'models'
rng=random.Random(618)
wood=[geo.material('Weathered timber '+str(i), c,0,.94) for i,c in enumerate(
    ((.15,.093,.056),(.22,.15,.095),(.18,.119,.07),(.25,.177,.109)))]
plaster=geo.material('Limewash',(.38,.34,.24),0,.89)
stone=geo.material('Foundation stone',(.18,.175,.148),0,.93)
roof=[geo.material('Oxidized sheet '+str(i), c,.38,.74) for i,c in enumerate(
    ((.18,.097,.064),(.13,.085,.06),(.23,.128,.084)))]
window=geo.material('Dim interior',(.023,.029,.024),0,.90)
bark=geo.material('Pine bark',(.115,.079,.045),0,.95)
needles=[geo.material('Pine needles '+str(i), c,0,.93) for i,c in enumerate(
    ((.066,.105,.049),(.092,.129,.062),(.114,.158,.068),(.064,.084,.047)))]
growth=geo.material('Dry grass and moss',(.186,.215,.091),0,.96)
crop=geo.material('Weathered stalks',(.317,.252,.121),0,.91)

def box(name,x,z,h,sizes,mat,bevel=.017):
    return geo.box(name,(x,-z,h),sizes,mat,bevel)

def house(cx,cz,w,d,wallh,ridge,dwelling):
    box('Foundation',cx,cz,.17,(w+.15,d+.15,.34),stone,.06)
    box('Wall substrate',cx,cz,.34+wallh/2,(w,d,wallh),plaster if dwelling else wood[0])
    for z in (cz-d/2-.016,cz+d/2+.016):
        for i in range(round(w/.18)):
            x=cx-w/2+(i+.5)*w/round(w/.18)
            if dwelling and abs(x-cx)>.95 and abs(x-cx)<2.1:
                continue
            box('Siding board',x,z,.38+wallh/2,(.157,.055,wallh-.10),rng.choice(wood),.009)
    z=cz-d/2-.068
    for dx in (-w*.26,w*.26):
        box('Window frame',cx+dx,z,1.57,(.91,.081,.75),wood[3])
        box('Recessed window',cx+dx,z-.052,1.57,(.73,.019,.59),window,.006)
        box('Window crossbar',cx+dx,z-.067,1.57,(.79,.037,.048),wood[2],.004)
        box('Window mullion',cx+dx,z-.067,1.57,(.049,.037,.63),wood[2],.004)
        for sign in (-1,1):
            box('Wood shutter',cx+dx+sign*.53,z,1.59,(.23,.071,.73),wood[1],.012)
    box('Door surround',cx,z,1.18,(1.24,.15,1.99),wood[0])
    for step in range(3):
        box('Doorstep',cx,z-.32-step*.24,.27-step*.07,(1.48,.53,.21),stone,.039)
    for i in range(7):
        box('Door plank',cx+(i-3)*.157,z-.094,1.18,(.146,.053,1.78),wood[(i+1)%4])
    eave=.34+wallh
    hw=w/2+.28
    half=d/2+.37
    rise=ridge
    for sign in (-1,1):
        slope=math.atan2(rise,hw)
        for i in range(round(2*half/.28)):
            y=-cz-half+(i+.5)*2*half/round(2*half/.28)
            panel=geo.box('Lapped roof sheet',(cx+sign*hw/2,y,eave+rise/2),
                (math.hypot(hw,rise)+.035,.284,.075),rng.choice(roof),.012)
            panel.rotation_euler.y=sign*slope
        for dz in (-half,half):
            a=(cx+sign*hw,-cz+dz,eave)
            b=(cx,-cz+dz,eave+rise)
            geo.bar('Gable verge',a,b,.075,wood[0],8)
    box('Ridge flashing',cx,cz,eave+rise+.048,(.23,2*half,.11),roof[0])
    if dwelling:
        box('Brick chimney',cx+w*.20,cz+.71,eave+rise*.62,(.54,.60,1.4),stone)
        box('Chimney cap',cx+w*.20,cz+.71,eave+rise*.62+.71,(.68,.73,.14),stone)
    return

def export(col,key):
    obj=geo.bake_group(col,key)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(out/(key+'.glb')),export_format='GLB',
        use_selection=True,export_animations=False)

geo.active=farm=geo.collection('Settlers fieldstead')
house(-13.5,45,5.8,4.2,2.55,1.29,True)
house(-21,50,4.5,3.6,2.1,1.1,False)
for i in range(9):
    x=-19.4+i*1.67
    box('Fence post',x,40,.41,(.14,.15,.87),wood[0])
    if i<8:
        for h in (.27,.60):
            box('Split rail',x+.82,40,h,(1.66,.10,.12),rng.choice(wood))
for x,z in [(-10.9,42.4),(-14.3,42.5),(-21,47.6)]:
    geo.crate('Stacked farm crate',(x,-z,.30),(.61,.52,.48),rng.choice(wood))
for row in range(7):
    for col in range(12):
        x=-19.5+row*.70+rng.uniform(-.16,.16)
        z=33+col*.51+rng.uniform(-.20,.20)
        if rng.random()<.18:
            continue
        for _ in range(3):
            dx=rng.uniform(-.15,.15); dz=rng.uniform(-.13,.13)
            h=rng.uniform(.25,.60)
            geo.bar('Field stalk',(x,-z,0),(x+dx,-z+dz,h),.018,crop,5)
            geo.cylinder('Seed head',(x+dx,-z+dz,h),.039,.10,crop,sides=5,bevel=0)
export(farm,'AC_FIELDSTEAD')

geo.active=forest=geo.collection('Forest edge')
def tree(x,z,height):
    y=-z
    lean=rng.uniform(-.18,.18)
    geo.bar('Tapered pine trunk',(x,y,0),(x+lean,y,height*.91),height*.023,bark,9)
    for k in range(6):
        h=height*(.29+.101*k)
        rad=height*(.255-.031*k)*rng.uniform(.88,1.10)
        points=15
        center=x+lean*h/height
        span=[]
        for i in range(points):
            a=math.tau*i/points+.36*k
            r=rad*(rng.uniform(.77,1.24) if i%2 else rng.uniform(.51,.81))
            span.append((center+r*math.cos(a),y+r*math.sin(a),h-rng.uniform(0,.17)*rad))
        vertices=span+[(center,y,h+.35*height),(center,y,h+rad*.13)]
        faces=[face for i in range(points) for face in ((i,(i+1)%points,points),
                                                        ((i+1)%points,i,points+1))]
        geo.mesh('Layered pine boughs',vertices,faces,needles[k%len(needles)],0)
for x,z in [(14,61),(16,68),(20,63),(22,68),(25,61),(27,67),(26,73),(17,75),(20,77),
            (29,78),(32,67),(30,60),(24,78),(38,72),(-26,51),(-26,43),(-24,59),(-29,57)]:
    tree(x+rng.uniform(-.5,.5),z+rng.uniform(-.6,.6),rng.uniform(5.6,9.5))
for x,z in [(11,58),(12,69),(19,58),(22,59),(23,65),(16,73),(-9,43),(-8,38),(-23,46)]:
    for _ in range(16):
        bx=x+rng.uniform(-1.0,1.0); bz=z+rng.uniform(-1.0,1.0)
        geo.bar('Verge grass',(bx,-bz,0),(bx+rng.uniform(-.19,.19),-bz,rng.uniform(.19,.57)),.027,growth,5)
export(forest,'AC_FOREST_EDGE')

