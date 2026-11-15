(() => {
  "use strict";

  const SAVE_KEY = "pocket-spaceport.v1";
  const INGREDIENTS = ["fuel", "part", "paper", "crew"];
  const FACTORIES = ["fuel", "engineering", "research", "academy"];
  const PRODUCERS = ["grant", ...FACTORIES];
  const UNLOCK_ORDER = ["fuel", "engineering", "research", "academy"];
  const INPUT_CAPACITY = 10;
  const OUTPUT_CAPACITY = 6;
  const CARGO_CAPACITY = 8;
  const CARGO_ITEM_CAPACITY = 4;
  const CARGO_PRIORITY = ["paper", "crew", "part", "fuel"];
  const GRANT_BONUS = 3;

  // Special products: each finished batch has a small chance to come out as a special.
  const SPECIALS = { engineering: "primePart", research: "prizePaper", academy: "eliteCrew" };
  const SPECIAL_ITEMS = Object.values(SPECIALS);
  const SPECIAL_SOURCE = Object.fromEntries(Object.entries(SPECIALS).map(([facility, item]) => [item, facility]));
  const SPECIAL_CHANCE = [0.1, 0.2];
  const SPECIAL_QUALITY = {
    engineering: { price: 300, mission: "m2" },
    research: { price: 500, mission: "m4" },
    academy: { price: 800, mission: "m5" },
  };
  // Machine speed upgrades also need a special product from the next factory in the chain.
  const SPEED_SPECIALS = { fuel: "primePart", engineering: "prizePaper", research: "eliteCrew", academy: "primePart" };
  const SPEED_SPECIAL_COUNTS = [1, 2];
  const SPECIAL_REWARDS = { primePart: 0.05, prizePaper: 0.3, eliteCrew: 0.5 };
  const MAX_ODDS = 0.98;

  const ITEMS = {
    data: { name: "Data Cube", plural: "Data Cubes", color: "#6dd5ff", mass: 0 },
    fuel: { name: "Fuel", plural: "Fuel", color: "#ffad62", mass: 2 },
    part: { name: "Part", plural: "Parts", color: "#81d6ff", mass: 1 },
    paper: { name: "Research Paper", plural: "Research Papers", color: "#b9a0ff", mass: 1 },
    crew: { name: "Astronaut", plural: "Astronauts", color: "#e6fa83", mass: 3 },
    primePart: { name: "Prime Part", plural: "Prime Parts", color: "#ffd23f", mass: 1, base: "part", special: true },
    prizePaper: { name: "Prize Paper", plural: "Prize Papers", color: "#ffd23f", mass: 1, base: "paper", special: true },
    eliteCrew: { name: "Elite Astronaut", plural: "Elite Astronauts", color: "#ffd23f", mass: 3, base: "crew", special: true },
    cash: { name: "Cash", plural: "Cash", color: "#bfe98a", mass: 0 },
  };

  const FACILITIES = {
    ground: { id: "ground", name: "Ground Station", item: "data", cubes: 0, cash: 0, cycle: 2, unlock: 0, after: 0 },
    grant: { id: "grant", name: "Grant Office", item: "cash", cubes: 1, cash: 0, cycle: 0.7, unlock: 0, after: 0 },
    fuel: { id: "fuel", name: "Fuel Plant", item: "fuel", cubes: 0, cash: 15, cycle: 4.5, unlock: 40, after: 0 },
    engineering: { id: "engineering", name: "Engineering", item: "part", cubes: 2, cash: 20, cycle: 4.5, unlock: 100, after: 0 },
    research: { id: "research", name: "Research Lab", item: "paper", cubes: 3, cash: 25, cycle: 6.5, unlock: 200, after: 0 },
    academy: { id: "academy", name: "Academy", item: "crew", cubes: 4, cash: 40, cycle: 10, unlock: 400, after: 0, stage: "expansion" },
    scrap: { id: "scrap", name: "Scrap Bin", item: null, cubes: 0, cash: 0, cycle: 0, unlock: 0, after: 0 },
    launch: { id: "launch", name: "Launch Pad", item: null, cubes: 0, cash: 0, cycle: 0, unlock: 0, after: 0 },
    cargo: { id: "cargo", name: "Cargo Shelf", item: null, cubes: 0, cash: 0, cycle: 0, unlock: 0, after: 0 },
    returns: { id: "returns", name: "Returns", item: null, cubes: 0, cash: 0, cycle: 0, unlock: 0, after: 0 },
  };

  const STAGES = [
    { id: "yard", name: "Orbital Yard", destination: "Earth", price: 0, missionIds: ["m1", "m2"] },
    { id: "expansion", name: "Flight Annex", destination: "Earth", price: 700, missionIds: ["m3", "m4"] },
    { id: "moon", name: "Lunar Program", destination: "Moon", price: 900, missionIds: ["m5"] },
    { id: "mars", name: "Mars Program", destination: "Mars", price: 1300, missionIds: ["m6", "m7"] },
    { id: "sun", name: "Solar Program", destination: "Sun", price: 1900, missionIds: ["m8"] },
  ];

  const MISSIONS = [
    {
      id: "m1", stage: "yard", name: "First Light", destination: "Earth", arrival: "Earth orbit",
      description: "Send a small CubeSat into orbit and receive its first signal.",
      objective: "Power a CubeSat and receive its first signal from Earth orbit.",
      perk: { id: "groundCapacity", name: "Larger Data Storage", detail: "The Ground Station holds 8 more Data Cubes." },
      rocket: "Rideshare", orbit: "Low Earth orbit", massLimit: 6, baseFuel: 1, dryFuelStep: 5,
      scienceMin: 0, scienceMax: 0, crewMin: 0, crewMax: 0, fee: 0, reward: 50,
    },
    {
      id: "m2", stage: "yard", name: "Earth Watch", destination: "Earth", arrival: "Earth orbit",
      description: "Observe Earth from orbit. Extra instruments return more observations and use more of your mass allowance.",
      objective: "Map Earth from orbit with at least one working instrument.",
      perk: { id: "grantPayout", name: "Research Grant", detail: "The Grant Office pays $2 more per Data Cube." },
      rocket: "Small", orbit: "Low Earth orbit", massLimit: 10, baseFuel: 1, dryFuelStep: 5,
      scienceMin: 1, scienceMax: 2, crewMin: 0, crewMax: 0, fee: 40, reward: 120,
    },
    {
      id: "m3", stage: "expansion", name: "Storm Tracker", destination: "Earth", arrival: "Earth orbit",
      description: "Track emerging storms with a payload of powered weather instruments.",
      objective: "Power two storm instruments and keep the payload at 12 mass or less.",
      perk: { id: "fuelSpeed", name: "Fuel Plant Boost", detail: "The Fuel Plant produces Fuel 25% faster." },
      rocket: "Medium", orbit: "Low Earth orbit", massLimit: 14, threeStarMassLimit: 12, baseFuel: 1, dryFuelStep: 5,
      scienceMin: 2, scienceMax: 3, crewMin: 0, crewMax: 0, fee: 80, reward: 250,
    },
    {
      id: "m4", stage: "expansion", name: "Station Science", destination: "Earth", arrival: "Earth orbit",
      description: "Put an astronaut and their experiments into orbit with power for each.",
      objective: "Keep an astronaut and at least one experiment powered in Earth orbit.",
      perk: { id: "carryCapacity", name: "Cargo Harness", detail: "Your bag holds 2 more items." },
      rocket: "Heavy", orbit: "Low Earth orbit", massLimit: 20, baseFuel: 1, dryFuelStep: 5,
      scienceMin: 1, scienceMax: 2, crewMin: 1, crewMax: 2, fee: 150, reward: 500,
    },
    {
      id: "m5", stage: "moon", name: "Lunar Relay", destination: "Moon", arrival: "lunar orbit",
      description: "Place a relay in lunar orbit to pass signals between the Moon and Earth.",
      objective: "Place an uncrewed relay in lunar orbit to connect the Moon and Earth.",
      perk: { id: "cargoCapacity", name: "Cargo Shelf", detail: "Open the Cargo Shelf with 12 total slots and room for 6 of each item." },
      rocket: "Lunar launcher", orbit: "Lunar orbit", massLimit: 16, uncrewedOnly: true, baseFuel: 2, dryFuelStep: 5,
      scienceMin: 1, scienceMax: 2, crewMin: 0, crewMax: 0, fee: 200, reward: 650, dataMultiplier: 1.6, tipId: "moon",
    },
    {
      id: "m6", stage: "mars", name: "Mars Surveyor", destination: "Mars", arrival: "Mars orbit",
      description: "Map the terrain and monitor dust storms from Mars orbit.",
      objective: "Keep two instruments running in Mars orbit to map terrain and dust storms.",
      perk: { id: "flightInsurance", name: "Flight Insurance", detail: "Failed launches refund half the launch fee." },
      rocket: "Mars launcher", orbit: "Mars orbit", massLimit: 18, baseFuel: 3, dryFuelStep: 5,
      scienceMin: 2, scienceMax: 2, crewMin: 0, crewMax: 0, fee: 280, reward: 850, dataMultiplier: 2.2, tipId: "marsOrbit",
    },
    {
      id: "m7", stage: "mars", name: "Mars Lander", destination: "Mars", arrival: "the Martian surface",
      description: "Land a robotic science station to study Martian rocks and soil up close.",
      objective: "Land three working instruments on Mars with a payload of 18 mass or less.",
      perk: { id: "factoryCapacity", name: "Factory Storage", detail: "Each factory can hold 2 more finished items." },
      rocket: "Mars heavy launcher", orbit: "Mars surface", massLimit: 22, threeStarMassLimit: 18, baseFuel: 3, dryFuelStep: 5,
      scienceMin: 3, scienceMax: 4, crewMin: 0, crewMax: 0, fee: 350, reward: 1100, dataMultiplier: 2.2, tipId: "marsLanding",
    },
    {
      id: "m8", stage: "sun", name: "Solar Probe", destination: "Sun", arrival: "the solar corona",
      description: "Fly a heat-shielded probe through the Sun’s outer atmosphere to study the solar wind.",
      objective: "Sample the solar wind with four working instruments during a close flyby.",
      perk: { id: "solarData", name: "Solar Downlink", detail: "Your yard receives 1 extra Data Cube per second." },
      rocket: "Solar heavy launcher", orbit: "Solar flyby", massLimit: 25, baseFuel: 3, dryFuelStep: 5,
      scienceMin: 4, scienceMax: 5, crewMin: 0, crewMax: 0, fee: 500, reward: 1600, dataMultiplier: 2.8, tipId: "sun",
    },
  ];

  const RECIPES = {
    m1: { price: 225, peakOdds: 0.92, ingredients: { fuel: 1, part: 1, paper: 0, crew: 0 } },
    m2: { price: 450, peakOdds: 0.88, ingredients: { fuel: 2, part: 2, paper: 1, crew: 0 } },
    m3: { price: 950, peakOdds: 0.86, ingredients: { fuel: 2, part: 4, paper: 3, crew: 0 } },
    m4: { price: 1650, peakOdds: 0.84, ingredients: { fuel: 2, part: 4, paper: 2, crew: 1 } },
    m5: { price: 2200, peakOdds: 0.82, ingredients: { fuel: 3, part: 3, paper: 2, crew: 0 } },
    m6: { price: 3100, peakOdds: 0.80, ingredients: { fuel: 4, part: 3, paper: 2, crew: 0 } },
    m7: { price: 4100, peakOdds: 0.78, ingredients: { fuel: 4, part: 5, paper: 4, crew: 0 } },
    m8: { price: 5800, peakOdds: 0.76, ingredients: { fuel: 5, part: 6, paper: 5, crew: 0 } },
  };
  const ODDS_PENALTY = { fuel: 0.12, part: 0.09, paper: 0.08, crew: 0.14 };
  const LOADABLE = [...INGREDIENTS, ...SPECIAL_ITEMS];
  const THIN_MARGIN_PENALTY = 0.2;

  const WORKERS = {
    intern: { id: "intern", name: "Grant Intern", description: "Carries Data Cubes from the Ground Station to the Grant Office.", hire: 250, capacity: [3, 5], carryPrice: 180, carryUnit: "Data Cubes", speedPrice: 200 },
    runner: { id: "runner", name: "Cargo Runner", description: "Moves finished hardware from factories to the Cargo Shelf.", hire: 300, capacity: [1, 2], carryPrice: 260, carryUnit: "supplies", speedPrice: 220 },
    materials: { id: "materials", name: "Materials Intern", description: "Supplies factories with Data Cubes for your active mission and keeps cash on hand for launch.", hire: 450, capacity: [4, 8], carryPrice: 280, carryUnit: "Data Cubes", speedPrice: 240 },
    clerk: { id: "clerk", name: "Credit Clerk", description: "Collects ready Grant Office cash and credits your wallet.", hire: 380, capacity: null, speedPrice: 180 },
  };
  const WORKER_SPEEDS = [1, 1.25];
  const WORKER_REST_SECONDS = 0.45;
  const STARTING_UPGRADES = { carry: 0, speed: 0, ground: 0 };
  const UPGRADES = {
    carry: { id: "carry", label: "Carry capacity", levels: [4, 6, 8, 12], prices: [60, 150, 300], category: "player", stat: "items" },
    speed: { id: "speed", label: "Walk speed", levels: [1, 1.15, 1.30, 1.45], prices: [80, 160, 320], category: "player", stat: "speed" },
    facility: { id: "facility", label: "Production speed", levels: [1, 1.25, 1.5], prices: [100, 250], category: "facility", stat: "cycle" },
    ground: { id: "ground", label: "Data pile capacity", levels: [20, 40], prices: [120], category: "facility", stat: "Data Cubes" },
  };
  for (const worker of Object.values(WORKERS)) {
    const { id, name, hire, capacity, carryPrice, carryUnit, speedPrice } = worker;
    const speedId = id + "Speed";
    UPGRADES[id] = { id, label: "Hire " + name, levels: [false, true], prices: [hire], category: "hire", role: id, stat: "hire" };
    UPGRADES[speedId] = { id: speedId, label: "Work speed", levels: WORKER_SPEEDS, prices: [speedPrice], category: "worker", role: id, stat: "speed" };
    STARTING_UPGRADES[id] = 0;
    STARTING_UPGRADES[speedId] = 0;
    if (capacity) {
      const carryId = id + "Carry";
      UPGRADES[carryId] = { id: carryId, label: "Carry capacity", levels: capacity, prices: [carryPrice], category: "worker", role: id, stat: carryUnit };
      STARTING_UPGRADES[carryId] = 0;
    }
  }

  const CUBESAT = "https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf";
  const CUBESAT_LAUNCH = "https://www.nasa.gov/cubesat-launch-initiative-introduction/";
  const SCIENCE_DESIGN = "https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf";
  const TIPS = {
    fuel: { text: "It takes more propellant to accelerate a heavier rocket to the same speed.", source: "NASA Glenn · Ideal Rocket Equation", url: "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/" },
    part: { text: "Many CubeSats use solar panels to generate electricity for their instruments.", source: "NASA · CubeSat 101", url: CUBESAT },
    paper: { text: "Science goals guide which instruments a real mission carries.", source: "NASA Webb · Build It Yourself", url: "https://science.nasa.gov/mission/webb/game-build-it-yourself/" },
    crew: { text: "Life-support hardware uses power to provide clean water and breathable air.", source: "NASA · Life Support Systems", url: "https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/" },
    data: { text: "A mission's user segment is the scientists and other people who use its data.", source: "NASA · Design and Develop Science Missions", url: SCIENCE_DESIGN },
    cubeSat: { text: "CubeSats come in units called U. Each unit is roughly a 10-centimeter cube.", source: "NASA · CubeSat 101", url: CUBESAT },
    free: { text: "NASA’s CubeSat Launch Initiative gives eligible organizations a low-cost ride to space.", source: "NASA · CubeSat Launch Initiative", url: CUBESAT_LAUNCH },
    limit: { text: "Launch providers check a CubeSat's mass against limits before allowing it to fly.", source: "NASA · CubeSat 101", url: CUBESAT },
    margin: { text: "Engineers keep spare mass capacity so later additions still fit on the rocket.", source: "NASA · CubeSat 101", url: CUBESAT },
    iterate: { text: "Mission teams compare designs and refine the one that best fits their requirements.", source: "NASA · Design and Develop Science Missions", url: SCIENCE_DESIGN },
    moon: { text: "NASA’s Lunar Reconnaissance Orbiter maps terrain that mission planners use to choose safe landing sites.", source: "NASA · Lunar Reconnaissance Orbiter", url: "https://science.nasa.gov/mission/lro/" },
    marsOrbit: { text: "Mars Reconnaissance Orbiter gathers its own observations and relays data from rovers on the ground.", source: "NASA · Mars Relay Network", url: "https://science.nasa.gov/mars/mars-relay-network/" },
    marsLanding: { text: "Mars missions have used heat shields, parachutes, and powered descent to survive entry and landing.", source: "NASA · How We Land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" },
    sun: { text: "NASA’s Parker Solar Probe became the first spacecraft to fly through the Sun’s outer atmosphere.", source: "NASA · Parker Solar Probe", url: "https://science.nasa.gov/mission/parker-solar-probe/" },
  };

  function emptyLoadout() {
    return { fuel: 0, part: 0, paper: 0, crew: 0 };
  }

  function emptySpecials() {
    return Object.fromEntries(SPECIAL_ITEMS.map((item) => [item, 0]));
  }

  function makeFacility(id) {
    return {
      unlocked: ["ground", "grant", "launch", "returns"].includes(id),
      input: 0,
      output: id === "ground" ? 4 : Number(id === "engineering"),
      progress: 0,
      active: false,
      speed: 0,
      special: 0,
      specialMade: 0,
      quality: 0,
    };
  }

  function makeCustomers() {
    return { order: 4, filled: 0, bonus: GRANT_BONUS, completed: 0 };
  }

  function makeRunner() {
    return { phase: "search", progress: 0, from: null, cargo: null, cargoCount: 0, shelf: { ...emptyLoadout(), ...emptySpecials() } };
  }

  function makeMaterials() {
    return { phase: "wait", progress: 0, from: "ground", to: null, cargo: 0 };
  }

  function makeClerk() {
    return { phase: "wait", progress: 0, cargo: 0 };
  }

  function freshSeed() {
    if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
    return Math.floor(Math.random() * 2 ** 32);
  }

  function createState(seed = freshSeed()) {
    const facilities = Object.fromEntries(Object.keys(FACILITIES).map((id) => [id, makeFacility(id)]));
    facilities.grant.stock = 0;

    return {
      version: 1,
      wallet: 20,
      inventory: { data: 0, ...emptyLoadout(), ...emptySpecials() },
      loadout: emptyLoadout(),
      specialLoadout: emptySpecials(),
      facilities,
      missionIndex: 0,
      furthestMissionIndex: 1,
      stageIndex: 0,
      expanded: false,
      satellites: [],
      discovered: {},
      recipes: {},
      bestStars: {},
      tipsSeen: {},
      upgrades: { ...STARTING_UPGRADES },
      workerEnabled: {},
      workerRest: {},
      helper: { phase: "collect", progress: 0, cargo: 0 },
      customers: makeCustomers(),
      runner: makeRunner(),
      materials: makeMaterials(),
      clerk: makeClerk(),
      stats: { collected: 0, sold: 0, built: 0, attempts: 0 },
      report: null,
      history: [],
      time: 0,
      completed: false,
      rngSeed: (seed >>> 0) || 1,
      qualitySeed: ((seed ^ 0x9e3779b9) >>> 0) || 7,
    };
  }

  function loadState(storage) {
    try {
      const raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
      const saved = JSON.parse(raw);
      if (saved?.version === 1 && saved.facilities && Array.isArray(saved.satellites)) {
        saved.history ??= saved.report ? [saved.report] : [];
        saved.customers ??= makeCustomers();
        saved.customers.bonus = GRANT_BONUS;
        saved.runner ??= makeRunner();
        saved.runner.shelf = { ...emptyLoadout(), ...emptySpecials(), ...saved.runner.shelf };
        saved.runner.cargoCount ??= Number(Boolean(saved.runner.cargo));
        saved.upgrades = { ...STARTING_UPGRADES, ...saved.upgrades };
        saved.workerEnabled ??= {};
        saved.workerRest ??= {};
        saved.materials ??= makeMaterials();
        saved.clerk ??= makeClerk();
        saved.facilities.grant.stock ??= Math.floor(saved.facilities.grant.output / 10);
        saved.facilities.cargo ??= makeFacility("cargo");
        saved.facilities.returns ??= makeFacility("returns");
        saved.inventory = { ...emptySpecials(), ...saved.inventory };
        saved.specialLoadout = { ...emptySpecials(), ...saved.specialLoadout };
        for (const facility of Object.values(saved.facilities)) {
          facility.special ??= 0;
          facility.specialMade ??= 0;
          facility.quality ??= 0;
        }
        saved.qualitySeed ??= ((saved.rngSeed ^ 0x9e3779b9) >>> 0) || 7;
        if (!Number.isInteger(saved.stageIndex) || !STAGES[saved.stageIndex]) {
          const hadAnnex = saved.expanded ?? Boolean(saved.completed
            || saved.furthestMissionIndex >= 2 || saved.missionIndex >= 2 || saved.facilities.academy?.unlocked
            || saved.satellites.some(({ missionId }) => STAGES[1].missionIds.includes(missionId)));
          saved.stageIndex = Number(hadAnnex);
          // Before the lunar program, some saves used index four after the final Earth flight.
          if (saved.missionIndex >= 4) saved.missionIndex = 3;
        }
        saved.expanded = saved.stageIndex >= 1;
        saved.bestStars ??= {};
        for (const { missionId, stars } of saved.satellites) {
          if (missionId && stars) saved.bestStars[missionId] = Math.max(saved.bestStars[missionId] ?? 0, stars);
        }
        saved.satellites = saved.satellites.reduce((fleet, satellite) => {
          updateDownlink(fleet, satellite);
          return fleet;
        }, []);
        if (saved.completed && saved.stageIndex === 1 && !STAGES[1].missionIds.some((id) => saved.bestStars[id] === 3)) {
          saved.bestStars.m4 = 3;
        }
        saved.furthestMissionIndex = MISSIONS.findLastIndex((mission) => mission.stage === getStage(saved).id);
        if (!isMissionAvailable(saved, saved.missionIndex)) saved.missionIndex = saved.furthestMissionIndex;
        saved.recipes ??= {};
        for (const { id } of MISSIONS) {
          if (hasThreeStars(saved, id)) saved.recipes[id] ??= "flight";
        }
        for (const report of [...saved.history, saved.report]) {
          const id = report?.mission?.id;
          if (Object.hasOwn(RECIPES, id) && (report.status === "success" || report.stars === 3)) {
            saved.bestStars[id] = 3;
            saved.recipes[id] ??= "flight";
          }
        }
        if (hasThreeStars(saved, "m5")) saved.facilities.cargo.unlocked = true;
        saved.completed = hasThreeStars(saved, "m8");
        return saved;
      }
    } catch {
      // Keep the game playable when storage is unavailable or an old save is corrupt.
    }
    return createState();
  }

  function saveState(state, storage) {
    try {
      (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function getInventoryCount(state) {
    return Object.values(state.inventory).reduce((total, count) => total + count, 0);
  }

  function carryRoom(state) {
    return getRates(state).carry - getInventoryCount(state);
  }

  function validQuantity(quantity, max) {
    return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= max;
  }

  function getRates(state) {
    return {
      data: 0.5 + Number(hasThreeStars(state, "m8")) + state.satellites.reduce((total, satellite) => total + satellite.output, 0),
      carry: UPGRADES.carry.levels[state.upgrades.carry] + 2 * Number(hasThreeStars(state, "m4")),
      speed: UPGRADES.speed.levels[state.upgrades.speed],
      cap: UPGRADES.ground.levels[state.upgrades.ground] + 8 * Number(hasThreeStars(state, "m1")),
      intern: Boolean(state.upgrades.intern),
    };
  }

  function getGrantPayout(state) {
    return 8 + 2 * Number(hasThreeStars(state, "m2"));
  }

  function getProductionCycle(state, id) {
    const boost = id === "fuel" && hasThreeStars(state, "m3") ? 1.25 : 1;
    return FACILITIES[id].cycle / (boost * UPGRADES.facility.levels[state.facilities[id].speed]);
  }

  function getFacilityOutputCapacity(state, id) {
    return FACTORIES.includes(id) && hasThreeStars(state, "m7") ? OUTPUT_CAPACITY + 2 : OUTPUT_CAPACITY;
  }

  function getCargoCapacity(state) {
    return CARGO_CAPACITY + 4 * Number(hasThreeStars(state, "m5"));
  }

  function getCargoItemCapacity(state) {
    return CARGO_ITEM_CAPACITY + 2 * Number(hasThreeStars(state, "m5"));
  }

  function getStage(state) {
    return STAGES[state.stageIndex];
  }

  function getExpansion(state) {
    const stageIndex = state.stageIndex + 1;
    const stage = STAGES[stageIndex];
    if (!stage) return null;
    const previousStage = getStage(state);
    const available = previousStage.missionIds.some((id) => state.bestStars[id] === 3);
    const affordable = state.wallet >= stage.price;
    return {
      stage, previousStage, stageIndex, cost: stage.price, available, affordable,
      reason: !available ? `Earn three stars on a mission in the ${previousStage.name}.`
        : !affordable ? `Earn $${stage.price - state.wallet} more to open the ${stage.name}.` : "",
    };
  }

  function buyExpansion(state) {
    const expansion = getExpansion(state);
    if (!expansion?.available || !expansion.affordable) return false;
    state.wallet -= expansion.cost;
    state.stageIndex = expansion.stageIndex;
    state.expanded = true;
    state.furthestMissionIndex = MISSIONS.findLastIndex((mission) => mission.stage === expansion.stage.id);
    return true;
  }

  function findMission(idOrIndex) {
    return typeof idOrIndex === "number" ? MISSIONS[idOrIndex] : MISSIONS.find((mission) => mission.id === idOrIndex);
  }

  function getMissionGrant(state, idOrIndex = state.missionIndex) {
    const mission = findMission(idOrIndex);
    if (!mission) return null;
    const earned = Math.round(mission.reward * (state.bestStars[mission.id] ?? 0) / 3);
    return { earned, maximum: mission.reward, remaining: mission.reward - earned };
  }

  function hasThreeStars(state, missionId) {
    return state.bestStars[missionId] === 3;
  }

  function getMissionReward(state, idOrIndex = state.missionIndex) {
    const mission = findMission(idOrIndex);
    return mission ? { ...mission.perk, earned: hasThreeStars(state, mission.id) } : null;
  }

  function isMissionAvailable(state, idOrIndex) {
    const mission = findMission(idOrIndex);
    return Boolean(mission && STAGES.findIndex((stage) => stage.id === mission.stage) <= state.stageIndex);
  }

  function getRecipe(state, idOrIndex = state.missionIndex) {
    const mission = findMission(idOrIndex);
    if (!mission) return null;
    const recipe = RECIPES[mission.id];
    const source = state.recipes[mission.id] ?? null;
    const known = Boolean(source);
    const available = isMissionAvailable(state, idOrIndex);
    return {
      mission, known, source, available, price: recipe.price,
      affordable: available && !known && state.wallet >= recipe.price,
      ingredients: known ? { ...recipe.ingredients } : null,
      peakOdds: known ? recipe.peakOdds : null,
    };
  }

  function buyRecipe(state, idOrIndex = state.missionIndex) {
    const recipe = getRecipe(state, idOrIndex);
    if (!recipe?.affordable) return false;
    state.wallet -= recipe.price;
    state.recipes[recipe.mission.id] = "purchase";
    return true;
  }

  function getUnlock(state) {
    const next = UNLOCK_ORDER.find((id) => !state.facilities[id].unlocked);
    if (!next) return null;
    const facility = FACILITIES[next];
    return !facility.stage || STAGES.findIndex((stage) => stage.id === facility.stage) <= state.stageIndex ? facility : null;
  }

  function unlockFacility(state, id) {
    const facility = getUnlock(state);
    if (facility?.id !== id || state.wallet < facility.unlock) return null;
    state.wallet -= facility.unlock;
    state.facilities[id].unlocked = true;
    if (id === "research") state.facilities.scrap.unlocked = true;
    return { type: "unlock", facility: id, count: 1, item: facility.item };
  }

  function displayNumber(value) {
    return String(Number(value.toFixed(2)));
  }

  function describeUpgradeStat(value, stat, cycle) {
    if (value === null) return null;
    if (stat === "hire") return value ? "Hired" : "Not hired";
    if (stat === "cycle") return displayNumber(cycle / value) + " s / batch";
    if (stat === "speed") return displayNumber(value) + "× speed";
    return value + " " + stat;
  }

  function availableSpecials(state, item) {
    const source = state.facilities[SPECIAL_SOURCE[item]];
    return state.inventory[item] + (source?.unlocked ? source.special ?? 0 : 0);
  }

  function spendSpecials(state, item, count) {
    const fromBag = Math.min(state.inventory[item], count);
    state.inventory[item] -= fromBag;
    const source = state.facilities[SPECIAL_SOURCE[item]];
    if (count > fromBag) source.special -= count - fromBag;
  }

  function speedSpecialCost(state, facilityId, level) {
    const item = SPEED_SPECIALS[facilityId];
    const count = SPEED_SPECIAL_COUNTS[level];
    if (!item || !count) return null;
    const have = availableSpecials(state, item);
    return { item, count, have, met: have >= count };
  }

  function getQualityUpgrade(state, facilityId) {
    const spec = SPECIAL_QUALITY[facilityId];
    const facility = state.facilities[facilityId];
    if (!spec || !facility) return null;
    const level = facility.quality ?? 0;
    const maxLevel = SPECIAL_CHANCE.length - 1;
    const cost = level < maxLevel ? spec.price : null;
    const mission = findMission(spec.mission);
    const missionMet = hasThreeStars(state, spec.mission);
    const current = SPECIAL_CHANCE[level];
    const next = SPECIAL_CHANCE[level + 1] ?? null;
    const label = (value) => value === null ? null : Math.round(value * 100) + "% chance";
    const unlocked = Boolean(facility.unlocked);
    return {
      id: "quality", facilityId, label: ITEMS[SPECIALS[facilityId]].name + " chance", role: null, category: "facility",
      level, maxLevel, cost, unlocked,
      available: unlocked && cost !== null,
      affordable: unlocked && cost !== null && missionMet && state.wallet >= cost,
      current, next, currentLabel: label(current), nextLabel: label(next),
      gain: next === null ? null : "+" + Math.round((next - current) * 100) + "% chance",
      maxed: cost === null,
      items: null,
      requirement: cost === null ? null : { mission: mission.name, met: missionMet },
    };
  }

  function getUpgrade(state, id, facilityId) {
    if (id === "quality") return getQualityUpgrade(state, facilityId);
    const spec = UPGRADES[id];
    if (!spec) return null;
    const facility = state.facilities[facilityId];
    const level = id === "facility" ? facility?.speed ?? 0 : state.upgrades[id] ?? 0;
    const cost = spec.prices[level] ?? null;
    const unlocked = id === "facility" ? PRODUCERS.includes(facilityId) && Boolean(facility?.unlocked)
      : spec.category !== "worker" || Boolean(state.upgrades[spec.role]);
    const base = spec.levels[level];
    const nextBase = spec.levels[level + 1] ?? null;
    const bonus = id === "carry" ? getRates(state).carry - base : id === "ground" ? getRates(state).cap - base : 0;
    const current = bonus ? base + bonus : base;
    const next = nextBase !== null && bonus ? nextBase + bonus : nextBase;
    const cycle = id === "facility" && FACILITIES[facilityId]?.cycle ? getProductionCycle(state, facilityId) * current : 0;
    const currentLabel = describeUpgradeStat(current, spec.stat, cycle);
    const nextLabel = describeUpgradeStat(next, spec.stat, cycle);
    const gain = next === null ? null : spec.stat === "hire" ? "Joins your crew"
      : spec.stat === "cycle" ? displayNumber(cycle / current - cycle / next) + " s shorter cycle"
      : spec.stat === "speed" ? "+" + displayNumber(next - current) + "× speed"
      : "+" + (next - current) + " " + spec.stat;
    const items = id === "facility" && cost !== null ? speedSpecialCost(state, facilityId, level) : null;
    return {
      id,
      facilityId,
      items,
      requirement: null,
      label: id === "facility" && FACILITIES[facilityId] ? FACILITIES[facilityId].name + " speed" : spec.label,
      role: spec.role ?? null,
      category: spec.category,
      level,
      maxLevel: spec.levels.length - 1,
      cost,
      unlocked,
      available: unlocked && cost !== null,
      affordable: unlocked && cost !== null && state.wallet >= cost && (!items || items.met),
      current, next, currentLabel, nextLabel, gain,
      maxed: cost === null,
    };
  }

  function buyUpgrade(state, id, facilityId) {
    const upgrade = getUpgrade(state, id, facilityId);
    if (!upgrade?.affordable) return false;
    state.wallet -= upgrade.cost;
    if (upgrade.items) spendSpecials(state, upgrade.items.item, upgrade.items.count);
    if (id === "quality") state.facilities[facilityId].quality++;
    else if (id === "facility") state.facilities[facilityId].speed++;
    else state.upgrades[id]++;
    if (id === "runner") state.facilities.cargo.unlocked = true;
    return true;
  }

  function workerSpeed(state, id) {
    return WORKER_SPEEDS[state.upgrades[id + "Speed"] ?? 0];
  }

  function workerCapacity(state, id) {
    return WORKERS[id].capacity?.[state.upgrades[id + "Carry"] ?? 0] ?? null;
  }

  function workerEnabled(state, id) {
    return Boolean(state.upgrades[id]) && state.workerEnabled?.[id] !== false;
  }

  function getWorker(state, id) {
    const worker = WORKERS[id];
    if (!worker) return null;
    const hire = getUpgrade(state, id);
    const capacity = workerCapacity(state, id);
    const speed = workerSpeed(state, id);
    return {
      id, name: worker.name, description: worker.description, hire,
      hired: Boolean(state.upgrades[id]), enabled: workerEnabled(state, id), capacity, speed,
      resting: state.workerRest[id] > 0,
      capacityLabel: capacity === null ? "Available cash" : capacity + " " + worker.carryUnit,
      speedLabel: describeUpgradeStat(speed, "speed"),
      upgradeIds: capacity === null ? [id + "Speed"] : [id + "Carry", id + "Speed"],
    };
  }

  function setWorkerEnabled(state, id, enabled) {
    if (!Object.hasOwn(WORKERS, id) || !state.upgrades[id] || typeof enabled !== "boolean") return false;
    state.workerEnabled[id] = enabled;
    return true;
  }

  function workerTime(state, id, dt) {
    if (!workerEnabled(state, id)) return 0;
    const rest = state.workerRest[id] ?? 0;
    if (rest > 0) state.workerRest[id] = Math.max(0, rest - dt);
    return Math.max(0, dt - rest) * workerSpeed(state, id);
  }

  function restWorker(state, id) {
    state.workerRest[id] = WORKER_REST_SECONDS;
  }

  function firstTip(state, id) {
    if (state.tipsSeen[id]) return null;
    state.tipsSeen[id] = true;
    return TIPS[id];
  }

  function fillGrantOrder(state) {
    const grant = state.facilities.grant;
    const customers = state.customers;
    grant.stock++;
    grant.output += getGrantPayout(state);
    customers.filled++;
    if (customers.filled === customers.order) {
      grant.output += customers.bonus;
      customers.completed++;
      customers.filled = 0;
    }
  }

  function tickProduction(state, id, dt) {
    const facility = state.facilities[id];
    if (!facility.unlocked) return;
    const spec = FACILITIES[id];
    const batch = spec.cubes || 1;
    const cycle = getProductionCycle(state, id);
    const capacity = getFacilityOutputCapacity(state, id);
    let cycles = dt / cycle;
    while (cycles > 0 && (facility.stock ?? facility.output + (facility.special ?? 0)) < capacity) {
      if (!facility.active) {
        if (facility.input < batch) break;
        facility.input -= batch;
        facility.active = true;
      }
      const remaining = 1 - facility.progress;
      const progress = Math.min(remaining, cycles);
      facility.progress += progress;
      cycles -= progress;
      if (facility.progress < 1 - 1e-9) break;
      if (id === "grant") fillGrantOrder(state);
      else if (SPECIALS[id] && nextQualityRoll(state) < getSpecialChance(state, id)) {
        facility.special = (facility.special ?? 0) + 1;
        facility.specialMade = (facility.specialMade ?? 0) + 1;
      } else facility.output++;
      facility.active = false;
      facility.progress = 0;
    }
  }

  function tickHelper(state, dt) {
    const helper = state.helper;
    const ground = state.facilities.ground;
    const grant = state.facilities.grant;

    helper.progress = Math.min(1, helper.progress + dt / 2.6);
    if (helper.progress < 1 - 1e-9) return;
    helper.progress = 1;
    if (helper.phase === "collect") {
      helper.cargo = Math.min(workerCapacity(state, "intern"), ground.output);
      if (!helper.cargo) return;
      ground.output -= helper.cargo;
      ground.returned = Math.max(0, (ground.returned ?? 0) - helper.cargo);
      helper.phase = "deliver";
    } else {
      if ((grant.stock ?? Math.floor(grant.output / 10)) >= OUTPUT_CAPACITY) return;
      const delivered = Math.min(helper.cargo, INPUT_CAPACITY - grant.input);
      grant.input += delivered;
      helper.cargo -= delivered;
      state.stats.sold += delivered;
      if (helper.cargo) return;
      helper.phase = "collect";
      restWorker(state, "intern");
    }
    helper.progress = 0;
  }

  function getCargoCount(state) {
    return state.facilities.cargo.output;
  }

  function getSupplyCount(items, base) {
    return (items[base] ?? 0) + SPECIAL_ITEMS.reduce((sum, item) => sum + (ITEMS[item].base === base ? items[item] ?? 0 : 0), 0);
  }

  function cargoItemRoom(state, item) {
    const base = ITEMS[item].base ?? item;
    const { runner } = state;
    const reserved = runner.cargo && (ITEMS[runner.cargo].base ?? runner.cargo) === base ? runnerCargoCount(runner) : 0;
    return Math.max(0, getCargoItemCapacity(state) - getSupplyCount(runner.shelf, base) - reserved);
  }

  function cargoNeeds(state) {
    const mission = MISSIONS[state.missionIndex];
    if (!mission) return emptyLoadout();
    const have = Object.fromEntries(INGREDIENTS.map((id) => [id, getSupplyCount(state.inventory, id) + getSupplyCount({ ...state.loadout, ...state.specialLoadout }, id)]));
    if (state.recipes[mission.id]) {
      const ingredients = RECIPES[mission.id].ingredients;
      return Object.fromEntries(INGREDIENTS.map((id) => [id, Math.max(0, ingredients[id] - have[id])]));
    }
    const paper = Math.max(have.paper, mission.scienceMin);
    const crew = Math.max(have.crew, mission.crewMin);
    const part = Math.max(have.part, 1 + paper + crew);
    const dryMass = part * ITEMS.part.mass + paper * ITEMS.paper.mass + crew * ITEMS.crew.mass;
    const fuel = mission.baseFuel + Math.floor(dryMass / mission.dryFuelStep);
    return { paper: paper - have.paper, crew: crew - have.crew, part: part - have.part, fuel: Math.max(0, fuel - have.fuel) };
  }

  function getShelfItem(state, needs = cargoNeeds(state)) {
    const { shelf } = state.runner;
    const active = Boolean(MISSIONS[state.missionIndex]);
    return CARGO_PRIORITY.flatMap(base => [...SPECIAL_ITEMS.filter(item => ITEMS[item].base === base), base])
      .find(item => shelf[item] > 0 && (!active || needs[ITEMS[item].base ?? item] > 0)) ?? null;
  }

  function collectCargo(state, requested, quantity) {
    if (!state.facilities.cargo.unlocked || state.report) return null;
    const needs = cargoNeeds(state);
    const item = requested ?? getShelfItem(state, needs);
    if (![...INGREDIENTS, ...SPECIAL_ITEMS].includes(item)) return null;
    const max = Math.min(state.runner.shelf[item], carryRoom(state));
    const count = quantity ?? Math.min(max, requested ? 1 : needs[ITEMS[item].base ?? item] || 1);
    if (!validQuantity(count, max)) return null;
    state.runner.shelf[item] -= count;
    state.facilities.cargo.output -= count;
    state.inventory[item] += count;
    return { type: "pickup", facility: "cargo", item, count };
  }

  function runnerCargoCount(runner) {
    return runner.cargo ? runner.cargoCount || 1 : 0;
  }

  function tickRunner(state, dt) {
    const runner = state.runner;
    const capacity = getCargoCapacity(state);
    const itemCapacity = getCargoItemCapacity(state);
    if (runner.phase === "search") {
      if (getCargoCount(state) >= capacity) return;
      const needs = cargoNeeds(state);
      let bestPriority = -Infinity;
      for (const id of FACTORIES) {
        const { unlocked, output, special = 0 } = state.facilities[id];
        const item = FACILITIES[id].item;
        const stocked = getSupplyCount(runner.shelf, item);
        if (!unlocked || output + special === 0 || stocked >= itemCapacity) continue;
        const priority = (needs[item] > stocked ? 10 : 0) - stocked;
        if (priority <= bestPriority) continue;
        bestPriority = priority;
        runner.from = id;
      }
      if (!runner.from) return;
      runner.phase = "pickup";
    }

    runner.progress = Math.min(1, runner.progress + dt / 1.35);
    if (runner.progress < 1 - 1e-9) return;
    runner.progress = 0;
    if (runner.phase === "pickup") {
      const factory = state.facilities[runner.from];
      const base = FACILITIES[runner.from].item;
      const item = factory.special > 0 && SPECIALS[runner.from] ? SPECIALS[runner.from] : base;
      const field = item === base ? "output" : "special";
      const count = Math.min(factory[field], capacity - getCargoCount(state), cargoItemRoom(state, item), workerCapacity(state, "runner"));
      if (count > 0) {
        runner.cargo = item;
        runner.cargoCount = count;
        factory[field] -= count;
      }
      runner.phase = "deliver";
      return;
    }
    if (runner.cargo) {
      const count = runnerCargoCount(runner);
      runner.shelf[runner.cargo] = (runner.shelf[runner.cargo] ?? 0) + count;
      state.facilities.cargo.output += count;
    }
    runner.phase = "search";
    runner.from = null;
    runner.cargo = null;
    runner.cargoCount = 0;
    restWorker(state, "runner");
  }

  function materialBatches(state, id, cubes, needs = cargoNeeds(state)) {
    const spec = FACILITIES[id];
    const facility = state.facilities[id];
    const mission = MISSIONS[state.missionIndex];
    if (!mission || !spec.cubes || !facility.unlocked || facility.output + (facility.special ?? 0) >= getFacilityOutputCapacity(state, id)) return 0;

    const runner = state.runner;
    const pending = Math.floor(facility.input / spec.cubes) + Number(facility.active);
    const stored = getSupplyCount(runner.shelf, spec.item) + (runner.cargo && (ITEMS[runner.cargo].base ?? runner.cargo) === spec.item ? runnerCargoCount(runner) : 0);
    const deficit = needs[spec.item] - facility.output - (facility.special ?? 0) - pending - stored;
    const budget = Math.max(0, state.wallet - mission.fee - 160);
    return Math.max(0, Math.min(deficit, Math.floor(budget / spec.cash), Math.floor(cubes / spec.cubes),
      Math.floor((INPUT_CAPACITY - facility.input) / spec.cubes)));
  }

  function tickMaterials(state, dt) {
    const worker = state.materials;
    const ground = state.facilities.ground;
    if (worker.phase === "wait") {
      const needs = cargoNeeds(state);
      const available = Math.min(workerCapacity(state, "materials"), ground.output - 2);
      const factory = FACTORIES.find((id) => materialBatches(state, id, available, needs) > 0);
      if (!factory) return;
      worker.to = factory;
      worker.cargo = materialBatches(state, factory, available, needs) * FACILITIES[factory].cubes;
      ground.output -= worker.cargo;
      ground.returned = Math.max(0, (ground.returned ?? 0) - worker.cargo);
      worker.phase = "deliver";
    }

    worker.progress = Math.min(1, worker.progress + dt / 2.8);
    if (worker.progress < 1 - 1e-9) return;
    worker.progress = 1;
    if (worker.phase === "deliver") {
      const batches = materialBatches(state, worker.to, worker.cargo);
      const spec = FACILITIES[worker.to];
      const cubes = batches * spec.cubes;
      state.wallet -= batches * spec.cash;
      state.facilities[worker.to].input += cubes;
      state.stats.built += batches;
      worker.cargo -= cubes;
      worker.phase = "return";
    } else {
      const returned = Math.min(worker.cargo, getRates(state).cap - ground.output);
      ground.output += returned;
      ground.returned = (ground.returned ?? 0) + returned;
      worker.cargo -= returned;
      if (worker.cargo > 0) return;
      worker.phase = "wait";
      worker.to = null;
      restWorker(state, "materials");
    }
    worker.progress = 0;
  }

  function tickClerk(state, dt) {
    const worker = state.clerk;
    const grant = state.facilities.grant;
    if (worker.phase === "wait") {
      if (grant.output <= 0) return;
      worker.phase = "collect";
    }
    worker.progress = Math.min(1, worker.progress + dt / 1.2);
    if (worker.progress < 1 - 1e-9) return;
    worker.progress = 0;
    if (worker.phase === "collect") {
      worker.cargo = grant.output;
      grant.output = 0;
      grant.stock = 0;
      worker.phase = "return";
    } else {
      state.wallet += worker.cargo;
      worker.cargo = 0;
      worker.phase = "wait";
      restWorker(state, "clerk");
    }
  }

  function tick(state, seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    state.time += seconds;
    const rates = getRates(state);
    const ground = state.facilities.ground;
    if (ground.output < rates.cap) {
      ground.progress += seconds * rates.data;
      const produced = Math.min(rates.cap - ground.output, Math.floor(ground.progress + 1e-9));
      ground.output += produced;
      ground.progress = ground.output === rates.cap ? 0 : Math.max(0, ground.progress - produced);
    }
    for (const id of PRODUCERS) tickProduction(state, id, seconds);
    const internTime = workerTime(state, "intern", seconds);
    const runnerTime = workerTime(state, "runner", seconds);
    const materialsTime = workerTime(state, "materials", seconds);
    const clerkTime = workerTime(state, "clerk", seconds);
    if (internTime) tickHelper(state, internTime);
    if (runnerTime) tickRunner(state, runnerTime);
    if (materialsTime) tickMaterials(state, materialsTime);
    if (clerkTime) tickClerk(state, clerkTime);
  }

  function batchOf(id, ...events) {
    const list = events.flatMap((event) => !event ? [] : event.type === "batch" ? event.events : [event]);
    if (list.length < 2) return list[0] ?? null;
    return { type: "batch", facility: id, events: list };
  }

  function takeSpecial(state, id, quantity) {
    const facility = state.facilities[id];
    const item = SPECIALS[id];
    if (!item || !facility?.unlocked || !(facility.special > 0)) return null;
    const max = Math.min(facility.special, carryRoom(state));
    const count = quantity ?? max;
    if (!validQuantity(count, max)) return null;
    facility.special -= count;
    state.inventory[item] += count;
    return { type: "pickup", facility: id, item, count, special: true };
  }

  function pickUp(state, id, quantity) {
    if (id === "cargo") return collectCargo(state);
    const special = quantity === undefined ? takeSpecial(state, id) : null;
    return batchOf(id, special, pickUpOutput(state, id, quantity));
  }

  function pickUpOutput(state, id, quantity) {
    const facility = state.facilities[id];
    const item = FACILITIES[id].item;
    if (!item || facility.output <= 0 || (!facility.unlocked && id !== "engineering")) return null;
    if (item === "cash") {
      const count = facility.output;
      state.wallet += count;
      facility.output = 0;
      facility.stock = 0;
      return { type: "cash", facility: id, item, count };
    }
    const max = Math.min(facility.output, carryRoom(state));
    const count = quantity ?? max;
    if (!validQuantity(count, max)) return null;
    facility.output -= count;
    state.inventory[item] += count;
    if (item === "data") {
      const returned = Math.min(count, facility.returned ?? 0);
      facility.returned = (facility.returned ?? 0) - returned;
      state.stats.collected += count - returned;
    }
    return { type: "pickup", facility: id, item, count };
  }

  function stageLaunch(state, ingredient, quantity) {
    if (!MISSIONS[state.missionIndex]) return null;
    if (ingredient !== undefined && (!LOADABLE.includes(ingredient) || !validQuantity(quantity, state.inventory[ingredient]))) return null;
    let count = 0;
    let item = null;
    let tip = null;
    for (const id of ingredient === undefined ? LOADABLE : [ingredient]) {
      const amount = quantity ?? state.inventory[id];
      if (amount <= 0) continue;
      count += amount;
      item = id;
      loadoutFor(state, id)[id] += amount;
      state.inventory[id] -= amount;
      const lesson = firstTip(state, id);
      tip ||= lesson;
    }
    if (!count) return null;
    const payload = inspectLaunch(state);
    if (payload.mass > payload.mission.massLimit) tip = firstTip(state, "limit") ?? tip;
    return { type: "deposit", facility: "launch", item, count, tip };
  }

  function loadoutFor(state, id) {
    return SPECIAL_ITEMS.includes(id) ? state.specialLoadout : state.loadout;
  }

  function removeItem(state, id, discard = false, count = 1) {
    if (!LOADABLE.includes(id) || !validQuantity(count, loadoutFor(state, id)[id])) return null;
    if (!discard && count > carryRoom(state)) return null;
    loadoutFor(state, id)[id] -= count;
    if (!discard) state.inventory[id] += count;
    if (id === "part") restockTutorialPart(state);
    return { type: discard ? "scrap" : "unload", facility: discard && state.facilities.scrap.unlocked ? "scrap" : "launch", item: id, count };
  }

  function scrapItem(state, requested, count = 1) {
    const item = requested ?? [...INGREDIENTS].reverse().concat("data", SPECIAL_ITEMS).find((id) => state.inventory[id] > 0);
    if (!validQuantity(count, state.inventory[item])) return null;
    state.inventory[item] -= count;
    if (item === "part") restockTutorialPart(state);
    return { type: "scrap", facility: "scrap", item, count };
  }

  function orderCapacity(state, id) {
    const facility = state.facilities[id];
    const spec = FACILITIES[id];
    const space = INPUT_CAPACITY - facility.input;
    const paidBatches = spec.cash ? Math.floor(state.wallet / spec.cash) : Infinity;
    const availableBatches = spec.cubes ? Math.floor(state.inventory.data / spec.cubes) : Infinity;
    return Math.min(availableBatches, paidBatches, Math.floor(space / (spec.cubes || 1)));
  }

  function orderFromProducer(state, id, quantity) {
    const facility = state.facilities[id];
    const spec = FACILITIES[id];
    const max = orderCapacity(state, id);
    const batches = quantity ?? Math.min(max, spec.cubes ? Infinity : 1);
    if (!validQuantity(batches, max)) return null;

    const cubes = batches * spec.cubes;
    state.wallet -= batches * spec.cash;
    state.inventory.data -= cubes;
    facility.input += cubes || batches;
    if (id === "grant") state.stats.sold += cubes;
    else state.stats.built += batches;
    return {
      type: cubes ? "deposit" : "order",
      facility: id,
      item: cubes ? "data" : spec.item,
      count: cubes || batches,
      tip: id === "grant" ? firstTip(state, "data") : null,
    };
  }

  function stationAction(kind, label, item, max, details = {}) {
    const id = item === null ? kind : kind + ":" + item;
    return { id, kind, label, item, max: Math.max(0, max), unitPrice: 0, unitCubes: 0, ...details };
  }

  function getStationActions(state, id) {
    const facility = state.facilities[id];
    if (!facility || state.report) return [];
    const spec = FACILITIES[id];
    const room = carryRoom(state);
    const held = state.inventory;
    const take = (item, stock) => stationAction("take", "Pick up", item, Math.min(stock, room));
    const store = (kind, label, item, space) => stationAction(kind, label, item, Math.min(held[item], space));

    if (!facility.unlocked) {
      const actions = [];
      if (id === "engineering") actions.push(take("part", facility.output));
      if (getUnlock(state)?.id === id) {
        actions.push(stationAction("unlock", "Build", null, Number(state.wallet >= spec.unlock), { unitPrice: spec.unlock }));
      }
      return actions;
    }
    if (id === "ground") return [take("data", facility.output), store("return", "Return", "data", getRates(state).cap - facility.output)];
    if (id === "grant") {
      return [
        stationAction("deposit", "Drop off", "data", orderCapacity(state, id), { unitCubes: 1 }),
        stationAction("collect", "Collect", "cash", Number(facility.output > 0), { amount: facility.output }),
      ];
    }
    if (FACTORIES.includes(id)) {
      return [
        take(spec.item, facility.output),
        ...(SPECIALS[id] ? [take(SPECIALS[id], facility.special ?? 0)] : []),
        stationAction("make", "Order", spec.item, orderCapacity(state, id), { unitPrice: spec.cash, unitCubes: spec.cubes }),
        store("store", "Store", spec.item, getFacilityOutputRoom(state, id)),
        ...(SPECIALS[id] ? [store("store", "Store", SPECIALS[id], getFacilityOutputRoom(state, id))] : []),
      ];
    }
    if (id === "cargo") {
      const { shelf, cargo } = state.runner;
      const inTransit = runnerCargoCount(state.runner);
      const shelfRoom = getCargoCapacity(state) - getCargoCount(state) - inTransit;
      return [...INGREDIENTS, ...SPECIAL_ITEMS].flatMap((item) => [
        take(item, shelf[item] ?? 0),
        store("store", "Store", item, Math.min(shelfRoom, cargoItemRoom(state, item))),
      ]);
    }
    if (id === "launch" && MISSIONS[state.missionIndex]) {
      return LOADABLE.flatMap((item) => [
        stationAction("load", "Load", item, held[item]),
        stationAction("unload", "Unload", item, Math.min(loadoutFor(state, item)[item], room)),
        stationAction("scrap", "Scrap", item, loadoutFor(state, item)[item]),
      ]);
    }
    if (id === "scrap") return Object.keys(held).map((item) => stationAction("discard", "Discard", item, held[item]));
    return [];
  }

  function getFacilityOutputRoom(state, id) {
    const facility = state.facilities[id];
    return Math.max(0, getFacilityOutputCapacity(state, id) - facility.output - (facility.special ?? 0));
  }

  function storeAtStation(state, id, item, count, type) {
    state.inventory[item] -= count;
    const facility = state.facilities[id];
    if (SPECIALS[id] === item) facility.special = (facility.special ?? 0) + count;
    else facility.output += count;
    if (id === "ground") facility.returned = (facility.returned ?? 0) + count;
    if (id === "cargo") state.runner.shelf[item] = (state.runner.shelf[item] ?? 0) + count;
    return { type, facility: id, item, count };
  }

  function transferAtStation(state, id, actionId, count) {
    const action = getStationActions(state, id).find(({ id: listedId }) => listedId === actionId);
    if (!action || !validQuantity(count, action.max)) return null;
    const { item, kind } = action;
    switch (kind) {
      case "take": return id === "cargo" ? collectCargo(state, item, count)
        : SPECIAL_ITEMS.includes(item) ? takeSpecial(state, id, count) : pickUp(state, id, count);
      case "deposit":
      case "make": return orderFromProducer(state, id, count);
      case "collect": return pickUp(state, id);
      case "unlock": return unlockFacility(state, id);
      case "load": return stageLaunch(state, item, count);
      case "unload": return removeItem(state, item, false, count);
      case "scrap": return removeItem(state, item, true, count);
      case "discard": return scrapItem(state, item, count);
      case "store":
      case "return": return storeAtStation(state, id, item, count, kind);
      default: return null;
    }
  }

  function planReturns(state) {
    if (state.report) return [];
    const { cargo } = state.runner;
    const inTransit = runnerCargoCount(state.runner);
    let shelfRoom = getCargoCapacity(state) - getCargoCount(state) - inTransit;
    const operations = [];
    for (const destination of FACTORIES) {
      const { item } = FACILITIES[destination];
      const facility = state.facilities[destination];
      const starter = destination === "engineering" && !facility.unlocked;
      const facilityRoom = facility.unlocked ? getFacilityOutputRoom(state, destination) : starter ? Math.max(0, 1 - facility.output) : 0;
      const returned = Math.min(state.inventory[item], Math.max(0, facilityRoom));
      if (returned > 0) operations.push({ item, count: returned, destination, starter });
      const special = SPECIALS[destination];
      const returnedSpecial = facility.unlocked && special
        ? Math.min(state.inventory[special] ?? 0, Math.max(0, facilityRoom - returned)) : 0;
      if (returnedSpecial > 0) operations.push({ item: special, count: returnedSpecial, destination, starter: false });
      if (!state.facilities.cargo.unlocked) continue;
      const itemRoom = cargoItemRoom(state, item);
      const stored = Math.min(state.inventory[item] - returned, shelfRoom, itemRoom);
      if (stored > 0) {
        shelfRoom -= stored;
        operations.push({ item, count: stored, destination: "cargo", starter: false });
      }
    }
    return operations;
  }

  function getReturnsCount(state) {
    return planReturns(state).reduce((count, operation) => count + operation.count, 0);
  }

  function returnSupplies(state) {
    const events = [];
    for (const { item, count, destination, starter } of planReturns(state)) {
      const event = starter ? storeAtStation(state, destination, item, count, "store")
        : transferAtStation(state, destination, `store:${item}`, count);
      if (event) events.push({ ...event, facility: "returns", destination });
    }
    if (events.length < 2) return events[0] ?? null;
    return { type: "batch", facility: "returns", events };
  }

  function visitProducer(state, id) {
    const { active, input, output } = state.facilities[id];
    if (id === "fuel") {
      return output > 0 || active || input > 0 ? pickUp(state, id) : orderFromProducer(state, id);
    }

    // Factories make room by taking cubes first. Grants pay out directly to the wallet.
    const first = id === "grant" ? pickUp(state, id) : orderFromProducer(state, id);
    const second = id === "grant" ? orderFromProducer(state, id) : pickUp(state, id);
    return batchOf(id, first, second);
  }

  function interact(state, id, zone = "both") {
    const facility = state.facilities[id];
    if (!facility || state.report) return null;
    if (zone === "both" && facility.unlocked && PRODUCERS.includes(id)) return visitProducer(state, id);
    if (zone !== "input") {
      const pickedUp = pickUp(state, id);
      if (pickedUp) return pickedUp;
    }
    if (zone === "output") return null;
    if (!facility.unlocked) return unlockFacility(state, id);
    if (id === "launch") return stageLaunch(state);
    if (id === "returns") return returnSupplies(state);
    if (id === "scrap") return scrapItem(state);
    if (PRODUCERS.includes(id)) return orderFromProducer(state, id);
    return null;
  }

  function launchLoadout(state) {
    const loadout = { ...state.loadout };
    for (const item of SPECIAL_ITEMS) loadout[ITEMS[item].base] += state.specialLoadout?.[item] ?? 0;
    return loadout;
  }

  function specialBonus(specials = {}) {
    const count = (item) => Math.max(0, specials[item] ?? 0);
    return {
      primePart: count("primePart"), prizePaper: count("prizePaper"), eliteCrew: count("eliteCrew"),
      odds: Math.round(count("primePart") * SPECIAL_REWARDS.primePart * 100) / 100,
      downlink: Math.round(count("prizePaper") * SPECIAL_REWARDS.prizePaper * 100) / 100,
      cash: Math.round(count("eliteCrew") * SPECIAL_REWARDS.eliteCrew * 100) / 100,
    };
  }

  function inspectLoadout(loadout, mission, specials = {}) {
    const { fuel = 0, part = 0, paper = 0, crew = 0 } = loadout;
    const dryMass = part * ITEMS.part.mass + paper * ITEMS.paper.mass + crew * ITEMS.crew.mass;
    const mass = fuel * ITEMS.fuel.mass + dryMass;
    const fuelNeeded = mission.baseFuel + Math.floor(dryMass / mission.dryFuelStep);
    const powerDemand = 1 + paper + crew;
    const powerRatio = Math.min(1, part / powerDemand);
    const effectiveScience = Math.min(paper, mission.scienceMax) * powerRatio;
    const effectiveCrew = Math.min(crew, mission.crewMax) * powerRatio;
    const bonusScience = Math.max(0, effectiveScience - mission.scienceMin);
    const thinMargin = mass <= mission.massLimit && mass * 10 >= mission.massLimit * 9;
    const qualifyingIssue = mission.threeStarMassLimit && mass > mission.threeStarMassLimit
      ? `Keep the payload at ${mission.threeStarMassLimit} mass or less to earn three stars.`
      : mission.uncrewedOnly && crew > 0 ? "Fly without astronauts to earn three stars." : "";
    const recipe = RECIPES[mission.id];
    const penalty = INGREDIENTS.reduce((sum, id) => sum + Math.abs((loadout[id] ?? 0) - recipe.ingredients[id]) * ODDS_PENALTY[id], 0);
    const exact = penalty === 0;
    const bonus = specialBonus(specials);
    const baseOdds = mass > mission.massLimit || fuel < fuelNeeded
      ? 0 : Math.max(0.05, Math.round((recipe.peakOdds - penalty - (thinMargin ? THIN_MARGIN_PENALTY : 0)) * 100) / 100);
    const odds = baseOdds > 0 && bonus.odds > 0 ? Math.min(MAX_ODDS, Math.round((baseOdds + bonus.odds) * 100) / 100) : baseOdds;
    return {
      empty: mass === 0, specialBonus: bonus,
      dryMass, mass, fuelNeeded, powerDemand, powerRatio, effectiveScience, effectiveCrew, bonusScience, thinMargin,
      odds, exact, peakOdds: recipe.peakOdds, qualifyingIssue,
      gauges: {
        fuel: {
          label: "Fuel", count: fuel, target: fuelNeeded, max: Math.max(3, fuel, fuelNeeded + 1),
          status: fuel < fuelNeeded ? "low" : fuel > fuelNeeded ? "high" : "good",
          message: fuel < fuelNeeded ? `This load needs ${fuelNeeded} fuel to reach ${mission.arrival}.` : fuel > fuelNeeded ? "Fuel above the flight minimum uses extra mass." : `This load has enough fuel to reach ${mission.arrival}.`,
        },
        power: {
          label: "Power", count: part, target: powerDemand, max: Math.max(3, part, powerDemand + 1),
          status: part < powerDemand ? "low" : part > powerDemand ? "high" : "good",
          message: part < powerDemand ? `The spacecraft needs ${powerDemand} Parts to power every system.` : part > powerDemand ? "Spare Parts increase mass without raising the available science." : "The Parts cover the spacecraft, instruments and crew.",
        },
        science: {
          label: "Science", count: paper, target: mission.scienceMin, max: Math.max(2, paper, mission.scienceMax),
          status: effectiveScience < mission.scienceMin ? "low" : paper > mission.scienceMax ? "high" : "good",
          message: effectiveScience < mission.scienceMin
            ? (paper < mission.scienceMin ? `This mission needs ${mission.scienceMin} Research ${mission.scienceMin === 1 ? "Paper" : "Papers"}.` : "The instruments need more power to meet the science goal.")
            : paper > mission.scienceMax ? "Extra Papers add mass and use power beyond what can help this mission."
            : bonusScience > 0 ? "The extra powered instruments return more observations."
            : mission.scienceMin ? "The instruments meet this mission’s science goal." : "This demonstration needs no science instruments.",
        },
        crew: {
          label: "Crew", count: crew, target: mission.crewMin, max: Math.max(2, crew, mission.crewMax),
          status: effectiveCrew < mission.crewMin ? "low" : crew > mission.crewMax ? "high" : "good",
          message: effectiveCrew < mission.crewMin
            ? (crew < mission.crewMin ? "This station mission needs an Astronaut." : "The crew’s life-support systems need more power.")
            : crew > mission.crewMax ? "Extra Astronauts use mass and power beyond this mission’s crew needs."
            : mission.crewMin ? "The station mission has its crew and enough power for life support." : "This mission flies without a crew.",
        },
        mass: {
          label: "Mass", count: mass, target: mission.massLimit, max: mission.massLimit,
          status: mass > mission.massLimit ? "high" : thinMargin ? "risk" : "good",
          message: mass > mission.massLimit ? "This load exceeds the rocket's mass limit." : thinMargin ? `Using at least 90% of capacity lowers the chance of reaching ${mission.arrival}.` : "The rocket has a comfortable mass margin.",
        },
      },
    };
  }

  function inspectLaunch(state) {
    const mission = MISSIONS[state.missionIndex];
    if (!mission || !isMissionAvailable(state, state.missionIndex)) return {
      mission: null, discovered: true, empty: true, ready: false, mass: 0,
      gauges: {}, odds: 0, exact: false, peakOdds: null, recipe: null,
      blockedReason: "Select a mission to launch again.",
    };
    const values = inspectLoadout(launchLoadout(state), mission, state.specialLoadout);
    let blockedReason = "";
    if (values.empty) blockedReason = "Deliver hardware to the Launch Pad.";
    else if (values.mass > mission.massLimit) blockedReason = "Unload hardware to get below the mass limit.";
    else if (state.wallet < mission.fee) blockedReason = `Earn $${mission.fee - state.wallet} more for the launch fee.`;
    const recipe = getRecipe(state);
    if (recipe.known && values.exact && values.gauges.fuel.count > values.fuelNeeded) {
      values.gauges.fuel.status = "good";
      values.gauges.fuel.message = `The calibrated fuel reserve improves the odds of reaching ${mission.arrival}.`;
    }
    return { ...values, mission, recipe, discovered: Boolean(state.discovered[mission.id]), ready: !blockedReason && !state.report, blockedReason };
  }

  function evaluateLaunch(loadout, mission, rng = () => 0.5, specials = {}) {
    const values = inspectLoadout(loadout, mission, specials);
    const { gauges, mass, fuelNeeded, powerRatio, effectiveScience, effectiveCrew, bonusScience, thinMargin, odds, exact, qualifyingIssue } = values;
    let status = "success";
    let stars = 3;
    let cause = `The spacecraft reached ${mission.arrival} and met every mission requirement.`;
    let tip = TIPS[mission.tipId] ?? (mission.id === "m1" ? TIPS.cubeSat : TIPS.paper);
    let roll = null;

    if (mass > mission.massLimit) {
      status = "blocked";
      stars = 0;
      cause = gauges.mass.message;
      tip = TIPS.limit;
    } else if ((loadout.fuel ?? 0) < fuelNeeded) {
      status = "failed";
      stars = 0;
      cause = `The rocket ran out of fuel before reaching ${mission.arrival}. This load needed ${fuelNeeded}.`;
      tip = TIPS.fuel;
    } else if ((roll = rng()) >= odds) {
      status = "failed";
      stars = 0;
      cause = thinMargin ? `The rocket failed to reach ${mission.arrival} with very little mass margin.`
        : exact ? `The spacecraft did not reach ${mission.arrival} on this attempt despite an optimized payload.`
        : `The spacecraft did not reach ${mission.arrival}. Changing the payload mix could improve the next flight’s odds.`;
      tip = thinMargin ? TIPS.margin : TIPS.iterate;
    } else if (powerRatio < 1 || effectiveScience < mission.scienceMin || effectiveCrew < mission.crewMin) {
      status = "partial";
      stars = powerRatio < 0.5 || (mission.scienceMin > 0 && effectiveScience === 0)
        || effectiveCrew < mission.crewMin ? 1 : 2;
      if (powerRatio < 1) cause = `The spacecraft reached ${mission.arrival} with too little power for all its systems.`;
      else if (effectiveCrew < mission.crewMin) cause = `The spacecraft reached ${mission.arrival} without the required crew.`;
      else cause = `The spacecraft reached ${mission.arrival} with too few instruments to meet its science goal.`;
      tip = TIPS.iterate;
    } else if (qualifyingIssue) {
      status = "partial";
      stars = 2;
      cause = `The spacecraft reached ${mission.arrival}. ${qualifyingIssue}`;
      if (thinMargin) tip = TIPS.margin;
    } else if (thinMargin) {
      tip = TIPS.margin;
    }

    const scienceOutput = [0, 0.25, 0.5, 1][stars] + (stars ? bonusScience * 0.25 : 0);
    const crewBonus = mission.crewMin > 0 ? Math.min(1, effectiveCrew) * 0.5 : 0;
    return {
      ...values, mission, status, stars, cause, tip, roll,
      grant: Math.round(mission.reward * stars / 3),
      output: scienceOutput * (1 + crewBonus) * (mission.dataMultiplier ?? 1) * (stars ? 1 + values.specialBonus.downlink : 1),
      loadout: { ...emptyLoadout(), ...loadout },
    };
  }

  function nextQualityRoll(state) {
    let seed = state.qualitySeed || 7;
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    state.qualitySeed = seed >>> 0;
    return state.qualitySeed / 2 ** 32;
  }

  function getSpecialChance(state, id) {
    if (!SPECIALS[id]) return 0;
    return SPECIAL_CHANCE[state.facilities[id]?.quality ?? 0] ?? SPECIAL_CHANCE[0];
  }

  function nextRandom(state) {
    let seed = state.rngSeed;
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    state.rngSeed = seed >>> 0;
    return state.rngSeed / 2 ** 32;
  }

  function restockTutorialPart(state) {
    const engineering = state.facilities.engineering;
    if (!engineering.unlocked && state.bestStars.m1 !== 3 && engineering.output + state.inventory.part + state.loadout.part === 0) {
      engineering.output = 1;
    }
  }

  function updateDownlink(fleet, satellite) {
    const previous = satellite.missionId ? fleet.findIndex(({ missionId }) => missionId === satellite.missionId) : -1;
    if (previous === -1) {
      fleet.push(satellite);
      return satellite.output;
    }
    const gain = satellite.output - fleet[previous].output;
    if (gain <= 0) return 0;
    fleet[previous] = satellite;
    return gain;
  }

  function launch(state) {
    const inspection = inspectLaunch(state);
    if (!inspection.ready) return null;
    const { mission } = inspection;
    const report = evaluateLaunch(launchLoadout(state), mission, () => nextRandom(state), state.specialLoadout);
    const specialCash = report.stars > 0 ? Math.round(mission.reward * report.specialBonus.cash) : 0;
    const { earned } = getMissionGrant(state, mission.id);
    const firstClear = report.stars === 3 && (state.bestStars[mission.id] ?? 0) < 3;
    const grant = Math.max(0, report.grant - earned);
    const feeRefund = report.status === "failed" && hasThreeStars(state, "m6") ? Math.floor(mission.fee / 2) : 0;
    const recipeDiscovered = (report.exact || report.status === "success") && !state.recipes[mission.id];
    if (recipeDiscovered) state.recipes[mission.id] = "flight";
    if (report.exact && report.gauges.fuel.count > report.fuelNeeded) {
      report.gauges.fuel.status = "good";
      report.gauges.fuel.message = `The calibrated fuel reserve improves the odds of reaching ${mission.arrival}.`;
    }
    state.wallet += grant + feeRefund + specialCash - mission.fee;
    state.discovered[mission.id] = true;
    state.bestStars[mission.id] = Math.max(state.bestStars[mission.id] ?? 0, report.stars);
    if (firstClear && mission.id === "m5") state.facilities.cargo.unlocked = true;
    state.loadout = emptyLoadout();
    state.specialLoadout = emptySpecials();
    state.stats.attempts++;
    const signalOutput = report.output;
    const output = report.stars > 0 ? updateDownlink(state.satellites, {
      missionId: mission.id, name: mission.name, stars: report.stars, output: signalOutput,
    }) : 0;
    const campaignCompleted = firstClear && mission.id === "m8";
    if (campaignCompleted) state.completed = true;
    if (mission.id === "m1" && firstClear && firstTip(state, "free")) report.tip = TIPS.free;
    restockTutorialPart(state);
    state.report = {
      ...report, grant, output, signalOutput, firstClear, recipeDiscovered, feeRefund, specialCash,
      ...(firstClear ? { unlockedReward: { ...mission.perk } } : {}),
      ...(recipeDiscovered ? { discoveredPlan: { ...RECIPES[mission.id].ingredients } } : {}),
      campaignCompleted, completed: state.completed,
    };
    state.history.push(state.report);
    if (state.history.length > 30) state.history.shift();
    return state.report;
  }

  function selectMission(state, idOrIndex) {
    if (!isMissionAvailable(state, idOrIndex) || state.report) return false;
    state.missionIndex = MISSIONS.indexOf(findMission(idOrIndex));
    return true;
  }

  globalThis.SpaceportRules = {
    SAVE_KEY, ITEMS, INGREDIENTS, FACILITIES, MISSIONS, STAGES, UPGRADES, WORKERS, TIPS,
    SPECIALS, SPECIAL_ITEMS, SPECIAL_CHANCE, SPECIAL_QUALITY, SPEED_SPECIALS, SPECIAL_REWARDS, getSpecialChance,
    INPUT_CAPACITY, OUTPUT_CAPACITY, CARGO_CAPACITY, GRANT_BONUS,
    getSupplyCount, createState, loadState, saveState, getInventoryCount, getRates, tick, getUnlock,
    getStage, getExpansion, buyExpansion, isMissionAvailable, getRecipe, buyRecipe, getMissionReward,
    getMissionGrant,
    getGrantPayout, getProductionCycle, getFacilityOutputCapacity, getCargoCapacity, getCargoItemCapacity,
    getStationActions, transferAtStation, getReturnsCount, returnSupplies,
    getWorker, setWorkerEnabled,
    getUpgrade, buyUpgrade, getCargoCount, getShelfItem, collectCargo, interact, unlockFacility, removeItem, selectMission, inspectLaunch, evaluateLaunch, launch,
  };
})();
