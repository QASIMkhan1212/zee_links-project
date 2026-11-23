# Architecture — Warehouse Asset Tracking Prototype

## 1. Project Goal

Build a small full-stack application connected to a server and database, where an operator can manually register warehouse assets (ID, category, photo) with an auto-recorded timestamp, view all records on a dashboard, search by Asset ID, and view individual records with their photos. The app must be responsive (usable from mobile) and designed so manual entry can later be replaced by automated data ingestion without changing the core architecture.

## 2. Tech Stack

- **Frontend:** React.js (Vite) + Tailwind CSS
- **Backend:** Python, Flask
- **Database:** SQLite
- **Image Storage:** Local filesystem (`uploads/` folder on backend), file path saved in DB
- **Communication:** REST API — JSON for data, `multipart/form-data` for the create-asset request (includes the image file)
- **Server environment:** Backend runs on a single on-premises machine (simulating a warehouse server), bound to `0.0.0.0` so other devices on the same local network (phones, other PCs) can reach it via the host machine's LAN IP.

## 3. Layered Architecture

The project is built in 4 layers, in this order:

### Layer 1 — Database Layer
- SQLite database file (`warehouse.db`)
- Single table: `assets`
- Schema:
  ```sql
  CREATE TABLE assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      photo_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- `created_at` is set by the database/server at insert time, never sent by the client.
- `asset_id` must be unique (prevents duplicate registration of the same asset).

### Layer 2 — Backend API Layer (Flask)
Responsible for: receiving requests, validating input, saving uploaded images to disk, writing/reading from SQLite, serving images back, and exposing search.

**Required endpoints:**

| Method | Route | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/assets` | Create a new asset record | multipart/form-data: `asset_id`, `category`, `photo` (file) | Created asset record (JSON) |
| GET | `/api/assets` | List all asset records | — | Array of asset records |
| GET | `/api/assets/{asset_id}` | Get one record by Asset ID | — | Single asset record |
| GET | `/api/assets/search?q=` | Search records by Asset ID (partial match) | query param `q` | Array of matching records |
| GET | `/uploads/{filename}` | Serve a stored photo file | — | Image file |

**Backend responsibilities in detail:**
- On `POST /api/assets`:
  1. Validate `asset_id` and `category` are not empty.
  2. Check `asset_id` doesn't already exist (return error if duplicate).
  3. Save uploaded photo to `uploads/` with a unique filename (e.g. UUID + original extension) to avoid name collisions.
  4. Insert the record into SQLite with server-generated `created_at`.
  5. Return the saved record including the photo path/URL.
- On `GET /api/assets`: return all records ordered by `created_at` descending (newest first).
- On `GET /api/assets/search?q=`: perform a `LIKE` match against `asset_id`.
- CORS must be enabled (e.g. via `flask-cors`) so the frontend (on a different device/port) can call the API across the local network.
- All image files must be served as static files (e.g. via Flask's `send_from_directory` or a static folder route) so the frontend can render them directly via URL.

**Design rule for future automation:**
The core "create a record" logic must be written as one reusable function (e.g. `create_asset_record(asset_id, category, photo)`), called internally by the manual-entry endpoint. This way, a future automated data source (e.g., a sensor or camera system) can call the same underlying function/logic through a new endpoint later, without changing the database layer or the existing manual endpoint.

### Layer 3 — Frontend Layer (React.js)
Responsible for: UI, form submission, displaying data, search, and responsiveness.

**Pages/Views required:**
1. **New Asset Entry Form**
   - Input field: Asset ID / Identification Number
   - Input field: Asset Category (text input or dropdown)
   - File input: Asset Photograph (image upload; should also support `capture="environment"` so mobile devices can use the camera directly)
   - Submit button → sends `multipart/form-data` POST to `/api/assets`
   - Timestamp is NOT entered by the user — it's handled entirely by the backend.
2. **Dashboard**
   - Displays all saved asset records (table or card list): Asset ID, Category, Date/Timestamp, thumbnail photo.
   - Search bar at the top: filters records by Asset ID by calling `/api/assets/search?q=`.
   - Each record is clickable → navigates to the detail view.
3. **Asset Detail View**
   - Shows the full record: Asset ID, Category, full timestamp, full-size photograph.

**Responsiveness requirement:**
- Layout must adapt between desktop and mobile (e.g., table becomes stacked cards on small screens).
- Must be fully usable from a phone browser on the same network as the server.

### Layer 4 — Network/Deployment Layer
- Backend runs via Flask's built-in server (`app.run(host="0.0.0.0", port=8000)`) bound to `0.0.0.0` on a fixed port (e.g. 8000), making it reachable at `http://<server-LAN-IP>:8000` from any device on the same local network.
- Frontend is configured with the backend's LAN IP as its API base URL (not `localhost`), so it works when accessed from other devices (e.g. a phone on the warehouse Wi-Fi).
- Frontend can be served either via its dev server or as a built static bundle served from the same network.

## 4. Data Flow Summary

1. Operator opens the frontend (on PC or phone, connected to warehouse network).
2. Operator fills the form and uploads a photo → frontend sends `multipart/form-data` POST to backend.
3. Backend validates input, stores the photo in `uploads/`, writes the record (with server-generated timestamp) to SQLite.
4. Backend returns the saved record to the frontend.
5. Dashboard calls `GET /api/assets` to list all records (photos rendered via their served URLs).
6. Operator can search by Asset ID (`GET /api/assets/search?q=`) or click a record to view full detail (`GET /api/assets/{asset_id}`).

## 5. Deliverables

- Full source code (frontend + backend), structured by layer as above.
- README with setup/run instructions for both backend and frontend, including how to find/set the server's LAN IP for cross-device access.
- Screenshots or short demo video of: entry form, dashboard list, search, and detail view (with photo).
