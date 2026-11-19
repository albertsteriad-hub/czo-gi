function ashCameraMode(index) { return (index+1)%3; }

function ashRecoilProfile(age,heavy) {
    const strength=heavy?1:.76;
    if (age<0||age>.75) return {barrel:0,kick:0};
    const attack=Math.min(1,age/.052);
    return {barrel:strength*.31*attack*Math.exp(-age*4.6),
        kick:strength*Math.sin(age*20)*Math.exp(-age*8)};
}

if (typeof module !== 'undefined' && module.exports) module.exports={next:ashCameraMode,recoil:ashRecoilProfile};

if (typeof pc !== 'undefined') {
    var AshVehicleView=pc.createScript('ashVehicleView');

    AshVehicleView.prototype.initialize = function () {
        this.drive=this.entity.script.acHeavyDrive;
        this.systems=this.entity.script.borSystems;
        this.visual=this.systems.visual;
        this.view=this.drive.camera;
        this.interior=this.view.findByName('ASH_COCKPIT');
        this.original=this.visual.getLocalEulerAngles().clone();
        this.mode=0;
        this.azimuth=0;
        this.altitude=.31;
        this.distance=10.7;
        this.age=1;
        this.ready=true;
        this.canvas=this.app.graphicsDevice.canvas;
        this.button=document.createElement('button');
        this.button.type='button';
        this.button.style.cssText='position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:20;color:#ece0ba;background:#2b2b23;border:1px solid #987d50;padding:4px 8px;font:12px ui-monospace;cursor:pointer';
        this.button.addEventListener('mousedown',function (e) { e.stopPropagation(); });
        this.button.addEventListener('click',this.next.bind(this));
        document.body.append(this.button);
        this.label();
        this.handleDown=this.down.bind(this);
        this.handleMove=this.move.bind(this);
        this.handleUp=function () { this.dragging=false; }.bind(this);
        this.handleWheel=this.zoom.bind(this);
        this.handleMenu=function (event) { if(this.mode===1)event.preventDefault(); }.bind(this);
        this.canvas.addEventListener('pointerdown',this.handleDown);
        this.canvas.addEventListener('pointermove',this.handleMove);
        this.canvas.addEventListener('pointerup',this.handleUp);
        this.canvas.addEventListener('pointercancel',this.handleUp);
        this.canvas.addEventListener('wheel',this.handleWheel,{passive:false});
        this.canvas.addEventListener('contextmenu',this.handleMenu);
        this.entity.on('bor:shot',this.recoil,this);
        this.on('destroy',function () {
            this.entity.off('bor:shot',this.recoil,this);
            this.canvas.removeEventListener('pointerdown',this.handleDown);
            this.canvas.removeEventListener('pointermove',this.handleMove);
            this.canvas.removeEventListener('pointerup',this.handleUp);
            this.canvas.removeEventListener('pointercancel',this.handleUp);
            this.canvas.removeEventListener('wheel',this.handleWheel);
            this.canvas.removeEventListener('contextmenu',this.handleMenu);
            this.button.remove();
            if (this.interior) this.interior.enabled=false;
        },this);
    };

    AshVehicleView.prototype.label = function () {
        this.button.textContent=['V · Pościg','V · Orbita · przeciągnij prawym, rolka przybliża','V · Kokpit'][this.mode];
    };

    AshVehicleView.prototype.next = function () {
        this.mode=ashCameraMode(this.mode);
        if (this.mode===1) this.azimuth=this.drive.heading;
        this.dragging=false;
        this.label();
        this.place(0,true);
        this.canvas.focus();
    };

    AshVehicleView.prototype.down = function (event) {
        if (this.mode!==1||event.button!==2) return;
        this.dragging=true;
        if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    AshVehicleView.prototype.move = function (event) {
        if (!this.dragging) return;
        this.azimuth-=event.movementX*.006;
        this.altitude=pc.math.clamp(this.altitude+event.movementY*.006,.09,1.24);
    };

    AshVehicleView.prototype.zoom = function (event) {
        if(this.mode!==1)return;
        this.distance=pc.math.clamp(this.distance*Math.exp(event.deltaY*.0011),5.8,22);
        event.preventDefault();
    };

    AshVehicleView.prototype.recoil = function (heavy) {
        this.age=0;
        this.heavy=heavy;
        const dyn=this.entity.script.ashTrackDynamics;
        const hull=new pc.Vec3(Math.sin(this.drive.heading),0,Math.cos(this.drive.heading));
        this.kickDirection=this.systems.pivot.forward.clone();
        const along=this.kickDirection.dot(hull);
        this.fore=along;
        this.side=this.kickDirection.x*hull.z-this.kickDirection.z*hull.x;
        if (dyn&&dyn.ready) {
            const kick=along*(heavy?.27:.18);
            dyn.state.left-=kick;
            dyn.state.right-=kick;
        }
    };

    AshVehicleView.prototype.place = function (dt,snap) {
        const p=this.entity.getPosition(),view=this.view,heading=this.drive.heading;
        const shot=ashRecoilProfile(this.age,this.heavy);
        if (this.interior) this.interior.enabled=this.mode===2;
        if (this.mode===2) {
            const f=this.systems.pivot.forward;
            const turretHeight=this.systems.pivot.getPosition().y;
            view.setPosition(p.x+f.x*.43,p.y+(turretHeight-p.y)+.92+shot.kick*.085,p.z+f.z*.43);
            const eye=view.getPosition();
            view.lookAt(eye.x+f.x*15,eye.y+f.y*15+shot.kick*.21,eye.z+f.z*15);
            return;
        }
        const orbit=this.mode===1;
        const yaw=orbit?this.azimuth:heading;
        const radius=orbit?Math.cos(this.altitude)*this.distance:10.6;
        const h=orbit?1.5+Math.sin(this.altitude)*this.distance:5.35;
        const side=orbit?0:2;
        const a=Math.sin(yaw),b=Math.cos(yaw);
        const shake=shot.kick*.25;
        const x=p.x-a*(radius+shake)+b*side,z=p.z-b*(radius+shake)-a*side;
        const y=Math.max(p.y+h+shake*.31,this.systems.groundHeight(x,z)+1.05);
        const blend=snap?1:1-Math.exp(-dt*(orbit?13:4.4));
        const old=view.getPosition();
        view.setPosition(old.x+(x-old.x)*blend,old.y+(y-old.y)*blend,old.z+(z-old.z)*blend);
        view.lookAt(p.x+(orbit?0:a*3),p.y+1.45+shake*.17,p.z+(orbit?0:b*3));
    };

    AshVehicleView.prototype.update = function (dt) {
        if(this.app.keyboard.wasPressed(pc.KEY_V))this.next();
        if(this.age>.8)return;
        this.age+=dt;
        const effect=ashRecoilProfile(this.age,this.heavy);
        this.visual.setLocalEulerAngles(this.original.x+this.fore*effect.kick*2.75,
            this.original.y,this.original.z-this.side*effect.kick*2.15);
        const custom=this.entity.script.ashCustomization;
        if (custom&&custom.ready) {
            const index=custom.company.state.customParts[2];
            const gun=custom.parts[2][index];
            if(this.lastGun&&this.lastGun!==gun){
                const lp=this.lastGun.getLocalPosition();
                this.lastGun.setLocalPosition(lp.x,lp.y,custom.gunBase());
            }
            const h=custom.muzzle().y;
            gun.setLocalPosition(0,h,custom.gunBase()+effect.barrel);
            this.lastGun=gun;
        }
    };
}


