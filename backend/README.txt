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
Frontend services/ -> routes/ -> role check (utils/) -> logic/
  -> models/ -> MySQL (or Setmore API) -> back to frontend as JSON

FOLDER STRUCTURE
----------------------------------------------------------------------
app/
  __init__.py      Builds the Flask app (create_app): config, CORS,
                   database, and route registration.
  config.py        Reads settings from .env.
  extensions.py    The shared database object (db).
  models/          One file per database table.
  routes/          One file per resource, holding its endpoints
                   (a Flask "blueprint"). Routes stay thin: read the
                   request, call logic or models, return JSON.
  logic/           Business rules that are more than a simple read or
                   write, such as stock checks, BOM templates, and
                   Setmore API calls. Only add a file when a resource
                   needs it.
  utils/           Shared helpers: validation, error handling, and
                   role-check decorators.
                   THE ROLE CHECKS ARE THE REAL SECURITY. The
                   frontend's ProtectedRoute only controls what users
                   see.
database/
  schema.sql       The official structure of the database.
tests/             Automated tests (to be added).
run.py             Starts the development server.
requirements.txt   Packages the app needs to run.
requirements-dev.txt  Tools for development only (ruff).
.env               Real settings and secrets. NEVER COMMIT.
.env.example       Same setting names with fake values. Committed so
                   teammates know what their .env needs.

NAMING CONVENTIONS
----------------------------------------------------------------------
The folder says what kind of file it is; the file name says which
resource. The same name is used in every folder.

  Folders            Layer, plural          models/, routes/, logic/
  Files              Resource, singular,    models/service.py
                     snake_case             routes/service.py
  Model classes      Singular, PascalCase   Service, InventoryItem
  Blueprints         <resource>_bp          service_bp
  Route functions    verb + resource        list_services,
                                            get_service,
                                            create_service,
                                            update_service,
                                            deactivate_service
  URLs               Plural, kebab-case     /api/services,
                                            /api/admin/inventory-items
  Imports in app/    Relative (dot style)   from ..models import Service

COMMENTS
----------------------------------------------------------------------
Names should explain WHAT the code does. Only comment WHY: a
workaround, a business rule that isn't obvious, or a TODO tied to
something pending (include what it's waiting on).

ADDING AN ENDPOINT
----------------------------------------------------------------------
1. Branch from main:  feature/<ID>-<short-name>
   (ID from CIS4375_API_Workbook.xlsx, e.g. feature/SVC-02-get-service)
2. Add or update the model in models/<resource>.py, and export it
   from models/__init__.py.
3. Add the route function in routes/<resource>.py.
4. New resource only: register its blueprint in routes/__init__.py.
5. Run ruff check . and test the endpoint locally.
6. Pull request into BackTest. Update the workbook status.

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
4. Add your IP to the RDS security group (MySQL, port 3306).
5. In VS Code: Ctrl+Shift+P > Python: Select Interpreter >
   Enter interpreter path > backend\venv\Scripts\python.exe
   (Do NOT choose "Create Virtual Environment".)

DAILY USE
----------------------------------------------------------------------
- Activate the venv in every new terminal before backend work.
- Start the server:    python run.py
- Health checks:       http://localhost:5000/api/health
                       http://localhost:5000/api/health/db
- Before pushing:      ruff check .      (ruff check . --fix to auto-fix)
- Leave the venv:      deactivate
- Test endpoints:      open backend/requests/<resource>.http in VS Code
                       (REST Client extension) and click Send Request

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

API ENDPOINTS (IMPLEMENTED)
----------------------------------------------------------------------
Full specification: CIS4375_API_Workbook.xlsx

GET /api/health                           Server is running
GET /api/health/db                        Database connection works
GET /api/services                         SVC-01  List bookable services (public)
GET /api/services/<service_id>            SVC-02  Get one bookable service (public)
GET /api/admin/services                   SVC-03  List all services with admin details (admin)
POST /api/admin/services                  SVC-04  Create a service (admin)
PATCH /api/admin/services/<service_id>    SVC-05  Edit a service (admin)
DELETE /api/admin/services/<service_id>   SVC-06  Deactivate a service (admin)