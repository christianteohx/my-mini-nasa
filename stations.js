(() => {
  'use strict';

  const rules = window.SpaceportRules;
  const payload = 'Fuel, Parts, Research Papers, Astronauts';
  const descriptions = {
    ground: ['Walk onto the pad to pick up Data Cubes.', 'Satellite signals', 'Data Cubes'],
    grant: [`Walk onto the pad to sell Data Cubes. Wait there to collect cash and the $${rules.GRANT_BONUS} bonus for every four cubes sold.`, '1 Data Cube', 'Cash'],
    fuel: ['Step onto the pad to order one Fuel unit when idle. Wait on the pad to pick it up.', '$15', '1 Fuel'],
    engineering: ['Walk onto the pad to deliver Data Cubes and collect parts that power onboard systems.', '2 Data Cubes + $20', '1 Part'],
    research: ['Walk onto the pad to deliver Data Cubes and collect Research Papers.', '3 Data Cubes + $25', '1 Research Paper'],
    academy: ['Walk onto the pad to deliver Data Cubes and collect astronauts.', '4 Data Cubes + $40', '1 Astronaut'],
    cargo: ['Walk onto the pad to pick up finished supplies.', 'Cargo Runner deliveries and surplus from Returns', payload],
    launch: ['Load the rocket. Unload any extras back into your bag.', payload, 'Mission payload'],
    scrap: ['Stand on the pad briefly to discard one item from your bag.', 'Items in your bag', 'Free bag space'],
    returns: ['Walk onto the pad to send carried hardware back to stock.', payload, 'Restocked supplies']
  };
  const money = amount => '$' + Number(amount).toLocaleString('en-US');
  const name = item => rules.ITEMS[item]?.name || 'Cash';
  const plural = item => rules.ITEMS[item]?.plural || name(item);
  const updateText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);

  function stationStatus(state, id) {
    if (id === 'returns') {
      const count = rules.getReturnsCount(state);
      return count ? `${count} ${count === 1 ? 'item' : 'items'} can go back to stock` : 'Nothing to return right now.';
    }
    const facility = state.facilities[id];
    const spec = rules.FACILITIES[id];
    if (!facility.unlocked) {
      const next = rules.getUnlock(state);
      if (id === 'cargo') return 'Hire a Cargo Runner or earn three stars on Lunar Relay to open this shelf.';
      if (id === 'scrap') return 'Build the Research Lab to open this station.';
      if (id === 'academy' && rules.getExpansion(state)?.stage.id === 'expansion') return 'Open the Flight Annex before building the Academy.';
      if (next?.id === id) return `Construction costs ${money(spec.unlock)}. You have ${money(state.wallet)}.`;
      return id === 'engineering' && facility.output ? 'One starter Part is ready for pickup.' : 'Build the preceding facilities to unlock this station.';
    }
    if (id === 'cargo') return `${rules.getCargoCount(state)} / ${rules.getCargoCapacity(state)} supplies on the shelf`;
    if (id === 'launch') {
      const info = rules.inspectLaunch(state);
      return info.mission ? `${info.mission.name} · ${info.mass} / ${info.mission.massLimit} mass` : 'Choose a mission to load the rocket.';
    }
    if (id === 'scrap') return `${rules.getInventoryCount(state)} items in your bag`;
    if (id === 'ground') return `${facility.output} / ${rules.getRates(state).cap} Data Cubes ready · ${rules.getRates(state).data.toFixed(2)}/s`;

    const capacity = rules.getFacilityOutputCapacity(state, id);
    const ready = id === 'grant' ? `${money(facility.output)} ready · ${facility.stock} / ${capacity} payouts` : `${facility.output} / ${capacity} ${plural(spec.item)} ready`;
    const batches = Math.floor(facility.input / Math.max(1, spec.cubes)) + Number(facility.active);
    return batches ? `${ready} · ${batches} processing or queued` : ready;
  }

  function actionRow(item) {
    const label = escapeHTML(name(item));
    return `<div class="station-action dialog-row" data-operation="${item}">
      <div class="row-copy"><h3>${label}</h3><p data-action-detail></p><p class="station-match" data-recommendation hidden></p></div>
      <div class="station-controls">
        <button type="button" class="button quiet" data-action="station-transfer" data-value="unload:${item}" aria-label="Unload ${label}">Unload</button>
        <input class="transfer-quantity" type="number" inputmode="numeric" min="1" step="1" aria-label="${label} quantity">
        <button type="button" class="button primary" data-action="station-transfer" data-value="load:${item}" aria-label="Load ${label}">Load</button>
      </div>
    </div>`;
  }

  function render(container, state, id, canUse, showWalk) {
    const [purpose, input, output] = descriptions[id];
    const effectiveOutput = id === 'grant' ? `${money(rules.getGrantPayout(state))} cash` : output;
    container.innerHTML = `<p class="dialog-lead station-purpose">${purpose}</p>
      <dl class="station-flow"><div><dt>INPUT</dt><dd>${input}</dd></div><div><dt>OUTPUT</dt><dd>${effectiveOutput}</dd></div></dl>
      <div class="station-status"><strong data-station-stock></strong><span data-station-bag></span></div>
      ${canUse && id === 'launch' ? '<div class="dialog-list" data-station-list></div><p data-station-empty class="inline-note" hidden>No items to transfer here.</p>' : ''}
      <div class="dialog-bottom station-footer">
        ${!canUse && showWalk ? `<button type="button" class="primary button" data-action="goto" data-value="${id}:both">Walk to pad →</button>` : ''}
        ${id === 'launch' ? '<button type="button" class="quiet button" data-action="station-recipe">View payload plan</button><button type="button" class="primary button" data-action="station-launch">Launch mission</button>' : ''}
        <button type="button" class="quiet button" data-action="close">Back to yard</button>
      </div><p class="station-feedback" role="status" data-station-feedback></p>`;
    refresh(container, state, id);
  }

  function refresh(container, state, station) {
    const stock = container.querySelector('[data-station-stock]');
    if (!stock) return;
    updateText(stock, stationStatus(state, station));
    const carry = rules.getRates(state).carry;
    updateText(container.querySelector('[data-station-bag]'), `Bag ${rules.getInventoryCount(state)} / ${carry} · ${money(state.wallet)}`);
    const launch = container.querySelector('[data-action="station-launch"]');
    if (launch) launch.disabled = !rules.inspectLaunch(state).ready;
    const list = container.querySelector('[data-station-list]');
    if (!list) return;
    const limits = Object.fromEntries(rules.getStationActions(state, 'launch').map(operation => [operation.id, operation.max]));
    const items = ['fuel', 'part', 'paper', 'crew'].filter(item => state.inventory[item] || state.loadout[item]);
    const signature = items.join(',');
    if (signature !== list.dataset.signature) {
      const focused = document.activeElement?.closest('[data-operation]')?.dataset.operation;
      const previouslyRendered = list.hasAttribute('data-signature');
      list.innerHTML = items.map(actionRow).join('');
      list.dataset.signature = signature;
      if (previouslyRendered && focused) {
        const next = list.querySelector(`[data-operation="${focused}"] input`);
        (next || container.querySelector('[data-action="close"]'))?.focus();
      }
    }
    container.querySelector('[data-station-empty]').hidden = items.length > 0;
    const plan = rules.getRecipe(state)?.ingredients;

    for (const item of items) {
      const row = list.querySelector(`[data-operation="${item}"]`);
      const detail = row.querySelector('[data-action-detail]');
      const match = row.querySelector('[data-recommendation]');
      const input = row.querySelector('input');
      const load = limits[`load:${item}`] || 0;
      const unload = limits[`unload:${item}`] || 0;
      const max = Math.max(load, unload);
      const suggested = plan && item in plan ? plan[item] - state.loadout[item] : null;
      updateText(detail, `${state.inventory[item]} in bag · ${state.loadout[item]} loaded`);
      match.hidden = suggested === null;
      if (!match.hidden) updateText(match, suggested ? `Plan calls for ${Math.abs(suggested)} ${suggested < 0 ? 'fewer' : 'more'}` : 'Plan quantity met');
      const untouched = input.dataset.edited !== 'true';
      input.max = Math.max(1, max);
      input.disabled = max === 0;
      if (untouched && document.activeElement !== input) input.value = Math.max(1, Math.min(suggested < 0 ? unload : load, Math.abs(suggested) || 1));
      const quantity = input.valueAsNumber;
      const valid = Number.isInteger(quantity) && quantity >= 1;
      const unloadButton = row.querySelector(`[data-value="unload:${item}"]`);
      const loadButton = row.querySelector(`[data-value="load:${item}"]`);
      unloadButton.disabled = !valid || quantity > unload;
      loadButton.disabled = !valid || quantity > load;
      unloadButton.title = unload ? `Unload up to ${unload}` : state.loadout[item] ? 'Your bag is full' : 'None loaded';
      loadButton.title = load ? `Load up to ${load}` : 'None in your bag';
    }
  }

  function confirmation(operationId, count) {
    const [verb, item] = operationId.split(':');
    return `${verb === 'load' ? 'Loaded' : 'Unloaded'} ${count} ${count === 1 ? name(item) : plural(item)}.`;
  }

  window.SpaceportStations = { render, refresh, confirmation, summary: id => descriptions[id][0] };
})();
