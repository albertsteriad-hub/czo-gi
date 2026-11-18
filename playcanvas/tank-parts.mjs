// ASH CONVOY — modular tank data & visual swapping.
// PlayCanvas ESM script. In the editor attach this to the Tank root entity.
// Each named slot should contain separate child entities for each variant.
// The active variant is enabled; remaining variants are disabled.

export const PARTS = Object.freeze({
  hull: [{id:"standard",tonnes:23},{id:"wide",tonnes:30},{id:"heavy",tonnes:39}],
  turret: [{id:"standard",tonnes:9},{id:"low",tonnes:7},{id:"assault",tonnes:16}],
  gun: [{id:"75mm",tonnes:2.4},{id:"88mm",tonnes:4.8},{id:"105mm",tonnes:7.2}],
  tracks: [{id:"standard",tonnes:8},{id:"wide",tonnes:11},{id:"reinforced",tonnes:14}],
  armor: [{id:"basic",tonnes:2},{id:"spaced",tonnes:5},{id:"heavy",tonnes:10}],
  engine: [{id:"diesel-v12",tonnes:3.3,hp:650},{id:"diesel-v16",tonnes:4.6,hp:870},{id:"diesel-heavy",tonnes:6.1,hp:1100}],
  fuel: [{id:"internal",tonnes:0.5},{id:"auxiliary",tonnes:1.4},{id:"extended",tonnes:2.4}],
  plow: [{id:"none",tonnes:0},{id:"light",tonnes:1.8},{id:"heavy",tonnes:4.2}],
  sidegear: [{id:"none",tonnes:0},{id:"storage",tonnes:0.8},{id:"field-repair",tonnes:1.5}],
  optics: [{id:"basic",tonnes:0.1},{id:"scout",tonnes:0.3},{id:"commander",tonnes:0.6}],
  markings: [{id:"plain",tonnes:0},{id:"hazard",tonnes:0},{id:"salvager",tonnes:0}]
});

export const DEFAULT_BUILD = Object.freeze(Object.fromEntries(Object.entries(PARTS).map(([key,variants])=>[key,variants[0].id])));

function findPart(slot,id) {
  const item = PARTS[slot]?.find(v=>v.id===id);
  if (!item) throw new Error(`Invalid tank module: ${slot}/${id}`);
  return item;
}

export function getTankStats(build) {
  let tonnes=0, hp=0;
  for (const [slot,id] of Object.entries({...DEFAULT_BUILD,...build})) {
    const part=findPart(slot,id);
    tonnes+=part.tonnes;
    if(part.hp) hp+=part.hp;
  }
  return {tonnes:Math.round(tonnes*10)/10,hp,hpPerTonne:Math.round(hp/tonnes*10)/10};
}

export function applyTankBuild(tankRoot, build) {
  // Expected hierarchy: Tank / Modules / hull / heavy (and siblings).
  const modules=tankRoot.findByName("Modules");
  if (!modules) throw new Error("Tank scene is missing entity named Modules");
  const selected={...DEFAULT_BUILD,...build};
  for (const [slot,id] of Object.entries(selected)) {
    findPart(slot,id);
    const slotNode=modules.children.find(c=>c.name===slot);
    if(!slotNode) throw new Error(`Missing module slot: ${slot}`);
    const available=slotNode.children;
    if(!available.some(c=>c.name===id)) throw new Error(`Missing 3D mesh variant: ${slot}/${id}`);
    for(const child of available) child.enabled=child.name===id;
  }
  return getTankStats(selected);
}

// The editor scene can import these functions into its own script.
// No meshes are generated here: variants must be real GLB models or editor entities.
