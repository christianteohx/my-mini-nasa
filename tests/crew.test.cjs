const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../rules.js");

const R = globalThis.SpaceportRules;

test("upgrade previews show live levels, effect, next improvement, and hiring requirements", () => {
  const state = R.createState(1);
  state.wallet = 2000;
  assert.equal(R.getUpgrade(state, "carry").currentLabel, "4 items");
  assert.equal(R.getUpgrade(state, "carry").nextLabel, "6 items");
  assert.equal(R.getUpgrade(state, "carry").gain, "+2 items");
  assert.equal(R.getUpgrade(state, "internCarry").available, false);
  assert.equal(R.buyUpgrade(state, "internCarry"), false);

  assert.equal(R.buyUpgrade(state, "intern"), true);
  const intern = R.getWorker(state, "intern");
  assert.deepEqual(intern.upgradeIds, ["internCarry", "internSpeed"]);
  assert.equal(intern.enabled, true);
  assert.equal(intern.capacityLabel, "3 Data Cubes");
  assert.equal(R.getUpgrade(state, "internCarry").gain, "+2 Data Cubes");
  assert.equal(R.buyUpgrade(state, "internCarry"), true);
  assert.equal(R.getUpgrade(state, "internCarry").current, 5);
  assert.equal(R.getUpgrade(state, "internCarry").maxLevel, 1);
  assert.equal(R.getUpgrade(state, "internCarry").nextLabel, null);

  assert.ok(R.unlockFacility(state, "fuel"));
  assert.equal(R.getUpgrade(state, "facility", "fuel").currentLabel, "4.5 s / batch");
  assert.equal(R.getUpgrade(state, "facility", "fuel").nextLabel, "3.6 s / batch");
  assert.equal(R.getUpgrade(state, "facility", "fuel").gain, "0.9 s shorter cycle");
});

test("Materials Intern uses fresh Ground cubes to queue only mission deficits and preserves cash", () => {
  const state = R.createState(1);
  state.wallet = 3000;
  for (const id of ["fuel", "engineering", "research"]) assert.ok(R.unlockFacility(state, id));
  assert.ok(R.selectMission(state, "m2"));
  assert.ok(R.buyUpgrade(state, "materials"));
  assert.equal(R.getWorker(state, "materials").capacity, 4);
  state.inventory.data = 2;
  state.facilities.ground.output = 12;
  state.wallet = 260;

  R.tick(state, 2.8);
  assert.equal(state.materials.phase, "return");
  assert.equal(state.materials.to, "engineering");
  assert.equal(state.wallet, 240);
  assert.equal(state.inventory.data, 2);
  assert.equal(state.facilities.engineering.input, 2);
  R.tick(state, 2.8);
  assert.equal(R.getWorker(state, "materials").resting, true);
  R.tick(state, 0.3);
  assert.equal(state.materials.phase, "wait");
  R.tick(state, 3);
  assert.equal(state.materials.phase, "return");
  assert.equal(state.materials.to, "research");
  assert.equal(state.wallet, 215);
  assert.equal(state.facilities.research.input, 3);
  R.tick(state, 3);
  R.tick(state, 3);
  assert.equal(state.materials.phase, "wait");
  assert.equal(state.wallet, 215);

  state.loadout = { fuel: 2, part: 0, paper: 1, crew: 0 };
  state.facilities.engineering.output = 0;
  state.wallet = 219;
  R.tick(state, 4);
  assert.equal(state.materials.phase, "wait");
  assert.equal(state.wallet, 219);
});

test("a Credit Clerk frees a blocked checkout, credits cash exactly once, and rests", () => {
  const state = R.createState(1);
  state.wallet = 1000;
  assert.ok(R.buyUpgrade(state, "intern"));
  assert.ok(R.buyUpgrade(state, "clerk"));
  const grant = state.facilities.grant;
  const openingCash = state.wallet;
  grant.stock = 6;
  grant.output = 65;
  state.helper = { phase: "deliver", progress: 1, cargo: 3 };

  R.tick(state, 0.6);
  assert.deepEqual(state.helper, { phase: "deliver", progress: 1, cargo: 3 });
  assert.equal(state.clerk.phase, "collect");
  R.tick(state, 0.6);
  assert.equal(state.clerk.cargo, 65);
  assert.equal(state.wallet, openingCash);
  assert.equal(grant.output, 0);
  R.tick(state, 1.2);
  assert.equal(state.wallet, openingCash + 65);
  assert.equal(state.helper.cargo, 0);
  assert.equal(R.getWorker(state, "clerk").resting, true);
  R.tick(state, 0.3);
  assert.equal(state.wallet, openingCash + 65);
});

test("worker pause preserves cargo and persists independently of upgrades", () => {
  const state = R.createState(1);
  state.wallet = 2000;
  assert.ok(R.buyUpgrade(state, "intern"));
  assert.ok(R.buyUpgrade(state, "internCarry"));
  assert.ok(R.buyUpgrade(state, "internSpeed"));
  assert.equal(R.getWorker(state, "intern").speedLabel, "1.25× speed");
  assert.equal(R.setWorkerEnabled(state, "runner", false), false);
  R.tick(state, 2.08);
  assert.equal(state.helper.cargo, 5);
  const helper = { ...state.helper };
  assert.ok(R.setWorkerEnabled(state, "intern", false));
  R.tick(state, 20);
  assert.deepEqual(state.helper, helper);
  const restored = R.loadState({ getItem: () => JSON.stringify(state) });
  assert.equal(R.getWorker(restored, "intern").enabled, false);
  assert.equal(R.getWorker(restored, "intern").capacity, 5);
  assert.ok(R.setWorkerEnabled(restored, "intern", true));
  R.tick(restored, 2.08);
  assert.equal(restored.helper.cargo, 0);
  assert.equal(restored.stats.sold, 5);
});

test("upgraded Cargo Runner reserves its full two-item load across every storage path", () => {
  const state = R.createState(1);
  state.wallet = 2000;
  assert.ok(R.unlockFacility(state, "fuel"));
  assert.ok(R.buyUpgrade(state, "runner"));
  assert.ok(R.buyUpgrade(state, "runnerCarry"));
  state.facilities.fuel.output = 4;
  R.tick(state, 1.35);
  assert.equal(state.runner.cargo, "fuel");
  assert.equal(state.runner.cargoCount, 2);
  state.inventory.fuel = 4;
  const store = R.getStationActions(state, "cargo").find(({ id }) => id === "store:fuel");
  assert.equal(store.max, 2);
  assert.equal(R.transferAtStation(state, "cargo", "store:fuel", 2).count, 2);
  R.tick(state, 1.35);
  assert.equal(state.runner.shelf.fuel, 4);
});
