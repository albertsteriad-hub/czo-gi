"""Synthesize original game audio samples with deterministic PCM."""
from pathlib import Path
import math
import random
import wave
from array import array

OUT=Path(__file__).resolve().parent/'audio'
OUT.mkdir(exist_ok=True)
RATE=44100

def write(name, heavy):
    rng=random.Random(9758 if heavy else 2192)
    duration=2.0 if heavy else 1.62
    count=int(RATE*duration)
    signal=[]
    low=0
    mid=0
    prev=0
    start=0.018
    echoes=[(.119,.31),(.231,.18),(.348,.13),(.511,.09),(.73,.052)]
    for i in range(count):
        t=i/RATE-start
        if t<0:
            signal.append(0.)
            continue
        noise=rng.uniform(-1,1)
        low+=.028*(noise-low)
        mid+=.17*(noise-mid)
        shock=noise-mid
        rise=min(1,t/.0028)
        pitch=83 if heavy else 106
        pressure=(.74*math.sin(2*math.pi*(pitch*.23*t+pitch*.77*(1-math.exp(-t*11))/11))*
                  math.exp(-t*(9 if heavy else 12)))
        body=2.3*low*math.exp(-t*4.4)+.83*mid*math.exp(-t*17)
        crack=.65*shock*math.exp(-t*77)+.41*(noise-prev)*math.exp(-t*135)
        prev=noise
        val=rise*(pressure+body+crack)
        for delay,gain in echoes:
            offset=int(delay*RATE)
            if i>=offset:
                val+=signal[i-offset]*gain
        signal.append(math.tanh(val*.83))
    peak=max(abs(x) for x in signal)
    pcm=array('h')
    for i,x in enumerate(signal):
        tail=min(1,(count-i)/(RATE*.13))
        pcm.append(round(x*tail*.90/peak*32767))
    with wave.open(str(OUT/(name+'.wav')),'wb') as f:
        f.setparams((1,2,RATE,0,'NONE','not compressed'))
        f.writeframes(pcm.tobytes())

if __name__=='__main__':
    write('ASH_cannon_field',False)
    write('ASH_cannon_heavy',True)

