const {test}=require('node:test');const assert=require('node:assert/strict');
require('../rules.js');const R=globalThis.SpaceportRules;
test('legacy Solar save retains destination, completion, earned data, cosmetics and inventory',()=>{
 const s=R.createState(1);delete s.campaignOrder;s.stageIndex=4;s.missionIndex=7;s.bestStars.m8=3;s.completed=true;s.wallet=3000;
 s.inventory.prizePaper=2;s.cosmetics={ship:'apollo'};
 const loaded=R.loadState({getItem:()=>JSON.stringify(s)});
 assert.equal(R.getStage(loaded).id,'sun');assert.equal(R.MISSIONS[loaded.missionIndex].id,'m8');assert.equal(loaded.bestStars.m8,3);assert.equal(loaded.wallet,3000);
 assert.equal(loaded.inventory.prizePaper,2);assert.deepEqual(loaded.cosmetics,s.cosmetics);assert.equal(loaded.completed,true);
 assert.equal(R.isMissionAvailable(loaded,'m9'),true);assert.equal(R.getExpansion(loaded),null);
});
test('pre-Solar save enters Jupiter after Mars without awarding future missions',()=>{
 const s=R.createState(1);delete s.campaignOrder;s.stageIndex=3;s.missionIndex=6;s.bestStars.m7=3;s.wallet=3000;
 const loaded=R.loadState({getItem:()=>JSON.stringify(s)});
 assert.equal(R.getExpansion(loaded).stage.id,'jupiter');assert.equal(R.getExpansion(loaded).available,true);
 assert.equal(R.buyExpansion(loaded),true);assert.equal(loaded.wallet,200);assert.equal(R.selectMission(loaded,'m9'),true);
 assert.equal(R.selectMission(loaded,'m10'),false);assert.equal(R.isMissionAvailable(loaded,'m8'),false);
 assert.equal(R.getExpansion(loaded).available,false);
});
test('old outer-planet preview indices migrate by mission identity and keep Solar accessible',()=>{
 for(const [stageIndex,missionIndex,id] of [[5,8,'m9'],[6,9,'m10'],[7,10,'m11']]){
  const s=R.createState(1);delete s.campaignOrder;s.stageIndex=stageIndex;s.missionIndex=missionIndex;
  const loaded=R.loadState({getItem:()=>JSON.stringify(s)});
  assert.equal(R.MISSIONS[loaded.missionIndex].id,id);assert.equal(R.isMissionAvailable(loaded,'m8'),true);
  const twice=R.loadState({getItem:()=>JSON.stringify(loaded)});assert.equal(twice.missionIndex,loaded.missionIndex);
 }
});
test('outer planet rewards accrue once; Neptune unlocks Solar and only Solar finishes campaign',()=>{
 const s=R.createState(1);s.stageIndex=4;s.wallet=50000;const base=R.getRates(s).data;
 for(const [id,bonus,next] of [['m9',1,'saturn'],['m10',2,'neptune'],['m11',4,'sun']]){
  assert.equal(R.selectMission(s,id),true);s.loadout={...R.getRecipe(s).ingredients};s.rngSeed=1;
  const report=R.launch(s);assert.equal(report.stars,3);assert.equal(report.campaignCompleted,false);assert.equal(s.completed,false);
  assert.equal(R.getRates(s).data,base+s.satellites.reduce((a,b)=>a+b.output,0)+bonus);
  s.report=null;s.loadout={...R.getRecipe(s).ingredients};s.rngSeed=1;
  const repeat=R.launch(s);assert.equal(repeat.firstClear,false);assert.equal(repeat.grant,0);s.report=null;
  assert.equal(R.getExpansion(s).stage.id,next);assert.equal(R.buyExpansion(s),true);
 }
 assert.equal(R.selectMission(s,'m8'),true);s.loadout={...R.getRecipe(s).ingredients};s.rngSeed=1;
 assert.equal(R.launch(s).campaignCompleted,true);assert.equal(s.completed,true);
 const restored=R.loadState({getItem:()=>JSON.stringify(s)});assert.equal(restored.completed,true);assert.equal(R.getStage(restored).id,'sun');
});
