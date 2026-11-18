const ASH_FIELD_SITE = [
    { name: 'FIELD_CONTRACT_POST', label: 'tablica przy drodze', action: 'przyjmij zlecenie',
        testimony: 'Marta: Złamane ogrodzenie, zniknęły dwie sztuki bydła. Zaczynamy od płotu.' },
    { name: 'FIELD_BROKEN_FENCE', label: 'złamany płot', action: 'obejrzyj płot',
        testimony: 'Jan: Szyna wygięła się od strony pola. Coś przeszło tędy do drogi.' },
    { name: 'FIELD_FOOTPRINTS', label: 'ślady racic', action: 'sprawdź ślady',
        testimony: 'Nina: Racice są za szerokie na zwykłego dzika. Ślady prowadzą w stronę lasu.' }
];

function inspectFieldSite(progress, locations, position) {
    const point = locations[progress];
    if (!point || Math.hypot(point.x - position.x, point.z - position.z) > 6) return progress;
    return progress + 1;
}

if (typeof module !== 'undefined' && module.exports) module.exports = inspectFieldSite;

if (typeof pc !== 'undefined') {
    var AshFieldRecon = pc.createScript('ashFieldRecon');

    AshFieldRecon.prototype.initialize = function () {
        this.company = this.entity.script.ashCompany;
        this.drive = this.entity.script.acHeavyDrive;
        this.sites = ASH_FIELD_SITE.map(function (site) {
            return this.app.root.findByName(site.name);
        }, this);
        this.panel = document.createElement('aside');
        this.panel.setAttribute('aria-label', 'Dziennik kontraktu');
        this.panel.style.cssText = 'position:fixed;bottom:14px;left:14px;z-index:20;max-width:min(390px,85vw);padding:9px 12px;color:#f2dfb7;background:#23221bef;border:1px solid #987d50;font:13px/1.5 ui-monospace,monospace';
        this.title = document.createElement('strong');
        this.title.textContent = 'Coś w zbożu';
        this.objective = document.createElement('div');
        this.dialogue = document.createElement('div');
        this.dialogue.setAttribute('role', 'status');
        this.panel.append(this.title, this.objective, this.dialogue);
        document.body.append(this.panel);
        this.on('disable', function () { this.panel.hidden = true; }, this);
        this.on('enable', function () { this.panel.hidden = false; }, this);
        this.on('destroy', function () { this.panel.remove(); }, this);
    };

    AshFieldRecon.prototype.update = function () {
        const state = this.company.state;
        const progress = state.fieldRecon;
        const stage = ASH_FIELD_SITE[progress];
        const here = this.entity.getPosition();
        const positions = this.sites.map(function (site) { return site && site.getPosition(); });
        const point = positions[progress];
        let objective = 'Rozpoznanie zakończone. Załoga ustaliła kierunek tropu.';
        const encounter = this.entity.script.ashFieldEncounter;
        if (!stage && encounter) objective = encounter.objective();
        if (stage && point) {
            const range = Math.hypot(point.x - here.x, point.z - here.z);
            objective = range <= 6
                ? (Math.abs(this.drive.speed) < .75 ? 'F · ' + stage.action : 'Zatrzymaj BÓR, aby zbadać miejsce.')
                : 'Jedź drogą do punktu: ' + stage.label + ' · ' + Math.ceil(range) + ' m';
        } else if (stage) {
            objective = 'Punkt rozpoznania jest niedostępny.';
        }
        if (this.objective.textContent !== objective) this.objective.textContent = objective;
        if (Math.abs(this.drive.speed) < .75 && this.app.keyboard.wasPressed(pc.KEY_F)) {
            state.fieldRecon = inspectFieldSite(progress, positions, here);
        }
        const testimony = ASH_FIELD_SITE[state.fieldRecon - 1];
        const dialogue = testimony ? testimony.testimony : '';
        if (this.dialogue.textContent !== dialogue) this.dialogue.textContent = dialogue;
    };
}


