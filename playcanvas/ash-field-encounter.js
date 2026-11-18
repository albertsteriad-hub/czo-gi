const ASH_FIELD_REWARDS = {
    herded: { credits: 95, freeMarches: 8, roadCompany: 2 },
    killed: { credits: 75, freeMarches: -4, roadCompany: 5 }
};

function fieldReward(outcome) {
    return ASH_FIELD_REWARDS[outcome] || null;
}

if (typeof module !== 'undefined' && module.exports) module.exports = fieldReward;

if (typeof pc !== 'undefined') {
    var AshFieldEncounter = pc.createScript('ashFieldEncounter');

    AshFieldEncounter.prototype.initialize = function () {
        this.company = this.entity.script.ashCompany;
        this.systems = this.entity.script.borSystems;
        this.actor = this.app.root.findByName('FIELD_DZIKORYJ');
        this.home = this.actor.getPosition().clone();
        this.refuge = this.app.root.findByName('FIELD_DZIKORYJ_REFUGE').getPosition().clone();
        this.seconds = 0;
        this.health = 2;
        this.active = false;
        this.herding = false;
        this.target = { entity: this.actor, box: new pc.BoundingBox(
            this.home.clone().add(new pc.Vec3(0,1.2,0)), new pc.Vec3(1,1.22,2.05)),
            onHit: this.hit.bind(this) };
        this.systems.targets.push(this.target);
        this.on('destroy', function () {
            this.systems.targets = this.systems.targets.filter(function (target) {
                return target !== this.target;
            },this);
        },this);
    };

    AshFieldEncounter.prototype.hit = function () {
        if (!this.active || this.company.state.fieldOutcome) return;
        this.health--;
        if (this.health <= 0) this.finish('killed');
        else this.herding = true;
    };

    AshFieldEncounter.prototype.finish = function (outcome) {
        const state = this.company.state;
        if (state.fieldOutcome) return;
        state.fieldOutcome = outcome;
        state.applyFieldOutcome();
        this.actor.enabled = false;
        this.active = false;
    };

    AshFieldEncounter.prototype.update = function (dt) {
        const state = this.company.state;
        const shouldBeActive = state.fieldRecon === 3 && !state.fieldOutcome;
        if (this.active !== shouldBeActive) {
            this.active = this.actor.enabled = shouldBeActive;
            if (shouldBeActive) {
                this.actor.setPosition(this.home);
                this.health = 2;
                this.seconds = 0;
                this.herding = false;
            }
        }
        if (!this.active) return;
        dt = Math.min(dt,.05);
        this.seconds += dt;
        const position = this.actor.getPosition().clone();
        const player = this.entity.getPosition();
        const awayX = position.x-player.x, awayZ = position.z-player.z;
        const threat = Math.hypot(awayX,awayZ);
        const refugeX = this.refuge.x-position.x, refugeZ = this.refuge.z-position.z;
        if (threat < 13 && awayX*refugeX + awayZ*refugeZ > 0 &&
            this.app.keyboard.isPressed(pc.KEY_F)) this.herding = true;
        if (this.herding && Math.hypot(refugeX,refugeZ) < .65) {
            this.finish('herded');
            return;
        }
        const destination = this.herding ? this.refuge :
            new pc.Vec3(this.home.x+Math.sin(this.seconds*.24)*2.1,position.y,
                this.home.z+Math.sin(this.seconds*.15)*1.5);
        const dx = destination.x-position.x, dz = destination.z-position.z;
        const length = Math.hypot(dx,dz);
        if (length > .03) {
            const step = Math.min(length,dt*(this.herding ? 3.5 : .9));
            position.x += dx*step/length;
            position.z += dz*step/length;
            position.y = this.systems.groundHeight(position.x,position.z);
            this.actor.setPosition(position);
            this.actor.setEulerAngles(0,Math.atan2(-dx,-dz)*pc.math.RAD_TO_DEG,0);
        }
        this.target.box.center.copy(position).add(new pc.Vec3(0,1.20,0));
        const yaw = this.actor.getEulerAngles().y * pc.math.DEG_TO_RAD;
        const s = Math.abs(Math.sin(yaw)), c = Math.abs(Math.cos(yaw));
        this.target.box.halfExtents.set(c+2.05*s,1.22,s+2.05*c);
    };

    AshFieldEncounter.prototype.objective = function () {
        const outcome = this.company.state.fieldOutcome;
        if (outcome) {
            const reward = fieldReward(outcome);
            return (outcome === 'herded' ? 'Dzikoryj wypłoszony do lasu.' : 'Dzikoryj zabity.') +
                ' Wypłata: '+reward.credits+' · Marchie '+(reward.freeMarches>0?'+':'')+reward.freeMarches+
                ' · Kompania Dróg +'+reward.roadCompany;
        }
        if (this.herding) return 'Dzikoryj ucieka w kierunku lasu.';
        const range = this.actor.getPosition().distance(this.entity.getPosition());
        return 'Dzikoryj: '+Math.ceil(range)+' m. Podejdź od strony drogi i przytrzymaj F, aby wypłoszyć. Możesz też użyć działa.';
    };
}

