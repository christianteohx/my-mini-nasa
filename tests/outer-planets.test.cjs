const {test}=require('node:test');const assert=require('node:assert/strict');
require('../rules.js');const R=globalThis.SpaceportRules;
test('completed Solar save retains earned data, cosmetics and inventory and can unlock Jupiter',()=>{
 const s=R.createState(1);s.stageIndex=4;s.missionIndex=7;s.bestStars.m8=3;s.completed=true;s.wallet=3000;
 s.inventory.prizePaper=2;s.cosmetics={ship:'apollo'};
 const loaded=R.loadState({getItem:()=>JSON.stringify(s)});
 assert.equal(loaded.stageIndex,4);assert.equal(loaded.bestStars.m8,3);assert.equal(loaded.wallet,3000);
 assert.equal(loaded.inventory.prizePaper,2);assert.deepEqual(loaded.cosmetics,s.cosmetics);
 assert.equal(loaded.completed,false);assert.equal(R.getExpansion(loaded).stage.id,'jupiter');assert.equal(R.getExpansion(loaded).available,true);
 assert.equal(R.buyExpansion(loaded),true);assert.equal(loaded.wallet,200);assert.equal(R.selectMission(loaded,'m9'),true);
 assert.equal(R.selectMission(loaded,'m10'),false);assert.equal(R.getExpansion(loaded).available,false);
});
test('outer planet rewards accrue once and completion needs Blue Horizon',()=>{
 const s=R.createState(1);s.stageIndex=7;s.wallet=50000;const base=R.getRates(s).data;
 for(const [id,bonus] of [['m9',1],['m10',2],['m11',4]]){
  R.selectMission(s,id);s.loadout={...R.getRecipe(s).ingredients};s.rngSeed=1;
  const report=R.launch(s);assert.equal(report.stars,3);assert.equal(report.campaignCompleted,id==='m11');
  assert.equal(R.getRates(s).data,base+s.satellites.reduce((a,b)=>a+b.output,0)+bonus);
  s.report=null;s.loadout={...R.getRecipe(s).ingredients};s.rngSeed=1;
  const repeat=R.launch(s);assert.equal(repeat.firstClear,false);assert.equal(repeat.grant,0);s.report=null;
 }
 assert.equal(s.completed,true);const restored=R.loadState({getItem:()=>JSON.stringify(s)});assert.equal(restored.completed,true);
});
