const {test} = require('node:test');
const assert = require('node:assert/strict');
require('../skins.js');require('../rules.js');
const S=globalThis.SpaceportSkins, R=globalThis.SpaceportRules;
test('old saves and invalid cosmetics safely use Classic',()=>{
 assert.deepEqual(S.normalize(null),S.normalize({ship:'unknown',crew:{player:'<script>',runner:null}}));
 assert.equal(S.normalize({ship:'apollo',crew:{intern:'armstrong'}}).crew.intern,'armstrong');
});
test('roles and ship select independently without mutating the old selection',()=>{
 const original=S.normalize();const one=S.select(original,'ship','artemis');const two=S.select(one,'runner','ride');
 assert.equal(original.ship,'classic');assert.equal(two.ship,'artemis');assert.equal(two.crew.runner,'ride');assert.equal(two.crew.intern,'classic');
 assert.deepEqual(S.select(two,'__proto__','armstrong'),two);assert.deepEqual(S.select(two,'ship','missing'),two);
});
test('cosmetics round trip through game save without changing game mechanics',()=>{
 const base=R.createState(42);const customized=R.createState(42);customized.cosmetics=S.select(S.select(null,'ship','apollo'),'player','armstrong');
 R.tick(base,10);R.tick(customized,10);
 const {cosmetics,...rest}=customized;assert.deepEqual(rest,base);
 let raw;const storage={setItem:(key,val)=>{raw=val},getItem:()=>raw};assert.equal(R.saveState(customized,storage),true);
 assert.deepEqual(S.normalize(R.loadState(storage).cosmetics),cosmetics);
});
test('rocket variants draw without modifying state and Classic uses existing renderer',()=>{
 let count=0;const ctx=new Proxy({}, {get:()=>()=>{count++},set:()=>true});
 assert.equal(S.rocket(ctx,'classic'),false);assert.equal(S.rocket(ctx,'bad'),false);
 for(const ship of ['apollo','artemis']) assert.equal(S.rocket(ctx,ship),true);assert.ok(count>20);
});
