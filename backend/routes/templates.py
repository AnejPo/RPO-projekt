#Defines routes related to templates

import json
from pathlib import Path
from flask import Blueprint, jsonify, Response
from services.manifest import load_manifest, find_lesson, find_task

#Blueprint has to be registered in app.py to become active

templates_bp = Blueprint("templates", __name__)

#find outlines folder
BACKEND_DIR = Path(__file__).resolve().parents[1] # backend/routes -> backend
DATA_DIR = BACKEND_DIR / "data"
MANIFEST_PATH = DATA_DIR / "manifest.json"
ASSETS_DIR = BACKEND_DIR / "assets"

@templates_bp.get("")
def list_templates():
    """
    GET /templates
    Vrne seznam templatov iz katerih lahko frontend zbere.
    Frontend poklice to, ko zeli prikazati seznam vaj

    Seznam je shranjen v data/manifest.json.
    """

    try:
        return jsonify(load_manifest())
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500

@templates_bp.get("/<task_id>")
def get_template_for_task(task_id):
    """
    GET /templates/<task_id>
    Vrne metadata za specificno vajo/template.
    Frontend poklice to funkcijo, ko ve katera vaja je aktivna
    
    :param task_id: id za aktivni task 
    """

    try:
        manifest = load_manifest()
        task = find_task(manifest, task_id)

        if task is None:
            return jsonify({"error": f"Task/template not found: {task_id}"}), 404
        
        return jsonify(task)
    
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500
    
@templates_bp.get("/<task_id>/svg")
def get_task_svg(task_id):
    """
    GET /templates/<task_id>/svg
    Vrne vsebino SVG datoteke za <task_id> vajo
    
    :param task_id: id vaje, katere SVG želiš prejeti 
    """

    try:
        manifest = load_manifest()
        task = find_task(manifest, task_id)

        if task is None:
            return jsonify({"error": f"Task/template not found: {task_id}"}), 404
        
        rel_svg_path = task.get("file")
        if not rel_svg_path:
            return jsonify({"error": f"No SVG path configured for: {task_id}"}), 500
        
        svg_path = ASSETS_DIR / rel_svg_path
        if not svg_path.exists():
            return jsonify({"error": f"SVG file not found: {rel_svg_path}"}), 404
        
        svg_text = svg_path.read_text(encoding="utf-8")
        return Response(svg_text, mimetype="image/svg+xml") #poslje SVG vbistvu na enak nacin kot ce bi poslal datoteko
    
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500

@templates_bp.get("/lessons/<lesson_id>")
def get_lesson(lesson_id):
    """
    GET /templates/lessons/<lesson_id>
    Vrne vesbino lekcije (naslov, tekst, pripadajoce naloge)
    
    :param lesson_id: id lekcije, ki jo zelis prejeti
    """

    try:
        manifest = load_manifest()
        lesson = find_lesson(manifest, lesson_id)

        if lesson is None:
            return jsonify({"error": f"Lesson not found: {lesson_id}"}), 404
        
        return jsonify(lesson)
    
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500
