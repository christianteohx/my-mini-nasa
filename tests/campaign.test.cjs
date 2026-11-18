const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../rules.js");

const R = globalThis.SpaceportRules;

function fly(state, missionId, loadout) {
  assert.equal(R.selectMission(state, missionId), true);
  state.loadout = { fuel: 0, part: 0, paper: 0, crew: 0, ...loadout };
  const report = R.launch(state);
  state.report = null;
  return report;
}

test("first three-star reward changes Ground Station capacity once", () => {
  const state = R.createState(1);
  assert.equal(R.getRates(state).cap, 20);
  assert.equal(R.getMissionReward(state, "m1").earned, false);

  const first = fly(state, "m1", { fuel: 1, part: 1 });
  assert.equal(first.stars, 3);
  assert.equal(first.unlockedReward.id, "groundCapacity");
  assert.equal(R.getRates(state).cap, 28);
  assert.equal(R.getMissionReward(state, "m1").earned, true);

  const repeat = fly(state, "m1", { fuel: 1, part: 1 });
  assert.equal(repeat.stars, 3);
  assert.equal(repeat.unlockedReward, undefined);
  assert.equal(R.getRates(state).cap, 28);
});

test("a safe weather payload, an uncrewed lunar orbiter, and a lighter lander earn full credit", () => {
  const byId = (id) => R.MISSIONS.find((mission) => mission.id === id);
  const storm = R.evaluateLaunch({ fuel: 3, part: 4, paper: 3 }, byId("m3"), () => 0);
  assert.equal(storm.stars, 2);
  assert.match(storm.cause, /12 mass or less/);
  const relay = R.evaluateLaunch({ fuel: 3, part: 3, paper: 1, crew: 1 }, byId("m5"), () => 0);
  assert.equal(relay.stars, 2);
  assert.match(relay.cause, /without astronauts/);
  const lander = R.evaluateLaunch({ fuel: 5, part: 5, paper: 4 }, byId("m7"), () => 0);
  assert.equal(lander.stars, 2);
  assert.match(lander.cause, /18 mass or less/);
});

test("v7 flight records restore earned rewards without any extra payouts", () => {
  const old = R.createState(1);
  old.stageIndex = 4;
  delete old.campaignOrder;
  delete old.bestStars;
  old.history = [
    { mission: { id: "m2" }, stars: 3 },
    { mission: { id: "m3" }, status: "success" },
    { mission: { id: "m4" }, stars: 3 },
    { mission: { id: "m5" }, stars: 3 },
    { mission: { id: "m7" }, stars: 3 },
    { mission: { id: "m8" }, stars: 3 },
  ];
  const restored = R.loadState({ getItem: () => JSON.stringify(old) });
  assert.equal(restored.wallet, old.wallet);
  assert.equal(restored.completed, true);
  assert.equal(R.getRates(restored).carry, 6);
  assert.equal(R.getRates(restored).data, 1.5);
  assert.equal(R.getGrantPayout(restored), 10);
  assert.equal(restored.facilities.cargo.unlocked, true);
  assert.equal(R.getCargoCapacity(restored), 12);
  assert.equal(R.getCargoItemCapacity(restored), 6);
  assert.equal(restored.upgrades.runner, 0);
  assert.equal(R.getProductionCycle(restored, "fuel"), 3.6);
  assert.equal(R.getFacilityOutputCapacity(restored, "fuel"), 8);

  restored.wallet = 200;
  assert.ok(R.unlockFacility(restored, "fuel"));
  assert.ok(R.transferAtStation(restored, "fuel", "make:fuel", 8));
  R.tick(restored, 8 * R.getProductionCycle(restored, "fuel"));
  assert.equal(restored.facilities.fuel.output, 8);
  assert.ok(R.transferAtStation(restored, "ground", "take:data", 4));
  assert.ok(R.transferAtStation(restored, "grant", "deposit:data", 4));
  R.tick(restored, 2.8);
  assert.equal(R.transferAtStation(restored, "grant", "collect:cash", 1).count, 43);
});

test("flight insurance refunds half the fee on failures after the first Mariner 9 clear", () => {
  const state = R.createState(1);
  state.stageIndex = 3;
  state.wallet = 500;
  const before = fly(state, "m2", { fuel: 1, part: 4, paper: 1 });
  assert.equal(before.status, "failed");
  assert.equal(before.feeRefund, 0);
  assert.equal(state.wallet, 460);

  const survey = fly(state, "m6", { fuel: 4, part: 3, paper: 2 });
  assert.equal(survey.stars, 3);
  assert.equal(survey.unlockedReward.id, "flightInsurance");
  const balance = state.wallet;
  const after = fly(state, "m2", { fuel: 1, part: 4, paper: 1 });
  assert.equal(after.status, "failed");
  assert.equal(after.feeRefund, 20);
  assert.equal(state.wallet, balance - 20);
});
