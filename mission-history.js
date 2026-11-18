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

  const images = {
    m1: {
      file: "explorer.webp", alt: "Grainy black-and-white image of clouds over the Pacific",
      caption: "Explorer 6’s first photograph of Earth from orbit, August 1959.", credit: "NASA",
      source: "https://science.nasa.gov/image-detail/amf-b3a0d8d2-2e9c-41d5-aa65-630b0d751fab/",
    },
    m2: {
      file: "landsat.webp", alt: "False-color satellite image of Los Angeles and surrounding mountains",
      caption: "Landsat 1’s false-color view of Los Angeles, June 1974.", credit: "NASA/JPL",
      source: "https://science.nasa.gov/photojournal/early-landsat-view-of-los-angeles-and-vicinity/",
    },
    m3: {
      file: "tiros.webp", alt: "Early television image of cloud bands over Earth",
      caption: "TIROS-1’s first television image of Earth, April 1960.", credit: "NASA",
      source: "https://science.nasa.gov/resource/tv-debut/",
    },
    m4: {
      file: "skylab.webp", alt: "Skylab in orbit, with a sunshade and solar panels visible",
      caption: "The Skylab 2 crew photographed the station after leaving it in June 1973.", credit: "NASA",
      source: "https://heasarc.gsfc.nasa.gov/docs/heasarc/missions/images/skylab_images.html",
    },
    m5: {
      file: "lunar.webp", alt: "Partly lit Earth above the Moon’s gray horizon",
      caption: "Lunar Orbiter 1’s view of Earth from the Moon’s vicinity, August 1966.", credit: "NASA",
      source: "https://science.nasa.gov/resource/first-view-of-earth-from-the-moon-and-oblique-view-of-the-lunar-surface/",
    },
    m6: {
      file: "mariner.webp", alt: "Summit and crater of an ancient Martian volcano emerging above haze",
      caption: "Mariner 9 saw the summit of Ascraeus Mons above a vast dust storm in 1971.", credit: "NASA/JPL",
      source: "https://science.nasa.gov/photojournal/mariner-9-views-ascraeus-mons-standing-above-the-martian-dust-storm/",
    },
    m7: {
      file: "viking.webp", alt: "Black-and-white view of Martian rocks and a Viking lander footpad",
      caption: "Viking 1’s first photograph from the surface of Mars, July 1976.", credit: "NASA/JPL",
      source: "https://science.nasa.gov/photojournal/first-photograph-taken-on-mars-surface/",
    },
    m9: {
      file: "juno.webp", alt: "Jupiter’s curved southern edge and swirling bands of cloud",
      caption: "JunoCam’s view of Jupiter’s south polar region.", credit: "NASA/JPL-Caltech/SwRI/MSSS",
      source: "https://science.nasa.gov/photojournal/jupiter-down-under/",
    },
    m10: {
      file: "cassini.webp", alt: "Bright crescent of Enceladus with faint plumes extending into space",
      caption: "Cassini’s backlit view of icy plumes rising from Enceladus.", credit: "NASA/JPL/Space Science Institute",
      source: "https://science.nasa.gov/photojournal/plumes-and-a-crescent/",
    },
    m11: {
      file: "voyager.webp", alt: "Full disk of blue Neptune with a prominent dark storm",
      caption: "Processed view of Neptune from Voyager 2’s 1989 encounter.", credit: "NASA/JPL",
      source: "https://science.nasa.gov/photojournal/neptune-full-disk/",
    },
    m8: {
      file: "parker.webp", alt: "A bright rocket plume lights the sky before dawn",
      caption: "Parker Solar Probe’s launch in August 2018.", credit: "NASA/Bill Ingalls",
      source: "https://science.nasa.gov/resource/parker-solar-probe-launch/",
    },
    apollo: {
      file: "apollo.webp", alt: "Buzz Aldrin in a white spacesuit near the lunar module Eagle",
      caption: "Neil Armstrong photographed Buzz Aldrin near Eagle in July 1969.", credit: "NASA",
      source: "https://science.nasa.gov/resource/apollo-11-buzz-aldrin/",
    },
  };

  const popupInset = 12;
  const popupGap = 6;

  function verticalSpace(anchor, viewport) {
    const top = viewport.y + popupInset;
    const bottom = viewport.y + viewport.height - popupInset;
    return Math.min(bottom - top, Math.max(anchor.top - popupGap - top, bottom - anchor.bottom - popupGap));
  }

  function position(anchor, card, viewport) {
    const inset = popupInset;
    const gap = popupGap;
    const minX = viewport.x + inset;
    const minY = viewport.y + inset;
    const maxX = Math.max(minX, viewport.x + viewport.width - inset - card.width);
    const maxY = Math.max(minY, viewport.y + viewport.height - inset - card.height);
    const below = anchor.bottom + gap;
    const above = anchor.top - gap - card.height;
    const y = below <= maxY ? below : above >= minY ? above : below;
    return {
      x: Math.max(minX, Math.min(maxX, anchor.left)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  function createHoverLatch() {
    let dismissed = null;
    return {
      dismiss(trigger) { dismissed = trigger; },
      allows(trigger) { return trigger !== dismissed; },
      pointerMoved(x, y) {
        if (!dismissed) return;
        const { left, right, top, bottom } = dismissed.getBoundingClientRect();
        if (x < left || x >= right || y < top || y >= bottom) dismissed = null;
      },
      reset() { dismissed = null; },
    };
  }

  globalThis.SpaceportMissionHistory = { missions, apollo, images, position, verticalSpace, createHoverLatch };
})();
