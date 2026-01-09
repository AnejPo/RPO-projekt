from typing import List, Tuple, Dict, Any
import numpy as np
from services.svg_processing import denormalize_point

Point = Tuple[float, float]

def get_angle(p1: Point, p2: Point) -> float:
    """Izračuna kot daljice v stopinjah"""
    return float(np.degrees(np.arctan2(p1[1] - p2[1], p1[0] - p2[0])) % 180)

def compare(task: dict, template_strokes_n: List[List[Point]], user_strokes_n: List[List[Point]], user_tf: dict[str, float]) -> dict:
    try:
        params = task.get("params", {})
        van_count = params.get("van_points", 1)

        angle_tolerance = params.get("angle_tolerance", 5.0)
        outlier_p = 100 - params.get("outlier_percent", 10)

        if (van_count == 1):
            vps = [(0.5, 0.5)]
        else: 
            vps = [(0.0, 0.5), (1.0, 0.5)]
        
        total_length = 0
        weighted_error_sum = 0
        all_data = []

        for stroke in user_strokes_n:
            if len(stroke) < 2:
                continue
            
            p1, p2 = stroke[0], stroke[-1]
            length = np.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
            if length < 0.005: continue

            user_angle = get_angle(p1, p2)
            mid_ps = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2) #sredina črte

            possible_errors = [(min(user_angle, 180 - user_angle))]
            possible_errors.append(abs(user_angle - 90))
            for vp in vps:
                target_angle = get_angle(mid_ps, vp)
                diff = abs(user_angle - target_angle)
                possible_errors.append(min(diff, 180 - diff))
            
            best_error = min(possible_errors)

            total_length += length
            weighted_error_sum += best_error * length

            x_raw, y_raw = denormalize_point(mid_ps[0], mid_ps[1], user_tf)
            all_data.append({
                "x": float(x_raw),
                "y": float(y_raw),
                "e": float(best_error)
            })

        user_stroke_count = len(user_strokes_n)
        template_stroke_count = len(template_strokes_n)
        
        if total_length > 0:
            avg_u = weighted_error_sum / total_length
            score_factor = 20 / angle_tolerance if angle_tolerance > 0 else 1.33
            score = max(0, 100 - (avg_u * score_factor))

            if (template_stroke_count > user_stroke_count):
                completion_ratio = user_stroke_count / template_stroke_count
                final_score = 80 * completion_ratio
            else:
                final_score = score

            all_err_values = [d["e"] for d in all_data]
            p90_u = np.percentile(all_err_values, 100 - outlier_p) if all_err_values else 0

            threshold = max(angle_tolerance, p90_u)
            errors = [d for d in all_data if d["e"] >= threshold]
        else:
            score, avg_u, p90_u, errors = 0, 0, 0, []

        return {
            "task_id": task.get("task_id"),
            "score": round(final_score),
            "avg_error": round(avg_u),
            "max_error": round(p90_u),
            "errors": errors,
            "straight_score": 100,
            "hints": []
        }
    
    except Exception as e:
        print(f"Napaka v compare funkciji: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "task_id": task.get("task_id", "unknown"),
            "score": 0,
            "avg_error": 0,
            "max_error": 0,
            "errors": [],
            "straight_score": 100,
            "hints": [f"Napaka pri analizi: {str(e)}"]
        }
    
    
    