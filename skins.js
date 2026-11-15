(() => {
  'use strict';
  // Original illustrated tributes, not official spacecraft art or astronaut likenesses.
  const ships = [
    {id:'classic', name:'Classic', detail:'Spaceport original', learnUrl:'https://www.nasa.gov/space-launch-system-sls/', intro:'The original Spaceport rocket. Your familiar launch-day look.'},
    {id:'apollo', name:'Apollo', detail:'Saturn V inspired', learnUrl:'https://science.nasa.gov/resource/apollo-11-launch/', intro:'Inspired by Saturn V, the rocket that launched Apollo crews toward the Moon.', mission:'m5', stars:1, requirement:'Reach lunar orbit · Lunar Relay'},
    {id:'artemis', name:'Artemis', detail:'SLS inspired', learnUrl:'https://www.nasa.gov/space-launch-system-sls/', intro:'Inspired by NASA’s Space Launch System, built to send Orion on Artemis missions to the Moon.', mission:'m5', stars:3, requirement:'3-star Lunar Relay'},
  ];
  const suits = [
    {id:'classic', name:'Classic', detail:'Your role colors', learnUrl:'https://www.nasa.gov/humans-in-space/astronauts/', intro:'The original crew suits. Each role keeps its own color.'},
    {id:'armstrong', name:'Armstrong', detail:'Apollo moonwalk suit', learnUrl:'https://www.nasa.gov/humans-in-space/astronauts/former-astronauts/former-astronaut-neil-a-armstrong/', intro:'A tribute to Neil Armstrong, the first person to walk on the Moon during Apollo 11 in 1969.', mission:'m5', stars:3, requirement:'3-star Lunar Relay', accent:'#f3eee2', dark:'#aaaeb8', visor:'#a87524', shine:'#ffe1a0', outline:'#35465d'},
    {id:'ride', name:'Ride', detail:'Shuttle flight suit', learnUrl:'https://www.nasa.gov/former-astronaut-sally-ride/', intro:'A tribute to Sally Ride, the first American woman in space. She flew aboard Challenger in 1983.', mission:'m4', stars:3, requirement:'3-star Station Science', accent:'#5093d8', dark:'#235b98', visor:'#28465c', shine:'#bedaf1', outline:'#253e62'},
  ];
  const roles = {player:'You', intern:'Grant intern', runner:'Cargo runner', materials:'Materials intern', clerk:'Credit clerk'};
  function unlocked(state, group, id) {
    const skin = (group === 'ship' ? ships : suits).find(s => s.id === id);
    return Boolean(skin && (!skin.mission || Number(state?.bestStars?.[skin.mission] || 0) >= skin.stars));
  }
  function normalize(value, state) {
    const valid = (list, id) => list.some(skin => skin.id === id) && unlocked(state, list === ships ? 'ship' : 'crew', id) ? id : 'classic';
    return {ship:valid(ships, value?.ship), crew:Object.fromEntries(Object.keys(roles).map(role => [role,valid(suits, value?.crew?.[role])]))};
  }
  function select(value, target, id, state) {
    const next = normalize(value, state);
    if (target === 'ship' && unlocked(state, 'ship', id)) next.ship = id;
    else if (Object.hasOwn(roles, target) && unlocked(state, 'crew', id)) next.crew[target] = id;
    return next;
  }
  function suit(id, fallback) { return suits.find(s => s.id === id && s.id !== 'classic') || fallback; }
  // Both the selector and the launch pad use this drawing. Coordinates are yard units.
  function rocket(ctx, id) {
    if (!ships.some(s => s.id === id) || id === 'classic') return false;
    const ink = '#2b2350';
    const path = (fill, points) => { ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=ink; ctx.lineWidth=1.5; ctx.stroke(); };
    const rect = (x,y,w,h,fill,r=1) => {ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.4;ctx.stroke();};
    if (id === 'apollo') {
      path('#eef0eb',[[-16,-9],[-16,-77],[-10,-92],[-10,-112],[0,-132],[10,-112],[10,-92],[16,-77],[16,-9]]);
      rect(-16,-32,32,17,'#303847'); rect(-16,-79,32,10,'#303847');
      rect(-10,-111,20,9,'#303847');
      for(const x of [-12,-4,4]) rect(x,-65,4,22,'#303847');
      path('#cad2dc',[[-16,-23],[-25,-6],[-13,-9]]);path('#cad2dc',[[16,-23],[25,-6],[13,-9]]);
      rect(-12,-9,9,7,'#626b7b');rect(3,-9,9,7,'#626b7b');
      ctx.fillStyle='#ffffffaa';ctx.fillRect(-12,-68,3,32);
      ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-132);ctx.lineTo(0,-144);ctx.stroke();
    } else {
      rect(-14,-103,28,94,'#cb7441',5);
      path('#dce2e8',[[-14,-103],[0,-119],[14,-103]]);
      path('#f3f0e4',[[-8,-119],[0,-133],[8,-119]]);
      for(const x of [-26,16]) {
        rect(x,-82,10,74,'#f5f1e8',3);
        path('#f5f1e8',[[x,-82],[x+5,-95],[x+10,-82]]);
        rect(x,-32,10,6,'#3f4856');rect(x,-66,10,5,'#3f4856');
        rect(x+1,-8,8,7,'#626b7b');
      }
      rect(-10,-9,8,7,'#626b7b');rect(2,-9,8,7,'#626b7b');
      ctx.fillStyle='#f5ac70';ctx.fillRect(-10,-96,3,65);
      rect(-13,-64,26,4,'#9d5435');
    }
    return true;
  }
  globalThis.SpaceportSkins = Object.freeze({ships,suits,roles,unlocked,normalize,select,suit,rocket});
})();

