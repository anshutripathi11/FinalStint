"""
Grid Walk — F1 Circuit Explorer Backend
FastAPI + FastF1 + Ergast
"""

import os
import json
import logging
from datetime import timedelta
from typing import Optional

import fastf1
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastf1 import ergast

# ── Setup ────────────────────────────────────────────────────────────────────
CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gridwalk")

app = FastAPI(title="Grid Walk API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

erg = ergast.Ergast()


# ── Helpers ──────────────────────────────────────────────────────────────────
def safe_json(obj):
    """Convert pandas/numpy objects to JSON-safe Python types."""
    if isinstance(obj, pd.DataFrame):
        return json.loads(obj.to_json(orient="records", date_format="iso"))
    if isinstance(obj, pd.Series):
        return json.loads(obj.to_json(date_format="iso"))
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat() if not pd.isna(obj) else None
    if isinstance(obj, pd.Timedelta):
        return str(obj) if not pd.isna(obj) else None
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj) if not np.isnan(obj) else None
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


def timedelta_to_str(td):
    """Convert Timedelta to readable string like '1:23.456'."""
    if pd.isna(td):
        return None
    total_seconds = td.total_seconds()
    if total_seconds <= 0:
        return None
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    if minutes > 0:
        return f"{minutes}:{seconds:06.3f}"
    return f"{seconds:.3f}"


def clean_results(df):
    """Clean a results DataFrame for JSON output."""
    rows = []
    for _, row in df.iterrows():
        clean = {}
        for col in df.columns:
            val = row[col]
            if isinstance(val, pd.Timedelta):
                clean[col] = timedelta_to_str(val)
            elif isinstance(val, pd.Timestamp):
                clean[col] = val.isoformat() if not pd.isna(val) else None
            elif isinstance(val, (dict, list, tuple)):
                clean[col] = safe_json(val)
            elif isinstance(val, (np.integer,)):
                clean[col] = int(val)
            elif isinstance(val, (np.floating,)):
                clean[col] = None if np.isnan(val) else round(float(val), 3)
            elif isinstance(val, (np.bool_,)):
                clean[col] = bool(val)
            elif val is None:
                clean[col] = None
            elif pd.isna(val):
                clean[col] = None
            else:
                clean[col] = val
        rows.append(clean)
    return rows


# ══════════════════════════════════════════════════════════════════════════════
#  SEASON-LEVEL ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/seasons")
def get_available_seasons():
    """Return list of available F1 seasons (1950-current)."""
    return {"seasons": list(range(2018, 2026))}


@app.get("/api/season/{year}/schedule")
def get_season_schedule(year: int):
    """Full race calendar for a season."""
    try:
        schedule = fastf1.get_event_schedule(year)
        events = []
        for _, event in schedule.iterrows():
            events.append({
                "round": safe_json(event.get("RoundNumber")),
                "name": safe_json(event.get("EventName")),
                "country": safe_json(event.get("Country")),
                "location": safe_json(event.get("Location")),
                "date": safe_json(event.get("EventDate")),
                "format": safe_json(event.get("EventFormat")),
                "f1_api_support": safe_json(event.get("F1ApiSupport", True)),
            })
        return {"year": year, "events": events}
    except Exception as e:
        logger.error(f"Schedule error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/driver-standings")
def get_driver_standings(year: int):
    """Driver championship standings."""
    try:
        result = erg.get_driver_standings(season=year)
        df = result.content[0]
        return {"year": year, "standings": clean_results(df)}
    except Exception as e:
        logger.error(f"Driver standings error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/constructor-standings")
def get_constructor_standings(year: int):
    """Constructor championship standings."""
    try:
        result = erg.get_constructor_standings(season=year)
        df = result.content[0]
        return {"year": year, "standings": clean_results(df)}
    except Exception as e:
        logger.error(f"Constructor standings error: {e}")
        raise HTTPException(500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
#  RACE-LEVEL ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/season/{year}/race/{round_num}/results")
def get_race_results(year: int, round_num: int):
    """Race finishing results."""
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(
            telemetry=False, weather=False, messages=False, laps=False
        )
        results = session.results
        return {
            "year": year,
            "round": round_num,
            "event": session.event["EventName"],
            "results": clean_results(results),
        }
    except Exception as e:
        logger.error(f"Race results error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/qualifying")
def get_qualifying_results(year: int, round_num: int):
    """Qualifying session results."""
    try:
        session = fastf1.get_session(year, round_num, "Q")
        session.load(
            telemetry=False, weather=False, messages=False, laps=False
        )
        results = session.results
        return {
            "year": year,
            "round": round_num,
            "event": session.event["EventName"],
            "results": clean_results(results),
        }
    except Exception as e:
        logger.error(f"Qualifying error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/laps")
def get_lap_times(
    year: int,
    round_num: int,
    driver: Optional[str] = Query(None, description="Driver abbreviation e.g. VER"),
):
    """Lap times for a race. Optionally filter by driver."""
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(telemetry=False, weather=False, messages=False)
        laps = session.laps

        if driver:
            laps = laps.pick_driver(driver)

        # Select key columns
        cols = [
            "Driver", "DriverNumber", "Team", "LapNumber", "LapTime",
            "Sector1Time", "Sector2Time", "Sector3Time",
            "Compound", "TyreLife", "Stint",
            "IsPersonalBest", "Position",
        ]
        available = [c for c in cols if c in laps.columns]
        return {
            "year": year,
            "round": round_num,
            "event": session.event["EventName"],
            "laps": clean_results(laps[available]),
        }
    except Exception as e:
        logger.error(f"Lap times error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/tire-strategy")
def get_tire_strategy(year: int, round_num: int):
    """Tire strategy stints for all drivers in a race."""
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(telemetry=False, weather=False, messages=False)
        laps = session.laps

        drivers = session.results.sort_values("Position")
        strategy = []
        for _, drv in drivers.iterrows():
            drv_laps = laps.pick_driver(drv["Abbreviation"])
            if drv_laps.empty:
                continue

            stints = []
            for stint_num in drv_laps["Stint"].unique():
                stint_laps = drv_laps[drv_laps["Stint"] == stint_num]
                if stint_laps.empty:
                    continue
                stints.append({
                    "stint": int(stint_num),
                    "compound": stint_laps["Compound"].iloc[0],
                    "start_lap": int(stint_laps["LapNumber"].min()),
                    "end_lap": int(stint_laps["LapNumber"].max()),
                    "tyre_life": int(stint_laps["TyreLife"].max()) if "TyreLife" in stint_laps else None,
                    "laps": int(len(stint_laps)),
                })

            strategy.append({
                "driver": drv["Abbreviation"],
                "driver_name": f'{drv.get("FirstName", "")} {drv.get("LastName", "")}',
                "team": drv.get("TeamName", ""),
                "position": safe_json(drv.get("Position")),
                "stints": stints,
            })

        return {
            "year": year,
            "round": round_num,
            "event": session.event["EventName"],
            "total_laps": int(session.total_laps) if session.total_laps else None,
            "strategy": strategy,
        }
    except Exception as e:
        logger.error(f"Tire strategy error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/telemetry")
def get_telemetry(
    year: int,
    round_num: int,
    drivers: str = Query(..., description="Comma-separated driver abbreviations e.g. VER,HAM"),
    session_type: str = Query("R", description="Session: R, Q, FP1, FP2, FP3"),
):
    """Speed telemetry for fastest laps of specified drivers."""
    try:
        session = fastf1.get_session(year, round_num, session_type)
        session.load(weather=False, messages=False)

        driver_list = [d.strip() for d in drivers.split(",")]
        telemetry_data = []

        for drv in driver_list:
            try:
                drv_laps = session.laps.pick_driver(drv)
                fastest = drv_laps.pick_fastest()
                if fastest is None:
                    continue
                tel = fastest.get_telemetry()

                # Downsample for performance (every 4th point)
                tel_sampled = tel.iloc[::4]

                telemetry_data.append({
                    "driver": drv,
                    "lap_time": timedelta_to_str(fastest["LapTime"]),
                    "compound": fastest.get("Compound", None),
                    "data": {
                        "distance": tel_sampled["Distance"].round(1).tolist(),
                        "speed": tel_sampled["Speed"].round(1).tolist(),
                        "throttle": tel_sampled["Throttle"].round(1).tolist() if "Throttle" in tel_sampled else [],
                        "brake": tel_sampled["Brake"].astype(int).tolist() if "Brake" in tel_sampled else [],
                        "gear": tel_sampled["nGear"].tolist() if "nGear" in tel_sampled else [],
                        "drs": tel_sampled["DRS"].tolist() if "DRS" in tel_sampled else [],
                    },
                })
            except Exception as drv_err:
                logger.warning(f"Telemetry for {drv} failed: {drv_err}")
                continue

        return {
            "year": year,
            "round": round_num,
            "session": session_type,
            "event": session.event["EventName"],
            "telemetry": telemetry_data,
        }
    except Exception as e:
        logger.error(f"Telemetry error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/weather")
def get_weather(year: int, round_num: int):
    """Weather data during the race."""
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(telemetry=False, laps=False, messages=False)
        weather = session.weather_data

        if weather is None or weather.empty:
            return {"year": year, "round": round_num, "weather": []}

        return {
            "year": year,
            "round": round_num,
            "event": session.event["EventName"],
            "weather": clean_results(weather),
        }
    except Exception as e:
        logger.error(f"Weather error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/pit-stops")
def get_pit_stops(year: int, round_num: int):
    """Pit stop data from Ergast."""
    try:
        result = erg.get_pit_stops(season=year, round=round_num)
        df = result.content[0]
        return {
            "year": year,
            "round": round_num,
            "pit_stops": clean_results(df),
        }
    except Exception as e:
        logger.error(f"Pit stops error: {e}")
        raise HTTPException(500, detail=str(e))


@app.get("/api/season/{year}/race/{round_num}/circuit")
def get_circuit_info(year: int, round_num: int):
    """Circuit layout data (corner positions, marshal sectors)."""
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(telemetry=False, weather=False, messages=False, laps=False)
        circuit = session.get_circuit_info()

        result = {
            "year": year,
            "round": round_num,
            "event": session.event["EventName"],
        }

        if hasattr(circuit, "corners") and circuit.corners is not None:
            result["corners"] = clean_results(circuit.corners)
        if hasattr(circuit, "marshal_sectors") and circuit.marshal_sectors is not None:
            result["marshal_sectors"] = clean_results(circuit.marshal_sectors)
        if hasattr(circuit, "rotation"):
            result["rotation"] = float(circuit.rotation)

        return result
    except Exception as e:
        logger.error(f"Circuit info error: {e}")
        raise HTTPException(500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
#  DRIVER-LEVEL ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/season/{year}/race/{round_num}/driver/{driver}/lap-comparison")
def get_driver_lap_comparison(year: int, round_num: int, driver: str):
    """Detailed lap-by-lap data for a specific driver."""
    try:
        session = fastf1.get_session(year, round_num, "R")
        session.load(telemetry=False, weather=False, messages=False)
        drv_laps = session.laps.pick_driver(driver)

        cols = [
            "LapNumber", "LapTime", "Sector1Time", "Sector2Time", "Sector3Time",
            "Compound", "TyreLife", "Stint", "Position", "IsPersonalBest",
        ]
        available = [c for c in cols if c in drv_laps.columns]

        return {
            "year": year,
            "round": round_num,
            "driver": driver,
            "event": session.event["EventName"],
            "laps": clean_results(drv_laps[available]),
        }
    except Exception as e:
        logger.error(f"Driver lap comparison error: {e}")
        raise HTTPException(500, detail=str(e))


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "gridwalk"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
