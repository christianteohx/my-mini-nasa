(() => {
 const mode=new URLSearchParams(location.search).get('preview');
 if(!location.hostname.endsWith('.my-mini-nasa.pages.dev')||!['cargo-guide','cargo-guide-locked'].includes(mode))return;
 const R=window.SpaceportRules;R.loadState=()=>{
 const s=R.createState(1);Object.values(s.facilities).forEach(f=>f.unlocked=true);
 s.missionIndex=1;s.wallet=500;s.upgrades.carry=2;
 s.inventory={data:0,fuel:0,part:0,paper:0,crew:0,primePart:0,prizePaper:0,eliteCrew:0};
 s.runner.shelf={fuel:2,part:1,paper:1,crew:1,primePart:2,prizePaper:1,eliteCrew:0};s.facilities.cargo.output=8;
 if(mode==='cargo-guide')s.recipes.m2='purchase';return s;};
 R.saveState=()=>true;
 document.getElementById('splash-title').textContent='Cargo guidance';
 document.getElementById('splash-start').textContent='Try cargo shelf';
 document.getElementById('save-status').textContent='PREVIEW · REFRESH TO RESET';
})();
