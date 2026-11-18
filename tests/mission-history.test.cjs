const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
require("../rules.js");
require("../mission-history.js");

const R = globalThis.SpaceportRules;

test("real mission names map to the existing campaign IDs and official sources", () => {
  assert.deepEqual(R.MISSIONS.map(({id, name}) => [id, name]), [
    ["m1", "Explorer 6"], ["m2", "Landsat 1"], ["m3", "TIROS-1"], ["m4", "Skylab 2"],
    ["m5", "Lunar Orbiter 1"], ["m6", "Mariner 9"], ["m7", "Viking 1"],
    ["m9", "Juno"], ["m10", "Cassini"], ["m11", "Voyager 2"], ["m8", "Parker Solar Probe"],
  ]);
  assert.deepEqual(R.STAGES.flatMap(stage => stage.missionIds), R.MISSIONS.map(m => m.id));
  for (const mission of R.MISSIONS) {
    const source = new URL(mission.historyUrl);
    assert.equal(source.protocol, "https:");
    assert.ok(["www.nasa.gov", "science.nasa.gov"].includes(source.hostname));
    assert.ok(mission.description.length && mission.objective.length);
    assert.notEqual(mission.description, mission.objective);
  }
  assert.match(R.MISSIONS.find(m => m.id === "m11").arrival, /flyby/);
  assert.match(R.MISSIONS.find(m => m.id === "m8").arrival, /corona/);
});

test("old mission labels in saved flights do not affect selection or rewards", () => {
  const old = R.createState(42);
  old.wallet = 2300;
  old.stageIndex = 3;
  old.missionIndex = 5;
  old.bestStars = { m2: 3, m6: 2 };
  old.recipes = { m6: "purchase" };
  old.satellites = [{ missionId: "m6", stars: 2, output: 1 }];
  old.history = [{ mission: { id: "m6", name: "Mars Surveyor" }, stars: 2 }];
  const state = R.loadState({ getItem: () => JSON.stringify(old) });
  assert.equal(state.wallet, old.wallet);
  assert.equal(state.missionIndex, old.missionIndex);
  assert.equal(R.MISSIONS[state.missionIndex].name, "Mariner 9");
  assert.equal(state.bestStars.m6, 2);
  assert.equal(state.recipes.m6, "purchase");
  assert.equal(state.satellites[0].missionId, "m6");
  assert.deepEqual(state.history, old.history);
  assert.equal(R.isMissionAvailable(state, "m9"), false);
});

test("mission cards and reports mark historical sources separately from game goals", () => {
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /Inspired by real NASA missions/);
  assert.match(app, /In game:<\/strong> \$\{escapeHTML\(mission\.objective\)\}/);
  assert.match(app, /stage.id === 'moon'[^]*Bonus history: Apollo 11/);
  assert.match(app, /<details class="mission-history">/);
  assert.match(app, /<summary aria-label=/);
  assert.match(app, /missionHistory\(mission.name, historyData.missions\[mission.id\], mission.historyUrl\)/);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.ok(html.indexOf('src="mission-history.js?') > 0 && html.indexOf('src="mission-history.js?') < html.indexOf('src="app.js?'));
  assert.match(app, /const mission = reportMission\(report\)/);
  assert.match(app, /row\(reportMission\(report\)\?\.name/);
});

test("every playable mission has a dated story; Apollo 11 stays a historical extra", () => {
  const { missions, apollo } = globalThis.SpaceportMissionHistory;
  assert.deepEqual(Object.keys(missions).sort(), R.MISSIONS.map(mission => mission.id).sort());
  for (const [id, history] of Object.entries(missions)) {
    assert.match(history.date, /\d{4}/, id);
    assert.ok(history.story.length >= 100 && history.story.length <= 270, id);
    if (history.extraSource) assert.equal(new URL(history.extraSource.url).origin, "https://science.nasa.gov");
  }
  assert.equal(apollo.name, "Apollo 11");
  assert.match(apollo.date, /1969/);
  assert.equal(new URL(apollo.historyUrl).origin, "https://www.nasa.gov");
  assert.equal(R.MISSIONS.some(m => m.name === apollo.name), false);
});
