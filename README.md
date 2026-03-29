# F1nalStint

FinalStint is a multi-project repository containing several web applications and tools, including productivity apps and interactive dashboards. Each project is self-contained with its own frontend and backend components where applicable.

## Repository Structure

```
FinalStint/
|-- index.html          # Main landing page
|-- logo.jpeg           # Project branding
|-- pomodoro/           # Pomodoro timer app
|   |-- index.html
|   |-- script.js
|   +-- styles.css
|-- gridwalk/           # GridWalk app (full-stack)
|   |-- frontend/
|   |-- backend/
|   +-- README.md
+-- raceiq/             # RaceIQ F1 analytics dashboard
    +-- Dashboard.html
```

## Projects

### 1. **Pomodoro Timer**
> A productivity-focused Pomodoro timer application that helps users manage their work sessions and break times effectively.

**Location**: `/pomodoro`

**Files**:
- `index.html` - Main HTML structure
- `script.js` - Core timer logic and interactivity
- `styles.css` - Application styling

**Features**:
- Customizable work and break durations
- Visual countdown timer
- Session tracking to monitor your productivity

**Stack:** HTML · CSS · JavaScript

**Run it:**
```bash
open pomodoro/index.html    # or just double-click the file in your file explorer
```

### 2. **GridWalk**
> A comprehensive project with separate frontend and backend implementations.

**Location**: `/gridwalk`

**Structure**:
- `/frontend` - Client-side UI
- `/backend` - Server-side logic / API logic
- `README.md` - Project-specific documentation

**Setup:**
```bash
# Backend
cd gridwalk/backend
pip install -r requirements.txt   # if applicable
python app.py                     # or the relevant entry point

# Frontend
open gridwalk/frontend/index.html
```

> See [`gridwalk/README.md`](./gridwalk/README.md) for project-specific setup and documentation.


**Stack:** HTML · CSS · JavaScript · Python

### 3. **RaceIQ Dashboard**
> An interactive analytics dashboard delivering data-driven insights for Formula 1.

Inspired by broadcast-style race analytics, RaceIQ presents race data in a visual and accessible way useful for new fans and seasoned viewers alike.

**Location**: `/raceiq`

**Files**:
- `Dashboard.html` - Main dashboard interface

**Features:**
- Interactive race dashboard UI
- Data visualizations for race and driver statistics
- Clean, broadcast-style layout

**Stack:** HTML · CSS · JavaScript

**Run it:**
```bash
open raceiq/Dashboard.html
```

### 4. **Main Application**
The primary index and entry point for the repository.

**Location**: `/`

**Files**:
- `index.html` - Main landing page
- `logo.jpeg` - Project branding

---    

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools or dependencies required for basic projects
- Python 3.x *(for the GridWalk backend only)*

### Clone the Repository

```bash
git clone https://github.com/anshutripathi11/FinalStint.git
cd FinalStint
```

### Run a Project

| Project | How to open |
|---|---|
| Main landing page | `open index.html` |
| Pomodoro Timer | `open pomodoro/index.html` |
| RaceIQ Dashboard | `open raceiq/Dashboard.html` |
| GridWalk | See `gridwalk/README.md` |

No build tools or package managers are required for the frontend-only projects — just open the HTML file in any browser.

---

## Tech Stack

| Technology | Usage |
|---|---|
| HTML | Structure and markup |
| CSS | Styling and layout |
| JavaScript | Interactivity and logic |
| Python | GridWalk backend |
