# 🏎️ Grid Walk — F1 Circuit Explorer

A full-stack F1 data explorer powered by **FastF1** + **FastAPI** + **React**. Browse every season, dive into race results, tire strategies, telemetry comparisons, lap times, and championship standings — all with a broadcast-quality dark UI.

---

## ⚡ Quick Start (2 minutes)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs on `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

> **Note:** First requests for each session will be slow (FastF1 downloads + caches data). Subsequent requests are instant.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`. API calls proxy to the backend automatically.

---

## 🏗️ Architecture

```
gridwalk/
├── backend/
│   ├── main.py              # FastAPI server with all endpoints
│   ├── requirements.txt
│   └── .cache/              # FastF1 data cache (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with all views
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   ├── vite.config.js       # Dev server + API proxy
│   └── package.json
└── README.md
```

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/season/{year}/schedule` | Full race calendar |
| `GET /api/season/{year}/driver-standings` | Driver championship |
| `GET /api/season/{year}/constructor-standings` | Constructor championship |
| `GET /api/season/{year}/race/{round}/results` | Race finishing order |
| `GET /api/season/{year}/race/{round}/qualifying` | Qualifying results |
| `GET /api/season/{year}/race/{round}/laps?driver=VER` | Lap-by-lap data |
| `GET /api/season/{year}/race/{round}/tire-strategy` | Tire stints for all drivers |
| `GET /api/season/{year}/race/{round}/telemetry?drivers=VER,HAM&session_type=Q` | Speed/throttle/brake/gear traces |
| `GET /api/season/{year}/race/{round}/weather` | Weather during session |
| `GET /api/season/{year}/race/{round}/pit-stops` | Pit stop times |
| `GET /api/season/{year}/race/{round}/circuit` | Circuit corner/sector data |

---

## 🏁 5-HOUR HACKATHON SPRINT PLAN

### Person 1 — Backend Powerups (Hours 1-4)
- [ ] Add endpoint: `/api/season/{year}/race/{round}/fastest-laps` — fastest lap per driver
- [ ] Add endpoint: `/api/season/{year}/race/{round}/positions` — position changes lap by lap
- [ ] Add endpoint: `/api/season/{year}/race/{round}/head-to-head?d1=VER&d2=HAM` — direct comparison
- [ ] Add a pre-cache script (`cache_season.py`) that loads all sessions for a season in background
- [ ] Add sprint race support (session_type="Sprint")
- [ ] Error handling + fallbacks for missing data

### Person 2 — Frontend Core Features (Hours 1-4)
- [ ] Position change chart (Recharts bump chart showing position per lap)
- [ ] Fastest lap leaderboard component
- [ ] Weather conditions display with icons (rain, sun, cloud)
- [ ] Pit stop timeline with duration bars
- [ ] Head-to-head driver comparison page
- [ ] Mobile responsive layout

### Person 3 — Visual Polish & Theme (Hours 1-5)
- [ ] Landing page with "lights out" animation (5 red lights → go)
- [ ] Page transitions and loading animations
- [ ] Circuit SVG map on race detail page (from circuit endpoint corner data)
- [ ] Team color accents throughout all tables and charts
- [ ] F1 TV broadcast-style timing tower component
- [ ] Sound effects (optional but judges love it)
- [ ] Favicon + Open Graph meta tags

### Person 4 — Wow Features (Hours 2-5)
- [ ] Track map visualization using corner coordinates from `/circuit` endpoint
- [ ] "Race Replay" — animated position chart that plays through the race
- [ ] Season comparison view (compare 2 seasons side by side)
- [ ] Driver career stats across seasons
- [ ] Export data as PNG (html2canvas) for sharing
- [ ] Dark/light theme toggle (dark default)

### Final Hour — Everyone
- [ ] Bug fixes and polish
- [ ] Test all views with 2023 + 2024 data
- [ ] Record demo video
- [ ] Deploy (Vercel frontend + Railway/Render backend)

---

## 🎨 Theme Tips (for "Best Theme" track)

The UI is designed around the F1 TV broadcast aesthetic:
- **Colors**: Deep black (#0a0a0b), F1 Red (#FF1E1E), accent orange (#FF6B35)
- **Typography**: Outfit (display) + JetBrains Mono (data/stats)
- **Tire compounds**: Soft=Red, Medium=Yellow, Hard=White, Inter=Green, Wet=Blue
- **Team colors**: Already mapped in `TEAM_COLORS` constant

Keep everything consistent with these. Judges should open it and immediately *feel* F1.

---

## 💡 Pro Tips

1. **Cache aggressively**: First FastF1 load for a session takes 10-30s. The `.cache` folder makes subsequent loads instant. Run `cache_season.py` (TODO) in background while building.

2. **2024 season has the most complete data**. Start there for demos.

3. **Telemetry is the showstopper**: The speed trace comparison is what makes judges go "wow." Make sure it loads smoothly for your demo.

4. **FastF1 rate limits**: Don't hammer the F1 API. Cache everything. If you hit errors, wait a few seconds and retry.
