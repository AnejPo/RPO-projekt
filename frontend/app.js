// ==================== PROGRESS (SESSION COOKIE) ==================== //

const PROGRESS_COOKIE_NAME = 'drawing_progress';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(';').shift());
    }
    return null;
}

function setCookie(name, value) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
}

function loadProgress() {
    const raw = getCookie(PROGRESS_COOKIE_NAME);
    if (!raw) {
        return {
            totalPoints: 0,
            tasks: {}
        };
    }
    try {
        return JSON.parse(raw);
    } catch {
        return {
            totalPoints: 0,
            tasks: {}
        };
    }
}

function saveProgress(progress) {
    setCookie(PROGRESS_COOKIE_NAME, JSON.stringify(progress));
}

function addTaskCompletion(lessonId, taskId, points) {
    const progress = loadProgress();
    const key = `${lessonId}|${taskId}`;

    if (!progress.tasks[key] || !progress.tasks[key].completed) {
        progress.tasks[key] = {
            completed: true,
            points: points
        };
        progress.totalPoints += points;
        saveProgress(progress);
    }

    return progress;
}

function getTotalPoints() {
    const progress = loadProgress();
    return progress.totalPoints || 0;
}

function isTaskCompleted(lessonId, taskId) {
    const progress = loadProgress();
    const key = `${lessonId}|${taskId}`;
    return !!(progress.tasks[key] && progress.tasks[key].completed);
}

function getLessonAndTaskFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        lessonId: params.get('lesson'),
        taskId: params.get('task')
    };
}

// ==================== APP HOOKS ==================== //

window.addEventListener('DOMContentLoaded', async () => {
    console.log('[app] DOMContentLoaded, location =', window.location.href);

    const isDashboard = !!document.getElementById('lessonsList');
    const isLessonPage = !!document.getElementById('drawingCanvas');

    if (isDashboard) {
        await safeInitDashboard();
    }

    if (isLessonPage) {
        await safeInitLessonPage();
    }
});

// ---------- INDEX (dashboard) ---------- //

async function safeInitDashboard() {
    try {
        console.log('[app] initializing dashboard');

        const pointsEl = document.getElementById('totalPointsDisplay');
        if (pointsEl) {
            pointsEl.textContent = getTotalPoints();
        }

        await initDashboard();
    } catch (err) {
        console.error('❌ safeInitDashboard error:', err);
        const lessonsList = document.getElementById('lessonsList');
        if (lessonsList) {
            const msg = (err && err.stack) ? err.stack : String(err);
            lessonsList.innerHTML =
                `<div class="alert alert-danger">Napaka pri nalaganju lekcij:<br><pre class="mb-0" style="white-space:pre-wrap;">${msg}</pre></div>`;
        }
    }
}

async function initDashboard() {
    const lessonsList = document.getElementById('lessonsList');
    if (!lessonsList) {
        console.warn('[app] lessonsList element doesn\'t exist');
        return;
    }

    const progress = loadProgress();
    console.log('[app] Progress from cookie:', progress);

    const lessons = await getAllLessons();
    console.log('[app] Lessons array from API:', lessons);

    if (!Array.isArray(lessons)) {
        throw new Error('getAllLessons() didn\'t return an array (lessons): ' + JSON.stringify(lessons));
    }

    if (lessons.length === 0) {
        lessonsList.innerHTML = '<p class="text-muted">Ni definiranih lekcij.</p>';
        return;
    }

    lessonsList.innerHTML = '';

    lessons.forEach((lesson, index) => {
        const lessonCompleted = Object.keys(progress.tasks).some(key => {
            const [lessonId] = key.split('|');
            const entry = progress.tasks[key];
            return lessonId === lesson.lesson_id && entry.completed;
        });

        let isUnlocked = false;
        if (index === 0) {
            isUnlocked = true;
        } else {
            const prevLesson = lessons[index - 1];
            const prevCompleted = Object.keys(progress.tasks).some(key => {
                const [lessonId] = key.split('|');
                const entry = progress.tasks[key];
                return lessonId === prevLesson.lesson_id && entry.completed;
            });
            isUnlocked = prevCompleted;
        }

        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';

        const title = document.createElement('div');
        title.innerHTML = `<strong>${lesson.title}</strong><br><small>${lesson.lesson_id}</small>`;

        const right = document.createElement('div');

        if (!isUnlocked) {
            const lock = document.createElement('span');
            lock.className = 'badge bg-secondary';
            lock.textContent = 'Zaklenjeno';
            right.appendChild(lock);
        } else {
            const btn = document.createElement('a');
            const firstTaskId = lesson.tasks && lesson.tasks.length > 0 ? lesson.tasks[0] : null;

            if (firstTaskId) {
                btn.href = `lesson.html?lesson=${encodeURIComponent(lesson.lesson_id)}&task=${encodeURIComponent(firstTaskId)}`;
                btn.className = 'btn btn-sm btn-primary';
                btn.textContent = lessonCompleted ? 'Ponovi' : 'Začni';
            } else {
                btn.className = 'btn btn-sm btn-secondary disabled';
                btn.textContent = 'Ni nalog';
            }

            right.appendChild(btn);
        }

        if (lessonCompleted) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-success ms-2';
            badge.textContent = 'Dokončano';
            right.appendChild(badge);
        }

        item.appendChild(title);
        item.appendChild(right);
        lessonsList.appendChild(item);
    });
}

// ---------- LESSON PAGE ---------- //

async function safeInitLessonPage() {
    try {
        console.log('[app] initializing lesson page');
        initCanvas();
        await initializeLessonFlowSafely();

        if (typeof initBrushUI === 'function') {
            initBrushUI();
        }
        if (typeof initColorUI === 'function') {
            initColorUI();
        }

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', handleSubmitDrawing);
        }

        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearCanvas);
        }

        const { lessonId, taskId } = getLessonAndTaskFromUrl();

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                getNextTaskId(lessonId, taskId)
                .then(nextTask => {
                    if (nextTask) {
                        const base = window.location.pathname.replace(/[^/]+$/, '');
                        window.location.href = `${base}/lesson.html?lesson=${lessonId}&task=${nextTask}`;
                        console.log(`/lesson.html?lesson=${lessonId}&task=${nextTask}`);
                    }
                })
            })
        }


        const lessonPointsEl = document.getElementById('totalPointsDisplayLesson');
        if (lessonPointsEl) {
            lessonPointsEl.textContent = getTotalPoints();
        }
    } catch (err) {
        console.error('❌ safeInitLessonPage error:', err);
        alert('Napaka pri nalaganju lekcije: ' + err.message);
    }
}

// WRAPPER okoli prave initializeLessonFlow, da se ne zaleti na index.html
async function initializeLessonFlowSafely() {
    // zaščita – če koda po nesreči teče na index.html, se takoj ustavi
    if (!document.getElementById('drawingCanvas')) {
        console.warn('[app] initializeLessonFlowSafely called without drawingCanvas – skipping');
        return;
    }

    if (typeof initializeLessonFlow === 'function') {
        await initializeLessonFlow();
    } else {
        console.warn('[app] initializeLessonFlow is not defined');
    }
}

// ---------- SUBMIT RISBE (SVG -> backend) ---------- //

async function handleSubmitDrawing() {
    const { lessonId, taskId } = getLessonAndTaskFromUrl();
    if (!taskId) {
        alert('Manjka task v URL-ju, ne morem oddati risbe.');
        return;
    }

    const svgContent = getCanvasSVG();
    if (!svgContent || svgContent.trim() === '') {
        alert('Ni potez za oddajo.');
        return;
    }

    try {
        const result = await submitDrawing(taskId, svgContent); // iz tasks.js
        console.log('[submitDrawing] rezultat:', result);

        const scoreEl = document.getElementById('scoreValue');
        if (scoreEl && typeof result.score !== 'undefined') {
            scoreEl.textContent = result.score.toFixed
                ? result.score.toFixed(2)
                : String(result.score);
        }

        const hintsContainer = document.getElementById('hintsContainer');
        if (hintsContainer) {
            hintsContainer.innerHTML = '';
            if (Array.isArray(result.hints)) {
                result.hints.forEach(h => {
                    const div = document.createElement('div');
                    div.className = 'alert alert-info py-1 mb-1';
                    div.textContent = h;
                    hintsContainer.appendChild(div);
                });
            }
        }

        if (typeof result.points === 'number') {
            const { lessonId: lId, taskId: tId } = getLessonAndTaskFromUrl();
            addTaskCompletion(lId || 'unknown_lesson', tId || taskId, result.points);

            const lessonPointsEl = document.getElementById('totalPointsDisplayLesson');
            if (lessonPointsEl) {
                lessonPointsEl.textContent = getTotalPoints();
            }
        }

    } catch (err) {
        console.error('❌ submitDrawing error:', err);
        alert('Napaka pri oddaji risbe: ' + (err.message || err));
    }
}

async function getNextTaskId(lesson_id, currentTaskId) {
    const lesson = await getLessonContent(lesson_id);
    const tasks = lesson.tasks || [];

    const idx = tasks.indexOf(currentTaskId);
    if (idx === -1) return null;

    return tasks[idx + 1] || null; //null = konec
}