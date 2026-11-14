# My Mini NASA

A single-player browser game for the 2026 NASA Space Apps **Space Mission Design Game** challenge. Collect satellite data, trade it for grants, make spacecraft supplies, and carry them to the launch pad. Successful satellites send back more data.

## Play

Open `index.html` in a browser, or serve this directory with any static web server. There are no runtime packages to install. The game saves your progress in the current browser. An HTTP server gives the game a stable browser origin for saving.

Use **WASD** or the **arrow keys** to move. On a touchscreen, drag to steer. The camera follows your astronaut. Pad signs show what a facility accepts, the cost per batch, and its ready stock out of capacity. Walk onto a pad to pick up or deliver supplies automatically. At the Launch Pad, set a quantity between **Unload** and **Load** for each item. Walk onto the Return Supplies pad to put extras back into stock.

The Grant Officer pays an extra $5 for every four Data Cubes. In **Upgrades**, the Grant Intern delivers cubes, the Cargo Runner stocks the Cargo Shelf, the Materials Intern supplies factories for your selected mission, and the Credit Clerk banks grant payouts. Workers can be paused separately and take a short break between trips. The Crew, Machines, and Player cards show the current level, current stat, and next gain.

**Choose mission** opens the mission board. First Light and Earth Watch are available from the start. Each mission's first three-star clear earns a permanent perk. For example, Earth Watch pays $2 more per Data Cube, Lunar Relay opens and expands the Cargo Shelf, and Mars Surveyor refunds half the launch fee on failed flights. After a three-star flight, the report lets you replay, select the next mission, or open the next section when it is within budget. The route goes from Earth orbit through the Moon and Mars to Solar Probe, the final mission. The Launch Pad keeps its loaded supplies when you choose another mission.

Each mission has an optimal payload plan. Extra and missing supplies both reduce the odds. A three-star success unlocks the plan for free, as does flying the exact payload on a failed attempt. You can also buy a plan before flying. Use the Mission Control toggle to free up more of the yard.

## Development

`rules.js` owns the economy, station timers, seeded launch evaluation and saves. `yard.js` handles movement and rendering, `machines.js` draws the facilities, `stations.js` renders the station controls, and `app.js` connects the yard to the control panels.

Run the rules tests with:

```sh
node --test tests/*.test.cjs
```

The missions use simplified game units. Flight reports link to the NASA material behind the design choices. The campaign starts with one spare Part at Engineering so First Light can fly before the fabrication line is unlocked. Extra powered science within the mission limit earns a small downlink bonus, which makes the additional mass and launch risk a player choice.

- [NASA Space Apps challenge brief](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
- [NASA Design and Develop Science Missions](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf)
- [My Mini Mart by Supersonic Studios](https://apps.apple.com/us/app/my-mini-mart/id1592004814)

## Releases

| Release | Sites version | Changes |
| --- | --- | --- |
| v10 | 10 | Spaced out the yard and station labels, removed the Grant Officer tag, and simplified the Upgrades menu. |
| v9 | 9 | Renamed the game to My Mini NASA. |
| v8 | 8 | Centered follow camera, station signs, staffed Grant Office, four upgradeable crew roles, mission perks, and one-row payload transfers. |
| v7 | 7 | Walk-up yard actions, Return Supplies pad, and idle Intern animation at a full Grant Office. |
| v6 | 6 | Exact quantities at the Launch Pad, one-click actions elsewhere, and a clearer Grant Bonus counter. |
| v5 | 5 | Exact item quantities, facility input and output panels, free payload plans after success, and missions to the Moon, Mars, and the Sun. |
| v4 | 4 | One pad per station for drop-off and pickup. |
| v3 | 3 | Full-window yard, collapsible Mission Control, mission choice, Flight Annex, and hidden recipes. |
| v2 | 2 | Brighter yard, scientist orders, walk-up upgrades, and Cargo Runner. First public release. |
| v1 | 1 | First playable release, with four Earth-orbit missions. |

To roll back the public game, redeploy the corresponding saved version in Sites. The source checkout also has a Git tag for each release.
