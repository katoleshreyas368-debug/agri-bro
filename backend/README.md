AGRIBro backend - local dev notes

Quick commands

- Install dependencies:
  npm install
- Run dev server (nodemon):
  npm run dev
- Run smoke tests (node):
  npm run smoke
- Run unit tests (Jest):
  npm test

Migration to SQLite (local convenience)

This repository includes a simple migration script that exports the file-based `src/db.json` into a local SQLite file under `data/agribro.sqlite` for easy inspection or local testing.

To run the migration (requires native build of better-sqlite3; on Windows you may need Visual Studio Build Tools):

  node scripts/migrate-to-sqlite.js

The script is for development only.

Notes

- The backend currently uses a JSON file (`src/db.json`) as the datastore. For multi-user or production scenarios, migrate to a proper DB.

Using MongoDB

If you want the backend to use MongoDB, create a `.env` file in the `project/backend` folder with these values:

MONGO_URL="your MongoDB connection string"
MONGO_DB_NAME=agribro

Example:

MONGO_URL="mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/agribro"
MONGO_DB_NAME=agribro

The backend will automatically switch to Mongo when `MONGO_URL` is present. Keep the `.env` file out of source control.
AGRIBro Backend (Beginner-friendly)

This is a minimal Express backend that stores data in a JSON file so you don't need to install a database.

Quick start (PowerShell):

cd "c:\Users\ShreyashK\Desktop\Final_Project - Copy\project\backend"
npm install
npm run dev

The server will start on http://localhost:4000

 Available endpoints (basic):
 - GET  /crops
 - GET  /crops/:id
 - POST /crops
 - POST /crops/:id/bids
 - GET  /inputs
 - POST /auth/login
 - GET  /community
 - POST /community
 - POST /community/:id/replies
 - GET/POST /logistics

 Local dev notes
 ----------------
 - This demo backend listens on PORT 5001 by default in development (to avoid conflicts on some systems).
 - Start the dev server (auto-restarts) from the `backend` folder:

 ```powershell
 npm run dev
 ```

 If you prefer a different port, set the environment variable before starting, for example:

 ```powershell
 $env:PORT=4000; npm run dev
 ```

These match the frontend's data shapes and are intentionally simple to help you learn.
