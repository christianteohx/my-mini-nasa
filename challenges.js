(() => {
  "use strict";

  const FOCUSES = [
    { id: "flight", label: "Flight", description: "Earn stars and fly a variety of missions." },
    { id: "operations", label: "Operations", description: "Queue hardware at the yard's factories." },
    { id: "research", label: "Research", description: "Fly working science instruments." },
  ];
  const TARGETS = {
    flight: [1, 2, 3, 4],
    operations: [3, 6, 9, 12],
    research: [1, 3, 5, 8],
  };
  const MAX_TIER = 4;
  const MISSES_TO_EASE = 2;
  const MAX_PROGRESS = Math.max(...Object.values(TARGETS).flat());
  const FACTORIES = ["fuel", "engineering", "research", "academy"];
  const RECENT_LIMIT = 36;
  const ACTIVITIES = ["order", "paperOrder", "launch", "scienceLaunch", "extraScienceLaunch"];
  const REASONS = {
    flight: "You’ve been attempting launches.",
    operations: "You’ve been placing manual factory orders.",
    research: "You’ve been flying missions with research instruments.",
  };

  function boundedInt(value, lower, upper) {
    return Number.isSafeInteger(value) ? Math.max(lower, Math.min(upper, value)) : lower;
  }

  function newTrack(tier = 1, rank = 0) {
    return { tier, rank, progress: 0, sources: [], misses: 0 };
  }

  function normalize(saved) {
    const activity = Array.isArray(saved?.activity)
      ? saved.activity.slice(-RECENT_LIMIT).filter(entry => ACTIVITIES.includes(entry)) : [];
    const profile = { version: 1, focus: null, tracks: {}, activity };
    if (Object.hasOwn(TARGETS, saved?.focus)) profile.focus = saved.focus;
    for (const { id } of FOCUSES) {
      const record = saved?.tracks?.[id];
      const tier = boundedInt(record?.tier, 1, MAX_TIER);
      const track = newTrack(tier, boundedInt(record?.rank, 0, MAX_TIER));
      track.progress = boundedInt(record?.progress, 0, MAX_PROGRESS);
      track.misses = boundedInt(record?.misses, 0, MISSES_TO_EASE - 1);
      if (Array.isArray(record?.sources)) {
        track.sources = [...new Set(record.sources.filter(source => typeof source === "string" && source.length > 0))].slice(0, MAX_PROGRESS);
      }
      profile.tracks[id] = track;
    }
    return profile;
  }

  function selectFocus(profile, focus) {
    if ((focus !== null && !Object.hasOwn(TARGETS, focus)) || focus === profile.focus) return false;
    profile.focus = focus;
    return true;
  }

  function remember(profile, activity) {
    profile.activity.push(activity);
    if (profile.activity.length > RECENT_LIMIT) profile.activity.shift();
  }

  function recommendFocus(profile) {
    const counts = { order: 0, paperOrder: 0, launch: 0, scienceLaunch: 0, extraScienceLaunch: 0 };
    for (const activity of profile.activity) counts[activity]++;
    const orders = counts.order + counts.paperOrder;
    const scienceFlights = counts.scienceLaunch + counts.extraScienceLaunch;
    const launches = counts.launch + scienceFlights;

    // Ordinary payload preparation caps out below the score for two routine launches.
    const scores = {
      flight: launches >= 2 ? counts.launch * 3 + counts.scienceLaunch * 2.5 + counts.extraScienceLaunch : 0,
      operations: orders >= 6 ? Math.min(4, orders / 3) : 0,
      research: scienceFlights >= 2
        ? counts.scienceLaunch * 2 + counts.extraScienceLaunch * 4.5 + Math.min(1, counts.paperOrder / 4) : 0,
    };
    let top = null;
    let highest = 0;
    for (const focus of FOCUSES) {
      const score = scores[focus.id];
      if (score > highest) {
        top = focus;
        highest = score;
      }
    }
    return top ? { id: top.id, label: top.label, reason: REASONS[top.id] } : null;
  }

  function getChallenge(profile) {
    const focus = profile.focus;
    if (focus === null) return null;
    const { tier, rank, progress, sources } = profile.tracks[focus];
    const target = TARGETS[focus][tier - 1];
    const distinctTarget = focus !== "research" && tier >= 3 ? 2 : 0;
    let objective;
    let hint;

    if (focus === "flight") {
      objective = target === 1 ? "Earn three stars on a flight." : `Earn three stars on ${target} flights${distinctTarget ? " across at least two missions" : ""}.`;
      hint = "Choose a mission in Mission Control and check your payload before launch.";
    } else if (focus === "operations") {
      objective = `Queue ${target} hardware units by hand${distinctTarget ? " across at least two factories" : ""}.`;
      hint = "Order from the Fuel Plant or bring Data Cubes and cash to another unlocked factory.";
    } else {
      const instruments = target === 1 ? "one working instrument" : `${target} working instruments`;
      objective = `Fly ${instruments} on missions that earn at least two stars.`;
      hint = "Choose a science mission like Landsat 1. Build Research Papers and load enough Parts to power them.";
    }

    const distinct = sources.length;
    return {
      focus,
      label: FOCUSES.find(option => option.id === focus).label,
      tier,
      maxTier: MAX_TIER,
      rank,
      objective,
      hint,
      progress: Math.min(progress, target),
      target,
      distinct,
      distinctTarget,
      complete: progress >= target && distinct >= distinctTarget,
    };
  }

  function finish(profile) {
    const challenge = getChallenge(profile);
    if (!challenge.complete) return false;
    const track = profile.tracks[challenge.focus];
    track.rank = Math.max(track.rank, track.tier);
    return true;
  }

  function advance(profile) {
    const challenge = getChallenge(profile);
    if (!challenge?.complete) return false;
    const tier = Math.min(challenge.tier + 1, MAX_TIER);
    profile.tracks[challenge.focus] = newTrack(tier, challenge.rank);
    return true;
  }

  function recordProgress(profile, amount, source) {
    const track = profile.tracks[profile.focus];
    const target = TARGETS[profile.focus][track.tier - 1];
    const progress = track.progress;
    track.progress = Math.min(target, track.progress + amount);
    track.misses = 0;
    const newSource = Boolean(source) && !track.sources.includes(source);
    if (newSource) track.sources.push(source);
    if (finish(profile)) return "complete";
    return track.progress !== progress || newSource ? "progress" : null;
  }

  function recordMiss(profile) {
    const track = profile.tracks[profile.focus];
    if (track.tier === 1 || ++track.misses < MISSES_TO_EASE) return null;
    track.tier--;
    track.misses = 0;
    return finish(profile) ? "complete" : "eased";
  }

  function recordLaunch(profile, report) {
    if (!report?.mission || report.status === "blocked") return null;
    const papers = report.loadout?.paper ?? 0;
    if (papers > 0 && report.mission.scienceMax > 0) {
      remember(profile, papers > report.mission.scienceMin ? "extraScienceLaunch" : "scienceLaunch");
    } else {
      remember(profile, "launch");
    }
    const focus = profile.focus;
    if (focus !== "flight" && focus !== "research") return null;
    if (getChallenge(profile).complete) return null;

    if (focus === "flight") {
      return report.stars === 3 ? recordProgress(profile, 1, report.mission.id) : recordMiss(profile);
    }
    if (!(report.mission.scienceMax > 0)) return null;
    const instruments = Math.floor(report.effectiveScience);
    return report.stars >= 2 && instruments > 0 ? recordProgress(profile, instruments) : recordMiss(profile);
  }

  function recordOperations(profile, factory, units) {
    if (!FACTORIES.includes(factory) || !Number.isSafeInteger(units) || units <= 0) return null;
    remember(profile, factory === "research" ? "paperOrder" : "order");
    if (profile.focus !== "operations" || getChallenge(profile).complete) return null;
    return recordProgress(profile, units, factory);
  }

  globalThis.SpaceportChallenges = { FOCUSES, normalize, selectFocus, getChallenge, advance, recordLaunch, recordOperations, recommendFocus };
})();
