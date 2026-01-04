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
  "params": {
    "tolerance": 0.03
  }
}

---

### Lesson

Represents lesson content (text + which tasks belong to it).

Example:

{
  "lesson_id": "lesson_intro_circles",
  "title": "Drawing Circles",
  "text": "Circles are the foundation of many shapes...",
  "tasks": ["circle"]
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

{
  "task_id": "circle",
  "score": 78,
  "avg_error": 0.021,
  "max_error": 0.08,
  "errors": [
    { "x": 0.31, "y": 0.52, "e": 0.12 }
  ],
  "hints": ["Left side is too flat"]
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
