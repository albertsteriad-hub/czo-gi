const ASH_WORLD_BOUNDS = { minX:-300, maxX:300, minZ:-150, maxZ:1863 };
const ASH_WORLD_REGIONS = ['Doliny Osadników','Wielka Puszcza','Żelazny Pas','Zatopione Ziemie','Góry Popiołu'];
const ASH_WORLD_LINKS = [
    [[17,165.9],[17,224],[42,305],[31,401],[58,503],[39,608],[14,744]],
    [[42,305],[-38,328],[-109,365],[-166,437],[-223,504],[-271,587]],
    [[31,401],[104,420],[170,451],[222,503],[277,554]],
    [[58,503],[-25,501],[-102,547],[-171,614],[-234,682]],
    [[39,608],[103,624],[170,662],[230,708],[279,729]],
    [[14,744],[19,828],[-6,923],[35,1018],[12,1113],[18,1200],[-47,1300],[-25,1416],[-8,1473]],
    [[19,828],[-78,854],[-134,940],[-195,1036],[-247,1115],[-237,1240],[-277,1320]],
    [[35,1018],[112,1052],[174,1098],[218,1173],[268,1231],[279,1372]],
    [[18,1200],[100,1265],[181,1342],[279,1372]],
    [[-47,1300],[-121,1360],[-201,1404],[-263,1452]],
    [[-8,1473],[-3,1541],[30,1620],[11,1710],[57,1794],[48,1844]],
    [[-3,1541],[-83,1558],[-153,1618],[-171,1720],[-243,1777],[-270,1825]],
    [[30,1620],[106,1581],[174,1611],[222,1728],[251,1797]],
    [[11,1710],[-47,1738],[-83,1809],[-113,1840]],
    [[0,-40],[4,-73],[39,-112],[126,-123],[221,-105],[277,-65]],
    [[4,-73],[-58,-93],[-131,-111],[-210,-102],[-277,-60]],
    [[17,224],[91,209],[158,245],[218,302],[275,344]],
    [[-109,365],[-179,331],[-235,275],[-268,188]],
    [[170,451],[195,392],[218,302]]
];

function ashWorldSegments() {
    return ASH_WORLD_LINKS.flatMap(function (line) {
        return line.slice(1).map(function (b,index) {
            const a=line[index],dx=b[0]-a[0],dz=b[1]-a[1];
            return { a:a,b:b,dx:dx,dz:dz,length:Math.hypot(dx,dz) };
        });
    });
}

const ASH_WORLD_SEGMENTS = ashWorldSegments();

function ashWorldRoadDistance(x,z) {
    let result=Infinity;
    ASH_WORLD_SEGMENTS.forEach(function (s) {
        const px=x-s.a[0],pz=z-s.a[1];
        const along=Math.max(-1.5,Math.min(s.length+1.5,(px*s.dx+pz*s.dz)/s.length));
        result=Math.min(result,Math.hypot(px-along*s.dx/s.length,pz-along*s.dz/s.length));
    });
    return result;
}

function ashWorldRegion(x,z) {
    if (z>765) {
        if (Math.abs(ashNorthRiver(x,z))<38) return 3;
        if (z>1200 && (x>140 || x<-110)) return 4;
        if (Math.abs(x)<65 && z>970 && z<1060) return 0;
        return 1;
    }
    if (z>575) return 4;
    if (x<-100&&z>110) return 1;
    if (x>105&&z>180) return 2;
    if (x<-85&&z<65) return 3;
    return 0;
}

function ashWorldSectors() {
    const result=[];
    for (let row=0;row<11;row++) {
        for (let col=0;col<6;col++) {
            const x=-250+col*100,z=-58.5+row*183;
            const region=ashWorldRegion(x,z);
            const hills=[], plants=[];
            const existing=(px,pz)=>Math.abs(px)<62&&pz>-59&&pz<167;
            for (let i=0;i<9;i++) {
                const px=x+Math.sin((row+1)*37+(col+2)*79+(i+1)*11)*42;
                const pz=z+Math.cos((row+3)*23+(col+1)*53+(i+1)*17)*78;
                if (existing(px,pz)) continue;
                const road=ashWorldRoadDistance(px,pz);
                const radius=10+(i%3)*4;
                if (i<3 && road>radius+13 && !existing(px-radius,pz) &&
                    !existing(px+radius,pz) && !existing(px,pz-radius) && !existing(px,pz+radius)) {
                    hills.push({x:px,z:pz,radius:radius,height:region===4?8+i*4:2.8+i*1.4});
                } else if (road>8 && i>2) {
                    plants.push({x:px,z:pz,scale:1.1+(i%4)*.24});
                }
            }
            result.push({name:'AC_SECTOR_'+row+'_'+col,x:x,z:z,region:region,hills:hills,plants:plants});
        }
    }
    return result;
}

const ASH_NORTH = { start:765, stop:1863, water:-.50, halfWidth:12, periods:[893,1148,1679] };

function ashNorthRiverLine(x,index) {
    return ASH_NORTH.periods[index] +
        22*Math.sin(x*.013+index*1.3) + 11*Math.sin(x*.030+index*.7);
}

function ashNorthRiver(x,z) {
    return Math.min(...ASH_NORTH.periods.map(function (_,i) {
        return Math.abs(z-ashNorthRiverLine(x,i));
    }));
}

function ashNorthWater(ground) {
    return ground < ASH_NORTH.water + .03;
}

function ashNorthTerrain(x,z) {
    const edge=Math.max(0,Math.min(1,(z-765)/38));
    const rolling=1.7+2.6*Math.sin(x*.025+z*.013)+
        2.1*Math.sin(z*.033-x*.019)+1.2*Math.sin(x*.062+z*.052);
    const northRidges=(Math.max(0,z-1160)/337)*Math.max(0,Math.abs(x)-82)/190*
        (6+5*Math.sin(x*.037-z*.017));
    const far=Math.max(0,Math.min(1,(z-1497)/52));
    const rough=far*(2.7*Math.sin(x*.151+z*.096)+1.3*Math.sin(z*.202-x*.123)+
        4.4*Math.sin(z*.041+x*.031)*Math.sin(x*.061-z*.027));
    const spread=Math.max(0,Math.min(1,(ashWorldRoadDistance(x,z)-6)/19));
    const bank=ashNorthRiver(x,z);
    let height=-.055+edge*spread*(rolling+northRidges+rough);
    if (bank<ASH_NORTH.halfWidth) {
        const t=bank/ASH_NORTH.halfWidth;
        return -1.52+1.03*t*t;
    }
    if (bank<26) {
        const t=(bank-ASH_NORTH.halfWidth)/(26-ASH_NORTH.halfWidth);
        return -.49+(height+.49)*t*t*(3-2*t);
    }
    return height;
}

function ashNorthGround(x,z) {
    const ax=Math.floor((x+300)/4)*4-300,az=Math.floor((z-765)/3)*3+765;
    const u=(x-ax)/4,v=(z-az)/3;
    const h00=ashNorthTerrain(ax,az),h11=ashNorthTerrain(ax+4,az+3);
    if (u>=v) return h00+(ashNorthTerrain(ax+4,az)-h00)*u+(h11-ashNorthTerrain(ax+4,az))*v;
    return h00+(ashNorthTerrain(ax,az+3)-h00)*v+(h11-ashNorthTerrain(ax,az+3))*u;
}

function ashWorldGround(sectors,x,z,legacy) {
    if (z>=ASH_NORTH.start) {
        const land=ashNorthGround(x,z);
        return ashWorldRoadDistance(x,z)<=4.25 ? Math.max(land,.031) : land;
    }
    const inOld=Math.abs(x)<=61&&z>=-58.5&&z<=166.5;
    let h=inOld?legacy:-.055;
    if (ashWorldRoadDistance(x,z)<=4.25) h=Math.max(h,.031);
    const col=Math.min(5,Math.max(0,Math.floor((x+300)/100)));
    const row=Math.min(4,Math.max(0,Math.floor((z+150)/183)));
    for (let r=Math.max(0,row-1);r<=Math.min(4,row+1);r++) {
        for (let c=Math.max(0,col-1);c<=Math.min(5,col+1);c++) {
            sectors[r*6+c].hills.forEach(function (hill) {
                const t=Math.hypot(x-hill.x,z-hill.z)/hill.radius;
                if (t<1) h=Math.max(h,-.055+hill.height*(1-t));
            });
        }
    }
    return h;
}

const AshWorldData = { bounds:ASH_WORLD_BOUNDS, segments:ASH_WORLD_SEGMENTS, regions:ASH_WORLD_REGIONS,
    sectors:ashWorldSectors, ground:ashWorldGround, region:ashWorldRegion, north:ASH_NORTH, northTerrain:ashNorthTerrain, northGround:ashNorthGround, riverLine:ashNorthRiverLine, roadDistance:ashWorldRoadDistance };
if (typeof module !== 'undefined' && module.exports) module.exports = AshWorldData;

if (typeof pc !== 'undefined') {
    var AshWorld = pc.createScript('ashWorld');

    AshWorld.prototype.initialize = function () {
        this.world=this.app.root.findByName('ASH_WORLD_EXPANSION');
        if (!this.world) return;
        this.sectors=ashWorldSectors();
        this.tiles=this.sectors.map(function (sector) {
            const entity=this.world.findByName(sector.name);
            return entity&&entity.findByName('Sector detail');
        },this);
        const drive=this.entity.script.acHeavyDrive;
        const systems=this.entity.script.borSystems;
        this.world.findByName('World blockers').children.forEach(function (child) {
            const p=child.getPosition(),s=child.getLocalScale();
            drive.obstacles.push([p.x,p.z,s.x/2,s.z/2]);
            systems.impactBoxes.push(new pc.BoundingBox(new pc.Vec3(p.x,s.y/2,p.z),
                new pc.Vec3(s.x/2,s.y/2,s.z/2)));
        });
        this.label=document.createElement('div');
        this.label.style.cssText='position:fixed;left:14px;top:14px;z-index:20;padding:5px 9px;color:#f2dfb7;background:#23221bef;border:1px solid #987d50;font:13px ui-monospace';
        document.body.append(this.label);
        this.ready=true;
        this.clock=0;
        this.on('destroy',function () { this.label.remove(); },this);
        this.refresh();
    };

    AshWorld.prototype.contains = function (x,z) {
        if (z>=ASH_NORTH.start && ashNorthWater(ashNorthGround(x,z)) && ashWorldRoadDistance(x,z)>2.35) return false;
        return x>=ASH_WORLD_BOUNDS.minX+3&&x<=ASH_WORLD_BOUNDS.maxX-3&&
            z>=ASH_WORLD_BOUNDS.minZ+3&&z<=ASH_WORLD_BOUNDS.maxZ-3;
    };

    AshWorld.prototype.surface = function (x,z,legacy) {
        return ashWorldGround(this.sectors,x,z,legacy);
    };

    AshWorld.prototype.refresh = function () {
        const p=this.entity.getPosition();
        this.tiles.forEach(function (tile,i) {
            if (!tile) return;
            const s=this.sectors[i];
            const dx=Math.max(0,Math.abs(p.x-s.x)-50);
            const dz=Math.max(0,Math.abs(p.z-s.z)-91.5);
            tile.enabled=dx*dx+dz*dz<145*145;
        },this);
        const region=ASH_WORLD_REGIONS[ashWorldRegion(p.x,p.z)];
        const text=region+' · '+Math.round(p.x)+' / '+Math.round(p.z);
        if (this.label.textContent!==text) this.label.textContent=text;
    };

    AshWorld.prototype.update = function (dt) {
        if (!this.ready) return;
        this.clock+=dt;
        if (this.clock<.35) return;
        this.clock=0;
        this.refresh();
    };
}



