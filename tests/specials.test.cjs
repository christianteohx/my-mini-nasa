const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../rules.js");

const R = globalThis.SpaceportRules;

function runBatches(state, id, batches) {
  const facility = state.facilities[id];
  const spec = R.FACILITIES[id];
  let special = 0;
  let normal = 0;
  for (let i = 0; i < batches; i++) {
    facility.input = spec.cubes;
    R.tick(state, R.getProductionCycle(state, id));
    special += facility.special;
    normal += facility.output;
    facility.special = 0;
    facility.output = 0;
  }
  return { special, normal };
}

test("factories occasionally finish a batch as a special product", () => {
  const state = R.createState(5);
  state.facilities.engineering.unlocked = true;
  state.facilities.engineering.output = 0;
  const { special, normal } = runBatches(state, "engineering", 1000);
  assert.equal(special + normal, 1000);
  assert.ok(special > 60 && special < 150, `expected about 10% specials, got ${special}`);
  assert.equal(state.facilities.engineering.specialMade, special);
  assert.equal(R.getSpecialChance(state, "fuel"), 0);
});

test("the special chance upgrade needs cash and a cleared mission", () => {
  const state = R.createState(5);
  state.wallet = 1000;
  state.facilities.engineering.unlocked = true;
  const before = R.getUpgrade(state, "quality", "engineering");
  assert.equal(before.currentLabel, "10% chance");
  assert.equal(before.nextLabel, "20% chance");
  assert.deepEqual(before.requirement, { mission: "Landsat 1", met: false });
  assert.equal(R.buyUpgrade(state, "quality", "engineering"), false);

  state.bestStars.m2 = 3;
  assert.equal(R.buyUpgrade(state, "quality", "engineering"), true);
  assert.equal(state.wallet, 700);
  assert.equal(R.getSpecialChance(state, "engineering"), 0.2);
  assert.equal(R.getUpgrade(state, "quality", "engineering").maxed, true);

  state.facilities.engineering.output = 0;
  const { special } = runBatches(state, "engineering", 1000);
  assert.ok(special > 140 && special < 260, `expected about 20% specials, got ${special}`);
});

test("walking onto a factory pad collects specials before regular output", () => {
  const state = R.createState(5);
  state.wallet = 300;
  R.unlockFacility(state, "fuel");
  R.unlockFacility(state, "engineering");
  const engineering = state.facilities.engineering;
  engineering.output = 2;
  engineering.special = 1;
  const visit = R.interact(state, "engineering", "output");
  assert.equal(visit.type, "batch");
  assert.deepEqual(visit.events.map(({ item, count }) => ({ item, count })), [
    { item: "primePart", count: 1 },
    { item: "part", count: 2 },
  ]);
  assert.equal(state.inventory.primePart, 1);
  assert.equal(state.inventory.part, 2);
  assert.equal(engineering.special, 0);
  assert.equal(R.getInventoryCount(state), 3);
});

test("machine speed upgrades chain through special products", () => {
  const state = R.createState(5);
  state.wallet = 2000;
  R.unlockFacility(state, "fuel");
  R.unlockFacility(state, "engineering");
  R.unlockFacility(state, "research");

  const fuel = R.getUpgrade(state, "facility", "fuel");
  assert.deepEqual(fuel.items, { item: "primePart", count: 1, have: 0, met: false });
  assert.equal(fuel.affordable, false);

  // Specials waiting at their own factory count too.
  state.facilities.engineering.special = 1;
  assert.equal(R.buyUpgrade(state, "facility", "fuel"), true);
  assert.equal(state.facilities.engineering.special, 0);
  assert.equal(state.facilities.fuel.speed, 1);
  assert.deepEqual(R.getUpgrade(state, "facility", "fuel").items, { item: "primePart", count: 2, have: 0, met: false });

  assert.equal(R.getUpgrade(state, "facility", "engineering").items.item, "prizePaper");
  assert.equal(R.getUpgrade(state, "facility", "research").items.item, "eliteCrew");
  assert.equal(R.getUpgrade(state, "facility", "academy").items.item, "primePart");
  assert.equal(R.getUpgrade(state, "facility", "grant").items, null);
});

test("special products count as their base item and add launch rewards", () => {
  const plain = R.createState(9);
  const boosted = R.createState(9);
  for (const state of [plain, boosted]) {
    state.wallet = 1000;
    state.stageIndex = 1;
    assert.equal(R.selectMission(state, "m4"), true);
    state.loadout = { fuel: 2, part: 4, paper: 2, crew: 1 };
  }
  boosted.loadout.part = 3;
  boosted.loadout.paper = 1;
  boosted.loadout.crew = 0;
  boosted.specialLoadout = { primePart: 1, prizePaper: 1, eliteCrew: 1 };

  const base = R.inspectLaunch(plain);
  const special = R.inspectLaunch(boosted);
  assert.equal(special.exact, true);
  assert.equal(special.mass, base.mass);
  assert.equal(special.odds, Math.round((base.odds + 0.05) * 100) / 100);
  assert.deepEqual(special.specialBonus, { primePart: 1, prizePaper: 1, eliteCrew: 1, odds: 0.05, downlink: 0.3, cash: 0.5 });

  const combined = { fuel: 2, part: 4, paper: 2, crew: 1 };
  const report = R.evaluateLaunch(combined, R.MISSIONS[3], () => 0, boosted.specialLoadout);
  const plainReport = R.evaluateLaunch(combined, R.MISSIONS[3], () => 0);
  assert.equal(report.stars, 3);
  assert.ok(Math.abs(report.output - plainReport.output * 1.3) < 1e-9);

  boosted.rngSeed = 1;
  const before = boosted.wallet;
  const flight = R.launch(boosted);
  if (flight.stars > 0) {
    assert.equal(flight.specialCash, 250);
    assert.equal(boosted.wallet, before - 150 + flight.grant + 250);
  } else {
    assert.equal(flight.specialCash, 0);
  }
  assert.deepEqual(boosted.specialLoadout, { primePart: 0, prizePaper: 0, eliteCrew: 0 });
});

test("specials load, unload and survive a save", () => {
  const state = R.createState(5);
  state.inventory.prizePaper = 2;
  assert.equal(R.transferAtStation(state, "launch", "load:prizePaper", 2).count, 2);
  assert.equal(state.specialLoadout.prizePaper, 2);
  assert.equal(R.transferAtStation(state, "launch", "unload:prizePaper", 1).count, 1);
  assert.equal(state.inventory.prizePaper, 1);

  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value), getItem: (key) => values.get(key) };
  R.saveState(state, storage);
  const restored = R.loadState(storage);
  assert.equal(restored.inventory.prizePaper, 1);
  assert.equal(restored.specialLoadout.prizePaper, 1);

  // Saves from before specials gain the new fields.
  const legacy = JSON.parse(values.get(R.SAVE_KEY));
  delete legacy.specialLoadout;
  delete legacy.qualitySeed;
  for (const item of R.SPECIAL_ITEMS) delete legacy.inventory[item];
  for (const facility of Object.values(legacy.facilities)) {
    delete facility.special;
    delete facility.quality;
    delete facility.specialMade;
  }
  values.set(R.SAVE_KEY, JSON.stringify(legacy));
  const migrated = R.loadState(storage);
  assert.deepEqual(migrated.specialLoadout, { primePart: 0, prizePaper: 0, eliteCrew: 0 });
  assert.equal(migrated.inventory.eliteCrew, 0);
  assert.equal(migrated.facilities.academy.special, 0);
  assert.equal(migrated.facilities.academy.quality, 0);
  assert.ok(migrated.qualitySeed > 0);
});

for (const [factory, item] of Object.entries(R.SPECIALS)) {
  test(`Scrap pad discards carried ${item}`, () => {
    const state = R.createState(5);
    state.facilities.scrap.unlocked = true;
    state.inventory[item] = 2;
    assert.equal(R.interact(state, 'scrap', 'input').item, item);
        assert.equal(state.inventory[item], 0);
    assert.equal(R.interact(state, 'scrap', 'input'), null);
  });

  test(`Returns preserve ${item} identity and save round-trip`, () => {
    const state = R.createState(5);
    state.facilities[factory].unlocked = true;
    state.facilities[factory].output = 0;
    state.inventory[item] = 2;
    const normalBefore = state.facilities[factory].output;
    assert.equal(R.getReturnsCount(state), 2);
    assert.equal(R.interact(state, 'returns', 'input').count, 2);
    assert.equal(state.inventory[item], 0);
    assert.equal(state.facilities[factory].special, 2);
    assert.equal(state.facilities[factory].output, normalBefore);
    const restored = R.loadState({getItem: () => JSON.stringify(state)});
    assert.equal(restored.facilities[factory].special, 2);
    assert.equal(R.transferAtStation(restored, factory, `take:${item}`, 2).count, 2);
    assert.equal(restored.inventory[item], 2);
  });

  test(`${factory} returns and Store enforce shared capacity without losing specials`, () => {
    const state = R.createState(5);
    const facility = state.facilities[factory];
    facility.unlocked = true;
    const regular = R.FACILITIES[factory].item;
    const capacity = R.getFacilityOutputCapacity(state, factory);
    facility.output = capacity - 2;
    facility.special = 1;
    state.inventory[regular] = 1;
    state.inventory[item] = 2;
    assert.equal(R.getReturnsCount(state), 1);
    R.returnSupplies(state);
    assert.equal(facility.output + facility.special, capacity);
    assert.equal(state.inventory[item], 2);
    assert.equal(R.transferAtStation(state, factory, `store:${item}`, 1), null);
    assert.equal(R.getReturnsCount(state), 0);
    assert.equal(R.returnSupplies(state), null);
    facility.output--;
    assert.equal(R.transferAtStation(state, factory, `store:${item}`, 1).count, 1);
    assert.equal(facility.special, 2);
    assert.equal(facility.output + facility.special, capacity);
    assert.equal(state.inventory[item], 1);
    state.inventory[regular] = 1;
    assert.equal(R.transferAtStation(state, factory, `store:${regular}`, 1), null);
  });
}

test('specials are retained when their factory is locked, including with Cargo unlocked', () => {
  const state = R.createState(5);
  state.facilities.cargo.unlocked = true;
  for (const item of R.SPECIAL_ITEMS) state.inventory[item] = 1;
  assert.equal(R.getReturnsCount(state), 0);
  assert.equal(R.returnSupplies(state), null);
  for (const item of R.SPECIAL_ITEMS) assert.equal(state.inventory[item], 1);
  assert.equal(state.facilities.cargo.output, 0);
});

test('Scrap clears all ordinary and special inventory without altering loaded specials', () => {
  const state = R.createState(5);
  state.facilities.scrap.unlocked = true;
  state.inventory.data = 1;
  state.inventory.prizePaper = 1;
  state.specialLoadout.primePart = 1;
  const result = R.interact(state, 'scrap', 'input');
  assert.equal(result.type, 'batch');
  assert.equal(state.inventory.data, 0);
  assert.equal(state.inventory.prizePaper, 0);
  assert.equal(R.interact(state, 'scrap', 'input'), null);
  assert.equal(state.specialLoadout.primePart, 1);
});
