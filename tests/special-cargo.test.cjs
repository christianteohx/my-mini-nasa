const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../rules.js');
const R = globalThis.SpaceportRules;
function setup() {
  const s = R.createState(7);
  Object.values(s.facilities).forEach(f => { f.unlocked = true; f.output = 0; });
  s.upgrades.runner = 1;
  return s;
}
test('runner clears special-only factory shelf and production resumes', () => {
  const s = setup(); s.facilities.engineering.special = 6; s.facilities.engineering.input = 4;
  for(let i=0;i<600;i++) R.tick(s,0.1);
  assert.ok(s.runner.shelf.primePart > 0);
  assert.ok(s.facilities.engineering.special < 6);
  assert.ok(s.facilities.engineering.input < 4);
  assert.equal(s.runner.shelf.part, 0);
});
test('special cargo remains special after delivery and pickup', () => {
  for(const [factory,item] of Object.entries(R.SPECIALS)) {
    const s = setup(); s.facilities[factory].special = 1;
    R.tick(s,1.35); assert.equal(s.runner.cargo,item);
    R.tick(s,1.35); assert.equal(s.runner.shelf[item],1);
    assert.equal(R.collectCargo(s,item,1).item,item);
    assert.equal(s.inventory[item],1); assert.equal(s.facilities.cargo.output,0);
  }
});
test('ordinary and special cargo share per-type capacity, including in-flight reservations', () => {
  const s = setup(); s.upgrades.runnerCarry=1; s.facilities.engineering.special=3;
  s.runner.shelf.part=2; s.facilities.cargo.output=2;
  R.tick(s,1.35); assert.equal(s.runner.cargoCount,2);
  s.inventory.part=2; s.inventory.primePart=2;
  for(const item of ['part','primePart']) assert.equal(R.getStationActions(s,'cargo').find(a=>a.id==='store:'+item).max,0);
  R.tick(s,1.35); assert.equal(s.runner.shelf.primePart,2); assert.equal(s.runner.shelf.part,2);
  R.tick(s,1.35); assert.equal(s.runner.cargo,null);
});
test('specials in bag or loadout satisfy exact mission guidance', () => {
  for(const where of ['inventory','specialLoadout']) {
    const s=setup(); s.recipes.m1='flight'; s.loadout.fuel=1; s[where].primePart=1;
    s.runner.shelf.part=1; s.facilities.cargo.output=1;
    assert.equal(R.getShelfItem(s),null); assert.equal(R.collectCargo(s),null);
  }
});
test('automatic cargo pickup prefers equivalent special and does not take extra ordinary supply', () => {
  const s=setup(); s.recipes.m1='flight'; s.loadout.fuel=1;
  s.runner.shelf.primePart=1; s.runner.shelf.part=1; s.facilities.cargo.output=2;
  assert.equal(R.collectCargo(s).item,'primePart');
  assert.equal(R.collectCargo(s),null); assert.equal(s.runner.shelf.part,1);
});
test('legacy save gets empty special shelf keys; new saves retain special cargo and loadout', () => {
  const s=setup(); delete s.runner.shelf.primePart; delete s.runner.shelf.prizePaper; delete s.runner.shelf.eliteCrew;
  const storage={value:JSON.stringify(s),getItem(){return this.value},setItem(k,v){this.value=v}};
  const restored=R.loadState(storage); assert.equal(restored.runner.shelf.primePart,0);
  restored.runner.shelf.prizePaper=2; restored.facilities.cargo.output=2; restored.specialLoadout.primePart=1;
  R.saveState(restored,storage); const again=R.loadState(storage);
  assert.equal(again.runner.shelf.prizePaper,2); assert.equal(again.specialLoadout.primePart,1);
});
test('special pickup respects full bag; stock remains intact', () => {
  const s=setup(); s.inventory.data=R.getRates(s).carry; s.runner.shelf.prizePaper=1; s.facilities.cargo.output=1;
  assert.equal(R.collectCargo(s,'prizePaper',1),null); assert.equal(s.runner.shelf.prizePaper,1);
});
