const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../rules.js");

const R = globalThis.SpaceportRules;

function fly(state, mission, loadout) {
  assert.equal(R.selectMission(state, mission), true);
  state.loadout = { fuel: 0, part: 0, paper: 0, crew: 0, ...loadout };
  const report = R.launch(state);
  state.report = null;
  return report;
}

test("the four starter cubes still fund the Fuel Plant and the first Fuel order", () => {
  const state = R.createState(1);
  R.interact(state, "ground", "output");
  R.interact(state, "grant", "input");
  R.tick(state, 4 * R.getProductionCycle(state, "grant"));
  assert.equal(R.interact(state, "grant", "output").count, 35);
  assert.equal(state.wallet, 55);
  assert.ok(R.unlockFacility(state, "fuel"));
  assert.equal(R.interact(state, "fuel", "both").type, "order");
  assert.equal(state.wallet, 0);
});

test("repeated grades earn only grant improvements and upgrade one signal per mission", () => {
  const state = R.createState(1);
  state.wallet = 1000;
  const partial = fly(state, "m2", { fuel: 1, part: 1, paper: 1 });
  assert.equal(partial.stars, 2);
  assert.equal(partial.grant, 80);
  assert.equal(partial.output, 0.5);
  assert.deepEqual(R.getMissionGrant(state, "m2"), { earned: 80, remaining: 40, maximum: 120 });

  const success = fly(state, "m2", { fuel: 2, part: 2, paper: 1 });
  assert.equal(success.stars, 3);
  assert.equal(success.grant, 40);
  assert.equal(success.output, 0.5);
  assert.equal(success.signalOutput, 1);
  assert.equal(state.satellites.length, 1);
  assert.equal(R.getRates(state).data, 1.5);

  const repeat = fly(state, "m2", { fuel: 2, part: 2, paper: 1 });
  assert.equal(repeat.stars, 3);
  assert.equal(repeat.grant, 0);
  assert.equal(repeat.output, 0);
  assert.equal(state.wallet, 1000);

  const different = fly(state, "m1", { fuel: 1, part: 1 });
  assert.equal(different.grant, 50);
  assert.equal(different.output, 1);
  assert.equal(state.satellites.length, 2);
});

test("a better observation signal can improve a mission after its full grant has been collected", () => {
  const state = R.createState(1);
  state.wallet = 300;
  fly(state, "m2", { fuel: 2, part: 2, paper: 1 });
  const improved = fly(state, "m2", { fuel: 2, part: 3, paper: 2 });
  assert.equal(improved.stars, 3);
  assert.equal(improved.grant, 0);
  assert.equal(improved.signalOutput, 1.25);
  assert.equal(improved.output, 0.25);
  assert.equal(state.satellites.length, 1);
  assert.equal(R.getRates(state).data, 1.75);
});

test("returning saves keep cash and progress and retain the best relay per mission", () => {
  const oldState = R.createState(1);
  oldState.wallet = 2500;
  oldState.facilities.grant.output = 45;
  oldState.facilities.grant.stock = 4;
  oldState.customers.bonus = 5;
  oldState.satellites = [
    { missionId: "m1", name: "First Light", stars: 3, output: 1 },
    { missionId: "m1", name: "First Light", stars: 3, output: 1 },
    { missionId: "m2", name: "Earth Watch", stars: 2, output: 0.5 },
    { missionId: "m2", name: "Earth Watch", stars: 3, output: 1.25 },
    { missionId: "m2", name: "Earth Watch", stars: 3, output: 1 },
  ];

  const restored = R.loadState({ getItem: () => JSON.stringify(oldState) });
  assert.equal(restored.wallet, 2500);
  assert.equal(restored.facilities.grant.output, 45);
  assert.equal(restored.customers.bonus, 3);
  assert.deepEqual(restored.satellites.map(({ output }) => output), [1, 1.25]);
  assert.equal(R.getRates(restored).data, 2.75);
  assert.equal(R.getMissionGrant(restored, "m2").remaining, 0);
});
