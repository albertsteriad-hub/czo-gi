function ashMapProjection(bounds,width,height,margin) {
    const scale=Math.min((width-2*margin)/(bounds.maxX-bounds.minX),
        (height-2*margin)/(bounds.maxZ-bounds.minZ));
    const centerX=(bounds.minX+bounds.maxX)/2,centerZ=(bounds.minZ+bounds.maxZ)/2;
    return {
        scale:scale,
        project:function (x,z) { return { x:width/2+(x-centerX)*scale,y:height/2-(z-centerZ)*scale }; },
        unproject:function (x,y) { return { x:centerX+(x-width/2)/scale,z:centerZ-(y-height/2)/scale }; }
    };
}

function ashMapWaypoint(point,bounds,roads) {
    if (point.x<bounds.minX||point.x>bounds.maxX||point.z<bounds.minZ||point.z>bounds.maxZ) return null;
    let result=point,near=20;
    roads.forEach(function (s) {
        const t=Math.min(1,Math.max(0,((point.x-s.a[0])*s.dx+(point.z-s.a[1])*s.dz)/(s.length*s.length)));
        const x=s.a[0]+s.dx*t,z=s.a[1]+s.dz*t;
        const distance=Math.hypot(x-point.x,z-point.z);
        if (distance<near) {
            near=distance;
            result={x:x,z:z};
        }
    });
    return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports={projection:ashMapProjection,waypoint:ashMapWaypoint};

if (typeof pc !== 'undefined') {
    var AshNavigation=pc.createScript('ashNavigation');

    AshNavigation.prototype.initialize = function () {
        this.world=this.entity.script.ashWorld;
        this.drive=this.entity.script.acHeavyDrive;
        if (!this.world||!this.world.ready) return;
        this.bounds=AshWorldData.bounds;
        const old=[[0,-40],[0,64.5],[0,106],[17,137],[17,166]];
        this.roads=old.slice(1).map(function (b,i) {
            const a=old[i],dx=b[0]-a[0],dz=b[1]-a[1];
            return {a:a,b:b,dx:dx,dz:dz,length:Math.hypot(dx,dz)};
        }).concat(AshWorldData.segments);
        const regional=this.app.root.findByName('World service posts');
        this.services=[this.app.root.findByName('BOR_SERVICE_POST')].concat(regional?regional.children:[])
            .filter(function (e) { return !!e; }).map(function (e) { return e.getPosition().clone(); });
        this.rivers=AshWorldData.north.periods.map(function (_,river) {
            return Array.from({length:76},function (_,i) {
                const x=-300+i*8;
                return [x,AshWorldData.riverLine(x,river)];
            });
        });
        this.full=false;
        this.clock=0;
        this.panel=document.createElement('aside');
        this.panel.setAttribute('aria-label','Mapa nawigacyjna');
        this.panel.addEventListener('mousedown',function (e) { e.stopPropagation(); });
        this.panel.addEventListener('pointerdown',function (e) { e.stopPropagation(); });
        this.canvas=document.createElement('canvas');
        this.canvas.setAttribute('aria-label','Mapa terenu, dróg i punktów serwisowych');
        this.canvas.style.cssText='width:100%;height:auto;display:block;touch-action:manipulation';
        this.canvas.addEventListener('click',this.mark.bind(this));
        this.context=this.canvas.getContext('2d');
        const controls=document.createElement('div');
        controls.style.cssText='display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px';
        this.toggleButton=this.button(controls,'Mapa · M',this.toggle);
        this.clearButton=this.button(controls,'Usuń znacznik',function () {
            this.selected=null;
            this.draw();
        });
        this.info=document.createElement('div');
        this.panel.append(this.canvas,controls,this.info);
        document.body.append(this.panel);
        this.layout();
        this.draw();
        this.on('disable',function () { this.panel.hidden=true; },this);
        this.on('enable',function () { this.panel.hidden=false; },this);
        this.on('destroy',function () { this.panel.remove(); },this);
    };

    AshNavigation.prototype.button = function (parent,label,action) {
        const button=document.createElement('button');
        button.type='button';
        button.textContent=label;
        button.style.cssText='color:inherit;background:#393629;border:1px solid #987d50;padding:3px 5px;font:inherit;cursor:pointer';
        button.addEventListener('click',action.bind(this));
        parent.append(button);
        return button;
    };

    AshNavigation.prototype.layout = function () {
        const anchor=this.full?'top:9vh;left:50%;transform:translateX(-50%);width:min(330px,85vw,51vh)':
            'top:44px;left:14px;width:min(168px,33vw)';
        this.panel.style.cssText='position:fixed;z-index:35;background:#252720f5;color:#ece0ba;border:1px solid #987d50;padding:6px;font:12px/1.35 ui-monospace,monospace;'+anchor;
        this.canvas.width=this.full?390:190;
        this.canvas.height=this.full?610:140;
        this.canvas.style.cursor=this.full?'crosshair':'default';
        this.toggleButton.textContent=this.full?'Zamknij · M':'Mapa · M';
    };

    AshNavigation.prototype.toggle = function () {
        this.full=!this.full;
        this.layout();
        this.draw();
    };

    AshNavigation.prototype.mark = function (event) {
        if (!this.full) return;
        const rect=this.canvas.getBoundingClientRect();
        const pos=this.projection.unproject((event.clientX-rect.left)*this.canvas.width/rect.width,
            (event.clientY-rect.top)*this.canvas.height/rect.height);
        const candidate=ashMapWaypoint(pos,this.bounds,this.roads);
        if (candidate) this.selected=candidate;
        this.draw();
    };

    AshNavigation.prototype.questPoint = function () {
        const company=this.entity.script.ashCompany;
        const recon=this.entity.script.ashFieldRecon;
        const encounter=this.entity.script.ashFieldEncounter;
        if (!company||company.state.fieldOutcome) return null;
        const state=company.state.fieldRecon;
        const actor=state<3?(recon&&recon.sites[state]):(encounter&&encounter.actor);
        return actor&&actor.enabled?actor.getPosition():null;
    };

    AshNavigation.prototype.lines = function (points,color,width) {
        const ctx=this.context;
        ctx.strokeStyle=color;
        ctx.lineWidth=width;
        ctx.beginPath();
        points.forEach(function (p,i) {
            const v=this.projection.project(p[0],p[1]);
            if (i===0) ctx.moveTo(v.x,v.y);
            else ctx.lineTo(v.x,v.y);
        },this);
        ctx.stroke();
    };

    AshNavigation.prototype.pin = function (point,color,size,square) {
        if (!point) return;
        const ctx=this.context,p=this.projection.project(point.x,point.z);
        ctx.fillStyle=color;
        if (square) ctx.fillRect(p.x-size,p.y-size,size*2,size*2);
        else {
            ctx.beginPath();
            ctx.arc(p.x,p.y,size,0,Math.PI*2);
            ctx.fill();
        }
    };

    AshNavigation.prototype.draw = function () {
        const ctx=this.context, width=this.canvas.width,height=this.canvas.height;
        if (!ctx) return;
        const p=this.entity.getPosition();
        const frame=this.full?this.bounds:{minX:p.x-136,maxX:p.x+136,minZ:p.z-100,maxZ:p.z+100};
        this.projection=ashMapProjection(frame,width,height,this.full?18:3);
        ctx.fillStyle='#33392e';
        ctx.fillRect(0,0,width,height);
        ctx.lineCap='round';
        if (this.full) {
            const a=this.projection.project(this.bounds.minX,this.bounds.maxZ);
            const b=this.projection.project(this.bounds.maxX,this.bounds.minZ);
            ctx.strokeStyle='#697058';
            ctx.lineWidth=1;
            ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
        }
        this.rivers.forEach(function (r) { this.lines(r,'#527d7c',this.full?7:12); },this);
        this.roads.forEach(function (s) { this.lines([s.a,s.b],'#9d9170',this.full?2:4); },this);
        this.services.forEach(function (point) { this.pin(point,'#ebc875',2.5,true); },this);
        this.pin(this.questPoint(),'#e78b62',3.5,false);
        this.pin(this.selected,'#a0e8d0',4,false);
        const arrow=this.projection.project(p.x,p.z);
        ctx.save();
        ctx.translate(arrow.x,arrow.y);
        ctx.rotate(this.drive.heading);
        ctx.fillStyle='#f5edcf';
        ctx.beginPath();
        ctx.moveTo(0,-8);
        ctx.lineTo(5,5);
        ctx.lineTo(0,3);
        ctx.lineTo(-5,5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle='#ece0ba';
        ctx.font='bold 13px monospace';
        ctx.fillText('N',9,16);
        this.clearButton.hidden=!this.selected;
        const msg=this.selected?'Znacznik · '+Math.round(Math.hypot(this.selected.x-p.x,this.selected.z-p.z))+' m w linii prostej':
            (this.full?'Kliknij, aby postawić znacznik. Żółty: serwis. Pomarańczowy: kontrakt.':'');
        if (this.info.textContent!==msg) this.info.textContent=msg;
    };

    AshNavigation.prototype.update = function (dt) {
        if (!this.context) return;
        if (this.app.keyboard.wasPressed(pc.KEY_M)) this.toggle();
        this.clock+=dt;
        if (this.clock<.18) return;
        this.clock=0;
        this.draw();
    };
}


