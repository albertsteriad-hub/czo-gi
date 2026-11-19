const ASH_BOR_BUILDS = {
    p2: { label:'P-2', mass:52500, cycle:.70 },
    t6: { label:'T-6', mass:55800, cycle:.98 }
};

if (typeof pc !== 'undefined') {
    var AshService = pc.createScript('ashService');

    AshService.prototype.initialize = function () {
        this.company = this.entity.script.ashCompany;
        this.turret = this.entity.script.borTurret;
        this.drive = this.entity.script.acHeavyDrive;
        this.longP2=this.turret.p2.findByName('BOR_LONG_P2');
        this.longT6=this.turret.t6.findByName('BOR_LONG_T6');
        this.armor=this.entity.findByName('BOR_FIELD_ARMOR');
        const regional = this.app.root.findByName('World service posts');
        this.posts = [this.app.root.findByName('BOR_SERVICE_POST')].concat(regional ? regional.children : []);
        this.panel = document.createElement('aside');
        this.panel.setAttribute('aria-label','Punkt serwisowy');
        this.panel.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:20;max-width:min(350px,85vw);padding:9px 12px;color:#f2dfb7;background:#23221bef;border:1px solid #987d50;font:13px/1.5 ui-monospace,monospace';
        this.panel.addEventListener('mousedown',function (event) { event.stopPropagation(); });
        const title = document.createElement('strong');
        title.textContent = 'Punkt serwisowy';
        this.panel.append(title);
        const kits = document.createElement('div');
        this.panel.append(kits);
        this.button(kits,'Paliwo +20 l · 12 kr',function () { this.buy('fuel'); });
        this.button(kits,'Amunicja +4 · 14 kr',function () { this.buy('ammo'); });
        const towers = document.createElement('div');
        this.towerControls=towers;
        towers.setAttribute('aria-label','Porównanie wież');
        this.panel.append(towers);
        this.button(towers,'Wieża P-2',function () { this.mount(false); });
        this.button(towers,'Wieża T-6',function () { this.mount(true); });
        const gear=document.createElement('div');
        this.gearControls=gear;
        this.panel.append(gear);
        this.button(gear,'Zmień lufę',function () { this.changeModule('longBarrel'); });
        this.button(gear,'Zmień pancerz',function () { this.changeModule('fieldArmor'); });
        this.summary=document.createElement('div');
        this.panel.append(this.summary);
        this.status = document.createElement('div');
        this.status.setAttribute('role','status');
        this.panel.append(this.status);
        document.body.append(this.panel);
        this.on('disable',function () { this.panel.hidden = true; },this);
        this.on('destroy',function () { this.panel.remove(); },this);
    };

    AshService.prototype.button = function (container,label,handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.style.cssText = 'margin:4px 4px 0 0;color:inherit;background:#393329;border:1px solid #987d50;padding:3px 5px;font:inherit;cursor:pointer';
        button.addEventListener('click',handler.bind(this));
        container.append(button);
    };

    AshService.prototype.atPost = function () {
        if (Math.abs(this.drive.speed) >= .75) return false;
        return this.posts.some(function (post) {
            return post && this.entity.getPosition().distance(post.getPosition()) < 6;
        },this);
    };

    AshService.prototype.build = function () {
        const upgrade=this.entity.script.ashCustomization;
        if (upgrade&&upgrade.ready) return upgrade.build();
        const base=this.turret.t6.enabled ? ASH_BOR_BUILDS.t6 : ASH_BOR_BUILDS.p2;
        const long=this.isLongBarrel();
        const reinforced=this.isReinforced();
        return {label:base.label,mass:base.mass+(long?900:0)+(reinforced?3600:0),
            cycle:base.cycle+(long?.13:0)};
    };

    AshService.prototype.isLongBarrel = function () {
        return !!(this.longP2&&this.longT6&&this.company.state.longBarrel);
    };

    AshService.prototype.isReinforced = function () {
        return !!(this.armor&&this.company.state.fieldArmor);
    };

    AshService.prototype.syncModules = function () {
        const upgrade=this.entity.script.ashCustomization;
        if (upgrade&&upgrade.ready) return;
        const long=this.isLongBarrel();
        if (this.longP2&&this.longT6) {
            this.turret.p2.render.enabled=!long;
            this.turret.t6.render.enabled=!long;
            this.longP2.enabled=this.longT6.enabled=long;
        }
        if (this.armor) this.armor.enabled=this.isReinforced();
    };

    AshService.prototype.changeModule = function (name) {
        if (!this.atPost()) return;
        const available=name==='longBarrel'?this.longP2&&this.longT6:this.armor;
        if (!available) {
            this.status.textContent='Moduł jest niedostępny.';
            return;
        }
        const state=this.company.state;
        state[name]=!state[name];
        this.syncModules();
        this.app.graphicsDevice.canvas.focus();
    };

    AshService.prototype.update = function () {
        const visible = !!this.atPost();
        const upgrade=this.entity.script.ashCustomization;
        this.towerControls.hidden=this.gearControls.hidden=!!(upgrade&&upgrade.ready);
        if (!visible && !this.panel.hidden) this.status.textContent = '';
        this.panel.hidden = !visible;
        this.syncModules();
        const stats=this.build();
        this.drive.mass=stats.mass;
        const summary=stats.label+' · '+(stats.mass/1000).toFixed(1)+' t · '+stats.cycle.toFixed(2)+' s · '+
            (this.isLongBarrel()?'długa lufa':'krótka lufa')+' · '+(this.isReinforced()?'pancerz dodatkowy':'pancerz bazowy');
        const selected=this.entity.script.ashCustomization;
        const label=selected&&selected.ready?stats.label+' · '+(stats.mass/1000).toFixed(1)+' t · '+stats.cycle.toFixed(2)+' s':summary;
        if (this.summary.textContent!==label) this.summary.textContent=label;
    };

    AshService.prototype.buy = function (kind) {
        if (!this.atPost()) return;
        const result = this.company.state.buySupplies(kind);
        this.status.textContent = { bought:'Uzupełniono zapasy.', full:'Zapasy są pełne.',
            funds:'Za mało kredytów.' }[result];
        this.app.graphicsDevice.canvas.focus();
    };

    AshService.prototype.mount = function (useT6) {
        if (!this.atPost()) return;
        this.turret.selectTurret(useT6);
        this.syncModules();
        const stats=this.build();
        this.drive.mass=stats.mass;
        const summary=stats.label+' · '+(stats.mass/1000).toFixed(1)+' t · '+stats.cycle.toFixed(2)+' s · '+
            (this.isLongBarrel()?'długa lufa':'krótka lufa')+' · '+(this.isReinforced()?'pancerz dodatkowy':'pancerz bazowy');
        const selected=this.entity.script.ashCustomization;
        const label=selected&&selected.ready?stats.label+' · '+(stats.mass/1000).toFixed(1)+' t · '+stats.cycle.toFixed(2)+' s':summary;
        if (this.summary.textContent!==label) this.summary.textContent=label;
        this.status.textContent = 'Zamontowano '+this.build().label+'.';
        this.app.graphicsDevice.canvas.focus();
    };
}




