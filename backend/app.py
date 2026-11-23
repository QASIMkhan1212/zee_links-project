"""
Layer 2 — Backend API Layer (Flask)

Exposes a REST API for creating, listing, searching and viewing warehouse
asset records, and for serving uploaded asset photographs.

Run with:
    python app.py

This binds to 0.0.0.0 so other devices on the same local network
(e.g. a phone on the warehouse Wi-Fi) can reach it via this machine's LAN IP.
"""

import os
import sqlite3
import uuid
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from database import init_db, get_connection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

app = Flask(__name__)
CORS(app)  # allow the frontend (different device/port) to call this API
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB request cap

os.makedirs(UPLOAD_DIR, exist_ok=True)
init_db()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def row_to_dict(row):
    """Convert a sqlite3.Row into a JSON-friendly dict, adding a usable photo URL."""
    return {
        "id": row["id"],
        "asset_id": row["asset_id"],
        "category": row["category"],
        "photo_url": f"/uploads/{row['photo_path']}" if row["photo_path"] else None,
        "created_at": row["created_at"],
    }


# ---------------------------------------------------------------------------
# Photo handling — isolated here because HOW a photo arrives differs by
# entry point (a browser file upload today; raw bytes/base64/a camera
# system's own file path tomorrow). Only this function needs to change,
# or a new sibling function can be added, when an automated source is
# wired in — the core record-creation logic below never has to know.
# ---------------------------------------------------------------------------
def save_uploaded_photo(photo_file):
    """Save a Flask/Werkzeug FileStorage (manual browser upload) to disk.

    Returns (photo_filename, error). photo_filename is None if no photo
    was provided, which is a valid, non-error case.
    """
    if not photo_file or not photo_file.filename:
        return None, None
    if not allowed_file(photo_file.filename):
        return None, "Unsupported image file type"
    ext = photo_file.filename.rsplit(".", 1)[1].lower()
    photo_filename = f"{uuid.uuid4().hex}.{ext}"
    photo_file.save(os.path.join(UPLOAD_DIR, photo_filename))
    return photo_filename, None


# ---------------------------------------------------------------------------
# Core logic — kept as one reusable function so a future automated data
# source (e.g. a sensor/camera system) can call it directly later without
# duplicating validation or DB logic. It takes an already-resolved
# photo_filename (a plain string already sitting in uploads/, or None) —
# never a file object — so it has no dependency on how that photo was
# produced or saved. A manual entry resolves a FileStorage into a filename
# via save_uploaded_photo() first (see the route below); an automated
# source would do its own resolution (e.g. writing a camera capture to
# uploads/ and generating its own filename) and then call this function
# the exact same way.
# ---------------------------------------------------------------------------
def create_asset_record(asset_id, category, photo_filename=None):
    if not asset_id or not asset_id.strip():
        return None, "asset_id is required"
    if not category or not category.strip():
        return None, "category is required"

    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM assets WHERE asset_id = ?", (asset_id.strip(),)
    ).fetchone()
    if existing:
        conn.close()
        return None, f"Asset ID '{asset_id}' already exists"

    # The existence check above and the insert below are not atomic: under
    # concurrent requests (a threaded dev server, or any real multi-worker
    # production deployment), two requests for the same new asset_id can
    # both pass the check before either has inserted. The database's own
    # UNIQUE constraint is the real guarantee against duplicates; this
    # try/except just turns that guarantee's failure into the same clean
    # error response instead of an unhandled 500.
    try:
        cursor = conn.execute(
            "INSERT INTO assets (asset_id, category, photo_path, created_at) VALUES (?, ?, ?, ?)",
            (asset_id.strip(), category.strip(), photo_filename, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return None, f"Asset ID '{asset_id}' already exists"

    new_row = conn.execute("SELECT * FROM assets WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return row_to_dict(new_row), None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.errorhandler(413)
def handle_too_large(e):
    return jsonify({"error": "Uploaded file is too large (10MB max)"}), 413


@app.route("/api/assets", methods=["POST"])
def create_asset():
    """Manual entry point: operator fills a form and uploads a photo
    through the browser. This route's only job is resolving that
    browser upload into a filename on disk — everything after that
    (validation, dedupe, DB write) is handled by the shared core logic.
    """
    asset_id = request.form.get("asset_id")
    category = request.form.get("category")
    photo_file = request.files.get("photo")

    photo_filename, file_error = save_uploaded_photo(photo_file)
    if file_error:
        return jsonify({"error": file_error}), 400

    record, error = create_asset_record(asset_id, category, photo_filename)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(record), 201


@app.route("/api/assets", methods=["GET"])
def list_assets():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM assets ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/assets/search", methods=["GET"])
def search_assets():
    q = request.args.get("q", "").strip()
    # Escape SQL LIKE's own wildcard characters so a literal % or _ in a
    # real asset ID (e.g. "WH_001") is matched as itself, not treated as
    # a wildcard.
    escaped_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM assets WHERE asset_id LIKE ? ESCAPE '\\' ORDER BY created_at DESC",
        (f"%{escaped_q}%",),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/assets/<path:asset_id>", methods=["GET"])
def get_asset(asset_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM assets WHERE asset_id = ?", (asset_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Asset not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/uploads/<filename>", methods=["GET"])
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


if __name__ == "__main__":
    # debug=False: this server is bound to 0.0.0.0 and reachable from other
    # devices on the network. Flask's debug mode exposes an interactive
    # code-execution console on unhandled errors — unsafe outside local dev.
    app.run(host="0.0.0.0", port=8000, debug=False)
