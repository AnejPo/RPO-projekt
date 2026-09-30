# Učenje risanja: Drawing-Learning Web App

A gamified web app for learning to draw, built as a university team project (RPO). This is a **proof of concept**: the core loop works (pick a lesson, draw on a canvas, get an automatic score), but several parts are unfinished. See [Known limitations](#known-limitations).

The user interface is in Slovenian.

## What it does

- **Lessons and tasks.** 5 lessons with 33 drawing tasks in total: straight lines, parallel lines, shapes, 3D objects and perspective grids. Lessons and tasks are defined in `backend/data/manifest.json` and each one has its own instructions.
- **Drawing canvas.** An 800×600 HTML canvas with a faint SVG guide shown underneath. Tools:
  - 6 brush sizes and a straight-line tool with its own widths
  - colour presets, plus a hue slider and an opacity slider
  - undo/redo, either one stroke or one point at a time
  - clear canvas
- **Automatic scoring.** On submit, the drawing is exported as SVG and sent to the backend. The backend compares it with the template SVG and returns a score from 0 to 100, error values and hints. Three scoring modes are implemented:
  - `tracing`: point-to-point distance from the template, plus straightness of the strokes (25 tasks)
  - `paralell`: angle and straightness of lines against target angles (4 tasks)
  - `perspective`: line angles compared with the template grid (4 tasks). These tasks also show a reference image.
- **Error markers.** Points where the drawing is furthest from the template are highlighted on the canvas after scoring.
- **Progression UI.** A score of 70 or more shows a "Naslednji task" (next task) button. The dashboard shows a points counter, "completed" badges, and locks a lesson until at least one task in the previous lesson is completed. In the current build this never triggers; see the limitations.
- **Login (backend only).** JWT-based login and token checking backed by SQLite, with bcrypt-hashed passwords. A login page exists, but the frontend doesn't require login (see limitations).

## Tech stack

| Part | Technology |
|---|---|
| Backend | Python, Flask 3, flask-cors, flask-bcrypt, PyJWT, SQLite |
| Scoring | NumPy, SciPy (`cKDTree`), svgpathtools |
| Frontend | Plain HTML/CSS/JavaScript (no build step), Bootstrap 5 and Bootstrap Icons from a CDN |
| Container | Dockerfile (Python 3.11, backend only) |

## Project structure

```
backend/
  app.py              Flask app factory; runs on port 8000
  routes/             templates.py, compare.py, auth.py (blueprints)
  services/           scoring: compare.py (dispatcher), tracing.py, paralell.py,
                      perspective.py, svg_processing.py, manifest.py
  database/           SQLite helpers, queries, mock users; database.db is created here
  data/manifest.json  lessons and tasks
  assets/svgs/        template and reference SVGs (served statically by Flask)
frontend/
  index.html          lesson dashboard
  lesson.html         drawing page
  login.html          login form
  config.js           API_BASE (backend URL)
  app.js, auth.js, courses/, drawing/
docs/API.md           more detailed API notes
Dockerfile
```

## Getting started

### Requirements

- **Python 3.11 or 3.12.** Python 3.14 does **not** work: the pinned `matplotlib`/`contourpy`/`numpy` versions fail to build. The Docker image uses 3.11.
- A modern browser with internet access (Bootstrap is loaded from a CDN).

### 1. Run the backend

```bash
python3.12 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

python backend/app.py
```

The API runs at **http://127.0.0.1:8000**. To check it:

```bash
curl http://127.0.0.1:8000/health    # {"status": "ok"}
```

### 2. Serve the frontend

Flask only serves `backend/assets`, not the frontend, so serve `frontend/` with any static file server in a second terminal:

```bash
cd frontend
python3 -m http.server 5500
```

Then open **http://127.0.0.1:5500/index.html**.

The frontend calls the backend at the URL in `frontend/config.js` (`http://127.0.0.1:8000`). Change it there if the backend runs somewhere else. CORS is open to all origins.

### 3. (Optional) Create test users

The SQLite database (`backend/database/database.db`) is created on first use and starts empty. To add three test users, call this once:

```bash
curl http://127.0.0.1:8000/create-mock-user-data
```

| Username | Password |
|---|---|
| `jdoe` | `password123` |
| `asmith` | `password456` |
| `bjones` | `password789` |

A second call returns 500, because the users already exist.

### Running with Docker

The Dockerfile builds and runs the **backend only**:

```bash
docker build -t risanje .
docker run --rm -p 8000:8000 risanje
```

Serve the frontend separately as in step 2. Use `127.0.0.1` rather than `localhost` if the connection fails: on some setups `localhost` resolves to IPv6 while the container port is only published on IPv4. `docker/docker-compose.yml` is currently empty.

Note that `.dockerignore` doesn't exclude `backend/database/database.db`, so a local database, if you have one, is copied into the image.

## API

Base URL: `http://127.0.0.1:8000`. See [`docs/API.md`](docs/API.md) for request/response details. That file still lists port 5000, but the app runs on 8000.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/templates` | Full manifest (`tasks` and `lessons`) |
| GET | `/templates/<task_id>` | Metadata for one task |
| GET | `/templates/<task_id>/svg` | Template SVG for a task (`image/svg+xml`) |
| GET | `/templates/lessons/<lesson_id>` | One lesson (title, text, description, task IDs) |
| POST | `/compare` | Score a drawing. Body: `{"task_id": "...", "svg": "<svg>...</svg>"}`. Returns `score`, `avg_error`, `max_error`, `errors`, `hints` |
| POST | `/auth/login` | Body: `{"username", "password"}`. Returns a JWT (valid 24 h) and user info |
| GET | `/auth/verify` | Requires `Authorization: Bearer <token>`. Returns the user |
| POST | `/auth/logout` | Always returns success (tokens are not invalidated) |
| GET | `/create-mock-user-data` | Development helper: inserts the test users |
| GET | `/svgs/...` | Static SVG files from `backend/assets/svgs` |

## Known limitations

This is a proof of concept. The following are unfinished or missing:

- **Points and progress don't work yet.** The frontend only records a completed task and adds points when `/compare` returns a `points` field, and the backend never returns one. As a result the points counter stays at 0, no task is marked completed, and lessons after the first stay "locked" on the dashboard. The lock only disables the task buttons: lesson titles still link to the lesson page.
- **Progress is stored only in a browser cookie.** It is never saved on the server. The `user_grades` table and its queries exist in `database/queries.py`, but nothing uses them.
- **Login isn't enforced.** The check on `index.html` is commented out, so the app is used without logging in. There is no registration endpoint and no profile page (the "Profil" menu link is a placeholder).
- **Unimplemented scoring modes.** `services/body_parts.py` and `services/shading.py` are empty, so the `body` and `shading` compare types would fail. No task currently uses them.
- **Broken task.** `paralell_4` points to `svgs/Lesson1/Task2/41.svg`, which doesn't exist, so loading or scoring that task fails.
- **Development-only configuration:**
  - Flask runs in debug mode.
  - The JWT secret and Flask `SECRET_KEY` are hard-coded in the source.
  - `/create-mock-user-data` is publicly reachable.
  - Several unused query helpers build SQL with string formatting instead of parameters.
- **Deployment is incomplete.** The Docker image doesn't serve the frontend, and `docker-compose.yml` is empty.
- **Heavy dependencies.** `requirements.txt` includes packages the app doesn't use (FastAPI, uvicorn, Sphinx, matplotlib, and others).
- **Language.** The UI and code comments are in Slovenian; task instructions in the manifest are in English.

## Team

| Member | Role |
|---|---|
| Rok Ribič | Co-Project Lead · Lead backend & scoring engine developer · Project planning & design |
| Maj Donko | Database · User authentication & login system |
| Luka Miheljak | Backend & scoring engine developer (perspective scoring) · Frontend (colour controls, task navigation) |
| Aleksej Mlinarevič | Frontend developer (error markers on the canvas, reference images) |
| Tine Ozvaldič | Lead frontend developer · Assistant Project Lead |
| Karlo Hrgarek | Frontend developer (straight-line tool, line widths, lesson instructions) |
| Anej Poštrak | Co-Project Lead · Repository & code review · Docker · Project report |
| Lara Žitnik | Project planning & design · Lesson and task author · Defined the scoring requirements · Tablet input support |

