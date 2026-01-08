// ==================== //
// TASKS.JS             //
// ==================== //

async function getTaskMetadata(taskId) {
    const url = `${API_BASE}/templates/${encodeURIComponent(taskId)}`;
    console.log('GET', url);

    const response = await fetch(url, { method: 'GET' });

    if (response.status === 404) {
        throw new Error(`Task '${taskId}' not found (404)`);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`GET /templates/${taskId} failed (${response.status} ${response.statusText}): ${text}`);
    }

    return await response.json();
}

/**
 * GET /templates/{task_id}/svg
 */
async function getTaskSVG(taskId) {
    const url = `${API_BASE}/templates/${encodeURIComponent(taskId)}/svg`;
    console.log('GET', url);

    const response = await fetch(url, { method: 'GET' });

    if (response.status === 404) {
        throw new Error(`SVG for task '${taskId}' not found (404)`);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`GET /templates/${taskId}/svg failed (${response.status} ${response.statusText}): ${text}`);
    }

    return await response.text();
}

/**
 * POST /compare
 */
async function submitDrawing(taskId, svgContent) {
    const url = `${API_BASE}/compare`;
    console.log('POST', url);

    const payload = {
        task_id: taskId,
        svg: svgContent
    };
    //notranje dimenzije canvasa, da backend preslika normalizirane kordinate
    try {
        const c = document.getElementById('drawingCanvas');
        if (c && typeof c.width === 'number' && typeof c.height === 'number') {
            payload.canvas_width = c.width;
            payload.canvas_height = c.height;
        }
    } catch (e) {
        // ignore
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // JSON requests: Content-Type: application/json
        },
        body: JSON.stringify(payload)
    });

    if (response.status === 400) {
        const text = await response.text().catch(() => '');
        throw new Error(`400: missing or invalid fields. ${text}`);
    }

    if (response.status === 404) {
        throw new Error(`404: task '${taskId}' not found for POST /compare`);
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`POST /compare failed (${response.status} ${response.statusText}): ${text}`);
    }

    return await response.json();
}

console.log('tasks.js loaded');