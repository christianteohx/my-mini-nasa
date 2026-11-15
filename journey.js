(() => {
  'use strict';
  // Read-only guidance derived from the existing campaign and flight log.
  function nextGoal(state, rules) {
    const available = rules.MISSIONS.filter(m => rules.isMissionAvailable(state, m.id));
    const selected = rules.MISSIONS[state.missionIndex];
    const mission = available.find(m => m.id === selected?.id && (state.bestStars?.[m.id] || 0) < 3)
      || available.find(m => (state.bestStars?.[m.id] || 0) < 3);
    if (mission) return {kind:'mission', id:mission.id, title:mission.name, stars:state.bestStars?.[mission.id] || 0,
      detail:'Earn 3 stars to unlock its spaceport reward.'};
    const expansion = rules.getExpansion(state);
    if (expansion) return {kind:'expansion', title:expansion.stage.name, cost:expansion.cost,
      saved:Math.min(expansion.cost, Math.max(0, state.wallet)), ready:expansion.available && expansion.affordable,
      detail:expansion.affordable ? 'Your next destination is ready.' : 'Sell Data Cubes to open your next destination.'};
    return {kind:'complete', title:'Every mission mastered', detail:'Try a different payload or choose a Challenge.'};
  }
  globalThis.SpaceportJourney = {nextGoal};
})();
