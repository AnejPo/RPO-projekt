from flask import Blueprint, request, jsonify

#import za logiko primerjanja
from services.compare import compare_svg

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
    
    template_id = payload.get("template_id")
    svg = payload.get("svg")

    if not template_id or not svg:
        return jsonify({"error": "template_id and svg are required"}), 400
    
    result = compare_svg(template_id, svg)

    return jsonify(result)
