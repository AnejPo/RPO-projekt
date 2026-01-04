#Defines routes related to templates

import json
from pathlib import Path
from flask import Blueprint, jsonify, Response

#Blueprint has to be registered in app.py to become active

templates_bp = Blueprint("templates", __name__)

#find outlines folder
BACKEND_DIR = Path(__file__).resolve().parents[1] # backend/routes -> backend
DATA_DIR = BACKEND_DIR / "data"
MANIFEST_PATH = DATA_DIR / "manifest.json"
ASSETS_DIR = BACKEND_DIR / "assets"

def load_manifest() -> dict:
    """
    Helper funkcija za nalaganje manifest.json v a python dictionary
    
    :return: dictionary of tasks
    :rtype: dict
    """

    if not MANIFEST_PATH.exists():
        raise FileNotFoundError("manifest.json not found")
    
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

def find_task(manifest: dict, task_id: str) -> dict | None:
    """
    Najde eno vajo/template glede na task_id.
    
    :param manifest: python dictionary taskov in lessonov
    :type manifest: dict
    :param lesson_id: id lekcije/templata, ki ga zelimo najti
    :type lesson_id: str
    :return: Dictionary ene lekcije/templata
    :rtype: dict | None
    """

    #manifest shema: "tasks":[]
    tasks = manifest.get("tasks") or []

    for item in tasks:
        #lesson_id = id in manifest
        if item.get("task_id") == task_id:
            return item
        
    return None

def find_lesson(manifest: dict, lesson_id: str) -> dict | None:
    """
    Najde eno lekcijo glede na lesson_id
    
    :param manifest: python dictionary taskov in lessonov
    :type manifest: dict
    :param lesson_id: id lekcije/templata, ki ga zelimo najti
    :type lesson_id: str
    :return: Dictionary ene lekcije/templata
    :rtype: dict | None
    """

    #manifest shema: "lessons":[]
    tasks = manifest.get("lessons") or []

    for item in tasks:
        #lesson_id = id in manifest
        if item.get("task_id") == lesson_id:
            return item
        
    return None

@templates_bp.get("")
def list_templates():
    """
    GET /templates
    Vrne seznam templatov iz katerih lahko frontend zbere.
    Frontend poklice to, ko zeli prikazati seznam vaj

    Seznam je shranjen v data/manifest.json.
    """

#preberi manifest.json
    if not MANIFEST_PATH.exists():
        return jsonify({"error": "manifest.json not found"}), 500
    
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    return jsonify(data)

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
