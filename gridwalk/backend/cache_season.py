"""
Pre-cache script: Run this in the background to download session data
so the app responds instantly during your demo.

Usage: python cache_season.py 2024
"""

import sys
import time
import fastf1
import os

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

def cache_season(year):
    print(f"\n🏁 Caching {year} season data...\n")

    try:
        schedule = fastf1.get_event_schedule(year)
        events = schedule[schedule["RoundNumber"] > 0]
        print(f"Found {len(events)} events\n")
    except Exception as e:
        print(f"❌ Failed to load schedule: {e}")
        return

    for _, event in events.iterrows():
        round_num = event["RoundNumber"]
        name = event["EventName"]

        for session_type in ["Q", "R"]:
            label = f"R{round_num} {name} ({session_type})"
            try:
                print(f"⏳ Loading {label}...", end=" ", flush=True)
                start = time.time()

                session = fastf1.get_session(year, round_num, session_type)
                session.load(telemetry=True, weather=True, messages=False)

                elapsed = time.time() - start
                print(f"✅ {elapsed:.1f}s ({len(session.laps)} laps)")

            except Exception as e:
                print(f"⚠️  Skipped: {e}")
                continue

    print(f"\n🏆 Done! All {year} data cached in {CACHE_DIR}")
    print("Your app will now load instantly for this season.\n")


if __name__ == "__main__":
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    cache_season(year)
