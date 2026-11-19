const ASH_GEAR_ICONS=[
    ['............','....####....','..########..','.##########.','############','###......###','############','.##########.','............'],
    ['............','...######...','..########..','..#########.','.##########.','############','.....##.....','.....##.....','............'],
    ['............','..####......','.######.....','.##########.','.##########.','.######.....','..####......','............'],
    ['............','.....##.....','.....##.....','.##########.','.##########.','..########..','..########..','...######...','............'],
    ['............','....####....','..########..','..##....##..','.###....###.','.###....###.','..########..','............'],
    ['............','........#...','.......#....','.....##.....','...##.......','..######....','..#....#....','..######....','............']
];

if(typeof pc!=='undefined'){
    var AshEquipmentHud=pc.createScript('ashEquipmentHud');

    AshEquipmentHud.prototype.initialize=function () {
        this.company=this.entity.script.ashCompany;
        this.fleet=this.entity.script.ashFleet;
        this.service=this.entity.script.ashService;
        this.panel=document.createElement('aside');
        this.panel.setAttribute('aria-label','Wyposażenie pojazdu');
        this.panel.style.cssText='position:fixed;right:14px;top:110px;z-index:34;color:#f1dfb8;background:#23261e;border:2px solid #a08957;box-shadow:4px 4px 0 #121610;padding:6px;width:min(246px,62vw);font:bold 12px/1.35 ui-monospace';
        this.panel.addEventListener('mousedown',event=>event.stopPropagation());
        const title=document.createElement('strong');title.textContent='Wyposażenie · I';
        this.panel.append(title);
        this.items=['Kadłub','Wieża','Działo','Pancerz','Osprzęt','Radio'].map((name,i)=>{
            const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;border-top:1px solid #625b3a;padding:3px 0';
            const icon=document.createElement('canvas');icon.width=12;icon.height=10;
            icon.style.cssText='width:24px;height:20px;image-rendering:pixelated;flex:none';
            const c=icon.getContext('2d');
            c.fillStyle='#bdab6c';
            ASH_GEAR_ICONS[i].forEach((line,y)=>{for(let x=0;x<line.length;x++)if(line[x]==='#')c.fillRect(x,y,1,1);});
            row.append(icon);
            const text=document.createElement('div'),label=document.createElement('strong'),value=document.createElement('div');
            label.textContent=name;value.style.color='#b8b38d';text.append(label,value);row.append(text);this.panel.append(row);
            return value;
        });
        this.note=document.createElement('div');this.panel.append(this.note);
        this.button=document.createElement('button');this.button.textContent='I · Wyposażenie';
        this.button.style.cssText='position:fixed;right:14px;top:84px;z-index:33;color:#f1dfb8;background:#2b2d24;border:2px solid #8b7952;padding:3px 7px;font:12px ui-monospace';
        this.button.addEventListener('mousedown',event=>event.stopPropagation());
        this.button.addEventListener('click',this.toggle.bind(this));
        this.panel.hidden=true;
        this.clock=0;
        document.body.append(this.panel,this.button);
        this.on('destroy',function () {this.panel.remove();this.button.remove();},this);
    };

    AshEquipmentHud.prototype.toggle=function () {
        this.panel.hidden=!this.panel.hidden;
        this.button.setAttribute('aria-expanded',String(!this.panel.hidden));
        this.app.graphicsDevice.canvas.focus();
    };

    AshEquipmentHud.prototype.update=function (dt) {
        if(this.app.keyboard.wasPressed(pc.KEY_I))this.toggle();
        if(this.panel.hidden)return;
        this.clock+=dt;if(this.clock<.18)return;this.clock=0;
        const state=this.company.state,s=state.customParts;
        const selected=this.fleet&&this.fleet.ready?this.fleet.model():null;
        const profile=typeof ASH_FLEET!=='undefined'?ASH_FLEET[state.fleetModel]:null;
        const values=[profile?profile.name:'BÓR',selected&&selected.fixed?'Kazamata stała':ASH_PARTS[0][s[0]].n,
            ASH_PARTS[2][s[2]].n,ASH_PARTS[1][s[1]].n,typeof ASH_EQUIPMENT!=='undefined'?ASH_EQUIPMENT[state.fleetEquipment].name:'Brak',
            state.fieldRecon?'Szeptnik':'Radiostacja kompanii'];
        values.forEach((value,i)=>{if(this.items[i].textContent!==value)this.items[i].textContent=value;});
        this.note.textContent=this.service.atPost()?'Zmiany dostępne w warsztacie.':'Podgląd w czasie jazdy · montaż w serwisie.';
    };
}

