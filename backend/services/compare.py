from services import perspective, body_parts, shading, tracing
from pathlib import Path
from services.svg_processing import svg_string_to_points, normalize_points, svg_string_to_stroke, normalize_strokes, normalize_strokes_with_tf

def compare_svg(task: dict, user_svg: str) -> dict:
    """
    Funkcija vrne oceno risbe, ki jo je uporabnik poslal
    
    :param template_id: Description
    :type template_id: str
    :param user_svg: Description
    :type user_svg: str
    :return: Description
    :rtype: dict
    """

    BACKEND_DIR = Path(__file__).resolve().parents[1] # backend/routes -> backend
    ASSETS_DIR = BACKEND_DIR / "assets"

    compare_type = task.get("compare_type")
    params = task.get("params", {})

    # Load template svg text
    rel_path = task.get("file")
    if not rel_path:
        raise ValueError("Task has no 'file' field")
    
    template_path = ASSETS_DIR / rel_path
    if not template_path.exists():
        raise ValueError(f"Template SVG not found: {rel_path}")
    
    template_svg = template_path.read_text(encoding="utf-8")

    #normalize
    samples = int(params.get("samples", 300))
    #template_pts = svg_string_to_points(template_svg, samples=samples)
    #user_pts = svg_string_to_points(user_svg, samples=samples)

    template_strokes = svg_string_to_stroke(template_svg, samples=samples)
    user_strokes = svg_string_to_stroke(user_svg, samples=samples)

    if not template_strokes:
        return{
            "task_id": task.get("task_id"),
            "score": 0,
            "avg_error": None,
            "max_error": None,
            "errors": [],
            "hints": ["Template SVG had no <path d=...> elements or could not be parsed"]
        }
    
    if not user_strokes:
        return{
            "task_id": task.get("task_id"),
            "score": 0,
            "avg_error": None,
            "max_error": None,
            "errors": [],
            "hints": ["User SVG had no <path d=...> elements or could not be parsed"]
        }
    
    template_strokes_n = normalize_strokes(template_strokes)
    user_strokes_n, user_tf = normalize_strokes_with_tf(user_strokes)

    #print(f"Template: {template_strokes_n}") DEBUG PRINTS
    #print(f"User: {user_strokes_n}")


    if compare_type == "tracing":
        return tracing.compare(
            task,
            template_strokes_n, user_strokes_n,
            user_tf
        )
    
    elif compare_type == "body":
        return body_parts.compare(
            task,
            template_strokes_n, user_strokes_n
        )
    
    elif compare_type == "perspective":
        return perspective.compare(
            task,
            template_strokes_n, user_strokes_n
        )
    
    elif compare_type == "shading":
        return shading.compare(
            task,
            template_strokes_n, user_strokes_n
        )

    else:
        raise ValueError(f"Unknown compare type: {compare_type}")

    
