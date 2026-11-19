function ashImpactPalette(type) {
    if(type==='water')return {flash:[.59,.76,.84], debris:[.32,.57,.63], count:12,rise:4.9,life:.72};
    if(type==='metal')return {flash:[1,.67,.20], debris:[.81,.44,.18], count:13,rise:3.7,life:.46};
    return {flash:[1,.53,.22],debris:[.38,.29,.22],count:10,rise:3.2,life:1.18};
}
if(typeof module!=='undefined'&&module.exports)module.exports=ashImpactPalette;

if(typeof pc!=='undefined'){
    var AshImpact=pc.createScript('ashImpact');

    AshImpact.prototype.initialize=function () {
        this.bursts=[];
        this.entity.on('bor:impact',this.burst,this);
        this.on('destroy',function () {
            this.entity.off('bor:impact',this.burst,this);
            this.bursts.forEach(e=>{e.node.destroy();e.material.destroy();});
        },this);
    };

    AshImpact.prototype.burst=function (point,type) {
        const palette=ashImpactPalette(type);
        for(let i=-1;i<palette.count;i++){
            const spark=i===-1;
            const n=new pc.Entity(spark?'Impact flare':'Impact fragment '+type);
            const mat=new pc.StandardMaterial(),c=spark?palette.flash:palette.debris;
            mat.diffuse.set(c[0],c[1],c[2]);
            if(spark||type==='metal'){
                mat.useLighting=false;mat.emissive.set(c[0],c[1],c[2]);mat.emissiveIntensity=spark?2.15:1.15;
            }
            mat.update();
            n.addComponent('render',{type:spark||type==='earth'?'sphere':'box',castShadows:false,receiveShadows:false});
            n.render.material=mat;
            this.app.root.addChild(n);
            n.setPosition(point);
            const a=i*2.39996,spread=i%4*.46+.43;
            const size=spark?.28:type==='earth'?.24:i%3*.018+.026;
            const velocity=new pc.Vec3(spark?0:Math.cos(a)*spread,spark?0:palette.rise*(.50+(i%5)*.16),spark?0:Math.sin(a)*spread);
            this.bursts.push({node:n,material:mat,size:size,velocity:velocity,age:0,h:spark?.15:palette.life,kind:spark?'flash':type});
        }
    };

    AshImpact.prototype.update=function (dt) {
        dt=Math.min(.055,dt);
        for(let i=this.bursts.length-1;i>=0;i--){
            const p=this.bursts[i];
            p.age+=dt;
            const phase=p.age/p.h;
            if(phase>=1){p.node.destroy();p.material.destroy();this.bursts.splice(i,1);continue;}
            const pos=p.node.getPosition();
            p.node.setPosition(pos.x+p.velocity.x*dt,pos.y+p.velocity.y*dt,pos.z+p.velocity.z*dt);
            p.velocity.y-=(p.kind==='earth'?3.4:9.6)*dt;
            const s=p.size*(p.kind==='earth'?1+2.5*phase:p.kind==='flash'?1+phase*2.6:1-phase*.60);
            p.node.setLocalScale(s,p.kind==='water'?s*2:s,s);
        }
    };
}

