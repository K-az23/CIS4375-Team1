BACKEND FOLDER

PURPOSE
The backend is the API server for the app. It receives requests from
the frontend, checks who the user is and what they are allowed to do,
reads and writes data in the AWS RDS MySQL database, and sends the
results back as JSON. The frontend never talks to the database
directly. Everything goes through here.

TECH STACK
- Node.js + Express    (the server and routing)
- Sequelize + mysql2   (connects to AWS RDS MySQL)
- bcryptjs             (hashes passwords)
- jsonwebtoken (JWT)   (login tokens)
- dotenv               (loads settings from .env)
- cors                 (allows the frontend to call the backend)
- nodemon (dev only)   (restarts the server when code changes)

REQUEST FLOW
Frontend services/ -> routes/ -> middleware/ -> controllers/
  -> models/ -> MySQL database -> back to the frontend as JSON

FOLDERS AND FILES
----------------------------------------------------------------------
config/
  database.js
    Connects to the AWS RDS MySQL database using values from .env.
    Used by every model.
  aws.js  (LATER, once the S3 bucket exists)
    Sets up the connection to AWS S3 for file and image uploads.

models/
  One file per database table. Defines the columns and how tables
  relate to each other.
  User.js
    Name, email, hashed password, and role ("customer" or "admin").
    Role values match the customer/admin layouts in the frontend.
  Additional models to be finalized with the database design, based
  on the existing frontend pages: appointments, services, products/
  inventory, orders, payments, memberships, and purchasing.
  File.js  (LATER, with S3) - tracks uploaded files.

controllers/
  The logic for each feature. Receives the request, uses the models
  to read or change data, and sends the response.
  authController.js  - register, login, get current user
  userController.js  - view/update profile, admin list of users
  One controller per feature as models are added (for example,
  appointmentController.js, inventoryController.js).
  fileController.js  (LATER, with S3)

routes/
  Maps URLs to controller functions. One file per controller.
  authRoutes.js  -> /api/auth   (login, register, me)
  userRoutes.js  -> /api/users  (profile, admin user list)
  Each frontend file in services/ matches one route file here.

middleware/
  Code that runs before a controller.
  authMiddleware.js
    protect   - rejects requests without a valid login token
    adminOnly - rejects non-admins from admin routes
    THIS IS THE REAL SECURITY. The frontend ProtectedRoute only
    controls what users see. The backend decides what they can do.
  errorMiddleware.js
    Catches errors and returns them as clean JSON messages, plus a
    404 response for routes that don't exist.

utils/
  Small helper functions shared across files.
  validation.js
    Checks user input (valid email, password length, required
    fields) before it reaches the database.

services/  (LATER, with S3)
  s3Service.js - upload, download link, and delete for S3 files.

ROOT FILES
----------------------------------------------------------------------
app.js
  Sets up Express: CORS, JSON parsing, all routes, and the error
  middleware. Does not start the server.
server.js
  Entry point. Loads .env, connects to MySQL, creates tables, and
  starts the server on the port in .env.
package.json
  Backend dependencies and scripts ("npm run dev" to start).
.env  (NEVER COMMIT - covered by .gitignore)
  Secret settings:
    PORT, CLIENT_URL
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
    JWT_SECRET, JWT_EXPIRES_IN
    AWS_REGION, S3_BUCKET_NAME  (LATER)
.env.example
  Same variable names as .env with fake values. This IS committed
  so teammates know what to put in their own .env.

SETUP
----------------------------------------------------------------------
1. In the backend folder, run:
     npm init -y
     npm install express cors dotenv mysql2 sequelize bcryptjs jsonwebtoken
     npm install -D nodemon
2. Add to package.json scripts:
     "start": "node server.js",
     "dev": "nodemon server.js"
3. Copy .env.example to .env and fill in the real RDS values.
4. AWS RDS: the database security group must allow inbound MySQL
   (port 3306) from each developer's IP, or connections will time
   out.
5. Run: npm run dev

API ENDPOINTS (STARTING SET)
----------------------------------------------------------------------
POST /api/auth/register   create a customer account
POST /api/auth/login      log in, returns a token
GET  /api/auth/me         current logged-in user
GET  /api/users/profile   view own profile
PUT  /api/users/profile   update own profile
GET  /api/users           list all users (admin only)