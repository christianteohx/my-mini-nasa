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
  // Real NASA counterparts shown at the bottom of each facility panel.
  // Photos come from the NASA Image and Video Library (images.nasa.gov).
  const nasaFacts = {
    ground: {
      title: "NASA's Deep Space Network",
      text: 'Giant radio antennas in California, Spain, and Australia talk to spacecraft across the solar system. The three sites sit far apart, so one of them can always see a distant spacecraft as Earth turns. The largest dishes are 70 meters (230 feet) wide.',
      alt: 'Large white radio antenna dishes under a blue sky at Goldstone, California',
      credit: 'NASA/JPL-Caltech · Goldstone, California, 2020', id: 'PIA23214',
    },
    grant: {
      title: 'Mary W. Jackson NASA Headquarters',
      text: "NASA Headquarters in Washington, D.C., plans the agency's missions and pays for research. Each year NASA invites scientists at universities and labs to compete for grants through a call for proposals called ROSES. The building is named for Mary W. Jackson, NASA's first Black female engineer.",
      alt: 'Ceremony unveiling the Mary W. Jackson NASA Headquarters sign',
      credit: 'NASA/Joel Kowsky · Washington, D.C., 2021', id: 'NHQ202102260022', focus: '75% 50%',
    },
    fuel: {
      title: 'Liquid hydrogen at Launch Pad 39B',
      text: "The Space Launch System's core stage burns liquid hydrogen and liquid oxygen. Hydrogen stays liquid only at about −253 °C (−423 °F), so it is kept in giant insulated spheres at the pad. In 2023 Kennedy Space Center added a second 1.4-million-gallon hydrogen sphere for Artemis.",
      alt: 'A white spherical liquid hydrogen tank labeled Liquefied Hydrogen at Kennedy Space Center',
      credit: 'NASA/Kim Shiflett · Kennedy Space Center, 2023', id: 'KSC-20230613-PH-KLS02_0033', focus: '50% 40%',
    },
    engineering: {
      title: 'Building the James Webb Space Telescope',
      text: "Engineers at NASA's Goddard Space Flight Center assembled Webb in one of the world's largest clean rooms. Workers wear head-to-toe “bunny suits” because a speck of dust or a fingerprint can harm the gold mirrors and sensitive instruments. Webb launched in December 2021.",
      alt: "The James Webb Space Telescope's gold mirrors hanging in a clean room",
      credit: 'NASA/Goddard/Chris Gunn · Greenbelt, Maryland, 2017', id: 'GSFC_20171208_Archive_e000270',
    },
    research: {
      title: 'Science on the International Space Station',
      text: 'The space station is a laboratory orbiting about 400 km (250 miles) above Earth. Crews run experiments that only work in microgravity. Here, Canadian Space Agency astronaut David Saint-Jacques services the Combustion Integrated Rack, which studies how flames burn without gravity.',
      alt: 'Astronaut David Saint-Jacques working on an experiment rack inside the Destiny laboratory',
      credit: 'NASA · International Space Station, 2019', id: 'iss058e026380',
    },
    academy: {
      title: 'Spacewalk training underwater',
      text: "Astronauts rehearse spacewalks in the Neutral Buoyancy Laboratory at NASA's Johnson Space Center, a pool holding about 6.2 million gallons of water and full-size space station mockups. Floating in a suit underwater is the closest feeling on Earth to working in space.",
      alt: 'Two astronauts in white spacesuits training underwater beside a space station mockup',
      credit: 'NASA/Mark Sowa · Johnson Space Center, 2005', id: 'jsc2005e04330',
    },
    launch: {
      title: 'Artemis I on Launch Pad 39B',
      text: "Kennedy Space Center in Florida launches NASA's Moon rockets. The Space Launch System rocket and Orion spacecraft lifted off from Pad 39B on November 16, 2022, for Artemis I, an uncrewed flight around the Moon. Tall towers around the pad protect the rocket from lightning.",
      alt: 'The orange and white Artemis I rocket standing on the launch pad by the ocean',
      credit: 'NASA/Jason Parrish · Kennedy Space Center, 2022', id: 'KSC-20220915-PH-JNP01_0001', focus: '50% 42%',
    },
    scrap: {
      title: 'Recycling on the space station',
      text: "Very little goes to waste in orbit. The station's water recovery system turns wastewater, sweat, and even urine back into clean drinking water, recovering about 98% of the water crews bring aboard. Here, NASA astronaut Suni Williams replaces its filters.",
      alt: 'Astronaut Suni Williams holding filter parts of the water recovery system',
      credit: 'NASA · International Space Station, 2024', id: 'iss072e143163',
    },
    cargo: {
      title: 'Cargo deliveries to the space station',
      text: "Robotic cargo spacecraft carry food, supplies, and experiments to the station. In August 2024 Northrop Grumman's Cygnus arrived with about 8,200 pounds of cargo and was caught by the station's Canadarm2 robotic arm.",
      alt: 'A Cygnus cargo spacecraft with round solar arrays approaching the space station above clouds',
      credit: 'NASA · International Space Station, 2024', id: 'iss071e416851',
    },
    returns: {
      title: 'Bringing science back to Earth',
      text: "SpaceX's cargo Dragon can bring experiments home. It splashes down under parachutes off the Florida coast, and teams rush cold samples to labs. Here, the team unpacks experiments that returned on the CRS-21 mission in January 2021.",
      alt: 'Team members in lab gowns unpacking returned science experiments from coolers',
      credit: 'NASA/Isaac Watson · Kennedy Space Center, 2021', id: 'KSC-20210114-ILW02_0044',
    },
  };

  function nasaFact(id) {
    const fact = nasaFacts[id];
    if (!fact) return '';
    const link = `https://images.nasa.gov/details/${encodeURIComponent(fact.id)}`;
    return `<figure class="nasa-fact">
        <img src="assets/nasa/${id}.jpg" alt="${escapeHTML(fact.alt)}" loading="lazy" decoding="async" width="640" height="360"${fact.focus ? ` style="object-position: ${fact.focus}"` : ''}>
        <figcaption>
          <span class="nasa-fact-tag">REAL NASA</span>
          <h3>${escapeHTML(fact.title)}</h3>
          <p>${escapeHTML(fact.text)}</p>
          <small>${escapeHTML(fact.credit)} · <a href="${link}" target="_blank" rel="noopener">View on NASA ${window.NasaIcons.svg('arrow')}</a></small>
        </figcaption>
      </figure>`;
  }

  const specialPerks = {
    primePart: 'Counts as a Part. Each one loaded adds +5% launch odds.',
    prizePaper: 'Counts as a Research Paper. Each one loaded adds +30% satellite data.',
    eliteCrew: 'Counts as an Astronaut. Each one loaded pays a 50% mission bonus on success.',
  };
  const loaded = (state, item) => (rules.SPECIAL_ITEMS.includes(item) ? state.specialLoadout : state.loadout)[item] || 0;

  function specialCard(id) {
    const item = rules.SPECIALS[id];
    if (!item) return '';
    return `<div class="special-info" data-item="${item}">
        <span class="special-star" aria-hidden="true">${window.NasaIcons.svg('star')}</span>
        <div><strong>${escapeHTML(rules.ITEMS[item].name)}</strong><p>${specialPerks[item]}</p><p class="special-odds" data-special-text></p></div>
      </div>`;
  }

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
    const special = rules.SPECIALS[id] && facility.special ? ` + ${facility.special} special` : '';
    const ready = id === 'grant' ? `${money(facility.output)} ready · ${facility.stock} / ${capacity} payouts` : `${facility.output} / ${capacity} ${plural(spec.item)}${special} ready`;
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
      ${id === 'grant' ? `<div class="grant-bonus"><div class="grant-bonus-head"><h3>Grant Bonus</h3><span class="grant-bonus-chip">+${money(rules.GRANT_BONUS)} every ${state.customers.order} cubes</span></div><div class="grant-bonus-meter" data-grant-meter aria-hidden="true"></div><p data-grant-bonus-text></p></div>` : ''}
      ${specialCard(id)}
      <div class="station-status"><strong data-station-stock></strong><span data-station-bag></span></div>
      ${canUse && id === 'launch' ? '<div class="dialog-list" data-station-list></div><p data-station-empty class="inline-note" hidden>No items to transfer here.</p>' : ''}
      <div class="dialog-bottom station-footer">
        ${!canUse && showWalk ? `<button type="button" class="primary button" data-action="goto" data-value="${id}:both">Walk to pad ${window.NasaIcons.svg('right')}</button>` : ''}
        ${id === 'launch' ? '<button type="button" class="quiet button" data-action="station-recipe">View payload plan</button><button type="button" class="primary button" data-action="station-launch">Launch mission</button>' : ''}
        <button type="button" class="quiet button" data-action="close">Back to yard</button>
      </div><p class="station-feedback" role="status" data-station-feedback></p>
      ${nasaFact(id)}`;
    refresh(container, state, id);
  }

  function refresh(container, state, station) {
    const stock = container.querySelector('[data-station-stock]');
    if (!stock) return;
    updateText(stock, stationStatus(state, station));
    const carry = rules.getRates(state).carry;
    updateText(container.querySelector('[data-station-bag]'), `Bag ${rules.getInventoryCount(state)} / ${carry} · ${money(state.wallet)}`);
    const specialText = container.querySelector('[data-special-text]');
    if (specialText) {
      const chance = Math.round(rules.getSpecialChance(state, station) * 100);
      const ready = state.facilities[station].special || 0;
      updateText(specialText, `${chance}% chance per batch · ${ready} ready here`);
    }
    const meter = container.querySelector('[data-grant-meter]');
    if (meter) {
      const { order, filled } = state.customers;
      const signature = `${filled}/${order}`;
      if (meter.dataset.signature !== signature) {
        meter.innerHTML = Array.from({ length: order }, (_, i) => `<span${i < filled ? ' data-filled' : ''}></span>`).join('');
        meter.dataset.signature = signature;
      }
      updateText(container.querySelector('[data-grant-bonus-text]'), `${filled} / ${order} cubes toward the next bonus`);
    }
    const launch = container.querySelector('[data-action="station-launch"]');
    if (launch) launch.disabled = !rules.inspectLaunch(state).ready;
    const list = container.querySelector('[data-station-list]');
    if (!list) return;
    const limits = Object.fromEntries(rules.getStationActions(state, 'launch').map(operation => [operation.id, operation.max]));
    const items = ['fuel', 'part', 'paper', 'crew', ...rules.SPECIAL_ITEMS].filter(item => state.inventory[item] || loaded(state, item));
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
      const base = rules.ITEMS[item].base ?? item;
      const suggested = plan && base in plan ? plan[base] - rules.getSupplyCount({ ...state.loadout, ...state.specialLoadout }, base) : null;
      updateText(detail, `${state.inventory[item]} in bag · ${loaded(state, item)} loaded`);
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
