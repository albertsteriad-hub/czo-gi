function ashWhisperSignal(scan, origin, target) {
    if (scan % 3 === 0) {
        const angle = scan * 2.39996323;
        return { x: origin.x + Math.cos(angle)*16, z: origin.z + Math.sin(angle)*16 };
    }
    if (!target || Math.hypot(target.x-origin.x, target.z-origin.z) > 42) return null;
    return { x: target.x, z: target.z };
}

if (typeof module !== 'undefined' && module.exports) module.exports = ashWhisperSignal;

if (typeof pc !== 'undefined') {
    var AshWhisperer = pc.createScript('ashWhisperer');

    AshWhisperer.prototype.initialize = function () {
        this.state = this.entity.script.ashCompany.state;
        this.recon = this.entity.script.ashFieldRecon;
        this.encounter = this.entity.script.ashFieldEncounter;
        this.systems = this.entity.script.borSystems;
        this.scan = 0;
        this.cooldown = 0;
        this.displayTime = 0;
        this.material = new pc.StandardMaterial();
        this.material.useLighting = false;
        this.material.emissive.set(.18,.63,.53);
        this.material.emissiveIntensity = 1.8;
        this.material.update();
        this.beacon = new pc.Entity('Szeptnik signal');
        this.beacon.addComponent('render',{type:'sphere',castShadows:false,receiveShadows:false});
        this.beacon.render.material = this.material;
        this.beacon.enabled = false;
        this.app.root.addChild(this.beacon);
        this.indicator = document.createElement('div');
        this.indicator.setAttribute('role','status');
        this.recon.panel.append(this.indicator);
        this.on('destroy',function () {
            this.indicator.remove();
            this.beacon.destroy();
            this.material.destroy();
        },this);
    };

    AshWhisperer.prototype.update = function (dt) {
        this.cooldown = Math.max(0,this.cooldown-dt);
        this.displayTime = Math.max(0,this.displayTime-dt);
        const unlocked = this.state.fieldRecon > 0 && !this.state.fieldOutcome;
        this.indicator.hidden = !unlocked;
        if (!unlocked || this.displayTime === 0) this.beacon.enabled = false;
        if (!unlocked) return;
        if (this.cooldown === 0 && this.app.keyboard.wasPressed(pc.KEY_R)) this.pulse();
        if (this.beacon.enabled) {
            const pulse = .6+.16*Math.sin(this.displayTime*8);
            this.beacon.setLocalScale(pulse,pulse,pulse);
        }
        const text = this.cooldown === 0 ? 'R · Szeptnik' :
            (this.displayTime > 0 ? this.signalText : 'Szeptnik stabilizuje sygnał · '+Math.ceil(this.cooldown)+' s');
        if (this.indicator.textContent !== text) this.indicator.textContent = text;
    };

    AshWhisperer.prototype.pulse = function () {
        const progress = this.state.fieldRecon;
        const site = progress < 3 ? this.recon.sites[progress] : this.encounter.actor;
        const target = site && site.enabled ? site.getPosition() : null;
        const origin = this.entity.getPosition();
        const point = ashWhisperSignal(++this.scan,origin,target);
        this.cooldown = 7;
        this.displayTime = 3.5;
        this.beacon.enabled = !!point;
        this.signalText = point ? 'Szeptnik: echo · '+Math.round(Math.hypot(point.x-origin.x,point.z-origin.z))+' m' :
            'Szeptnik: brak sygnału w zasięgu.';
        if (point) this.beacon.setPosition(point.x,this.systems.groundHeight(point.x,point.z)+2.1,point.z);
    };
}

