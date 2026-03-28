import { useState, useEffect, useRef, useCallback } from "react";

// ─── F1 DATA ────────────────────────────────────────────
const CONSTRUCTORS = [
  { id: "math", name: "Scuderia Mathematica", color: "#DC0000", accent: "#FF2800", abbr: "MAT", engine: "Calculus V6" },
  { id: "cs", name: "Oracle CompSci Racing", color: "#0600EF", accent: "#3671FF", abbr: "CSR", engine: "Algorithm Turbo" },
  { id: "physics", name: "McLaren Physics", color: "#FF8700", accent: "#FFB547", abbr: "PHY", engine: "Quantum Power Unit" },
  { id: "english", name: "Aston Martin English", color: "#006F62", accent: "#00A383", abbr: "ENG", engine: "Rhetoric V8" },
  { id: "history", name: "Alfa Romeo Historia", color: "#900000", accent: "#C40000", abbr: "HIS", engine: "Chronicle Hybrid" },
  { id: "chem", name: "Alpine Chemistry", color: "#0090FF", accent: "#45B6FF", abbr: "CHE", engine: "Molecular Combustion" },
  { id: "bio", name: "Williams BioScience", color: "#005AFF", accent: "#4D91FF", abbr: "BIO", engine: "Genome Turbo" },
  { id: "econ", name: "Haas Economics", color: "#B6BABD", accent: "#DDD", abbr: "ECO", engine: "Market Force V6" },
];

const CIRCUITS = [
  { name: "Monaco", task: "Exam Prep", laps: 78, country: "MC" },
  { name: "Silverstone", task: "Essay Writing", laps: 52, country: "GB" },
  { name: "Monza", task: "Problem Sets", laps: 53, country: "IT" },
  { name: "Spa-Francorchamps", task: "Research Paper", laps: 44, country: "BE" },
  { name: "Suzuka", task: "Lab Report", laps: 53, country: "JP" },
  { name: "Singapore", task: "Group Project", laps: 62, country: "SG" },
  { name: "Interlagos", task: "Final Review", laps: 71, country: "BR" },
  { name: "COTA", task: "Homework Sprint", laps: 56, country: "US" },
  { name: "Bahrain", task: "Reading Assignment", laps: 57, country: "BH" },
  { name: "Jeddah", task: "Flashcards", laps: 50, country: "SA" },
];

const RIVALS = [
  { name: "Procrastination", team: "Scuderia Distraction", color: "#666" },
  { name: "Burnout", team: "Red Bull Cramming", color: "#777" },
  { name: "Social Media", team: "Meta Racing Point", color: "#888" },
  { name: "Netflix", team: "BingeWatch GP", color: "#999" },
  { name: "Overthinking", team: "AlphaTauri Anxiety", color: "#AAA" },
];

const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const fmtLap = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}.${Math.floor(Math.random() * 999).toString().padStart(3, "0")}`;

// ─── STORAGE (localStorage) ─────────────────────────────
const STORAGE_KEY = "studygp-championship";
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};
const defaultData = () => ({
  points: 0, totalLaps: 0, totalMinutes: 0, sessionsCompleted: 0,
  fastestLap: null, trackViolations: 0, dnfs: 0,
  weekLog: [null, null, null, null, null, null, null],
  constructorStats: {},
  raceHistory: [],
});

// ─── COMPONENTS ─────────────────────────────────────────

function StartLights({ phase, onComplete }) {
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (phase !== "countdown") return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setLit(i);
      if (i >= 5) {
        clearInterval(iv);
        setTimeout(() => {
          setLit(0);
          onComplete();
        }, 600 + Math.random() * 1400);
      }
    }, 800);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "20px 0" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: n <= lit ? "#E8002D" : lit === 0 && phase === "go" ? "transparent" : "#2a0008",
          border: "2px solid #333",
          boxShadow: n <= lit ? "0 0 20px #E8002D, 0 0 40px rgba(232,0,45,0.4)" : "inset 0 2px 6px rgba(0,0,0,0.5)",
          transition: "all 0.15s",
        }} />
      ))}
    </div>
  );
}

function TireViz({ wear, compound }) {
  const cols = { soft: "#FF3333", medium: "#FFC300", hard: "#EEEEEE" };
  const fc = cols[compound];
  const segs = 10;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="none" stroke="#222" strokeWidth="8" />
      {Array.from({ length: segs }).map((_, i) => {
        const a1 = (i / segs) * 360 - 90;
        const a2 = ((i + 1) / segs) * 360 - 90;
        const worn = (i / segs) * 100 > wear;
        const r = 28;
        const x1 = 32 + r * Math.cos(a1 * Math.PI / 180), y1 = 32 + r * Math.sin(a1 * Math.PI / 180);
        const x2 = 32 + r * Math.cos(a2 * Math.PI / 180), y2 = 32 + r * Math.sin(a2 * Math.PI / 180);
        return <path key={i}
          d={`M32 32L${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}Z`}
          fill={worn ? "#1a1a1a" : fc} stroke="#0f0f0f" strokeWidth="0.5"
          opacity={worn ? 0.2 : 0.85}
        />;
      })}
      <circle cx="32" cy="32" r="12" fill="#0f0f0f" stroke="#333" strokeWidth="0.5" />
      <text x="32" y="33" textAnchor="middle" dominantBaseline="central" fill="#888"
        style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)" }}>{compound[0].toUpperCase()}</text>
    </svg>
  );
}

function MiniChart({ data, color, w = 160, h = 40 }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h, background: "#111", borderRadius: 3 }} />;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  const uid = `mc-${color.replace('#', '')}-${w}`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#111", border: "1px solid #222", borderRadius: 4,
      padding: "14px 16px", borderLeft: `3px solid ${color || "#333"}`,
    }}>
      <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontWeight: 600, marginBottom: 4, fontFamily: "var(--cond)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#fff", fontFamily: "var(--mono)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RadioMessage({ msg, type }) {
  if (!msg) return null;
  const colors = { info: "#0090FF", warn: "#EAB308", danger: "#EF4444", success: "#22C55E", purple: "#A855F7" };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      background: `${c}11`, border: `1px solid ${c}33`, borderRadius: 4,
      padding: "8px 14px", display: "flex", alignItems: "center", gap: 10,
      animation: "radioIn 0.3s ease",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, animation: "radioPulse 1s infinite" }} />
      <div>
        <div style={{ fontSize: 9, color: c, letterSpacing: 2, fontWeight: 600, fontFamily: "var(--cond)" }}>TEAM RADIO</div>
        <div style={{ fontSize: 12, color: "#ccc" }}>{msg}</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────
export default function StudyGP() {
  const [championship, setChampionship] = useState(() => loadData() || defaultData());
  const [screen, setScreen] = useState("garage");
  const [constructor, setConstructor] = useState(CONSTRUCTORS[0]);
  const [circuit, setCircuit] = useState(CIRCUITS[0]);
  const [targetLaps, setTargetLaps] = useState(4);
  const [compound, setCompound] = useState("medium");

  const [racePhase, setRacePhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [currentLap, setCurrentLap] = useState(0);
  const [laps, setLaps] = useState([]);
  const [bestLap, setBestLap] = useState(null);
  const [sectors, setSectors] = useState(["", "", ""]);

  const [tireWear, setTireWear] = useState(100);
  const [ersLevel, setErsLevel] = useState(100);
  const [throttle, setThrottle] = useState(0);
  const [fuelLevel, setFuelLevel] = useState(100);
  const [trackViolations, setTrackViolations] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [drsActive, setDrsActive] = useState(false);
  const [radioMsg, setRadioMsg] = useState(null);
  const [radioType, setRadioType] = useState("info");
  const [networkQuality, setNetworkQuality] = useState("Excellent");
  const [raceCondition, setRaceCondition] = useState("day");
  const [focusHistory, setFocusHistory] = useState([]);
  const [throttleHistory, setThrottleHistory] = useState([]);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [offTrackTime, setOffTrackTime] = useState(0);
  const [pitTimer, setPitTimer] = useState(0);

  const timerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, speed: 0 });
  const lastActivityRef = useRef(Date.now());
  const radioTimeoutRef = useRef(null);

  const LAP_DURATION = 25 * 60;
  const PIT_DURATION = 5 * 60;

  // ─── TIME OF DAY → RACE CONDITION ─────────────────
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 17) setRaceCondition("day");
    else if (h >= 17 && h < 20) setRaceCondition("twilight");
    else setRaceCondition("night");
  }, []);

  // ─── BATTERY API → FUEL ───────────────────────────
  useEffect(() => {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(bat => {
      setFuelLevel(Math.round(bat.level * 100));
      bat.addEventListener("levelchange", () => setFuelLevel(Math.round(bat.level * 100)));
    });
  }, []);

  // ─── NETWORK → RADIO QUALITY ──────────────────────
  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const update = () => {
      const eff = conn.effectiveType;
      setNetworkQuality(eff === "4g" ? "Excellent" : eff === "3g" ? "Moderate" : "Poor — static");
    };
    update();
    conn.addEventListener("change", update);
    return () => conn.removeEventListener("change", update);
  }, []);

  // ─── PAGE VISIBILITY → OFF TRACK ─────────────────
  useEffect(() => {
    const handler = () => {
      const vis = document.visibilityState === "visible";
      setIsTabVisible(vis);
      if (!vis && racePhase === "racing") {
        setTrackViolations(v => v + 1);
        sendRadio("TRACK LIMITS! You've left the circuit. Get back on track!", "danger");
      } else if (vis && racePhase === "racing") {
        sendRadio("Back on track. Push now, push now!", "success");
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [racePhase]);

  // ─── MOUSE → THROTTLE ────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const dx = e.clientX - mouseRef.current.x;
      const dy = e.clientY - mouseRef.current.y;
      mouseRef.current = { x: e.clientX, y: e.clientY, speed: Math.sqrt(dx * dx + dy * dy) };
      lastActivityRef.current = Date.now();
      setIdleSeconds(0);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // ─── KEYBOARD → GEAR SHIFTS ──────────────────────
  useEffect(() => {
    const handler = () => {
      lastActivityRef.current = Date.now();
      setIdleSeconds(0);
      setTotalKeystrokes(k => k + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── CLICK TRACKING ──────────────────────────────
  useEffect(() => {
    const handler = () => { lastActivityRef.current = Date.now(); setIdleSeconds(0); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // ─── TEAM RADIO ───────────────────────────────────
  const sendRadio = useCallback((msg, type = "info") => {
    setRadioMsg(msg);
    setRadioType(type);
    if (radioTimeoutRef.current) clearTimeout(radioTimeoutRef.current);
    radioTimeoutRef.current = setTimeout(() => setRadioMsg(null), 5000);
  }, []);

  // ─── MAIN RACE TIMER ─────────────────────────────
  useEffect(() => {
    if (racePhase === "racing") {
      timerRef.current = setInterval(() => {
        const spd = mouseRef.current.speed;
        const thr = Math.min(100, Math.round(spd * 2.5));
        setThrottle(thr);
        mouseRef.current.speed *= 0.85;

        const idle = (Date.now() - lastActivityRef.current) / 1000;
        setIdleSeconds(idle);

        const wearRate = idle > 30 ? 0.06 : idle > 10 ? 0.03 : 0.015;
        const compoundMod = compound === "soft" ? 1.5 : compound === "hard" ? 0.6 : 1;
        setTireWear(w => Math.max(0, w - wearRate * compoundMod));
        setErsLevel(e => Math.max(0, e - 0.01));
        if (document.hidden) setOffTrackTime(t => t + 1);

        const visPenalty = document.hidden ? 40 : 0;
        const idlePenalty = Math.min(30, idle * 0.5);
        const focus = Math.max(0, Math.min(100, 100 - visPenalty - idlePenalty));
        setFocusHistory(h => [...h.slice(-59), focus]);
        setThrottleHistory(h => [...h.slice(-59), thr]);

        setElapsed(e => e + 1);
        setLapTime(l => {
          const next = l + 1;
          const third = LAP_DURATION / 3;
          if (next === Math.floor(third)) {
            setSectors(s => { const n = [...s]; n[0] = ["purple", "green", "yellow"][Math.floor(Math.random() * 3)]; return n; });
          } else if (next === Math.floor(2 * third)) {
            setSectors(s => { const n = [...s]; n[1] = ["purple", "green", "yellow"][Math.floor(Math.random() * 3)]; return n; });
          }

          if (next >= LAP_DURATION) {
            setLaps(prev => [...prev, LAP_DURATION]);
            setCurrentLap(cl => {
              const newLap = cl + 1;
              if (newLap >= targetLaps) { finishRace(); return newLap; }
              const msgs = [
                "Excellent lap! Consistent pace.", "Box this lap if tires are gone.",
                "Gap to Procrastination is 3.2 seconds.", "Fuel looks good, push push push!",
                "You're in the window for fastest lap!", "Keep your head down, great rhythm.",
              ];
              sendRadio(msgs[Math.floor(Math.random() * msgs.length)], "info");
              return newLap;
            });
            setSectors(["", "", ""]);
            return 0;
          }

          if (next > 0 && next % 60 === 0 && idle > 20) {
            sendRadio("We're losing pace! Activity levels dropping. Stay focused!", "warn");
          }
          if (next > 0 && next % 120 === 0) {
            setTireWear(w => {
              if (w < 20 && w > 15) sendRadio("Tires are GONE. Box box box! Take a pit stop.", "danger");
              else if (w < 40 && w > 35) sendRadio("Tire deg is high. Consider a pit stop soon.", "warn");
              return w;
            });
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    } else if (racePhase === "pit") {
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1);
        setPitTimer(p => {
          if (p + 1 >= PIT_DURATION) {
            setRacePhase("racing");
            setTireWear(100);
            setErsLevel(100);
            sendRadio("Pit stop complete! New tires on. Go go go!", "success");
            return 0;
          }
          return p + 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    } else if (racePhase === "safety") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [racePhase, compound, targetLaps]);

  // ─── RACE ACTIONS ─────────────────────────────────
  const startRace = () => {
    setRacePhase("countdown");
    setElapsed(0); setLapTime(0); setCurrentLap(0); setLaps([]);
    setTireWear(100); setErsLevel(100);
    setTrackViolations(0); setOffTrackTime(0); setTotalKeystrokes(0);
    setSectors(["", "", ""]); setFocusHistory([]); setThrottleHistory([]);
    setBestLap(null); setPitTimer(0); setDrsActive(false); setIdleSeconds(0);
  };

  const lightsOut = () => {
    setRacePhase("racing");
    sendRadio("LIGHTS OUT AND AWAY WE GO! Focus time starts NOW.", "success");
  };

  const pitStop = () => {
    if (racePhase !== "racing") return;
    setRacePhase("pit"); setPitTimer(0);
    sendRadio("Box box box! Pit stop. Take a 5 minute break.", "warn");
  };

  const deploySafety = () => {
    if (racePhase === "racing") { setRacePhase("safety"); sendRadio("Safety car deployed. Session paused.", "warn"); }
  };

  const restartFromSafety = () => {
    if (racePhase === "safety") { setRacePhase("racing"); sendRadio("Safety car in! Green flag. Go!", "success"); }
  };

  const toggleDRS = () => {
    setDrsActive(d => {
      if (!d) sendRadio("DRS enabled. Deep Focus Zone active!", "purple");
      else sendRadio("DRS disabled.", "info");
      return !d;
    });
  };

  const retireRace = () => {
    setRacePhase("dnf");
    setChampionship(prev => {
      const next = { ...prev, dnfs: prev.dnfs + 1 };
      saveData(next);
      return next;
    });
    sendRadio("DNF. Session retired. We'll regroup for the next race.", "danger");
  };

  const finishRace = () => {
    clearInterval(timerRef.current);
    setRacePhase("finished");
    setSectors(s => { const n = [...s]; n[2] = ["purple", "green", "yellow"][Math.floor(Math.random() * 3)]; return n; });
    const avgF = focusHistory.length > 0 ? focusHistory.reduce((a, b) => a + b, 0) / focusHistory.length : 80;
    const totalPts = 25 + Math.round(avgF / 10) + 1;
    sendRadio(`CHEQUERED FLAG! P1! +${totalPts} championship points!`, "success");

    setChampionship(prev => {
      const day = new Date().getDay();
      const wl = [...prev.weekLog]; wl[day] = (wl[day] || 0) + totalPts;
      const cs = { ...prev.constructorStats }; cs[constructor.id] = (cs[constructor.id] || 0) + Math.round(elapsed / 60);
      const rh = [...prev.raceHistory, {
        date: new Date().toISOString(), circuit: circuit.name, constructor: constructor.id,
        laps: targetLaps, time: elapsed, points: totalPts, avgFocus: Math.round(avgF), violations: trackViolations,
      }];
      const next = {
        ...prev, points: prev.points + totalPts, totalLaps: prev.totalLaps + targetLaps,
        totalMinutes: prev.totalMinutes + Math.round(elapsed / 60),
        sessionsCompleted: prev.sessionsCompleted + 1,
        trackViolations: prev.trackViolations + trackViolations,
        weekLog: wl, constructorStats: cs, raceHistory: rh.slice(-20),
      };
      saveData(next);
      return next;
    });
  };

  const goToGarage = () => { setScreen("garage"); setRacePhase("idle"); };
  const resetChampionship = () => {
    const fresh = defaultData();
    setChampionship(fresh);
    saveData(fresh);
  };

  // ─── DERIVED ──────────────────────────────────────
  const avgFocus = focusHistory.length > 0 ? Math.round(focusHistory.reduce((a, b) => a + b, 0) / focusHistory.length) : 0;
  const raceProgress = targetLaps > 0 ? ((currentLap + lapTime / LAP_DURATION) / targetLaps) * 100 : 0;
  const currentGear = throttle > 80 ? 8 : throttle > 60 ? 7 : throttle > 40 ? 6 : throttle > 20 ? 5 : throttle > 5 ? 4 : idleSeconds > 10 ? 1 : 3;
  const condColors = { day: "#FFD700", twilight: "#FF6B35", night: "#6366F1" };
  const condLabel = { day: "DAYLIGHT", twilight: "TWILIGHT", night: "NIGHT RACE" };

  const rivalStandings = RIVALS.map((r, i) => ({
    ...r, pts: Math.max(0, championship.points - (i + 1) * 15 + Math.floor(Math.random() * 10 - 5)),
  })).sort((a, b) => b.pts - a.pts);

  // ─── RENDER ───────────────────────────────────────
  return (
    <div style={{
      "--red": "#E8002D", "--gold": "#FFD700", "--mono": "'JetBrains Mono',monospace",
      "--cond": "'Barlow Condensed',sans-serif", "--body": "'Titillium Web',sans-serif",
      fontFamily: "var(--body)", background: "#0a0a0a", color: "#e8e8e8", minHeight: "100vh", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800&family=Titillium+Web:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes radioIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes radioPulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(232,0,45,.3)}50%{box-shadow:0 0 40px rgba(232,0,45,.6)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes progressPulse{0%,100%{opacity:.8}50%{opacity:1}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        button{font-family:var(--cond);cursor:pointer;transition:all .15s}button:hover{filter:brightness(1.15)}button:active{transform:scale(.97)}
      `}</style>

      {/* TOP BAR */}
      <header style={{
        background: "linear-gradient(90deg,#0f0f0f,#1a1a1a)", borderBottom: "2px solid #E8002D",
        padding: "0 20px", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: 24, letterSpacing: 4, color: "#fff" }}>
            STUDY<span style={{ color: "#E8002D" }}>GP</span>
          </div>
          {racePhase === "racing" && (
            <div style={{ background: "#E8002D", padding: "2px 10px", borderRadius: 2, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#fff", animation: "blink 1.5s infinite" }}>LIVE</div>
          )}
          <div style={{
            background: condColors[raceCondition] + "22", border: `1px solid ${condColors[raceCondition]}44`,
            padding: "2px 10px", borderRadius: 2, fontSize: 9, fontWeight: 600,
            color: condColors[raceCondition], letterSpacing: 1, fontFamily: "var(--cond)",
          }}>{condLabel[raceCondition]}</div>
        </div>
        <nav style={{ display: "flex", gap: 8 }}>
          {screen !== "garage" && (
            <button onClick={goToGarage} style={{ background: "transparent", border: "1px solid #333", color: "#999", padding: "6px 16px", borderRadius: 2, fontSize: 11, letterSpacing: 1.5 }}>GARAGE</button>
          )}
        </nav>
      </header>

      {/* ═══════════════ GARAGE ═══════════════ */}
      {screen === "garage" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 28, animation: "fadeUp 0.5s ease" }}>
            <StatCard label="CHAMPIONSHIP PTS" value={championship.points} color="#E8002D" />
            <StatCard label="RACES COMPLETED" value={championship.sessionsCompleted} color="#22C55E" />
            <StatCard label="TOTAL LAPS" value={championship.totalLaps} color="#0090FF" />
            <StatCard label="FOCUS HOURS" value={`${Math.round(championship.totalMinutes / 60 * 10) / 10}h`} color="#A855F7" />
          </div>

          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 6, padding: 28, animation: "fadeUp 0.6s ease" }}>
            <div style={{ fontSize: 11, color: "#E8002D", letterSpacing: 4, fontWeight: 700, marginBottom: 24, fontFamily: "var(--cond)", borderBottom: "1px solid #222", paddingBottom: 12 }}>
              RACE SETUP — CONFIGURE YOUR GRAND PRIX
            </div>

            {/* Constructor */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 10, fontFamily: "var(--cond)" }}>SELECT CONSTRUCTOR (SUBJECT)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {CONSTRUCTORS.map(c => (
                  <button key={c.id} onClick={() => setConstructor(c)} style={{
                    background: constructor.id === c.id ? c.color + "22" : "#0a0a0a",
                    border: `1px solid ${constructor.id === c.id ? c.color : "#333"}`,
                    borderRadius: 4, padding: "10px 8px", textAlign: "left", borderLeft: `3px solid ${c.color}`, color: "#fff",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--cond)", letterSpacing: 1 }}>{c.abbr}</div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{c.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Circuit */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 10, fontFamily: "var(--cond)" }}>SELECT CIRCUIT (TASK)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                {CIRCUITS.map(c => (
                  <button key={c.name} onClick={() => setCircuit(c)} style={{
                    background: circuit.name === c.name ? "#E8002D11" : "#0a0a0a",
                    border: `1px solid ${circuit.name === c.name ? "#E8002D" : "#333"}`,
                    borderRadius: 4, padding: "8px", textAlign: "center", color: "#fff",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--cond)" }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: "#888" }}>{c.task}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Laps + Compound */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 10, fontFamily: "var(--cond)" }}>RACE DISTANCE (LAPS × 25 MIN)</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 6, 8].map(n => (
                    <button key={n} onClick={() => setTargetLaps(n)} style={{
                      width: 44, height: 44, borderRadius: 4,
                      background: targetLaps === n ? "#E8002D" : "#0a0a0a",
                      border: `1px solid ${targetLaps === n ? "#E8002D" : "#333"}`,
                      color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)",
                    }}>{n}</button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>Total: {targetLaps * 25} minutes of focus</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 10, fontFamily: "var(--cond)" }}>TIRE COMPOUND (FOCUS STRATEGY)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "soft", label: "SOFT", desc: "High intensity, degrades fast", color: "#FF3333" },
                    { id: "medium", label: "MEDIUM", desc: "Balanced pace", color: "#FFC300" },
                    { id: "hard", label: "HARD", desc: "Slow & steady", color: "#EEEEEE" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setCompound(t.id)} style={{
                      flex: 1, background: compound === t.id ? t.color + "22" : "#0a0a0a",
                      border: `1px solid ${compound === t.id ? t.color : "#333"}`,
                      borderRadius: 4, padding: "10px", textAlign: "center", color: "#fff",
                    }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.color, margin: "0 auto 6px", border: "2px solid #333" }} />
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--cond)", letterSpacing: 1 }}>{t.label}</div>
                      <div style={{ fontSize: 8, color: "#888", marginTop: 2 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sensor Status */}
            <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 4, padding: 14, marginBottom: 24 }}>
              <div style={{ fontSize: 9, color: "#E8002D", letterSpacing: 2, fontWeight: 600, marginBottom: 8, fontFamily: "var(--cond)" }}>
                TELEMETRY SYSTEMS — ACTIVE SENSORS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, fontSize: 10 }}>
                {[
                  ["Tab Visibility", "Off-track detection", "#22C55E"],
                  ["Mouse Tracking", "Throttle input %", "#22C55E"],
                  ["Keyboard Events", "Gear shifts", "#22C55E"],
                  ["Idle Detection", "Tire degradation", "#22C55E"],
                  ["Battery Level", `Fuel: ${fuelLevel}%`, navigator.getBattery ? "#22C55E" : "#EAB308"],
                  ["Network Quality", networkQuality, "#22C55E"],
                  ["Time of Day", condLabel[raceCondition], "#22C55E"],
                  ["Local Storage", "Championship data", "#22C55E"],
                  ["Focus Scoring", "Composite metric", "#22C55E"],
                ].map(([name, desc, status]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: status, flexShrink: 0 }} />
                    <div><span style={{ color: "#ccc", fontWeight: 600 }}>{name}</span> <span style={{ color: "#666" }}>— {desc}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { setScreen("race"); startRace(); }} style={{
              width: "100%", background: "linear-gradient(90deg,#E8002D,#B8001F)",
              color: "#fff", border: "none", padding: "18px", borderRadius: 4,
              fontSize: 22, fontWeight: 800, letterSpacing: 8, fontFamily: "var(--cond)", animation: "glow 2s infinite",
            }}>
              LIGHTS OUT AND AWAY WE GO
            </button>
            <div style={{ textAlign: "center", fontSize: 10, color: "#555", marginTop: 8, letterSpacing: 1 }}>
              {constructor.name} • {circuit.name} — {circuit.task} • {targetLaps} laps • {compound} compound
            </div>
          </div>

          {/* Race History */}
          {championship.raceHistory.length > 0 && (
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 6, padding: 20, marginTop: 16, animation: "fadeUp 0.7s ease" }}>
              <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 12, fontFamily: "var(--cond)" }}>RECENT RACE RESULTS</div>
              {championship.raceHistory.slice(-5).reverse().map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "3px 1fr 80px 60px", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "1px solid #1a1a1a" : "none" }}>
                  <div style={{ background: CONSTRUCTORS.find(c => c.id === r.constructor)?.color || "#555", borderRadius: 1, alignSelf: "stretch" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.circuit}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{new Date(r.date).toLocaleDateString()} • {r.laps} laps • Focus: {r.avgFocus}%</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", fontFamily: "var(--mono)" }}>{fmt(r.time)}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8002D", fontFamily: "var(--mono)", textAlign: "right" }}>+{r.points}</div>
                </div>
              ))}
            </div>
          )}

          {/* Standings */}
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 6, padding: 20, marginTop: 16, animation: "fadeUp 0.8s ease" }}>
            <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 12, fontFamily: "var(--cond)" }}>DRIVERS' CHAMPIONSHIP</div>
            {[{ name: "You", team: constructor.name, pts: championship.points, color: constructor.color }, ...rivalStandings]
              .sort((a, b) => b.pts - a.pts)
              .map((d, i) => (
                <div key={d.name} style={{
                  display: "grid", gridTemplateColumns: "30px 3px 1fr auto", gap: 10, alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid #1a1a1a",
                  background: d.name === "You" ? "rgba(232,0,45,0.03)" : "transparent",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? "#FFD700" : "#444", fontFamily: "var(--cond)", textAlign: "center" }}>{i + 1}</div>
                  <div style={{ background: d.color, borderRadius: 1, alignSelf: "stretch" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: d.name === "You" ? 700 : 400, color: d.name === "You" ? "#fff" : "#aaa" }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{d.team}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: d.name === "You" ? "#E8002D" : "#666" }}>{d.pts}</div>
                </div>
              ))}
          </div>

          {/* Reset button */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={resetChampionship} style={{
              background: "transparent", border: "1px solid #333", color: "#555",
              padding: "8px 20px", borderRadius: 4, fontSize: 10, letterSpacing: 2,
            }}>RESET CHAMPIONSHIP DATA</button>
          </div>
        </div>
      )}

      {/* ═══════════════ RACE ═══════════════ */}
      {screen === "race" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: "calc(100vh - 50px)", overflow: "hidden" }}>
          <div style={{ padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Race header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222", paddingBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--cond)", letterSpacing: 2 }}>
                <span style={{ color: constructor.color }}>{constructor.abbr}</span>
                <span style={{ color: "#555", margin: "0 8px" }}>|</span>
                {circuit.name} — {circuit.task}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#888", fontFamily: "var(--cond)", letterSpacing: 1 }}>
                  LAP <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{currentLap}</span>/{targetLaps}
                </span>
                <div style={{
                  padding: "3px 10px", borderRadius: 2, fontSize: 9, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--cond)",
                  background: racePhase === "racing" ? "#22C55E" : racePhase === "pit" ? "#EAB308" : racePhase === "safety" ? "#EAB308" : racePhase === "finished" ? "#A855F7" : racePhase === "dnf" ? "#EF4444" : "#555",
                  color: "#000",
                }}>
                  {racePhase === "racing" ? "GREEN FLAG" : racePhase === "countdown" ? "STARTING" : racePhase === "pit" ? "PIT STOP" : racePhase === "safety" ? "SAFETY CAR" : racePhase === "finished" ? "CHEQUERED FLAG" : racePhase === "dnf" ? "DNF" : "READY"}
                </div>
              </div>
            </div>

            <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, transition: "width 1s linear", width: `${Math.min(100, raceProgress)}%`, background: `linear-gradient(90deg,${constructor.color},${constructor.accent})` }} />
            </div>

            {racePhase === "countdown" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <StartLights phase="countdown" onComplete={lightsOut} />
                <div style={{ fontSize: 14, color: "#888", fontFamily: "var(--cond)", letterSpacing: 3, marginTop: 16 }}>FORMATION LAP — PREPARE YOUR MATERIALS</div>
              </div>
            )}

            {(racePhase === "racing" || racePhase === "pit" || racePhase === "safety") && (
              <>
                <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  {drsActive && <div style={{ position: "absolute", inset: 0, border: "2px solid #22C55E", borderRadius: 6, pointerEvents: "none", opacity: 0.5, boxShadow: "inset 0 0 30px rgba(34,197,94,0.1)" }} />}
                  <div style={{ fontSize: 9, color: "#666", letterSpacing: 3, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 6 }}>
                    {racePhase === "pit" ? "PIT STOP — TAKE A BREAK" : racePhase === "safety" ? "SAFETY CAR — PAUSED" : "LAP TIME"}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 64, fontWeight: 700, lineHeight: 1, color: racePhase === "pit" ? "#EAB308" : racePhase === "safety" ? "#EAB308" : "#fff", letterSpacing: 4 }}>
                    {racePhase === "pit" ? fmt(PIT_DURATION - pitTimer) : fmt(lapTime)}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", fontFamily: "var(--mono)", marginTop: 6 }}>SESSION {fmt(elapsed)}</div>
                  {racePhase === "racing" && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
                      {["S1", "S2", "S3"].map((s, i) => {
                        const c = sectors[i] === "purple" ? "#A855F7" : sectors[i] === "green" ? "#22C55E" : sectors[i] === "yellow" ? "#EAB308" : "#333";
                        return <div key={s} style={{ padding: "4px 24px", borderRadius: 2, fontSize: 11, fontWeight: 700, fontFamily: "var(--cond)", letterSpacing: 1, background: c, color: sectors[i] ? "#000" : "#666" }}>{s}</div>;
                      })}
                    </div>
                  )}
                </div>

                {radioMsg && <RadioMessage msg={radioMsg} type={radioType} />}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  <button onClick={pitStop} disabled={racePhase !== "racing"} style={{ background: racePhase === "pit" ? "#EAB30822" : "#111", border: `1px solid ${racePhase === "pit" ? "#EAB308" : "#333"}`, borderRadius: 4, padding: "12px 8px", color: "#fff", opacity: racePhase !== "racing" && racePhase !== "pit" ? 0.3 : 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>BOX BOX</div>
                    <div style={{ fontSize: 8, color: "#888", letterSpacing: 1, marginTop: 2 }}>5 MIN BREAK</div>
                  </button>
                  <button onClick={racePhase === "safety" ? restartFromSafety : deploySafety} style={{ background: racePhase === "safety" ? "#EAB30822" : "#111", border: `1px solid ${racePhase === "safety" ? "#EAB308" : "#333"}`, borderRadius: 4, padding: "12px 8px", color: "#fff" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{racePhase === "safety" ? "RESTART" : "SC"}</div>
                    <div style={{ fontSize: 8, color: "#888", letterSpacing: 1, marginTop: 2 }}>{racePhase === "safety" ? "GREEN FLAG" : "PAUSE"}</div>
                  </button>
                  <button onClick={toggleDRS} style={{ background: drsActive ? "#22C55E22" : "#111", border: `1px solid ${drsActive ? "#22C55E" : "#333"}`, borderRadius: 4, padding: "12px 8px", color: "#fff" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: drsActive ? "#22C55E" : "#fff" }}>DRS</div>
                    <div style={{ fontSize: 8, color: "#888", letterSpacing: 1, marginTop: 2 }}>DEEP FOCUS</div>
                  </button>
                  <button onClick={retireRace} style={{ background: "#111", border: "1px solid #333", borderRadius: 4, padding: "12px 8px", color: "#EF4444" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>RETIRE</div>
                    <div style={{ fontSize: 8, color: "#888", letterSpacing: 1, marginTop: 2 }}>DNF</div>
                  </button>
                </div>

                <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 9, color: "#E8002D", letterSpacing: 2, fontWeight: 600, marginBottom: 12, fontFamily: "var(--cond)" }}>LIVE TELEMETRY</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#666", letterSpacing: 1, fontFamily: "var(--cond)", marginBottom: 4 }}>FOCUS TRACE</div>
                      <MiniChart data={focusHistory} color="#E8002D" w={250} h={50} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: "#666", letterSpacing: 1, fontFamily: "var(--cond)", marginBottom: 4 }}>THROTTLE INPUT</div>
                      <MiniChart data={throttleHistory} color="#22C55E" w={250} h={50} />
                    </div>
                  </div>
                </div>

                {laps.length > 0 && (
                  <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 6, padding: 14 }}>
                    <div style={{ fontSize: 9, color: "#888", letterSpacing: 2, fontWeight: 600, marginBottom: 8, fontFamily: "var(--cond)" }}>LAP HISTORY</div>
                    {laps.map((l, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < laps.length - 1 ? "1px solid #1a1a1a" : "none", fontSize: 12 }}>
                        <span style={{ color: "#888", fontFamily: "var(--cond)" }}>LAP {i + 1}</span>
                        <span style={{ fontFamily: "var(--mono)", color: l === bestLap ? "#A855F7" : "#ccc", fontWeight: l === bestLap ? 700 : 400 }}>{fmtLap(l)} {l === bestLap && "FASTEST"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {(racePhase === "finished" || racePhase === "dnf") && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", animation: "fadeUp 0.5s ease" }}>
                <div style={{ fontSize: 64, fontWeight: 800, fontFamily: "var(--cond)", letterSpacing: 6, color: racePhase === "finished" ? "#FFD700" : "#EF4444", marginBottom: 8 }}>
                  {racePhase === "finished" ? "P1" : "DNF"}
                </div>
                <div style={{ fontSize: 18, color: "#888", fontFamily: "var(--cond)", letterSpacing: 3, marginBottom: 24 }}>
                  {racePhase === "finished" ? "RACE COMPLETE" : "DID NOT FINISH"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%", maxWidth: 400, marginBottom: 24 }}>
                  <StatCard label="SESSION" value={fmt(elapsed)} color="#fff" />
                  <StatCard label="AVG FOCUS" value={`${avgFocus}%`} color={avgFocus > 70 ? "#22C55E" : "#EAB308"} />
                  <StatCard label="VIOLATIONS" value={trackViolations} color={trackViolations > 3 ? "#EF4444" : "#22C55E"} />
                </div>
                {radioMsg && <RadioMessage msg={radioMsg} type={radioType} />}
                <button onClick={goToGarage} style={{ background: "#E8002D", color: "#fff", border: "none", padding: "14px 48px", borderRadius: 4, fontSize: 16, fontWeight: 700, letterSpacing: 4, marginTop: 16 }}>
                  RETURN TO GARAGE
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ background: "#0f0f0f", borderLeft: "1px solid #222", padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600 }}>THROTTLE</div>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--mono)", color: "#22C55E", lineHeight: 1 }}>{Math.round(throttle)}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600 }}>GEAR</div>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--mono)", color: "#fff", lineHeight: 1 }}>{currentGear}</div>
                </div>
              </div>
              <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, transition: "width 0.3s", width: `${throttle}%`, background: throttle > 60 ? "#22C55E" : throttle > 20 ? "#EAB308" : "#EF4444" }} />
              </div>
              <div style={{ fontSize: 9, color: "#555", marginTop: 6 }}>Mouse movement = throttle</div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <TireViz wear={tireWear} compound={compound} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600 }}>TIRE WEAR</div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1, color: tireWear > 60 ? "#22C55E" : tireWear > 30 ? "#EAB308" : "#EF4444" }}>{Math.round(tireWear)}%</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{compound.toUpperCase()} • {tireWear < 20 ? "CRITICAL" : tireWear < 40 ? "HIGH DEG" : "OK"}</div>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600 }}>ERS</span>
                  <span style={{ fontSize: 10, color: "#888", fontFamily: "var(--mono)" }}>{Math.round(ersLevel)}%</span>
                </div>
                <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 1s", width: `${ersLevel}%`, background: ersLevel > 60 ? "#22C55E" : ersLevel > 30 ? "#EAB308" : "#EF4444" }} />
                </div>
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 4 }}>FUEL (BATTERY)</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)", color: fuelLevel > 30 ? "#22C55E" : "#EF4444" }}>{fuelLevel}%</div>
              <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                <div style={{ height: "100%", width: `${fuelLevel}%`, background: fuelLevel > 30 ? "#22C55E" : "#EF4444", borderRadius: 2, transition: "width 5s" }} />
              </div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 4 }}>FOCUS SCORE</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1, color: avgFocus > 70 ? "#22C55E" : avgFocus > 40 ? "#EAB308" : "#EF4444" }}>
                {avgFocus || "—"}<span style={{ fontSize: 14, color: "#666" }}>%</span>
              </div>
              <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>Visible + active + not idle = 100%</div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 4 }}>TRACK VIOLATIONS</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1, color: trackViolations > 5 ? "#EF4444" : trackViolations > 2 ? "#EAB308" : "#22C55E" }}>{trackViolations}</div>
              <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>Tab switches = violations</div>
            </div>

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 4 }}>GEAR SHIFTS (KEYSTROKES)</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: "#0090FF" }}>{totalKeystrokes}</div>
            </div>

            <div style={{ background: idleSeconds > 20 ? "#EF444411" : "#111", border: `1px solid ${idleSeconds > 20 ? "#EF444444" : "#222"}`, borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: idleSeconds > 20 ? "#EF4444" : "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 4 }}>
                {idleSeconds > 20 ? "COASTING — NO INPUT!" : "DRIVER STATUS"}
              </div>
              <div style={{ fontSize: 12, color: idleSeconds > 10 ? "#EAB308" : "#22C55E", fontWeight: 600 }}>
                {idleSeconds > 30 ? "Idle — tires degrading fast!" : idleSeconds > 10 ? "Low activity" : "Active — full attack"}
              </div>
            </div>

            {drsActive && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 4, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#22C55E", fontFamily: "var(--cond)", letterSpacing: 4 }}>DRS ACTIVE</div>
                <div style={{ fontSize: 9, color: "#22C55E", letterSpacing: 1, marginTop: 2 }}>DEEP FOCUS ZONE</div>
              </div>
            )}

            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, fontFamily: "var(--cond)", fontWeight: 600, marginBottom: 4 }}>CHAMPIONSHIP PTS</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--mono)", color: "#E8002D" }}>{championship.points}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
