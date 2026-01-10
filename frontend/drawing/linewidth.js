// ==================== LINEWIDTH ==================== //

// Preddefinirane debljine crte
const PREDEFINED_LINE_WIDTHS = [
    { id: 1, size: 2,  name: 'Črta 1 (2px)'  },
    { id: 2, size: 5,  name: 'Črta 2 (5px)'  },
    { id: 3, size: 10, name: 'Črta 3 (10px)' },
    { id: 4, size: 15, name: 'Črta 4 (15px)' },
    { id: 5, size: 20, name: 'Črta 5 (20px)' },
    { id: 6, size: 25, name: 'Črta 6 (25px)' }
];

// inicijalizacija debljine crte v UI
function initLineWidthUI(allowedLineWidthIds = null) {
    const group = document.getElementById('lineWidthSelectorGroup');
    const currentBtn = document.getElementById('lineToolBtn');
    const currentLabel = document.getElementById('currentLineWidthLabel');
    const dropdownMenu = document.getElementById('lineWidthDropdownMenu');

    if (!group || !currentBtn || !currentLabel || !dropdownMenu) {
        console.warn('[linewidth] Elementi za debljinu crte nisu pronađeni');
        return;
    }

    // Filtriranje po allowedLineWidthIds
    let lineWidthsToShow = PREDEFINED_LINE_WIDTHS;
    if (Array.isArray(allowedLineWidthIds) && allowedLineWidthIds.length > 0) {
        const allowedSet = new Set(allowedLineWidthIds.map(Number));
        lineWidthsToShow = PREDEFINED_LINE_WIDTHS.filter(b => allowedSet.has(b.id));
    }

    // dropdown
    dropdownMenu.innerHTML = '';
    lineWidthsToShow.forEach(lineWidth => {
        const li = document.createElement('li');
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'dropdown-item d-flex justify-content-between align-items-center';
        a.dataset.lineWidthId = lineWidth.id;
        a.title = lineWidth.name;

        const labelSpan = document.createElement('span');
        labelSpan.textContent = lineWidth.name;

        const idBadge = document.createElement('span');
        idBadge.className = 'badge bg-secondary ms-2';

        a.appendChild(labelSpan);
        a.appendChild(idBadge);

        a.addEventListener('click', () => {
            selectLineWidthById(lineWidth.id);
            if (typeof setCurrentTool === 'function') {
                setCurrentTool('line');
            }
        });

        li.appendChild(a);
        dropdownMenu.appendChild(li);
    });

    // Nastavi začetnu debljinu
    const initial = lineWidthsToShow[0] || PREDEFINED_LINE_WIDTHS[0];
    setCurrentLineWidth(initial);
}

// Pomožna funkcija - postavi trenutno debljinu crte
function setCurrentLineWidth(lineWidth) {
    // Update globalnu varijablu iz canvas.js
    window.currentLineWidth = lineWidth.size;

    const currentLabel = document.getElementById('currentLineWidthLabel');
    if (currentLabel) {
        currentLabel.textContent = `Ravna črta (${lineWidth.size}px)`;
    }
}

// Izbira debljinu crte po id
function selectLineWidthById(lineWidthId) {
    const lineWidth = PREDEFINED_LINE_WIDTHS.find(b => b.id === Number(lineWidthId));
    if (!lineWidth) {
        console.warn('[linewidth] debljina crte nije pronađena za id', lineWidthId);
        return;
    }
    setCurrentLineWidth(lineWidth);
}

// ==================== END LINEWIDTH ==================== //
