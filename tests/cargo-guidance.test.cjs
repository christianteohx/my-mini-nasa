const {test}=require('node:test'),assert=require('node:assert/strict');
require('../rules.js');const R=globalThis.SpaceportRules;
test('locked plan uses public minima without fuel recipe or ready claim',()=>{
 const s=R.createState(1);s.missionIndex=1;const before=JSON.stringify(s),g=R.getCargoGuidance(s);
 assert.equal(g.known,false);assert.equal(g.needs.fuel,null);assert.equal(g.remaining.fuel,null);
 assert.deepEqual(g.needs,{fuel:null,part:2,paper:1,crew:0});assert.equal(g.ready,false);assert.equal(JSON.stringify(s),before);
});
test('specials in bag and rocket satisfy ordinary needs without double counting',()=>{
 const s=R.createState(1);s.missionIndex=1;s.inventory.primePart=1;s.specialLoadout.primePart=1;s.inventory.prizePaper=1;
 const g=R.getCargoGuidance(s);assert.equal(g.remaining.part,0);assert.equal(g.remaining.paper,0);
});
test('known plan subtracts loaded and carried supplies and never counts shelf as packed',()=>{
 const s=R.createState(1);s.recipes.m1='purchase';const g=R.getCargoGuidance(s);
 assert.deepEqual(g.needs,R.getRecipe(s).ingredients);s.runner.shelf.part=4;
 assert.equal(R.getCargoGuidance(s).remaining.part,g.remaining.part);
 Object.assign(s.inventory,g.needs);assert.equal(R.getCargoGuidance(s).ready,true);
 s.inventory.part=0;s.inventory.primePart=g.needs.part;assert.equal(R.getCargoGuidance(s).remaining.part,0);
});
test('changing selected mission recalculates guidance; unavailable mission gives no requirements',()=>{
 const s=R.createState(1);assert.equal(R.getCargoGuidance(s).needs.paper,0);s.missionIndex=1;
 assert.equal(R.getCargoGuidance(s).needs.paper,1);s.missionIndex=999;assert.equal(R.getCargoGuidance(s).mission,null);
});
