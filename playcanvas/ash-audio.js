function ashAudioFrame(speed,turn,power,rain) {
    const velocity=Math.abs(speed),steer=Math.min(1,Math.abs(turn)/.56);
    const gear=velocity<2.6?1:velocity<5.9?2:3;
    const ratios=[0,22,12,7.2];
    const rpm=570+velocity*ratios[gear]*10+power*270+steer*145;
    const travel=velocity+1.65*Math.abs(turn);
    return {
        rpm:rpm, engine: .12+power*.085+steer*.035,
        track:Math.min(.20,travel*.025), rattleHz:Math.max(1,travel/.151),
        wind:Math.min(.12,.016+velocity*.008), rain:Math.max(0,Math.min(1,rain))*.10
    };
}

if (typeof module !== 'undefined' && module.exports) module.exports=ashAudioFrame;

if (typeof pc !== 'undefined') {
    var AshAudio=pc.createScript('ashAudio');

    AshAudio.prototype.initialize = function () {
        this.drive=this.entity.script.acHeavyDrive;
        this.button=document.createElement('button');
        this.button.type='button';
        this.button.textContent='Włącz dźwięk';
        this.button.setAttribute('aria-pressed','false');
        this.button.style.cssText='position:fixed;left:50%;top:38px;transform:translateX(-50%);z-index:22;color:#ece0ba;background:#2b2b23;border:1px solid #987d50;padding:4px 8px;font:12px ui-monospace;cursor:pointer';
        this.button.addEventListener('mousedown',function (e) { e.stopPropagation(); });
        this.button.addEventListener('click',this.toggle.bind(this));
        document.body.append(this.button);
        this.entity.on('bor:shot',this.reportShot,this);
        this.on('disable',function () {
            this.button.hidden=true;
            if (this.master) this.master.gain.setTargetAtTime(0,this.audio.currentTime,.05);
        },this);
        this.on('enable',function () {
            this.button.hidden=false;
            if (this.master&&this.playing) this.master.gain.setTargetAtTime(.55,this.audio.currentTime,.05);
        },this);
        this.on('destroy',function () {
            this.entity.off('bor:shot',this.reportShot,this);
            this.button.remove();
            if (this.audio) this.audio.close().catch(function () {});
        },this);
    };

    AshAudio.prototype.noiseBuffer = function (length) {
        const audio=this.audio;
        const result=audio.createBuffer(1,Math.round(audio.sampleRate*length),audio.sampleRate);
        const data=result.getChannelData(0);
        let seed=196149;
        for (let i=0;i<data.length;i++) {
            seed=(Math.imul(seed,1664525)+1013904223)>>>0;
            data[i]=seed/2147483648-1;
        }
        return result;
    };

    AshAudio.prototype.osc = function (type,frequency,channel) {
        const node=this.audio.createOscillator();
        node.type=type;
        node.frequency.value=frequency;
        node.connect(channel);
        node.start();
        return node;
    };

    AshAudio.prototype.band = function (filter,freq,q,channel) {
        const node=this.audio.createBiquadFilter();
        node.type=filter;
        node.frequency.value=freq;
        node.Q.value=q;
        node.connect(channel);
        return node;
    };

    AshAudio.prototype.gain = function (amount,channel) {
        const gain=this.audio.createGain();
        gain.gain.value=amount;
        gain.connect(channel);
        return gain;
    };

    AshAudio.prototype.buildGraph = function () {
        const audio=this.audio;
        const comp=audio.createDynamicsCompressor();
        comp.threshold.value=-17;
        comp.ratio.value=4;
        comp.connect(audio.destination);
        this.master=this.gain(0,comp);
        this.motorGain=this.gain(0,this.master);
        const motor=this.band('lowpass',175,.72,this.motorGain);
        this.motorFilter=motor;
        this.motor=this.osc('sawtooth',30,motor);
        this.lowMotor=this.osc('triangle',15,this.gain(.62,motor));
        const noise=audio.createBufferSource();
        noise.buffer=this.noiseBuffer(2.8);
        noise.loop=true;
        this.wind=this.gain(0,this.master);
        this.tread=this.gain(0,this.master);
        this.rainBed=this.gain(0,this.master);
        noise.connect(this.band('lowpass',405,.56,this.wind));
        noise.connect(this.band('bandpass',1020,1.75,this.tread));
        noise.connect(this.band('highpass',1750,.78,this.rainBed));
        noise.start();
        this.pulseDepth=this.gain(0,this.tread.gain);
        this.treadPulse=this.osc('triangle',1,this.pulseDepth);
        this.blast=this.noiseBuffer(1.05);
    };

    AshAudio.prototype.toggle = async function () {
        try {
            if (!this.audio) {
                const Audio=window.AudioContext||window.webkitAudioContext;
                if (!Audio) { this.button.textContent='Dźwięk niedostępny'; return; }
                this.audio=new Audio();
                this.buildGraph();
            }
            if (!this.playing) await this.audio.resume();
            this.playing=!this.playing;
            this.master.gain.setTargetAtTime(this.playing?.55:0,this.audio.currentTime,.035);
            this.button.textContent=this.playing?'Wycisz dźwięk':'Włącz dźwięk';
            this.button.setAttribute('aria-pressed',String(!!this.playing));
        } catch (error) {
            this.button.textContent='Nie można uruchomić dźwięku';
        }
        this.app.graphicsDevice.canvas.focus();
    };

    AshAudio.prototype.update = function () {
        if (!this.playing||!this.audio||this.audio.state!=='running') return;
        const keyboard=this.app.keyboard;
        const power=Number(keyboard.isPressed(pc.KEY_W)||keyboard.isPressed(pc.KEY_S));
        const weather=this.entity.script.ashWeather;
        const output=ashAudioFrame(this.drive.speed,this.drive.turnRate,power,weather&&weather.ready?weather.rain:0);
        const now=this.audio.currentTime;
        const smooth=function (parameter,value,tau) { parameter.setTargetAtTime(value,now,tau); };
        smooth(this.motor.frequency,output.rpm/19,.095);
        smooth(this.lowMotor.frequency,output.rpm/38,.095);
        smooth(this.motorFilter.frequency,150+output.rpm*.061,.1);
        smooth(this.motorGain.gain,output.engine,.11);
        smooth(this.tread.gain,output.track*.62,.075);
        smooth(this.pulseDepth.gain,output.track*.48,.075);
        smooth(this.treadPulse.frequency,output.rattleHz,.055);
        smooth(this.wind.gain,output.wind,.16);
        smooth(this.rainBed.gain,output.rain,.22);
    };

    AshAudio.prototype.reportShot = function (heavy) {
        if (!this.playing||!this.audio||this.audio.state!=='running') return;
        const audio=this.audio,now=audio.currentTime;
        const tail=heavy?.79:.61;
        const boom=this.gain(0,this.master);
        const body=audio.createOscillator();
        body.type='sine';
        body.frequency.setValueAtTime(heavy?88:109,now);
        body.frequency.exponentialRampToValueAtTime(26,now+.20);
        boom.gain.setValueAtTime(.001,now);
        boom.gain.exponentialRampToValueAtTime(heavy?.46:.34,now+.009);
        boom.gain.exponentialRampToValueAtTime(.001,now+.30);
        body.connect(boom);
        body.start(now);
        body.stop(now+.31);
        body.onended=function () { body.disconnect(); boom.disconnect(); };

        const attack=this.gain(0,this.master);
        const crack=this.band('highpass',heavy?1380:1920,.70,attack);
        attack.gain.setValueAtTime(.27,now);
        attack.gain.exponentialRampToValueAtTime(.001,now+.075);
        const strike=audio.createBufferSource();
        strike.buffer=this.blast;
        strike.connect(crack);
        strike.start(now,.22);
        strike.stop(now+.088);
        strike.onended=function () { strike.disconnect(); crack.disconnect(); attack.disconnect(); };
        const shock=this.gain(0,this.master);
        const color=this.band('lowpass',heavy?1650:2270,.60,shock);
        color.frequency.exponentialRampToValueAtTime(300,now+.16);
        shock.gain.setValueAtTime(.44,now);
        shock.gain.exponentialRampToValueAtTime(.001,now+tail);
        const cloud=audio.createBufferSource();
        cloud.buffer=this.blast;
        cloud.connect(color);
        cloud.start(now);
        cloud.stop(now+tail+.02);
                cloud.onended=function () { cloud.disconnect(); color.disconnect(); shock.disconnect(); };
        const echo=this.gain(0,this.master);
        const echoColor=this.band('lowpass',heavy?445:575,.70,echo);
        const reflection=audio.createBufferSource();
        reflection.buffer=this.blast;
        reflection.connect(echoColor);
        const time=now+(heavy?.13:.094);
        echo.gain.setValueAtTime(.095,time);
        echo.gain.exponentialRampToValueAtTime(.001,time+.65);
        reflection.start(time,.12);
        reflection.stop(time+.67);
        reflection.onended=function () { reflection.disconnect(); echoColor.disconnect(); echo.disconnect(); };
    };
}


