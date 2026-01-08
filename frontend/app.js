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
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`;
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

/**
 * Dashboard:
 * - prikaže vse lessone
 * - vsi so vidni, a zaklenjeni (greyed), če prejšnji lesson še ni dokončan
 * - vsak lesson ima dropdown s taski; taski se obarvajo, če so completed
 */
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
        // Ali je v tem lessonu vsaj en completed task?
        const hasCompletedTask = (lesson.tasks || []).some(taskId =>
            isTaskCompleted(lesson.lesson_id, taskId)
        );

        // Ali je prejšnji lesson “zaključen” (vsaj en completed task)?
        let previousLessonUnlocked = true;
        if (index > 0) {
            const prev = lessons[index - 1];
            previousLessonUnlocked = (prev.tasks || []).some(taskId =>
                isTaskCompleted(prev.lesson_id, taskId)
            );
        }

        // Lesson je odklenjen, če je prvi ali ima sam completed task,
        // ali če je prejšnji lesson zaključen
        const isUnlocked =
            index === 0 ||
            hasCompletedTask ||
            previousLessonUnlocked;

        // --- UI element za lesson ---
        const item = document.createElement('div');
        item.className = 'list-group-item';

        if (!isUnlocked) {
            item.className += ' text-muted bg-light';
        }

        const row = document.createElement('div');
        row.className = 'd-flex flex-column';

        // ZGORNJA VRSTICA: puščica + naslov + značke
        const topRow = document.createElement('div');
        topRow.className = 'd-flex justify-content-between align-items-center';

        const leftPart = document.createElement('div');
        leftPart.className = 'd-flex align-items-center';

        // dropdown puščica
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-sm btn-outline-secondary me-2';
        toggleBtn.innerHTML = '<i class="bi bi-caret-down-fill"></i>';
        toggleBtn.setAttribute('aria-expanded', 'false');

        const title = document.createElement('div');
        title.innerHTML = `<strong>${lesson.title}</strong><br><small>${lesson.text}</small>`;

        leftPart.appendChild(toggleBtn);
        leftPart.appendChild(title);

        const rightPart = document.createElement('div');

        if (hasCompletedTask) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-success ms-2';
            badge.textContent = 'Vsaj ena naloga zaključena';
            rightPart.appendChild(badge);
        }

        if (!isUnlocked) {
            const lock = document.createElement('span');
            lock.className = 'badge bg-secondary ms-2';
            lock.textContent = 'Zaklenjeno';
            rightPart.appendChild(lock);
        }

        topRow.appendChild(leftPart);
        topRow.appendChild(rightPart);

        // SPODNJI DEL: kratek course tekst
        const lessonText = document.createElement('div');
        lessonText.className = 'mt-2';

        // SEZNAM TASKOV (dropdown)
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'mt-2';
        tasksContainer.style.display = 'none';

        const tasksList = document.createElement('div');
        tasksList.className = 'list-group';

        if (Array.isArray(lesson.tasks) && lesson.tasks.length > 0) {
            lesson.tasks.forEach(taskId => {
                const taskItem = document.createElement('button');
                taskItem.type = 'button';
                taskItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';

                const labelSpan = document.createElement('span');
                labelSpan.textContent = taskId;

                const right = document.createElement('div');

                const completed = isTaskCompleted(lesson.lesson_id, taskId);
                if (completed) {
                    const cBadge = document.createElement('span');
                    cBadge.className = 'badge bg-success';
                    cBadge.textContent = 'Dokončano';
                    right.appendChild(cBadge);
                }

                taskItem.appendChild(labelSpan);
                taskItem.appendChild(right);

                if (isUnlocked) {
                    taskItem.addEventListener('click', () => {
                        const url = `lesson.html?lesson=${encodeURIComponent(lesson.lesson_id)}&task=${encodeURIComponent(taskId)}`;
                        window.location.href = url;
                    });
                } else {
                    taskItem.disabled = true;
                }

                tasksList.appendChild(taskItem);
            });
        } else {
            const noTasks = document.createElement('div');
            noTasks.className = 'text-muted small';
            noTasks.textContent = 'Ta lekcija še nima nalog.';
            tasksList.appendChild(noTasks);
        }

        tasksContainer.appendChild(tasksList);

        // toggle logika
        toggleBtn.addEventListener('click', () => {
            const expanded = tasksContainer.style.display === 'block';
            tasksContainer.style.display = expanded ? 'none' : 'block';
            toggleBtn.innerHTML = expanded
                ? '<i class="bi bi-caret-down-fill"></i>'
                : '<i class="bi bi-caret-up-fill"></i>';
            toggleBtn.setAttribute('aria-expanded', String(!expanded));
        });

        row.appendChild(topRow);
        row.appendChild(lessonText);
        row.appendChild(tasksContainer);

        item.appendChild(row);
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

// ---------- SUBMIT RISBE (SVG -> backend) + NASLEDNJI TASK ---------- //

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
        const result = await submitDrawing(taskId, svgContent);
        console.log('[submitDrawing] rezultat:', result);

        const scoreEl = document.getElementById('scoreValue');
        const hintsContainer = document.getElementById('hintsContainer');
        
        // ne dovoli oddaje prazne risbe
        if (result.score === 0 && (!result.errors || result.errors.length === 0)) {
            if (hintsContainer) {
                hintsContainer.innerHTML = '';
                const div = document.createElement('div');
                div.className = 'alert alert-danger py-2';
                div.textContent = 'Prazne risbe ni mogoče oddati!';
                div.style.color = 'red';
                div.style.fontWeight = 'bold';
                hintsContainer.appendChild(div);
            }
            return;
        }

        if (scoreEl && typeof result.score !== 'undefined') {
            scoreEl.textContent = result.score.toFixed
                ? result.score.toFixed(2)
                : String(result.score);
        }

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
            addTaskCompletion(lessonId || 'unknown_lesson', taskId, result.points);

            const lessonPointsEl = document.getElementById('totalPointsDisplayLesson');
            if (lessonPointsEl) {
                lessonPointsEl.textContent = getTotalPoints();
            }
        }

        
        try { window.__lastCompareResult = result; } catch (e) { /* ignore */ }

        
        try {
            if (Array.isArray(result.errors) && result.errors.length > 0) {
                const c = document.getElementById('drawingCanvas');
                const cw = (c && c.width) ? c.width : 800;
                const ch = (c && c.height) ? c.height : 600;

                const pxPoints = result.errors.map(p => {
                    if (!p) return null;

                    // Prefer explicit pixel fields if present
                    if (typeof p.x_px === 'number' && typeof p.y_px === 'number') {
                        return { x: Math.round(p.x_px), y: Math.round(p.y_px), e: p.e };
                    }

                    
                    if (Number.isInteger(p.x) && Number.isInteger(p.y)) {
                        return { x: p.x, y: p.y, e: p.e };
                    }

                    
                    if (typeof p.x === 'number' && typeof p.y === 'number' && (Math.abs(p.x) > 1.5 || Math.abs(p.y) > 1.5)) {
                        return { x: Math.round(p.x), y: Math.round(p.y), e: p.e };
                    }

                   
                    if (typeof p.x === 'number' && typeof p.y === 'number') {
                        if (p.x >= -0.6 && p.x <= 0.6 && p.y >= -0.6 && p.y <= 0.6) {
                            return { x: Math.round((p.x + 0.5) * cw), y: Math.round((p.y + 0.5) * ch), e: p.e };
                        }
                        if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) {
                            return { x: Math.round(p.x * cw), y: Math.round(p.y * ch), e: p.e };
                        }
                    }

                    console.warn('Could not map error point to pixels, skipping:', p);
                    return null;
                }).filter(Boolean);

                console.log('Mapped pxPoints (first 10):', pxPoints.slice(0,10));

                if (typeof setErrorMarkers === 'function') {
                    setErrorMarkers(pxPoints);
                    
                    try {
                        if (typeof computeMarkerOffsets === 'function') {
                            const info = computeMarkerOffsets();
                            console.log('computeMarkerOffsets after setErrorMarkers ->', info ? { avg: info.avg, medianDist: info.medianDist } : null);
                        }
                        if (typeof applyMedianCorrection === 'function') applyMedianCorrection();
                        if (typeof snapMarkers === 'function') snapMarkers();
                    } catch (e) {
                        console.warn('Post-processing markers failed:', e);
                    }
                } else {
                    console.warn('setErrorMarkers not available');
                }
            } else {
                if (typeof clearErrorMarkers === 'function') clearErrorMarkers();
            }
        } catch (e) {
            console.warn('Could not draw error markers:', e);
        }

        // če je rezultat uspešen, pokaži gumb NASLEDNJI TASK (če obstaja)
        if (result.score >= 70 && lessonId) {
            await maybeShowNextTaskButton(lessonId, taskId);
        }

    } catch (err) {
        console.error('❌ submitDrawing error:', err);
        alert('Napaka pri oddaji risbe: ' + (err.message || err));
    }
}

/**
 * Po uspešnem rezultatu poišče naslednji task v istem lessonu
 * in prikaže gumb "Naslednji task", če obstaja.
 */
async function maybeShowNextTaskButton(lessonId, currentTaskId) {
    try {
        const lessons = await getAllLessons();
        const lesson = lessons.find(l => l.lesson_id === lessonId);
        if (!lesson || !Array.isArray(lesson.tasks)) return;

        const idx = lesson.tasks.indexOf(currentTaskId);
        if (idx === -1 || idx === lesson.tasks.length - 1) {
            // ni naslednjega taska
            return;
        }

        const nextTaskId = lesson.tasks[idx + 1];

        let nextBtn = document.getElementById('nextTaskBtn');
        if (!nextBtn) {
            const submitBtn = document.getElementById('submitBtn');
            if (!submitBtn) return;

            nextBtn = document.createElement('button');
            nextBtn.id = 'nextTaskBtn';
            nextBtn.className = 'btn btn-success mt-2 w-100';
            nextBtn.textContent = 'Naslednji task';

            submitBtn.insertAdjacentElement('afterend', nextBtn);
        }

        nextBtn.onclick = () => {
            const url = `lesson.html?lesson=${encodeURIComponent(lessonId)}&task=${encodeURIComponent(nextTaskId)}`;
            window.location.href = url;
        };
        nextBtn.style.display = 'block';
    } catch (e) {
        console.error('maybeShowNextTaskButton error', e);
    }
}