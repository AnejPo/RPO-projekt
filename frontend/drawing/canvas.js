// ==================== //
// CANVAS.JS            //
// ==================== //

let canvas;
let ctx;

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// UI debug elementi
let drawingStatusElem;
let positionTextElem;

// vektorska zgodovina
let drawingHistory = [];  // array strokes
let currentStroke = null;
// hranijo se markerji
let errorMarkers = [];

/**
 * Stroke struktura:
 * {
 *   points: [{x, y}, ...],
 *   color: "#000000",
 *   width: 2
 * }
 */

// Helper: pridobi style iz currentBrush (če nima getStyle(), imamo fallback)
function getCurrentBrushStyle() {
    if (typeof currentBrush === 'undefined') {
        return {
            strokeStyle: '#000000',
            lineWidth: 2,
            lineCap: 'round',
            lineJoin: 'round'
        };
    }

    if (typeof currentBrush.getStyle === 'function') {
        return currentBrush.getStyle();
    }

    return {
        strokeStyle: currentBrush.color || '#000000',
        lineWidth: currentBrush.size || 2,
        lineCap: 'round',
        lineJoin: 'round'
    };
}

function initCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');

    if (!ctx) {
        alert('Canvas ni podprt v tem brskalniku!');
        throw new Error('Canvas not supported');
    }

    drawingStatusElem = document.getElementById('drawingStatus');
    positionTextElem = document.getElementById('positionText');

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });
    canvas.addEventListener('pointerleave', handlePointerUp, { passive: false });

    canvas.style.touchAction = 'none';
    // undo/redo gumbi
    const btnRewind = document.getElementById('btnRewind');
    const btnFastRewind = document.getElementById('btnFastRewind');
    const btnForward = document.getElementById('btnForward');
    const btnFastForward = document.getElementById('btnFastForward');
    const btnExport = document.getElementById('btnExportHistory');

    if (btnRewind) {
        btnRewind.addEventListener('click', () => {
            undoPoint();
        });
    }
    if (btnFastRewind) {
        btnFastRewind.addEventListener('click', () => {
            undoStroke();
        });
    }
    if (btnForward) {
        btnForward.addEventListener('click', () => {
            redoPoint();
        });
    }
    if (btnFastForward) {
        btnFastForward.addEventListener('click', () => {
            redoStroke();
        });
    }
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const textarea = document.getElementById('debugConsole');
            if (textarea) {
                textarea.value = exportDrawingHistory();
            }
        });
    }

    console.log('canvas.js initialized');
}

function getMousePos(event) {
    // miskine kordinate iz css v canvas za pravilno delovanje
    const rect = canvas.getBoundingClientRect();
    const xCss = event.clientX - rect.left;
    const yCss = event.clientY - rect.top;
    const scaleX = (canvas.width && rect.width) ? (canvas.width / rect.width) : 1;
    const scaleY = (canvas.height && rect.height) ? (canvas.height / rect.height) : 1;
    return {
        x: xCss * scaleX,
        y: yCss * scaleY
    };
}

function handlePointerDown(e) {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);

    isDrawing = true;

    const pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;

    const style = getCurrentBrushStyle();

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = style.lineCap;
    ctx.lineJoin = style.lineJoin;

    // nova poteza – redo buffer se izbriše
    redoBuffer = [];

    currentStroke = {
        points: [{ x: pos.x, y: pos.y }],
        color: style.strokeStyle,
        width: style.lineWidth
    };

    updateDrawingStatus(true);
}

function handlePointerMove(e) {
    e.preventDefault();
    const pos = getMousePos(e);

    if (positionTextElem) {
        positionTextElem.textContent = `X: ${pos.x.toFixed(0)}, Y: ${pos.y.toFixed(0)}`;
    }

    if (!isDrawing) return;

    const style = getCurrentBrushStyle();

    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = style.lineCap;
    ctx.lineJoin = style.lineJoin;
    ctx.stroke();

    currentStroke.points.push({ x: pos.x, y: pos.y });
    lastX = pos.x;
    lastY = pos.y;
}

function handlePointerUp(e) {
    e.preventDefault();
    if (!isDrawing) return;

    canvas.releasePointerCapture?.(e.pointerId);

    isDrawing = false;
    ctx.closePath();

    if (currentStroke && currentStroke.points.length > 1) {
        drawingHistory.push(currentStroke);
    }
    currentStroke = null;

    updateDrawingStatus(false);
}

// ====== CLEAR ======

function clearCanvas() {
    if (!confirm('Ali si prepričan, da želiš pobrisati celo risbo?')) {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory = [];
    currentStroke = null;
    redoBuffer = [];

    const strokeCount = document.getElementById('strokeCount');
    if (strokeCount) {
        strokeCount.textContent = '0';
    }
}

function updateDrawingStatus(drawing) {
    if (drawingStatusElem) {
        drawingStatusElem.textContent = drawing ? 'Da' : 'Ne';
        drawingStatusElem.className = drawing ? 'text-success fw-bold' : 'text-muted';
    }

    const strokeCount = document.getElementById('strokeCount');
    if (strokeCount) {
        strokeCount.textContent = drawingHistory.length.toString();
    }
}

// ====== REDRAW IZ drawingHistory ======

function redrawFromHistory() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawingHistory.forEach(stroke => {
        if (!stroke.points || stroke.points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.closePath();
    });

    updateDrawingStatus(false);
   //izrise errormarkers
    try { drawErrorMarkers(); } catch (e) { }
}

//naredise rdece kroge za napake
function drawErrorMarkers() {
    if (!canvas || !ctx) return;
    if (!Array.isArray(errorMarkers) || errorMarkers.length === 0) return;

    console.log('drawErrorMarkers called, count=', errorMarkers.length);

    ctx.save();
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'darkred';
    ctx.lineWidth = 1;
    const radius = 6; 

    // prilagajanje sosedu
    const userPts = [];
    if (Array.isArray(drawingHistory) && drawingHistory.length) {
        drawingHistory.forEach(s => {
            if (s && Array.isArray(s.points)) {
                s.points.forEach(pt => userPts.push({ x: pt.x, y: pt.y }));
            }
        });
    }

    const dist2 = (a,b) => (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y);
    const maxSnapDist = 60 * 60;

    errorMarkers.forEach((p, idx) => {
        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
        let drawX = Math.round(p.x);
        let drawY = Math.round(p.y);

        // snepa sosdeedu ce je dovolj blizu
        if (userPts.length > 0) {
            let best = null, bestd = Infinity;
            for (let i = 0; i < userPts.length; i++) {
                const d = dist2(p, userPts[i]);
                if (d < bestd) { bestd = d; best = userPts[i]; }
            }
            if (best && bestd <= maxSnapDist) {
                drawX = Math.round(best.x);
                drawY = Math.round(best.y);
            }
        }

       
        const x = Math.max(0, Math.min(canvas.width - 1, drawX));
        const y = Math.max(0, Math.min(canvas.height - 1, drawY));
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    ctx.restore();
}

function setErrorMarkers(points) {
    if (!Array.isArray(points)) {
        errorMarkers = [];
        redrawFromHistory();
        return;
    }

    let incoming = points.slice(0, 200);


    try {
        const userPts = [];
        if (Array.isArray(drawingHistory) && drawingHistory.length) {
            drawingHistory.forEach(s => {
                if (s && Array.isArray(s.points)) {
                    s.points.forEach(p => userPts.push({ x: p.x, y: p.y }));
                }
            });
        }

        if (userPts.length > 0 && incoming.length > 0) {
            
            const dist2 = (a,b) => (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y);

            // za vsak market najblizji user dot
            const pairs = incoming.map(m => {
                let best = null, bestd = Infinity;
                for (let i=0;i<userPts.length;i++){
                    const d = dist2(m, userPts[i]);
                    if (d < bestd) { bestd = d; best = userPts[i]; }
                }
                return { m, nearest: best, d: Math.sqrt(bestd) };
            });

            const dists = pairs.map(p => p.d).sort((a,b)=>a-b);
            const n = dists.length;
            const pct = 0.80; // use the 80th percentile as cutoff
            const cutoff = dists[Math.max(0, Math.min(n-1, Math.floor(pct * n)))] || dists[dists.length-1] || 0;
            const good = pairs.filter(p => p.nearest && p.d <= cutoff && isFinite(p.d));

            if (good.length > 0) {
                // compute median dx and dy for robustness against outliers
                const dxs = good.map(p => p.m.x - p.nearest.x).sort((a,b)=>a-b);
                const dys = good.map(p => p.m.y - p.nearest.y).sort((a,b)=>a-b);
                const median = arr => {
                    const nn = arr.length;
                    if (nn === 0) return 0;
                    if (nn % 2 === 1) return arr[(nn-1)/2];
                    return (arr[nn/2 - 1] + arr[nn/2]) / 2.0;
                };
                const medDx = median(dxs);
                const medDy = median(dys);

                const applyThreshold = 2; // px
                if (Math.abs(medDx) > applyThreshold || Math.abs(medDy) > applyThreshold) {
                    console.log('Applying marker correction medianDx,medianDy =', medDx.toFixed(2), medDy.toFixed(2), '(based on', good.length, 'matches, cutoff=', Math.round(cutoff), 'px)');
                    incoming = incoming.map(p => ({ x: Math.round(p.x - medDx), y: Math.round(p.y - medDy), e: p.e }));
                }
            }
        }
    } catch (e) {
        console.warn('Error while computing marker correction:', e);
    }

    errorMarkers = incoming;
    // redraw da so markerji na vrhu
    redrawFromHistory();
}

function clearErrorMarkers() {
    errorMarkers = [];
    redrawFromHistory();
}

// pomoc z testnimimarkerji
function testDrawMarkers() {
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 600;
    const samples = [
        { x: Math.round(w * 0.25), y: Math.round(h * 0.25) },
        { x: Math.round(w * 0.5), y: Math.round(h * 0.5) },
        { x: Math.round(w * 0.75), y: Math.round(h * 0.75) }
    ];
    console.log('testDrawMarkers ->', samples);
    setErrorMarkers(samples);
}

window.testDrawMarkers = testDrawMarkers;

function showMarkerPairsTable() {
    // remove existing overlay if present
    const existing = document.getElementById('markerPairsOverlay');
    if (existing) existing.remove();

    const state = getDebugState();
    const markers = state.errorMarkers || [];
    const strokes = state.drawingHistory || [];

    const userPts = [];
    strokes.forEach(s => {
        if (s && Array.isArray(s.points)) s.points.forEach(p => userPts.push({ x: p.x, y: p.y }));
    });

    const pairs = markers.map(m => {
        // najde najblizji
        let best = null, bestd = Infinity;
        for (let i=0;i<userPts.length;i++){
            const dx = m.x - userPts[i].x; const dy = m.y - userPts[i].y;
            const d = Math.hypot(dx, dy);
            if (d < bestd) { bestd = d; best = userPts[i]; }
        }
        return { m, nearest: best, dx: best ? (m.x - best.x) : null, dy: best ? (m.y - best.y) : null, dist: bestd };
    });

    // compute median correction from good matches (reuse computeMarkerOffsets logic)
    const offsets = computeMarkerOffsets() || { avg: { dx:0, dy:0 }, medianDist: 0 };

   
}

function applyMedianCorrection() {
    const info = computeMarkerOffsets();
    if (!info || !info.avg) return;
    const dx = info.avg.dx || 0;
    const dy = info.avg.dy || 0;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        console.log('Median correction too small, skipping');
        return;
    }
    errorMarkers = errorMarkers.map(p => ({ x: Math.round(p.x - dx), y: Math.round(p.y - dy), e: p.e }));
    console.log('Applied median correction:', dx.toFixed(2), dy.toFixed(2));
    redrawFromHistory();
}

// snepanje markerjev user inputu
function snapMarkers() {
    const state = getDebugState();
    const strokes = state.drawingHistory || [];
    const userPts = [];
    strokes.forEach(s => { if (s && Array.isArray(s.points)) s.points.forEach(p => userPts.push(p)); });
    if (userPts.length === 0) return;
    const dist2 = (a,b) => (a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
    const newMarkers = errorMarkers.map(m => {
        let best = null, bestd = Infinity;
        for (let i=0;i<userPts.length;i++){ const d = dist2(m, userPts[i]); if (d < bestd) { bestd = d; best = userPts[i]; }}
        const threshold = Math.max(25*25, bestd); // allow snapping to whatever is best but not too far
        if (best && bestd <= threshold) return { x: Math.round(best.x), y: Math.round(best.y), e: m.e };
        return m;
    });
    errorMarkers = newMarkers;
    console.log('Snapped markers to nearest user points');
    redrawFromHistory();
}



// ====== UNDO / REDO NA PODLAGI BUFFERJA ======

// Hranimo zadnje odstranjene stroke v redoBuffer
let redoBuffer = [];

// Rewind – ena poteza (stroke) nazaj
function undoStroke() {
    if (drawingHistory.length === 0) return;

    const removed = drawingHistory.pop();
    redoBuffer.push(removed);
    redrawFromHistory();
}

// Rewind – ena točka nazaj (znotraj zadnje poteze)
function undoPoint() {
    if (drawingHistory.length === 0) return;

    const lastStroke = drawingHistory[drawingHistory.length - 1];
    if (!lastStroke.points || lastStroke.points.length === 0) return;

    lastStroke.points.pop();
    // če je poteza praktično prazna, jo odstranimo kot celoto
    if (lastStroke.points.length < 2) {
        const removedStroke = drawingHistory.pop();
        redoBuffer.push(removedStroke);
    }
    redrawFromHistory();
}

// Forward – vrne zadnjo odstranjeno potezo
function redoStroke() {
    if (redoBuffer.length === 0) return;

    const restored = redoBuffer.pop();
    drawingHistory.push(restored);
    redrawFromHistory();
}

// Forward – zaenkrat isto kot redoStroke
function redoPoint() {
    redoStroke();
}

// ====== EXPORT ZA DEBUG (SVG) ======

function exportDrawingHistory() {
    const svg = getCanvasSVG();
    return svg || '';
}

/**
 * Ustvari SVG iz drawingHistory – ta SVG gre v POST /compare.
 * Backend pričakuje SVG z <path d="M ... L ..."/>.
 */

function getCanvasSVG() {
    if (!canvas) {
        console.warn('getCanvasSVG: canvas ni inicializiran');
        return '';
    }

    const width = canvas.width;
    const height = canvas.height;

    const paths = drawingHistory.map(stroke => {
        if (!stroke.points || stroke.points.length === 0) return '';

        const color = stroke.color || '#000000';
        const widthAttr = stroke.width || 2;

        const pts = stroke.points;
        let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
        for (let i = 1; i < pts.length; i++) {
            d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
        }

        return `<path d="${d}" stroke="${color}" stroke-width="${widthAttr}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');

    const svg =
`<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}">
${paths}
</svg>`;

    return svg;
}

console.log('drawingHistory ready for SVG export');