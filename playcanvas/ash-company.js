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
    this.crew = ASH_CREW.map(function (entry) { return Object.assign({}, entry); });
    this.reputation = { freeMarches: 0, roadCompany: 0 };
}

AshCompanyState.prototype.consumeTravel = function (distance, turn) {
    this.fuel = Math.max(0, this.fuel - .12 * Math.abs(distance) - .18 * Math.abs(turn));
};

AshCompanyState.prototype.consumeRound = function () {
    if (this.ammo <= 0) return false;
    this.ammo--;
    return true;
};

AshCompanyState.prototype.save = function (storage, turret) {
    storage.setItem(ASH_SAVE_KEY, JSON.stringify({
        version: 1, fuel: this.fuel, ammo: this.ammo, turret: turret, fieldRecon: this.fieldRecon
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
    this.fieldRecon = fieldRecon;
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
            ' l · Amunicja ' + this.state.ammo;
        if (this.readout.textContent !== text) this.readout.textContent = text;
    };

    AshCompany.prototype.save = function () {
        try {
            this.state.save(window.localStorage, this.turret.t6.enabled ? 'T-6' : 'P-2');
            this.message.textContent = 'Zapisano zapasy, wieżę i rozpoznanie.';
        } catch (error) {
            this.message.textContent = 'Zapis jest niedostępny.';
        }
        this.app.graphicsDevice.canvas.focus();
    };

    AshCompany.prototype.load = function () {
        try {
            const turret = this.state.load(window.localStorage);
            if (turret) this.turret.selectTurret(turret === 'T-6');
            this.message.textContent = turret ? 'Wczytano zapasy, wieżę i rozpoznanie.' : 'Brak zapisu.';
            this.update();
        } catch (error) {
            this.message.textContent = 'Nie można odczytać zapisu.';
        }
        this.app.graphicsDevice.canvas.focus();
    };
}


