(() => {
  // Branch-only demo: no reads or writes to saved progress.
  const params = new URLSearchParams(location.search);
  if (!location.hostname.endsWith('.my-mini-nasa.pages.dev') || params.get('preview') !== 'outer-planets') return;
  const R = window.SpaceportRules;
  const id = ['m9','m10','m11'].includes(params.get('mission')) ? params.get('mission') : 'm9';
  const seed = () => {
    const state = R.createState(1);
    state.stageIndex = R.STAGES.findIndex(stage => stage.missionIds.includes(id));
    state.wallet = 30000;
    Object.values(state.facilities).forEach(f => { f.unlocked = true; });
    for (const mission of R.MISSIONS.filter(m => R.STAGES.findIndex(stage => stage.id === m.stage) < state.stageIndex)) state.bestStars[mission.id] = 3;
    R.selectMission(state, id);
    state.recipes[id] = 'preview';
    state.loadout = {...R.getRecipe(state).ingredients};
    return state;
  };
  R.loadState = seed;
  R.saveState = () => true;
  document.title = 'Outer planets preview · My Mini NASA';
  document.getElementById('splash-title').textContent = 'Explore the outer planets';
  document.getElementById('splash-start').textContent = 'Test new missions';
  document.getElementById('save-status').textContent = 'PREVIEW · REFRESH TO RESET';
})();
