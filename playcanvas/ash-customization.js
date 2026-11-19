const ASH_PARTS = [
    [{n:'P-2 Klin',mass:4800,z:.24},{n:'T-6 Kaseta',mass:7300,z:.43},
     {n:'Jastrząb',mass:5400,z:.27},{n:'Bastion',mass:8500,z:.34},{n:'Radiowiec',mass:6200,z:.37}],
    [{n:'Płyty lekkie',mass:900},{n:'Płyty segmentowe',mass:2100},{n:'Ekran listwowy',mass:1400},
     {n:'Kliny boczne',mass:3100},{n:'Pancerz szturmowy',mass:4500}],
    [{n:'Krótka',mass:550,length:1.13},{n:'Uniwersalna',mass:760,length:1.55},
     {n:'Polowa',mass:910,length:1.93},{n:'Długa',mass:1150,length:2.25},{n:'Dalekosiężna',mass:1260,length:2.54}],
    [{n:'Oliwka',color:[.24,.25,.14]},{n:'Szary łupek',color:[.19,.22,.23]},
     {n:'Zimowy popiół',color:[.50,.52,.49]},{n:'Sucha ochra',color:[.43,.29,.135]},
     {n:'Nocna zieleń',color:[.10,.18,.14]}]
];

function ashPartsValid(values) {
    return Array.isArray(values)&&values.length===4&&values.every(function (v,i) {
        return Number.isInteger(v)&&v>=0&&v<ASH_PARTS[i].length;
    });
}

if (typeof module !== 'undefined' && module.exports) module.exports={parts:ASH_PARTS,valid:ashPartsValid};

if (typeof pc !== 'undefined') {
    var AshCustomization=pc.createScript('ashCustomization');

    AshCustomization.prototype.initialize = function () {
        this.company=this.entity.script.ashCompany;
        this.service=this.entity.script.ashService;
        this.turret=this.entity.script.borTurret;
        this.systems=this.entity.script.borSystems;
        this.parts=['TURRET','ARMOR','BARREL'].map(function (category) {
            return ASH_PARTS[0].map(function (_,i) {
                return this.entity.findByName('CUST_'+category+'_'+i);
            },this);
        },this);
        if (this.parts.some(function (items) { return items.some(function (e) { return !e; }); })) return;
        this.saved=[-1,-1,-1,-1];
        this.colors=new Map();
        this.base=[this.entity.findByName('BÓR | kadłub B'),this.entity.findByName('BÓR | segmentowe osłony')];
        this.panel=document.createElement('div');
        this.inputs=['Wieża','Pancerz','Lufa','Malowanie'].map(function (name,index) {
            const label=document.createElement('label'),select=document.createElement('select');
            label.style.cssText='display:flex;justify-content:space-between;gap:8px;margin:3px 0';
            label.append(document.createTextNode(name));
            select.style.cssText='color:#f1dfb7;background:#393329;border:1px solid #987d50;font:inherit';
            ASH_PARTS[index].forEach(function (item,i) {
                let option=document.createElement('option');
                option.value=String(i);
                option.textContent=item.n;
                select.append(option);
            });
            select.addEventListener('change',function () {
                if (this.service.atPost()) {
                    this.company.state.customParts[index]=Number(select.value);
                    this.sync();
                    this.app.graphicsDevice.canvas.focus();
                }
            }.bind(this));
            label.append(select);
            this.panel.append(label);
            return select;
        },this);
        this.service.panel.insertBefore(this.panel,this.service.summary);
        this.ready=true;
        this.sync();
        this.on('destroy',function () {
            this.colors.forEach(function (v,instance) { instance.material=v.original;v.tinted.destroy(); });
            this.panel.remove();
        },this);
    };

    AshCustomization.prototype.sync = function () {
        const selected=this.company.state.customParts;
        if (!ashPartsValid(selected)) return;
        const gunHeight=this.gunHeight();
        const changed=selected.some(function (v,i) { return v!==this.saved[i]; },this);
        if (changed) {
            this.turret.selectTurret(selected[0]===1);
            this.parts.forEach(function (items,i) {
                items.forEach(function (e,j) { e.enabled=j===selected[i]; });
            });
            this.parts[2][selected[2]].setLocalPosition(0,gunHeight,this.gunBase());
            this.inputs.forEach(function (element,i) { element.value=String(selected[i]); });
            this.saved=selected.slice();
        }
        this.turret.p2.render.enabled=false;
        this.turret.t6.render.enabled=false;
        if (this.service.longP2) this.service.longP2.enabled=false;
        if (this.service.longT6) this.service.longT6.enabled=false;
        if (this.service.armor) this.service.armor.enabled=false;

        const tint=ASH_PARTS[3][selected[3]].color;
                const fleet=this.entity.script.ashFleet;
        const additional=fleet&&fleet.ready&&fleet.last>0?[fleet.hulls[fleet.last-1]]:[];
        const batch=this.base.concat(additional,this.parts.map(function (parts,i) { return parts[selected[i]]; }));
        batch.forEach(function (e) {
            if (!e||!e.render||!e.render.meshInstances) return;
            e.render.meshInstances.forEach(function (instance) {
                const existing=this.colors.get(instance);
                if (existing && existing.paint===selected[3]) return;
                const source=existing?existing.original:instance.material;
                if (!source||!source.diffuse||!/olive|painted armor/.test(source.name.toLowerCase()))return;
                const material=existing?existing.tinted:source.clone();
                material.diffuse.set(tint[0]*(source.diffuse.r/.25+.31)*.80,
                    tint[1]*(source.diffuse.g/.25+.31)*.80,tint[2]*(source.diffuse.b/.16+.31)*.80);
                material.update();
                instance.material=material;
                this.colors.set(instance,{original:source,tinted:material,paint:selected[3]});
            },this);
        },this);
    };

    AshCustomization.prototype.update = function () {
        if (!this.ready) return;
        const indices=this.company.state.customParts;
        if (this.saved.every(function (v,i) { return v===indices[i]; })&&
            this.turret.t6.enabled!==(indices[0]===1)) {
            indices[0]=this.turret.t6.enabled?1:0;
        }
        this.sync();
    };

    AshCustomization.prototype.build = function () {
        const s=this.company.state.customParts;
                const fleet=this.entity.script.ashFleet;
        const profile=fleet&&fleet.ready?fleet.model():null;
        return {label:profile?profile.name:ASH_PARTS[0][s[0]].n,mass:(profile?profile.mass:49000)+
            (profile&&profile.fixed?2100:ASH_PARTS[0][s[0]].mass)+(profile?fleet.equipmentMass():0)+
            ASH_PARTS[1][s[1]].mass+ASH_PARTS[2][s[2]].mass,cycle:.65+.075*s[2]+(s[0]===1?.11:0)};
    };

    AshCustomization.prototype.gunBase = function () {
        const fleet=this.entity.script.ashFleet;
        return fleet&&fleet.ready&&fleet.model().fixed?-1.03:-.79;
    };

    AshCustomization.prototype.gunHeight = function () {
        const fleet=this.entity.script.ashFleet;
        if(fleet&&fleet.ready&&fleet.model().fixed)return .28;
        return ASH_PARTS[0][this.company.state.customParts[0]].z;
    };

    AshCustomization.prototype.muzzle = function () {
        const s=this.company.state.customParts;
        return new pc.Vec3(0,this.gunHeight(),this.gunBase()-ASH_PARTS[2][s[2]].length-.034);
    };
}



