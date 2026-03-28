import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, CartesianGrid, ScatterChart, Scatter,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & THEME
   ═══════════════════════════════════════════════════════════════════════════ */

const API = "/api";

const COMPOUND_COLORS = {
  SOFT: "#FF1E1E",
  MEDIUM: "#FFDD00",
  HARD: "#FFFFFF",
  INTERMEDIATE: "#00E550",
  WET: "#007BFF",
  UNKNOWN: "#888",
};

const TEAM_COLORS = {
  "Red Bull Racing": "#3671C6",
  "Red Bull": "#3671C6",
  Mercedes: "#27F4D2",
  Ferrari: "#E80020",
  McLaren: "#FF8000",
  "Aston Martin": "#229971",
  Alpine: "#FF87BC",
  Williams: "#64C4FF",
  AlphaTauri: "#6692FF",
  "RB": "#6692FF",
  "Kick Sauber": "#52E252",
  "Alfa Romeo": "#C92D4B",
  Haas: "#B6BABD",
  "Haas F1 Team": "#B6BABD",
};

const DRIVER_COLORS = [
  "#FF1E1E", "#00E5FF", "#FFDD00", "#FF6B35", "#00E550",
  "#FF87BC", "#64C4FF", "#B6BABD", "#9B59B6", "#E67E22",
];

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0b",
    color: "#fff",
    fontFamily: "'Outfit', sans-serif",
  },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  header: {
    padding: "16px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky",
    top: 0,
    background: "rgba(10,10,11,0.95)",
    backdropFilter: "blur(12px)",
    zIndex: 100,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,30,30,0.08)",
    border: "1px solid rgba(255,30,30,0.2)",
    borderRadius: "20px",
    padding: "5px 12px",
    fontSize: "10px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: "#FF1E1E",
  },
  card: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "16px",
    transition: "all 0.2s ease",
  },
  cardHover: {
    background: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,30,30,0.2)",
  },
  label: {
    fontSize: "10px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: "6px",
  },
  tabBar: {
    display: "flex",
    gap: "2px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "8px",
    padding: "3px",
    marginBottom: "20px",
  },
  tab: (active) => ({
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: active ? "700" : "500",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    background: active ? "rgba(255,30,30,0.15)" : "transparent",
    color: active ? "#FF1E1E" : "rgba(255,255,255,0.45)",
    transition: "all 0.2s",
  }),
  select: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#fff",
    padding: "8px 12px",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
    outline: "none",
  },
  loadingBar: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "2px",
    background: "linear-gradient(90deg, #FF1E1E, #FF6B35, #FF1E1E)",
    zIndex: 200,
    animation: "loadbar 1.5s ease infinite",
  },
};


/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingBar({ show }) {
  if (!show) return null;
  return <div style={{ ...styles.loadingBar, width: "100%" }} />;
}

function LoadingState({ message }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.08)",
        borderTopColor: "#FF1E1E",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ ...styles.mono, fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>
        {message || "LOADING DATA..."}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
      <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          ...styles.mono, background: "rgba(255,30,30,0.1)", border: "1px solid rgba(255,30,30,0.3)",
          color: "#FF1E1E", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontSize: "11px",
          letterSpacing: "1px", textTransform: "uppercase",
        }}>
          Retry
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value, accent, small }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{
        fontSize: small ? "16px" : "20px",
        fontWeight: "700",
        color: accent || "#fff",
        ...styles.mono,
      }}>{value ?? "—"}</div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   DATA FETCHING HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, retry: fetchData };
}


/* ═══════════════════════════════════════════════════════════════════════════
   SEASON CALENDAR VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

function SeasonCalendar({ year, onSelectRace }) {
  const { data, loading, error, retry } = useFetch(`${API}/season/${year}/schedule`);

  if (loading) return <LoadingState message="LOADING CALENDAR..." />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const events = data?.events?.filter((e) => e.round > 0) || [];

  return (
    <div>
      <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "4px" }}>
        {year} Season Calendar
      </h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "24px" }}>
        {events.length} races · Click any race to explore
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {events.map((event) => {
          const date = event.date ? new Date(event.date) : null;
          return (
            <button
              key={event.round}
              onClick={() => onSelectRace(event.round, event.name)}
              style={{
                ...styles.card,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                gap: "14px",
                alignItems: "center",
              }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: styles.card.background, borderColor: styles.card.border })}
            >
              <div style={{
                width: "40px", height: "40px", borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(255,30,30,0.15), rgba(255,107,53,0.1))",
                display: "flex", alignItems: "center", justifyContent: "center",
                ...styles.mono, fontWeight: "800", fontSize: "14px", color: "#FF1E1E",
                flexShrink: 0,
              }}>
                R{event.round}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: "14px", fontWeight: "600", color: "#fff",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{event.name}</div>
                <div style={{ ...styles.mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                  {event.country} · {date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                  {event.format === "sprint_shootout" || event.format === "sprint_qualifying" ? " · SPRINT" : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   RACE RESULTS TABLE
   ═══════════════════════════════════════════════════════════════════════════ */

function RaceResults({ year, round }) {
  const { data, loading, error, retry } = useFetch(`${API}/season/${year}/race/${round}/results`);

  if (loading) return <LoadingState message="LOADING RESULTS..." />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const results = data?.results || [];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {["POS", "DRIVER", "TEAM", "TIME", "POINTS", "STATUS"].map((h) => (
              <th key={h} style={{ ...styles.label, textAlign: "left", padding: "8px 10px", fontSize: "9px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const teamColor = TEAM_COLORS[r.TeamName] || "#888";
            return (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px", ...styles.mono, fontWeight: "700", color: i < 3 ? "#FF1E1E" : "#fff" }}>
                  P{r.Position ?? "—"}
                </td>
                <td style={{ padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "3px", height: "20px", borderRadius: "2px", background: teamColor }} />
                    <div>
                      <span style={{ fontWeight: "600" }}>{r.FirstName} </span>
                      <span style={{ fontWeight: "800", textTransform: "uppercase" }}>{r.LastName}</span>
                      <span style={{ ...styles.mono, fontSize: "10px", color: "rgba(255,255,255,0.4)", marginLeft: "6px" }}>{r.Abbreviation}</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px", color: teamColor, fontSize: "12px", fontWeight: "600" }}>{r.TeamName}</td>
                <td style={{ padding: "10px", ...styles.mono, fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{r.Time ?? "—"}</td>
                <td style={{ padding: "10px", ...styles.mono, fontWeight: "700", color: r.Points > 0 ? "#FFDD00" : "rgba(255,255,255,0.3)" }}>
                  {r.Points ?? 0}
                </td>
                <td style={{ padding: "10px", ...styles.mono, fontSize: "11px", color: r.Status === "Finished" ? "rgba(255,255,255,0.4)" : "#FF6B35" }}>
                  {r.Status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUALIFYING RESULTS
   ═══════════════════════════════════════════════════════════════════════════ */

function QualifyingResults({ year, round }) {
  const { data, loading, error, retry } = useFetch(`${API}/season/${year}/race/${round}/qualifying`);

  if (loading) return <LoadingState message="LOADING QUALIFYING..." />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const results = data?.results || [];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {["POS", "DRIVER", "TEAM", "Q1", "Q2", "Q3"].map((h) => (
              <th key={h} style={{ ...styles.label, textAlign: "left", padding: "8px 10px", fontSize: "9px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const teamColor = TEAM_COLORS[r.TeamName] || "#888";
            return (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px", ...styles.mono, fontWeight: "700", color: i === 0 ? "#FF1E1E" : "#fff" }}>
                  P{r.Position ?? "—"}
                </td>
                <td style={{ padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "3px", height: "20px", borderRadius: "2px", background: teamColor }} />
                    <span style={{ fontWeight: "700" }}>{r.Abbreviation}</span>
                  </div>
                </td>
                <td style={{ padding: "10px", color: teamColor, fontSize: "12px" }}>{r.TeamName}</td>
                <td style={{ padding: "10px", ...styles.mono, fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{r.Q1 ?? "—"}</td>
                <td style={{ padding: "10px", ...styles.mono, fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{r.Q2 ?? "—"}</td>
                <td style={{ padding: "10px", ...styles.mono, fontSize: "12px", color: r.Q3 ? "#FFDD00" : "rgba(255,255,255,0.3)" }}>
                  {r.Q3 ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TIRE STRATEGY VISUALIZATION
   ═══════════════════════════════════════════════════════════════════════════ */

function TireStrategy({ year, round }) {
  const { data, loading, error, retry } = useFetch(`${API}/season/${year}/race/${round}/tire-strategy`);

  if (loading) return <LoadingState message="LOADING STRATEGY..." />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const strategy = data?.strategy || [];
  const totalLaps = data?.total_laps || 60;

  return (
    <div>
      <div style={{ ...styles.label, marginBottom: "16px" }}>
        Tire Strategy · {totalLaps} Laps
      </div>

      {strategy.slice(0, 20).map((drv, idx) => (
        <div key={idx} style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "4px",
          padding: "6px 0",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
        }}>
          <div style={{ width: "28px", ...styles.mono, fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
            P{drv.position}
          </div>
          <div style={{
            width: "40px", ...styles.mono, fontSize: "12px", fontWeight: "700",
            color: TEAM_COLORS[drv.team] || "#fff",
          }}>
            {drv.driver}
          </div>
          <div style={{ flex: 1, display: "flex", height: "22px", borderRadius: "4px", overflow: "hidden", gap: "1px" }}>
            {drv.stints.map((stint, si) => {
              const width = ((stint.end_lap - stint.start_lap + 1) / totalLaps) * 100;
              const color = COMPOUND_COLORS[stint.compound] || COMPOUND_COLORS.UNKNOWN;
              return (
                <div
                  key={si}
                  title={`${stint.compound} · Laps ${stint.start_lap}-${stint.end_lap} (${stint.laps} laps)`}
                  style={{
                    width: `${width}%`,
                    background: color,
                    opacity: stint.compound === "HARD" ? 0.5 : 0.85,
                    borderRadius: si === 0 ? "4px 0 0 4px" : si === drv.stints.length - 1 ? "0 4px 4px 0" : "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    fontWeight: "700",
                    color: stint.compound === "HARD" ? "#000" : (stint.compound === "MEDIUM" ? "#000" : "#fff"),
                    ...styles.mono,
                    letterSpacing: "0.5px",
                    overflow: "hidden",
                    cursor: "default",
                  }}
                >
                  {stint.laps > 5 ? stint.compound?.charAt(0) : ""}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {Object.entries(COMPOUND_COLORS).filter(([k]) => k !== "UNKNOWN").map(([name, color]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: color, opacity: name === "HARD" ? 0.5 : 0.85 }} />
            <span style={{ ...styles.mono, fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px" }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TELEMETRY CHART
   ═══════════════════════════════════════════════════════════════════════════ */

function TelemetryView({ year, round }) {
  const [drivers, setDrivers] = useState("VER,HAM");
  const [session, setSession] = useState("R");
  const [fetchUrl, setFetchUrl] = useState(null);
  const { data, loading, error, retry } = useFetch(fetchUrl);

  const handleLoad = () => {
    setFetchUrl(`${API}/season/${year}/race/${round}/telemetry?drivers=${drivers}&session_type=${session}`);
  };

  useEffect(() => { handleLoad(); }, []);

  const chartData = [];
  if (data?.telemetry) {
    const maxLen = Math.max(...data.telemetry.map((t) => t.data.distance.length));
    for (let i = 0; i < maxLen; i++) {
      const point = {};
      data.telemetry.forEach((t) => {
        if (i < t.data.distance.length) {
          point.distance = t.data.distance[i];
          point[`speed_${t.driver}`] = t.data.speed[i];
          point[`throttle_${t.driver}`] = t.data.throttle[i];
          point[`brake_${t.driver}`] = t.data.brake[i];
          point[`gear_${t.driver}`] = t.data.gear[i];
        }
      });
      chartData.push(point);
    }
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={{ ...styles.label, marginBottom: "4px" }}>Drivers (comma separated)</div>
          <input
            value={drivers}
            onChange={(e) => setDrivers(e.target.value)}
            style={{
              ...styles.select, width: "200px",
              background: "rgba(255,255,255,0.05)",
            }}
            placeholder="VER,HAM,LEC"
          />
        </div>
        <div>
          <div style={{ ...styles.label, marginBottom: "4px" }}>Session</div>
          <select value={session} onChange={(e) => setSession(e.target.value)} style={styles.select}>
            <option value="R">Race</option>
            <option value="Q">Qualifying</option>
            <option value="FP1">FP1</option>
            <option value="FP2">FP2</option>
            <option value="FP3">FP3</option>
          </select>
        </div>
        <button onClick={handleLoad} style={{
          ...styles.mono, padding: "8px 20px", borderRadius: "6px",
          background: "linear-gradient(135deg, #FF1E1E, #FF6B35)",
          border: "none", color: "#fff", cursor: "pointer", fontWeight: "700",
          fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase",
        }}>
          Load Telemetry
        </button>
      </div>

      {loading && <LoadingState message="LOADING TELEMETRY... (this may take a moment)" />}
      {error && <ErrorState message={error} onRetry={retry} />}

      {data?.telemetry && !loading && (
        <div>
          {/* Driver lap times */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            {data.telemetry.map((t, i) => (
              <div key={t.driver} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "12px", height: "3px", borderRadius: "2px", background: DRIVER_COLORS[i] }} />
                <span style={{ ...styles.mono, fontSize: "12px", fontWeight: "700" }}>{t.driver}</span>
                <span style={{ ...styles.mono, fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{t.lap_time}</span>
                {t.compound && (
                  <div style={{
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: COMPOUND_COLORS[t.compound] || "#888",
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Speed trace */}
          <div style={{ ...styles.label, marginBottom: "8px" }}>Speed (km/h)</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="distance" tick={false} stroke="rgba(255,255,255,0.1)" />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip
                contentStyle={{ background: "#1a1a1d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: "11px" }}
                labelStyle={{ color: "rgba(255,255,255,0.4)" }}
              />
              {data.telemetry.map((t, i) => (
                <Line
                  key={t.driver}
                  type="monotone"
                  dataKey={`speed_${t.driver}`}
                  stroke={DRIVER_COLORS[i]}
                  dot={false}
                  strokeWidth={1.5}
                  name={t.driver}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Throttle trace */}
          <div style={{ ...styles.label, marginTop: "20px", marginBottom: "8px" }}>Throttle %</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="distance" tick={false} stroke="rgba(255,255,255,0.1)" />
              <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              {data.telemetry.map((t, i) => (
                <Line key={t.driver} type="monotone" dataKey={`throttle_${t.driver}`} stroke={DRIVER_COLORS[i]} dot={false} strokeWidth={1.5} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Gear trace */}
          <div style={{ ...styles.label, marginTop: "20px", marginBottom: "8px" }}>Gear</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <XAxis dataKey="distance" tick={false} stroke="rgba(255,255,255,0.1)" />
              <YAxis domain={[0, 8]} ticks={[1, 2, 3, 4, 5, 6, 7, 8]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              {data.telemetry.map((t, i) => (
                <Line key={t.driver} type="stepAfter" dataKey={`gear_${t.driver}`} stroke={DRIVER_COLORS[i]} dot={false} strokeWidth={1.5} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   LAP TIMES CHART
   ═══════════════════════════════════════════════════════════════════════════ */

function LapTimesView({ year, round }) {
  const [driver, setDriver] = useState("");
  const { data, loading, error } = useFetch(`${API}/season/${year}/race/${round}/results`);
  const lapUrl = driver ? `${API}/season/${year}/race/${round}/laps?driver=${driver}` : null;
  const { data: lapData, loading: lapLoading } = useFetch(lapUrl);

  const results = data?.results || [];

  useEffect(() => {
    if (results.length > 0 && !driver) {
      setDriver(results[0]?.Abbreviation || "");
    }
  }, [results]);

  const chartLaps = (lapData?.laps || [])
    .filter((l) => l.LapTime)
    .map((l) => {
      const parts = l.LapTime.match(/(\d+):(\d+\.\d+)/);
      const seconds = parts ? parseFloat(parts[1]) * 60 + parseFloat(parts[2]) : null;
      return {
        lap: l.LapNumber,
        time: seconds,
        timeStr: l.LapTime,
        compound: l.Compound,
        position: l.Position,
        stint: l.Stint,
      };
    })
    .filter((l) => l.time && l.time < 300);

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "flex-end" }}>
        <div>
          <div style={{ ...styles.label, marginBottom: "4px" }}>Driver</div>
          <select value={driver} onChange={(e) => setDriver(e.target.value)} style={styles.select}>
            {results.map((r) => (
              <option key={r.Abbreviation} value={r.Abbreviation}>
                {r.Abbreviation} — {r.FirstName} {r.LastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {lapLoading && <LoadingState message="LOADING LAP TIMES..." />}

      {chartLaps.length > 0 && !lapLoading && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartLaps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="lap" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" label={{ value: "Lap", fill: "rgba(255,255,255,0.3)", fontSize: 10, position: "bottom" }} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
            <Tooltip
              contentStyle={{ background: "#1a1a1d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontSize: "11px" }}
              formatter={(val, name, props) => [`${props.payload.timeStr}`, `Lap ${props.payload.lap}`]}
              labelFormatter={() => ""}
            />
            <Line
              type="monotone"
              dataKey="time"
              stroke="#FF1E1E"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const color = COMPOUND_COLORS[payload.compound] || "#888";
                return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
              }}
              strokeWidth={1.5}
              activeDot={{ r: 5, stroke: "#FF1E1E", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   STANDINGS VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

function StandingsView({ year }) {
  const [tab, setTab] = useState("drivers");
  const {
    data: driverData,
    loading: dLoad,
    error: dError,
    retry: retryDrivers,
  } = useFetch(`${API}/season/${year}/driver-standings`);
  const {
    data: constData,
    loading: cLoad,
    error: cError,
    retry: retryConstructors,
  } = useFetch(`${API}/season/${year}/constructor-standings`);

  const loading = tab === "drivers" ? dLoad : cLoad;
  const error = tab === "drivers" ? dError : cError;
  const retry = tab === "drivers" ? retryDrivers : retryConstructors;
  const standings = tab === "drivers" ? (driverData?.standings || []) : (constData?.standings || []);
  const normalizedStandings = standings.map((entry) => {
    const points = Number(entry.points ?? entry.Points ?? 0);
    const position = entry.position ?? entry.Position ?? entry.positionText ?? entry.PositionText ?? "—";

    if (tab === "drivers") {
      const driver = entry.Driver || {};
      const constructors = Array.isArray(entry.Constructors) ? entry.Constructors : [];
      const driverName = entry.DriverName
        || `${entry.givenName ?? entry.GivenName ?? driver.givenName ?? driver.GivenName ?? ""} ${entry.familyName ?? entry.FamilyName ?? driver.familyName ?? driver.FamilyName ?? ""}`.trim();
      const teamNames = entry.ConstructorNames
        || entry.constructorNames
        || entry.ConstructorName
        || entry.constructorName
        || constructors.map((constructor) => constructor.name || constructor.Name).filter(Boolean).join(", ");

      return {
        position,
        points,
        name: driverName,
        team: teamNames,
      };
    }

    const constructor = entry.Constructor || {};

    return {
      position,
      points,
      name: entry.ConstructorName || entry.constructorName || constructor.name || constructor.Name || "",
    };
  });

  const maxPoints = normalizedStandings.length > 0
    ? Math.max(...normalizedStandings.map((s) => s.points || 0))
    : 1;

  return (
    <div>
      <div style={styles.tabBar}>
        <button style={styles.tab(tab === "drivers")} onClick={() => setTab("drivers")}>Drivers</button>
        <button style={styles.tab(tab === "constructors")} onClick={() => setTab("constructors")}>Constructors</button>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={retry} />}

      {!loading && !error && normalizedStandings.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ width: "28px", ...styles.mono, fontSize: "14px", fontWeight: "800", color: i < 3 ? "#FF1E1E" : "rgba(255,255,255,0.5)", textAlign: "right" }}>
            {s.position}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: "700", fontSize: "14px" }}>{s.name || "—"}</div>
            {tab === "drivers" && (
              <div style={{ ...styles.mono, fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                {s.team}
              </div>
            )}
          </div>
          <div style={{ width: "200px", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              flex: 1, height: "6px", borderRadius: "3px",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${((s.points || 0) / maxPoints) * 100}%`,
                height: "100%",
                borderRadius: "3px",
                background: i === 0 ? "linear-gradient(90deg, #FF1E1E, #FF6B35)" : "rgba(255,255,255,0.2)",
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ ...styles.mono, fontSize: "13px", fontWeight: "700", width: "45px", textAlign: "right" }}>
              {s.points}
            </div>
          </div>
        </div>
      ))}

      {!loading && !error && normalizedStandings.length === 0 && (
        <ErrorState message={`No ${tab} standings returned for ${year}.`} onRetry={retry} />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   RACE DETAIL VIEW (with tabs)
   ═══════════════════════════════════════════════════════════════════════════ */

function RaceDetail({ year, round, eventName, onBack }) {
  const [tab, setTab] = useState("results");

  return (
    <div>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "rgba(255,255,255,0.5)",
        cursor: "pointer", fontSize: "13px", marginBottom: "12px",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        ← Back to Calendar
      </button>

      <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "4px" }}>{eventName}</h2>
      <p style={{ ...styles.mono, fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
        ROUND {round} · {year} SEASON
      </p>

      <div style={styles.tabBar}>
        {[
          ["results", "Race Results"],
          ["qualifying", "Qualifying"],
          ["strategy", "Tire Strategy"],
          ["laptimes", "Lap Times"],
          ["telemetry", "Telemetry"],
        ].map(([key, label]) => (
          <button key={key} style={styles.tab(tab === key)} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "results" && <RaceResults year={year} round={round} />}
      {tab === "qualifying" && <QualifyingResults year={year} round={round} />}
      {tab === "strategy" && <TireStrategy year={year} round={round} />}
      {tab === "laptimes" && <LapTimesView year={year} round={round} />}
      {tab === "telemetry" && <TelemetryView year={year} round={round} />}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════════ */

export default function App() {
  const [year, setYear] = useState(2024);
  const [view, setView] = useState("calendar"); // calendar | race | standings
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedEventName, setSelectedEventName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectRace = (round, name) => {
    setSelectedRace(round);
    setSelectedEventName(name);
    setView("race");
  };

  return (
    <div style={styles.app}>
      <LoadingBar show={loading} />

      {/* Background effects */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }} />
      <div style={{
        position: "fixed", top: "-300px", right: "-200px",
        width: "700px", height: "700px",
        background: "radial-gradient(circle, rgba(255,30,30,0.04) 0%, transparent 70%)",
        zIndex: 0, pointerEvents: "none",
      }} />

      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "7px",
            background: "linear-gradient(135deg, #FF1E1E, #FF6B35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: "900", ...styles.mono,
          }}>F1</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.3px" }}>
              GRID WALK
            </h1>
            <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", ...styles.mono }}>
              Circuit Explorer
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => { setYear(parseInt(e.target.value)); setView("calendar"); }}
            style={styles.select}
          >
            {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: "2px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "2px" }}>
            <button
              onClick={() => setView("calendar")}
              style={styles.tab(view === "calendar" || view === "race")}
            >
              Races
            </button>
            <button
              onClick={() => setView("standings")}
              style={styles.tab(view === "standings")}
            >
              Standings
            </button>
          </div>

          <div style={styles.badge}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#FF1E1E", animation: "pulse 2s infinite" }} />
            {year} Season
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 1, padding: "24px 32px", maxWidth: "1200px", margin: "0 auto" }}>
        {view === "calendar" && (
          <SeasonCalendar year={year} onSelectRace={handleSelectRace} />
        )}
        {view === "race" && selectedRace && (
          <RaceDetail
            year={year}
            round={selectedRace}
            eventName={selectedEventName}
            onBack={() => setView("calendar")}
          />
        )}
        {view === "standings" && (
          <StandingsView year={year} />
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes loadbar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #0a0a0b; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::selection { background: rgba(255,30,30,0.3); }
        select option { background: #1a1a1d; color: #fff; }
        input { color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
