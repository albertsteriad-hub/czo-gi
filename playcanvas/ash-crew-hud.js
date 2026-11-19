const ASH_CREW_PORTRAITS = [
    {id:'marta',role:'Dowódca',label:'Marta',skin:'#b38563',shadow:'#775843',kit:'#766044',cap:'#4e4932',style:0},
    {id:'jan',role:'Kierowca',label:'Jan',skin:'#c6a07d',shadow:'#88664a',kit:'#455741',cap:'#313c30',style:1},
    {id:'filip',role:'Ładowniczy',label:'Filip',skin:'#b98166',shadow:'#735043',kit:'#5e6258',cap:'#454b48',style:2},
    {id:'ida',role:'Radiooperator',label:'Ida',skin:'#be9477',shadow:'#855e51',kit:'#5b5e49',cap:'#3f493c',style:3}
];

if (typeof pc !== 'undefined') {
    var AshCrewHud=pc.createScript('ashCrewHud');

    AshCrewHud.prototype.initialize = function () {
        this.company=this.entity.script.ashCompany;
        this.systems=this.entity.script.borSystems;
        this.drive=this.entity.script.acHeavyDrive;
        this.panel=document.createElement('aside');
        this.panel.setAttribute('aria-label','Załoga BÓR');
        this.panel.style.cssText='position:fixed;left:14px;top:clamp(143px,31vh,225px);z-index:19;display:grid;gap:3px;pointer-events:none;color:#ebddbd;font:11px/1.15 ui-monospace,monospace';
        this.rows=ASH_CREW_PORTRAITS.map(function (member) {
            const card=document.createElement('div');
            card.style.cssText='display:flex;align-items:center;gap:5px;border:1px solid #71664b;background:#24261fe8;padding:2px 5px 2px 2px;width:min(114px,27vw)';
            const avatar=document.createElement('canvas');
            avatar.width=avatar.height=24;
            avatar.style.cssText='width:26px;height:26px;image-rendering:pixelated;flex:none';
            this.portrait(avatar,member);
            const info=document.createElement('div'),name=document.createElement('strong'),role=document.createElement('div');
            name.textContent=member.label;
            role.textContent=member.role;
            info.append(name,role);
            const status=document.createElement('div');
            status.style.cssText='height:2px;width:48px;max-width:12vw;background:#514635;margin-top:2px';
            const bar=document.createElement('div');bar.style.cssText='height:100%;background:#a99d64';
            status.append(bar);
            info.append(status);
            card.append(avatar,info);
            this.panel.append(card);
            return {card,bar,id:member.id};
        },this);
        document.body.append(this.panel);
        this.on('destroy',function () {this.panel.remove();},this);
        this.clock=0;
    };

    AshCrewHud.prototype.portrait = function (canvas,p) {
        const c=canvas.getContext('2d');
        const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
        rect(0,0,24,24,'#35372d');
        rect(1,1,22,22,'#6c644d');
        rect(2,2,20,20,'#45473c');
        rect(3,19,18,4,'#292d28');
        rect(5,17,14,5,p.kit);rect(7,16,10,3,p.kit);
        rect(10,15,5,3,p.shadow);
        rect(7,7,11,8,p.skin);rect(8,15,9,1,p.skin);rect(6,10,13,3,p.skin);
        rect(16,9,2,5,p.shadow);rect(14,14,3,2,p.shadow);
        rect(7,7,2,3,p.shadow);rect(8,14,2,1,p.shadow);
        rect(9,10,2,1,'#332822');rect(14,10,2,1,'#332822');
        rect(11,12,2,1,p.shadow);rect(10,14,4,1,'#674438');
        rect(6,6,13,3,p.cap);rect(8,4,9,3,p.cap);rect(6,8,14,1,'#2d322a');
        if(p.style===0){rect(9,5,7,2,'#83764e');rect(11,6,2,1,'#d3b075');rect(17,12,1,3,'#554d35');}
        if(p.style===1){rect(7,6,12,3,'#686857');rect(8,7,4,2,'#283835');rect(14,7,4,2,'#293a38');}
        if(p.style===2){rect(7,6,12,1,'#75746a');rect(8,15,8,2,'#5f4d42');rect(5,17,2,5,'#91816a');rect(17,17,2,5,'#91816a');}
        if(p.style===3){rect(6,8,2,6,'#353d35');rect(17,8,2,6,'#353d35');rect(16,13,3,1,'#8a7a50');rect(18,12,1,2,'#8a7a50');}
    };

    AshCrewHud.prototype.update = function (dt) {
        this.clock+=dt;if(this.clock<.14)return;this.clock=0;
        const crew=this.company.state.crew;
        const activities=[
            this.drive.speed>.7?'Dowodzi podczas marszu':'Na stanowisku',
            Math.abs(this.drive.speed)>.7?'Prowadzi BÓR':'Postój',
            this.systems.weaponCooldown>.06?'Ładuje działo':'Działo gotowe',
            this.entity.script.ashWhisperer&&this.entity.script.ashWhisperer.displayTime>0?'Odbiera sygnał':'Nasłuch'
        ];
        this.rows.forEach(function (row,i) {
            const member=crew.find(m=>m.id===row.id);
            if(!member)return;
            row.bar.style.width=Math.max(0,Math.min(100,member.health))+'%';
            row.card.title=activities[i]+' · zdrowie '+member.health;
        });
    };
}

