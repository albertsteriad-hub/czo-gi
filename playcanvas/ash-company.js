const ASH_SAVE_KEY = 'ash-convoy:1651220:company:v1';
const ASH_CAPACITY = { fuel: 120, ammo: 24 };
const ASH_CREW = [
    { id: 'marta', name: 'Marta Wrona', role: 'Dowódczyni', skill: 3, morale: 76, health: 100, fatigue: 0 },
    { id: 'jan', name: 'Jan Łoza', role: 'Kierowca', skill: 3, morale: 70, health: 100, fatigue: 0 },
    { id: 'ida', name: 'Ida Kruk', role: 'Celownicza', skill: 2, morale: 72, health: 100, fatigue: 0 },
    { id: 'filip', name: 'Filip Lis', role: 'Ładowniczy', skill: 2, morale: 75, health: 100, fatigue: 0 },
    { id: 'nina', name: 'Nina Prus', role: 'Mechaniczka', skill: 3, morale: 68, health: 100, fatigue: 0 }
];

function AshCompanyState() {
    this.fuel = ASH_CAPACITY.fuel;
    this.ammo = ASH_CAPACITY.ammo;
    this.fieldRecon = 0;
    this.fieldOutcome = null;
    this.credits = 0;
    this.serviceSpent = 0;
    this.savedPose = null;
    this.longBarrel = true;
    this.fieldArmor = true;
    this.crew = ASH_CREW.map(function (entry) { return Object.assign({}, entry); });
    this.reputation = { freeMarches: 0, roadCompany: 0 };
}

AshCompanyState.prototype.consumeTravel = function (distance, turn) {
    this.fuel = Math.max(0, this.fuel - .045 * Math.abs(distance) - .18 * Math.abs(turn));
};

AshCompanyState.prototype.consumeRound = function () {
    if (this.ammo <= 0) return false;
    this.ammo--;
    return true;
};

AshCompanyState.prototype.applyFieldOutcome = function () {
    const reward = typeof fieldReward === 'function' ? fieldReward(this.fieldOutcome) : null;
    this.credits = reward ? reward.credits - this.serviceSpent : 0;
    this.reputation.freeMarches = reward ? reward.freeMarches : 0;
    this.reputation.roadCompany = reward ? reward.roadCompany : 0;
};

AshCompanyState.prototype.buySupplies = function (kind) {
    const offer = { fuel: { amount: 20, price: 12 }, ammo: { amount: 4, price: 14 } }[kind];
    if (!offer || this[kind] >= ASH_CAPACITY[kind]) return 'full';
    if (this.credits < offer.price) return 'funds';
    this[kind] = Math.min(ASH_CAPACITY[kind], this[kind] + offer.amount);
    this.credits -= offer.price;
    this.serviceSpent += offer.price;
    return 'bought';
};

AshCompanyState.prototype.save = function (storage, turret, pose) {
    storage.setItem(ASH_SAVE_KEY, JSON.stringify({
        version: 1, fuel: this.fuel, ammo: this.ammo, turret: turret, fieldRecon: this.fieldRecon, fieldOutcome: this.fieldOutcome, serviceSpent: this.serviceSpent, pose: pose || null, longBarrel: this.longBarrel, fieldArmor: this.fieldArmor
    }));
};

AshCompanyState.prototype.load = function (storage) {
    const raw = storage.getItem(ASH_SAVE_KEY);
    if (raw === null) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || !Number.isFinite(saved.fuel) ||
        saved.fuel < 0 || saved.fuel > ASH_CAPACITY.fuel || !Number.isInteger(saved.ammo) ||
        saved.ammo < 0 || saved.ammo > ASH_CAPACITY.ammo ||
        (saved.turret !== 'P-2' && saved.turret !== 'T-6')) {
        throw new Error('Invalid company save');
    }
    const fieldRecon = saved.fieldRecon === undefined ? 0 : saved.fieldRecon;
    if (!Number.isInteger(fieldRecon) || fieldRecon < 0 || fieldRecon > 3) {
        throw new Error('Invalid field reconnaissance');
    }
    const fieldOutcome = saved.fieldOutcome === undefined ? null : saved.fieldOutcome;
    if (fieldOutcome !== null && (fieldRecon !== 3 || (fieldOutcome !== 'herded' && fieldOutcome !== 'killed'))) {
        throw new Error('Invalid field outcome');
    }
    const spent = saved.serviceSpent === undefined ? 0 : saved.serviceSpent;
    const reward = typeof fieldReward === 'function' ? fieldReward(fieldOutcome) : null;
    if (!Number.isInteger(spent) || spent < 0 || spent > (reward ? reward.credits : 0)) {
        throw new Error('Invalid service expenses');
    }
    const pose = saved.pose === undefined ? null : saved.pose;
    if (pose !== null && (!Number.isFinite(pose.x) || !Number.isFinite(pose.z) ||
        !Number.isFinite(pose.heading) || Math.abs(pose.x)>1e5 || Math.abs(pose.z)>1e5)) {
        throw new Error('Invalid vehicle position');
    }
    if ((saved.longBarrel !== undefined && typeof saved.longBarrel !== 'boolean') ||
        (saved.fieldArmor !== undefined && typeof saved.fieldArmor !== 'boolean')) throw new Error('Invalid vehicle configuration');
    this.longBarrel = saved.longBarrel === undefined ? true : saved.longBarrel;
    this.fieldArmor = saved.fieldArmor === undefined ? true : saved.fieldArmor;
    this.savedPose = pose ? { x:pose.x,z:pose.z,heading:Math.atan2(Math.sin(pose.heading),Math.cos(pose.heading)) } : null;
    this.serviceSpent = spent;
    this.fieldRecon = fieldRecon;
    this.fieldOutcome = fieldOutcome;
    this.applyFieldOutcome();
    this.fuel = saved.fuel;
    this.ammo = saved.ammo;
    return saved.turret;
};

if (typeof module !== 'undefined' && module.exports) module.exports = AshCompanyState;

if (typeof pc !== 'undefined') {
    var AshCompany = pc.createScript('ashCompany');

    AshCompany.prototype.initialize = function () {
        this.state = new AshCompanyState();
        this.turret = this.entity.script.borTurret;
        this.status = '';
        this.makePanel();
        this.on('enable', function () { this.panel.hidden = false; }, this);
        this.on('disable', function () { this.panel.hidden = true; }, this);
        this.on('destroy', function () { this.panel.remove(); }, this);
    };

    AshCompany.prototype.makePanel = function () {
        const panel = document.createElement('aside');
        panel.setAttribute('aria-label', 'Zapasy kompanii');
        panel.style.cssText = 'position:fixed;top:12px;right:12px;z-index:20;padding:9px 11px;color:#f2dfb7;background:#23221bef;border:1px solid #987d50;font:13px ui-monospace,monospace';
        panel.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        this.readout = document.createElement('div');
        panel.append(this.readout);
        [
            ['Zapisz', this.save],
            ['Wczytaj', this.load]
        ].forEach(function (entry) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = entry[0];
            button.style.cssText = 'margin:6px 5px 0 0;color:inherit;background:#393329;border:1px solid #987d50;padding:3px 6px;font:inherit;cursor:pointer';
            button.addEventListener('click', entry[1].bind(this));
            panel.append(button);
        }, this);
        this.message = document.createElement('div');
        this.message.setAttribute('role', 'status');
        panel.append(this.message);
        document.body.append(panel);
        this.panel = panel;
        this.update();
    };

    AshCompany.prototype.update = function () {
        const turret = this.turret.t6.enabled ? 'T-6' : 'P-2';
        const text = 'BÓR ' + turret + ' · Paliwo ' + this.state.fuel.toFixed(1) +
            ' l · Amunicja ' + this.state.ammo + ' · Kredyty ' + this.state.credits;
        if (this.readout.textContent !== text) this.readout.textContent = text;
    };

    AshCompany.prototype.save = function () {
        try {
            const p=this.entity.getPosition();
            const drive=this.entity.script.acHeavyDrive;
            this.state.save(window.localStorage, this.turret.t6.enabled ? 'T-6' : 'P-2',
                {x:p.x,z:p.z,heading:drive.heading});
            this.message.textContent = 'Zapisano pojazd i postęp.';
        } catch (error) {
            this.message.textContent = 'Zapis jest niedostępny.';
        }
        this.app.graphicsDevice.canvas.focus();
    };

    AshCompany.prototype.load = function () {
        try {
            const turret = this.state.load(window.localStorage);
            if (turret) {
                this.turret.selectTurret(turret === 'T-6');
                const pose=this.state.savedPose;
                this.message.textContent=pose && !this.restorePose(pose) ?
                    'Wczytano postęp. Zapisane miejsce jest niedostępne.' : 'Wczytano postęp.';
            } else this.message.textContent='Brak zapisu.';
            this.update();
        } catch (error) {
            this.message.textContent = 'Nie można odczytać zapisu.';
        }
        this.app.graphicsDevice.canvas.focus();
    };

    AshCompany.prototype.restorePose = function (pose) {
        const drive=this.entity.script.acHeavyDrive;
        const systems=this.entity.script.borSystems;
        if (!systems.canOccupy(pose.x,pose.z,pose.heading,true)) return false;
        this.entity.setPosition(pose.x,systems.groundHeight(pose.x,pose.z),pose.z);
        this.entity.setEulerAngles(0,pose.heading*pc.math.RAD_TO_DEG,0);
        drive.heading=pose.heading;
        drive.speed=0;
        drive.turnRate=0;
        const dynamics=this.entity.script.ashTrackDynamics;
        if (dynamics&&dynamics.ready) dynamics.reset();
        systems.previousPosition.copy(this.entity.getPosition());
        systems.previousHeading=pose.heading;
        drive.updateCamera(0,true);
        return true;
    };
}







