// ASH CONVOY — mass-aware tracked vehicle controller.
// Engine-agnostic fixed timestep dynamics; bind resulting pose to PlayCanvas entity.
// Axes: X/Z plane; heading in radians. W forward, S reverse, A left, D right.

export function createTankMotion(opts={}) {
  return { x:opts.x??0,z:opts.z??0,heading:opts.heading??0,
           forwardSpeed:0,yawSpeed:0,ground:"soil",massTonnes:opts.massTonnes??50,
           horsepower:opts.horsepower??650 };
}

const SURFACE={
  asphalt:{rolling:0.014,grip:1.0},
  soil:{rolling:0.03,grip:0.82},
  mud:{rolling:0.11,grip:0.42},
  sand:{rolling:0.095,grip:0.54},
  forest:{rolling:0.06,grip:0.66}
};

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const decay=(value,target,speed,dt)=>target+(value-target)*Math.exp(-speed*dt);

export function stepTankMotion(t, controls, dt) {
  dt=clamp(dt,0,1/30);
  const terrain=SURFACE[t.ground]??SURFACE.soil;
  const massKg=Math.max(8000,t.massTonnes*1000);
  const powerW=Math.max(50,t.horsepower)*745.7;
  const throttle=clamp((controls.forward??0)-(controls.reverse??0),-1,1);
  const steering=clamp((controls.right??0)-(controls.left??0),-1,1);
  const brake=Boolean(controls.brake);
  const speed=t.forwardSpeed;

  // Soft traction + effective mass: very heavy tanks build speed slowly.
  const tractionLimit=terrain.grip*9.81*massKg*0.53;
  const availableForce=clamp(powerW/Math.max(2.8,Math.abs(speed)+3),0,tractionLimit);
  const rollingForce=terrain.rolling*massKg*9.81;
  const aeroDrag=0.8*speed*Math.abs(speed);
  let acceleration=(availableForce*throttle-rollingForce*Math.sign(speed)-aeroDrag)/massKg;
  if(Math.abs(speed)<0.06 && !throttle) acceleration=0;
  t.forwardSpeed=clamp(speed+acceleration*dt,-4.8,13);
  if(brake) t.forwardSpeed=decay(t.forwardSpeed,0,5.4*terrain.grip,dt);
  if(!throttle && Math.abs(t.forwardSpeed)<0.1) t.forwardSpeed=0;

  const massRatio=clamp(50/t.massTonnes,0.46,1.6);
  const targetYaw=steering*(Math.abs(t.forwardSpeed)>0.6?0.23:0.42)*terrain.grip*massRatio;
  const yawResponse=(1.1*terrain.grip*massRatio);
  t.yawSpeed=decay(t.yawSpeed,targetYaw,yawResponse,dt);
  t.heading+=t.yawSpeed*dt;
  t.x+=Math.sin(t.heading)*t.forwardSpeed*dt;
  t.z+=Math.cos(t.heading)*t.forwardSpeed*dt;
  return t;
}
