const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
require('../rules.js');
const R=globalThis.SpaceportRules;
function node(){return {textContent:'',innerHTML:'',dataset:{},hidden:false};}
function harness(){
 const rows=new Map(),list=node(),header=node();
 Object.defineProperty(list,'innerHTML',{get(){return this.html||''},set(html){this.html=html;rows.clear();for(const [,id] of html.matchAll(/data-operation="([^"]+)"/g)){const input={value:'1',dataset:{},get valueAsNumber(){return Number(this.value)}};const detail=node(),match=node(),take=node(),store=node();rows.set(id,{dataset:{operation:id},querySelector(sel){if(sel==='input')return input;if(sel==='[data-action-detail]')return detail;if(sel==='[data-recommendation]')return match;return sel.includes('take:')?take:store;}});}}});
 list.hasAttribute=()=>Boolean(list.dataset.signature);list.querySelectorAll=()=>[...rows.values()];list.querySelector=sel=>rows.get(sel.match(/data-operation="([^"]+)"/)?.[1]);
 const stock=node(),bag=node(),empty=node(),close={focus(){}};
 const container={querySelector(sel){return ({'[data-cargo-guidance]':header,'[data-station-stock]':stock,'[data-station-bag]':bag,'[data-station-list]':list,'[data-station-empty]':empty,'[data-action="close"]':close})[sel]||null;}};
 const ctx={window:{SpaceportRules:R,NasaIcons:{svg:()=>''}},document:{activeElement:null}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../stations.js'),'utf8'),ctx);
 return {refresh:s=>ctx.window.SpaceportStations.refresh(container,s,'cargo'),rows,header};
}
function state(){const s=R.createState(1);s.facilities.cargo.unlocked=true;s.runner.shelf={fuel:3,part:3,paper:1,crew:0,primePart:1,prizePaper:0,eliteCrew:0};s.facilities.cargo.output=8;return s;}
test('cargo header hides locked fuel target and has concise recommendations',()=>{const s=state(),h=harness();h.refresh(s);assert.match(h.header.innerHTML,/Fuel · plan locked/);assert.match(h.header.innerHTML,/Mission minimum/);assert.doesNotMatch(h.header.innerHTML,/Fuel<\/span><b>/);assert.equal(h.rows.get('fuel').querySelector('[data-recommendation]').textContent,'Fuel · plan locked');assert.equal(h.rows.get('part').querySelector('[data-recommendation]').textContent,'Take 1');assert.equal([...h.rows.keys()][0],'part');});
test('cargo rows count special equivalents and default to useful take amount',()=>{const s=state(),h=harness();s.recipes.m1='flight';s.inventory.primePart=1;h.refresh(s);assert.equal(h.rows.get('part').querySelector('[data-recommendation]').textContent,'Ready');assert.equal(h.rows.get('primePart').querySelector('[data-recommendation]').textContent,'Ready');assert.equal(h.rows.get('fuel').querySelector('input').value,1);s.inventory.fuel=1;h.refresh(s);assert.match(h.header.innerHTML,/Supplies ready/);});
test('cargo bag-full guidance is honest and editing survives needed-first reorder',()=>{const s=state(),h=harness();s.recipes.m1='flight';h.refresh(s);const input=h.rows.get('paper').querySelector('input');input.dataset.edited='true';input.value='2';s.inventory.fuel=1;s.inventory.part=1;h.refresh(s);assert.equal(h.rows.get('paper').querySelector('input').value,'2');s.inventory.fuel=0;s.inventory.part=0;s.inventory.data=R.getRates(s).carry;h.refresh(s);assert.equal(h.rows.get('fuel').querySelector('[data-recommendation]').textContent,'Bag full');assert.equal(h.rows.get('fuel').querySelector('[data-value="take:fuel"]').disabled,true);});

test('new quantity input is valid before focus restoration',()=>{const source=fs.readFileSync(path.join(__dirname,'../stations.js'),'utf8');assert.match(source,/class="transfer-quantity"[^>]*value="1"/);});
