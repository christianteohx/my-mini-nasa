(() => {
  'use strict';

  const I = window.NasaIcons;
  const R = window.SpaceportRules;
  const C = window.SpaceportChallenges;
  const S = window.SpaceportSkins;
  const stations = window.SpaceportStations;
  const byId = id => document.getElementById(id);
  const canvas = byId('yard');
  const dialog = byId('panel');
  const panel = byId('panel-content');
  const missionControl = byId('mission-control');
  const missionToggle = byId('mission-toggle');
  const version = document.querySelector('meta[name="game-version"]').content;
  const gaugeKeys = ['fuel', 'power', 'science', 'crew', 'mass'];
  const inventoryKeys = ['data', 'fuel', 'part', 'paper', 'crew'];
  const gaugeItems = {fuel:'fuel', power:'part', science:'paper', crew:'crew', mass:'mass'};
  const specialKeys = R.SPECIAL_ITEMS;
  const labels = {data:'Data Cube', fuel:'Fuel', part:'Part', paper:'Research Paper', crew:'Astronaut', mass:'Mass',
    primePart:'Prime Part', prizePaper:'Prize Paper', eliteCrew:'Elite Astronaut'};
  const symbols = Object.fromEntries(Object.entries({data:'cube', fuel:'fuel', part:'part', paper:'paper', crew:'crew', mass:'cube', primePart:'star', prizePaper:'star', eliteCrew:'star'}).map(([key, name]) => [key, I.svg(name)]));
  const production = {fuel:'fuel', part:'engineering', paper:'research', crew:'academy'};
  const nasaMissionDesign = 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf';
  const resultLabels = {failed:'Launch failed', partial:'Partial success', success:'Mission success'};
  let state = R.loadState() || R.createState();
  state.challenge = C.normalize(state.challenge);
  state.cosmetics = S.normalize(state.cosmetics, state);
  let objective;
  let activePanel = '';
  let loadedReport;
  let confirmReset = false;
  let noticeTimer = 0;
  let flightTimer = 0;
  let lastFrame = performance.now();
  let nextUpdate = 0;
  let nextSave = 0;
  let animationFrame = null;
  let audioContext;
  let sound = false;
  let originButton;
  let lastObjective = '';
  let previousWallet = state.wallet;
  let walletAnimation;
  let preparingReplay = false;
  let recipeSelection = null;
  let manualMissionToggle = false;
  let facilitySelection = null;
  let upgradeCategory = 'crew';
  let skinCategory = 'ship';
  let skinRole = 'player';
  let pendingDialogAction = null;
  const smallScreen = window.matchMedia('(max-width: 760px)');

  try { sound = localStorage.getItem('pocket-spaceport-sound') === 'on'; } catch {}
  let music = true;
  try { music = localStorage.getItem('pocket-spaceport-music') !== 'off'; } catch {}
  const Music = window.SpaceportMusic;

  function setMusic(on) {
    music = on;
    try { localStorage.setItem('pocket-spaceport-music', on ? 'on' : 'off'); } catch {}
    if (on) Music?.start();
    else Music?.stop();
  }
  const money = value => '$' + Number(value || 0).toLocaleString('en-US');
  const decimal = value => Number(value || 0).toFixed(2);
  const percent = value => `${Math.round((value || 0) * 100)}%`;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const icon = item => `<i class="item-icon" data-item="${item}" aria-hidden="true">${symbols[item]}</i>`;

  function chirp(style) {
    if (!sound || !window.AudioContext) return;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const tones = {pickup:[530,810,.09], cash:[720,1120,.13], launch:[110,350,.6], success:[440,890,.26], unlock:[410,980,.21]};
    const [start, end, duration] = tones[style] || [370,630,.11];
    oscillator.type = style === 'launch' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(.045, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .01);
  }

  // Engine rumble and a rising roar for the launch show.
  function launchRumble() {
    if (!sound || !window.AudioContext) return;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const now = audioContext.currentTime;
    const length = 3;
    const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * length), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = brown * 3.5;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.7);
    filter.frequency.exponentialRampToValueAtTime(260, now + length);
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    noise.connect(filter).connect(gain).connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + length);
    const tone = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(70, now);
    tone.frequency.exponentialRampToValueAtTime(240, now + 2.4);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.05, now + 0.6);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    tone.connect(toneGain).connect(audioContext.destination);
    tone.start(now);
    tone.stop(now + 2.7);
  }

  // A short brass "ta-da" for successful flights. Three stars get the full fanfare.
  function fanfare(stars) {
    if (!sound || !stars || !window.AudioContext) return;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const start = audioContext.currentTime + 0.05;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    const master = audioContext.createGain();
    master.gain.value = 0.9;
    filter.connect(master).connect(audioContext.destination);
    const brass = (frequency, at, length, level = 0.035) => {
      for (const [type, ratio, mix] of [['sawtooth', 1, 1], ['square', 0.5, 0.45]]) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency * ratio, start + at);
        gain.gain.setValueAtTime(0.0001, start + at);
        gain.gain.exponentialRampToValueAtTime(level * mix, start + at + 0.02);
        gain.gain.setValueAtTime(level * mix * 0.8, start + at + length * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + at + length);
        oscillator.connect(gain).connect(filter);
        oscillator.start(start + at);
        oscillator.stop(start + at + length + 0.02);
      }
    };
    const chime = (frequency, at) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start + at);
      gain.gain.setValueAtTime(0.03, start + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.35);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start + at);
      oscillator.stop(start + at + 0.4);
    };
    if (stars === 3) {
      // G4 G4 G4 | C5 (held, as a C major chord) with sparkles on top.
      brass(392, 0, 0.1);
      brass(392, 0.12, 0.1);
      brass(392, 0.24, 0.1);
      for (const note of [523.25, 659.25, 783.99]) brass(note, 0.38, 0.9, 0.028);
      brass(1046.5, 0.38, 0.9, 0.02);
      [1567.98, 2093, 2637, 3135.96].forEach((note, i) => chime(note, 0.5 + i * 0.09));
    } else {
      brass(523.25, 0, 0.12);
      for (const note of [659.25, 783.99]) brass(note, 0.15, 0.5, 0.03);
    }
  }

  function notify(text, seconds = 4.2) {
    if (!text) return;
    byId('notice-text').textContent = text;
    byId('notice').hidden = false;
    noticeTimer = performance.now() + seconds * 1000;
  }

  function store() {
    const saved = R.saveState(state);
    if (saved === false) byId('save-status').textContent = 'SAVE UNAVAILABLE IN THIS BROWSER';
  }

  const yard = new window.SpaceportYard(canvas, {
    onInteract: usePad,
    onFacilityInspect: id => openFacility(id, canvas),
    onSpecial(id) {
      const item = R.SPECIALS[id];
      if (!item) return;
      notify(`${labels[item]} made at ${R.FACILITIES[id].name}!`, 3);
      chirp('unlock');
    },
    onUpgrade(id) {
      const upgrade = R.getUpgrade(state, id);
      if (!upgrade?.available) return false;
      if (!R.buyUpgrade(state, id)) {
        notify(`${upgrade.label} costs ${money(upgrade.cost)}.`, 2.5);
        return false;
      }
      notify(id === 'intern' ? 'Your intern is on duty!' : `Carry capacity increased to ${upgrade.nextLabel}.`);
      chirp('unlock');
      store();
      updateHUD();
      return true;
    },
    onOpenLaunch: startLaunch,
    onExpansion(inspect) {
      if (flightTimer || state.report) return;
      if (inspect) {
        openDialog('missions', byId('mission-board'));
        return;
      }
      const expansion = R.getExpansion(state);
      if (!expansion) return;
      if (R.buyExpansion(state)) {
        notify(`${expansion.stage.name} is open. Choose your next mission.`);
        chirp('unlock');
        store();
        updateHUD();
      } else {
        notify(expansion.reason);
      }
    }
  });

  function usePad(id, action) {
    if (flightTimer || state.report) return null;
    if (id === 'launch' || (id === 'cargo' && state.facilities.cargo.unlocked)) {
      openFacility(id, canvas);
      return null;
    }
    const result = R.interact(state, id, id === 'grant' ? 'both' : action);
    if (!result) return null;
    const events = result.events || [result];
    const cash = events.find(event => event.type === 'cash');
    const tip = events.find(event => event.tip)?.tip;
    for (const event of events) {
      if (event.type !== 'deposit' && event.type !== 'order') continue;
      const units = event.count / (R.FACILITIES[event.facility].cubes || 1);
      if (C.recordOperations(state.challenge, event.facility, units) === 'complete') {
        notify('Operations challenge complete. Open Challenges for the next goal.');
        store();
      }
    }
    const special = events.find(event => event.special);
    if (special) notify(`Picked up ${special.count} ${special.count === 1 ? labels[special.item] : R.ITEMS[special.item].plural}.`, 2.5);
    else if (id === 'scrap') {
      const count = events.reduce((total, event) => total + event.count, 0);
      notify(`Scrapped ${count} ${count === 1 ? 'item' : 'items'}.`, 2.5);
    } else if (id === 'returns') {
      const count = events.reduce((total, event) => total + event.count, 0);
      notify(`${count} ${count === 1 ? 'item' : 'items'} returned to stock.`, 2.5);
    } else if (cash) notify('Collected ' + money(cash.count), 1.5);
    else if (result.type === 'unlock') notify(`${R.FACILITIES[id].name} built.`);
    else if (tip) notify(tip.text || tip);
    chirp(cash?.type || events.at(-1).type);
    if (result.type === 'unlock') store();
    updateHUD();
    return result;
  }

  function openFacility(id, source) {
    if (flightTimer || state.report || !R.FACILITIES[id]) return;
    facilitySelection = id;
    openDialog('facility', source);
  }

  function afterClose(callback) {
    pendingDialogAction = callback;
    dialog.close();
  }

  function setMissionOpen(open) {
    missionControl.dataset.collapsed = String(!open);
    missionToggle.setAttribute('aria-expanded', String(open));
    missionToggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} Mission Control`);
    missionToggle.querySelector('span').innerHTML = I.svg(open ? 'minus' : 'plus');
    yard.setPanelOpen?.(open, missionControl.offsetWidth, missionControl.offsetHeight);
  }

  missionToggle.addEventListener('click', () => {
    manualMissionToggle = true;
    setMissionOpen(missionControl.dataset.collapsed === 'true');
  });
  window.addEventListener('resize', () => {
    setMissionOpen(manualMissionToggle ? missionControl.dataset.collapsed !== 'true' : !smallScreen.matches);
  });
  setMissionOpen(!smallScreen.matches);

  // Stack mobile HUD rows using their rendered heights, including late-loading fonts.
  // The cartoon borders/buttons are taller than the original fixed row offsets.
  const hudHeader = document.querySelector('.masthead-inner');
  const hudResources = document.querySelector('.overview');
  function sizeMobileHud() {
    document.documentElement.style.setProperty('--hud-header-height', `${hudHeader.getBoundingClientRect().height}px`);
    document.documentElement.style.setProperty('--hud-resources-height', `${hudResources.getBoundingClientRect().height}px`);
  }
  const hudObserver = new ResizeObserver(sizeMobileHud);
  hudObserver.observe(hudHeader);
  hudObserver.observe(hudResources);
  sizeMobileHud();

  const route = (title, detail, id, zone = 'input', panelName = '') => ({title, detail, id, zone, panelName});

  function currentObjective(info) {
    const facilities = state.facilities;
    const inv = state.inventory;
    const tally = Object.values(inv).reduce((sum, count) => sum + count, 0);
    const full = tally >= R.getRates(state).carry;
    if (!info.mission) return route('Choose your next mission', 'Pick an available flight from the mission board.', null, 'input', 'missions');
    const {mission} = info;
    const unloadCargo = () => {
      if (inv.data) return route('Make room and earn grants', 'Drop Data Cubes at the Grant Office.', 'grant');
      if (R.getReturnsCount(state)) return route('Return extra supplies', 'Walk onto the Returns pad to send carried hardware back to stock.', 'returns');
      return route('Make room in your bag', 'Storage is full. Use some supplies at the Launch Pad, or use the Scrap Bin.', 'launch');
    };

    const fund = (target, label) => {
      if (facilities.grant.output > 0) return route('Collect your grant', 'Get paid at the Grant Office pad.', 'grant', 'output');
      if (inv.data) return route('Trade Data Cubes for cash', `Drop cubes at Grant Office. You need ${money(target)} ${label}.`, 'grant');
      if (facilities.grant.active || facilities.grant.input > 0) return route('Collect your grant', 'Wait on the Grant Office pad for the cash.', 'grant', 'output');
      if (full) return unloadCargo();
      return route('Collect Data Cubes', `Sell them at the Grant Office ${label}.`, 'ground', 'output');
    };

    const supply = item => {
      const id = production[item];
      const spec = R.FACILITIES[id];
      const facility = facilities[id];
      const label = labels[item];

      if (inv[item]) return route(`Load ${item === 'part' ? 'Power' : label}`, `Walk onto the Launch Pad with your ${label}.`, 'launch');
      if (state.runner.shelf[item] > 0) return full ? unloadCargo() :
        route(`Pick up ${label}`, 'Your Cargo Runner stocked the Cargo Shelf.', 'cargo', 'output');
      const canTradeData = id !== 'fuel' && R.getStationActions(state, id)
        .some(operation => operation.id === `make:${item}` && operation.max);
      if (facility.output > 0) return full && !canTradeData ? unloadCargo() : route(`Pick up ${label}`, `Collect it at the ${spec.name} pad.`, id, 'output');
      if (state.runner.cargo === item || (state.runner.from === id && state.runner.phase === 'pickup')) {
        return full ? unloadCargo() : route(`Meet the Cargo Runner`, `Pick up ${label} when it reaches the Cargo Shelf.`, 'cargo', 'output');
      }
      if (!facility.unlocked) {
        const next = R.getUnlock(state);
        const opening = next || spec;
        if (state.wallet < opening.unlock) return fund(opening.unlock, `to open ${opening.name}`);
        return route(`Open ${opening.name}`, `Walk onto the construction pad to spend ${money(opening.unlock)}.`, opening.id);
      }
      if (facility.active || facility.input >= Math.max(1, spec.cubes)) return full && !canTradeData ? unloadCargo() : route(`Collect ${label}`, `Wait on the ${spec.name} pad to pick it up when ready.`, id, 'output');
      if (state.wallet < spec.cash) return fund(spec.cash, `to make ${label}`);
      if (inv.data < spec.cubes) {
        if (full) return unloadCargo();
        return route('Collect Data Cubes', `${spec.name} needs ${spec.cubes} cubes to make ${label}.`, 'ground', 'output');
      }
      const detail = id === 'fuel' && yard.nearby === id
        ? 'Step off the pad and back on to order more Fuel.'
        : `Walk onto the ${spec.name} pad to start production.`;
      return route(item === 'fuel' ? 'Order Fuel' : `Make ${label}`, detail, id);
    };

    if (info.mass > mission.massLimit) return route('Reduce your payload mass', 'Unload supplies to get within the rocket’s mass limit.', null, 'input', 'manifest');
    const expansion = R.getExpansion(state);
    if (state.bestStars[mission.id] === 3 && info.empty && !preparingReplay) {
      if (expansion?.available) {
        if (expansion.affordable) return route(`Open the ${expansion.stage.name}`, `Stand on the expansion pad to spend ${money(expansion.cost)}.`, 'expansion', 'expansion');
        return fund(expansion.cost, `to expand the yard. You’ve saved ${money(state.wallet)}.`);
      }
      return route('Choose your next mission', 'Choose a new flight or revisit a familiar mission.', null, 'input', 'missions');
    }
    const recipe = info.recipe?.ingredients;
    if (recipe && inventoryKeys.slice(1).some(item => state.loadout[item] > recipe[item])) {
      return route('Trim the payload', 'Unload extras to match the payload plan.', null, 'input', 'manifest');
    }
    const fuelTarget = recipe?.fuel ?? info.fuelNeeded;
    if (mission.id === R.MISSIONS[0].id && state.loadout.fuel < fuelTarget) return supply('fuel');
    if (state.loadout.paper < (recipe?.paper ?? mission.scienceMin)) return supply('paper');
    if (state.loadout.crew < (recipe?.crew ?? mission.crewMin)) return supply('crew');
    if (state.loadout.part < (recipe?.part ?? info.powerDemand)) return supply('part');
    if (state.loadout.fuel < fuelTarget) return supply('fuel');
    if (state.wallet < mission.fee) return fund(mission.fee, 'for the launch fee');
    return route('Launch when ready', recipe ? 'The load matches the payload plan. Check your odds before liftoff.' : 'Check your odds, then fly this load or try another combination.');
  }

  function setText(id, text) {
    const node = byId(id);
    if (node.textContent !== String(text)) node.textContent = text;
  }

  const inventoryNames = {data:'Data Cubes', fuel:'Fuel', part:'Parts', paper:'Research', crew:'Astronauts', primePart:'Prime', prizePaper:'Prize', eliteCrew:'Elite'};
  byId('inventory').innerHTML = [...inventoryKeys, ...specialKeys].map(item => `<span class="inventory-item zero" data-item="${item}"${specialKeys.includes(item) ? ' data-special' : ''} title="${labels[item]}">${icon(item)}<span class="inventory-name">${inventoryNames[item]}</span><b id="item-${item}">0</b></span>`).join('');
  byId('gauges').innerHTML = gaugeKeys.map(key => `<div class="gauge" data-item="${gaugeItems[key]}" id="gauge-${key}">${icon(gaugeItems[key])}<div><div class="gauge-head"><span>${key[0].toUpperCase() + key.slice(1)}</span><span class="gauge-value"><b>0</b> <span></span></span></div><div class="gauge-track"><div class="gauge-fill"></div><div class="gauge-mark" hidden></div></div></div></div>`).join('');

  function updateHUD() {
    const rates = R.getRates(state);
    const info = R.inspectLaunch(state);
    const mission = info.mission;
    const recipe = info.recipe;
    const stage = R.getStage(state);
    const expansion = R.getExpansion(state);
    const inventoryCount = Object.values(state.inventory).reduce((sum, count) => sum + count, 0);
    setText('wallet', money(state.wallet));
    if (state.wallet > previousWallet && byId('wallet-stat').animate &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      walletAnimation?.cancel();
      walletAnimation = byId('wallet-stat').animate([
        {transform:'translateY(0) scale(1)'},
        {transform:'translateY(-3px) scale(1.05)',offset:.35},
        {transform:'translateY(0) scale(1)'}
      ], {duration:240,easing:'ease-out'});
    }
    previousWallet = state.wallet;
    if (byId('rate').firstChild.data !== decimal(rates.data)) byId('rate').firstChild.data = decimal(rates.data);
    setText('satellites', state.satellites.length);
    setText('carry', `${inventoryCount} / ${rates.carry}`);
    byId('inventory-summary').dataset.full = inventoryCount >= rates.carry;
    setText('order-progress', `${state.customers.filled} / ${state.customers.order} cubes sold`);
    setText('order-bonus', '+' + money(state.customers.bonus));
    const challenge = C.getChallenge(state.challenge);
    setText('challenge-summary', challenge ? `${challenge.label} · ${challenge.complete ? 'Goal complete' : `${challenge.progress}/${challenge.target}`}` : 'Pick a focus');
    for (const item of [...inventoryKeys, ...specialKeys]) {
      const count = state.inventory[item] || 0;
      const node = byId('item-' + item);
      node.parentElement.classList.toggle('zero', count === 0);
      if (node.textContent !== String(count)) node.textContent = count;
    }

    setText('yard-tier', stage.name.toUpperCase());
    Music?.setTheme(stage.destination);
    setText('mission-tag', mission ? `${mission.destination || 'Earth'} · ${mission.crewMin ? 'Crewed' : 'Uncrewed'}`.toUpperCase() : 'MISSION CONTROL');
    setText('mission-title', mission?.name || 'Choose a mission');
    setText('mission-description', mission?.objective || mission?.description || 'Visit the mission board to plan another flight.');
    const perk = mission && R.getMissionReward(state, mission.id);
    byId('mission-perk').hidden = !perk;
    if (perk) {
      byId('mission-perk').dataset.earned = perk.earned;
      setText('mission-perk-title', `${perk.earned ? 'Earned' : '3 stars'} · ${perk.name}`);
      byId('mission-perk').title = perk.detail;
      setText('mission-perk-detail', perk.detail);
    }
    setText('rocket', mission?.rocket || 'Mission complete');
    setText('rocket-limit', mission ? `max ${mission.massLimit} mass` : '');
    const hasPayload = Boolean(mission && !info.empty);
    byId('manifest-note').hidden = hasPayload;
    byId('manifest-button').hidden = !hasPayload;
    setText('manifest-note', mission ? (recipe?.known ? 'PLAN KNOWN' : 'PLAN LOCKED') : '');

    for (const key of gaugeKeys) {
      const node = byId('gauge-' + key);
      const gauge = info.gauges?.[key];
      const hidden = !recipe?.known && ['fuel', 'science'].includes(key);
      const target = recipe?.known && key !== 'mass' ? recipe.ingredients[gaugeItems[key]] : gauge?.target || 0;
      const max = Math.max(1, target, gauge?.max || 0);
      const value = gauge?.count || 0;
      node.querySelector('b').textContent = value;
      node.querySelector('.gauge-value span').textContent = !mission ? '' : hidden ? ' / ?' : target || recipe?.known ? ' / ' + target : '';
      node.querySelector('.gauge-fill').style.width = `${Math.min(100, (value / max) * 100)}%`;
      const marker = node.querySelector('.gauge-mark');
      marker.hidden = hidden || !target;
      marker.style.left = `${Math.min(100, target / max * 100)}%`;
      const targetKnown = recipe?.known && key !== 'mass';
      node.dataset.status = hidden ? '' : targetKnown ? (value > target ? 'high' : value < target ? 'low' : 'good') : gauge?.status || '';
      node.title = hidden ? 'Unlock or buy the payload plan to see its target.'
        : targetKnown ? `${target} ${labels[gaugeItems[key]]} in the payload plan.` : gauge?.message || '';
    }

    const status = byId('status-line');
    const overloaded = mission && info.mass > mission.massLimit;
    let statusText = 'Carry supplies to the Launch Pad.';
    const oddsShown = recipe?.known || !info.odds ? info.odds : Math.max(.05, Math.min(.95, Math.round(info.odds * 20) / 20));
    const odds = mission && !info.empty ? `${!recipe?.known && oddsShown > 0 ? '≈' : ''}${percent(oddsShown)}` : '—';
    setText('launch-odds', odds);
    byId('odds-fill').style.width = odds === '—' ? '0%' : percent(oddsShown);
    byId('odds-fill').parentElement.dataset.tone = oddsShown >= .75 ? 'good' : oddsShown >= .45 ? 'fair' : 'poor';
    if (!mission) statusText = 'Select a mission to see launch odds.';
    else if (overloaded) statusText = 'Over mass limit. Unload from the manifest.';
    else if (!info.empty && state.loadout.fuel < info.fuelNeeded) statusText = 'Too little fuel to reach the destination.';
    else if (info.thinMargin) statusText = 'Thin mass margin lowers launch odds.';
    else if (!info.empty && info.qualifyingIssue) statusText = info.qualifyingIssue;
    else if (state.wallet < mission.fee && !info.empty) statusText = `Save ${money(mission.fee)} for the launch fee.`;
    else if (info.ready) statusText = recipe?.known && info.exact ? 'Payload plan matched. Launch risk remains.' : 'Extra or missing supplies lower the odds.';
    status.dataset.tone = overloaded || info.thinMargin || (!info.empty && info.qualifyingIssue) ? 'warn' : info.ready ? 'ready' : '';
    setText('status-line', statusText);
    const bonus = info.specialBonus;
    const perks = [];
    if (bonus?.odds) perks.push(`+${percent(bonus.odds)} odds`);
    if (bonus?.downlink) perks.push(`+${percent(bonus.downlink)} data`);
    if (bonus?.cash && mission) perks.push(`+${money(Math.round(mission.reward * bonus.cash))} on success`);
    byId('special-bonus').hidden = !perks.length;
    setText('special-bonus', perks.length ? `Specials ${perks.join(' · ')}` : '');
    byId('launch').disabled = !info.ready || Boolean(flightTimer);
    byId('yard-launch').hidden = yard.nearby !== 'launch' || !info.ready || Boolean(flightTimer);
    setText('launch-label', flightTimer ? 'Launching…' : 'Launch mission');
    setText('launch-fee', mission?.fee ? money(mission.fee) : mission ? 'FREE' : 'READY');
    byId('recipe-button').hidden = !recipe;
    byId('recipe-button').setAttribute('aria-label', recipe?.known ? 'View payload plan' : 'View locked payload plan');
    setText('recipe-price', recipe?.known ? 'KNOWN' : recipe ? money(recipe.price) : '');
    byId('expansion-button').hidden = !expansion;
    setText('expansion-label', expansion?.available ? `${money(Math.min(state.wallet, expansion.cost))} / ${money(expansion.cost)}` : 'LOCKED');

    const next = currentObjective(info);
    const objectiveKey = JSON.stringify(next);
    if (objectiveKey !== lastObjective) {
      objective = next;
      lastObjective = objectiveKey;
      setText('objective', next.title);
      setText('objective-detail', next.detail);
      const locate = byId('locate');
      locate.hidden = !next.id && !next.panelName;
      const label = next.panelName === 'missions' ? 'Mission board' : next.panelName === 'manifest' ? 'Manage loadout' : 'Go to pad';
      locate.innerHTML = label + ' ' + I.svg('right');
      locate.setAttribute('aria-label', next.panelName ? label : 'Walk to objective');
      yard.setGuide(next.id || null, next.zone);
    }
  }

  function row(title, detail, end = '', item = '') {
    return `<div class="dialog-row">${item ? icon(item) : ''}<div class="row-copy"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(detail)}</p></div>${end}</div>`;
  }

  const action = (label, command, data = '', disabled = false, primary = false) =>
    `<button type="button" class="${primary ? 'primary' : 'quiet'} button" data-action="${command}" data-value="${data}" ${disabled ? 'disabled' : ''}>${escapeHTML(label)}</button>`;

  function payloadChips(payload) {
    return `<div class="recipe-items">${inventoryKeys.slice(1).map(item =>
      `<div class="recipe-item" data-item="${item}">${icon(item)}<strong>${payload[item] || 0}</strong><span>${labels[item]}</span></div>`
    ).join('')}</div>`;
  }

  const crewCards = {
    intern: {glyph:I.svg('cube'), detail:'Takes Data Cubes to the Grant Office.'},
    runner: {glyph:I.svg('bag'), detail:'Moves finished supplies to the Cargo Shelf.'},
    materials: {glyph:I.svg('part'), detail:'Supplies factories and saves cash for launch.'},
    clerk: {glyph:'$', detail:'Collects grants and adds them to your wallet.'}
  };
  const upgradeTabs = {crew:'Crew', machines:'Machines', player:'Player'};

  function upgradeLine(item, label) {
    if (!item) return '';
    const value = `${item.id}:${item.facilityId || ''}`;
    const name = escapeHTML(label);
    const level = item.level + 1;
    const maxLevel = item.maxLevel + 1;
    const current = item.id === 'runnerCarry' && item.current === 1 ? '1 supply' : item.currentLabel;
    let purchase = '<span class="upgrade-unavailable">Build first</span>';
    const extra = item.items ? ` + ${item.items.count} ${labels[item.items.item]}` : '';
    if (item.maxed) purchase = '<span class="upgrade-unavailable">Max level</span>';
    else if (item.unlocked) purchase = action(`Upgrade · ${money(item.cost)}${extra}`, 'upgrade', value, !item.affordable, true);
    const needs = [];
    if (!item.maxed && item.items) {
      const {item: special, count, have, met} = item.items;
      needs.push(`<span class="upgrade-need" data-met="${met}">${icon(special)} ${count} ${escapeHTML(count === 1 ? labels[special] : R.ITEMS[special].plural)} <small>(have ${have})</small></span>`);
    }
    if (!item.maxed && item.requirement) {
      needs.push(`<span class="upgrade-need" data-met="${item.requirement.met}"><span aria-hidden="true">${I.svg(item.requirement.met ? 'check' : 'close')}</span> 3 stars ${escapeHTML(item.requirement.mission)}</span>`);
    }
    return `<div class="upgrade-stat">
      <div class="upgrade-stat-copy">
        <div class="upgrade-stat-heading"><span class="upgrade-stat-name">${name}</span><span class="upgrade-level">Lv. ${level}/${maxLevel}</span>
          <progress value="${level}" max="${maxLevel}" aria-label="${name} level"></progress></div>
        <p class="upgrade-values"><strong>${escapeHTML(current)}</strong>${item.unlocked && item.nextLabel ? `
          <span class="upgrade-next"><span aria-hidden="true">${I.svg('right')}</span> <b>${escapeHTML(item.nextLabel)}</b></span>` : ''}</p>
        ${needs.length && item.unlocked ? `<p class="upgrade-needs"><span>Needs</span>${needs.join('')}</p>` : ''}
      </div>${purchase}
    </div>`;
  }

  function upgradeCard(emblem, name, detail, body, side = '') {
    return `<article class="upgrade-card"><div class="upgrade-card-head">
      <span class="upgrade-emblem" aria-hidden="true">${emblem}</span><div><h3>${escapeHTML(name)}</h3>${detail ? `<p>${escapeHTML(detail)}</p>` : ''}</div>${side}
      </div>${body ? `<div class="upgrade-stats">${body}</div>` : ''}</article>`;
  }

  function upgradesPanel() {
    const cards = upgradeCategory === 'crew' ? Object.entries(crewCards).map(([id, {glyph, detail}]) => {
      const worker = R.getWorker(state, id);
      if (!worker) return '';
      if (!worker.hired) {
        const hire = action(`Hire · ${money(worker.hire.cost)}`, 'upgrade', `${id}:`, !worker.hire.affordable, true);
        return upgradeCard(glyph, worker.name, detail, '', hire);
      }
      const toggle = action(worker.enabled ? 'Pause' : 'Resume', 'worker-toggle', id);
      const status = `<div class="upgrade-worker-actions"><span class="crew-status" data-on="${worker.enabled}">${worker.enabled ? 'On duty' : 'Resting'}</span>${toggle}</div>`;
      const stats = worker.upgradeIds.map(key => upgradeLine(R.getUpgrade(state, key), key.endsWith('Speed') ? 'Speed' : 'Stack size')).join('');
      return upgradeCard(glyph, worker.name, detail, stats, status);
    }).join('') : upgradeCategory === 'machines' ? [
      upgradeCard(I.svg('cube'), 'Ground Station', '', upgradeLine(R.getUpgrade(state, 'ground'), 'Cube storage')),
      ...['grant','fuel','engineering','research','academy'].map(id => {
        const spec = R.FACILITIES[id];
        const special = R.SPECIALS[id];
        const lines = upgradeLine(R.getUpgrade(state, 'facility', id), 'Cycle time')
          + (special ? upgradeLine(R.getUpgrade(state, 'quality', id), `${labels[special]} chance`) : '');
        return upgradeCard(id === 'grant' ? '$' : symbols[spec.item], spec.name, special ? `Sometimes makes ${R.ITEMS[special].plural}` : '', lines);
      })
    ].join('') : [
      upgradeCard(I.svg('bag'), 'Backpack', '', upgradeLine(R.getUpgrade(state, 'carry'), 'Carry capacity')),
      upgradeCard(I.svg('arrow'), 'Boots', '', upgradeLine(R.getUpgrade(state, 'speed'), 'Walk speed'))
    ].join('');
    return `<div class="upgrades-toolbar"><div class="upgrade-tabs" role="group" aria-label="Upgrade categories">${Object.entries(upgradeTabs).map(([id, name]) =>
      `<button type="button" data-action="upgrade-category" data-value="${id}" aria-pressed="${upgradeCategory === id}">${name}</button>`).join('')}</div>
      <div class="upgrade-balance">Cash <strong>${money(state.wallet)}</strong></div></div>
      <div class="upgrade-cards" data-category="${upgradeCategory}">${cards}</div>`;
  }

  function missionBoard() {
    const expansion = R.getExpansion(state);
    const stages = R.STAGES.map(stage => {
      const missions = R.MISSIONS.filter(mission => mission.stage === stage.id);
      const locked = !R.isMissionAvailable(state, missions[0].id);
      const offers = missions.map(mission => {
        const stars = state.bestStars[mission.id] || 0;
        const selected = R.MISSIONS[state.missionIndex]?.id === mission.id;
        const recipe = R.getRecipe(state, mission.id);
        const perk = R.getMissionReward(state, mission.id);
        const grant = R.getMissionGrant(state, mission.id);
        const grantLabel = grant.remaining ? `Up to ${money(grant.remaining)} in grants` : 'Full grant paid';
        return `<article class="mission-offer">
          <div class="offer-top"><h3>${escapeHTML(mission.name)}</h3><span class="offer-stars" role="img" aria-label="${stars} best stars">${Array.from({length:3}, (_, i) => `<span class="rating-star"${i < stars ? ' data-earned' : ''}>${I.svg('star')}</span>`).join('')}</span></div>
          <p>${escapeHTML(mission.objective || mission.description)}</p>
          <div class="offer-terms"><span>${escapeHTML(mission.arrival || mission.orbit || mission.destination)}</span><span>Launch ${mission.fee ? money(mission.fee) : 'free'}</span><span>${grantLabel}</span></div>
          ${perk ? `<div class="mission-perk" data-earned="${perk.earned}"><span aria-hidden="true">${I.svg(perk.earned ? 'check' : 'star')}</span><div><strong>${perk.earned ? 'Earned' : '3-star reward'} · ${escapeHTML(perk.name)}</strong><small>${escapeHTML(perk.detail)}</small></div></div>` : ''}
          ${locked ? '' : `<div class="offer-actions">${action(recipe.known ? 'View payload plan' : 'Plan ' + money(recipe.price), 'recipe-info', mission.id)}
          ${action(selected ? 'Keep selected' : 'Select mission', 'mission', mission.id, false, !selected)}</div>`}
        </article>`;
      }).join('');
      const unlock = locked && expansion?.stage.id === stage.id ? `<div class="expansion-card">
        <div><strong>${expansion.available ? `Save ${money(expansion.cost)} for ${escapeHTML(stage.name)}` : `Earn 3 stars on a ${escapeHTML(expansion.previousStage.name)} mission`}</strong>
        <p>${expansion.available ? 'Sell Data Cubes or claim outstanding mission grants to fund the expansion.' : `Expand for ${money(expansion.cost)} once you qualify.`}</p></div>
        ${action(`Expand for ${money(expansion.cost)}`, 'expansion', '', !expansion.available || !expansion.affordable, true)}
        ${expansion.available ? `<div class="stage-savings"><span>${money(Math.min(expansion.cost, state.wallet))} / ${money(expansion.cost)}</span><progress value="${Math.min(expansion.cost, state.wallet)}" max="${expansion.cost}" aria-label="Cash saved for the expansion"></progress></div>` : ''}
        </div>` : '';
      return `<section class="board-stage"><div class="board-heading"><h3>${escapeHTML(stage.name)}</h3><span>${escapeHTML(stage.destination || 'Earth').toUpperCase()} · ${locked ? 'LOCKED' : 'OPEN'}</span></div>${unlock}<div class="mission-offers">${offers}</div></section>`;
    }).join('');
    const loaded = Object.values(state.loadout).some(Boolean);
    return `<p class="dialog-lead">${loaded ? 'Supplies already on the launch pad stay loaded when you change missions.' : 'Improve your best result to earn the remaining grant. Three stars earn a lasting spaceport upgrade.'}</p><div class="challenge-board-link">${action('Challenges', 'open-challenges')}</div>${stages}`;
  }

  function challengesPanel() {
    const goal = C.getChallenge(state.challenge);
    const suggestion = C.recommendFocus(state.challenge);
    const picks = C.FOCUSES.map(focus => `<button type="button" class="quiet button" data-action="challenge-focus" data-value="${focus.id}" aria-pressed="${goal?.focus === focus.id}"><strong>${escapeHTML(focus.label)}</strong><small>${escapeHTML(focus.description)}</small></button>`).join('');
    const recommended = suggestion && suggestion.id !== goal?.focus ? `<div class="challenge-suggestion">
      <div><strong>Suggested focus · ${escapeHTML(suggestion.label)}</strong><p>${escapeHTML(suggestion.reason)}</p></div>
      ${action('Use suggestion', 'challenge-focus', suggestion.id)}
      </div>` : '';
    const active = goal ? `<section class="challenge-card">
      <div class="challenge-card-head"><h3>${escapeHTML(goal.label)} goal</h3><span class="eyebrow">Level ${goal.tier} / ${goal.maxTier}</span></div>
      <p>${escapeHTML(goal.objective)}</p>
      <div class="challenge-progress"><progress max="${goal.target}" value="${goal.progress}" aria-label="Goal progress"></progress><strong>${goal.progress} / ${goal.target}</strong></div>
      ${goal.distinctTarget ? `<p>${goal.distinct} / ${goal.distinctTarget} different ${goal.focus === 'operations' ? 'factories' : 'missions'}</p>` : ''}
      <p>${goal.complete ? `Goal complete. Personal best level ${goal.rank}.` : escapeHTML(goal.hint)}</p>
      <div class="challenge-actions">
        ${goal.complete ? action(goal.tier === goal.maxTier ? 'Start another goal' : 'Start next level', 'challenge-advance', '', false, true) : ''}
        ${action('Pause challenges', 'challenge-pause')}
      </div>
      ${goal.rank && !goal.complete ? `<p class="challenge-note">Personal best level ${goal.rank}</p>` : ''}
      </section>` : '<p class="dialog-lead">Choose a focus above to start a personal goal.</p>';
    return `<p class="dialog-lead">Pick what you enjoy. Complete goals to unlock tougher ones.</p>
      ${recommended}<div class="challenge-picker" role="group" aria-label="Challenge focus">${picks}</div>${active}
      <p class="challenge-note">Flight and Research goals can ease after two flights that miss the goal’s star or science requirement. Your recent play stays on this device. Switch or pause anytime.</p>`;
  }

  function recipePanel() {
    const recipe = R.getRecipe(state, recipeSelection ?? state.missionIndex);
    if (!recipe) return '<p class="dialog-lead">Select a mission to see its payload plan.</p>';
    byId('panel-title').textContent = recipe.mission.name;
    byId('panel-kicker').textContent = 'PAYLOAD PLAN';
    if (recipe.known) {
      return `<p class="dialog-lead">${recipe.source === 'purchase' ? 'Purchased payload plan.' : 'Unlocked for free in flight.'} Match these quantities for the best chance of success.</p>
        ${payloadChips(recipe.ingredients)}
        <div class="recipe-peak"><strong>${percent(recipe.peakOdds)}</strong><span>Best chance to reach the destination</span></div>
        <div class="dialog-bottom">${action('Mission board', 'back-to-board')}</div>`;
    }
    return `<div class="recipe-hidden"><span aria-hidden="true">${I.svg('paper')}</span><div><h3>Payload plan locked</h3><p>Earn three stars to unlock the best payload for free. Flying the exact payload also unlocks it, even on a failed launch.</p></div></div>
      <p class="dialog-lead recipe-funds">Available cash <strong>${money(state.wallet)}</strong></p>
      <div class="dialog-bottom">${action('Buy plan · ' + money(recipe.price), 'buy-recipe', recipe.mission.id, !recipe.affordable, true)}
      ${action('Mission board', 'back-to-board')}</div>`;
  }

  function afterSuccessfulFlight(report) {
    if (report !== state.report || report.stars !== 3) return '';
    const index = R.MISSIONS.findIndex(mission => mission.id === report.mission?.id);
    const next = index < 0 ? null : R.MISSIONS[index + 1];
    const expansion = R.getExpansion(state);
    let detail = 'Replay this flight or choose another from the mission board.';
    let advance = action('Choose another mission', 'report-board', '', false, true);
    let section = '';
    if (next && R.isMissionAvailable(state, next.id)) {
      detail = `Next mission: ${next.name}.`;
      advance = action(`Start ${next.name}`, 'report-next', next.id, false, true);
      if (expansion?.available && expansion.affordable && expansion.previousStage.id === report.mission.stage) {
        section = action(`Open ${expansion.stage.name} · ${money(expansion.cost)}`, 'report-next', expansion.stage.missionIds[0]);
      }
    } else if (next && expansion?.stage.id === next.stage && expansion.available) {
      if (expansion.affordable) {
        detail = `Open ${expansion.stage.name} to start ${next.name}.`;
        advance = action(`Unlock for ${money(expansion.cost)}`, 'report-next', next.id, false, true);
      } else {
        detail = `Save ${money(expansion.cost - state.wallet)} more to open ${expansion.stage.name}.`;
        advance = action('See expansion progress', 'report-board', '', false, true);
      }
    }
    return `<section class="report-next" aria-label="What’s next">
      <div><h3>What’s next?</h3><p>${escapeHTML(detail)}</p></div>
      <div class="report-next-actions">${action('Stay on this mission', 'report-stay')}${advance}${section}</div>
    </section>`;
  }

  function renderReport(report) {
    const verdicts = {low:'Too low', high:'Too high', risk:'Thin margin', good:'Good'};
    const title = report.mission?.name || 'Mission';
    byId('panel-kicker').textContent = title.toUpperCase() + ' / FLIGHT REPORT';
    byId('panel-title').textContent = resultLabels[report.status] || 'Flight report';
    dialog.dataset.result = report.stars === 3 ? 'success' : report.stars ? 'partial' : 'failed';
    const starMarks = [0, 1, 2].map(i => `<span${i < report.stars ? ' data-earned' : ''}>${I.svg('star')}</span>`).join('');
    return `<div class="report-stars" role="img" aria-label="${report.stars} out of 3 stars">${starMarks}</div>
      <p class="dialog-lead">${escapeHTML(report.cause)}</p>
      ${typeof report.odds === 'number' ? `<div class="report-chance"><strong>${percent(report.odds)}</strong> chance to reach the destination</div>` : ''}
      ${report.campaignCompleted ? '<div class="report-discovery"><strong>Campaign complete</strong> Solar Probe completed its flyby.</div>' : ''}
      ${report.unlockedReward ? `<div class="mission-perk report-perk" data-earned="true"><span aria-hidden="true">${I.svg('star')}</span><div><strong>${escapeHTML(report.unlockedReward.name)} unlocked</strong><small>${escapeHTML(report.unlockedReward.detail)}</small></div></div>` : ''}
      ${report.recipeDiscovered ? `<div class="report-discovery"><strong>Payload plan unlocked for free</strong>${payloadChips(report.discoveredPlan || report.loadout)}</div>` : ''}
      <div class="report-reward">${report.grant ? `<span>+${money(report.grant)} GRANT</span>` : ''}${report.output ? `<span>+${decimal(report.output)} CUBES/S</span>` : ''}${report.feeRefund ? `<span>+${money(report.feeRefund)} FEE REFUND</span>` : ''}${report.specialCash ? `<span class="special-reward">${I.svg('star')} +${money(report.specialCash)} ELITE BONUS</span>` : ''}${report.stars && report.specialBonus?.downlink ? `<span class="special-reward">${I.svg('star')} +${percent(report.specialBonus.downlink)} PRIZE DATA</span>` : ''}${report.specialBonus?.odds ? `<span class="special-reward">${I.svg('star')} +${percent(report.specialBonus.odds)} PRIME ODDS</span>` : ''}</div>
      ${report.stars && !report.grant && typeof report.signalOutput === 'number' ? '<p class="inline-note">Your best grant for this mission has already been paid.</p>' : ''}
      ${report.challengeNote ? `<p class="challenge-report">${escapeHTML(report.challengeNote)}</p>` : ''}
      ${afterSuccessfulFlight(report)}
      <div class="dialog-list">${gaugeKeys.map(key => {
        const gauge = report.gauges[key];
        if (!gauge) return '';
        return row(gauge.label, gauge.message, `<span class="verdict" data-tone="${gauge.status}">${verdicts[gauge.status] || 'Good'}</span>`, gaugeItems[key]);
      }).join('')}</div>
      ${report.tip ? `<div class="report-tip">${escapeHTML(report.tip.text || report.tip)}${report.tip.url ? ` <a href="${escapeHTML(report.tip.url)}" target="_blank" rel="noopener">${escapeHTML(report.tip.source || 'NASA resource')} ${I.svg('arrow')}</a>` : ''}</div>` : ''}
      ${report === state.report && report.stars === 3 ? '' : `<div class="dialog-bottom">${action('Back to spaceport', 'close', '', false, true)}</div>`}`;
  }

  function drawPanel() {
    byId('panel-kicker').textContent = 'SPACEPORT OPERATIONS';
    const headings = {guide:'Field guide', stations:'Facilities', settings:'Settings', skins:'Appearance', upgrades:'Upgrades', challenges:'Challenges', log:'Flight log', missions:'Choose a mission', recipe:'Payload plan'};
    byId('panel-title').textContent = headings[activePanel] || '';
    if (activePanel === 'facility') {
      const atPad = yard.nearby === facilitySelection;
      byId('panel-kicker').textContent = atPad ? 'AT THE PAD' : 'FACILITY';
      byId('panel-title').textContent = R.FACILITIES[facilitySelection].name;
      stations.render(panel, state, facilitySelection, atPad, facilitySelection !== 'cargo' || state.facilities.cargo.unlocked);
    } else if (activePanel === 'guide') {
      panel.innerHTML = `<p class="dialog-lead">Walk the yard to turn satellite data into fuel, hardware, and new missions.</p><div class="dialog-list">
        ${row('Move around the yard', 'Use WASD or the arrow keys. Tap the yard to walk there, or drag to steer with the touch joystick.')}
        ${row('Inspect a facility', 'Click or tap a building, its name, or its pad to see what goes in and what comes out.', '', 'data')}
        ${row('Read the pad signs', 'Icons show what a pad takes and what it makes. The ready count shows items on hand and the most it can hold.')}
        ${row('Walk up to collect or deliver', 'Pads handle supplies automatically. Wait at a machine to collect finished goods or at the Grant Office to collect cash.')}
        ${row('Set your payload', 'Choose exact amounts when loading and unloading at the Launch Pad. Walk to Return Supplies to send extras back to stock.')}
        ${row('Earn the Grant Bonus', `Sell four Data Cubes at the Grant Office to add ${money(R.GRANT_BONUS)} to your payout. The counter shows progress toward the next bonus.`)}
        ${row('Hire a crew', 'Hire workers from Upgrades to sell cubes, supply machines, stock the Cargo Shelf, or bank grants. Each can be paused separately.')}
        ${row('Choose a mission', 'Each first three-star flight earns its own spaceport upgrade. Earn 3 stars in the latest stage and save up to open the next one.')}
        ${row('Improve on a mission', 'Beat your best result to earn the rest of its grant. Only your strongest downlink for each mission supplies Data Cubes.')}
        ${row('Pick a challenge', 'Choose Flight, Operations, or Research for optional goals that grow tougher as you complete them.')}
        ${row('Unlock a payload plan', 'Earn three stars or fly the exact payload to get its plan for free. Extra and missing supplies lower launch odds.', '', 'fuel')}
        </div><p class="report-tip">The flight model uses game units for mass, power and data. <a href="${nasaMissionDesign}" target="_blank" rel="noopener">NASA’s guide to designing science missions ${I.svg('arrow')}</a></p>`;
    } else if (activePanel === 'missions') {
      panel.innerHTML = missionBoard();
    } else if (activePanel === 'recipe') {
      panel.innerHTML = recipePanel();
    } else if (activePanel === 'stations') {
      panel.innerHTML = '<div class="dialog-list">' + Object.keys(R.FACILITIES).map(id => {
        const spec = R.FACILITIES[id];
        const facility = state.facilities[id];
        const description = stations.summary(id);
        return row(spec.name, `${description}${!facility.unlocked && !facility.output ? ' · Locked' : ''}`, action('Details', 'inspect-facility', id), spec.item && labels[spec.item] ? spec.item : '');
      }).join('') + '</div>';
    } else if (activePanel === 'upgrades') {
      panel.innerHTML = upgradesPanel();
    } else if (activePanel === 'challenges') {
      panel.innerHTML = challengesPanel();
    } else if (activePanel === 'log') {
      const entries = state.history || [];
      const flights = entries.slice().reverse().slice(0, 15).map((report, index) => row(report.mission?.name || 'Mission', report.cause, action('Report', 'past-report', String(entries.length - 1 - index)))).join('');
      panel.innerHTML = flights ? '<div class="dialog-list">' + flights + '</div>' : '<p class="dialog-lead">Your first report will appear after launch.</p>';
    } else if (activePanel === 'skins') {
      panel.innerHTML = skinsPanel();
      paintSkins();
    } else if (activePanel === 'settings') {
      byId('panel-kicker').textContent = `${document.title.toUpperCase()} ${version}`;
      panel.innerHTML = `<div class="dialog-list">
        ${row('Appearance', 'Spaceship & crew skins', action('Customize', 'open-skins'))}
        ${row('Music', 'Play the background theme. It changes for each destination.', action(music ? 'On' : 'Off', 'music'))}
        ${row('Sound effects', 'Play short sounds for collecting, building and launching.', action(sound ? 'On' : 'Off', 'sound'))}
        ${row('Start a new spaceport', confirmReset ? 'This will erase the flight history and upgrades on this device.' : 'Erase the local save and begin with First Light.', action(confirmReset ? 'Erase and restart' : 'New game', 'reset', '', false, confirmReset))}
        </div>${confirmReset ? '<p class="inline-note danger">The previous save will be removed.</p>' : ''}`;
    } else if (activePanel === 'report' && loadedReport) {
      panel.innerHTML = renderReport(loadedReport);
    }
  }

  function skinsPanel() {
    state.cosmetics = S.normalize(state.cosmetics, state);
    const ship = skinCategory === 'ship';
    const selected = ship ? state.cosmetics.ship : state.cosmetics.crew[skinRole];
    return `<div class="skin-tabs" role="group" aria-label="Appearance category">${['ship','crew'].map(id => `<button class="quiet button" data-action="skin-category" data-value="${id}" aria-pressed="${skinCategory === id}">${id === 'ship' ? 'Spaceship' : 'Crew'}</button>`).join('')}</div>
      ${ship ? '' : `<label class="skin-role">Dress<select id="skin-role">${Object.entries(S.roles).map(([id,name]) => `<option value="${id}" ${id === skinRole ? 'selected' : ''}>${name}</option>`).join('')}</select></label>`}
      <div class="skin-grid">${(ship ? S.ships : S.suits).map(skin => `<button class="skin-card" type="button" data-action="skin-select" data-value="${skin.id}" aria-pressed="${selected === skin.id}" ${S.unlocked(state, skinCategory, skin.id) ? '' : 'disabled'}><canvas width="280" height="304" data-skin="${skin.id}" aria-hidden="true"></canvas><strong>${skin.name}</strong><small>${skin.detail}</small><span class="skin-state">${S.unlocked(state, skinCategory, skin.id) ? (selected === skin.id ? 'Equipped' : 'Equip') : 'Locked'}</span>${S.unlocked(state, skinCategory, skin.id) ? '' : `<small class="skin-requirement">${skin.requirement}</small>`}</button>`).join('')}</div>
      <p class="skin-note">Cosmetic only. Original tributes, not official endorsements.</p>`;
  }

  function paintSkins() {
    for (const canvas of panel.querySelectorAll('[data-skin]')) {
      const ctx = canvas.getContext('2d');
      const ship = skinCategory === 'ship';
      ctx.translate(140, ship ? 282 : 240);
      ctx.scale(ship ? 1.7 : 3.6, ship ? 1.7 : 3.6);
      if (ship) window.SpaceportMachines.rocket(ctx, {shipSkin:canvas.dataset.skin,time:0,thrust:0});
      else window.SpaceportYard.drawSkinPreview(ctx,canvas.dataset.skin,skinRole);
    }
  }
  panel.addEventListener('change', event => {
    if (event.target.id !== 'skin-role' || !Object.hasOwn(S.roles,event.target.value)) return;
    skinRole = event.target.value;
    drawPanel(); byId('skin-role').focus({preventScroll:true});
  });

  function refreshUpgrades(command, value) {
    const scroll = command === 'upgrade-category' ? 0 : dialog.scrollTop;
    drawPanel();
    dialog.scrollTop = scroll;
    const controls = [...panel.querySelectorAll('button[data-action]')];
    const same = controls.find(button => button.dataset.action === command && button.dataset.value === value && !button.disabled);
    const hired = command === 'upgrade' && controls.find(button => button.dataset.action === 'worker-toggle' && `${button.dataset.value}:` === value);
    (same || hired || controls.find(button => button.getAttribute('aria-pressed') === 'true') || byId('close-panel')).focus({preventScroll:true});
  }

  function openDialog(name, source) {
    if (!dialog.open) {
      originButton = source || document.activeElement;
      dialog.showModal();
    }
    activePanel = name;
    dialog.dataset.panel = name;
    confirmReset = false;
    yard.setPaused(true);
    drawPanel();
  }

  function startLaunch() {
    if (flightTimer || dialog.open) return;
    const report = R.launch(state);
    if (!report) return;
    const challengeResult = C.recordLaunch(state.challenge, report);
    if (challengeResult === 'complete' || challengeResult === 'eased') {
      const goal = C.getChallenge(state.challenge);
      report.challengeNote = challengeResult === 'complete' ? `${goal.label} challenge complete. Personal best level ${goal.rank}.`
        : `${goal.label} goal eased to level ${goal.tier}. Your progress carries over.`;
    }
    preparingReplay = false;
    loadedReport = report;
    yard.burstLaunch();
    Music?.duck(3.2);
    launchRumble();
    flightTimer = window.setTimeout(() => {
      flightTimer = 0;
      openDialog('report', byId('launch'));
      if (report.stars) {
        if (sound) Music?.duck(report.stars === 3 ? 2.4 : 1.4);
        fanfare(report.stars);
        window.SpaceportCelebrate?.burst(report.stars);
      }
      updateHUD();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 2700);
    updateHUD();
    store();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open]');
    if (!button || flightTimer) return;
    if (button.dataset.open === 'manifest') {
      openFacility('launch', button);
      return;
    }
    if (button.dataset.open === 'recipe') recipeSelection = null;
    openDialog(button.dataset.open, button);
  });
  byId('launch').addEventListener('click', startLaunch);
  byId('yard-launch').addEventListener('click', startLaunch);
  byId('locate').addEventListener('click', () => {
    if (objective.panelName === 'manifest') {
      openFacility('launch', byId('locate'));
      return;
    }
    if (objective.panelName) {
      openDialog(objective.panelName, byId('locate'));
      return;
    }
    if (!objective.id) return;
    yard.sendTo(objective.id, objective.zone);
    canvas.focus({preventScroll:true});
  });
  byId('close-panel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (activePanel === 'report' && state.report) {
      state.report = null;
      store();
    }
    activePanel = '';
    yard.setPaused(false);
    if (originButton?.isConnected && !originButton.disabled) originButton.focus({preventScroll:true});
    else canvas.focus({preventScroll:true});
    updateHUD();
    const callback = pendingDialogAction;
    pendingDialogAction = null;
    callback?.();
  });
  dialog.addEventListener('input', event => {
    if (activePanel !== 'facility' || !['launch', 'cargo'].includes(facilitySelection) || !event.target.matches('.transfer-quantity')) return;
    event.target.dataset.edited = 'true';
    stations.refresh(panel, state, facilitySelection);
  });
  dialog.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const {action: command, value = ''} = button.dataset;
    const [id, qualifier] = value.split(':');
    if (command === 'close') dialog.close();
    else if (command === 'open-skins') {openDialog('skins');byId('close-panel').focus();}
    else if (command === 'skin-category') {
      if (!['ship','crew'].includes(value)) return;
      skinCategory = value; drawPanel();
      panel.querySelector(`[data-action="skin-category"][data-value="${value}"]`)?.focus({preventScroll:true});
    } else if (command === 'skin-select') {
      const target = skinCategory === 'ship' ? 'ship' : skinRole;
      state.cosmetics = S.select(state.cosmetics, target, value, state);
      store(); drawPanel();
      panel.querySelector(`[data-action="skin-select"][data-value="${value}"]`)?.focus({preventScroll:true});
    } else if (command === 'goto') {
      afterClose(() => yard.sendTo(id, qualifier));
    } else if (command === 'open-challenges') {
      openDialog('challenges');
      byId('close-panel').focus();
    } else if (command === 'challenge-focus' || command === 'challenge-pause' || command === 'challenge-advance') {
      if (command === 'challenge-advance') C.advance(state.challenge);
      else C.selectFocus(state.challenge, command === 'challenge-pause' ? null : value);
      store();
      drawPanel();
      (panel.querySelector('[aria-pressed="true"]') || panel.querySelector('.challenge-picker button') || byId('close-panel')).focus({preventScroll:true});
    } else if (command === 'report-stay') {
      preparingReplay = true;
      dialog.close();
    } else if (command === 'report-board') {
      afterClose(() => openDialog('missions', byId('mission-board')));
    } else if (command === 'report-next') {
      afterClose(() => {
        const next = R.MISSIONS.find(mission => mission.id === id);
        const expansion = R.getExpansion(state);
        if (!R.isMissionAvailable(state, id) && next && expansion?.stage.id === next.stage && R.buyExpansion(state)) {
          notify(`${expansion.stage.name} is open.`);
          chirp('unlock');
        }
        if (R.selectMission(state, id)) {
          preparingReplay = true;
          updateHUD();
          store();
        } else openDialog('missions', byId('mission-board'));
      });
    } else if (command === 'upgrade-category' && Object.hasOwn(upgradeTabs, value)) {
      upgradeCategory = value;
      refreshUpgrades(command, value);
    } else if (command === 'worker-toggle') {
      const worker = R.getWorker(state, id);
      if (worker?.hired && R.setWorkerEnabled(state, id, !worker.enabled)) store();
      refreshUpgrades(command, value);
    } else if (command === 'upgrade') {
      if (R.buyUpgrade(state, id, qualifier || undefined)) chirp('unlock');
      refreshUpgrades(command, value);
      store();
    } else if (command === 'inspect-facility') {
      openFacility(id);
    } else if (command === 'station-transfer') {
      if (!['launch', 'cargo'].includes(facilitySelection) || yard.nearby !== facilitySelection) return;
      const quantity = button.closest('[data-operation]').querySelector('input');
      const count = quantity.valueAsNumber;
      const result = R.transferAtStation(state, facilitySelection, value, count);
      const feedback = panel.querySelector('[data-station-feedback]');
      if (result) {
        yard.noteEvent(result);
        chirp(result.type);
        feedback.textContent = stations.confirmation(value, count);
        if (quantity) quantity.dataset.edited = 'false';
        store();
      } else {
        feedback.textContent = 'Check the available quantity and try again.';
      }
      stations.refresh(panel, state, facilitySelection);
    } else if (command === 'station-recipe') {
      recipeSelection = null;
      openDialog('recipe');
    } else if (command === 'station-launch') {
      afterClose(startLaunch);
    } else if (command === 'mission') {
      if (R.selectMission(state, id)) {
        preparingReplay = true;
        dialog.close();
        store();
      }
    } else if (command === 'recipe-info') {
      recipeSelection = id;
      openDialog('recipe');
    } else if (command === 'back-to-board') {
      openDialog('missions');
    } else if (command === 'buy-recipe') {
      if (R.buyRecipe(state, id)) {
        chirp('unlock');
        store();
      }
      drawPanel();
      byId('close-panel').focus();
    } else if (command === 'expansion') {
      const expansion = R.getExpansion(state);
      if (expansion && R.buyExpansion(state)) {
        notify(`${expansion.stage.name} is open. Choose your next flight!`);
        chirp('unlock');
        store();
      }
      drawPanel();
      byId('close-panel').focus();
    } else if (command === 'past-report') {
      loadedReport = (state.history || state.log || [])[Number(id)];
      if (loadedReport) openDialog('report');
    } else if (command === 'music') {
      setMusic(!music);
      drawPanel();
    } else if (command === 'sound') {
      sound = !sound;
      try { localStorage.setItem('pocket-spaceport-sound', sound ? 'on' : 'off'); } catch {}
      chirp('pickup');
      drawPanel();
    } else if (command === 'reset') {
      if (!confirmReset) {
        confirmReset = true;
        drawPanel();
        return;
      }
      state = R.createState();
      state.challenge = C.normalize();
      previousWallet = state.wallet;
      preparingReplay = false;
      loadedReport = null;
      lastObjective = '';
      yard.reset();
      byId('notice').hidden = true;
      store();
      dialog.close();
    }
    updateHUD();
  });

  function frame(now) {
    animationFrame = null;
    if (document.hidden) return;
    const dt = Math.max(0, Math.min(.07, (now - lastFrame) / 1000));
    lastFrame = now;
    if ((!dialog.open || activePanel === 'facility') && !flightTimer) R.tick(state, dt);
    yard.frame(state, dt);
    if (noticeTimer && now > noticeTimer) {
      byId('notice').hidden = true;
      noticeTimer = 0;
    }
    if (now > nextUpdate) {
      updateHUD();
      if (activePanel === 'facility') stations.refresh(panel, state, facilitySelection);
      nextUpdate = now + 300;
    }
    if (now > nextSave) {
      store();
      nextSave = now + 4000;
    }
    animationFrame = requestAnimationFrame(frame);
  }
  window.addEventListener('pagehide', store);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      store();
    } else if (animationFrame === null) {
      lastFrame = performance.now();
      animationFrame = requestAnimationFrame(frame);
    }
  });
  updateHUD();
  // Browsers only allow audio after a click or key press, so music starts with the splash button.
  const startMusic = () => { if (music) Music?.start(); };
  if (window.SpaceportSplash?.open) window.addEventListener('splash:closed', startMusic, {once: true});
  else {
    const firstInput = () => {
      startMusic();
      window.removeEventListener('pointerdown', firstInput);
      window.removeEventListener('keydown', firstInput);
    };
    window.addEventListener('pointerdown', firstInput);
    window.addEventListener('keydown', firstInput);
  }
  if (state.report) {
    const showReport = () => {
      loadedReport = state.report;
      openDialog('report', byId('launch'));
    };
    if (window.SpaceportSplash?.open) window.addEventListener('splash:closed', showReport, {once: true});
    else showReport();
  }
  if (!document.hidden) animationFrame = requestAnimationFrame(frame);
})();

