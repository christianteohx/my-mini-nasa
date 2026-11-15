(() => {
  if (!location.hostname.endsWith('.my-mini-nasa.pages.dev') || new URLSearchParams(location.search).get('preview') !== 'station-controls') return;
  const R=window.SpaceportRules;
  R.loadState=()=>{
    const s=R.createState(1);Object.values(s.facilities).forEach(f=>f.unlocked=true);
    s.wallet=100;s.upgrades.carry=2;
    s.inventory={data:1,fuel:1,part:1,paper:1,crew:1,primePart:1,prizePaper:1,eliteCrew:1};
    s.runner.shelf={fuel:1,part:0,paper:1,crew:0,primePart:1,prizePaper:0,eliteCrew:1};s.facilities.cargo.output=4;
    return s;
  };
  R.saveState=()=>true;
  document.title='Station controls preview · My Mini NASA';
  document.getElementById('splash-title').textContent='Fuel, cargo & scrap';
  document.getElementById('splash-start').textContent='Test station controls';
  document.getElementById('save-status').textContent='PREVIEW · REFRESH TO RESET';
})();
