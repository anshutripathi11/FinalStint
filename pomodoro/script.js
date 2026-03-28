// ═══════════════════════════════════════════════════════════════
//  F1 RACE CONTROL — script.js
// ═══════════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════════
//  SECTION 1: CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  compounds: {
    soft:   15 * 60,
    medium: 25 * 60,
    hard:   45 * 60,
  },

  pitDuration:    5 * 60,
  lightsCount:    5,
  lightInterval:  700,    // ms between each light illuminating
  lightsHoldTime: 600,    // ms all 5 lights hold before going dark

  radioTriggers: {
    halfway:     0.50,
    drsZone:     0.20,   // ≤20% remaining → DRS enabled
    finalSector: 1 / 3,  // ≤33% remaining → final sector radio
    urgentSecs:  60,     // absolute: 60s left
  },

  storageKey: 'f1rc_season_v2',
};

// ═══════════════════════════════════════════════════════════════
//  SECTION 2: STATE MACHINE
//
//  Phases: IDLE | LIGHTS_OUT | RUNNING | PAUSED |
//          BREAK_RUNNING | BREAK_PAUSED | BREAK_COMPLETE
// ═══════════════════════════════════════════════════════════════

const state = {
  phase: 'IDLE',

  sessionDuration:  CONFIG.compounds.medium,
  timeRemaining:    CONFIG.compounds.medium,
  pitTimeRemaining: CONFIG.pitDuration,

  timerInterval: null,
  pitInterval:   null,

  // Car animation
  carAnimFrame:    null,   // rAF handle — non-null only when RUNNING
  trackPathLength: 0,      // set by initTrackPath() once SVG is in DOM
  // Car progress is derived from timeRemaining each frame; no extra state needed.

  currentLap:       1,
  selectedCompound: 'medium',

  sectors: [
    { state: 'clean', elapsed: 0 },
    { state: 'clean', elapsed: 0 },
    { state: 'clean', elapsed: 0 },
  ],
  currentSector: 0,

  yellowFlagStart:    null,  // Date.now() on tab hide — drives time-away counter
  yellowFlagInterval: null,  // setInterval for the time-away counter display

  radioFired: {
    halfway:     false,
    drsZone:     false,
    finalSector: false,
    urgentSecs:  false,
  },

  tireWearPct: 100,

  stats: {
    totalLaps:      0,
    totalMinutes:   0,
    currentStreak:  0,
    bestStreak:     0,
    totalPenalties: 0,
    lapHistory:     [],
    // lapHistory entry: { durationSecs, compound, sectorStates, hadPenalty }
  },
};

// ═══════════════════════════════════════════════════════════════
//  SECTION 3: DOM REFERENCES
// ═══════════════════════════════════════════════════════════════

const dom = {
  statusDot:          document.getElementById('statusDot'),
  statusText:         document.getElementById('statusText'),
  sessionBadge:       document.getElementById('sessionBadge'),
  lapCounter:         document.getElementById('lapCounter'),
  penaltyBadge:       document.getElementById('penaltyBadge'),
  penaltyBadgeCount:  document.getElementById('penaltyBadgeCount'),

  trackSvg:           document.getElementById('trackSvg'),
  trackOuterPath:     document.getElementById('trackOuterPath'),
  trackProgressPath:  document.getElementById('trackProgressPath'),
  carGroup:           document.getElementById('carGroup'),
  sectorDot1:         document.getElementById('sectorDot1'),
  sectorDot2:         document.getElementById('sectorDot2'),
  drsBadge:           document.getElementById('drsBadge'),

  svgLapLabel:        document.getElementById('svgLapLabel'),
  svgTimerDigits:     document.getElementById('svgTimerDigits'),
  svgSessionMode:     document.getElementById('svgSessionMode'),

  gantry:       document.getElementById('gantry'),
  gantryLights: Array.from({ length: CONFIG.lightsCount }, (_, i) =>
    document.getElementById(`gantryLight${i + 1}`)
  ),

  btnStart: document.getElementById('btnStart'),
  btnPause: document.getElementById('btnPause'),
  btnAbort: document.getElementById('btnAbort'),

  tireSoft:    document.getElementById('tireSoft'),
  tireMedium:  document.getElementById('tireMedium'),
  tireHard:    document.getElementById('tireHard'),
  stintLabel:  document.getElementById('stintLabel'),
  tireWearBar: document.getElementById('tireWearBar'),
  tireWearPct: document.getElementById('tireWearPct'),

  towerRowActive:      document.getElementById('towerRowActive'),
  towerActiveDuration: document.getElementById('towerActiveDuration'),
  towerRows: [
    null,
    document.getElementById('towerRow2'),
    document.getElementById('towerRow3'),
    document.getElementById('towerRow4'),
    document.getElementById('towerRow5'),
  ],

  sectorSegments: [
    document.getElementById('sectorSegment1'),
    document.getElementById('sectorSegment2'),
    document.getElementById('sectorSegment3'),
  ],
  sectorFills: [
    document.getElementById('sectorFill1'),
    document.getElementById('sectorFill2'),
    document.getElementById('sectorFill3'),
  ],
  sectorTimes: [
    document.getElementById('sectorTime1'),
    document.getElementById('sectorTime2'),
    document.getElementById('sectorTime3'),
  ],

  statLaps:       document.getElementById('statLaps'),
  statMinutes:    document.getElementById('statMinutes'),
  statStreak:     document.getElementById('statStreak'),
  statBestStreak: document.getElementById('statBestStreak'),
  statAvgLap:     document.getElementById('statAvgLap'),
  statPenalties:  document.getElementById('statPenalties'),
  btnResetSeason: document.getElementById('btnResetSeason'),

  yellowFlagOverlay:  document.getElementById('yellowFlagOverlay'),
  yellowFlagTimeAway: document.getElementById('yellowFlagTimeAway'),
  btnGreenFlag:       document.getElementById('btnGreenFlag'),

  pitModalOverlay: document.getElementById('pitModalOverlay'),
  pitCountdown:    document.getElementById('pitCountdown'),
  pitStatus:       document.getElementById('pitStatus'),
  btnSkipPit:      document.getElementById('btnSkipPit'),

  checkeredFlagOverlay: document.getElementById('checkeredFlagOverlay'),

  toastContainer: document.getElementById('toastContainer'),
};

// ═══════════════════════════════════════════════════════════════
//  SECTION 4: UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Formats a raw second count into "MM:SS".
 * padStart guarantees two digits (e.g. 90 → "01:30").
 */
function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Promise-based delay for async/await sequences. */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Shows a hidden overlay (removes `hidden`, sets aria-hidden=false). */
function showOverlay(el) {
  el.removeAttribute('hidden');
  el.setAttribute('aria-hidden', 'false');
  // Force reflow so CSS transitions fire from scratch after `hidden` removal
  void el.offsetWidth;
  el.classList.add('is-visible');
}

/** Hides an overlay (adds `hidden`, sets aria-hidden=true). */
function hideOverlay(el) {
  // If focus is inside the overlay, move it to <body> before setting aria-hidden.
  // Setting aria-hidden on an ancestor of the focused element is invalid per
  // WAI-ARIA spec and throws a browser console error. Blurring first is the
  // minimal fix; the caller is responsible for moving focus somewhere meaningful
  // after the overlay closes (e.g. back to the button that opened it).
  if (el.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  el.classList.remove('is-visible');
  el.setAttribute('aria-hidden', 'true');
  // Delay adding `hidden` until the CSS transition out finishes.
  // 300ms covers the longest overlay transition (pit modal: 250ms, others: 200ms).
  setTimeout(() => el.setAttribute('hidden', ''), 320);
}

/**
 * Removes all state classes from `allClasses` on `el`, then adds `stateClass`.
 * Used for status-dot states: is-running / is-paused / is-yellow.
 */
function setStateClass(el, stateClass, allClasses) {
  allClasses.forEach(c => el.classList.remove(c));
  if (stateClass) el.classList.add(stateClass);
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 5: LOCALSTORAGE PERSISTENCE
// ═══════════════════════════════════════════════════════════════

function saveStats() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.stats));
  } catch {
    // Storage blocked (private browsing, quota) — stats survive this session only
  }
}

function loadStats() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return; // nothing saved yet — keep defaults

    // JSON.parse can throw on corrupt data (truncated write, encoding issues)
    const parsed = JSON.parse(raw);

    // Additive merge: new keys added in future versions keep their defaults
    Object.assign(state.stats, parsed);

    // lapHistory may not exist in saves from earlier versions
    if (!Array.isArray(state.stats.lapHistory)) state.stats.lapHistory = [];
  } catch {
    // Corrupt data — start fresh without surfacing an error to the user
  }
}

function resetSeason() {
  const ok = window.confirm('RESET SEASON?\n\nAll laps, streaks, and penalties will be erased. This cannot be undone.');
  if (!ok) return;

  Object.assign(state.stats, {
    totalLaps:      0,
    totalMinutes:   0,
    currentStreak:  0,
    bestStreak:     0,
    totalPenalties: 0,
    lapHistory:     [],
  });

  // Reset lap counter and tire wear so the UI reflects a fresh season
  state.currentLap  = 1;
  state.tireWearPct = 100;

  saveStats();
  updateTelemetryBar();
  updateTimingTower();
  updateStatusBar();   // refreshes lap counter in status bar
  updateTireWear();
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 6: SVG TRACK — INITIALISATION & PATH MATH
// ═══════════════════════════════════════════════════════════════

/**
 * Reads the circuit path's total length via SVGPathElement.getTotalLength().
 * This must run after DOMContentLoaded — the SVG must be in the rendered tree.
 *
 * Also places the two sector-marker dots at 1/3 and 2/3 of path length,
 * and sets the initial dasharray/dashoffset to show the track as fully depleted
 * (car hasn't started yet — offset equals total length, so nothing is drawn).
 */
function initTrackPath() {
  const path = dom.trackProgressPath;

  // getTotalLength() returns the geometric length of the SVG path in user units
  state.trackPathLength = path.getTotalLength();

  // Configure the dash pattern:
  //   dasharray = "totalLength totalLength"
  //   One long dash (the whole circuit) followed by a gap of equal length.
  //   We control what's visible by shifting the offset.
  path.style.strokeDasharray  = `${state.trackPathLength} ${state.trackPathLength}`;
  path.style.strokeDashoffset = state.trackPathLength; // fully hidden at start

  // Position sector dots. getPointAtLength gives us SVG-coordinate x,y.
  const p1 = dom.trackProgressPath.getPointAtLength(state.trackPathLength / 3);
  const p2 = dom.trackProgressPath.getPointAtLength((state.trackPathLength / 3) * 2);

  dom.sectorDot1.setAttribute('cx', p1.x);
  dom.sectorDot1.setAttribute('cy', p1.y);
  dom.sectorDot2.setAttribute('cx', p2.x);
  dom.sectorDot2.setAttribute('cy', p2.y);

  // Park the car at the start/finish line (distance = 0 along the path)
  positionCarAt(0);
}

/**
 * Updates stroke-dashoffset to reflect the elapsed fraction of the session.
 *
 * SVG stroke-dashoffset math (counterintuitive but correct):
 *   - dasharray = L L   (L = total path length)
 *   - dashoffset = L    → the single dash starts L units before the path begins
 *                         → visually: NOTHING drawn (fully "behind" the start)
 *   - dashoffset = 0    → dash starts exactly at the path start
 *                         → visually: FULL circuit drawn (session complete)
 *   - dashoffset = L * fraction  → partial draw
 *
 *   So to show elapsed time as a growing red arc:
 *     offset = L × (timeRemaining / sessionDuration)
 *   As timeRemaining decreases → offset decreases → more path becomes visible.
 *
 * The CSS `transition: stroke-dashoffset 1s linear` on .track-progress
 * smooths out the 1-second jumps from setInterval.
 */
function updateTrackProgress() {
  const fraction = state.timeRemaining / state.sessionDuration;
  const offset   = state.trackPathLength * fraction;
  dom.trackProgressPath.style.strokeDashoffset = offset;
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 7: CAR ANIMATION (requestAnimationFrame)
// ═══════════════════════════════════════════════════════════════

/**
 * Places the car SVG group at the point on the path corresponding to
 * `distanceAlongPath` SVG user units.
 *
 * Rotation math:
 *   We need the tangent angle of the path at this point.
 *   Strategy: sample two points — one 2 units behind, one 2 units ahead —
 *   and compute atan2(dy, dx) for the vector between them.
 *   This gives a smooth angle even at sharp corners (no single-point discontinuity).
 *   Result is in radians → converted to degrees for SVG transform.
 *
 *   Edge cases:
 *   - At distance 0: "behind" sample wraps to near the end of the loop
 *   - At end of path: "ahead" sample wraps to near the start of the loop
 *   We clamp with modulo on the path length to handle the wrap correctly.
 */
function positionCarAt(distanceAlongPath) {
  const L = state.trackPathLength;
  if (L === 0) return; // path not yet measured — skip

  // Clamp distance to [0, L) — looping circuit
  const d = ((distanceAlongPath % L) + L) % L;

  // Sample point at current position
  const pt = dom.trackProgressPath.getPointAtLength(d);

  // Sample two flanking points for tangent calculation (2 units apart)
  const step = 2;
  const ptA  = dom.trackProgressPath.getPointAtLength(((d - step + L) % L));
  const ptB  = dom.trackProgressPath.getPointAtLength(((d + step) % L));

  // atan2(dy, dx) gives the angle of the vector A→B in radians
  const angleRad = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);
  // Convert to degrees for SVG rotate()
  const angleDeg = angleRad * (180 / Math.PI);

  // SVG transform: translate to position, then rotate around the car's local origin
  dom.carGroup.setAttribute(
    'transform',
    `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${angleDeg.toFixed(2)})`
  );
}

/**
 * Starts the requestAnimationFrame loop.
 * The loop recalculates car position every frame (~60fps) based on the
 * current timeRemaining — so the car glides smoothly between the 1-second
 * timer ticks rather than jumping.
 */
function startCarAnimation() {
  // Cancel any stale frame before starting a new loop
  stopCarAnimation();
  state.carAnimFrame = requestAnimationFrame(animateCarFrame);
}

/** Cancels the rAF loop and nulls the handle. */
function stopCarAnimation() {
  if (state.carAnimFrame !== null) {
    cancelAnimationFrame(state.carAnimFrame);
    state.carAnimFrame = null;
  }
}

/**
 * Single rAF frame.
 *
 * Car position calculation:
 *   elapsed = sessionDuration - timeRemaining
 *   progress (0–1) = elapsed / sessionDuration
 *   distanceAlongPath = progress × trackPathLength
 *
 * The key insight: we DON'T interpolate between ticks here — we compute
 * directly from timeRemaining. This means the car position is always in
 * sync with the actual timer value, even if the browser deprioritises
 * frames while the tab is backgrounded.
 *
 * Only reschedules itself if still in RUNNING phase — no zombie frames.
 */
function animateCarFrame() {
  if (state.phase !== 'RUNNING') return; // phase changed, stop loop

  const elapsed   = state.sessionDuration - state.timeRemaining;
  const progress  = elapsed / state.sessionDuration;
  const distance  = progress * state.trackPathLength;

  positionCarAt(distance);

  // Schedule next frame — keep loop alive as long as we're RUNNING
  state.carAnimFrame = requestAnimationFrame(animateCarFrame);
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 8: LIGHTS OUT SEQUENCE
// ═══════════════════════════════════════════════════════════════

/**
 * Async/await over delay() promises — reads like a screenplay:
 *   wait → light 1 on → wait → light 2 on → … → all hold → all off → GO
 *
 * Controls are disabled for the entire sequence duration so nothing
 * can interrupt the cinematic moment before the lap starts.
 */
/**
 * Three-phase cinematic start sequence:
 *
 *   Phase 1 — ACTIVATE (one-shot bloom, 300ms per light):
 *     Add .is-lighting to trigger the lightActivate keyframe.
 *     After 300ms (animation duration), swap to .is-lit so the steady
 *     gantryBloom pulse takes over. This two-class approach lets us have
 *     a snap-on moment AND a sustained hold without a single unwieldy keyframe.
 *
 *   Phase 2 — HOLD (600ms, all 5 pulsing):
 *     Pure CSS animation plays, nothing to do in JS.
 *     This is the dramatic tension beat before the race.
 *
 *   Phase 3 — EXTINGUISH (simultaneous, 200ms fade):
 *     Remove .is-lit, add .is-extinguishing to trigger the fast fade keyframe.
 *     All 5 lights go dark at exactly the same moment — the defining F1 moment.
 *     After 200ms, clean up all classes.
 *
 * Controls are disabled for the full sequence (~4.1s for medium compound):
 *   5 × 700ms (intervals) + 300ms (last light bloom) + 600ms (hold) + 200ms (fade)
 *   = 4600ms total from button press to green light
 */
async function runLightsOutSequence() {
  if (state.phase === 'LIGHTS_OUT') return;

  state.phase = 'LIGHTS_OUT';
  updateStatusBar();
  setButtonStates({ start: false, pause: false, abort: false });
  lockTireSelector();

  // Gantry housing border glows while the sequence is active
  dom.gantry.classList.add('is-active');

  // ── Phase 1: Activate each light left-to-right ──
  for (let i = 0; i < CONFIG.lightsCount; i++) {
    // Wait before illuminating the next light
    await delay(CONFIG.lightInterval);

    const light = dom.gantryLights[i];

    // Bloom flash: expand from nothing → full glow in 300ms
    light.classList.add('is-lighting');

    // After the activation animation completes, switch to steady pulse.
    // We use a closure capturing `light` so all 5 timeouts reference the
    // correct element (not a loop variable alias issue).
    setTimeout(((el) => () => {
      el.classList.remove('is-lighting');
      el.classList.add('is-lit');
    })(light), 300);
  }

  // Wait for the last light's bloom animation to finish before holding
  await delay(300 + CONFIG.lightsHoldTime);

  // ── Phase 3: Extinguish all simultaneously ──
  dom.gantryLights.forEach(l => {
    l.classList.remove('is-lit', 'is-lighting');
    l.classList.add('is-extinguishing');
  });
  dom.gantry.classList.remove('is-active');

  // Wait for fade animation to complete, then clean up classes
  await delay(220);
  dom.gantryLights.forEach(l => l.classList.remove('is-extinguishing'));

  // Small gap — the "all dark" beat before the race clock starts
  await delay(80);

  beginCounting();
}

/**
 * Begins the setInterval countdown immediately after lights go dark.
 *
 * Timer accuracy note: setInterval(1000) is subject to browser drift — the
 * actual interval is 1000ms ± ~15ms per tick. Over a 25-minute session this
 * accumulates to a maximum of ~2 seconds of total drift. For a focus timer
 * MVP this is acceptable. A production implementation would compare
 * Date.now() snapshots (performance.now() for monotonic time) to compute
 * elapsed seconds directly, eliminating drift entirely.
 */
function beginCounting() {
  state.phase = 'RUNNING';
  updateStatusBar();
  setButtonStates({ start: false, pause: true, abort: true });
  dom.trackSvg.classList.add('is-running');

  // Reset radio flags — each session gets a clean set of trigger points.
  // Exception: if resuming from pause mid-session, flags stay as-is so we
  // don't re-fire messages. The radioFired object is only zeroed for a fresh start.
  if (state.timeRemaining === state.sessionDuration) {
    Object.keys(state.radioFired).forEach(k => { state.radioFired[k] = false; });
  }

  // Re-apply urgent visual state if resuming inside the urgent window
  if (state.timeRemaining <= CONFIG.radioTriggers.urgentSecs) {
    dom.svgTimerDigits.classList.add('is-urgent');
    dom.trackSvg.classList.add('is-urgent');
  }

  // "Lights out" radio only fires on a fresh lap start, not on mid-lap resumes
  if (state.timeRemaining === state.sessionDuration) {
    showTeamRadio(RADIO_MESSAGES.timerStart);
  }

  // Ensure no stale interval from a previous session before starting
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(onTick, 1000);

  startCarAnimation();
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 9: TIMER LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Start button handler.
 *   IDLE   → run lights-out sequence (full cinematic start)
 *   PAUSED → resume immediately — no lights (mid-lap resume)
 */
function startTimer() {
  if (state.phase === 'IDLE') {
    runLightsOutSequence();
  } else if (state.phase === 'PAUSED') {
    beginCounting();
    dom.btnStart.textContent = 'START'; // reset label after resume
  }
}

/**
 * Pause button handler — only acts on RUNNING phase.
 * Sets phase to PAUSED, stops the interval and car animation,
 * enables the Start/Resume button.
 */
function pauseTimer() {
  if (state.phase !== 'RUNNING') return;

  clearInterval(state.timerInterval);
  state.timerInterval = null;
  stopCarAnimation();

  state.phase = 'PAUSED';
  updateStatusBar();
  dom.trackSvg.classList.remove('is-running');

  // Relabel Start → RESUME so the user knows it's a mid-lap restart
  dom.btnStart.textContent = 'RESUME';
  setButtonStates({ start: true, pause: false, abort: true });
}

/**
 * Abort button — hard resets to IDLE with no stat credit.
 * The current lap's progress is discarded.
 */
function abortTimer() {
  clearInterval(state.timerInterval);
  clearInterval(state.pitInterval);
  state.timerInterval = null;
  state.pitInterval   = null;
  stopCarAnimation();

  // Close any open overlays safely
  hideOverlay(dom.yellowFlagOverlay);
  hideOverlay(dom.pitModalOverlay);
  clearInterval(state.yellowFlagInterval);
  state.yellowFlagInterval = null;

  // Restore session state to clean IDLE
  state.phase            = 'IDLE';
  state.timeRemaining    = state.sessionDuration;
  state.pitTimeRemaining = CONFIG.pitDuration;
  state.tireWearPct      = 100;
  state.currentSector    = 0;
  state.sectors          = [
    { state: 'clean', elapsed: 0 },
    { state: 'clean', elapsed: 0 },
    { state: 'clean', elapsed: 0 },
  ];

  // Reset all gantry lights (in case abort hit during any phase of the sequence)
  dom.gantryLights.forEach(l => l.classList.remove('is-lit', 'is-lighting', 'is-extinguishing'));
  dom.gantry.classList.remove('is-active');

  // Reset all visual state classes
  dom.trackSvg.classList.remove('is-running', 'is-drs', 'is-urgent');
  dom.svgTimerDigits.classList.remove('is-urgent');
  deactivateDRS();
  updateTrackProgress();         // resets dashoffset to full length
  positionCarAt(0);              // park car at start/finish
  resetSectorBar();
  updateTireWear();
  updateSvgTimer();
  updateStatusBar();

  dom.btnStart.textContent = 'START';
  setButtonStates({ start: true, pause: false, abort: false });
  unlockTireSelector();
}

/**
 * Core tick — fires every 1000ms while RUNNING.
 * Order matters: decrement first, then update displays,
 * so the UI always shows the current (post-decrement) value.
 */
function onTick() {
  state.timeRemaining--;

  const elapsed = state.sessionDuration - state.timeRemaining;

  // Keep timing tower active row in sync
  dom.towerActiveDuration.textContent = formatTime(elapsed);

  // Track visual progress
  updateTrackProgress();
  updateSvgTimer();

  // Sector and wear bar update
  updateSectors();
  state.tireWearPct = Math.round((state.timeRemaining / state.sessionDuration) * 100);
  updateTireWear();

  // ── Team radio trigger checks (fire once per session) ──
  const fractionRemaining = state.timeRemaining / state.sessionDuration;

  if (!state.radioFired.halfway && fractionRemaining <= CONFIG.radioTriggers.halfway) {
    state.radioFired.halfway = true;
    showTeamRadio(RADIO_MESSAGES.halfway);
  }
  if (!state.radioFired.finalSector && fractionRemaining <= CONFIG.radioTriggers.finalSector) {
    state.radioFired.finalSector = true;
    showTeamRadio(RADIO_MESSAGES.finalSector);
  }
  if (!state.radioFired.urgentSecs && state.timeRemaining <= CONFIG.radioTriggers.urgentSecs) {
    state.radioFired.urgentSecs = true;
    showTeamRadio(RADIO_MESSAGES.urgentSecs);
    // Enter urgent visual mode: timer digits flash, car pulses faster
    dom.svgTimerDigits.classList.add('is-urgent');
    dom.trackSvg.classList.add('is-urgent');
  }

  // ── DRS zone (≤20% remaining) ──
  // Activate visuals and fire radio toast once per session.
  // activateDRS() is pure-visual; the radio call lives here so the trigger
  // logic (flag check, threshold) is all in one place.
  if (!state.radioFired.drsZone && fractionRemaining <= CONFIG.radioTriggers.drsZone) {
    state.radioFired.drsZone = true;
    activateDRS();
    showTeamRadio(RADIO_MESSAGES.drsZone);
  }

  if (state.timeRemaining <= 0) {
    onSessionComplete();
  }
}

/**
 * Called when the timer hits zero.
 * Updates stats, shows finish sequence, then opens pit stop.
 */
function onSessionComplete() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  stopCarAnimation();
  dom.trackSvg.classList.remove('is-running', 'is-urgent');
  dom.svgTimerDigits.classList.remove('is-urgent');
  deactivateDRS();

  // ── Update persisted stats ──
  const sessionMinutes = Math.round(state.sessionDuration / 60);
  state.stats.totalLaps++;
  state.stats.totalMinutes += sessionMinutes;
  state.stats.currentStreak++;
  if (state.stats.currentStreak > state.stats.bestStreak) {
    state.stats.bestStreak = state.stats.currentStreak;
  }

  // Record this lap in history for the timing tower (keep last 5).
  // sectorTimes stores raw seconds per sector — used for personal best comparison
  // on the next lap. sectorStates stores the color string for the timing tower dots.
  state.stats.lapHistory.unshift({
    durationSecs:  state.sessionDuration,
    compound:      state.selectedCompound,
    sectorStates:  state.sectors.map(s => s.state),
    sectorTimes:   state.sectors.map(s => s.elapsed),  // seconds per sector
    hadPenalty:    state.sectors.some(s => s.state === 'yellow'),
  });
  if (state.stats.lapHistory.length > 5) state.stats.lapHistory.length = 5;

  saveStats();
  updateTelemetryBar();
  updateTimingTower();

  showTeamRadio(RADIO_MESSAGES.sessionDone);

  // Set the "LAP COMPLETE" text before showing the overlay
  const textEl = document.getElementById('checkeredFlagText');
  if (textEl) textEl.textContent = 'LAP COMPLETE';

  // Checkered flag flash (CSS checkerFlash keyframe, 1.5s), then pit stop.
  // We show for 2s total so the flash has time to complete and the user
  // can read "LAP COMPLETE" before the modal appears.
  showOverlay(dom.checkeredFlagOverlay);
  setTimeout(() => {
    hideOverlay(dom.checkeredFlagOverlay);
    openPitStop();
  }, 2000);
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 10: SECTOR TRACKING
// ═══════════════════════════════════════════════════════════════

/** Duration of each sector in seconds (1/3 of total session). */
function sectorDuration() {
  return state.sessionDuration / 3;
}

/**
 * Called on every tick to update the sector fills.
 *
 * Sector 0 covers elapsed seconds 0 → sectorDuration
 * Sector 1 covers elapsed seconds sectorDuration → 2*sectorDuration
 * Sector 2 covers elapsed seconds 2*sectorDuration → sessionDuration
 *
 * Within the active sector, fill width = (elapsed within sector / sectorDuration) × 100%.
 */
/**
 * Called on every tick. Drives the sector fills and detects boundaries.
 *
 * ── Sector index math ──
 *   elapsed  = sessionDuration − timeRemaining  (seconds that have passed)
 *   secDur   = sessionDuration / 3              (seconds per sector)
 *
 *   sectorIdx = floor(elapsed / secDur)          (0, 1, or 2)
 *   Capped at 2 because the last tick (elapsed == sessionDuration)
 *   would give floor(3) = 3, which is out of range.
 *
 * ── Fill within the active sector ──
 *   offsetInSector = elapsed − (sectorIdx × secDur)
 *     This is how many seconds have elapsed since the current sector started.
 *   fillPct = (offsetInSector / secDur) × 100
 *     Maps 0→secDur seconds to 0→100% width.
 *
 * ── Boundary crossing ──
 *   When sectorIdx > currentSector, we've just crossed into a new sector.
 *   completeSector() is called on the previous sector at this exact tick —
 *   while timeRemaining still reflects the moment the boundary was hit.
 */
function updateSectors() {
  const elapsed   = state.sessionDuration - state.timeRemaining;
  const secDur    = sectorDuration();

  // floor(elapsed / secDur) gives which sector we're in (0, 1, 2)
  const sectorIdx = Math.min(Math.floor(elapsed / secDur), 2);

  // Boundary crossed — complete the previous sector before advancing
  if (sectorIdx > state.currentSector) {
    completeSector(state.currentSector);
    state.currentSector = sectorIdx;
  }

  // How far through the active sector we are (seconds since sector start)
  const offsetInSector = elapsed - sectorIdx * secDur;

  // Convert to a 0–100% fill width, capped to prevent overshoot on the last tick
  const fillPct = Math.min((offsetInSector / secDur) * 100, 100);
  dom.sectorFills[sectorIdx].style.width = `${fillPct}%`;
}

/**
 * Marks a sector as fully complete, records its time, determines its
 * display color, and updates the sector bar segment.
 *
 * ── Time calculation ──
 *   Each sector spans exactly (sessionDuration / 3) seconds.
 *   Sector 0: elapsed 0s → secDur
 *   Sector 1: elapsed secDur → 2×secDur
 *   Sector 2: elapsed 2×secDur → sessionDuration
 *
 *   Time for THIS sector = total elapsed − (sectorIndex × secDur)
 *
 *   We use timeRemaining at the exact tick the boundary was crossed
 *   (the tick where sectorIdx advanced), so the recorded time reflects
 *   when the boundary was hit, not the tick after.
 *
 * ── Color logic ──
 *   YELLOW  : tab-away penalty occurred in this sector (already flagged)
 *   PURPLE  : personal best — this sector is faster than the same sector
 *             on the previous completed lap of the same compound.
 *             If no prior lap exists, first-ever sector is always purple
 *             (no benchmark to compare against → it is the benchmark).
 *   GREEN   : clean sector, not a personal best
 *
 * ── Personal best comparison ──
 *   We look at lapHistory[0].sectorTimes[sectorIndex] (the most recent lap).
 *   sectorTimes stores raw seconds per sector.
 *   thisTime < prevTime → purple (faster = better in F1 sector comparison).
 *
 *   We only compare laps of the SAME compound — a 15-min Soft sector time
 *   is not meaningfully comparable to a 25-min Medium sector time.
 */
function completeSector(sectorIndex) {
  const secDur  = sectorDuration();  // seconds per sector = sessionDuration / 3
  const elapsed = state.sessionDuration - state.timeRemaining;

  // How many seconds elapsed within this sector specifically
  const sectorElapsed = elapsed - sectorIndex * secDur;

  // Clamp to prevent floating-point overshoot beyond the sector window
  const sectorTimeSecs = Math.min(Math.round(sectorElapsed), Math.round(secDur));

  dom.sectorFills[sectorIndex].style.width = '100%';
  dom.sectorTimes[sectorIndex].textContent = formatTime(sectorTimeSecs);

  // Store the raw seconds on the sector so it can be written into lapHistory
  state.sectors[sectorIndex].elapsed = sectorTimeSecs;

  // ── Determine color ──
  let sectorState = state.sectors[sectorIndex].state; // 'yellow' if penalty already flagged

  if (sectorState !== 'yellow') {
    // Find the previous lap with the same compound for a fair comparison
    const prevLap = state.stats.lapHistory.find(
      lap => lap.compound === state.selectedCompound
    );

    if (!prevLap || !Array.isArray(prevLap.sectorTimes)) {
      // No prior lap of this compound → this sector time is automatically the best
      sectorState = 'purple';
    } else {
      const prevSectorTime = prevLap.sectorTimes[sectorIndex];
      if (typeof prevSectorTime === 'number' && sectorTimeSecs < prevSectorTime) {
        // This sector is faster than the same sector last time → personal best
        sectorState = 'purple';
      } else {
        // Clean but not faster
        sectorState = 'green';
      }
    }

    state.sectors[sectorIndex].state = sectorState;
  }

  // ── Update segment display ──
  const seg = dom.sectorSegments[sectorIndex];
  seg.classList.remove('is-yellow', 'is-purple', 'is-complete');
  if (sectorState === 'yellow') seg.classList.add('is-yellow');
  if (sectorState === 'purple') seg.classList.add('is-purple');
  seg.classList.add('is-complete');
}

/** Resets all three sector segments to initial empty state. */
function resetSectorBar() {
  for (let i = 0; i < 3; i++) {
    dom.sectorFills[i].style.width = '0%';
    dom.sectorTimes[i].textContent = '—:——';
    dom.sectorSegments[i].classList.remove('is-yellow', 'is-purple', 'is-complete');
  }
  state.sectors = [
    { state: 'clean', elapsed: 0 },
    { state: 'clean', elapsed: 0 },
    { state: 'clean', elapsed: 0 },
  ];
  state.currentSector = 0;
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 11: PIT STOP MODAL
// ═══════════════════════════════════════════════════════════════

function openPitStop() {
  state.phase            = 'BREAK_RUNNING';
  state.pitTimeRemaining = CONFIG.pitDuration;

  // Reset modal copy to normal state (not "PIT COMPLETE" from prior cycle)
  dom.pitStatus.textContent = 'CHANGE UNDERWAY';
  dom.pitCountdown.textContent = formatTime(CONFIG.pitDuration);

  showOverlay(dom.pitModalOverlay);
  updateStatusBar();
  setButtonStates({ start: false, pause: false, abort: false });
  showTeamRadio(RADIO_MESSAGES.breakStart);

  state.pitInterval = setInterval(() => {
    state.pitTimeRemaining--;
    dom.pitCountdown.textContent = formatTime(state.pitTimeRemaining);
    if (state.pitTimeRemaining <= 0) onPitComplete();
  }, 1000);
}

function onPitComplete() {
  clearInterval(state.pitInterval);
  state.pitInterval = null;

  state.phase = 'BREAK_COMPLETE';
  dom.pitStatus.textContent    = 'PIT COMPLETE';
  dom.pitCountdown.textContent = '00:00';
  updateStatusBar();

  setTimeout(closePitStop, 1500);
}

/**
 * Dismisses the pit modal and readies the app for the next lap.
 * Called by: natural expiry (via onPitComplete), or Skip Pit Stop button.
 */
function closePitStop() {
  clearInterval(state.pitInterval);
  state.pitInterval = null;

  hideOverlay(dom.pitModalOverlay);

  // Return focus to Start button so keyboard users have a logical next target.
  // The pit modal had focus (btnSkipPit or natural expiry), and aria-hidden
  // was already cleared by hideOverlay, so this is safe.
  dom.btnStart.focus();

  // Advance the lap counter
  state.currentLap++;

  // Reset for the next session
  state.timeRemaining    = state.sessionDuration;
  state.pitTimeRemaining = CONFIG.pitDuration;
  state.tireWearPct      = 100;
  resetSectorBar();
  deactivateDRS();

  // Reset car to start/finish — smooth: CSS transition on the dashoffset
  positionCarAt(0);
  updateTrackProgress();
  updateSvgTimer();
  updateTireWear();

  state.phase = 'IDLE';
  updateStatusBar();
  dom.btnStart.textContent = 'START';
  setButtonStates({ start: true, pause: false, abort: false });
  unlockTireSelector();
  showTeamRadio(RADIO_MESSAGES.breakEnd);
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 12: YELLOW FLAG (Page Visibility API)
// ═══════════════════════════════════════════════════════════════

/**
 * Triggered when the user tabs away during RUNNING or BREAK_RUNNING.
 *
 * For RUNNING:
 *   - Pauses the timer (same logic as manual pause, but without changing
 *     the Start button label to RESUME — the yellow flag overlay has its
 *     own GREEN FLAG button for resuming)
 *   - Increments penalty, breaks streak
 *   - Marks the current sector as 'yellow'
 *
 * For BREAK_RUNNING:
 *   - Pauses the pit countdown
 *   - Still a penalty ("pit lane speeding")
 *
 * UX choice: we start a live time-away counter so the user can see exactly
 * how long they were gone — makes the penalty feel concrete, not arbitrary.
 */
function showYellowFlag() {
  if (state.phase === 'RUNNING') {
    // Pause focus timer without changing Start button label
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    stopCarAnimation();
    dom.trackSvg.classList.remove('is-running');
    state.phase = 'PAUSED';

    // Mark current sector as penalised
    state.sectors[state.currentSector].state = 'yellow';

  } else if (state.phase === 'BREAK_RUNNING') {
    // Pause pit countdown
    clearInterval(state.pitInterval);
    state.pitInterval = null;
    state.phase = 'BREAK_PAUSED';

  } else {
    return; // IDLE, LIGHTS_OUT, already paused — no penalty
  }

  // Penalise: increment, break streak
  state.stats.totalPenalties++;
  state.stats.currentStreak = 0;
  saveStats();
  updateTelemetryBar();

  // Update penalty badge in status bar
  dom.penaltyBadge.removeAttribute('hidden');
  dom.penaltyBadgeCount.textContent = state.stats.totalPenalties;

  // Record when the user left, for the live time-away counter
  state.yellowFlagStart = Date.now();
  dom.yellowFlagTimeAway.textContent = '0s';

  // Live counter ticks every second while overlay is showing
  clearInterval(state.yellowFlagInterval);
  state.yellowFlagInterval = setInterval(updateTimeAwayCounter, 1000);

  showOverlay(dom.yellowFlagOverlay);
  updateStatusBar();
  showTeamRadio(RADIO_MESSAGES.tabSwitch);
}

/**
 * Dismisses the yellow flag overlay.
 *
 * UX decision:
 *   - PAUSED (was RUNNING): timer stays paused. User must click RESUME explicitly.
 *     Reasoning: the user may have alt-tabbed accidentally mid-thought.
 *     Forcing a deliberate click ensures they're mentally back at the desk.
 *
 *   - BREAK_PAUSED: break countdown auto-resumes.
 *     Reasoning: during a break the user is resting — they don't need to
 *     "re-engage" with the session. Auto-resume avoids a dead break timer.
 */
function hideYellowFlag() {
  clearInterval(state.yellowFlagInterval);
  state.yellowFlagInterval = null;

  hideOverlay(dom.yellowFlagOverlay);

  if (state.phase === 'PAUSED') {
    // Keep paused — show RESUME label so user knows what to do next
    dom.btnStart.textContent = 'RESUME';
    setButtonStates({ start: true, pause: false, abort: true });
    updateStatusBar();

  } else if (state.phase === 'BREAK_PAUSED') {
    // Auto-resume the break countdown
    state.phase = 'BREAK_RUNNING';
    updateStatusBar();
    state.pitInterval = setInterval(() => {
      state.pitTimeRemaining--;
      dom.pitCountdown.textContent = formatTime(state.pitTimeRemaining);
      if (state.pitTimeRemaining <= 0) onPitComplete();
    }, 1000);
  }
}

function onVisibilityChange() {
  if (!document.hidden) return; // returning to tab — overlay stays up, user acts

  if (state.phase === 'RUNNING' || state.phase === 'BREAK_RUNNING') {
    showYellowFlag();
  }
}

/** Updates the "TIME AWAY: Xs" text while the yellow flag overlay is open. */
function updateTimeAwayCounter() {
  if (!state.yellowFlagStart) return;
  const elapsed = Math.floor((Date.now() - state.yellowFlagStart) / 1000);
  dom.yellowFlagTimeAway.textContent = elapsed < 60
    ? `${elapsed}s`
    : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 13: DRS ZONE
// ═══════════════════════════════════════════════════════════════

/**
 * Activates DRS visual mode (≤20% remaining).
 * CSS on .track-svg.is-drs handles:
 *   - track-progress stroke switches to --timing-green
 *   - car pulse animation runs faster (carPulse keyframe)
 * The drsBadge SVG element is made visible here via SVG presentation attribute.
 * Team radio is fired by the caller in onTick (not here) to keep this function
 * pure-visual and avoid firing the toast twice if activateDRS is ever called
 * outside the onTick flow.
 */
function activateDRS() {
  dom.trackSvg.classList.add('is-drs');
  // SVG visibility attribute (not CSS display) — works inside SVG element tree
  dom.drsBadge.setAttribute('visibility', 'visible');
}

function deactivateDRS() {
  dom.trackSvg.classList.remove('is-drs');
  dom.drsBadge.setAttribute('visibility', 'hidden');
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 14: TIRE COMPOUND SELECTOR
// ═══════════════════════════════════════════════════════════════

function onTireSelect(compound) {
  // Guard: selection only allowed in IDLE (no session active)
  if (state.phase !== 'IDLE') return;

  state.selectedCompound = compound;
  state.sessionDuration  = CONFIG.compounds[compound];
  state.timeRemaining    = state.sessionDuration;

  // Update .is-selected on badges and aria-checked
  [
    [dom.tireSoft,   'soft'],
    [dom.tireMedium, 'medium'],
    [dom.tireHard,   'hard'],
  ].forEach(([el, c]) => {
    const isSelected = c === compound;
    el.classList.toggle('is-selected', isSelected);
    el.setAttribute('aria-checked', isSelected ? 'true' : 'false');

    // Show/hide the "SELECTED" micro-label inside each badge
    const label = el.querySelector('.tire-badge__selected');
    if (label) label.style.display = isSelected ? 'block' : 'none';
  });

  // Update stint label below the badges
  const mins = CONFIG.compounds[compound] / 60;
  dom.stintLabel.textContent = `${mins} MIN`;

  // Reflect in the SVG mode label (shows compound name as session context)
  dom.svgSessionMode.textContent = compound.toUpperCase();

  // Reset track to empty and timer display to new duration
  updateTrackProgress();
  updateSvgTimer();
}

function lockTireSelector() {
  [dom.tireSoft, dom.tireMedium, dom.tireHard].forEach(el => {
    el.disabled = true;
  });
}

function unlockTireSelector() {
  [dom.tireSoft, dom.tireMedium, dom.tireHard].forEach(el => {
    el.disabled = false;
  });
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 15: TEAM RADIO TOASTS
// ═══════════════════════════════════════════════════════════════

const RADIO_MESSAGES = {
  timerStart:  'Lights out and away we go!',
  halfway:     'Good pace. Keep pushing, keep pushing.',
  drsZone:     'DRS enabled. Push now, push now!',
  finalSector: 'Final sector. Bring it home.',
  urgentSecs:  'Last minute. Give it everything.',
  tabSwitch:   "Track limits! We're under investigation.",
  sessionDone: 'GET IN THERE! What a lap!',
  breakStart:  'Box, box. Pit confirm, box this lap.',
  breakEnd:    "New tires on. Let's go again.",
};

// Internal queue: messages wait here if a toast is already showing
const _toastQueue = [];
let _toastActive = false;

/**
 * Queues a team radio message. If no toast is currently showing,
 * renders it immediately. Otherwise it waits in _toastQueue.
 * Only one toast is visible at a time — real F1 broadcast discipline.
 */
function showTeamRadio(message) {
  _toastQueue.push(message);
  if (!_toastActive) processToastQueue();
}

function processToastQueue() {
  if (_toastQueue.length === 0) {
    _toastActive = false;
    return;
  }

  _toastActive = true;
  const message = _toastQueue.shift();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <p class="toast__label">TEAM RADIO</p>
    <p class="toast__message">${message}</p>
  `;

  dom.toastContainer.appendChild(toast);

  // Slide in: add .is-visible on next frame so the initial translateX(120%)
  // state is already applied before the transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('is-visible'));
  });

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.classList.add('is-dismissing');
    // Remove from DOM after transition completes, then show next
    setTimeout(() => {
      toast.remove();
      processToastQueue();
    }, 320);
  }, 4000);
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 16: UI UPDATES
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  IDLE:           { text: 'READY',                    dotClass: null,          badge: 'FOCUS SESSION' },
  LIGHTS_OUT:     { text: 'LIGHTS OUT',               dotClass: 'is-paused',   badge: 'STARTING' },
  RUNNING:        { text: 'GREEN FLAG — LAP IN PROGRESS', dotClass: 'is-running', badge: 'FOCUS SESSION' },
  PAUSED:         { text: 'RED FLAG — SESSION PAUSED', dotClass: 'is-paused',  badge: 'PAUSED' },
  BREAK_RUNNING:  { text: 'PIT LANE',                 dotClass: 'is-running',  badge: 'PIT STOP' },
  BREAK_PAUSED:   { text: 'PIT LANE — SPEED LIMITER', dotClass: 'is-yellow',   badge: 'PIT STOP' },
  BREAK_COMPLETE: { text: 'OUT LAP',                  dotClass: 'is-running',  badge: 'PIT COMPLETE' },
};

function updateStatusBar() {
  const cfg = STATUS_CONFIG[state.phase] ?? STATUS_CONFIG.IDLE;

  dom.statusText.textContent  = cfg.text;
  dom.sessionBadge.textContent = cfg.badge;
  dom.lapCounter.textContent  = `LAP ${state.currentLap}`;

  setStateClass(dom.statusDot, cfg.dotClass, ['is-running', 'is-paused', 'is-yellow']);

  // Penalty badge: show when > 0 penalties
  if (state.stats.totalPenalties > 0) {
    dom.penaltyBadge.removeAttribute('hidden');
    dom.penaltyBadgeCount.textContent = state.stats.totalPenalties;
  } else {
    dom.penaltyBadge.setAttribute('hidden', '');
  }
}

function updateSvgTimer() {
  dom.svgTimerDigits.textContent = formatTime(state.timeRemaining);
  dom.svgLapLabel.textContent    = `LAP ${state.currentLap}`;
  // Mode label: compound name or PIT during a break
  if (state.phase === 'BREAK_RUNNING' || state.phase === 'BREAK_COMPLETE') {
    dom.svgSessionMode.textContent = 'PIT';
  } else {
    dom.svgSessionMode.textContent = state.selectedCompound.toUpperCase();
  }
}

/**
 * Rebuilds the timing tower historical rows from state.stats.lapHistory.
 * Row indices 2–5 map to lapHistory[0..3] (most recent first).
 */
function updateTimingTower() {
  const history = state.stats.lapHistory;

  for (let i = 1; i <= 4; i++) {
    const row  = dom.towerRows[i];
    if (!row) continue;
    const entry = history[i - 1];

    if (!entry) {
      // Placeholder row
      row.querySelector('.tower-duration').textContent = '—';
      row.querySelector('.tower-tire').className = 'tower-tire tower-tire--empty';
      row.querySelectorAll('.tower-sector-dot').forEach(d => {
        d.className = 'tower-sector-dot tower-sector-dot--empty';
      });
      row.classList.remove('tower-row--clean', 'tower-row--dirty');
      continue;
    }

    row.querySelector('.tower-duration').textContent = formatTime(entry.durationSecs);

    const tireDot = row.querySelector('.tower-tire');
    tireDot.className = `tower-tire tower-tire--${entry.compound}`;

    const dots = row.querySelectorAll('.tower-sector-dot');
    entry.sectorStates.forEach((s, idx) => {
      if (dots[idx]) dots[idx].className = `tower-sector-dot tower-sector-dot--${s}`;
    });

    row.classList.toggle('tower-row--clean', !entry.hadPenalty);
    row.classList.toggle('tower-row--dirty',  entry.hadPenalty);
  }
}

function updateTireWear() {
  const pct = state.tireWearPct;
  dom.tireWearBar.style.width = `${pct}%`;
  dom.tireWearPct.textContent = `${pct}%`;

  // Color transitions: green → yellow at 50%, yellow → red at 20%
  dom.tireWearBar.classList.toggle('is-warn', pct < 50 && pct >= 20);
  dom.tireWearBar.classList.toggle('is-crit', pct < 20);
}

/**
 * Updates all six telemetry bar stat elements.
 * Triggers .stat-flash animation only on elements whose values changed,
 * using data-prev-value to diff without maintaining a shadow copy in state.
 */
function updateTelemetryBar() {
  const { totalLaps, totalMinutes, currentStreak, bestStreak, totalPenalties, lapHistory } = state.stats;

  // Avg lap time: totalMinutes / totalLaps (in MM:SS)
  const avgLapStr = totalLaps > 0
    ? formatTime(Math.round((totalMinutes * 60) / totalLaps))
    : '—:——';

  flashStatIfChanged(dom.statLaps,       totalLaps);
  flashStatIfChanged(dom.statMinutes,    totalMinutes);
  flashStatIfChanged(dom.statStreak,     currentStreak);
  flashStatIfChanged(dom.statBestStreak, bestStreak);
  flashStatIfChanged(dom.statAvgLap,     avgLapStr);
  flashStatIfChanged(dom.statPenalties,  totalPenalties);
}

/** Updates one stat element and triggers the flash animation if the value changed. */
function flashStatIfChanged(el, newValue) {
  const prev = el.dataset.prevValue;
  el.textContent = newValue;
  el.dataset.prevValue = String(newValue);

  if (prev === undefined) return; // first render — no animation
  if (String(newValue) === prev) return; // unchanged — no animation

  // Re-trigger animation by removing then re-adding the class
  // (void offsetWidth forces a reflow so the browser sees a fresh start)
  el.classList.remove('stat-flash');
  void el.offsetWidth;
  el.classList.add('stat-flash');
}

function setButtonStates({ start, pause, abort }) {
  dom.btnStart.disabled = !start;
  dom.btnPause.disabled = !pause;
  dom.btnAbort.disabled = !abort;
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 17: EVENT BINDING
// ═══════════════════════════════════════════════════════════════

function bindEvents() {
  dom.btnStart.addEventListener('click', startTimer);
  dom.btnPause.addEventListener('click', pauseTimer);
  dom.btnAbort.addEventListener('click', abortTimer);

  dom.tireSoft.addEventListener('click',   () => onTireSelect('soft'));
  dom.tireMedium.addEventListener('click', () => onTireSelect('medium'));
  dom.tireHard.addEventListener('click',   () => onTireSelect('hard'));

  dom.btnGreenFlag.addEventListener('click', hideYellowFlag);
  dom.btnSkipPit.addEventListener('click',   closePitStop);
  dom.btnResetSeason.addEventListener('click', resetSeason);

  document.addEventListener('visibilitychange', onVisibilityChange);

  // ── Keyboard shortcuts ──
  // Space = Start / Pause (toggle), R = Abort, 1/2/3 = tire compound (IDLE only).
  // We check event.target to avoid triggering when user types in a real input.
  // overlayActive() guards against shortcuts firing behind an overlay.
  document.addEventListener('keydown', (e) => {
    // Ignore if focus is inside an input/textarea/select — shouldn't exist in this
    // app but defensive guard for future use
    if (e.target.matches('input, textarea, select')) return;

    // Don't fire shortcuts when a modal overlay is open (yellow flag / pit stop)
    const overlayOpen =
      !dom.yellowFlagOverlay.hasAttribute('hidden') ||
      !dom.pitModalOverlay.hasAttribute('hidden');

    switch (e.code) {
      case 'Space':
        // Space: acts as Start or Pause depending on current phase
        e.preventDefault(); // prevent page scroll
        if (state.phase === 'IDLE' || state.phase === 'PAUSED') {
          if (!dom.btnStart.disabled) startTimer();
        } else if (state.phase === 'RUNNING') {
          if (!dom.btnPause.disabled) pauseTimer();
        }
        break;

      case 'KeyR':
        // R: Abort — only when not blocked by overlay
        if (!overlayOpen && !dom.btnAbort.disabled) abortTimer();
        break;

      case 'Digit1':
        // 1: Select Soft compound — only when IDLE
        if (state.phase === 'IDLE') onTireSelect('soft');
        break;

      case 'Digit2':
        // 2: Select Medium compound — only when IDLE
        if (state.phase === 'IDLE') onTireSelect('medium');
        break;

      case 'Digit3':
        // 3: Select Hard compound — only when IDLE
        if (state.phase === 'IDLE') onTireSelect('hard');
        break;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 18: INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  loadStats();
  initTrackPath();     // must come before any arc or car position calls
  updateSvgTimer();
  updateStatusBar();
  updateTimingTower();
  updateTelemetryBar();
  updateTireWear();
  setButtonStates({ start: true, pause: false, abort: false });
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
