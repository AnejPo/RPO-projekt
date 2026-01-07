// ==================== //
// COURSES.JS           //
// ==================== //

/**
 * GET /templates
 */
async function getTemplatesManifest() {
    const url = `${API_BASE}/templates`;
    console.log('[courses] GET', url);

    try {
        const response = await fetch(url, { method: 'GET' });

        console.log('[courses] /templates status:', response.status, response.statusText);

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`GET /templates failed (${response.status} ${response.statusText}): ${text}`);
        }

        const data = await response.json();
        console.log('[courses] /templates JSON:', data);
        return data;
    } catch (err) {
        console.error('❌ getTemplatesManifest error:', err);
        // propagiraj napako naprej
        throw err;
    }
}

/**
 * GET /templates/lessons/{lesson_id}
 */
async function getLessonContent(lessonId) {
    console.log('[courses] getLessonContent from manifest, lessonId =', lessonId);

    const manifest = await getTemplatesManifest();   // { lessons, tasks }
    const lessons = manifest.lessons || [];

    const lesson = lessons.find(l => l.lesson_id === lessonId);
    if (!lesson) {
        throw new Error(`Lekcija '${lessonId}' ni najdena v manifestu`);
    }

    return lesson;  // { lesson_id, title, text, tasks: [...] }
}

/**
 * Vrne lessons[] iz manifest-a
 */
async function getAllLessons() {
    const manifest = await getTemplatesManifest();
    console.log('[courses] manifest v getAllLessons:', manifest);


    if (!manifest || !Array.isArray(manifest.lessons)) {
        throw new Error('Manifest ne vsebuje polja "lessons" ali ni array. Dejanska struktura: ' + JSON.stringify(manifest));
    }

    return manifest.lessons;
}

console.log('courses.js loaded');