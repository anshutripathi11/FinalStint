# 🏎️ StudyGP — F1-Themed Focus Tracker

A web app that uses real browser APIs to track your studying habits, wrapped in a full Formula 1 race experience.

## Quick Start (2 minutes)

### Prerequisites
- **Node.js** 18+ → [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Setup

```bash
# 1. Clone or copy the project folder, then:
cd studygp-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The app opens automatically at **http://localhost:3000**

---

## How to Test Each Feature

### 🏁 Basic Race Flow
1. Open the app → you're in the **Garage**
2. Pick a **Constructor** (subject) — e.g., "CSR" for Computer Science
3. Pick a **Circuit** (task) — e.g., "Monza — Problem Sets"
4. Set **Race Distance** to **1 lap** (25 min) for quick testing
5. Click **LIGHTS OUT AND AWAY WE GO**
6. Watch the 5-light countdown sequence
7. Race begins — timer starts counting

### 🖱️ Throttle (Mouse Tracking)
- **Move your mouse fast** → Throttle gauge in sidebar jumps to 80-100%
- **Stop moving** → Throttle decays back to 0%
- **Gear indicator** changes based on throttle level (1-8)
- Check the "THROTTLE INPUT" sparkline in Live Telemetry

### ⌨️ Gear Shifts (Keyboard)
- **Type anything** → "GEAR SHIFTS (KEYSTROKES)" counter increments
- Each keystroke also resets the idle timer

### 👁️ Track Violations (Tab Visibility)
- **Switch to another tab** → You get a red TEAM RADIO: "TRACK LIMITS!"
- **Switch back** → Green TEAM RADIO: "Back on track. Push now!"
- Violation counter increments each time you leave
- Focus score drops by 40% while tab is hidden

### 😴 Idle Detection (Tire Degradation)
- **Stop all input** (no mouse, no keyboard) for 10+ seconds
- Sidebar shows **"Low activity"** in yellow
- After 30+ seconds → **"COASTING — NO INPUT!"** in red
- Tire wear accelerates during idle periods
- Soft tires degrade 1.5x faster than medium, hard 0.6x

### 🔋 Fuel Level (Battery API)
- Shows your **actual device battery %** as fuel level
- Updates in real-time when battery changes
- ⚠️ Only works on laptops/phones with Battery API support (Chrome/Edge)
- On desktop without battery: shows 100%

### 📡 Radio Comms (Network Info)
- Shows connection quality: Excellent (4G), Moderate (3G), Poor
- ⚠️ Network Information API is Chrome-only

### 🌅 Race Conditions (Time of Day)
- **6am–5pm** → "DAYLIGHT" (gold badge)
- **5pm–8pm** → "TWILIGHT" (orange badge)
- **8pm–6am** → "NIGHT RACE" (purple badge)

### 🛑 Pit Stop (Break Timer)
- Click **BOX BOX** during a race
- 5-minute countdown starts — take a real break!
- Tires reset to 100%, ERS recharges
- Auto-resumes racing when timer ends

### 🚗 Safety Car (Pause)
- Click **SC** → Pauses the lap timer
- Click **RESTART** → Resumes racing

### ⚡ DRS — Deep Focus Zone
- Click **DRS** → Green border around timer
- Sidebar shows "DRS ACTIVE — DEEP FOCUS ZONE"
- Toggle on/off anytime during race

### 🏆 Championship Points (Persistent)
- Complete a race → earn **25 + focus bonus** points
- Points persist across sessions via localStorage
- Championship standings update on Garage screen
- Race history shows last 5 results
- Click **RESET CHAMPIONSHIP DATA** to start over

---

## Testing Shortcuts

For faster testing during development, you can temporarily change these values in `StudyGP.jsx`:

```js
// Line ~110 — Change lap duration (default: 25 min)
const LAP_DURATION = 25 * 60;  // Change to 30 for 30-second laps

// Line ~111 — Change pit stop duration (default: 5 min)  
const PIT_DURATION = 5 * 60;   // Change to 10 for 10-second pits
```

---

## Build for Production

```bash
# Build optimized static files
npm run build

# Preview the build locally
npm run preview

# Deploy the /dist folder to any static host:
# - Vercel: npx vercel
# - Netlify: drag /dist folder to netlify.com
# - GitHub Pages: push /dist to gh-pages branch
```

---

## Project Structure

```
studygp-app/
├── index.html          # Entry HTML with F1 favicon
├── package.json        # Dependencies (React + Vite)
├── vite.config.js      # Vite config (port 3000, auto-open)
└── src/
    ├── main.jsx        # React entry point
    └── StudyGP.jsx     # Full app (~700 lines)
```

---

## Browser API Reference

| Browser API                | F1 Feature              | Compatibility          |
|----------------------------|-------------------------|------------------------|
| `visibilitychange`         | Track violations        | All browsers           |
| `mousemove` events         | Throttle %              | All browsers           |
| `keydown` events           | Gear shifts             | All browsers           |
| Activity timestamp diff    | Idle / tire degradation | All browsers           |
| `navigator.getBattery()`   | Fuel level              | Chrome, Edge, Opera    |
| `navigator.connection`     | Radio comms quality     | Chrome, Edge, Opera    |
| `Date` hours               | Race conditions         | All browsers           |
| `localStorage`             | Championship data       | All browsers           |

---

## Hackathon Tips

- **Demo order**: Garage setup → Lights Out → Show telemetry updating → Switch tabs (violation!) → Go idle (tire deg) → Pit stop → Finish → Show championship
- **Best demo duration**: Set to 1 lap, change `LAP_DURATION` to 60 (1 min) for a complete race in the demo
- **Wow factor**: The tab-switch detection and mouse-speed throttle are the most impressive to judges

Good luck! 🏁
