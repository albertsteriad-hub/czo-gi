var BorSystems = pc.createScript('borSystems');

['shoe', 'roadWheel', 'idler', 'sprocket', 'arms'].forEach(function (name) {
    BorSystems.attributes.add(name, { type: 'asset', assetType: 'render' });
    BorSystems.attributes.add(name + 'Material', { type: 'asset', assetType: 'material' });
});

BorSystems.prototype.initialize = function () {
    this.drive = this.entity.script.acHeavyDrive;
    this.visual = this.entity.findByName('BÓR | model GLB');
    this.pivot = this.entity.findByName('BOR_TURRET_PIVOT');
    this.p2 = this.pivot.findByName('BOR_TURRET_P2');
    this.t6 = this.pivot.findByName('BOR_TURRET_T6');
    this.route = [[0, 64.5], [0, 106], [17, 137], [17, 166]];
    this.weaponCooldown = 0;
    this.shots = [];
    this.previousPosition = this.entity.getPosition().clone();
    this.previousHeading = this.drive.heading;

    this.trackPath = [
        [-2.01, .145], [2.01, .145], [2.48, .38], [2.68, .63],
        [2.72, .91], [2.55, 1.16], [2.24, 1.27], [-2.24, 1.27],
        [-2.55, 1.16], [-2.72, .91], [-2.68, .63], [-2.48, .38]
    ];
    this.trackLength = 0;
    this.trackSegments = this.trackPath.map(function (point, index) {
        var next = this.trackPath[(index + 1) % this.trackPath.length];
        var dy = next[0] - point[0];
        var dz = next[1] - point[1];
        var length = Math.hypot(dy, dz);
        var segment = { start: this.trackLength, length: length, point: point,
            dy: dy, dz: dz, angle: Math.atan2(dz, dy) * pc.math.RAD_TO_DEG };
        this.trackLength += length;
        return segment;
    }, this);
    this.addMesh('Suspension arms and return rollers', this.arms, this.armsMaterial, this.visual);
    this.runningGear = [-1, 1].map(this.makeSide, this);
    this.previewTracks = ['Track Left', 'Track Right'].map(function (name) {
        var track = this.entity.findByName(name);
        track.render.enabled = false;
        return track;
    }, this);

    var north = this.app.root.findByName('BOR_NORTHERN_ROUTE');
    var scenery = this.app.root.findByName('ASH_FIELD_SCENERY');
    if (scenery) {
        scenery.children.forEach(function (child) {
            if (child.name !== 'ASH_SCENERY_BLOCKER') return;
            var position = child.getPosition();
            var size = child.getLocalScale();
            this.drive.obstacles.push([position.x, position.z, size.x/2, size.z/2]);
        }, this);
    }
    this.barriers = [];
    this.targets = [];
    north.children.forEach(function (child) {
        var target = child.name === 'BOR_ROUTE_TARGET';
        if (!target && child.name !== 'BOR_ROUTE_BARRIER') return;
        var size = child.getLocalScale();
        var half = new pc.Vec3(size.x / 2, size.y / 2, size.z / 2);
        var item = { entity: child, box: new pc.BoundingBox(child.getPosition().clone(), half), hits: 0 };
        (target ? this.targets : this.barriers).push(item);
    }, this);
    this.groundHeightOriginal = this.drive.groundHeight.bind(this.drive);
    this.occupyOriginal = this.drive.canOccupy;
    this.drive.groundHeight = this.groundHeight.bind(this);
    this.drive.canOccupy = this.canOccupy.bind(this);
    this.impactBoxes = this.drive.obstacles.map(function (o) {
        return new pc.BoundingBox(new pc.Vec3(o[0], 1.35, o[1]), new pc.Vec3(o[2], 1.35, o[3]));
    });

    this.tracerMaterial = this.effectMaterial(1, .46, .12);
    this.flashMaterial = this.effectMaterial(1, .73, .33);
    this.flash = this.effect('BOR muzzle flash', 'sphere', this.flashMaterial);
    this.flash.enabled = false;
    this.flashTime = 0;
    this.on('destroy', this.cleanup, this);
};

BorSystems.prototype.addMesh = function (name, asset, material, parent) {
    var entity = new pc.Entity(name);
    entity.addComponent('render', {
        type: 'asset', asset: asset.id, materialAssets: [material.id],
        castShadows: false, receiveShadows: true
    });
    parent.addChild(entity);
    return entity;
};

BorSystems.prototype.makeSide = function (sign) {
    var side = new pc.Entity(sign < 0 ? 'BOR animated gear L' : 'BOR animated gear R');
    this.visual.addChild(side);
    var x = sign * 1.42;
    var wheels = [-2.22, -1.665, -.995, -.33, .335, 1, 1.665, 2.22].map(function (y, i) {
        var large = i === 0 || i === 7;
        var asset = i === 0 ? this.sprocket : i === 7 ? this.idler : this.roadWheel;
        var material = i === 0 ? this.sprocketMaterial : i === 7 ? this.idlerMaterial : this.roadWheelMaterial;
        var e = this.addMesh('Rotating wheel', asset, material, side);
        e.setLocalPosition(x, large ? .749 : .477, -y);
        return { entity: e, radius: large ? .415 : .336, center: large ? .749 : .477, y: y, fixed: large, offset: 0 };
    }, this);
    var count = Math.round(this.trackLength / .151);
    var shoes = [];
    for (var i = 0; i < count; i++) {
        shoes.push(this.addMesh('Cast track link', this.shoe, this.shoeMaterial, side));
    }
    var result = { entity: side, sign: sign, x: x, phase: 0, wheels: wheels, shoes: shoes };
    this.moveTrack(result, 0);
    return result;
};

BorSystems.prototype.suspend = function (side, dt) {
    if (!this.suspensionLocal) {
        this.suspensionLocal=new pc.Mat4();
        this.suspensionPoint=new pc.Vec3();
    }
    this.suspensionLocal.copy(this.visual.getWorldTransform()).invert();
    var changed=false;
    side.wheels.forEach(function (wheel) {
        if (wheel.fixed) return;
        var p=wheel.entity.getPosition();
        this.suspensionPoint.set(p.x,this.groundHeight(p.x,p.z),p.z);
        this.suspensionLocal.transformPoint(this.suspensionPoint,this.suspensionPoint);
        var target=pc.math.clamp(this.suspensionPoint.y+wheel.radius+.0525-wheel.center,-.19,.22);
        var next=wheel.offset+(target-wheel.offset)*(1-Math.exp(-dt*10));
        changed=changed||Math.abs(next-wheel.offset)>.0005;
        wheel.offset=next;
        wheel.entity.setLocalPosition(side.x,wheel.center+wheel.offset,-wheel.y);
    },this);
    return changed;
};

BorSystems.prototype.lowerTrackOffset = function (side, distance) {
    var wheels=side.wheels;
    for (var i=1;i<wheels.length;i++) {
        var a=wheels[i-1],b=wheels[i];
        if (distance<=b.y) {
            var t=pc.math.clamp((distance-a.y)/(b.y-a.y),0,1);
            return a.offset+(b.offset-a.offset)*t;
        }
    }
    return 0;
};

BorSystems.prototype.moveTrack = function (side, distance) {
    var total = this.trackLength;
    side.phase = (side.phase - distance + total) % total;
    var pitch = total / side.shoes.length;
    var segments = this.trackSegments;
    for (var i = 0; i < side.shoes.length; i++) {
        var s = (side.phase + (i + .5) * pitch) % total;
        var j = 0;
        while (j < segments.length - 1 && s >= segments[j].start + segments[j].length) j++;
        var section = segments[j];
        var t = (s - section.start) / section.length;
        var distanceY=section.point[0]+section.dy*t;
        var height=section.point[1]+section.dz*t;
        var offset=this.lowerTrackOffset(side,distanceY)*pc.math.clamp((.53-height)/.385,0,1);
        side.shoes[i].setLocalPosition(side.x, height+offset,
            -(section.point[0] + section.dy*t));
        side.shoes[i].setLocalEulerAngles(section.angle, 0, 0);
    }
    side.wheels.forEach(function (wheel) {
        wheel.entity.rotateLocal(-distance / wheel.radius * pc.math.RAD_TO_DEG, 0, 0);
    });
};

BorSystems.prototype.groundHeight = function (x, z) {
    var height = this.groundHeightOriginal(x, z);
    for (var i = 1; i < this.route.length; i++) {
        var a = this.route[i-1], b = this.route[i];
        var dx = b[0]-a[0], dz = b[1]-a[1];
        var length = Math.hypot(dx, dz);
        var along = ((x-a[0])*dx+(z-a[1])*dz)/length;
        var across = Math.abs((x-a[0])*dz-(z-a[1])*dx)/length;
        var overlap = i === this.route.length - 1 ? .25 : 1.5;
        if (along >= -overlap && along <= length+overlap && across <= 4.25) {
            height = Math.max(height, .031);
        }
    }
    var world = this.entity.script.ashWorld;
    return world && world.ready ? world.surface(x,z,height) : height;
};

BorSystems.prototype.canOccupy = function (x, z, heading, ignoreFuel) {
    var company = this.entity.script.ashCompany;
    if (!ignoreFuel && company && company.state && company.state.fuel <= 0) return false;
    var world = this.entity.script.ashWorld;
    if (world && world.ready) {
        if (!world.contains(x,z)) return false;
    } else if (Math.abs(x) > 54 || z < -53 || z > 162.8) return false;
    var sin = Math.sin(heading), cos = Math.cos(heading);
    var sa = Math.abs(sin), ca = Math.abs(cos);
    var service=this.entity.script.ashService;
    var wide = service && service.isReinforced && service.isReinforced() ? 2.19 : 2.054, long = 2.97;
    var fleet=this.entity.script.ashFleet;
    if(fleet&&fleet.ready){var footprint=fleet.model().half;wide=footprint[0];long=footprint[1];}
    function overlaps(ox, oz, w, l) {
        var dx = ox-x, dz = oz-z;
        return Math.abs(dx) < w + wide*ca + long*sa &&
            Math.abs(dz) < l + wide*sa + long*ca &&
            Math.abs(dx*cos - dz*sin) < wide + w*ca + l*sa &&
            Math.abs(dx*sin + dz*cos) < long + w*sa + l*ca;
    }
    if (this.drive.obstacles.some(function (o) { return overlaps(o[0],o[1],o[2],o[3]); })) return false;
    return !this.barriers.some(function (item) {
        var c = item.box.center, h = item.box.halfExtents;
        return overlaps(c.x,c.z,h.x,h.z);
    });
};

BorSystems.prototype.effectMaterial = function (r, g, b) {
    var mat = new pc.StandardMaterial();
    mat.useLighting = false;
    mat.diffuse.set(r,g,b);
    mat.emissive.set(r,g,b);
    mat.emissiveIntensity = 1.75;
    mat.update();
    return mat;
};

BorSystems.prototype.effect = function (name, shape, material) {
    var e = new pc.Entity(name);
    e.addComponent('render', { type: shape, castShadows: false, receiveShadows: false });
    e.render.material = material;
    this.app.root.addChild(e);
    return e;
};

BorSystems.prototype.fireCannon = function () {
    var company = this.entity.script.ashCompany;
    if (company && company.state && !company.state.consumeRound()) return;
    var turret = this.t6.enabled ? this.t6 : this.p2;
    var service=this.entity.script.ashService;
    var muzzle = new pc.Vec3(0,this.t6.enabled?.55:.27,service && service.isLongBarrel && service.isLongBarrel()?-3.24:-2.46);
    var custom=this.entity.script.ashCustomization;
    if (custom&&custom.ready) muzzle=custom.muzzle();
    var matrix = custom&&custom.ready ? this.pivot.getWorldTransform() : turret.getWorldTransform();
    var origin = matrix.transformPoint(muzzle);
    var direction = matrix.transformVector(new pc.Vec3(0,0,-1)).normalize();
    var shot = this.effect('BOR projectile', 'box', this.tracerMaterial);
    shot.setLocalScale(.035,.035,.85);
    shot.setPosition(origin);
    shot.lookAt(origin.clone().add(direction));
    this.shots.push({ entity:shot, position:origin.clone(), velocity:direction.clone().mulScalar(
        96+(custom&&custom.ready?this.entity.script.ashCompany.state.customParts[2]*5:0)), age:0 });
    this.flash.setPosition(origin);
    this.flash.setLocalScale(.32,.32,.32);
    this.flash.enabled = true;
    this.flashTime = .12;

    this.weaponCooldown = service ? Math.max(3.6,service.build().cycle) : 3.8;
    this.reloadDuration=this.weaponCooldown;
    this.entity.fire('bor:shot',custom&&custom.ready ? this.entity.script.ashCompany.state.customParts[2]>=3 : this.t6.enabled);
};

BorSystems.prototype.impactSurface = function (x,z) {
    const g=this.groundHeight(x,z);
    const water=typeof AshWorldData!=='undefined'&&z>=AshWorldData.north.start&&
        g<AshWorldData.north.water+.015;
    return { y:water?AshWorldData.north.water:g, type:water?'water':'earth' };
};

BorSystems.prototype.updateShots = function (dt) {
    const objects=this.barriers.concat(this.targets.filter(function (target) { return target.entity.enabled; }));
    for (let i=this.shots.length-1;i>=0;i--) {
        const shot=this.shots[i],origin=shot.position;
        const delta=shot.velocity.clone().mulScalar(dt);
        delta.y-=1.65*dt*dt;
        shot.velocity.y-=3.3*dt;
        shot.age+=dt;
        const length=delta.length();
        const direction=delta.clone().normalize();
        const ray=new pc.Ray(origin,direction),point=new pc.Vec3();
        let nearest=length,type=null,target=null;
        function hit(box,surface,item) {
            if (!box.intersectsRay(ray,point)) return;
            const distance=point.distance(origin);
            if(distance>nearest)return;
            nearest=distance;type=surface;target=item;
        }
        objects.forEach(function (item) {hit(item.box,item.onHit?'earth':'metal',item);});
        this.impactBoxes.forEach(function (box) {hit(box,'metal',null);});
        const end=origin.clone().add(delta);
        const to=this.impactSurface(end.x,end.z);
        if(end.y<=to.y) {
            const from=this.impactSurface(origin.x,origin.z);
            const a=origin.y-from.y,b=to.y-end.y;
            const fraction=a<=0?0:Math.max(0,Math.min(1,a/Math.max(.0001,a+b)));
            const distance=length*fraction;
            if(distance<=nearest){nearest=distance;type=to.type;target=null;}
        }
        if(type) {
            if(target&&target.onHit) target.onHit();
            else if(target&&target.entity.name==='BOR_ROUTE_TARGET'){
                target.hits++;
                if(target.hits===1)target.entity.rotate(0,22,0);
                if(target.hits>=2)target.entity.enabled=false;
            }
            this.entity.fire('bor:impact',origin.clone().add(direction.mulScalar(nearest)),type);
        }
        if(type||shot.age>2.35){
            shot.entity.destroy();this.shots.splice(i,1);
        }else{
            shot.position=end;
            shot.entity.setPosition(end);
            shot.entity.lookAt(end.clone().add(direction));
        }
    }
};

BorSystems.prototype.postUpdate = function (dt) {
    var position = this.entity.getPosition();
    var heading = this.drive.heading;
    var travel = (position.x-this.previousPosition.x)*Math.sin(heading) +
        (position.z-this.previousPosition.z)*Math.cos(heading);
    var turn = heading - this.previousHeading;
    this.previousPosition.copy(position);
    this.previousHeading = heading;
    var dynamics=this.entity.script.ashTrackDynamics;
    var suspended=dynamics&&dynamics.ready;
    var moving=Math.abs(travel)+Math.abs(turn)>.00001;
    if (moving) {
        var company = this.entity.script.ashCompany;
        if (company && company.state) company.state.consumeTravel(travel, turn);
    }
    if (moving || suspended) {
        this.runningGear.forEach(function (side) {
            var adjusted=suspended&&this.suspend(side,Math.min(dt,.05));
            if (!moving&&!adjusted) return;
            this.moveTrack(side, travel + side.sign * turn * 1.6472);
        }, this);
    }

    dt = Math.min(dt,.05);
    this.weaponCooldown = Math.max(0,this.weaponCooldown-dt);
    this.flashTime -= dt;
    if (this.flashTime <= 0) this.flash.enabled = false;
    if (this.weaponCooldown === 0 &&
        (this.app.keyboard.isPressed(pc.KEY_SPACE) ||
        (this.app.mouse && this.app.mouse.isPressed(pc.MOUSEBUTTON_LEFT)))) this.fireCannon();
    if (this.shots.length) this.updateShots(dt);
};

BorSystems.prototype.cleanup = function () {
    this.drive.groundHeight = this.groundHeightOriginal;
    this.drive.canOccupy = this.occupyOriginal;
    this.runningGear.forEach(function (side) { side.entity.destroy(); });
    this.previewTracks.forEach(function (track) { track.render.enabled = true; });
    this.flash.destroy();
    this.shots.forEach(function (shot) { shot.entity.destroy(); });
    this.tracerMaterial.destroy();
    this.flashMaterial.destroy();
};















