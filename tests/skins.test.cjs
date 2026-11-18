const {test} = require('node:test');
const assert = require('node:assert/strict');
require('../skins.js');require('../rules.js');
const S=globalThis.SpaceportSkins, R=globalThis.SpaceportRules;
const earned={bestStars:{m4:3,m5:3}};
test('old saves and invalid cosmetics safely use Classic',()=>{
 assert.deepEqual(S.normalize(null),S.normalize({ship:'unknown',crew:{player:'<script>',runner:null}}));
 assert.equal(S.normalize({ship:'apollo',crew:{intern:'armstrong'}},earned).crew.intern,'armstrong');
 assert.equal(S.normalize({ship:'apollo',crew:{intern:'armstrong'}},R.createState()).crew.intern,'classic');
});
test('roles and ship select independently without mutating the old selection',()=>{
 const original=S.normalize();const one=S.select(original,'ship','artemis',earned);const two=S.select(one,'runner','ride',earned);
 assert.equal(original.ship,'classic');assert.equal(two.ship,'artemis');assert.equal(two.crew.runner,'ride');assert.equal(two.crew.intern,'classic');
 assert.deepEqual(S.select(two,'__proto__','armstrong',earned),two);assert.deepEqual(S.select(two,'ship','missing',earned),two);
});
test('cosmetics round trip through game save without changing game mechanics',()=>{
 const base=R.createState(42);base.bestStars={...earned.bestStars};const customized=structuredClone(base);customized.cosmetics=S.select(S.select(null,'ship','apollo',earned),'player','armstrong',earned);
 R.tick(base,10);R.tick(customized,10);
 const {cosmetics,...rest}=customized;assert.deepEqual(rest,base);
 let raw;const storage={setItem:(key,val)=>{raw=val},getItem:()=>raw};assert.equal(R.saveState(customized,storage),true);
 const loaded=R.loadState(storage);assert.deepEqual(S.normalize(loaded.cosmetics,loaded),cosmetics);
});
test('rocket variants draw without modifying state and Classic uses existing renderer',()=>{
 let count=0;const ctx=new Proxy({}, {get:()=>()=>{count++},set:()=>true});
 assert.equal(S.rocket(ctx,'classic'),false);assert.equal(S.rocket(ctx,'bad'),false);
 for(const ship of ['apollo','artemis']) assert.equal(S.rocket(ctx,ship),true);assert.ok(count>20);
});
test('unlock thresholds use existing mission best stars, not attempts or expansion purchases',()=>{
 const state=R.createState(42);state.stageIndex=4;state.stats.attempts=100;
 for(const group of ['ship','crew']) assert.equal(S.unlocked(state,group,'classic'),true);
 assert.equal(S.unlocked(state,'ship','apollo'),false);assert.equal(S.unlocked(state,'crew','ride'),false);
 state.bestStars.m5=0;assert.equal(S.unlocked(state,'ship','apollo'),false);
 state.bestStars.m5=1;assert.equal(S.unlocked(state,'ship','apollo'),true);
 assert.equal(S.unlocked(state,'ship','artemis'),false);assert.equal(S.unlocked(state,'crew','armstrong'),false);
 state.bestStars.m5=2;assert.equal(S.unlocked(state,'ship','artemis'),false);
 state.bestStars.m5=3;assert.equal(S.unlocked(state,'ship','artemis'),true);assert.equal(S.unlocked(state,'crew','armstrong'),true);
 state.bestStars.m4=2;assert.equal(S.unlocked(state,'crew','ride'),false);
 state.bestStars.m4=3;assert.equal(S.unlocked(state,'crew','ride'),true);
});
test('locked selections are rejected and old mission saves receive earned skins automatically',()=>{
 assert.equal(S.select(null,'ship','artemis',R.createState()).ship,'classic');
 assert.equal(S.select(null,'runner','armstrong',R.createState()).crew.runner,'classic');
 const old=R.createState(42);delete old.bestStars;old.satellites=[{missionId:'m5',stars:3,output:1},{missionId:'m4',stars:3,output:1}];
 const loaded=R.loadState({getItem:()=>JSON.stringify(old)});
 assert.equal(S.unlocked(loaded,'ship','artemis'),true);assert.equal(S.unlocked(loaded,'crew','ride'),true);
 const chosen=S.select(null,'ship','artemis',loaded);assert.equal(chosen.ship,'artemis');
 loaded.bestStars.m5=Math.max(loaded.bestStars.m5,0);assert.equal(S.normalize(chosen,loaded).ship,'artemis');
});
test('actual Lunar Orbiter 1 flight awards unlocks and failed replay cannot revoke them',()=>{
 const state=R.createState(1);state.stageIndex=2;state.wallet=10000;
 assert.equal(R.selectMission(state,'m5'),true);state.loadout={fuel:3,part:3,paper:2,crew:0};
 assert.equal(S.unlocked(state,'ship','apollo'),false);
 const report=R.launch(state);assert.equal(report.stars,3);
 assert.equal(S.unlocked(state,'ship','apollo'),true);assert.equal(S.unlocked(state,'ship','artemis'),true);
 assert.equal(S.unlocked(state,'crew','armstrong'),true);
 state.cosmetics=S.select(null,'ship','artemis',state);state.report=null;
 state.loadout={fuel:1,part:1,paper:0,crew:0};state.rngSeed=0xffffffff;R.launch(state);
 assert.equal(S.normalize(state.cosmetics,state).ship,'artemis');
});

test('each skin has a concise introduction, independent of unlocking or selection',()=>{
 const before=JSON.stringify(S.normalize());
 for(const skin of [...S.ships,...S.suits]) {assert.equal(typeof skin.intro,'string');assert.ok(skin.intro.length>20&&skin.intro.length<150);}
 assert.equal(JSON.stringify(S.normalize()),before);
});
test('every skin links to an official NASA educational page without tracking',()=>{
 for(const skin of [...S.ships,...S.suits]){const url=new URL(skin.learnUrl);assert.equal(url.protocol,'https:');assert.ok(['www.nasa.gov','science.nasa.gov'].includes(url.hostname));assert.equal(url.search,'');}
});
