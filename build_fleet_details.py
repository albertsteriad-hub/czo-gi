"""Build four vehicle hulls, field equipment and sector details."""
from pathlib import Path
import random
import math
import bpy
import build_bor as g

out=Path(__file__).resolve().parent/'models'
rng=random.Random(643)
armor=g.material('Olive painted armor',(.158,.164,.086),.37,.74)
dark=g.material('Dark painted armor',(.084,.099,.058),.40,.75)
rust=g.material('Oxidized exhaust',(.133,.081,.051),.42,.82)
steel=g.material('Worn steel',(.193,.184,.151),.65,.65)
rub=g.material('Gasket rubber',(.037,.033,.024),0,.93)
brass=g.material('Amber dial paint',(.44,.29,.106),.31,.64)
wood=g.material('Dark weathered timber',(.163,.109,.067),0,.88)
stone=g.material('Grey bank stones',(.152,.165,.149),0,.95)
leaf=g.material('Forest undergrowth',(.082,.144,.060),0,.91)
lamp=g.material('Warm glass',(.54,.35,.165),.16,.29)

def group(tag):
    g.active=g.collection(tag)
    return g.active

def finish(col,tag):
    ob=g.bake_group(col,tag)
    ob.data.name=tag
    return ob

def export(objs,key):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.export_scene.gltf(filepath=str(out/(key+'.glb')),export_format='GLB',
            use_selection=True,export_animations=False)

def shell(name,w,back,front,height,cut):
    g.shell(name,[(.42,g.octagon(w*.80,back+.16,front-.30,cut*.68)),
          (1.03,g.octagon(w,back,front,cut)),
          (height,g.octagon(w*.86,back+.14,front-.82,cut*.89))],armor,.035)

hulls=[]
for i,(w,back,front,height,cut) in enumerate([
    (1.51,-2.55,2.62,1.42,.46),(1.57,-3.03,3.25,1.80,.19),
    (1.59,-2.81,3.25,1.63,.32),(1.54,-2.92,3.11,1.48,.32)
]):
    tag='FLEET_HULL_'+str(i+1);col=group(tag)
    shell('Main hull envelope',w,back,front,height,cut)
    if i==3:
        g.shell('Low fixed casemate',[(1.43,g.octagon(1.18,-1.40,1.32,.31)),
            (1.63,g.octagon(1.19,-1.35,1.28,.34)),
            (2.04,g.octagon(.86,-1.21,.83,.20))],armor,.047)
        g.box('Fixed breech mounting', (0,1.00,1.68),(.53,.17,.36),dark,.033)
    else:
        g.cylinder('Turret ring',(0,0,height+.006),.86,.065,dark,sides=42)
    for side in (-1,1):
        g.box('Side fender',(side*1.48,-.09,1.40),(.26,4.53,.10),dark)
        box=g.box('Radiator casing',(side*.66,back+.51,height+.026),(.61,.69,.085),dark)
        for y in range(5):
            g.box('Slatted radiator',(side*.66,back+.25+y*.131,height+.078),(.52,.057,.031),steel,.005)
        g.box('Armored headlamp',(side*.87,front-.56,height-.12),(.23,.24,.24),dark)
        g.cylinder('Front lamp lens',(side*.87,front-.432,height-.10),.072,.021,lamp,(0,1,0))
        g.bar('External towing cable',(side*1.18,back+.36,height-.046),
          (side*1.2,front-.92,height-.046),.026,steel)
        for y in (-1.45,-.93,-.41,.11,.63,1.15):
            g.bolt((side*1.44,y,1.34),(side,0,0),.023)
        if i in (1,2):
            j=6 if i==1 else 4
            for y in range(j):
                g.box('Spaced side block',(side*1.47,(y-(j-1)/2)*.53,1.12),(.17,.47,.39),armor)
            g.cylinder('Exhaust stack',(side*1.03,back+.48,height+.27),.102,.52,rust)
    if i==2:
        for side in (-1,1):
            p=g.box('Armored assault wedge',(side*.51,front-.16,.81),(.88,.69,.41),dark,.052)
            p.rotation_euler.x=-.25
            for x in (-.28,0,.28):
                g.box('Wedge reinforcement',(side*.51+x,front+.13,.75),(.102,.11,.28),steel,.013)
    if i==0:
        g.bar('Recon mast',(.65,back+.54,height),(.66,back+.51,height+.62),.018,steel)
        g.crate('Light roll store',(-.91,back+.61,height+.13),(.51,.51,.24),dark)
    if i==1:
        g.box('Heavy mantlet deck plate',(0,front-.51,height-.13),(1.45,.63,.164),dark).rotation_euler.x=-.21
    hulls.append(finish(col,tag))
export(hulls,'ASH_FLEET_HULLS')

equipment=[]
for i in range(1,4):
    tag='FLEET_EQUIP_'+str(i);col=group(tag)
    if i==1:
        for x in (-.55,0,.55):
            g.crate('Rear cargo locker',(x,-2.28,1.76),(.49,.61,.41),wood)
    elif i==2:
        for side in (-1,1):
            for n in range(4):
                g.cylinder('Smoke rack canister',(side*1.23,.59+n*.14,1.58),.053,.25,
                      dark,(side*.70,.30,.65),sides=12)
    else:
        for x in (-.60,.60):
            g.box('Field tool chest',(x,-2.15,1.66),(.48,.64,.31),armor)
            g.bar('Tool lever',(x-.18,-2.30,1.88),(x+.19,-2.04,1.88),.021,steel)
        g.cylinder('Spare wheel',(0,-2.35,1.81),.30,.17,rub,(0,1,0))
        g.cylinder('Wheel center',(0,-2.45,1.81),.15,.13,steel,(0,1,0))
    equipment.append(finish(col,tag))
export(equipment,'ASH_FLEET_EQUIPMENT')

col=group('ASH_COCKPIT')
# The model is mounted to the scene camera. The center of the viewport remains open.
for x in (-.56,.56):
    g.box('Vision-slot side plate',(x,.71,0),(.26,.09,.95),dark,.015)
g.box('Upper vision-slot frame',(0,.71,.47),(1.14,.09,.19),armor,.014)
g.box('Lower dashboard',(0,.70,-.43),(1.16,.12,.36),dark,.018)
for x in (-.34,-.21,.22,.34):
    g.cylinder('Instrument bezel',(x,.623,-.34),.048,.022,steel,(0,1,0),sides=20)
    g.cylinder('Instrument dial',(x,.605,-.34),.038,.017,rub,(0,1,0),sides=20)
    g.bar('Instrument needle',(x,.592,-.34),(x+.02,.592,-.32),.005,brass,6)
for x in (-.15,-.075,0,.075,.15):
    g.box('Dashboard lamp',(x,.60,-.52),(.032,.017,.026),lamp,.004)
export([finish(col,'ASH_COCKPIT')],'ASH_COCKPIT')

col=group('ASH_SCENERY_CRATES')
for x,y,h in [(-.56,0,.28),(.14,.16,.32),(.62,-.13,.20),(-.61,.08,.74)]:
    g.crate('Supply crate',(x,y,h),(.58,.6,.48),wood)
for x in (-1.07,1.07):
    g.cylinder('Fuel drum',(x,.19,.39),.238,.76,rust,sides=16)
    for z in (.18,.56):
        g.cylinder('Drum rolling band',(x,.19,z),.247,.042,steel,sides=16)
export([finish(col,'ASH_SCENERY_CRATES')],'ASH_SCENERY_CRATES')

col=group('ASH_SCENERY_BANK')
for i in range(16):
    x=rng.uniform(-2.8,2.8);y=rng.uniform(-1.13,1.13);k=rng.uniform(.16,.51)
    ring=[(x+math.cos(j*math.tau/7)*k*rng.uniform(.67,1.15),
        y+math.sin(j*math.tau/7)*k*.80,0) for j in range(7)]
    coords=ring+[(x-.05,y+.06,k*.76)]
    g.mesh('Jagged stone',coords,[(j,(j+1)%7,7) for j in range(7)],stone,0)
for j in range(31):
    x=rng.uniform(-2.8,2.8);y=rng.uniform(-1.4,1.4)
    g.bar('Ditch sedge',(x,y,0),(x+.07,y,rng.uniform(.13,.44)),.031,leaf,5)
export([finish(col,'ASH_SCENERY_BANK')],'ASH_SCENERY_BANK')

