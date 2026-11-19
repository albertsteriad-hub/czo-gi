const ASH_FLEET = [
    {name:'BÓR · wielozadaniowy',mass:49000,width:1.16,half:[2.19,2.97],mount:1.68,slot:0},
    {name:'RAD · lekki zwiadowczy',mass:27400,width:.91,half:[1.73,2.70],mount:1.43,slot:2},
    {name:'TARAN · ciężki',mass:62600,width:1.24,half:[2.38,3.32],mount:1.81,slot:1},
    {name:'BASTION · szturmowy',mass:53100,width:1.19,half:[2.28,3.40],mount:1.65,slot:3},
    {name:'WAŁ · niszczyciel czołgów',mass:42700,width:1.10,half:[2.10,3.16],mount:1.42,slot:4,fixed:true}
];

const ASH_EQUIPMENT=[
    {name:'Bez osprzętu',mass:0},{name:'Ładownia polowa',mass:270},
    {name:'Kasety dymne',mass:150},{name:'Koło zapasowe i narzędzia',mass:380}
];

function ashFleetSelection(model,equip) {
    return Number.isInteger(model)&&model>=0&&model<ASH_FLEET.length&&
        Number.isInteger(equip)&&equip>=0&&equip<ASH_EQUIPMENT.length;
}

if (typeof module !== 'undefined' && module.exports) module.exports={models:ASH_FLEET,equipment:ASH_EQUIPMENT,valid:ashFleetSelection};

if (typeof pc !== 'undefined') {
    var AshFleet=pc.createScript('ashFleet');

    AshFleet.prototype.initialize = function () {
        this.service=this.entity.script.ashService;
        this.custom=this.entity.script.ashCustomization;
        this.company=this.entity.script.ashCompany;
        this.systems=this.entity.script.borSystems;
        this.visual=this.systems.visual;
        this.pivot=this.systems.pivot;
        this.original=[this.entity.findByName('BÓR | kadłub B'),this.entity.findByName('BÓR | segmentowe osłony')];
        this.hulls=ASH_FLEET.slice(1).map((_,i)=>this.entity.findByName('FLEET_HULL_'+(i+1)));
        this.equipment=ASH_EQUIPMENT.slice(1).map((_,i)=>this.entity.findByName('FLEET_EQUIP_'+(i+1)));
        if (this.hulls.concat(this.equipment).some(e=>!e)||!this.custom.ready) return;
        this.last=-1;
        this.lastEquip=-1;
        this.panel=document.createElement('div');
        this.modelInput=this.select('Pojazd',ASH_FLEET,function (i) {
            this.company.state.fleetModel=i;
            this.company.state.customParts[0]=ASH_FLEET[i].slot;
            this.pivot.setLocalEulerAngles(0,0,0);
            this.custom.sync();
            this.sync();
        });
        this.equipInput=this.select('Osprzęt',ASH_EQUIPMENT,function (i) {
            this.company.state.fleetEquipment=i;
            this.sync();
        });
        this.service.panel.insertBefore(this.panel,this.custom.panel);
        this.ready=true;
        this.sync();
        this.on('destroy',function () {this.panel.remove();},this);
    };

    AshFleet.prototype.select = function (title,options,change) {
        const row=document.createElement('label'),select=document.createElement('select');
        row.style.cssText='display:flex;justify-content:space-between;gap:6px;margin:4px 0';
        row.append(document.createTextNode(title));
        select.style.cssText='color:#f1dfb7;background:#393329;border:1px solid #987d50;font:inherit;max-width:210px';
        options.forEach(function (item,index) {
            const op=document.createElement('option');op.value=String(index);op.textContent=item.name;select.append(op);
        });
        select.addEventListener('change',function () {
            if(!this.service.atPost())return;
            change.call(this,Number(select.value));
            this.app.graphicsDevice.canvas.focus();
        }.bind(this));
        row.append(select);
        this.panel.append(row);
        return select;
    };

    AshFleet.prototype.model = function () { return ASH_FLEET[this.company.state.fleetModel]; };
    AshFleet.prototype.equipmentMass = function () { return ASH_EQUIPMENT[this.company.state.fleetEquipment].mass; };

    AshFleet.prototype.sync = function () {
        const state=this.company.state;
        const index=state.fleetModel,equip=state.fleetEquipment,profile=this.model();
        if(index!==this.last){
            this.original.forEach(e=>{if(e)e.enabled=index===0;});
            this.hulls.forEach((e,i)=>{e.enabled=index===i+1;});
            this.visual.setLocalScale(profile.width,1,1);
            this.pivot.setLocalPosition(0,profile.mount,0);
            if(profile.fixed)this.pivot.setLocalEulerAngles(0,0,0);
            this.custom.inputs[0].disabled=!!profile.fixed;
            this.custom.parts[2][state.customParts[2]].setLocalPosition(0,this.custom.gunHeight(),this.custom.gunBase());
            this.modelInput.value=String(index);
            if(!profile.fixed)this.custom.parts[0].forEach((e,i)=>{e.enabled=state.customParts[0]===i;});
            this.last=index;
        }
        if(equip!==this.lastEquip){
            this.equipment.forEach((e,i)=>{e.enabled=equip===i+1;});
            this.equipInput.value=String(equip);
            this.lastEquip=equip;
        }
        if (profile.fixed) {
            this.custom.parts[0].forEach(e=>{e.enabled=false;});
            const angle=this.pivot.getLocalEulerAngles().y;
            this.pivot.setLocalEulerAngles(0,pc.math.clamp(angle,-11,11),0);
        }
    };

    AshFleet.prototype.update = function () { if(this.ready)this.sync(); };
}



