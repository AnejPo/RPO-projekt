#Defines routes related to templates

import json
from pathlib import Path
from flask import Blueprint, jsonify

#Blueprint has to be registered in app.py to become active

templates_bp = Blueprint("templates", __name__)

#find outlines folder
BACKEND_DIR = Path(__file__).resolve().parents[1] # backend/routes -> backend
OUTLINES_DIR = BACKEND_DIR / "data"
MANIFEST_PATH = OUTLINES_DIR / "manifest.json"

@templates_bp.get("")
def list_templates():
    """
    GET /templates

    Vrne seznam templatov iz katerih lahko frontend zbere.
    Seznam je shranjen v data/manifest.json.
    """

#preberi manifest.json
    if not MANIFEST_PATH.exists():
        return jsonify({"error": "manifest.json not found"}), 500
    
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    return jsonify(data)

