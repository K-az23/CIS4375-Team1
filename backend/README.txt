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
- stripe               (payments for hairpiece orders, test mode only)
- python-dotenv        (loads settings from .env)
- ruff (dev only)      (code linter, like ESLint for Python)
- pytest (dev only)    (automated tests)

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
tests/             Automated tests (pytest). Run with: pytest
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
                       pytest            (all tests must pass)
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
  install packages, ruff lint, pytest, and an app start/health check.

TESTS
----------------------------------------------------------------------
tests/ uses pytest with a throwaway in-memory SQLite database and a
fake Stripe, so tests never touch the real database or Stripe and
need no .env.
  conftest.py   Fixtures: app, client, fake_stripe
  helpers.py    make_user, make_order, make_payment, auth_header,
                send_webhook (signs events like Stripe does)
Add a test_<resource>.py file when you build or change endpoints.
- Backend work flows: feature branch -> BackTest -> FinalTest -> main.
- Dependabot opens weekly package update PRs into BackTest.

STRIPE (PAYMENTS)
----------------------------------------------------------------------
Scope: customers pay for hairpiece orders when they order. They can
also save a card (card on file), which is charged for a no-show on a
hair system appointment. Test mode only; nothing is live.

All Stripe calls live in logic/payment.py. Card numbers never reach
our server: the browser sends them straight to Stripe, and we only
store Stripe IDs (cus_..., pi_...).

Setup (once):
1. Use the Capstone sandbox keys (Stripe dashboard > Developers >
   API keys). Put the secret key (sk_test_...) in backend/.env as
   STRIPE_SECRET_KEY. Ask Matias privately; never in the group chat.
2. Install the Stripe CLI:  npm install -g @stripe/cli
3. stripe login   (pick "Capstone sandbox")

Every time you test payments, run a third terminal:
  stripe listen --all-snapshot --forward-to localhost:5000/api/webhooks/stripe
Copy the whsec_... it prints into backend/.env as STRIPE_WEBHOOK_SECRET
(it stays the same on your computer) and restart the server.
Use --all-snapshot; with --events the CLI does not forward every event.

How an order payment works:
1. POST /api/payments/create-intent with {"order_id": n}. The backend
   takes the price from the database, creates a Stripe PaymentIntent,
   and saves a "pending" row in payments.
2. The customer pays in Stripe's form in the browser.
3. Stripe calls POST /api/webhooks/stripe. The backend checks the
   signature and marks the payment "succeeded" (sets charged_at) or
   "failed".

Paying a test order without the frontend:
  stripe payment_intents confirm pi_... -d payment_method=pm_card_visa -d return_url=http://localhost:5173
(pi_... is the part of client_secret before "_secret_".)

Cancelling an order: the cancel-order endpoint (not built yet) must call
cancel_order_payment(order) from logic/payment.py BEFORE setting the
order to cancelled. It stops any unpaid Stripe payment, and returns 409
if the order is already paid (refund it instead).

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

POST /api/payments/create-intent          Start paying a hairpiece order (customer)
GET  /api/payments                        The customer's payments
GET  /api/payments/<payment_id>           One of the customer's payments
GET  /api/admin/payments                  All payments with customer (admin)
                                          ?status= ?from= ?to= (salon days)
GET  /api/admin/payments/<payment_id>     One payment with customer (admin)
POST /api/admin/payments/<payment_id>/refund  Fully refund a card payment (admin)
POST /api/webhooks/stripe                 Called by Stripe only (signature checked)
GET  /api/catalog                         Hair system types, prices and options (public)
POST /api/hairpiece-orders                Customer orders an area system ($400)
GET  /api/hairpiece-orders                The customer's orders
GET  /api/hairpiece-orders/<order_id>     One of the customer's orders
POST /api/hairpiece-orders/<order_id>/cancel  Customer cancels an unpaid order
GET  /api/hairpiece-orders/saved-system   Customer's saved full system (My Hair System)
POST /api/hairpiece-orders/reorder        Re-order the saved full system
POST /api/admin/hairpiece-orders          Invoice after a consultation (admin)
GET  /api/admin/hairpiece-orders          All orders with customer (admin), ?status=
PATCH /api/admin/hairpiece-orders/<order_id>/status  ordered / received / cancelled (admin)
GET  /api/admin/reports/sales             Revenue per day, salon time (admin), ?days=7
GET  /api/admin/reports/customer-spending Customers ranked by total paid (admin)
POST /api/payments/setup-method           Start saving a card, returns client_secret
GET  /api/payments/method                 Saved card (brand, last4) or null