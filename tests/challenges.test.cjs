const assert = require("node:assert/strict");
const { test } = require("node:test");
require("../rules.js");
require("../challenges.js");

const R = globalThis.SpaceportRules;
const C = globalThis.SpaceportChallenges;
const firstLight = R.MISSIONS.find(mission => mission.id === "m1");
const earthWatch = R.MISSIONS.find(mission => mission.id === "m2");

function launch(mission, loadout, success) {
  return R.evaluateLaunch(loadout, mission, () => success ? 0 : 1);
}

test("Flight focus advances after completion, eases after two misses, and saves the player's rank", () => {
  const profile = C.normalize();
  const loadout = { fuel: 1, part: 1 };
  const success = launch(firstLight, loadout, true);
  const failure = launch(firstLight, loadout, false);

  assert.equal(C.recordLaunch(profile, success), null);
  assert.equal(C.selectFocus(profile, "flight"), true);
  assert.equal(C.recordLaunch(profile, success), "complete");
  assert.equal(C.getChallenge(profile).rank, 1);
  assert.equal(C.advance(profile), true);
  assert.equal(C.getChallenge(profile).target, 2);
  assert.equal(C.recordLaunch(profile, failure), null);
  assert.equal(C.getChallenge(profile).tier, 2);

  const restored = C.normalize(JSON.parse(JSON.stringify(profile)));
  assert.equal(C.recordLaunch(restored, failure), "eased");
  assert.equal(C.getChallenge(restored).tier, 1);
  assert.equal(C.getChallenge(restored).rank, 1);
  assert.equal(C.recordLaunch(restored, success), "complete");
});

test("switching focus preserves separate progress and harder Operations goals require two factories", () => {
  const profile = C.normalize();
  C.selectFocus(profile, "operations");
  assert.equal(C.recordOperations(profile, "fuel", 1), "progress");
  C.selectFocus(profile, "research");
  assert.equal(C.getChallenge(profile).progress, 0);
  assert.equal(C.recordOperations(profile, "fuel", 3), null);
  C.selectFocus(profile, "operations");
  assert.equal(C.getChallenge(profile).progress, 1);
  assert.equal(C.recordOperations(profile, "grant", 4), null);
  assert.equal(C.recordOperations(profile, "fuel", 2), "complete");
  C.advance(profile);
  assert.equal(C.recordOperations(profile, "fuel", 6), "complete");
  C.advance(profile);
  assert.equal(C.recordOperations(profile, "fuel", 9), "progress");
  assert.equal(C.getChallenge(profile).complete, false);
  assert.equal(C.getChallenge(profile).distinctTarget, 2);
  assert.equal(C.recordOperations(profile, "engineering", 1), "complete");
  assert.equal(C.getChallenge(profile).rank, 3);
});

test("Research excludes demonstration flights, inoperative instruments, and failed science missions", () => {
  const profile = C.normalize();
  C.selectFocus(profile, "research");
  assert.equal(C.recordLaunch(profile, launch(firstLight, { fuel: 1, part: 1 }, true)), null);
  assert.equal(C.recordLaunch(profile, launch(earthWatch, { fuel: 2, part: 1, paper: 1 }, true)), null);
  assert.equal(C.recordLaunch(profile, launch(earthWatch, { fuel: 2, part: 2, paper: 1 }, false)), null);
  assert.equal(C.getChallenge(profile).progress, 0);
  assert.equal(C.recordLaunch(profile, launch(earthWatch, { fuel: 2, part: 2, paper: 1 }, true)), "complete");
  assert.equal(C.getChallenge(profile).rank, 1);
});

test("recommendations use recent play and never switch the selected focus", () => {
  const profile = C.normalize();
  const demo = launch(firstLight, { fuel: 1, part: 1 }, true);
  const science = launch(earthWatch, { fuel: 2, part: 3, paper: 2 }, true);
  C.recordLaunch(profile, demo);
  assert.equal(C.recommendFocus(profile), null);
  for (let i = 0; i < 14; i++) C.recordOperations(profile, "fuel", 1);
  assert.equal(C.recommendFocus(profile).id, "operations");

  C.selectFocus(profile, "operations");
  C.recordLaunch(profile, demo);
  assert.equal(C.recommendFocus(profile).id, "flight");
  C.recordLaunch(profile, science);
  C.recordLaunch(profile, science);
  const restored = C.normalize(JSON.parse(JSON.stringify(profile)));
  assert.equal(C.recommendFocus(restored).id, "research");
  assert.equal(C.getChallenge(restored).focus, "operations");

  for (let i = 0; i < 40; i++) C.recordOperations(restored, "engineering", 1);
  assert.equal(C.recommendFocus(restored).id, "operations");
});
