(() => {
  "use strict";

  // Historical reference copy, independent of game balance and saved progress.
  const missions = {
    m1: {
      date: "August 1959",
      story: "Explorer 6 studied radiation near Earth and tried a new way to send images back from orbit. Its camera returned a grainy view of clouds over the Pacific, the first photograph of Earth from a satellite.",
    },
    m2: {
      date: "July 1972",
      story: "Originally called the Earth Resources Technology Satellite, Landsat 1 photographed land in several wavelengths. It showed that satellites could reliably monitor crops, forests, and changes to the land over time.",
    },
    m3: {
      date: "April 1960",
      story: "TIROS-1 tested whether cameras in orbit could help forecasters understand weather. Its pictures showed broad cloud patterns that were hard to see from the ground, paving the way for modern weather satellites.",
    },
    m4: {
      date: "May–June 1973",
      story: "The first Skylab crew arrived at a damaged space station. They deployed a sunshade and freed a jammed solar panel, then spent the rest of their 28-day mission conducting experiments.",
    },
    m5: {
      date: "August 1966",
      story: "Lunar Orbiter 1 photographed areas where Apollo astronauts might land. It also turned its camera toward Earth, sending back the first image of Earth taken from lunar orbit.",
    },
    m6: {
      date: "November 1971 · Mars arrival",
      story: "Mariner 9 became the first spacecraft to orbit another planet. A huge dust storm initially hid much of Mars; once it cleared, the orbiter mapped features including giant volcanoes and deep canyons.",
    },
    m7: {
      date: "July 1976 · Mars landing",
      story: "Viking 1 touched down on Chryse Planitia. It sent back surface photographs, measured the weather, and analyzed soil. Its experiments did not establish that life was present.",
    },
    m9: {
      date: "July 2016 · Jupiter arrival",
      story: "Juno took a path over Jupiter’s poles to study what is beneath its clouds. Its instruments revealed groups of cyclones around the poles and helped map the planet’s gravity and magnetic fields.",
    },
    m10: {
      date: "2004–2017 · Saturn tour",
      story: "Cassini spent 13 years exploring Saturn and its moons. It spotted plumes erupting from Enceladus, helping scientists uncover evidence of a liquid-water ocean under the moon’s icy crust.",
    },
    m11: {
      date: "August 1989 · Neptune flyby",
      story: "Voyager 2 used gravity assists to reach the outer planets. At Neptune it observed the Great Dark Spot, imaged the planet’s rings, and saw active geysers on its moon Triton.",
    },
    m8: {
      date: "December 2024 · Close solar pass",
      story: "Parker Solar Probe studies how the Sun’s outer atmosphere heats up and how the solar wind gains speed. On December 24 it flew about 3.8 million miles above the Sun’s surface, closer than any spacecraft had flown before.",
      extraSource: { name: "NASA’s close-pass story", url: "https://science.nasa.gov/science-research/heliophysics/nasas-parker-solar-probe-makes-history-with-closest-pass-to-sun/" },
    },
  };

  const apollo = {
    name: "Apollo 11",
    date: "July 1969 · Moon landing",
    story: "Neil Armstrong and Buzz Aldrin landed Eagle and became the first people to walk on the Moon. They collected samples and set up experiments while Michael Collins remained in lunar orbit.",
    historyUrl: "https://www.nasa.gov/mission/apollo-11/",
  };

  globalThis.SpaceportMissionHistory = { missions, apollo };
})();
