function ashTrackStep(previous, input, dt) {
    const grip=input.traction||{pull:1,brake:1,steer:1,roll:1,limit:1};
    const maximum=input.throttle<0?4:9.7;
    const forward=input.throttle*maximum*grip.limit;
    const steering=input.steering*(1.26-.045*Math.min(10,Math.abs(previous.speed)))*grip.steer;
    const weight=50000/input.mass;

    function step(speed,goal) {
        goal=Math.max(-4.8*grip.limit,Math.min(10.5*grip.limit,goal));
        const slowing=Math.abs(goal)<Math.abs(speed)||speed*goal<0;
        const rate=slowing?3.9*grip.brake:2.05*grip.pull*weight/grip.roll;
        const delta=Math.max(-rate*dt,Math.min(rate*dt,goal-speed));
        const grade=Math.abs(goal)>.05||Math.abs(speed)>.1 ? input.grade*2.8*dt : 0;
        let next=speed+delta-grade;
        if (Math.abs(goal)<.04&&Math.abs(next)<.14) next=0;
        return next;
    }

    const left=step(previous.left,forward-steering);
    const right=step(previous.right,forward+steering);
    const speed=(left+right)*.5;
    const yaw=(right-left)/3.55*(.63+.37*grip.steer);
    return {left:left,right:right,speed:speed,yaw:yaw};
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

