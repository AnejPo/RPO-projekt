# Drawing App Backend API

This document describes how the frontend should interact with the Flask backend.

---

## Base URL (local development)

http://127.0.0.1:5000

---

## Content Types

- JSON requests: Content-Type: application/json
- SVG responses: Content-Type: image/svg+xml

---

## Data Models

### Task

Represents a drawing task/exercise that can be compared and scored.

Example:

{
  "id": "circle",
  "name": "Circle (Easy)",
  "compare_type": "tracing",
  "file": "svgs/circle.svg",
  "difficulty": 1,
  "instructions": "Trace this circle as perfectly as possible",
  "params": {
    "outlier percent": 10, #koliko procentov najhujsih tock bo ignoriranih (ne upostevaj 10% tock, ki so najbolj oddaljene od tega kako bi risba morala izgledati)
    "tolerance": 0.03, #Lower tollerance = harsher scoring
    "samples": 300 #meaning how many points should be distributed through the whole drawing (300-600 for simple tasks, 800-1500 for normal and 2000+ for complex)
  }
}

Vaje z dosti locenimi ravnimi crtami, ki so obrnjene v isto smer imajo se:
"target_angle_deg": 90,

90 = vertikalne crte
0 = horizontalne crte
45 = posevne
.
.
.

---

### Lesson

Represents lesson content (text + which tasks belong to it).

Example:

{
  "lesson_id": "lesson_intro_circles",
  "title": "Drawing Circles",
  "text": "Circles are the foundation of many shapes...",
  "tasks": ["circle", "vertical_lines"]
}

---

## Endpoints

---

### GET /templates

Returns the full manifest containing all tasks and lessons.

Response 200 (application/json):

{
  "tasks": [ ... ],
  "lessons": [ ... ]
}

Errors:
- 500: manifest.json not found or unreadable

---

### GET /templates/{task_id}

Returns metadata for a single task.

Response 200 (application/json):

{
  "id": "circle",
  "name": "Circle (Easy)",
  "compare_type": "tracing",
  "file": "svgs/circle.svg",
  "difficulty": 1,
  "params": {
    "tolerance": 0.03
  }
}

Errors:
- 404: task not found

---

### GET /templates/{task_id}/svg

Returns the SVG guide for a task.

Response 200 (image/svg+xml):

<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <circle cx="100" cy="100" r="80" stroke="black" fill="none"/>
</svg>

Frontend usage example (JavaScript):

fetch(`/templates/${taskId}/svg`)
  .then(r => r.text())
  .then(svgText => {
    document.getElementById("guide-layer").innerHTML = svgText;
  });

Errors:
- 404: task not found
- 404: SVG file not found

---

### GET /templates/lessons/{lesson_id}

Returns lesson content (text + associated tasks).

Response 200 (application/json):

{
  "lesson_id": "lesson_intro_circles",
  "title": "Drawing Circles",
  "text": "Circles are the foundation of many shapes...",
  "tasks": ["circle"]
}

Errors:
- 404: lesson not found

---

### POST /compare

Submits a user's drawing for comparison and scoring.

Request (application/json):

{
  "task_id": "circle",
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
}

Response 200 (application/json):

return{
        "task_id": task.get("task_id"),
        "score": score,
        "avg_error": avg_u,
        "max_error": p90_u,
        "errors": errors,
        "straight_score": straight_score,
        "hints": []
    }

Errors:
- 400: missing or invalid fields
- 404: task not found
- 500: internal server error

---

## Typical Frontend Flow

1. Load lesson content  
   GET /templates/lessons/{lesson_id}

2. Load task metadata  
   GET /templates/{task_id}

3. Load SVG guide  
   GET /templates/{task_id}/svg

4. Submit user drawing  
   POST /compare

---

## Notes

- SVG responses are raw SVG text, not JSON.
- The backend does not render HTML.
- The frontend is responsible for displaying lessons and drawing UI.
