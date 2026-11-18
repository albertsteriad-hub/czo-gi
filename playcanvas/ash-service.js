const ASH_BOR_BUILDS = {
    p2: { label:'P-2', mass:50000, cycle:.67 },
    t6: { label:'T-6', mass:54000, cycle:.95 }
};

if (typeof pc !== 'undefined') {
    var AshService = pc.createScript('ashService');

    AshService.prototype.initialize = function () {
        this.company = this.entity.script.ashCompany;
        this.turret = this.entity.script.borTurret;
        this.drive = this.entity.script.acHeavyDrive;
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
        towers.setAttribute('aria-label','Porównanie wież');
        this.panel.append(towers);
        this.button(towers,'P-2 · 50 t · 0,67 s',function () { this.mount(false); });
        this.button(towers,'T-6 · 54 t · 0,95 s',function () { this.mount(true); });
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
        return this.turret.t6.enabled ? ASH_BOR_BUILDS.t6 : ASH_BOR_BUILDS.p2;
    };

    AshService.prototype.update = function () {
        const visible = !!this.atPost();
        if (!visible && !this.panel.hidden) this.status.textContent = '';
        this.panel.hidden = !visible;
        this.drive.mass = this.build().mass;
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
        this.drive.mass = this.build().mass;
        this.status.textContent = 'Zamontowano '+this.build().label+'.';
        this.app.graphicsDevice.canvas.focus();
    };
}


