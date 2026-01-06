// ==================== //
// TRACING.JS           //
// ==================== //

// Minimalni score za prehod na naslednji level
const LEVEL_PASS_SCORE = 70;

// Trenutna lekcija in naloga (nastavljeno iz URL parametrov v lesson.html)
let currentLessonId = null;
let currentTaskId = null;

// Lokalen "progress" v sessionStorage (leveling)
const PROGRESS_KEY = 'drawing_app_progress';

/**
 * Preberi progress iz sessionStorage:
 * {
 *   completedLessons: [lesson_id, ...],
 *   completedTasks: [task_id, ...]
 * }
 */
function loadProgress() {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) {
        return {
            completedLessons: [],
            completedTasks: []
        };
    }
    try {
        return JSON.parse(raw);
    } catch {
        return {
            completedLessons: [],
            completedTasks: []
        };
    }
}

function saveProgress(progress) {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Označi task kot dokončan (če score >= LEVEL_PASS_SCORE)
 */
function markTaskCompleted(taskId) {
    const progress = loadProgress();
    if (!progress.completedTasks.includes(taskId)) {
        progress.completedTasks.push(taskId);
    }
    saveProgress(progress);
}

/**
 * Označi lesson kot dokončan (če so vsi taski iz lessons[] tudi completed)
 */
async function updateLessonCompletion(lessonId) {
    const lesson = await getLessonContent(lessonId);
    const progress = loadProgress();

    const allDone = lesson.tasks.every(t => progress.completedTasks.includes(t));
    if (allDone && !progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
        saveProgress(progress);
    }
}

/**
 * Tipični Frontend Flow:
 * 1. Naloži vsebino naloge     GET /templates/lessons/{lesson_id}
 * 2. Naloži metapodatke naloge GET /templates/{task_id}
 * 3. Naloži SVG za primerjavo  GET /templates/{task_id}/svg
 * 4. Pošlji risbo              POST /compare (druga funkcija)
 */
async function initializeLessonFlow() {
    // lessonId in taskId dobimo iz URL parametrov, npr. lesson.html?lesson=...&task=...
    const params = new URLSearchParams(window.location.search);
    currentLessonId = params.get('lesson');
    currentTaskId = params.get('task');

    if (!currentLessonId || !currentTaskId) {
        alert('Manjkajo parametri lesson ali task v URL-ju.');
        return;
    }

    try {
        // 1. Naloži vsebino naloge
        const lesson = await getLessonContent(currentLessonId);
        const lessonTitleElem = document.getElementById('lessonTitle');
        const lessonTextElem = document.getElementById('lessonText');

        if (lessonTitleElem) lessonTitleElem.textContent = lesson.title;
        if (lessonTextElem) lessonTextElem.textContent = lesson.text;

        // 2. Naloži metapodatke naloge
        const task = await getTaskMetadata(currentTaskId);
        const taskNameElem = document.getElementById('taskName');
        const taskDiffElem = document.getElementById('taskDifficulty');
        const taskTypeElem = document.getElementById('taskType');

        if (taskNameElem) taskNameElem.textContent = task.name;
        if (taskDiffElem) taskDiffElem.textContent = '⭐'.repeat(task.difficulty);
        if (taskTypeElem) taskTypeElem.textContent = task.compare_type;

        // 3. Naloži SVG za primerjavo
        const svgGuide = await getTaskSVG(currentTaskId);
        const guideLayer = document.getElementById('guideLayer');
        if (guideLayer) {
            guideLayer.innerHTML = svgGuide; // po API.md: raw SVG text
        }

    } catch (error) {
        console.error('❌ Napaka pri Typical Frontend Flow (1–3):', error);
        alert('Napaka pri nalaganju lekcije ali naloge: ' + error.message);
    }
}

/**
 * Korak 4: Pošlji risbo        POST /compare
 *
 * Kliče se ob kliku na gumb "Oddaj risbo"
 */
async function handleSubmitDrawing() {
    try {
        const svgContent = getCanvasSVG(); // iz canvas.js
        if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
            // varnostni check – po API.md mora biti xmlns na root
            alert('SVG ni veljaven (manjka xmlns).');
            return;
        }

        const result = await submitDrawing(currentTaskId, svgContent);

        // Prikaz rezultata
        const scoreElem = document.getElementById('scoreValue');
        const hintsContainer = document.getElementById('hintsContainer');
        const resultsPanel = document.getElementById('resultsPanel');

        if (scoreElem) scoreElem.textContent = result.score;
        if (resultsPanel) resultsPanel.style.display = 'block';

        if (hintsContainer) {
            if (result.hints && result.hints.length > 0) {
                hintsContainer.innerHTML = result.hints
                    .map(h => `<div class="hint-item">${h}</div>`)
                    .join('');
            } else {
                hintsContainer.innerHTML = '<div class="alert alert-success">Ni namigov – zelo dobro!</div>';
            }
        }

        // LEVELING: če je score dovolj visok, odklene naslednji level
        if (result.score >= LEVEL_PASS_SCORE) {
            markTaskCompleted(currentTaskId);
            await updateLessonCompletion(currentLessonId);
            alert('Čestitke! Dosegel si dovolj točk za napredovanje.');
        } else {
            alert('Rezultat je prenizek za napredovanje. Poskusi izboljšati risbo.');
        }

    } catch (error) {
        console.error('❌ Napaka pri POST /compare:', error);
        alert('Napaka pri ocenjevanju: ' + error.message);
    }
}

console.log('✅ tracing.js naložen (Typical Frontend Flow + leveling)');