from scipy.spatial import cKDTree
from typing import List, Tuple, Dict, Any
import numpy as np
from services.svg_processing import denormalize_point

Point = Tuple[float, float]

def get_angle(p1: Point, p2: Point) -> float:
    """Izračuna kot daljice v stopinjah"""
    return float(np.degrees(np.arctan2(p2[1] - p1[1], p2[0] - p1[0])) % 180)

def angle_error_deg(a: float, t: float) -> float:
    """Najmanjsa razlika med kotoma a in t."""
    d = abs(a - t) % 180.0
    return float(min(d, 180.0 - d))

def score_angle_parallel(
    user_strokes_n: List[List[Point]],
    target_angle_deg: list[float],
    angle_tol_deg: float = 10.0,
    min_points: int = 2,
) -> float:
    """
    Vrne [0..1]. 1 = Kot poteze je enak želenemu kotu, 0 = kot je daleč stran.
    """
    if not user_strokes_n or not target_angle_deg:
        return 0.0

    per_stroke_scores: list[float] = []

    for stroke in user_strokes_n:
        if len(stroke) < min_points:
            continue

        a = get_angle(stroke[0], stroke[-1])
        best_err = min(angle_error_deg(a, t) for t in target_angle_deg)

        # Linear falloff: err<=0 -> 1, err>=angle_tol -> 0
        s = 1.0 - (best_err / float(angle_tol_deg))
        per_stroke_scores.append(float(max(0.0, min(1.0, s))))

    if not per_stroke_scores:
        return 0.0

    return float(np.mean(per_stroke_scores))

def score_straightness(user_strokes_n: List[List[Point]], target_angle_deg: list[float], tolerance: float) -> float:
    """
    Vrne oceno med [0...1]. 1 = zlo ravne crte, 0 = zlo neravne crte
    """

    wobble_vals = []
    straight_segments = []

    straight_segments = user_strokes_n

    for stroke in straight_segments:
        if len(stroke) < 5:
            continue

        actual_angle = get_angle(stroke[0], stroke[-1])
        diffs = []
        for t in target_angle_deg:
            d = abs(t - actual_angle)
            diffs.append(min(d, 180 - d))

        #lambda samo pogleda, kateri kot ima iz manifesta ima najmanjšo razliko z uporabniškim kotom
        best_target_angle = target_angle_deg[np.argmin(diffs)]

        theta = np.deg2rad(best_target_angle)
        n = np.array([-np.sin(theta), np.cos(theta)], dtype=np.float32)

        P = np.asarray(stroke, dtype=np.float32)
        perp = P @ n
        wobble = float(np.std(perp))
        wobble_vals.append(wobble)

    if not wobble_vals:
        return 0.0
    
    wobble_mean = float(np.mean(wobble_vals))

    s = 1.0 - (wobble_mean / (tolerance * 5.0))
    return float(max(0.0, min(1.0, s)))

def compare(task: dict, template_strokes_n: List[List[Point]], user_strokes_n: List[List[Point]], user_tf: dict[str, float]) -> dict:
    """
    Primerja normalizirane tracane točke z točkami templata in določi ali so poteze paralelne
    
    :param task: Vaja, ki jo ocenjujemo
    :type task: dict
    :param template_points_n: Normalizirane točke originalne risbe
    :type template_points_n: List[Point]
    :param user_pts_n: Normalizirane točke uporabnikove risbe
    :type user_pts_n: List[Point]
    :return: Ocena podobnosti uporabnikove risbe z originalno
    :rtype: dict
    """

    if not template_strokes_n:
        return{
            "task_id": task.get("task_id"),
            "score": 0,
            "avg_error": None,
            "max_error": None,
            "errors": [],
            "hints": ["Template has no points to compare against"]
        }
    
    if not user_strokes_n:
        return{
            "task_id": task.get("task_id"),
            "score": 0,
            "avg_error": None,
            "max_error": None,
            "errors": [],
            "hints": ["No stroke data in user SVG"]
        }
    
    T_pts = [pt for s in template_strokes_n for pt in s]
    U_pts = [pt for s in user_strokes_n for pt in s]
    

    params = task.get("params", {})
    tolerance = params.get("tolerance", 0.05)
    samples = params.get("samples")
    outlier_percent = params.get("outlier_percent", 10.0)
    target_angle = params.get("target_angle_deg", [])
    angle_tol_deg = params.get("angle_tol_deg")
    heatmap_points = 50

#RAVNOST
    straight_score = None
    straight_score = score_straightness(user_strokes_n, target_angle, tolerance)
    angle_score = score_angle_parallel(user_strokes_n, target_angle, angle_tol_deg)
        
    final = 0.6 * angle_score + 0.4 * straight_score

    score = int(round(100.0 * final)) #spremeni decimalke v %

    #NAJVECJE NAPAKE
    errors = []

    for stroke in user_strokes_n:
        actuall_angle = get_angle(stroke[0], stroke[-1])
        diffs = []
        for t in target_angle:
            d = abs(t - actuall_angle)
            diffs.append(min(d, 180 - d))


    return{
        "task_id": task.get("task_id"),
        "score": score,
        "avg_error": None,
        "max_error": None,
        "errors": errors,
        "straight_score": straight_score,
        "hints": []
    }