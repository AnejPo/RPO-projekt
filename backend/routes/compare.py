from flask import Blueprint, request, jsonify

#import za logiko primerjanja
from services.compare import compare_svg
from services.manifest import load_manifest, find_task

compare_bp = Blueprint("compare", __name__)

@compare_bp.post("/compare")
def compare():
    #tocno kaj frontend poslje in kaj backend vrne se lahko spremenimo
    """
    POST /compare

    Frontend posle:
    {
        "template_id": "...",
        "svg": "<svg>...</svg>"
    }

    Backend vrne: 
    {
        "score": ...,
        "avg_error": ...,
        "errors": [...]
    }
    """
    #parse json
    payload = request.get_json(silent=True)

    if payload is None:
        return jsonify({"error": "Expected JSON body"}), 400
    
    task_id = payload.get("task_id")
    svg = payload.get("svg")

    if not task_id or not svg:
        return jsonify({"error": "task_id and svg are required"}), 400
    
    try:
        manifest = load_manifest()
        task = find_task(manifest, task_id)
        if task is None:
            return jsonify({"error": f"Task not found: {task_id}"}), 404
        
        result = compare_svg(task, svg)
        return jsonify(result)
    
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500
