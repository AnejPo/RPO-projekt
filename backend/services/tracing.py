from scipy.spatial import cKDTree
from typing import List, Tuple, Dict, Any
import numpy as np
from services.svg_processing import denormalize_point

Point = Tuple[float, float]

def split_stroke(stroke: List[Point], angle_threshold_deg: float = 60.0) -> List[List[Point]]:
    if len(stroke) < 3:
        return [stroke]
    
    segments = []
    current_segment = [stroke[0], stroke[1]]
    min_dist = 0.008

    for i in range(2, len(stroke)):
        p1, p2, p3 = np.array(stroke[i-2]), np.array(stroke[i-1]), np.array(stroke[i])
        
        dist = np.linalg.norm(p3 - p1)
        if dist <= min_dist:
            continue

        v1 = p2 - p1
        v2 = p3 - p2

        l1 = np.linalg.norm(v1)
        l2 = np.linalg.norm(v2)

        if l1 > 0.000001 and l2 > 0.000001: #da ne delim z ničlo
            #kosinus kota med vektorjema
            cos_theta = np.dot(v1, v2) / (l1 * l2)
            #za napake izven [-1, 1]
            cos_theta = np.clip(cos_theta, -1.0, 1.0)
            angle = np.degrees(np.arccos(cos_theta))

            if angle > angle_threshold_deg:
                segments.append(current_segment)
                current_segment = [stroke[i-1]]
        
        current_segment.append(stroke[i])

    segments.append(current_segment)
    return segments

def get_angle(p1: Point, p2: Point) -> float:
    """Izračuna kot daljice v stopinjah"""
    return float(np.degrees(np.arctan2(p2[1] - p1[1], p2[0] - p1[0])) % 180)

def score_straightness(user_strokes_n: List[List[Point]], target_angle_deg: [float], tolerance: float) -> float:
    """
    Vrne oceno med [0...1]. 1 = zlo ravne crte, 0 = zlo neravne crte
    """

    wobble_vals = []
    straight_segments = []

    if (len(target_angle_deg) == 1):
        straight_segments = user_strokes_n
    else:
        for stroke in user_strokes_n:
            straight_segments.extend(split_stroke(stroke))

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
    Primerja normalizirane tracane točke z uporabo nearest-neighbour dolžino (Chamfer dolžina)
    
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
    heatmap_points = 50

    T = np.asarray(T_pts, dtype=np.float32)
    U = np.asarray(U_pts, dtype=np.float32)

    tree_T = cKDTree(T)
    tree_U = cKDTree(U)

    d_u, _ = tree_T.query(U, k = 1) #dolzine od U do T - Natancnost
    d_t, _ = tree_U.query(T, k = 1) #dolzine od T do U - Pokrivanje

    #ignoriraj najhujsih 10%
    p90_u = float(np.percentile(d_u, 90)) #pod katero vrednostjo lezi 90% dolzin, = max_error

    #USER -> TEMPLATE
    if outlier_percent > 0:
        cutoff = float(np.percentile(d_u, 100.0 - outlier_percent))
        d_u_trim = d_u[d_u <= cutoff] #[True, True, False, ...] True = vrednost je se vedno vkljucena
        avg_u = float(np.mean(d_u_trim)) if len(d_u_trim) else float(np.mean(d_u))
    else:
        avg_u = float(np.mean(d_u))

    #TEMPLATE -> USER
    coverage = float(np.mean(d_t < tolerance)) #koliko % tock templata je znotraj tolerance oduporabnikove risbe

    #TOCKOVANJE
    acc_score = 1.0 - (avg_u / tolerance)
    acc_score = max(0.0, min(1.0, acc_score)) #clamp to 0, 1 or acc_score

    cov_score = max(0.0, min(1.0, coverage))

#RAVNOST
    straight_score = None
    if target_angle is not None:
        straight_score = score_straightness(user_strokes_n, target_angle, tolerance)
        final = 0.35 * acc_score + 0.35 * cov_score + 0.3 * straight_score
    else:
        final = 0.55 * acc_score + 0.45 * cov_score #accuracy = 55% ocene, coverage = 45% ocene

    score = int(round(100.0 * final)) #spremeni decimalke v %

    #NAJVECJE NAPAKE
    k = min(max(1, heatmap_points), len(d_u)) #koliko najhujsih tock bomo pokazali
    worst_idx = np.argsort(d_u)[-k:] #vzami zadnih k indexov (najvecje napake)

    errors = []
    for i in worst_idx:
        xn = float(U[i, 0])
        yn = float(U[i, 1])
        x_raw, y_raw = denormalize_point(xn, yn, user_tf)
        errors.append({"x": float(x_raw), "y": float(y_raw), "e": float(d_u[i])})
    
    num_original = len(user_strokes_n)
    straight_parts = []
    for s in user_strokes_n:
        straight_parts.extend(split_stroke(s))


    return{
        "task_id": task.get("task_id"),
        "score": score,
        "avg_error": avg_u,
        "max_error": p90_u,
        "errors": errors,
        "straight_score": straight_score,
        "debug_info": {
            "original_strokes": num_original,
            "split_segments": len(straight_parts)
        },
        "hints": []
    }



