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
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
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
    // za debug vrnemo kar SVG, ki ga pošiljamo backendu
    const svg = getCanvasSVG();
    return svg || '';
}

/**
 * Ustvari SVG iz drawingHistory – ta SVG gre v POST /compare.
 * Po API dokumentaciji:
 * svg string mora imeti xmlns="http://www.w3.org/2000/svg"
 *
 * Backend pričakuje SVG, vektorske poteze pretvorimo v <path d="M ... L ..."/>.
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

        // d = "M x0 y0 L x1 y1 L x2 y2 ..."
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