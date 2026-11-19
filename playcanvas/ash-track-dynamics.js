function ashTrackStep(previous, input, dt) {
    const grip=input.traction||{pull:1,brake:1,steer:1,roll:1,limit:1};
    const oldSteer=previous.steer||0;
    const steeringAxis=oldSteer+(input.steering-oldSteer)*(1-Math.exp(-dt*(input.steering?6.8:10.6)));
    const forwardRatio=Math.min(1,Math.abs(previous.speed)/9.7);
    const maximum=input.throttle<0?4:9.7;
    const turnGovernor=1-Math.abs(steeringAxis)*forwardRatio*(.21+.14*(1-grip.steer));
    const forward=input.throttle*maximum*grip.limit*turnGovernor;
    const steering=steeringAxis*(.97-.53*forwardRatio)*grip.steer;
    const weight=50000/input.mass;

    function step(speed,goal) {
        goal=Math.max(-4.8*grip.limit,Math.min(10.5*grip.limit,goal));
        const slowing=Math.abs(goal)<Math.abs(speed)||speed*goal<0;
        const rate=slowing?(input.throttle===0?8.8:6.2)*(.68+.32*grip.brake):2.05*grip.pull*weight/grip.roll;
        const delta=Math.max(-rate*dt,Math.min(rate*dt,goal-speed));
        const grade=Math.abs(goal)>.05||Math.abs(speed)>.1 ? input.grade*2.8*dt : 0;
        let next=speed+delta-grade;
        if (Math.abs(goal)<.04&&Math.abs(next)<.22) next=0;
        return next;
    }

    const left=step(previous.left,forward-steering);
    const right=step(previous.right,forward+steering);
    const speed=(left+right)*.5;
    const targetYaw=(right-left)/(input.gauge||3.55)*(.59+.41*grip.steer);
    const oldYaw=previous.yaw||0;
    const response=1-Math.exp(-dt*(input.steering?7.8:13.1));
    const yaw=Math.abs(targetYaw)<.005&&Math.abs(oldYaw)<.015?0:oldYaw+(targetYaw-oldYaw)*response;
    return {left:left,right:right,speed:speed,yaw:yaw,steer:steeringAxis};
}

if (typeof module !== 'undefined' && module.exports) module.exports=ashTrackStep;

if (typeof pc !== 'undefined') {
    var AshTrackDynamics=pc.createScript('ashTrackDynamics');

    AshTrackDynamics.prototype.initialize = function () {
        this.state={left:0,right:0,speed:0,yaw:0};
        this.ready=true;
    };

    AshTrackDynamics.prototype.reset = function () {
        this.state={left:0,right:0,speed:0,yaw:0};
    };

    AshTrackDynamics.prototype.integrate = function (input,dt) {
        this.state=ashTrackStep(this.state,input,dt);
        return this.state;
    };
}



