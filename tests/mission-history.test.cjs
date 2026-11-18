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
  assert.match(app, /stage.id === 'moon'[^]*Bonus history:/);
  assert.match(app, /aria-haspopup="dialog" aria-expanded="false" aria-controls="mission-history-popup"/);
  assert.match(app, /historyButton\(mission.id, mission.name\)/);
  assert.match(app, /class="nasa-fact mission-history-fact"/);
  assert.match(app, /if \(event.key === 'Escape'\)/);
  assert.match(app, /historyPopup.contains\(event.target\)\) clearTimeout\(historyHideTimer\)/);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(html, /id="mission-history-popup"[^>]*role="dialog"[^>]* hidden/);
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

test("all histories have unique packaged archival images and attribution", () => {
  const { images } = globalThis.SpaceportMissionHistory;
  assert.deepEqual(Object.keys(images).sort(), [...R.MISSIONS.map(mission => mission.id), "apollo"].sort());
  assert.equal(new Set(Object.values(images).map(image => image.file)).size, 12);
  for (const image of Object.values(images)) {
    const bytes = fs.readFileSync(path.join(__dirname, "../assets/mission-history", image.file));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    assert.ok(bytes.length < 190_000, image.file);
    assert.ok(image.credit && image.caption && image.alt);
    const source = new URL(image.source);
    assert.equal(source.protocol, "https:");
    assert.ok(source.hostname.endsWith(".nasa.gov"));
  }
});

test("history popup anchors below or above and clamps to the visual viewport", () => {
  const { position, verticalSpace } = globalThis.SpaceportMissionHistory;
  const card = { width: 320, height: 330 };
  const viewport = { x: 0, y: 0, width: 390, height: 820 };
  assert.deepEqual(position({left: 20, top: 60, bottom: 104}, card, viewport), {x: 20, y: 110});
  assert.equal(verticalSpace({top: 390, bottom: 434}, viewport), 372);
  assert.deepEqual(position({left: 360, top: 740, bottom: 784}, card, viewport), {x: 58, y: 404});
  assert.deepEqual(position({left: -20, top: 210, bottom: 254}, {width: 220, height: 306},
    {x: 20, y: 30, width: 244, height: 330}), {x: 32, y: 42});
});

test("dismissing a popup ignores same-trigger hover until real pointer movement leaves it", () => {
  const { createHoverLatch } = globalThis.SpaceportMissionHistory;
  const latch = createHoverLatch();
  const trigger = { getBoundingClientRect: () => ({left: 20, right: 64, top: 100, bottom: 144}) };
  const other = {};
  assert.equal(latch.allows(trigger), true);
  latch.dismiss(trigger);
  assert.equal(latch.allows(trigger), false, "synthetic hover after Escape stays suppressed");
  assert.equal(latch.allows(other), true, "other missions can still be previewed");
  latch.pointerMoved(23, 141);
  assert.equal(latch.allows(trigger), false, "movement inside trigger must not reopen it");
  latch.pointerMoved(64, 141);
  assert.equal(latch.allows(trigger), true, "real exit enables future hover");
  latch.dismiss(trigger);
  latch.reset();
  assert.equal(latch.allows(trigger), true, "closing the board discards stale suppression");
});
