BACKEND (PYTHON FLASK)

PURPOSE
The backend is the API server for the app. It receives requests from
the frontend, checks who the user is and what their role allows,
reads and writes inventory data in the AWS RDS MySQL database, and
talks to the Setmore API for appointments. The frontend never talks
to the database or Setmore directly. Everything goes through here.

TECH STACK
- Python 3.14
- Flask                (web framework)
- Flask-SQLAlchemy     (database models)
- PyMySQL + cryptography (MySQL driver for AWS RDS)
- Flask-JWT-Extended   (login tokens, including the user's role)
- bcrypt               (password hashing)
- Flask-CORS           (allows the React frontend to call the API)
- python-dotenv        (loads settings from .env)
- ruff (dev only)      (code linter, like ESLint for Python)

REQUEST FLOW
Frontend services/ -> routes/ -> role check (utils/) -> services/
  -> models/ -> MySQL (or Setmore API) -> back to frontend as JSON

FOLDER STRUCTURE
----------------------------------------------------------------------
app/
  __init__.py
    Builds the Flask app (create_app). Sets up CORS and registers
    all routes.
  config.py  (TO ADD)
    Reads settings from .env (database, JWT secret, Setmore).
  models/
    One file per database table, defined with SQLAlchemy.
    Planned: roles, users, services, suppliers, products,
    service_materials, consultations, consultation_materials,
    purchases, purchase_items, inventory_transactions.
  routes/
    URL endpoints, grouped into Flask "blueprints" by feature
    (auth, users, products, consultations, ...). Routes stay thin:
    they read the request, call a service, and return JSON.
  services/
    Business logic. Inventory rules (stock checks, deductions,
    BOM templates) and all Setmore API calls live here.
  utils/
    Shared helpers: input validation and role-check decorators
    (e.g. @role_required("admin")).
    THE ROLE CHECKS HERE ARE THE REAL SECURITY. The frontend's
    ProtectedRoute only controls what users see.

tests/
  Automated tests (to be added).
run.py
  Starts the development server.
requirements.txt
  Packages the app needs to run.
requirements-dev.txt
  Tools for development only (ruff).
.env  (NEVER COMMIT - covered by .gitignore)
  Real settings and secrets for your computer.
.env.example
  Same setting names with fake values. Committed so teammates know
  what their .env needs.

FIRST-TIME SETUP
----------------------------------------------------------------------
1. Install Python 3.14 from python.org (check "Add Python to PATH").
2. In the backend folder:
     python -m venv venv
     venv\Scripts\Activate.ps1          (Windows PowerShell)
     source venv/bin/activate           (Mac)
     pip install -r requirements.txt
     pip install -r requirements-dev.txt
   If PowerShell blocks activation, run once:
     Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
3. Copy .env.example to .env and fill in real values.
4. In VS Code: Ctrl+Shift+P > Python: Select Interpreter >
   Enter interpreter path > backend\venv\Scripts\python.exe
   (Do NOT choose "Create Virtual Environment".)

DAILY USE
----------------------------------------------------------------------
- Activate the venv in every new terminal before backend work.
- Start the server:    python run.py
- Health check:        http://localhost:5000/api/health
- Before pushing:      ruff check .      (ruff check . --fix to auto-fix)
- Leave the venv:      deactivate

ADDING A PACKAGE
----------------------------------------------------------------------
  pip install <package>
  pip freeze > requirements.txt
Only freeze packages the app needs to run. Development tools go in
requirements-dev.txt by hand, with a pinned version (e.g. ruff==0.17.0).

CI AND BRANCHES
----------------------------------------------------------------------
- Pull requests into BackTest, FinalTest, and main run "Backend CI":
  install packages, ruff lint, and an app start/health check.
- Backend work flows: feature branch -> BackTest -> FinalTest -> main.
- Dependabot opens weekly package update PRs into BackTest.

CREDENTIALS
----------------------------------------------------------------------
- Real values only ever live in .env (locally) or the AWS server's
  environment settings (deployed). Never in code, commits, or chat.
- Each developer should get their own RDS database user.

API ENDPOINTS (CURRENT)
----------------------------------------------------------------------
GET /api/health    confirms the server is running