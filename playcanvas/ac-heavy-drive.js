var AcHeavyDrive = pc.createScript('acHeavyDrive');

AcHeavyDrive.prototype.initialize = function () {
    this.mass = 50000;
    this.speed = 0;
    this.turnRate = 0;
    this.heading = 0;
    this.camera = this.app.root.findByName('Camera');
    this.cameraTarget = new pc.Vec3();
    this.lookTarget = new pc.Vec3();
    this.obstacles = [[11,12,4.4,4.9],[-12,25,4.4,5.4],[13,39,5.4,4.9],[-17,-6,4.9,3.9],[-42.216949770692736,0.805122354067862,0.48,0.48],[29.320848922245204,61.273466458311304,0.48,0.48],[-31.4909563860856,31.023672075476497,0.48,0.48],[35.403781251981854,63.65843250625767,0.48,0.48],[-26.676060982514173,57.08166300319135,0.48,0.48],[38.38796061370522,25.831569797126576,0.48,0.48],[-28.375019762199372,-10.779888445045799,0.48,0.48],[38.964157573878765,-19.401067881612107,0.48,0.48],[-45.69389102468267,61.03286861162633,0.48,0.48],[36.924774340353906,-10.1704911517445,0.48,0.48],[-40.84009958943352,32.52817537961528,0.48,0.48],[50.07036560587585,3.3350562697742134,0.48,0.48],[-48.6374018532224,49.21669325232506,0.48,0.48],[12.999978971667588,25.467992239398882,0.48,0.48],[-23.308093279134482,-25.56683900905773,0.48,0.48],[42.861242685467005,35.61569893662818,0.48,0.48]];
    this.mounds = [[33.80038849520497,76.71605980396271,8.157555091357791,7.329188205823303,0.4417678438369185],[-22.625142091186717,-22.10231178998947,7.188459619251081,6.384711648002267,0.3133645760603249],[35.13309495500289,33.6348991394043,2.715440238150768,6.6465451704710725,0.2597303676288575],[-29.556317443260923,-41.65737897157669,6.638592610531487,6.090178971365094,0.6121106558069587],[39.93416402931325,-23.047463536262512,8.22828610816505,8.664605369791389,0.3514353213328868],[-38.8838974640239,50.26147085428238,7.043233842332848,6.627451252117753,0.5218261118195952],[35.73744758008979,-2.7417032718658447,2.492881846870296,4.9010431354492905,0.2670676271673292],[-30.030266653979197,-40.52377134561539,3.5246227851370353,6.02850641079247,0.5633060271441936],[-23.920628574909642,49.721483051776886,6.655272423219867,4.925877787843347,0.484170970056206],[19.601265601580963,-33.12443208694458,8.76320731069427,9.589996495172382,0.34475496981851755],[-38.33365282253362,-8.113392174243927,2.575345963635482,10.065095549896359,0.414507863201201],[24.04166428814642,75.21387326717377,4.112152549042366,4.218714024052024,0.5852397723365576],[-44.10661418666132,-50.11705058813095,3.679271826450713,3.15181559599936,0.4768663214854896],[-46.33564899885096,-34.86398559808731,6.4825344162294645,9.698635963872075,0.19217295871675016],[20.13316016155295,64.85933887958527,8.136173211759887,2.8200678678601983,0.4047396761421114],[-38.46175366756506,17.70265704393387,6.204578174767085,6.936600736156106,0.238126162994653],[43.43042558035813,67.49700450897217,4.491127204778604,5.432199574634433,0.6626272006016224],[-40.88315040082671,74.01326674222946,5.428762415074743,7.856391446664929,0.6116338408514858],[-24.48464511637576,-24.761044442653656,4.225304436613806,5.244205986633897,0.18185663014277817],[44.405689565232024,-0.9485371112823486,6.045489442045801,8.243209304139018,0.31851315379701556],[39.272649637190625,-49.53815305233002,3.971485697082244,4.942571488246322,0.6719716827068478],[-43.67016348731704,-6.598242938518524,3.6416976136388257,5.604365844503046,0.3503513096608222],[19.976669251685962,17.20038080215454,8.610880523431115,5.240444447919726,0.5446669452320785],[45.62213020841591,38.7738698720932,7.5270489888032905,6.718141430839896,0.1936531415451318],[-21.71453871508129,61.702536165714264,5.492755928193219,7.245701525583864,0.345736551951617],[35.78672287031077,51.94156098365784,7.475702052633278,6.316642432734371,0.3533891806807369],[-37.64636128419079,-22.551280558109283,4.183792377472855,5.101824528649449,0.6232290274053811],[28.311057979939505,-25.230170130729675,7.274460540688597,10.005129353627563,0.5703541590515524],[-33.40793383982964,38.00432997941971,6.320096010831185,7.808845964446665,0.24016678358986973]];
    this.trackOffsets = [0, 0];
    this.tracks = ['Left', 'Right'].map(function (side) {
        var track = this.entity.findByName('Track ' + side);
        return track.children.map(function (shoe) {
            var p = shoe.getLocalPosition();
            var radius = 0.647;
            var half = 2.70;
            var arc = Math.PI * radius;
            var distance;
            if (p.z > half + 0.04) {
                distance = 2 * half + radius * Math.atan2(p.z - half, 0.752 - p.y);
            } else if (p.z < -half - 0.04) {
                distance = 4 * half + arc + radius * Math.atan2(-p.z - half, p.y - 0.752);
            } else {
                distance = p.y < 0.752 ? p.z + half : 3 * half + arc - p.z;
            }
            return { shoe: shoe, x: p.x, distance: distance };
        });
    }, this);
    this.wheels = ['Left', 'Right'].map(function (side) {
        return this.entity.findByName('Road Wheels ' + side).children;
    }, this);
    this.updateCamera(0, true);
};

AcHeavyDrive.prototype.groundHeight = function (x, z) {
    var height = Math.abs(x) < 4.25 && z > -40.5 && z < 64.5 ? 0.028 : 0;
    for (var i = 0; i < this.mounds.length; i++) {
        var mound = this.mounds[i];
        var dx = (x - mound[0]) / mound[2];
        var dz = (z - mound[1]) / mound[3];
        var radiusSquared = dx * dx + dz * dz;
        if (radiusSquared < 1) height = Math.max(height, mound[4] * (1 - radiusSquared));
    }
    return height;
};

AcHeavyDrive.prototype.canOccupy = function (x, z, heading) {
    if (Math.abs(x) > 54 || z < -53 || z > 81) return false;
    var dx = Math.sin(heading) * 2.15;
    var dz = Math.cos(heading) * 2.15;
    for (var i = 0; i < this.obstacles.length; i++) {
        var obstacle = this.obstacles[i];
        for (var sample = -1; sample <= 1; sample++) {
            var edgeX = Math.max(0, Math.abs(x + sample * dx - obstacle[0]) - obstacle[2]);
            var edgeZ = Math.max(0, Math.abs(z + sample * dz - obstacle[1]) - obstacle[3]);
            if (edgeX * edgeX + edgeZ * edgeZ < 1.7 * 1.7) return false;
        }
    }
    return true;
};

AcHeavyDrive.prototype.animateTrack = function (index, travel) {
    var half = 2.70;
    var radius = 0.647;
    var run = 2 * half;
    var arc = Math.PI * radius;
    var loop = 2 * (run + arc);
    this.trackOffsets[index] = (this.trackOffsets[index] - travel) % loop;
    var offset = this.trackOffsets[index];
    this.tracks[index].forEach(function (entry) {
        var s = ((entry.distance + offset) % loop + loop) % loop;
        var y = 0.752 - radius;
        var z = s - half;
        var angle = 0;
        if (s >= run && s < run + arc) {
            var front = (s - run) / radius;
            y = 0.752 - radius * Math.cos(front);
            z = half + radius * Math.sin(front);
            angle = -front;
        } else if (s >= run + arc && s < 2 * run + arc) {
            y = 0.752 + radius;
            z = half - (s - run - arc);
        } else if (s >= 2 * run + arc) {
            var rear = (s - 2 * run - arc) / radius;
            y = 0.752 + radius * Math.cos(rear);
            z = -half - radius * Math.sin(rear);
            angle = -rear;
        }
        entry.shoe.setLocalPosition(entry.x, y, z);
        entry.shoe.setLocalEulerAngles(angle * pc.math.RAD_TO_DEG, 0, 0);
    });
    this.wheels[index].forEach(function (wheel, i) {
        var radius = i === 0 || i === 7 ? 0.59 : 0.49;
        wheel.rotateLocal(travel / radius * pc.math.RAD_TO_DEG, 0, 0);
    });
};

AcHeavyDrive.prototype.updateCamera = function (dt, snap) {
    var position = this.entity.getPosition();
    var sin = Math.sin(this.heading);
    var cos = Math.cos(this.heading);
    this.cameraTarget.set(position.x - sin * 10.6 + cos * 2,
        position.y + 5.35, position.z - cos * 10.6 - sin * 2);
    var current = this.camera.getPosition();
    var blend = snap ? 1 : 1 - Math.exp(-dt * 4.4);
    this.camera.setPosition(current.x + (this.cameraTarget.x - current.x) * blend,
        current.y + (this.cameraTarget.y - current.y) * blend,
        current.z + (this.cameraTarget.z - current.z) * blend);
    this.lookTarget.set(position.x + sin * 3, position.y + 1.45, position.z + cos * 3);
    this.camera.lookAt(this.lookTarget);
};

AcHeavyDrive.prototype.update = function (dt) {
    dt = Math.min(dt, 0.05);
    var keyboard = this.app.keyboard;
    var throttle = Number(keyboard.isPressed(pc.KEY_W)) - Number(keyboard.isPressed(pc.KEY_S));
    var steering = Number(keyboard.isPressed(pc.KEY_A)) - Number(keyboard.isPressed(pc.KEY_D));
    var old = this.entity.getPosition();
    var weather = this.entity.script.ashWeather;
    var traction = weather && weather.enabled && weather.ready ? weather.sample(old.x, old.z) : null;
    var dynamics=this.entity.script.ashTrackDynamics;
    if (dynamics && dynamics.ready) {
        var dxTrack=Math.sin(this.heading)*2.3,dzTrack=Math.cos(this.heading)*2.3;
        var riseTrack=this.groundHeight(old.x+dxTrack,old.z+dzTrack)-
            this.groundHeight(old.x-dxTrack,old.z-dzTrack);
        var response=dynamics.integrate({throttle:throttle,steering:steering,mass:this.mass,
            traction:traction,grade:pc.math.clamp(riseTrack/4.6,-.55,.55)},dt);
        this.speed=response.speed;
        this.turnRate=response.yaw;
    } else {
        var reversing = throttle * this.speed < 0;
        var force = throttle * (reversing ? 225000 : 123000);
        var damping = throttle ? 0.19 : 0.72;
        var limit = 1, steerGrip = 1, slope = 0;
        if (traction) {
            force *= reversing ? traction.brake : traction.pull;
            damping *= throttle ? traction.roll : traction.brake;
            limit = traction.limit;
            steerGrip = traction.steer;
            if (throttle || Math.abs(this.speed) > 0.12) {
                var fx = Math.sin(this.heading) * 2.3, fz = Math.cos(this.heading) * 2.3;
                var rise = this.groundHeight(old.x + fx, old.z + fz) -
                    this.groundHeight(old.x - fx, old.z - fz);
                slope = -3.6 * pc.math.clamp(rise / 4.6, -0.55, 0.55);
            }
        }
        this.speed += (force / this.mass + slope - damping * this.speed) * dt;
        this.speed = pc.math.clamp(this.speed, -4.0 * limit, 10.2 * limit);
        if (!throttle && Math.abs(this.speed) < 0.035) this.speed = 0;
        var targetTurn = steering * (0.56 - 0.022 * Math.abs(this.speed)) * steerGrip;
        this.turnRate += (targetTurn - this.turnRate) * (1 - Math.exp(-dt * 4.2 * steerGrip));
    }
    var heading = this.heading + this.turnRate * dt;
    var x = old.x + Math.sin(heading) * this.speed * dt;
    var z = old.z + Math.cos(heading) * this.speed * dt;
    var travel = 0;
    var rotation = 0;
    if (this.canOccupy(x, z, heading)) {
        travel = this.speed * dt;
        rotation = heading - this.heading;
        this.heading = heading;
    } else {
        x = old.x;
        z = old.z;
        this.speed = 0;
        this.turnRate = 0;
        if (dynamics&&dynamics.ready) dynamics.reset();
    }
    var sin = Math.sin(this.heading);
    var cos = Math.cos(this.heading);
    var front = this.groundHeight(x + sin * 2.3, z + cos * 2.3);
    var rear = this.groundHeight(x - sin * 2.3, z - cos * 2.3);
    var left = this.groundHeight(x + cos * 1.7, z - sin * 1.7);
    var right = this.groundHeight(x - cos * 1.7, z + sin * 1.7);
    var height = (front + rear + left + right) * 0.25;
    this.entity.setPosition(x, old.y + (height - old.y) * (1 - Math.exp(-dt * 9)), z);
    this.entity.setEulerAngles(-Math.atan2(front - rear, 4.6) * pc.math.RAD_TO_DEG,
        this.heading * pc.math.RAD_TO_DEG, -Math.atan2(left - right, 3.4) * pc.math.RAD_TO_DEG);
    if (Math.abs(travel) + Math.abs(rotation) > 0.00001) {
        this.animateTrack(0, travel + rotation * 1.87);
        this.animateTrack(1, travel - rotation * 1.87);
    }
    this.updateCamera(dt, false);
};


