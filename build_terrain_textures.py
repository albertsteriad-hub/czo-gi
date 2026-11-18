"""Generate tileable road and ground material maps without external assets."""
from pathlib import Path
import math
import random
import struct
import zlib

SIZE = 512
OUT = Path(__file__).resolve().parent / 'textures'
OUT.mkdir(exist_ok=True)

def png(name, rgb):
    def chunk(kind, value):
        return struct.pack('>I', len(value)) + kind + value + struct.pack('>I', zlib.crc32(kind+value))
    stride = SIZE*3
    raw = b''.join(b'\0' + rgb[i:i+stride] for i in range(0,len(rgb),stride))
    header = struct.pack('>IIBBBBB', SIZE,SIZE,8,2,0,0,0)
    (OUT / (name+'.png')).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',header) +
        chunk(b'IDAT',zlib.compress(raw,7)) + chunk(b'IEND',b''))

def noise_grid(freq, rng):
    grid = [[rng.random() for _ in range(freq)] for _ in range(freq)]
    spans = []
    for k in range(SIZE):
        i,t = divmod(k*freq,SIZE)
        t /= SIZE
        spans.append((i,(i+1)%freq,t*t*(3-2*t)))
    result = []
    for y,ny,fy in spans:
        row0,row1 = grid[y],grid[ny]
        for x,nx,fx in spans:
            a = row0[x]*(1-fx)+row0[nx]*fx
            b = row1[x]*(1-fx)+row1[nx]*fx
            result.append(a+(b-a)*fy)
    return result

def fractures(rng):
    freq=7
    cells=[[(rng.random()*.65+.17,rng.random()*.65+.17) for _ in range(freq)] for _ in range(freq)]
    out=[]
    for y in range(SIZE):
        sy=y*freq/SIZE
        iy=int(sy)
        for x in range(SIZE):
            sx=x*freq/SIZE
            ix=int(sx)
            a,b=10.,10.
            for j in range(iy-1,iy+2):
                row=cells[j%freq]
                for i in range(ix-1,ix+2):
                    px,py=row[i%freq]
                    length=(sx-i-px)**2+(sy-j-py)**2
                    if length<a:
                        a,b=length,a
                    elif length<b:
                        b=length
            out.append(max(0,1-(math.sqrt(b)-math.sqrt(a))*21))
    return out

def enc(n):
    return max(0,min(255,round(n)))

def generate(name, seed, base, road):
    rng=random.Random(seed)
    broad, patch, aggregate=(noise_grid(freq,rng) for freq in (5,26,127))
    cracks=fractures(rng) if road else [0]*(SIZE**2)
    height, color, rough = [],bytearray(),bytearray()
    for q,(u,v,w,crack) in enumerate(zip(broad,patch,aggregate,cracks)):
        grain=rng.random()-.5
        fracture=crack*max(0,min(1,(u-.26)*3.4))
        pebble=max(0,w-.71)*49
        tint=(u-.5)*(25 if road else 47)+(v-.5)*29+grain*17+pebble-fracture*36
        olive=max(0,v-.53)*max(0,u-.34)*75 if not road else 0
        color.extend((enc(base[0]+tint-olive*.65),enc(base[1]+tint+olive*.32),enc(base[2]+tint-olive*.22)))
        r=enc(210 + (v-.5)*21 + grain*13 + fracture*16)
        rough.extend((r,r,r))
        height.append(.29*u+.22*v+.18*w+.028*grain-.23*fracture)
    normal=bytearray()
    for y in range(SIZE):
        for x in range(SIZE):
            dx=(height[y*SIZE+(x+1)%SIZE]-height[y*SIZE+(x-1)%SIZE])*2
            dy=(height[((y+1)%SIZE)*SIZE+x]-height[((y-1)%SIZE)*SIZE+x])*2
            inv=127.5/math.sqrt(dx*dx+dy*dy+1)
            normal.extend((enc(127.5-dx*inv),enc(127.5+dy*inv),enc(127.5+inv)))
    png(name+'_color', color)
    png(name+'_normal', normal)
    png(name+'_roughness', rough)

if __name__ == '__main__':
    generate('AC_asphalt',906,(78,75,67),True)
    generate('AC_earth',233,(104,86,64),False)

