# 🏎️ Grid Walk — F1 Circuit Explorer

A full-stack F1 data explorer powered by **FastF1** + **FastAPI** + **React**. Browse every season, dive into race results, tire strategies, telemetry comparisons, lap times, and championship standings — all with a broadcast-quality dark UI.

---

## ⚡ Quick Start

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
