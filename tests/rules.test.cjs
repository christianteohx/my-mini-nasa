const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../rules.js");

const R = globalThis.SpaceportRules;
const { MISSIONS } = R;
const examples = [
  { loadout: { fuel: 1, part: 1, paper: 0, crew: 0 }, mass: 3, output: 1, fuelNeeded: 1, odds: 0.92 },
  { loadout: { fuel: 2, part: 2, paper: 1, crew: 0 }, mass: 7, output: 1, fuelNeeded: 1, odds: 0.88 },
  { loadout: { fuel: 2, part: 4, paper: 3, crew: 0 }, mass: 11, output: 1.25, fuelNeeded: 2, odds: 0.86 },
  { loadout: { fuel: 2, part: 4, paper: 2, crew: 1 }, mass: 13, output: 1.875, fuelNeeded: 2, odds: 0.84 },
  { loadout: { fuel: 3, part: 3, paper: 2, crew: 0 }, mass: 11, output: 2, fuelNeeded: 3, odds: 0.82 },
  { loadout: { fuel: 4, part: 3, paper: 2, crew: 0 }, mass: 13, output: 2.2, fuelNeeded: 4, odds: 0.80 },
  { loadout: { fuel: 4, part: 5, paper: 4, crew: 0 }, mass: 17, output: 2.75, fuelNeeded: 4, odds: 0.78 },
  { loadout: { fuel: 5, part: 6, paper: 5, crew: 0 }, mass: 21, output: 3.5, fuelNeeded: 5, odds: 0.76 },
];

for (const [index, example] of examples.entries()) {
  test(MISSIONS[index].name + " exact build peaks below guaranteed success", () => {
    const mission = MISSIONS[index];
    const report = R.evaluateLaunch(example.loadout, mission, () => example.odds - 0.01);
    assert.equal(report.stars, 3);
    assert.equal(report.exact, true);
    assert.equal(report.odds, example.odds);
    assert.equal(report.mass, example.mass);
    assert.equal(report.fuelNeeded, example.fuelNeeded);
    assert.equal(report.output, example.output);
    assert.equal(report.grant, mission.reward);
    assert.ok(report.cause.includes(mission.arrival));
    assert.equal(R.evaluateLaunch(example.loadout, mission, () => example.odds).stars, 0);
    for (const item of R.INGREDIENTS) {
      const over = { ...example.loadout, [item]: example.loadout[item] + 1 };
      assert.ok(R.evaluateLaunch(over, mission, () => 0).odds < report.odds);
      if (example.loadout[item] > 0) {
        const under = { ...example.loadout, [item]: example.loadout[item] - 1 };
        assert.ok(R.evaluateLaunch(under, mission, () => 0).odds < report.odds);
      }
    }
  });
}

test("Earth Watch has limited mass margin with two fully powered instruments", () => {
  const rocket = { fuel: 2, part: 3, paper: 2 };
  const risky = R.evaluateLaunch(rocket, MISSIONS[1], () => 0.51);
  assert.equal(risky.stars, 0);
  assert.equal(risky.mass, 9);
  assert.equal(risky.thinMargin, true);
  assert.equal(risky.odds, 0.51);
  assert.equal(risky.gauges.mass.status, "risk");
  assert.match(risky.cause, /mass margin/);
  const lucky = R.evaluateLaunch(rocket, MISSIONS[1], () => 0.50);
  assert.equal(lucky.stars, 3);
  assert.equal(lucky.output, 1.25);
  assert.equal(R.evaluateLaunch({ ...rocket, fuel: 1 }, MISSIONS[1]).status, "failed");
});

test("an overweight manifest is blocked and its fee and payload are kept", () => {
  const state = R.createState();
  state.loadout.fuel = 4;
  const before = structuredClone(state);
  assert.equal(R.inspectLaunch(state).ready, false);
  assert.equal(R.evaluateLaunch(state.loadout, MISSIONS[0]).status, "blocked");
  assert.equal(R.launch(state), null);
  assert.deepEqual(state, before);
  assert.equal(R.removeItem(state, "fuel").type, "unload");
  assert.equal(state.inventory.fuel, 1);
  assert.equal(R.inspectLaunch(state).ready, true);
});

test("the payload can be trimmed before Scrap unlocks even with a full stack", () => {
  const state = R.createState();
  R.interact(state, "engineering", "output");
  R.interact(state, "launch", "input");
  assert.equal(R.removeItem(state, "part", true).type, "scrap");
  R.interact(state, "engineering", "output");
  R.interact(state, "launch", "input");
  R.interact(state, "ground", "output");
  assert.equal(R.removeItem(state, "part"), null);
  assert.equal(R.removeItem(state, "part", true).type, "scrap");
  assert.equal(state.loadout.part, 0);
  assert.equal(state.facilities.engineering.output, 1);
});

test("low power and uncovered crew report reduced performance", () => {
  const weak = R.evaluateLaunch({ fuel: 1, part: 1, paper: 1 }, MISSIONS[1], () => 0);
  assert.equal(weak.stars, 2);
  assert.equal(weak.effectiveScience, 0.5);
  assert.equal(weak.output, 0.5);
  assert.match(weak.cause, /little power/);
  const noCrew = R.evaluateLaunch({ fuel: 1, part: 2, paper: 1 }, MISSIONS[3], () => 0);
  assert.equal(noCrew.stars, 1);
  assert.match(noCrew.cause, /required crew/);
  assert.equal(noCrew.output, 0.25);
});

test("partial and failed flights reveal minimum requirements without revealing an untested recipe", () => {
  const state = R.createState(1);
  assert.equal(R.inspectLaunch(state).discovered, false);
  R.interact(state, "engineering", "output");
  R.interact(state, "launch", "input");
  const failed = R.launch(state);
  assert.equal(failed.stars, 0);
  assert.equal(state.missionIndex, 0);
  assert.equal(R.inspectLaunch(state).discovered, true);
  assert.equal(state.facilities.engineering.output, 1);
  assert.equal(R.getRecipe(state).known, false);
  state.report = null;
  state.loadout.fuel = 1;
  const partial = R.launch(state);
  assert.equal(partial.stars, 1);
  assert.equal(state.satellites.length, 1);
  assert.equal(state.missionIndex, 0);
  assert.equal(R.getExpansion(state).available, false);
  assert.equal(state.facilities.engineering.output, 1);
  assert.equal(state.history.length, 2);
});

test("the full campaign progresses through the normal economy and unlock actions", () => {
  const state = R.createState(1);
  const transfer = (station, action, count) => R.transferAtStation(state, station, action, count);
  const takeData = (count) => {
    if (!count) return;
    R.tick(state, count / R.getRates(state).data);
    assert.equal(transfer("ground", "take:data", count).count, count);
  };
  const income = (goal) => {
    while (state.wallet < goal) {
      const count = R.getRates(state).carry;
      takeData(count);
      assert.equal(transfer("grant", "deposit:data", count).count, count);
      R.tick(state, count * R.FACILITIES.grant.cycle);
      assert.ok(transfer("grant", "collect:cash", 1));
    }
  };
  const buyStation = (id) => {
    const spec = R.FACILITIES[id];
    income(spec.unlock);
    assert.equal(transfer(id, "unlock", 1).type, "unlock");
  };
  const make = (id) => {
    const recipe = R.FACILITIES[id];
    income(recipe.cash);
    takeData(recipe.cubes);
    assert.ok(transfer(id, "make:" + recipe.item, 1));
    R.tick(state, recipe.cycle);
    const special = R.SPECIALS[id];
    if (special && state.facilities[id].special > 0) {
      // A special product counts as its base item on the launch pad.
      assert.equal(transfer(id, "take:" + special, 1).item, special);
      assert.equal(transfer("launch", "load:" + special, 1).count, 1);
      return;
    }
    const pickup = transfer(id, "take:" + recipe.item, 1);
    assert.equal(pickup.item, recipe.item);
    assert.equal(transfer("launch", "load:" + recipe.item, 1).count, 1);
  };
  const fire = () => {
    income(MISSIONS[state.missionIndex].fee);
    const missionIndex = state.missionIndex;
    const report = R.launch(state);
    assert.equal(report.stars, 3, report.cause);
    assert.equal(report.recipeDiscovered, true);
    assert.equal(state.missionIndex, missionIndex);
    state.report = null;
  };

  const loaded = (id) => {
    const special = R.SPECIALS[id];
    return state.loadout[R.FACILITIES[id].item] + (special ? state.specialLoadout[special] : 0);
  };
  const makeTo = (id, count) => {
    while (loaded(id) < count) make(id);
    assert.equal(loaded(id), count);
  };

  transfer("engineering", "take:part", 1);
  transfer("launch", "load:part", 1);
  buyStation("fuel");
  make("fuel");
  fire();
  assert.equal(state.satellites.length, 1);
  assert.equal(R.getRates(state).data, 1.5);
  buyStation("engineering");
  buyStation("research");
  assert.equal(state.facilities.scrap.unlocked, true);

  assert.equal(R.selectMission(state, "m2"), true);
  makeTo("research", 1);
  makeTo("engineering", 2);
  makeTo("fuel", 2);
  fire();

  const { cost } = R.getExpansion(state);
  income(cost);
  assert.equal(R.buyExpansion(state), true);
  assert.equal(R.selectMission(state, "m3"), true);
  makeTo("research", 3);
  makeTo("engineering", 4);
  makeTo("fuel", 2);
  fire();

  buyStation("academy");
  assert.equal(R.selectMission(state, "m4"), true);
  makeTo("academy", 1);
  makeTo("research", 2);
  makeTo("engineering", 4);
  makeTo("fuel", 2);
  fire();

  assert.equal(state.completed, false);
  for (const stage of R.STAGES.slice(2)) {
    const expansion = R.getExpansion(state);
    assert.equal(expansion.stage.id, stage.id);
    assert.equal(expansion.available, true);
    income(expansion.cost);
    assert.equal(R.buyExpansion(state), true);
    for (const id of stage.missionIds) {
      assert.equal(R.selectMission(state, id), true);
      const { loadout } = examples[state.missionIndex];
      makeTo("research", loadout.paper);
      makeTo("engineering", loadout.part);
      makeTo("fuel", loadout.fuel);
      fire();
    }
  }

  assert.equal(state.completed, true);
  assert.equal(state.history.length, MISSIONS.length);
  assert.equal(state.history.at(-1).campaignCompleted, true);
  assert.equal(state.satellites.length, MISSIONS.length);
  assert.equal(R.inspectLaunch(state).mission.id, "m8");
  assert.equal(R.getExpansion(state), null);
  const restored = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.equal(restored.completed, true);
  assert.equal(R.getStage(restored).id, "sun");
  assert.equal(restored.missionIndex, 7);
  assert.equal(R.selectMission(state, "m2"), true);
  state.loadout.part = 1;
  assert.equal(R.selectMission(state, "m4"), true);
  assert.equal(state.loadout.part, 1);
  assert.equal(state.missionIndex, 3);
});

test("upgrades, station caps, helper transfers and save restoration work", () => {
  const state = R.createState(37);
  state.wallet = 1_000;
  assert.equal(R.buyUpgrade(state, "carry"), true);
  assert.equal(R.buyUpgrade(state, "speed"), true);
  assert.equal(R.buyUpgrade(state, "ground"), true);
  assert.equal(R.buyUpgrade(state, "intern"), true);
  assert.equal(R.buyUpgrade(state, "facility", "research"), false);
  assert.ok(R.unlockFacility(state, "fuel"));
  assert.equal(R.buyUpgrade(state, "facility", "fuel"), false);
  state.inventory.primePart = 1;
  assert.equal(R.buyUpgrade(state, "facility", "fuel"), true);
  assert.equal(state.inventory.primePart, 0);
  assert.deepEqual(R.getRates(state), { carry: 6, speed: 1.15, data: 0.5, cap: 40, intern: true });

  R.interact(state, "fuel", "input");
  R.tick(state, R.getProductionCycle(state, "fuel"));
  assert.equal(state.facilities.fuel.output, 1);
  R.tick(state, 2.6);
  R.tick(state, 2.6);
  R.tick(state, 0.7);
  assert.ok(state.facilities.grant.output > 0);
  assert.ok(state.stats.sold > 0);

  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value), getItem: (key) => values.get(key) };
  assert.equal(R.saveState(state, storage), true);
  assert.deepEqual(R.loadState(storage), state);
  values.set(R.SAVE_KEY, "{broken save");
  const reset = R.loadState(storage);
  assert.deepEqual(reset, R.createState(reset.rngSeed));
});

test("the same seed reproduces a risky launch outcome", () => {
  function tryEarthWatch(seed) {
    const state = R.createState(seed);
    state.wallet = 50;
    state.missionIndex = 1;
    state.loadout = { fuel: 2, part: 3, paper: 2, crew: 0 };
    return R.launch(state);
  }
  assert.deepEqual(tryEarthWatch(12345), tryEarthWatch(12345));
  assert.notEqual(tryEarthWatch(1).roll, tryEarthWatch(2).roll);
});

test("Grant Office scientist orders pay a bonus and pause at six receipts", () => {
  const state = R.createState();
  R.interact(state, "ground", "output");
  R.interact(state, "grant", "input");
  R.tick(state, 2.1);
  assert.equal(state.customers.filled, 3);
  assert.equal(state.facilities.grant.output, 24);
  R.tick(state, 0.7);
  assert.equal(state.customers.completed, 1);
  assert.equal(state.customers.filled, 0);
  assert.equal(state.facilities.grant.output, 35);

  R.tick(state, 6);
  R.interact(state, "ground", "output");
  R.interact(state, "grant", "input");
  R.tick(state, 10);
  assert.equal(state.facilities.grant.stock, 6);
  assert.equal(state.facilities.grant.output, 51);
  assert.equal(state.facilities.grant.input, 2);
  assert.equal(R.interact(state, "grant", "output").count, 51);
  R.tick(state, 1.4);
  assert.equal(state.facilities.grant.output, 19);
  assert.equal(state.customers.completed, 2);
});

test("Cargo Runner moves manufactured hardware to a recipe-aware shelf", () => {
  const state = R.createState();
  state.wallet = 1000;
  assert.ok(R.unlockFacility(state, "fuel"));
  assert.equal(R.buyUpgrade(state, "runner"), true);
  assert.equal(state.facilities.cargo.unlocked, true);

  R.tick(state, 5);
  assert.equal(state.runner.phase, "search");
  assert.equal(state.facilities.engineering.output, 1);

  R.interact(state, "fuel", "input");
  R.interact(state, "fuel", "input");
  R.tick(state, 2 * R.getProductionCycle(state, "fuel"));
  assert.equal(state.runner.phase, "deliver");
  assert.equal(state.runner.cargo, "fuel");
  assert.equal(state.facilities.fuel.output, 1);
  assert.equal(R.getCargoCount(state), 0);
  R.tick(state, 1.35);
  assert.equal(R.getCargoCount(state), 1);
  assert.equal(R.getShelfItem(state), "fuel");
  R.tick(state, 1.35 + 0.45);
  R.tick(state, 1.35);
  assert.equal(R.getCargoCount(state), 2);

  assert.deepEqual(R.interact(state, "cargo", "output"), { type: "pickup", facility: "cargo", item: "fuel", count: 1 });
  assert.equal(R.interact(state, "cargo", "output"), null);
  assert.equal(R.getShelfItem(state), null);
  assert.deepEqual(R.collectCargo(state, "fuel"), { type: "pickup", facility: "cargo", item: "fuel", count: 1 });
  assert.equal(R.getCargoCount(state), 0);
  assert.equal(state.loadout.fuel, 0);
});

test("older saves keep currency and progress while adding the orders and shelf", () => {
  const state = R.createState();
  state.wallet = 127;
  state.facilities.grant.output = 60;
  delete state.customers;
  delete state.runner;
  delete state.upgrades.runner;
  delete state.facilities.cargo;
  delete state.facilities.grant.stock;
  const migrated = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.equal(migrated.wallet, 127);
  assert.equal(migrated.facilities.grant.stock, 6);
  assert.equal(R.interact(migrated, "grant", "output").count, 60);
  assert.equal(migrated.customers.completed, 0);
  assert.equal(migrated.upgrades.runner, 0);
  assert.equal(R.getCargoCount(migrated), 0);
  assert.equal(R.getShelfItem(migrated), null);
});

test("Orbital Yard offers both missions immediately, and expansion requires a three-star clear plus cash", () => {
  const state = R.createState(1);
  assert.equal(R.getStage(state).id, "yard");
  assert.equal(R.selectMission(state, "m2"), true);
  assert.equal(R.selectMission(state, "m3"), false);
  assert.equal(R.isMissionAvailable(state, "m4"), false);

  state.wallet = 700;
  assert.equal(R.getExpansion(state).affordable, true);
  assert.equal(R.getExpansion(state).available, false);
  assert.equal(R.buyExpansion(state), false);
  assert.equal(state.wallet, 700);
  state.bestStars.m2 = 3;
  state.wallet = 699;
  assert.equal(R.getExpansion(state).available, true);
  assert.equal(R.getExpansion(state).affordable, false);
  assert.equal(R.buyExpansion(state), false);

  state.wallet++;
  assert.equal(R.buyExpansion(state), true);
  assert.equal(state.wallet, 0);
  assert.equal(R.getStage(state).id, "expansion");
  assert.equal(R.getExpansion(state).stage.id, "moon");
  assert.equal(R.getExpansion(state).available, false);
  assert.equal(R.selectMission(state, "m4"), true);
  assert.equal(R.selectMission(state, "m3"), true);
  assert.equal(R.selectMission(state, "m1"), true);
});

test("an exact build discovers its recipe even when the launch roll fails", () => {
  const state = R.createState(15000);
  state.loadout = { ...examples[0].loadout };
  assert.equal(R.getRecipe(state).ingredients, null);
  const report = R.launch(state);
  assert.equal(report.status, "failed");
  assert.equal(report.recipeDiscovered, true);
  assert.equal(report.exact, true);
  assert.deepEqual(report.discoveredPlan, examples[0].loadout);
  assert.equal(R.getRecipe(state).source, "flight");
  assert.deepEqual(R.getRecipe(state).ingredients, examples[0].loadout);
  assert.equal(R.buyRecipe(state), false);
  assert.equal(R.getExpansion(state).available, false);

  const restored = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.deepEqual(R.getRecipe(restored), R.getRecipe(state));
  assert.equal(restored.rngSeed, state.rngSeed);
  assert.equal(restored.history[0].recipeDiscovered, true);
});

test("a successful guess earns the optimal payload plan rather than the guessed load", () => {
  const state = R.createState(1);
  assert.equal(R.selectMission(state, "m2"), true);
  const guess = { fuel: 1, part: 2, paper: 1, crew: 0 };
  state.loadout = { ...guess };
  state.wallet = 50;
  const report = R.launch(state);
  assert.equal(report.status, "success");
  assert.equal(report.exact, false);
  assert.equal(report.recipeDiscovered, true);
  assert.deepEqual(report.loadout, guess);
  assert.deepEqual(report.discoveredPlan, examples[1].loadout);
  assert.deepEqual(R.getRecipe(state).ingredients, examples[1].loadout);
  assert.equal(R.getRecipe(state).source, "flight");
  assert.equal(state.wallet, 130);
});

test("an existing save grants payload plans from full results and keeps already purchased plans", () => {
  const state = R.createState(1);
  state.wallet = 123;
  state.bestStars = { m1: 3, m2: 3, m3: 2 };
  state.recipes = { m1: "purchase" };
  state.history = [{ mission: { id: "m4" }, status: "success" }];
  const restored = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.equal(restored.wallet, 123);
  assert.equal(R.getRecipe(restored, "m1").source, "purchase");
  assert.equal(R.getRecipe(restored, "m2").source, "flight");
  assert.equal(R.getRecipe(restored, "m3").known, false);
  assert.equal(R.getRecipe(restored, "m4").source, "flight");
});

test("recipes can be bought before flying an open mission, and only at their stated price", () => {
  const state = R.createState(1);
  state.wallet = 449;
  assert.equal(R.buyRecipe(state, "m2"), false);
  assert.equal(R.getRecipe(state, "m2").known, false);
  state.wallet = 500;
  assert.equal(R.buyRecipe(state, "m2"), true);
  assert.equal(state.wallet, 50);
  assert.equal(R.getRecipe(state, "m2").source, "purchase");
  assert.deepEqual(R.getRecipe(state, "m2").ingredients, examples[1].loadout);
  assert.equal(R.buyRecipe(state, "m2"), false);

  state.wallet = 3000;
  assert.equal(R.buyRecipe(state, "m3"), false);
  assert.equal(R.getRecipe(state, "m3").available, false);
  assert.equal(state.wallet, 3000);
});

test("older saves with advanced missions keep their stage, loaded payload, and past reports", () => {
  const state = R.createState(1);
  delete state.expanded;
  delete state.stageIndex;
  delete state.recipes;
  state.wallet = 123;
  state.furthestMissionIndex = 2;
  state.missionIndex = 2;
  state.loadout = { ...examples[2].loadout };
  state.facilities.research.unlocked = true;
  state.history = [{ mission: MISSIONS[1], stars: 3, status: "success" }];
  state.bestStars.m2 = 3;
  const restored = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.equal(restored.wallet, 123);
  assert.equal(restored.expanded, true);
  assert.equal(restored.facilities.research.unlocked, true);
  assert.deepEqual(restored.history, state.history);
  assert.equal(R.isMissionAvailable(restored, "m4"), true);
  assert.equal(R.getRecipe(restored).known, false);

  assert.equal(R.selectMission(restored, "m4"), true);
  assert.deepEqual(restored.loadout, state.loadout);
  assert.ok(R.inspectLaunch(restored).odds < examples[3].odds);
});

test("a finished Earth-era save can start the lunar program without clearing Earth again", () => {
  const state = R.createState(1);
  delete state.stageIndex;
  state.expanded = true;
  state.completed = true;
  state.missionIndex = 4;
  state.wallet = 900;
  const restored = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.equal(R.getStage(restored).id, "expansion");
  assert.equal(R.inspectLaunch(restored).mission.id, "m4");
  assert.equal(restored.completed, false);
  assert.equal(R.getExpansion(restored).available, true);
  assert.equal(R.buyExpansion(restored), true);
  assert.equal(R.selectMission(restored, "m5"), true);
  assert.equal(R.selectMission(restored, "m6"), false);
  assert.equal(R.getExpansion(restored).available, false);
});

test("a Grant Office visit pays ready cash and accepts cubes in one stop", () => {
  const state = R.createState(1);
  R.interact(state, "ground", "output");
  R.interact(state, "grant", "input");
  R.tick(state, 8);
  R.interact(state, "ground", "output");

  const visit = R.interact(state, "grant", "both");
  assert.equal(visit.type, "batch");
  assert.deepEqual(visit.events.map(({ type, item, count }) => ({ type, item, count })), [
    { type: "cash", item: "cash", count: 35 },
    { type: "deposit", item: "data", count: 4 },
  ]);
  assert.equal(state.wallet, 55);
  assert.equal(state.facilities.grant.input, 4);
  assert.equal(state.facilities.grant.output, 0);
});

test("a shared factory pad deposits cubes before collecting hardware from a full bag", () => {
  const state = R.createState(1);
  state.wallet = 300;
  R.unlockFacility(state, "fuel");
  R.unlockFacility(state, "engineering");
  const before = state.wallet;

  R.interact(state, "ground", "output");
  assert.equal(R.getInventoryCount(state), R.getRates(state).carry);
  const visit = R.interact(state, "engineering", "both");
  assert.equal(visit.type, "batch");
  assert.deepEqual(visit.events.map(({ type, item, count }) => ({ type, item, count })), [
    { type: "deposit", item: "data", count: 4 },
    { type: "pickup", item: "part", count: 1 },
  ]);
  assert.equal(state.wallet, before - 40);
  assert.equal(state.inventory.part, 1);

  R.tick(state, 2 * R.getProductionCycle(state, "engineering"));
  const waiting = R.interact(state, "engineering", "output");
  assert.deepEqual(waiting, { type: "pickup", facility: "engineering", item: "part", count: 2 });
  assert.equal(state.wallet, before - 40);
});

test("Fuel Plant visits and waiting avoid an extra order when fuel is queued, processing or ready", () => {
  const state = R.createState(1);
  state.wallet = 100;
  R.unlockFacility(state, "fuel");

  assert.equal(R.interact(state, "fuel", "both").type, "order");
  assert.equal(state.wallet, 45);
  assert.equal(R.interact(state, "fuel", "both"), null);
  R.tick(state, 1);
  assert.equal(state.facilities.fuel.active, true);
  assert.equal(R.interact(state, "fuel", "both"), null);
  assert.equal(state.wallet, 45);

  R.tick(state, R.getProductionCycle(state, "fuel") - 1);
  R.interact(state, "ground", "output");
  assert.equal(R.interact(state, "fuel", "both"), null);
  assert.equal(state.wallet, 45);
  R.interact(state, "grant", "input");
  assert.equal(R.interact(state, "fuel", "both").type, "pickup");
  assert.equal(R.interact(state, "fuel", "output"), null);
  assert.equal(state.wallet, 45);

  assert.equal(R.interact(state, "fuel", "input").type, "order");
  assert.equal(R.interact(state, "fuel", "input").type, "order");
  assert.equal(state.facilities.fuel.input, 2);
  assert.equal(state.wallet, 15);
});

test("selectable Ground and Grant quantities preserve leftovers and reject invalid requests", () => {
  const state = R.createState(1);
  const transfer = (station, action, n) => R.transferAtStation(state, station, action, n);
  const starting = structuredClone(state);
  assert.equal(transfer("ground", "take:data", 0), null);
  assert.equal(transfer("ground", "take:data", 1.5), null);
  assert.equal(transfer("ground", "take:data", "2"), null);
  assert.equal(transfer("ground", "take:data", 5), null);
  assert.deepEqual(state, starting);
  assert.equal(transfer("ground", "take:data", 3).count, 3);
  assert.equal(state.inventory.data, 3);
  assert.equal(state.facilities.ground.output, 1);

  assert.equal(transfer("ground", "return:data", 1).count, 1);
  assert.equal(transfer("ground", "take:data", 1).count, 1);
  assert.equal(state.stats.collected, 3);
  assert.equal(transfer("grant", "deposit:data", 2).count, 2);
  assert.equal(state.inventory.data, 1);
  R.tick(state, 1.4);
  assert.equal(R.getStationActions(state, "grant").find(({ id }) => id === "collect:cash").amount, 16);
  assert.equal(transfer("grant", "collect:cash", 2), null);
  assert.equal(transfer("grant", "collect:cash", 1).count, 16);
  assert.equal(state.wallet, 36);
});

test("selectable factory batches charge the exact recipe and support storing excess", () => {
  const state = R.createState(1);
  state.wallet = 250;
  const transfer = (station, action, n) => R.transferAtStation(state, station, action, n);
  assert.equal(transfer("fuel", "unlock", 1).type, "unlock");
  assert.equal(transfer("engineering", "unlock", 1).type, "unlock");
  transfer("ground", "take:data", 4);
  const recipe = R.getStationActions(state, "engineering").find(({ id }) => id === "make:part");
  assert.deepEqual([recipe.max, recipe.unitCubes, recipe.unitPrice], [2, 2, 20]);

  const before = structuredClone(state);
  assert.equal(transfer("engineering", "make:part", 3), null);
  assert.deepEqual(state, before);
  assert.equal(transfer("engineering", "make:part", 1).count, 2);
  assert.deepEqual([state.wallet, state.facilities.engineering.input, state.inventory.data], [90, 2, 2]);
  R.tick(state, R.getProductionCycle(state, "engineering"));
  assert.equal(transfer("engineering", "take:part", 1).count, 1);
  assert.equal(transfer("engineering", "store:part", 1).count, 1);
  assert.equal(state.facilities.engineering.output, 2);
  assert.equal(state.inventory.part, 0);
  assert.equal(transfer("fuel", "make:fuel", 3).count, 3);
  assert.equal(state.facilities.fuel.input, 3);
  assert.equal(state.wallet, 45);
  R.tick(state, 3 * R.getProductionCycle(state, "fuel"));
  assert.equal(transfer("fuel", "take:fuel", 2).count, 2);
  assert.equal(state.facilities.fuel.output, 1);
});

test("launch, Cargo Shelf, and Scrap transfer only the selected ingredient quantity", () => {
  const state = R.createState(1);
  state.wallet = 1000;
  for (const id of ["fuel", "engineering", "research"]) R.unlockFacility(state, id);
  R.buyUpgrade(state, "runner");
  state.inventory = { data: 0, fuel: 2, part: 2, paper: 0, crew: 0 };
  const transfer = (station, action, n) => R.transferAtStation(state, station, action, n);

  assert.equal(transfer("launch", "load:part", 1).count, 1);
  assert.equal(state.loadout.part, 1);
  assert.equal(state.inventory.part, 1);
  assert.equal(state.inventory.fuel, 2);
  assert.equal(transfer("launch", "unload:part", 1).count, 1);
  assert.equal(state.inventory.part, 2);
  assert.equal(transfer("cargo", "store:part", 2).count, 2);
  assert.equal(R.getCargoCount(state), 2);
  assert.equal(transfer("cargo", "take:part", 2).count, 2);
  assert.equal(R.getCargoCount(state), 0);
  assert.equal(transfer("scrap", "discard:fuel", 1).count, 1);
  assert.equal(state.inventory.fuel, 1);
  assert.equal(state.inventory.part, 2);
});

test("manual Cargo Shelf storage leaves room for cargo already in transit", () => {
  const state = R.createState(1);
  state.wallet = 1000;
  R.unlockFacility(state, "fuel");
  R.buyUpgrade(state, "runner");
  const transfer = (station, action, n) => R.transferAtStation(state, station, action, n);

  transfer("fuel", "make:fuel", 5);
  R.tick(state, 5 * R.getProductionCycle(state, "fuel"));
  assert.equal(state.runner.cargo, "fuel");
  transfer("fuel", "take:fuel", 4);
  assert.equal(transfer("cargo", "store:fuel", 4), null);
  assert.equal(transfer("cargo", "store:fuel", 3).count, 3);
  R.tick(state, 1.35);
  assert.equal(state.runner.shelf.fuel, 4);
  assert.equal(R.getCargoCount(state), 4);
});

test("the walk-up Returns pad restores the starter Part and keeps data untouched", () => {
  const state = R.createState(1);
  R.interact(state, "engineering", "output");
  R.transferAtStation(state, "ground", "take:data", 3);
  assert.equal(R.getReturnsCount(state), 1);
  assert.equal(R.interact(state, "returns", "output"), null);
  assert.deepEqual(R.interact(state, "returns", "both"), {
    type: "store", facility: "returns", destination: "engineering", item: "part", count: 1,
  });
  assert.equal(state.facilities.engineering.output, 1);
  assert.equal(state.inventory.data, 3);
  assert.equal(state.inventory.part, 0);
  assert.equal(R.getReturnsCount(state), 0);
  assert.equal(R.interact(state, "returns", "both"), null);
});

test("Returns fills open factory stock first and uses reserved-safe Cargo Shelf overflow", () => {
  const state = R.createState(1);
  state.wallet = 1000;
  R.unlockFacility(state, "fuel");
  R.unlockFacility(state, "engineering");
  R.buyUpgrade(state, "runner");
  state.facilities.fuel.output = 5;
  state.facilities.engineering.output = 6;
  state.runner.shelf.part = 3;
  state.facilities.cargo.output = 3;
  state.runner.cargo = "part";
  state.inventory = { data: 0, fuel: 2, part: 2, paper: 0, crew: 0 };

  assert.equal(R.getReturnsCount(state), 2);
  const returned = R.returnSupplies(state);
  assert.equal(returned.type, "batch");
  assert.deepEqual(returned.events.map(({ item, count, destination }) => ({ item, count, destination })), [
    { item: "fuel", count: 1, destination: "fuel" },
    { item: "fuel", count: 1, destination: "cargo" },
  ]);
  assert.equal(state.facilities.fuel.output, 6);
  assert.equal(state.runner.shelf.fuel, 1);
  assert.equal(state.inventory.part, 2);
  assert.equal(state.wallet, 560);
});

test("the intern waits with cubes when the Grant Office cash or input is full", () => {
  const state = R.createState(1);
  state.wallet = 300;
  R.buyUpgrade(state, "intern");
  const { grant } = state.facilities;
  state.helper = { phase: "deliver", progress: 0.5, cargo: 3 };
  grant.stock = 6;
  grant.output = 65;
  grant.input = 0;
  R.tick(state, 2);
  assert.deepEqual(state.helper, { phase: "deliver", progress: 1, cargo: 3 });
  assert.equal(grant.input, 0);

  grant.input = 10;
  R.interact(state, "grant", "output");
  R.tick(state, 0.1);
  assert.equal(state.helper.phase, "deliver");
  assert.equal(state.helper.progress, 1);
  assert.equal(state.helper.cargo, 2);
  assert.equal(grant.input, 10);
  R.tick(state, 1.4);
  assert.deepEqual(state.helper, { phase: "collect", progress: 0, cargo: 0 });
  assert.equal(state.stats.sold, 3);
});
