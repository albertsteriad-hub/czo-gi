const ASH_WEATHER_STATES = [
    { name:'Przejaśnienie',rain:0,fog:.10,light:1.0 },
    { name:'Niska mgła',rain:.08,fog:.78,light:.79 },
    { name:'Deszcz',rain:.86,fog:.48,light:.69 },
    { name:'Mżawka',rain:.36,fog:.55,light:.83 }
];

function ashWeatherTarget(seconds,z) {
    const northern=Math.max(0,Math.min(1,(z-550)/710));
    const phase=Math.floor((seconds+northern*48)/45)%ASH_WEATHER_STATES.length;
    const state=ASH_WEATHER_STATES[phase];
    return {
        name:state.name, rain:state.rain,
        fog:Math.min(1,state.fog+northern*.17), light:state.light
    };
}

function ashTraction(surface,wet) {
    const dry={
        asphalt:{name:'asfalt',pull:1,brake:1,steer:1,roll:1,limit:1},
        grass:{name:'trawa',pull:.87,brake:.82,steer:.84,roll:1.27,limit:.88},
        gravel:{name:'kamieniste zbocze',pull:.81,brake:.77,steer:.76,roll:1.36,limit:.78},
        mud:{name:'błoto',pull:.72,brake:.69,steer:.71,roll:1.62,limit:.69}
    }[surface];
    const effect=surface==='asphalt'?.23:surface==='mud'?.46:.32;
    const damp=wet*effect;
    return { name:dry.name,pull:dry.pull*(1-damp),brake:dry.brake*(1-damp*1.09),
        steer:dry.steer*(1-damp*.78),roll:dry.roll*(1+damp*.80),limit:dry.limit*(1-damp*.55) };
}

if (typeof module !== 'undefined' && module.exports) module.exports={target:ashWeatherTarget,traction:ashTraction};

if (typeof pc !== 'undefined') {
    var AshWeather=pc.createScript('ashWeather');

    AshWeather.prototype.initialize = function () {
        this.systems=this.entity.script.borSystems;
        this.world=this.entity.script.ashWorld;
        this.scene=this.app.scene;
        this.sun=this.app.root.findByName('Light');
        this.fog=this.scene.fog&&typeof this.scene.fog==='object'?this.scene.fog:null;
        this.base={
            start:this.fog?this.fog.start:this.scene.fogStart,
            end:this.fog?this.fog.end:this.scene.fogEnd,
            color:(this.fog?this.fog.color:this.scene.fogColor).clone(),
            ambient:this.scene.ambientLight.clone(),
            light:this.sun&&this.sun.light?this.sun.light.intensity:1
        };
        this.age=0;
        this.rain=0;
        this.fogAmount=0;
        this.light=1;
        this.wet=0;
        this.paintClock=0;
        this.drops=Array.from({length:140},function (_,i) {
            const frac=function (x) { return x-Math.floor(x); };
            return [frac(i*.6180339887),frac(i*.3819660113),frac(i*.17320508)];
        });
        this.sheet=document.createElement('canvas');
        this.sheet.setAttribute('aria-hidden','true');
        this.sheet.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8';
        this.paint=this.sheet.getContext('2d');
        this.label=document.createElement('div');
        this.label.setAttribute('aria-label','Pogoda i nawierzchnia');
        this.label.style.cssText='position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:21;padding:4px 8px;color:#e8dfc7;background:#23241eee;border:1px solid #766d52;font:12px ui-monospace;pointer-events:none';
        document.body.append(this.label);
        document.body.append(this.sheet);
        this.ready=true;
        this.on('disable',this.resetWeather,this);
        this.on('enable',function () {
            this.sheet.hidden=false;
            this.label.hidden=false;
        },this);
        this.on('destroy',function () {
            this.resetWeather();
            this.sheet.remove();
            this.label.remove();
        },this);
    };

    AshWeather.prototype.resetWeather = function () {
        this.setFog(this.base.start,this.base.end,this.base.color);
        this.scene.ambientLight.copy(this.base.ambient);
        if (this.sun&&this.sun.light) this.sun.light.intensity=this.base.light;
        this.sheet.hidden=true;
        this.label.hidden=true;
    };

    AshWeather.prototype.setFog = function (near,far,color) {
        if (this.fog) {
            this.fog.start=near;
            this.fog.end=far;
            this.fog.color.copy(color);
        } else {
            this.scene.fogStart=near;
            this.scene.fogEnd=far;
            this.scene.fogColor.copy(color);
        }
    };

    AshWeather.prototype.onRoad = function (x,z) {
        if (Math.abs(x)<=4.25 && z>=-40.5 && z<=64.5) return true;
        if (typeof AshWorldData !== 'undefined' && AshWorldData.roadDistance(x,z)<=4.25) return true;
        const nodes=this.systems.route;
        for (let i=1;i<nodes.length;i++) {
            const a=nodes[i-1],b=nodes[i],dx=b[0]-a[0],dz=b[1]-a[1];
            const length=Math.hypot(dx,dz);
            const along=((x-a[0])*dx+(z-a[1])*dz)/length;
            if (along>=-1 && along<=length+1 &&
                Math.abs((x-a[0])*dz-(z-a[1])*dx)/length<=4.25) return true;
        }
        return false;
    };

    AshWeather.prototype.sample = function (x,z) {
        if (this.onRoad(x,z)) return ashTraction('asphalt',this.wet);
        const local=this.systems.groundHeight(x,z);
        const north=typeof AshWorldData!=='undefined'&&z>=AshWorldData.north.start;
        if (north&&[0,1].some(function (r) { return Math.abs(z-AshWorldData.riverLine(x,r))<24; })) {
            return ashTraction('mud',this.wet);
        }
        if (local>4.8) return ashTraction('gravel',this.wet);
        return ashTraction(this.wet>.49?'mud':'grass',this.wet);
    };

    AshWeather.prototype.drawRain = function () {
        this.sheet.hidden=this.rain<.05;
        if (!this.paint||this.sheet.hidden) return;
        const canvas=this.app.graphicsDevice.canvas.getBoundingClientRect();
        const w=Math.max(1,Math.round(canvas.width*.65)),h=Math.max(1,Math.round(canvas.height*.65));
        if (this.sheet.width!==w||this.sheet.height!==h) {
            this.sheet.width=w;
            this.sheet.height=h;
        }
        const ctx=this.paint;
        ctx.clearRect(0,0,w,h);
        ctx.strokeStyle='rgba(191,209,217,'+(.15+this.rain*.26)+')';
        ctx.lineWidth=.75;
        ctx.beginPath();
        const n=Math.floor(this.drops.length*this.rain);
        for (let i=0;i<n;i++) {
            const d=this.drops[i],fall=this.age*(.8+d[2]*.7);
            const y=((d[1]+fall)%1)*h;
            const x=((d[0]+fall*.19)%1)*w;
            ctx.moveTo(x,y);
            ctx.lineTo(x+2+d[2]*3,y+6+d[2]*12);
        }
        ctx.stroke();
    };

    AshWeather.prototype.update = function (dt) {
        this.age+=dt;
        const p=this.entity.getPosition();
        const target=ashWeatherTarget(this.age,p.z);
        const blend=1-Math.exp(-dt*.48);
        this.rain+=(target.rain-this.rain)*blend;
        this.fogAmount+=(target.fog-this.fogAmount)*blend;
        this.light+=(target.light-this.light)*blend;
        this.wet+=(this.rain-this.wet)*(1-Math.exp(-dt*.095));
        this.paintClock+=dt;
        if (this.paintClock<.05) return;
        this.paintClock=0;
        const f=this.fogAmount,r=this.rain;
        const color=this.base.color.clone().lerp(this.base.color,new pc.Color(.48,.54,.55),Math.min(.85,f*.79+r*.38));
        this.setFog(this.base.start*(1-.64*f),this.base.end*(1-.56*f-.15*r),color);
        const ambient=.73+.27*this.light;
        this.scene.ambientLight.set(this.base.ambient.r*ambient,this.base.ambient.g*ambient,this.base.ambient.b*ambient);
        if (this.sun&&this.sun.light) this.sun.light.intensity=this.base.light*this.light;
        this.drawRain();
        const label=target.name+' · '+this.sample(p.x,p.z).name;
        if (this.label.textContent!==label) this.label.textContent=label;
    };
}


