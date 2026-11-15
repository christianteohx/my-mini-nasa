const {test}=require('node:test');const assert=require('node:assert/strict');require('../rules.js');const R=globalThis.SpaceportRules;
function state(){const s=R.createState(1);for(const f of Object.values(s.facilities)) f.unlocked=true;return s;}
test('fuel batches respect cash, queue space and explicit quantity',()=>{
 const s=state();s.wallet=1000;s.facilities.fuel.input=8;
 assert.equal(R.interact(s,'fuel','input').count,2);assert.equal(s.wallet,970);assert.equal(R.interact(s,'fuel','input'),null);
 s.facilities.fuel.input=0;s.wallet=29;assert.equal(R.interact(s,'fuel','input').count,1);assert.equal(s.wallet,14);
 s.wallet=100;assert.equal(R.transferAtStation(s,'fuel','make:fuel',2).count,2);assert.equal(s.wallet,70);
});
test('fuel output stays bounded while queued orders remain intact',()=>{
 const s=state();s.wallet=150;R.interact(s,'fuel','both');for(let i=0;i<500;i++) R.tick(s,0.1);
 assert.equal(s.facilities.fuel.output,R.getFacilityOutputCapacity(s,'fuel'));
 assert.equal(s.facilities.fuel.output+s.facilities.fuel.input+Number(s.facilities.fuel.active),10);
});
test('cargo selected transfers round trip special identities and exact quantities',()=>{
 for(const item of ['fuel','part','paper','crew',...R.SPECIAL_ITEMS]) {
 const s=state();s.inventory[item]=3;
 assert.equal(R.transferAtStation(s,'cargo','store:'+item,2).count,2);assert.equal(s.inventory[item],1);
 assert.equal(s.runner.shelf[item],2);assert.equal(s.facilities.cargo.output,2);
 assert.equal(R.transferAtStation(s,'cargo','take:'+item,1).count,1);assert.equal(s.inventory[item],2);assert.equal(s.runner.shelf[item],1);
 assert.equal(R.transferAtStation(s,'cargo','take:'+item,9),null);
 }
});
test('cargo shares normal/special type cap and reserves all in-flight units',()=>{
 const s=state();s.runner.shelf.part=2;s.facilities.cargo.output=2;s.runner.cargo='part';s.runner.cargoCount=1;
 s.inventory.primePart=2;assert.equal(R.transferAtStation(s,'cargo','store:primePart',2),null);
 assert.equal(R.transferAtStation(s,'cargo','store:primePart',1).count,1);
 assert.equal(R.getStationActions(s,'cargo').find(a=>a.id==='store:part').max,0);
});
test('cargo full bag and total shelf limit reject transfers without changing items',()=>{
 const s=state();s.inventory.prizePaper=4;s.runner.shelf.fuel=4;s.runner.shelf.part=4;s.facilities.cargo.output=8;
 assert.equal(R.transferAtStation(s,'cargo','store:prizePaper',1),null);assert.equal(R.transferAtStation(s,'cargo','take:fuel',1),null);
 assert.equal(s.inventory.prizePaper,4);assert.equal(s.facilities.cargo.output,8);
});
test('scrap all empties mixed bag only and repeated calls are harmless',()=>{
 const s=state();for(const item of Object.keys(s.inventory))s.inventory[item]=1;
 s.loadout.part=2;s.specialLoadout.primePart=1;s.runner.shelf.prizePaper=1;s.facilities.cargo.output=1;
 const result=R.scrapAll(s);assert.equal(result.events.length,8);assert.equal(R.getInventoryCount(s),0);assert.equal(R.scrapAll(s),null);
 assert.equal(s.loadout.part,2);assert.equal(s.specialLoadout.primePart,1);assert.equal(s.runner.shelf.prizePaper,1);
});
test('legacy saves gain empty special shelf keys and new shelves round trip',()=>{
 const s=state();delete s.runner.shelf.prizePaper;const storage={v:JSON.stringify(s),getItem(){return this.v},setItem(k,v){this.v=v}};
 const loaded=R.loadState(storage);assert.equal(loaded.runner.shelf.prizePaper,0);loaded.runner.shelf.prizePaper=2;loaded.facilities.cargo.output=2;
 R.saveState(loaded,storage);assert.equal(R.loadState(storage).runner.shelf.prizePaper,2);
});
