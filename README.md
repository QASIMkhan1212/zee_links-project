# Warehouse Asset Tracker

A small prototype app for registering warehouse assets (ID, category, photo) with
an auto-recorded timestamp, viewing them on a dashboard, searching by Asset ID,
and viewing individual records with their photographs. Built to run on an
on-premises server and be reachable from other devices (including phones) on
the same local network.

See `architecture.md` for the full design breakdown.

## Tech Stack

- Frontend: React.js (Vite) + Tailwind CSS
- Backend: Python, Flask
- Database: SQLite
- Communication: REST API

## 1. Run the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The backend starts on port `8000` and binds to `0.0.0.0`, so it's reachable
from other devices on the same network, not just `localhost`.

On first run, `warehouse.db` is created automatically with the `assets` table.
Uploaded photos are saved into `backend/uploads/`.

### Find the server's LAN IP

- **Windows:** `ipconfig` → look for "IPv4 Address"
- **macOS/Linux:** `ifconfig` or `ip addr` → look for your network interface's IP (e.g. `192.168.1.50`)

## 2. Run the Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` and set `VITE_API_BASE_URL` to the backend server's LAN IP, e.g.:

```
VITE_API_BASE_URL=http://192.168.1.50:8000
```

Then start the dev server:

```bash
npm run dev
```

Vite will print a "Network" URL (e.g. `http://192.168.1.50:5173`) — open that
URL from any device (PC or phone) connected to the same network as the server.

## 3. Using the App

1. Open the dashboard in a browser.
2. Click **+ New Asset** to open the entry form.
3. Enter the Asset ID, Category, and upload/take a photo, then save.
   The date/timestamp is recorded automatically by the backend.
4. Return to the dashboard to see all saved records.
5. Use the search bar to filter records by Asset ID.
6. Click any record to view its full details and photograph.

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/assets` | Create a new asset record (multipart form: `asset_id`, `category`, `photo`) |
| GET | `/api/assets` | List all asset records |
| GET | `/api/assets/<asset_id>` | Get a single record by Asset ID |
| GET | `/api/assets/search?q=` | Search records by Asset ID |
| GET | `/uploads/<filename>` | Serve a stored photo |

## Future Automation Path

In `backend/app.py`, record creation is split into two independent pieces:

- `create_asset_record(asset_id, category, photo_filename)` — the core
  logic: validation, duplicate checking, and the database write. It takes
  a plain filename string (or `None`), never a file object, so it has no
  dependency on how a photo arrived.
- `save_uploaded_photo(photo_file)` — resolves a *browser* file upload
  into a saved file + filename. This is the only piece specific to manual
  entry.

The manual-entry route (`POST /api/assets`) calls `save_uploaded_photo()`
first, then passes the resulting filename into `create_asset_record()`.

A future automated source (e.g. a camera or sensor system) would plug in
with its own small resolver — saving its own captured image to `uploads/`
however it produces one — and then call `create_asset_record()` the exact
same way, through a new endpoint. No changes to the database schema, the
core logic, or the existing manual entry flow are needed.

## Project Structure

```
warehouse-asset-tracker/
├── backend/
│   ├── app.py              # Flask API (Layer 2)
│   ├── database.py         # SQLite schema/connection (Layer 1)
│   ├── requirements.txt
│   └── uploads/             # stored asset photos
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── NewAsset.jsx
│   │   │   └── AssetDetail.jsx
│   │   ├── api/client.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── architecture.md
└── README.md
```
